export const TOOLS = [
  { key: "traffic-sync", label: "Traffic Source Sync", path: "/" },
  { key: "ac-cleaner", label: "ActiveCampaign Cleaner", path: "/ac-cleaner" },
  { key: "mention-tracker", label: "Mention Tracker", path: "/mention-tracker" },
] as const;

export type ToolKey = (typeof TOOLS)[number]["key"];

export const ALL_TOOL_KEYS: ToolKey[] = TOOLS.map((t) => t.key);
