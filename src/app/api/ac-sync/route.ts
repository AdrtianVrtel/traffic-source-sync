import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { requireTool } from "@/shared/auth/permissions";
import { db } from "@/shared/db";
import { syncHistory } from "@/shared/db/schema";
import { fetchContactsSince, isAcConfigured } from "@/features/ac-cleaner/server/ac-client";
import { classifyContacts } from "@/features/ac-cleaner/server/rules";

export async function GET() {
  const user = await requireTool("ac-cleaner");
  if (user instanceof NextResponse) return user;

  const [lastDone] = await db
    .select()
    .from(syncHistory)
    .where(eq(syncHistory.status, "done"))
    .orderBy(desc(syncHistory.id))
    .limit(1);

  return NextResponse.json({
    configured: isAcConfigured(),
    lastSync: lastDone ?? null,
  });
}

export async function POST(req: Request) {
  const user = await requireTool("ac-cleaner");
  if (user instanceof NextResponse) return user;

  if (!isAcConfigured()) {
    return NextResponse.json(
      { error: "ActiveCampaign API nie je nakonfigurované. Doplňte AC_API_URL a AC_API_KEY do prostredia." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const fullScan: boolean = body?.fullScan === true;

  const [lastDone] = await db
    .select()
    .from(syncHistory)
    .where(eq(syncHistory.status, "done"))
    .orderBy(desc(syncHistory.id))
    .limit(1);

  const since = fullScan ? null : (lastDone?.startedAt ?? null);
  const startedAt = new Date().toISOString();

  const [run] = await db.insert(syncHistory).values({ startedAt }).returning();

  try {
    const contacts = await fetchContactsSince(since);
    const { hard, soft, cleanCount } = classifyContacts(contacts);

    await db
      .update(syncHistory)
      .set({
        finishedAt: new Date().toISOString(),
        status: "done",
        contactsScanned: contacts.length,
        hardMatches: hard.length,
        softMatches: soft.length,
      })
      .where(eq(syncHistory.id, run.id));

    return NextResponse.json({
      since,
      scanned: contacts.length,
      cleanCount,
      hard,
      soft,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Neznáma chyba";
    await db
      .update(syncHistory)
      .set({ finishedAt: new Date().toISOString(), status: "error", error: message })
      .where(eq(syncHistory.id, run.id));

    console.error("API Error in ac-sync:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
