import type { DefaultSession } from "next-auth";
import type { ToolKey } from "@/shared/tools";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: "admin" | "user";
      tools: ToolKey[];
      nickname?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: "admin" | "user";
    tools?: ToolKey[];
    nickname?: string | null;
  }
}
