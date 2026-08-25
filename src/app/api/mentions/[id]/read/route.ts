import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireTool } from "@/lib/auth/permissions";
import { db } from "@/db";
import { mentions } from "@/db/schema";

export async function PATCH(req: Request, ctx: RouteContext<"/api/mentions/[id]/read">) {
  const user = await requireTool("mention-tracker");
  if (user instanceof NextResponse) return user;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const isRead = body?.isRead === false ? false : true;

  const [updated] = await db
    .update(mentions)
    .set({ isRead })
    .where(eq(mentions.id, Number(id)))
    .returning({ id: mentions.id, isRead: mentions.isRead });

  if (!updated) {
    return NextResponse.json({ error: "Zmienka neexistuje." }, { status: 404 });
  }

  return NextResponse.json(updated);
}
