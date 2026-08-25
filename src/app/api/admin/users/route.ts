import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { requireAdmin } from "@/shared/auth/permissions";
import { ALL_TOOL_KEYS } from "@/shared/tools";

const toolKeySchema = z.enum(ALL_TOOL_KEYS as [string, ...string[]]);

const toDto = (user: typeof users.$inferSelect) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  status: user.status,
  allowedTools: JSON.parse(user.allowedTools || "[]") as string[],
  inviteToken: user.inviteToken,
  createdAt: user.createdAt,
});

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const allUsers = await db.select().from(users).orderBy(users.id);
  return NextResponse.json({ users: allUsers.map(toDto) });
}

const createSchema = z.object({
  email: z.string().email("Neplatná e-mailová adresa"),
  role: z.enum(["admin", "user"]).default("user"),
  allowedTools: z.array(toolKeySchema).default([]),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Neplatný payload" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return NextResponse.json({ error: `Používateľ ${email} už existuje.` }, { status: 409 });
  }

  const now = new Date().toISOString();
  const [created] = await db
    .insert(users)
    .values({
      email,
      role: parsed.data.role,
      status: "pending",
      allowedTools: JSON.stringify(parsed.data.allowedTools),
      inviteToken: randomBytes(32).toString("hex"),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json({ user: toDto(created) }, { status: 201 });
}
