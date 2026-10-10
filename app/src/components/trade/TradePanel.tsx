import { formatUnits, type EntryStatus } from "@relay/domain";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import {
  ApiRequestError,
  fetchQuote,
  type ExecutionView,
  type PlanCardView,
  type QuoteView,
} from "../../lib/api";
import { useWallClock } from "../../lib/clock";
import {
  API_URL,
  CLUSTER,
  CLUSTER_LABEL,
  NETWORK_INFO,
} from "../../lib/config";
import {
  FollowSendError,
  MAX_FOLLOW_USDC,
  MIN_FOLLOW_USDC,
  checkFollowAmount,
  composeFromQuote,
  fetchTokenBalance,
  formatSol,
  pairById,
  sendSigned,
  verifyWithRetry,
  wireOf,
} from "../../lib/follow";
import { formatDuration, formatUsdText, shortAddress } from "../../lib/format";
import { formatTimestamp } from "../../lib/sources";
import { reviewUnavailableReason } from "../../lib/status";
import {
  WalletSignError,
  openWalletDialog,
  signWithWallet,
  useWallet,
} from "../../lib/wallet";
import { Icon } from "../ui/Icon";
import { TokenIcon } from "../ui/TokenIcon";

type Step =
  | { k: "edit" }
  | { k: "quoting" }
  | { k: "quoted"; quote: QuoteView }
  | { k: "signing"; quote: QuoteView }
  | { k: "sending"; quote: QuoteView }
  | { k: "verifying"; quote: QuoteView; signature: string }
  | { k: "done"; execution: ExecutionView }
  | { k: "error"; message: string; signature?: string };

const BUSY = new Set<Step["k"]>(["quoting", "signing", "sending", "verifying"]);

function errorText(e: unknown): string {
  const m = e instanceof Error ? e.message : "Something went wrong";
  return m.replace(/\.$/, "");
}

/**
 * Following one Relay plan, in the order a trade must happen: amount, fresh quote, review of the
 * guaranteed minimum, fees, expiry and the plan's conditions, then an explicit approval in the
 * wallet. Relay sends the signed transaction to this build's network itself and shows a receipt
 * only after the server has re-read it from the chain. A failed transaction stays failed.
 */
