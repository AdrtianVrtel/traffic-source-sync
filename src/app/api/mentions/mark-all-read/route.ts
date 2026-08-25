import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireTool } from "@/lib/auth/permissions";
import { db } from "@/db";
import { mentions } from "@/db/schema";

export async function POST() {
  const user = await requireTool("mention-tracker");
  if (user instanceof NextResponse) return user;

  const updated = await db
    .update(mentions)
    .set({ isRead: true })
    .where(eq(mentions.isRead, false))
    .returning({ id: mentions.id });

  return NextResponse.json({ markedCount: updated.length });
}
