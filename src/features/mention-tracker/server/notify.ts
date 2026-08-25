import { env } from "@/shared/env";

export interface MentionNotification {
  title: string;
  url: string;
  snippet: string;
  term: string;
  publishedDate: string | null;
}

export async function dispatchNotification(mention: MentionNotification): Promise<void> {
  const webhookUrl = env.NOTIFICATION_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mention),
    });
    if (!response.ok) {
      console.error(`Notification webhook vrátil ${response.status} pre ${mention.url}`);
    }
  } catch (error) {
    console.error("Notification webhook zlyhal:", error);
  }
}
