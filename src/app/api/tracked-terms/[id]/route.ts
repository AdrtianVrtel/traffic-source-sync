import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireTool } from "@/lib/auth/permissions";
import { db } from "@/db";
import { trackedTerms, mentions } from "@/db/schema";

const updateSchema = z.object({
  active: z.boolean(),
});

export async function PATCH(req: Request, ctx: RouteContext<"/api/tracked-terms/[id]">) {
  const user = await requireTool("mention-tracker");
  if (user instanceof NextResponse) return user;

  const { id } = await ctx.params;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Neplatný payload" }, { status: 400 });
  }

  const [updated] = await db
    .update(trackedTerms)
    .set({ active: parsed.data.active })
    .where(eq(trackedTerms.id, Number(id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Kľúčové slovo neexistuje." }, { status: 404 });
  }

  return NextResponse.json({ term: updated });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/tracked-terms/[id]">) {
  const user = await requireTool("mention-tracker");
  if (user instanceof NextResponse) return user;

  const { id } = await ctx.params;
  const termId = Number(id);

  const [target] = await db.select().from(trackedTerms).where(eq(trackedTerms.id, termId)).limit(1);
  if (!target) {
    return NextResponse.json({ error: "Kľúčové slovo neexistuje." }, { status: 404 });
  }

  await db.delete(mentions).where(eq(mentions.termId, termId));
  await db.delete(trackedTerms).where(eq(trackedTerms.id, termId));

  return NextResponse.json({ ok: true });
}
