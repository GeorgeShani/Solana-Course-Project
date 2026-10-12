import { describe, expect, it } from "bun:test";
import {
  confirmedHostArg,
  describeDbTarget,
  targetLine,
  targetRefusal,
} from "../src/shared/db-target";

describe("database target guard", () => {
  it("treats loopback hosts as local and anything else as remote", () => {
    for (const url of [
      "postgres://u:p@127.0.0.1:5432/relay",
      "postgres://u:p@localhost/relay",
      "postgres://u:p@[::1]:5432/relay",
    ])
      expect(describeDbTarget(url).local).toBe(true);
    expect(
      describeDbTarget(
        "postgresql://u:p@ep-x.neon.tech/neondb?sslmode=require",
      ),
    ).toEqual({ host: "ep-x.neon.tech", database: "neondb", local: false });
  });

  it("never prints credentials", () => {
    const line = targetLine(
      describeDbTarget("postgres://user:secret@db.example.com/relay"),
    );
    expect(line).toContain("db.example.com");
    expect(line).not.toContain("secret");
    expect(line).not.toContain("user");
  });

  it("lets local through, and refuses remote unless the exact host is named", () => {
    const remote = describeDbTarget("postgres://u:p@db.example.com/relay");
    expect(
      targetRefusal(describeDbTarget("postgres://u@127.0.0.1/r"), undefined),
    ).toBeNull();
    expect(targetRefusal(remote, undefined)).toContain("Refusing");
    expect(targetRefusal(remote, "other.example.com")).toContain("Refusing");
    expect(targetRefusal(remote, "db.example.com")).toBeNull();
  });

  it("refuses a URL it cannot read", () => {
    expect(targetRefusal(describeDbTarget("not a url"), undefined)).toContain(
      "Refusing",
    );
  });

  it("reads the confirmation flag", () => {
    expect(confirmedHostArg(["--check", "--confirm-db-host=h.example"])).toBe(
      "h.example",
    );
    expect(confirmedHostArg(["--check"])).toBeUndefined();
  });
});
