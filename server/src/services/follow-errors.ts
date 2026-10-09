/**
 * Consumer-facing wording for Relay program errors and swap failures. The code is stable (the UI
 * can branch on it); the message is plain language. Nothing here suggests a trade is safe.
 */
export interface FriendlyError {
  code: string;
  message: string;
}

const MESSAGES: Record<string, FriendlyError> = {
  PlanExpired: {
    code: "plan_expired",
    message: "This plan's entry window has closed.",
  },
  PlanClosed: { code: "plan_closed", message: "The creator closed this plan." },
  PlanNotYetActive: {
    code: "plan_not_active",
    message: "This plan version is not active yet.",
  },
  StaleVersion: {
    code: "stale_version",
    message: "The plan was updated. Review the latest version.",
  },
  PriceAboveRange: {
    code: "price_above_range",
    message:
      "At this amount the price would be above the plan's entry range, so it no longer matches the original plan.",
  },
  PriceBelowRange: {
    code: "price_below_range",
    message:
      "The price is under the plan's entry range. The creator's thesis may no longer hold.",
  },
  NoOutputReceived: {
    code: "swap_incomplete",
    message: "The swap would not deliver any tokens.",
  },
  NoInputSpent: {
    code: "swap_incomplete",
    message: "The swap would not spend any tokens.",
  },
  InputAboveMax: {
    code: "swap_incomplete",
    message: "The swap would spend more than you approved.",
  },
  TokenAccountMismatch: {
    code: "wrong_token_account",
    message: "The trade must use your own token accounts.",
  },
  InvalidInstructionLayout: {
    code: "invalid_layout",
    message: "The transaction is not in the form Relay accepts.",
  },
  UnexpectedInstructionBetweenSnapshots: {
    code: "invalid_layout",
    message: "The transaction is not in the form Relay accepts.",
  },
  CpiNotAllowed: {
    code: "invalid_layout",
    message: "The transaction is not in the form Relay accepts.",
  },
};

export function friendlyFollowError(errorName: string): FriendlyError {
  return (
    MESSAGES[errorName] ?? {
      code: "swap_would_fail",
      message: "This trade can't be completed right now. Nothing was spent.",
    }
  );
}
