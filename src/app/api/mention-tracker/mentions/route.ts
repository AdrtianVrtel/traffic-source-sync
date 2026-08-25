import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireTool } from "@/shared/auth/permissions";
import { db } from "@/shared/db";
import { mentions, trackedTerms, fetchRuns } from "@/shared/db/schema";
import { isTavilyConfigured } from "@/features/mention-tracker/server/tavily";

export async function GET(req: Request) {
  const user = await requireTool("mention-tracker");
  if (user instanceof NextResponse) return user;

  const params = new URL(req.url).searchParams;
  const termId = params.get("termId");
  const read = params.get("read");
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize")) || 20));

  const conditions = [];
  if (termId) conditions.push(eq(mentions.termId, Number(termId)));
  if (read === "true") conditions.push(eq(mentions.isRead, true));
  if (read === "false") conditions.push(eq(mentions.isRead, false));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: mentions.id,
      termId: mentions.termId,
      term: trackedTerms.term,
      url: mentions.url,
      title: mentions.title,
      snippet: mentions.snippet,
      sourceDomain: mentions.sourceDomain,
      faviconUrl: mentions.faviconUrl,
      publishedDate: mentions.publishedDate,
      score: mentions.score,
      isRead: mentions.isRead,
      firstSeenAt: mentions.firstSeenAt,
    })
    .from(mentions)
    .leftJoin(trackedTerms, eq(mentions.termId, trackedTerms.id))
    .where(where)
    .orderBy(desc(mentions.firstSeenAt), desc(mentions.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(mentions)
    .where(where);

  const [{ unreadCount }] = await db
    .select({ unreadCount: sql<number>`count(*)` })
    .from(mentions)
    .where(eq(mentions.isRead, false));

  const [{ totalCount }] = await db.select({ totalCount: sql<number>`count(*)` }).from(mentions);

  const [lastRun] = await db.select().from(fetchRuns).orderBy(desc(fetchRuns.id)).limit(1);

  return NextResponse.json({
    mentions: rows,
    total,
    totalCount,
    unreadCount,
    page,
    pageSize,
    configured: isTavilyConfigured(),
    lastRun: lastRun ?? null,
  });
}
