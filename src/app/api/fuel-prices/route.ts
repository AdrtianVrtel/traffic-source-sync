import { NextRequest, NextResponse } from "next/server";
import { requireTool } from "@/shared/auth/permissions";
import { fetchFuelPricesForYear, getAvailableYears } from "@/features/fuel-prices/server/api";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireTool("fuel-prices");
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");

    const currentYear = new Date().getFullYear();
    let targetYear = currentYear;

    if (yearParam) {
      const parsed = parseInt(yearParam, 10);
      const availableYears = getAvailableYears();
      if (!isNaN(parsed) && availableYears.includes(parsed)) {
        targetYear = parsed;
      }
    }

    const data = await fetchFuelPricesForYear(targetYear);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Chyba pri načítaní cien pohonných látok:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nepodarilo sa načítať ceny pohonných látok.",
      },
      { status: 500 }
    );
  }
}
