// Notification hook - jediné miesto na budúce napojenie externých notifikácií.
// MVP: bez NOTIFICATION_WEBHOOK_URL je to no-op (in-app unread badge je jediná notifikácia).
// Keď sa URL nastaví (Slack Incoming Webhook, n8n, Zapier...), pošle sa tam JSON POST -
// appka nemusí vedieť nič o cieľovom kanáli.
import { env } from "@/env";

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
    // Zlyhanie notifikácie NIKDY nesmie zhodiť fetch job
    console.error("Notification webhook zlyhal:", error);
  }
}