export function TradePanel({
  card,
  status,
  msUntilExpiry,
}: {
  card: PlanCardView;
  status: EntryStatus;
  msUntilExpiry: number;
}) {
  const ids = useId();
  const amountId = `${ids}amount`;
  const msgId = `${ids}msg`;
  const pair = pairById(card.pair.id);
  const { state: wallet } = useWallet();
  const connected = wallet.status === "connected" ? wallet : null;
  const wall = useWallClock();
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>({ k: "edit" });
  const [notice, setNotice] = useState<string | null>(null);

  const check = checkFollowAmount(amount, card.pair.quoteDecimals);
  const open =
    NETWORK_INFO.swapsAvailable &&
    status === "in_range" &&
    card.planStatus === "open" &&
    pair !== undefined;
  const busy = BUSY.has(step.k);
  const quote =
    step.k === "quoted" ||
    step.k === "signing" ||
    step.k === "sending" ||
    step.k === "verifying"
      ? step.quote
      : null;
  const quoteLeftMs =
    quote && wall !== null ? quote.summary.quoteExpiresAtMs - wall : null;
  const quoteExpired = quoteLeftMs !== null && quoteLeftMs <= 0;

  const balance = useQuery({
    queryKey: ["balance", connected?.account.address, pair?.quote.mint],
    queryFn: () =>
      connected && pair
        ? fetchTokenBalance(connected.account.address, pair.quote.mint)
        : null,
    enabled: connected !== null && pair !== undefined && open,
    retry: 0,
    staleTime: 15_000,
  });
  const balanceUnits =
    balance.isSuccess && typeof balance.data === "bigint" ? balance.data : null;

  const getQuote = async () => {
    if (!connected || !check.ok) return;
    setNotice(null);
    setStep({ k: "quoting" });
    try {
      const q = await fetchQuote(API_URL, {
        planPda: card.planPda,
        follower: connected.account.address,
        version: card.version.version,
        quoteAmount: check.text,
      });
      setStep({ k: "quoted", quote: q });
    } catch (e) {
      setStep({
        k: "error",
        message:
          e instanceof ApiRequestError
            ? e.message.replace(/\.$/, "")
            : `Couldn't get a quote: ${errorText(e)}`,
      });
    }
  };

  const approve = async (q: QuoteView) => {
    if (!pair) return;
    setNotice(null);
    setStep({ k: "signing", quote: q });
    let wire: Uint8Array;
    try {
      wire = wireOf((await composeFromQuote(q, pair)).transaction);
    } catch {
      setStep({
        k: "error",
        message: "Relay couldn't rebuild this quote safely. Get a new quote",
      });
      return;
    }
    let signed: Uint8Array;
    try {
      signed = await signWithWallet(wire);
    } catch (e) {
      if (e instanceof WalletSignError && e.cancelled) {
        setNotice(e.message);
        setStep({ k: "quoted", quote: q });
      } else setStep({ k: "error", message: errorText(e) });
      return;
    }
    setStep({ k: "sending", quote: q });
    let signature: string;
    try {
      signature = (await sendSigned(wire, signed)).signature;
    } catch (e) {
      setStep({
        k: "error",
        message:
          e instanceof FollowSendError
            ? e.message
            : `Not sent: ${errorText(e)}`,
      });
      return;
    }
    await verify(q, signature);
  };

  const verify = async (q: QuoteView | null, signature: string) => {
    if (q) setStep({ k: "verifying", quote: q, signature });
    try {
      setStep({
        k: "done",
        execution: await verifyWithRetry(API_URL, signature),
      });
    } catch (e) {
      setStep({
        k: "error",
        message: `Sent, but not verified yet: ${errorText(e)}`,
        signature,
      });
    }
  };

  const onAmount = (v: string) => {
    setAmount(v.replace(/[^\d.,]/g, ""));
    setNotice(null);
    if (step.k === "quoted" || step.k === "error") setStep({ k: "edit" });
  };

  let label: string;
  let action: (() => void) | null = null;
  if (!NETWORK_INFO.swapsAvailable)
    label = `Swaps aren't available on ${NETWORK_INFO.label}`;
  else if (!open)
    label = pair ? reviewUnavailableReason(status) : "Pair not supported";
  else if (!connected) {
    label = wallet.status === "connecting" ? "Connecting…" : "Connect wallet";
    action = openWalletDialog;
  } else if (step.k === "quoting") label = "Getting a quote…";
  else if (step.k === "signing") label = `Approve in ${connected.wallet.name}…`;
  else if (step.k === "sending")
    label = `Confirming on ${CLUSTER_LABEL[CLUSTER]}…`;
  else if (step.k === "verifying") label = "Verifying the receipt…";
  else if (step.k === "done") {
    label = "Follow again";
    action = () => {
      setAmount("");
      setStep({ k: "edit" });
    };
  } else if (step.k === "error" && step.signature) {
    const sig = step.signature;
    label = "Check again";
    action = () => void verify(null, sig);
  } else if (step.k === "quoted" && !quoteExpired) {
    const q = step.quote;
    label = `Approve in ${connected.wallet.name}`;
    action = () => void approve(q);
  } else {
    label = step.k === "quoted" ? "Get a new quote" : "Get quote";
    action = check.ok ? () => void getQuote() : null;
  }

  const amountMessage = check.ok ? null : check.message;
  const base = card.pair.baseSymbol;
  const quoteSym = card.pair.quoteSymbol;

  return (
    <section
      className="trade"
      aria-labelledby={`${ids}title`}
      data-cursor="native"
    >
      <header className="trade__head">
        <h2 id={`${ids}title`} className="trade__title">
          Follow this plan
        </h2>
        <span className="trade__net">
          <span className="trade__net-dot" aria-hidden="true" />
          {CLUSTER_LABEL[CLUSTER]}
        </span>
      </header>

      <div className="trade__box" data-disabled={!open}>
        <div className="trade__box-top">
          <label htmlFor={amountId}>You pay</label>
          {balanceUnits !== null && (
            <span className="trade__balance">
              Balance{" "}
              <span className="num">
                {formatUnits(balanceUnits, card.pair.quoteDecimals)}
              </span>{" "}
              {quoteSym}
            </span>
          )}
        </div>
        <div className="trade__amount">
          <input
            id={amountId}
            className="trade__input num"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder="0.00"
            value={amount}
            onChange={(e) => onAmount(e.target.value)}
            disabled={!open || busy}
            aria-invalid={amountMessage !== null}
            aria-describedby={msgId}
          />
          <span className="token-chip">
            <TokenIcon symbol={quoteSym} size={22} />
            {quoteSym}
          </span>
        </div>
        <p
          id={msgId}
          className={
            amountMessage ? "trade__msg trade__msg--error" : "trade__msg"
          }
        >
          {amountMessage ??
            `${MIN_FOLLOW_USDC}–${Number(MAX_FOLLOW_USDC).toLocaleString("en-US")} ${quoteSym} per follow`}
        </p>
      </div>

      <div className="trade__arrow" aria-hidden="true">
        <Icon name="arrow-down" size={16} />
      </div>

      <div className="trade__box trade__box--out" data-disabled={!open}>
        <div className="trade__box-top">
          <span>You receive</span>
          {quote && <span className="trade__balance">Estimate</span>}
        </div>
        <div className="trade__amount">
          <output className="trade__out num" aria-live="polite">
            {quote ? quote.summary.receive.display : "—"}
          </output>
          <span className="token-chip">
            <TokenIcon symbol={base} size={22} />
            {base}
          </span>
        </div>
        <p className="trade__msg">
          {quote ? (
            <>
              At least{" "}
              <span className="num">
                {quote.summary.minimumReceive.display}
              </span>{" "}
              {base}, or the trade fails instead
            </>
          ) : (
            "Shown after a quote"
          )}
        </p>
      </div>

      <dl className="trade__rows">
        <div>
          <dt>Plan entry</dt>
          <dd className="num">
            {formatUsdText(card.version.entryLow)} –{" "}
            {formatUsdText(card.version.entryHigh)}
          </dd>
        </div>
        <div>
          <dt>Window</dt>
          <dd>
            {msUntilExpiry > 0 && card.planStatus === "open" ? (
              <>
                Closes in{" "}
                <span className="num">{formatDuration(msUntilExpiry)}</span>
              </>
            ) : (
              <>Closed {formatTimestamp(card.version.expiresAt)}</>
            )}
          </dd>
        </div>
        {quote && (
          <>
            <div>
              <dt>Price</dt>
              <dd className="num">
                {formatUsdText(quote.summary.effectivePrice.display)} per {base}
              </dd>
            </div>
            <div>
              <dt>Quote</dt>
              <dd>
                {quoteExpired ? (
                  <span className="trade__warn">Expired</span>
                ) : quoteLeftMs !== null ? (
                  <>
                    Valid for{" "}
                    <span className="num">{formatDuration(quoteLeftMs)}</span>
                  </>
                ) : (
                  "Fresh"
                )}
              </dd>
            </div>
          </>
        )}
      </dl>

      {quote && (
        <details className="trade__details">
          <summary>
            Fees and route
            <Icon name="details" size={16} />
          </summary>
          <dl className="trade__rows">
            <div>
              <dt>Network fee</dt>
              <dd className="num">
                {formatSol(BigInt(quote.summary.fees.networkLamports))} SOL
              </dd>
            </div>
            <div>
              <dt>Priority fee</dt>
              <dd className="num">
                {formatSol(BigInt(quote.summary.fees.priorityLamports))} SOL
              </dd>
            </div>
            <div>
              <dt>Receipt account</dt>
              <dd className="num">
                {formatSol(BigInt(quote.summary.fees.receiptRentLamports))} SOL
              </dd>
            </div>
            <div>
              <dt>Route</dt>
              <dd>{quote.summary.routeLabels.join(" → ") || "Jupiter"}</dd>
            </div>
          </dl>
        </details>
      )}

      {quote?.summary.check === "may_fail_near_upper_bound" && (
        <p className="trade__note trade__note--warn" role="note">
          <Icon name="alert" size={16} />
          With slippage the price could pass the plan's top. If it does, the
          trade fails and nothing is bought.
        </p>
      )}

      {(open || !NETWORK_INFO.swapsAvailable) && (
        <p className="trade__note" role="note">
          <Icon name="shield" size={16} />
          {NETWORK_INFO.note}
          {open &&
            " Relay sends the signed transaction to this network itself."}
        </p>
      )}

      {notice && (
        <p className="trade__note" role="status">
          {notice}
        </p>
      )}
      {step.k === "error" && (
        <p className="trade__note trade__note--error" role="alert">
          <Icon name="alert" size={16} />
          {step.message}.
        </p>
      )}

      <button
        type="button"
        className="btn btn--primary btn--large btn--block trade__cta"
        onClick={action ?? undefined}
        disabled={action === null || busy}
        aria-busy={busy}
      >
        {busy && <span className="spinner spinner--dark" aria-hidden="true" />}
        {label}
      </button>

      {(step.k === "signing" ||
        step.k === "sending" ||
        step.k === "verifying") && (
        <ol className="trade__steps" aria-label="Progress">
          {(["signing", "sending", "verifying"] as const).map((k, i) => {
            const at = ["signing", "sending", "verifying"].indexOf(step.k);
            return (
              <li
                key={k}
                data-state={i < at ? "done" : i === at ? "now" : "next"}
              >
                {k === "signing"
                  ? "Approve in wallet"
                  : k === "sending"
                    ? "Confirm on network"
                    : "Verify receipt"}
              </li>
            );
          })}
        </ol>
      )}

      {step.k === "done" && <Outcome x={step.execution} card={card} />}

      <p className="trade__fine">
        Not financial advice. Nothing trades without your approval in the
        wallet.
      </p>
    </section>
  );
}

