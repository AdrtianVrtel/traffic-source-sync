import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { getSessionUser } from "@/shared/auth/permissions";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db
    .select({ email: users.email, nickname: users.nickname })
    .from(users)
    .where(eq(users.email, user.email!.toLowerCase()))
    .limit(1);

  if (!dbUser) {
    return NextResponse.json({ error: "Používateľ neexistuje." }, { status: 404 });
  }

  return NextResponse.json(dbUser);
}

const updateSchema = z.object({
  nickname: z.string().trim().max(50, "Prezývka môže mať najviac 50 znakov"),
});

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Neplatný payload" }, { status: 400 });
  }

  const nickname = parsed.data.nickname || null;

  await db
    .update(users)
    .set({ nickname, updatedAt: new Date().toISOString() })
    .where(eq(users.email, user.email!.toLowerCase()));

  return NextResponse.json({ nickname });
}
