import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { hashPassword } from "@/shared/auth/password";

const findPendingByToken = async (token: string) => {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.inviteToken, token), eq(users.status, "pending")))
    .limit(1);
  return user;
};

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Chýba token." }, { status: 400 });
  }

  const user = await findPendingByToken(token);
  if (!user) {
    return NextResponse.json({ error: "Pozvánka je neplatná alebo už bola použitá." }, { status: 404 });
  }

  return NextResponse.json({ email: user.email });
}

const completeSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, "Heslo musí mať aspoň 6 znakov"),
});

export async function POST(req: Request) {
  const parsed = completeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Neplatný payload" }, { status: 400 });
  }

  const user = await findPendingByToken(parsed.data.token);
  if (!user) {
    return NextResponse.json({ error: "Pozvánka je neplatná alebo už bola použitá." }, { status: 404 });
  }

  await db
    .update(users)
    .set({
      passwordHash: hashPassword(parsed.data.password),
      status: "active",
      inviteToken: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, user.id));

  return NextResponse.json({ email: user.email });
}
