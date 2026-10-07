import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { getSessionUser, requireTool } from "@/shared/auth/permissions";
import { FuelIndicatorCode, FUEL_INDICATORS } from "@/features/fuel-prices/types";

const DEFAULT_STANDARD_FUELS: FuelIndicatorCode[] = [
  "UKAZ01", // Benzín 95
  "UKAZ04", // Motorová nafta
  "UKAZ03", // LPG
  "UKAZ021", // Benzín 98-100
  "UKAZ041", // Prémiová nafta
  "UKAZ05", // CNG
];

export async function GET() {
  const auth = await requireTool("fuel-prices");
  if (auth instanceof NextResponse) return auth;

  const sessionUser = await getSessionUser();
  if (!sessionUser?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db
    .select({ fuelPreferences: users.fuelPreferences })
    .from(users)
    .where(eq(users.email, sessionUser.email.toLowerCase()))
    .limit(1);

  let standardFuels: FuelIndicatorCode[] = DEFAULT_STANDARD_FUELS;

  if (dbUser?.fuelPreferences) {
    try {
      const parsed = JSON.parse(dbUser.fuelPreferences);
      if (Array.isArray(parsed?.standardFuels) && parsed.standardFuels.length > 0) {
        // filter valid codes
        standardFuels = parsed.standardFuels.filter((c: string) => c in FUEL_INDICATORS);
      }
    } catch (e) {
      console.error("Failed to parse fuelPreferences:", e);
    }
  }

  return NextResponse.json({ standardFuels });
}

const preferencesSchema = z.object({
  standardFuels: z.array(z.string()).min(1, "Aspoň jedno palivo musí zostať v základných palivách"),
});

export async function POST(req: Request) {
  const auth = await requireTool("fuel-prices");
  if (auth instanceof NextResponse) return auth;

  const sessionUser = await getSessionUser();
  if (!sessionUser?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = preferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Neplatný payload" },
      { status: 400 }
    );
  }

  // Validate indicator codes
  const validCodes = parsed.data.standardFuels.filter((c) => c in FUEL_INDICATORS) as FuelIndicatorCode[];
  if (validCodes.length === 0) {
    return NextResponse.json(
      { error: "Musíte vybrať aspoň jedno platné palivo." },
      { status: 400 }
    );
  }

  const preferencesJson = JSON.stringify({ standardFuels: validCodes });

  await db
    .update(users)
    .set({
      fuelPreferences: preferencesJson,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.email, sessionUser.email.toLowerCase()));

  return NextResponse.json({ success: true, standardFuels: validCodes });
}
