/**
 * The reviewer's tool for evidence requests. This is the ONLY way a request or a supporting
 * reference becomes public: there is no HTTP route that reviews anything, so nobody can approve
 * their own submission. It needs database access (DATABASE_URL in the root .env).
 *
 *   bun run --cwd server review list
 *   bun run --cwd server review approve-request <er_id> --reviewer "Name"
 *   bun run --cwd server review reject-request  <er_id> --reviewer "Name" --note "why"
 *   bun run --cwd server review close-request   <er_id> --reviewer "Name" --note "why it stays unresolved"
 *   bun run --cwd server review accept <es_id> --reviewer "Name" --summary "what the reference shows"
 *                                       --basis editorially_associated --note "how it relates to the idea"
 *   bun run --cwd server review reject <es_id> --reviewer "Name" --note "why"
 *
 * Read what you approve. Requests and explanations are written by strangers: they are printed as
 * quoted text and never executed or fetched. Open a submitted link yourself, in a browser, before
 * accepting it. Accepting publishes YOUR summary and the link, not the submitter's words, and does
 * not say the claim is true or false.
 */
import { connect } from "../src/db";
import { loadEnv } from "../src/env";
import {
  ReviewError,
  createReviewService,
  type ReviewBasis,
} from "../src/discovery/evidence";

const [command, id, ...rest] = process.argv.slice(2);

function option(name: string): string | undefined {
  const at = rest.indexOf(`--${name}`);
  return at === -1 ? undefined : rest[at + 1];
}
function need(name: string): string {
  const value = option(name);
  if (value === undefined || value === "") {
    console.error(`--${name} is required`);
    process.exit(1);
  }
  return value;
}

const env = loadEnv();
const db = connect(env.databaseDirectUrl);
const review = createReviewService({ db });
// Untrusted text is printed as a JSON string so control characters cannot reach the terminal.
const quote = (text: string) => JSON.stringify(text);

try {
  switch (command) {
    case "list": {
      const work = await review.pending();
      console.log(`${work.requests.length} request(s) waiting for review:`);
      for (const r of work.requests) {
        console.log(
          `  ${r.id}  on idea ${r.ideaId} (${quote(r.ideaTitle)})  ${r.createdAt}`,
        );
        console.log(`    asks: ${quote(r.question)}`);
      }
      console.log(
        `${work.submissions.length} supporting reference(s) waiting for review:`,
      );
      for (const s of work.submissions) {
        console.log(`  ${s.id}  for ${s.requestId}  ${s.createdAt}`);
        console.log(`    question: ${quote(s.question)}`);
        console.log(`    ${s.kind}: ${quote(s.ref)}`);
        console.log(`    says: ${quote(s.explanation)}`);
      }
      break;
    }
    case "approve-request":
      console.log(await review.approveRequest(id ?? "", need("reviewer")));
      break;
    case "reject-request":
      await review.rejectRequest(id ?? "", need("reviewer"), need("note"));
      console.log("rejected");
      break;
    case "close-request":
      await review.closeRequest(id ?? "", need("reviewer"), need("note"));
      console.log("closed as unresolved");
      break;
    case "accept": {
      const basis = need("basis");
      const result = await review.acceptSubmission(id ?? "", need("reviewer"), {
        summary: need("summary"),
        basis:
          basis === "creator_confirmed" ||
          basis === "editorially_associated" ||
          basis === "uncertain"
            ? basis
            : (() => {
                throw new ReviewError(
                  "--basis must be creator_confirmed, editorially_associated or uncertain",
                );
              })(),
        basisNote: option("note") ?? null,
      } satisfies {
        summary: string;
        basis: ReviewBasis;
        basisNote: string | null;
      });
      console.log(result);
      break;
    }
    case "reject":
      await review.rejectSubmission(id ?? "", need("reviewer"), need("note"));
      console.log("rejected");
      break;
    default:
      console.error(
        "usage: review list | approve-request <id> | reject-request <id> | close-request <id> | accept <id> | reject <id>  (see the header of scripts/review.ts)",
      );
      process.exitCode = 1;
  }
} catch (e) {
  if (e instanceof ReviewError) {
    console.error(e.message);
    process.exitCode = 1;
  } else throw e;
} finally {
  await db.close();
}
