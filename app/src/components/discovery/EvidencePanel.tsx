import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { API_URL } from "../../lib/config";
import {
  EXPLANATION_MAX,
  QUESTION_MAX,
  REQUEST_STATUS_LABEL,
  askForEvidence,
  formatWhen,
  questionProblem,
  referenceProblem,
  sendReference,
  type EventView,
  type PrivateRequest,
  type PublicEvidenceRequest,
} from "../../lib/discovery";
import { useMyRequests } from "../../lib/discovery-queries";

const SUBMISSION_LABEL = {
  pending: "Waiting for a reviewer",
  accepted: "A reviewer published this",
  rejected: "Not accepted by a reviewer",
} as const;

export interface AskTarget {
  eventId: string | null;
  /** Changes each time the reader taps "Ask for evidence about this", so focus moves again. */
  tick: number;
}

function errorText(error: Error | null): string | null {
  return error ? error.message : null;
}

/**
 * Evidence requests, in plain words. Anyone can ask a narrow question about an idea and anyone can
 * offer a reference, but a reviewer at Relay decides what is shown, and a reviewer's response is
 * not a finding that something is true. Questions and references are private until then.
 */
export function EvidencePanel({
  ideaId,
  events,
  publicRequests,
  target,
}: {
  ideaId: string;
  events: readonly EventView[];
  publicRequests: readonly PublicEvidenceRequest[];
  target: AskTarget;
}) {
  const mine = useMyRequests();
  const myRequests = (mine.data ?? []).filter((r) => r.ideaId === ideaId);
  const eventLabel = (id: string | null): string | null => {
    if (id === null) return null;
    const e = events.find((x) => x.id === id);
    return e ? e.summary : null;
  };

  return (
    <section
      id="evidence"
      className="evidence"
      aria-labelledby="evidence-title"
    >
      <h2 id="evidence-title" className="page__subsection">
        Evidence requests
      </h2>
      <p className="page__text page__text--quiet">
        Ask a narrow question about this idea. A reviewer at Relay decides
        whether it is published. Relay does not judge whether a claim is true; a
        response is a reference, not a verdict.
      </p>

      {publicRequests.length > 0 && (
        <ul className="evidence__list" aria-label="Published questions">
          {publicRequests.map((r) => (
            <li key={r.id} className="evidence__item">
              <p className="evidence__q">{r.question}</p>
              <p className="evidence__meta">
                <span className="badge badge--quiet">
                  {r.status === "open"
                    ? "Open"
                    : r.status === "answered"
                      ? "Reference published"
                      : "Closed without an answer"}
                </span>
                {r.approvedAt && (
                  <span>Approved {formatWhen(r.approvedAt)}</span>
                )}
              </p>
              {r.aboutEventId && eventLabel(r.aboutEventId) && (
                <p className="evidence__meta">
                  About:{" "}
                  <a href={`#event-${r.aboutEventId}`}>
                    {eventLabel(r.aboutEventId)}
                  </a>
                </p>
              )}
              {r.responseEventIds.map((id) => (
                <p key={id} className="evidence__meta">
                  <a href={`#event-${id}`}>See the published reference</a>
                </p>
              ))}
              {r.note && <p className="evidence__meta">{r.note}</p>}
              {(r.status === "open" || r.status === "answered") && (
                <details className="evidence__offer">
                  <summary>Offer a reference</summary>
                  <ReferenceForm requestId={r.id} />
                </details>
              )}
            </li>
          ))}
        </ul>
      )}

      <AskForm ideaId={ideaId} events={events} target={target} />

      {myRequests.length > 0 && (
        <div className="evidence__mine">
          <h3 className="evidence__sub">Your questions on this idea</h3>
          <p className="page__text page__text--quiet">
            Only this browser can see these until a reviewer publishes them.
          </p>
          <ul className="evidence__list">
            {myRequests.map((r) => (
              <MyRequest key={r.id} request={r} />
            ))}
          </ul>
        </div>
      )}
      {mine.isError && (
        <p className="field__hint" role="status">
          Couldn't load your own questions right now.
        </p>
      )}
    </section>
  );
}

