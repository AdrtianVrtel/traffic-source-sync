export interface Mention {
  id: number;
  termId: number;
  term: string | null;
  url: string;
  title: string;
  snippet: string;
  sourceDomain: string;
  faviconUrl: string | null;
  publishedDate: string | null;
  isRead: boolean;
  firstSeenAt: string;
}

export interface TrackedTerm {
  id: number;
  term: string;
  query: string;
  active: boolean;
  createdAt: string;
  mentionsCount: number;
}

export interface LastRun {
  runAt: string;
  status: "running" | "success" | "error";
  trigger: "cron" | "manual";
  resultsCount: number;
  newMentionsCount: number;
  errorMessage: string | null;
}

export type MentionsTab = "new" | "all" | "terms";

export interface MentionsPage {
  mentions: Mention[];
  total: number;
  totalCount: number;
  unreadCount: number;
  configured: boolean;
  lastRun: LastRun | null;
}
