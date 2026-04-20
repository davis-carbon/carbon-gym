/**
 * Dashboard card configuration constants — shared between the server router
 * and client-side page. Must not import any server-only modules.
 */

export const CARD_TYPES = [
  "NEW_ACCOUNTS",
  "FAILED_PAYMENTS",
  "EXPIRING_PACKAGES",
  "COMPLETED_ASSESSMENTS",
  "NO_LOGGED_WORKOUTS",
  "BIRTHDAY_SOON",
  "NO_RECENT_VISITS",
  "NEW_MESSAGES",
  "NEW_UPLOADS",
  "ACTIVE_PACKAGES",
  "ACTIVE_CLIENTS",
  "NEW_LEADS",
  "CANCELLATIONS",
  "RENEWALS",
  "EXPIRING_CARDS",
] as const;

export type CardType = (typeof CARD_TYPES)[number];

export const TIME_RANGES = [
  "TODAY",
  "THIS_WEEK",
  "THIS_MONTH",
  "LAST_7_DAYS",
  "LAST_30_DAYS",
  "LAST_90_DAYS",
  "NEXT_7_DAYS",
  "NEXT_30_DAYS",
  "NEXT_90_DAYS",
] as const;

export type TimeRange = (typeof TIME_RANGES)[number];

export interface DashboardCard {
  id: string;
  type: CardType;
  timeRange: TimeRange;
}

export const DEFAULT_CARDS: DashboardCard[] = [
  { id: "c1", type: "NEW_ACCOUNTS", timeRange: "THIS_MONTH" },
  { id: "c2", type: "FAILED_PAYMENTS", timeRange: "THIS_MONTH" },
  { id: "c3", type: "EXPIRING_PACKAGES", timeRange: "NEXT_30_DAYS" },
  { id: "c4", type: "COMPLETED_ASSESSMENTS", timeRange: "THIS_MONTH" },
  { id: "c5", type: "NO_LOGGED_WORKOUTS", timeRange: "LAST_30_DAYS" },
  { id: "c6", type: "BIRTHDAY_SOON", timeRange: "NEXT_7_DAYS" },
  { id: "c7", type: "NO_RECENT_VISITS", timeRange: "LAST_30_DAYS" },
  { id: "c8", type: "ACTIVE_CLIENTS", timeRange: "THIS_MONTH" },
];

export const CARD_META: Record<CardType, {
  title: string;
  defaultTimeRange: TimeRange;
  availableRanges: TimeRange[];
  category: string;
}> = {
  NEW_ACCOUNTS: { title: "New Accounts", defaultTimeRange: "THIS_MONTH", availableRanges: ["TODAY", "THIS_WEEK", "THIS_MONTH", "LAST_30_DAYS", "LAST_90_DAYS"], category: "Clients" },
  FAILED_PAYMENTS: { title: "Failed Payments", defaultTimeRange: "THIS_MONTH", availableRanges: ["TODAY", "THIS_WEEK", "THIS_MONTH", "LAST_30_DAYS"], category: "Billing" },
  EXPIRING_PACKAGES: { title: "Expiring Packages", defaultTimeRange: "NEXT_30_DAYS", availableRanges: ["NEXT_7_DAYS", "NEXT_30_DAYS", "NEXT_90_DAYS"], category: "Billing" },
  COMPLETED_ASSESSMENTS: { title: "Completed Assessments", defaultTimeRange: "THIS_MONTH", availableRanges: ["TODAY", "THIS_WEEK", "THIS_MONTH", "LAST_30_DAYS"], category: "Engagement" },
  NO_LOGGED_WORKOUTS: { title: "No Logged Workouts", defaultTimeRange: "LAST_30_DAYS", availableRanges: ["LAST_7_DAYS", "LAST_30_DAYS", "LAST_90_DAYS"], category: "Engagement" },
  BIRTHDAY_SOON: { title: "Birthday Soon", defaultTimeRange: "NEXT_7_DAYS", availableRanges: ["NEXT_7_DAYS", "NEXT_30_DAYS"], category: "Clients" },
  NO_RECENT_VISITS: { title: "No Recent Visits", defaultTimeRange: "LAST_30_DAYS", availableRanges: ["LAST_7_DAYS", "LAST_30_DAYS", "LAST_90_DAYS"], category: "Engagement" },
  NEW_MESSAGES: { title: "New Messages", defaultTimeRange: "THIS_MONTH", availableRanges: ["TODAY", "THIS_WEEK", "THIS_MONTH", "LAST_30_DAYS"], category: "Engagement" },
  NEW_UPLOADS: { title: "New Uploads", defaultTimeRange: "THIS_MONTH", availableRanges: ["THIS_WEEK", "THIS_MONTH", "LAST_30_DAYS"], category: "Content" },
  ACTIVE_PACKAGES: { title: "Active Packages", defaultTimeRange: "THIS_MONTH", availableRanges: ["THIS_MONTH"], category: "Billing" },
  ACTIVE_CLIENTS: { title: "Active Clients", defaultTimeRange: "THIS_MONTH", availableRanges: ["THIS_MONTH"], category: "Clients" },
  NEW_LEADS: { title: "New Leads", defaultTimeRange: "THIS_MONTH", availableRanges: ["TODAY", "THIS_WEEK", "THIS_MONTH", "LAST_30_DAYS"], category: "Clients" },
  CANCELLATIONS: { title: "Cancellations", defaultTimeRange: "THIS_MONTH", availableRanges: ["TODAY", "THIS_WEEK", "THIS_MONTH", "LAST_30_DAYS"], category: "Billing" },
  RENEWALS: { title: "Renewals", defaultTimeRange: "THIS_MONTH", availableRanges: ["TODAY", "THIS_WEEK", "THIS_MONTH", "LAST_30_DAYS"], category: "Billing" },
  EXPIRING_CARDS: { title: "Expiring Card Accounts", defaultTimeRange: "NEXT_30_DAYS", availableRanges: ["NEXT_7_DAYS", "NEXT_30_DAYS"], category: "Billing" },
};
