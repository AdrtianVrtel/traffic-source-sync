import { NextResponse } from "next/server";
import { requireTool } from "@/lib/auth/permissions";
import { isTavilyConfigured } from "@/lib/mention-tracker/tavily";
import { getLastRunAt, runFetchMentions, RUN_COOLDOWN_MINUTES } from "@/lib/mention-tracker/service";

export async function POST() {
  const user = await requireTool("mention-tracker");
  if (user instanceof NextResponse) return user;

  if (!isTavilyConfigured()) {
    return NextResponse.json(
      { error: "Tavily API nie je nakonfigurované. Doplňte TAVILY_API_KEY do prostredia." },
      { status: 503 }
    );
  }

  const lastRunAt = await getLastRunAt();
  if (lastRunAt) {
    const elapsedMs = Date.now() - new Date(lastRunAt).getTime();
    const cooldownMs = RUN_COOLDOWN_MINUTES * 60_000;
    if (elapsedMs < cooldownMs) {
      const waitMinutes = Math.ceil((cooldownMs - elapsedMs) / 60_000);
      return NextResponse.json(
        { error: `Fetch bežal nedávno. Skúste znova o ${waitMinutes} min.`, retryAfterMinutes: waitMinutes },
        { status: 429 }
      );
    }
  }

  try {
    const result = await runFetchMentions("manual");
    if (result.skipped) {
      return NextResponse.json({ error: result.reason }, { status: 429 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Neznáma chyba";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
