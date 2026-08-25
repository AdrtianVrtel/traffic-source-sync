import { and, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/shared/db";
import { fetchRuns, mentions, trackedTerms } from "@/shared/db/schema";
import { searchTavily, type TavilyResult } from "./tavily";
import { extractSnippet } from "../snippet";
import { dispatchNotification } from "./notify";

export const RUN_COOLDOWN_MINUTES = 10;

const TRACKING_PARAMS_PREFIXES = ["utm_", "mc_", "pk_"];
const TRACKING_PARAMS = ["fbclid", "gclid", "msclkid", "ref", "igshid"];

export function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (TRACKING_PARAMS.includes(lower) || TRACKING_PARAMS_PREFIXES.some((p) => lower.startsWith(p))) {
        url.searchParams.delete(key);
      }
    }
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}

const buildSnippet = (result: TavilyResult, term: string): string => {
  if (result.rawContent) {
    const fromRaw = extractSnippet(result.rawContent, term);
    if (fromRaw.matched) return fromRaw.snippet;
  }

  const fromContent = extractSnippet(result.content, term);
  return fromContent.snippet;
};

const domainFromUrl = (rawUrl: string): string => {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const minutesAgoIso = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export interface FetchRunResult {
  skipped: boolean;
  reason?: string;
  runId?: number;
  termsSearched?: number;
  resultsCount?: number;
  newMentionsCount?: number;
}

export async function getLastRunAt(): Promise<string | null> {
  const [last] = await db
    .select({ runAt: fetchRuns.runAt })
    .from(fetchRuns)
    .orderBy(desc(fetchRuns.id))
    .limit(1);
  return last?.runAt ?? null;
}

export async function runFetchMentions(trigger: "cron" | "manual"): Promise<FetchRunResult> {
  const cutoff = minutesAgoIso(RUN_COOLDOWN_MINUTES);

  const [runningRun] = await db
    .select({ id: fetchRuns.id })
    .from(fetchRuns)
    .where(and(eq(fetchRuns.status, "running"), gt(fetchRuns.runAt, cutoff)))
    .limit(1);
  if (runningRun) {
    return { skipped: true, reason: "Iný fetch práve beží." };
  }

  await db
    .update(fetchRuns)
    .set({ status: "error", errorMessage: "Beh sa nikdy nedokončil (pravdepodobne reštart appky)." })
    .where(and(eq(fetchRuns.status, "running"), lt(fetchRuns.runAt, cutoff)));

  const [run] = await db
    .insert(fetchRuns)
    .values({ trigger, runAt: new Date().toISOString() })
    .returning();

  let resultsCount = 0;
  let newMentionsCount = 0;
  let creditsUsed = 0;

  try {
    const activeTerms = await db.select().from(trackedTerms).where(eq(trackedTerms.active, true));

    for (const term of activeTerms) {
      const results = await searchTavily(term.query);
      creditsUsed += 1;
      resultsCount += results.length;

      for (const result of results) {
        const url = normalizeUrl(result.url);
        const snippet = buildSnippet(result, term.term);
        const inserted = await db
          .insert(mentions)
          .values({
            termId: term.id,
            url,
            title: result.title,
            snippet,
            sourceDomain: domainFromUrl(url),
            faviconUrl: result.favicon,
            publishedDate: result.publishedDate,
            score: result.score,
            firstSeenAt: new Date().toISOString(),
          })
          .onConflictDoNothing()
          .returning({ id: mentions.id });

        if (inserted.length > 0) {
          newMentionsCount++;
          await dispatchNotification({
            title: result.title,
            url,
            snippet,
            term: term.term,
            publishedDate: result.publishedDate,
          });
        }
      }
    }

    await db
      .update(fetchRuns)
      .set({ status: "success", resultsCount, newMentionsCount, creditsUsed })
      .where(eq(fetchRuns.id, run.id));

    return {
      skipped: false,
      runId: run.id,
      termsSearched: activeTerms.length,
      resultsCount,
      newMentionsCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Neznáma chyba";
    console.error("Mention fetch zlyhal:", error);
    await db
      .update(fetchRuns)
      .set({ status: "error", errorMessage: message, resultsCount, newMentionsCount, creditsUsed })
      .where(eq(fetchRuns.id, run.id));
    throw error;
  }
}
