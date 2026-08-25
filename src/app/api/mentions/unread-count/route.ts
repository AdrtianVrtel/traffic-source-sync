import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { requireTool } from "@/shared/auth/permissions";
import { db } from "@/shared/db";
import { mentions } from "@/shared/db/schema";

export async function GET() {
  const user = await requireTool("mention-tracker");
  if (user instanceof NextResponse) return user;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mentions)
    .where(eq(mentions.isRead, false));

  return NextResponse.json({ count });
}
