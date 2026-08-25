import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/permissions";
import { ALL_TOOL_KEYS } from "@/lib/tools";

const toolKeySchema = z.enum(ALL_TOOL_KEYS as [string, ...string[]]);

const updateSchema = z.object({
  role: z.enum(["admin", "user"]).optional(),
  allowedTools: z.array(toolKeySchema).optional(),
  regenerateInvite: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: RouteContext<"/api/users/[id]">) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await ctx.params;
  const userId = Number(id);

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Neplatný payload" }, { status: 400 });
  }

  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) {
    return NextResponse.json({ error: "Používateľ neexistuje." }, { status: 404 });
  }

  if (parsed.data.role && parsed.data.role !== "admin" && target.email === admin.email) {
    return NextResponse.json({ error: "Nemôžete zmeniť rolu vlastného konta." }, { status: 400 });
  }

  const changes: Partial<typeof users.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (parsed.data.role) changes.role = parsed.data.role;
  if (parsed.data.allowedTools) changes.allowedTools = JSON.stringify(parsed.data.allowedTools);
  if (parsed.data.regenerateInvite) {
    if (target.status !== "pending") {
      return NextResponse.json({ error: "Pozvánku možno obnoviť len pre čakajúcich používateľov." }, { status: 400 });
    }
    changes.inviteToken = randomBytes(32).toString("hex");
  }

  const [updated] = await db.update(users).set(changes).where(eq(users.id, userId)).returning();

  return NextResponse.json({
    user: {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      allowedTools: JSON.parse(updated.allowedTools || "[]"),
      inviteToken: updated.inviteToken,
      createdAt: updated.createdAt,
    },
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/users/[id]">) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await ctx.params;
  const userId = Number(id);

  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) {
    return NextResponse.json({ error: "Používateľ neexistuje." }, { status: 404 });
  }
  if (target.email === admin.email) {
    return NextResponse.json({ error: "Nemôžete zmazať vlastné konto." }, { status: 400 });
  }

  await db.delete(users).where(eq(users.id, userId));
  return NextResponse.json({ ok: true });
}
