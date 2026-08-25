import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTool } from "@/shared/auth/permissions";
import { env } from "@/shared/env";
import { db } from "@/shared/db";
import { archivedContacts } from "@/shared/db/schema";
import { archiveContact, isAcConfigured } from "@/features/ac-cleaner/server/ac-client";

const payloadSchema = z.object({
  contacts: z
    .array(
      z.object({
        id: z.string().min(1),
        email: z.string().min(1),
        category: z.enum(["hard", "soft"]),
        reasons: z.array(z.string()).default([]),
      })
    )
    .min(1, "Zoznam kontaktov je prázdny"),
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  const user = await requireTool("ac-cleaner");
  if (user instanceof NextResponse) return user;

  const parsed = payloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Neplatný payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { contacts } = parsed.data;
  const mode = env.AC_ARCHIVE_MODE;

  if (mode === "live" && !isAcConfigured()) {
    return NextResponse.json(
      { error: "ActiveCampaign API nie je nakonfigurované. Doplňte AC_API_URL a AC_API_KEY do prostredia." },
      { status: 503 }
    );
  }

  const archived: string[] = [];
  const failed: { email: string; error: string }[] = [];

  for (const contact of contacts) {
    try {
      if (mode === "dry-run") {
        console.warn(
          `[AC-ARCHIVE DRY-RUN] Kontakt ${contact.email} (AC id ${contact.id}) by dostal tag "test_archived" ` +
            `a bol by odhlásený zo všetkých zoznamov. Dôvody: ${contact.reasons.join("; ")}`
        );
      } else {
        await archiveContact(contact.id);
        await sleep(300);
      }

      await db.insert(archivedContacts).values({
        acContactId: contact.id,
        email: contact.email,
        category: contact.category,
        reasons: contact.reasons.join("; "),
        mode,
        archivedAt: new Date().toISOString(),
      });

      archived.push(contact.email);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Neznáma chyba";
      console.error(`AC archive zlyhal pre ${contact.email}:`, error);
      failed.push({ email: contact.email, error: message });
    }
  }

  return NextResponse.json({ mode, archived, failed });
}
