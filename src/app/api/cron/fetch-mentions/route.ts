import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/env";
import { isTavilyConfigured } from "@/lib/mention-tracker/tavily";
import { runFetchMentions } from "@/lib/mention-tracker/service";

const isAuthorized = (req: Request): boolean => {
  if (!env.CRON_SECRET) return false;
  const header = req.headers.get("authorization") ?? "";
  const provided = header.replace(/^Bearer\s+/i, "");
  const expected = env.CRON_SECRET;
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
};

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isTavilyConfigured()) {
    return NextResponse.json(
      { error: "Tavily API nie je nakonfigurované (TAVILY_API_KEY)." },
      { status: 503 }
    );
  }

  try {
    const result = await runFetchMentions("cron");
    if (result.skipped) {
      return NextResponse.json({ skipped: true, reason: result.reason });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Neznáma chyba";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
