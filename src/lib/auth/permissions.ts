// Serverové kontroly oprávnení pre API routes
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import type { ToolKey } from "@/lib/tools";

export type SessionUser = Session["user"];

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session.user.role) return null;
  return session.user;
}

export const canUseTool = (user: SessionUser, tool: ToolKey) =>
  user.role === "admin" || (user.tools ?? []).includes(tool);

// Vráti používateľa, alebo hotovú error response (401/403), ktorú route rovno returne
export async function requireTool(tool: ToolKey): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canUseTool(user, tool)) {
    return NextResponse.json({ error: "Nemáte prístup k tomuto nástroju." }, { status: 403 });
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Vyžaduje sa administrátorské oprávnenie." }, { status: 403 });
  }
  return user;
}
