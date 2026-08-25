import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { requireTool } from "@/lib/auth/permissions";
import { db } from "@/db";
import { trackedTerms } from "@/db/schema";

export async function GET() {
  const user = await requireTool("mention-tracker");
  if (user instanceof NextResponse) return user;

  const terms = await db
    .select({
      id: trackedTerms.id,
      term: trackedTerms.term,
      query: trackedTerms.query,
      active: trackedTerms.active,
      createdAt: trackedTerms.createdAt,
      mentionsCount: sql<number>`(SELECT count(*) FROM mentions WHERE mentions.term_id = tracked_terms.id)`,
    })
    .from(trackedTerms)
    .orderBy(trackedTerms.id);

  return NextResponse.json({ terms });
}

const createSchema = z.object({
  term: z
    .string()
    .trim()
    .min(2, "Kľúčové slovo musí mať aspoň 2 znaky")
    .max(100, "Kľúčové slovo môže mať najviac 100 znakov")
    .refine((v) => !v.includes('"'), 'Kľúčové slovo nesmie obsahovať úvodzovky (")'),
});

export async function POST(req: Request) {
  const user = await requireTool("mention-tracker");
  if (user instanceof NextResponse) return user;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Neplatný payload" }, { status: 400 });
  }

  const term = parsed.data.term;
  const [existing] = await db.select().from(trackedTerms).where(eq(trackedTerms.term, term)).limit(1);
  if (existing) {
    return NextResponse.json({ error: `Kľúčové slovo "${term}" už existuje.` }, { status: 409 });
  }

  const [created] = await db
    .insert(trackedTerms)
    .values({ term, query: `"${term}"`, createdAt: new Date().toISOString() })
    .returning();

  return NextResponse.json({ term: { ...created, mentionsCount: 0 } }, { status: 201 });
}