function AskForm({
  ideaId,
  events,
  target,
}: {
  ideaId: string;
  events: readonly EventView[];
  target: AskTarget;
}) {
  const client = useQueryClient();
  const id = useId();
  const input = useRef<HTMLInputElement | null>(null);
  const [question, setQuestion] = useState("");
  const [eventId, setEventId] = useState<string>("");
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  // "Ask for evidence about this" on a timeline entry: pick that entry and move focus here.
  useEffect(() => {
    if (target.tick === 0) return;
    setEventId(target.eventId ?? "");
    setSent(null);
    input.current?.focus();
    input.current?.scrollIntoView({ block: "center" });
  }, [target.tick, target.eventId]);

  const send = useMutation({
    mutationFn: () =>
      askForEvidence(API_URL, {
        ideaId,
        eventId: eventId || null,
        question: question.trim(),
      }),
    onSuccess: ({ created }) => {
      setQuestion("");
      setTouched(false);
      setSent(
        created
          ? "Sent. A reviewer will decide whether to publish your question. It is private until then."
          : "You already asked this. It is waiting below.",
      );
      void client.invalidateQueries({ queryKey: ["discovery", "me"] });
    },
  });

  const problem = questionProblem(question);
  const shown = touched && problem ? problem : null;
  const length = [...question.trim()].length;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setSent(null);
    if (problem || send.isPending) return;
    send.mutate();
  };

  return (
    <form className="evidence__form" onSubmit={submit} noValidate>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-q`}>
          Ask for evidence
        </label>
        <input
          ref={input}
          id={`${id}-q`}
          className="field__input"
          type="text"
          value={question}
          maxLength={QUESTION_MAX + 40}
          placeholder="Is there a record of the entry price?"
          aria-invalid={shown ? true : undefined}
          aria-describedby={`${id}-hint`}
          onChange={(e) => setQuestion(e.target.value)}
          onBlur={() => setTouched(question.length > 0)}
        />
        <p
          id={`${id}-hint`}
          className={shown ? "field__error" : "field__hint"}
          role={shown ? "alert" : undefined}
        >
          {shown ??
            `${length}/${QUESTION_MAX}. Words only, no links. This is not accusing anyone.`}
        </p>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-e`}>
          About
        </label>
        <select
          id={`${id}-e`}
          className="field__input"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
        >
          <option value="">The idea as a whole</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.summary.length > 70 ? `${e.summary.slice(0, 67)}…` : e.summary}
            </option>
          ))}
        </select>
      </div>
      <div className="evidence__row">
        <button
          type="submit"
          className="btn btn--primary"
          disabled={send.isPending}
        >
          {send.isPending ? "Sending…" : "Send the question"}
        </button>
      </div>
      {send.isError && (
        <p className="field__error" role="alert">
          {errorText(send.error)} Your question was not sent.
        </p>
      )}
      {sent && (
        <p className="evidence__ok" role="status">
          {sent}
        </p>
      )}
    </form>
  );
}

function MyRequest({ request }: { request: PrivateRequest }) {
  return (
    <li className="evidence__item">
      <p className="evidence__q">{request.question}</p>
      <p className="evidence__meta">
        <span className="badge badge--quiet">
          {REQUEST_STATUS_LABEL[request.status]}
        </span>
        <span>Sent {formatWhen(request.createdAt)}</span>
      </p>
      {request.reviewNote && (
        <p className="evidence__meta">Reviewer note: {request.reviewNote}</p>
      )}
      {request.submissions.length > 0 && (
        <ul className="evidence__subs" aria-label="Your references">
          {request.submissions.map((s) => (
            <li key={s.id}>
              <span className="badge badge--quiet">
                {SUBMISSION_LABEL[s.status]}
              </span>{" "}
              <span className="evidence__ref">{s.ref}</span>
              {s.reviewNote && (
                <span className="evidence__meta"> · {s.reviewNote}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function ReferenceForm({ requestId }: { requestId: string }) {
  const client = useQueryClient();
  const id = useId();
  const [kind, setKind] = useState<"url" | "transaction">("url");
  const [ref, setRef] = useState("");
  const [explanation, setExplanation] = useState("");
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);

  const send = useMutation({
    mutationFn: () =>
      sendReference(API_URL, requestId, {
        kind,
        ref: ref.trim(),
        explanation: explanation.trim(),
      }),
    onSuccess: () => {
      setRef("");
      setExplanation("");
      setTouched(false);
      setSent(true);
      void client.invalidateQueries({ queryKey: ["discovery", "me"] });
    },
  });

  const problem = referenceProblem(kind, ref, explanation);
  const shown = touched ? problem : null;

  return (
    <form
      className="evidence__form evidence__form--inner"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        setSent(false);
        if (problem || send.isPending) return;
        send.mutate();
      }}
    >
      <p className="evidence__sub">Add a reference</p>
      <p className="field__hint">
        Relay never opens your link. A reviewer reads it and decides what to
        publish, in their own words.
      </p>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-k`}>
          Kind
        </label>
        <select
          id={`${id}-k`}
          className="field__input"
          value={kind}
          onChange={(e) =>
            setKind(e.target.value === "transaction" ? "transaction" : "url")
          }
        >
          <option value="url">A web link (https)</option>
          <option value="transaction">A Solana transaction signature</option>
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-r`}>
          {kind === "url" ? "Link" : "Signature"}
        </label>
        <input
          id={`${id}-r`}
          className="field__input"
          type="text"
          value={ref}
          maxLength={500}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setRef(e.target.value)}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-x`}>
          What it shows
        </label>
        <input
          id={`${id}-x`}
          className="field__input"
          type="text"
          value={explanation}
          maxLength={EXPLANATION_MAX + 40}
          aria-invalid={shown ? true : undefined}
          aria-describedby={`${id}-err`}
          onChange={(e) => setExplanation(e.target.value)}
        />
        <p
          id={`${id}-err`}
          className={shown ? "field__error" : "field__hint"}
          role={shown ? "alert" : undefined}
        >
          {shown ?? "Only reviewers see this explanation. It is not published."}
        </p>
      </div>
      <div className="evidence__row">
        <button
          type="submit"
          className="btn btn--glass"
          disabled={send.isPending}
        >
          {send.isPending ? "Sending…" : "Send the reference"}
        </button>
      </div>
      {send.isError && (
        <p className="field__error" role="alert">
          {errorText(send.error)} Your reference was not sent.
        </p>
      )}
      {sent && (
        <p className="evidence__ok" role="status">
          Sent. A reviewer will decide whether to publish it.
        </p>
      )}
    </form>
  );
}