function Outcome({ x, card }: { x: ExecutionView; card: PlanCardView }) {
  if (x.status === "failed")
    return (
      <div className="trade__outcome" data-status="failed" role="status">
        <p className="trade__outcome-head">
          <Icon name="alert" size={18} />
          Failed · no trade
        </p>
        <p>{x.errorMessage ?? "The transaction failed on chain."}</p>
        <p className="trade__outcome-meta num">
          tx {shortAddress(x.signature)}
        </p>
      </div>
    );
  return (
    <div className="trade__outcome" role="status">
      <p className="trade__outcome-head">
        <Icon name="chain" size={18} />
        Verified receipt
      </p>
      <dl className="trade__rows">
        {x.quoteSpent !== null && (
          <div>
            <dt>Spent</dt>
            <dd className="num">
              {formatUnits(BigInt(x.quoteSpent), card.pair.quoteDecimals)}{" "}
              {card.pair.quoteSymbol}
            </dd>
          </div>
        )}
        {x.baseReceived !== null && (
          <div>
            <dt>Received</dt>
            <dd className="num">
              {formatUnits(BigInt(x.baseReceived), card.pair.baseDecimals)}{" "}
              {card.pair.baseSymbol}
            </dd>
          </div>
        )}
      </dl>
      <p className="trade__outcome-meta num">
        tx {shortAddress(x.signature)}
        {x.receiptPda && <> · receipt {shortAddress(x.receiptPda)}</>}
      </p>
    </div>
  );
}
