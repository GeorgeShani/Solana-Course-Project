import { describe, expect, it } from "bun:test";
import { contentHash, parsePrice } from "@relay/domain";
import {
  contentFromInput,
  contentInputFromJson,
  parseDuration,
  parseKeypairBytes,
  parseKeypairFile,
} from "../src/shared/publish-input";

const RATIONALE = "Accumulating on a retest of the breakout level.";
const EXIT = "Reassess near the prior high; not a stop-loss order.";

describe("parseDuration", () => {
  it("reads minutes, hours and days", () => {
    expect(parseDuration("90m")).toBe(5400);
    expect(parseDuration("6h")).toBe(21_600);
    expect(parseDuration("2d")).toBe(172_800);
    expect(parseDuration(" 1h ")).toBe(3600);
  });

  it("refuses anything else instead of guessing", () => {
    for (const bad of ["", "h", "6", "1.5h", "-2h", "6 hours", "0m", "1w"])
      expect(() => parseDuration(bad)).toThrow(RangeError);
  });
});

describe("parseKeypairBytes", () => {
  it("takes the 64-byte array solana-keygen writes", () => {
    const bytes = parseKeypairBytes(Array.from({ length: 64 }, (_, i) => i));
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(64);
  });

  it("refuses other shapes, and never repeats a byte in the message", () => {
    const secret = 211;
    for (const bad of [
      null,
      "abc",
      {},
      [],
      Array.from({ length: 63 }, () => secret),
      Array.from({ length: 64 }, () => 256),
      Array.from({ length: 64 }, () => 1.5),
      Array.from({ length: 64 }, () => "7"),
    ]) {
      let message = "";
      try {
        parseKeypairBytes(bad);
      } catch (e) {
        message = e instanceof Error ? e.message : "";
      }
      expect(message).toContain("not a Solana keypair");
      expect(message).not.toContain(String(secret));
    }
  });
});

describe("parseKeypairFile", () => {
  it("reads the file text", () => {
    const text = JSON.stringify(Array.from({ length: 64 }, (_, i) => i));
    expect(parseKeypairFile(text).length).toBe(64);
  });

  it("does not quote a malformed file back, because it is a secret", () => {
    for (const bad of [
      "SECRETWORD not json at all",
      "[1,2,3,SECRETWORD",
      '{"key": "SECRETWORD"}',
      "",
    ]) {
      let message = "";
      try {
        parseKeypairFile(bad);
      } catch (e) {
        message = e instanceof Error ? e.message : "";
      }
      expect(message).toContain("not a Solana keypair");
      expect(message).not.toContain("SECRETWORD");
    }
  });
});

describe("contentFromInput", () => {
  it("returns the validated content and the body to confirm with", () => {
    const { content, wire } = contentFromInput(
      {
        rationale: RATIONALE,
        exitThesis: EXIT,
        exitTarget: "160.50",
        invalidation: "130",
      },
      6,
    );
    expect(content.exitTarget).toBe(parsePrice("160.50", 6));
    expect(content.invalidation).toBe(130_000_000n);
    expect(wire).toEqual({
      rationale: RATIONALE,
      exitThesis: EXIT,
      exitTarget: "160.50",
      invalidation: "130",
    });
  });

  it("treats a missing, null or empty price as 'none given', never zero", () => {
    for (const none of [undefined, null, ""]) {
      const { content, wire } = contentFromInput(
        {
          rationale: RATIONALE,
          exitThesis: EXIT,
          exitTarget: none,
          invalidation: none,
        },
        6,
      );
      expect(content.exitTarget).toBeNull();
      expect(content.invalidation).toBeNull();
      expect(wire.exitTarget).toBeNull();
      expect(wire.invalidation).toBeNull();
    }
  });

  it("names the field that is missing or wrong, and invents nothing", () => {
    expect(() => contentFromInput({ exitThesis: EXIT }, 6)).toThrow(
      "rationale is required",
    );
    expect(() => contentFromInput({ rationale: RATIONALE }, 6)).toThrow(
      "exitThesis is required",
    );
    expect(() =>
      contentFromInput(
        { rationale: RATIONALE, exitThesis: EXIT, exitTarget: 160.5 },
        6,
      ),
    ).toThrow("exitTarget must be written as text");
    expect(() =>
      contentFromInput(
        { rationale: RATIONALE, exitThesis: EXIT, invalidation: "0" },
        6,
      ),
    ).toThrow("invalidation");
    expect(() =>
      contentFromInput(
        { rationale: RATIONALE, exitThesis: EXIT, exitTarget: "1.5.2" },
        6,
      ),
    ).toThrow("exitTarget");
  });

  it("applies the same length rules as the program's hash and the server", () => {
    expect(() =>
      contentFromInput({ rationale: "short", exitThesis: EXIT }, 6),
    ).toThrow();
    expect(() =>
      contentFromInput({ rationale: "x".repeat(1001), exitThesis: EXIT }, 6),
    ).toThrow();
  });

  it("hashes to the same value the server will compute from the confirm body", async () => {
    const { content, wire } = contentFromInput(
      { rationale: RATIONALE, exitThesis: EXIT, exitTarget: "160.5" },
      6,
    );
    const again = contentFromInput(wire, 6);
    expect(Buffer.from(await contentHash(content)).toString("hex")).toBe(
      Buffer.from(await contentHash(again.content)).toString("hex"),
    );
  });
});

describe("contentInputFromJson", () => {
  it("reads the four fields from a JSON object", () => {
    expect(
      contentInputFromJson(
        JSON.stringify({ rationale: RATIONALE, exitThesis: EXIT }),
      ),
    ).toEqual({
      rationale: RATIONALE,
      exitThesis: EXIT,
      exitTarget: undefined,
      invalidation: undefined,
    });
  });

  it("refuses text that is not a JSON object", () => {
    expect(() => contentInputFromJson("{nope")).toThrow("not valid JSON");
    expect(() => contentInputFromJson("[1,2]")).toThrow("JSON object");
    expect(() => contentInputFromJson('"text"')).toThrow("JSON object");
  });
});
