export type AutomationTrigger =
  | "DAYS_AFTER_SIGNUP"
  | "DAYS_AFTER_PURCHASE"
  | "DAYS_BEFORE_EXPIRY"
  | "DAYS_BEFORE_BIRTHDAY"
  | "LOW_SESSIONS_REMAINING"
  | "PLAN_ENDING_SOON"
  | "TAG_ADDED"
  | "TAG_REMOVED"
  | "ON_FIRST_LOGIN"
  | "MANUAL";

export type AutomationAction =
  | { type: "SEND_MESSAGE"; subject: string; body: string }
  | { type: "SEND_EMAIL"; subject: string; body: string }
  | { type: "ASSIGN_TAG"; tagName: string }
  | { type: "REMOVE_TAG"; tagName: string }
  | { type: "ASSIGN_PLAN"; planId: string }
  | { type: "SEND_PUSH"; title: string; body: string; url?: string }
  | { type: "UPDATE_LIFECYCLE"; stage: "LEAD" | "PROSPECT" | "CLIENT" | "FORMER_CLIENT" };

export interface AutomationFilter {
  tagIds?: string[];
  lifecycle?: string[];
  billingStatus?: string[];
}
