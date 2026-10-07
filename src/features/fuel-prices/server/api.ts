import {
  FUEL_INDICATORS,
  FuelIndicatorCode,
  FuelPricesApiResponse,
  FuelWeekRow,
  LatestFuelSummaryItem,
} from "../types";

const SLOVAK_MONTHS = [
  "Január",
  "Február",
  "Marec",
  "Apríl",
  "Máj",
  "Jún",
  "Júl",
  "August",
  "September",
  "Október",
  "November",
  "December",
];

const CURRENT_YEAR = new Date().getFullYear();
const EARLIEST_YEAR = 2009;

export function getAvailableYears(): number[] {
  const years: number[] = [];
  for (let y = CURRENT_YEAR; y >= EARLIEST_YEAR; y--) {
    years.push(y);
  }
  return years;
}

interface JsonStatDimension {
  category: {
    index: Record<string, number>;
    label: Record<string, string>;
  };
}

interface JsonStatResponse {
  version: string;
  update?: string;
  id: string[];
  size: number[];
  dimension: {
    sp0207ts_tyz: JsonStatDimension;
    sp0207ts_ukaz: JsonStatDimension;
    sp0207ts_data: JsonStatDimension;
  };
  value: (number | null)[];
}

function parseWeekMeta(rawLabel: string, code: string, year: number) {
  // Format typically: "36. týždeň (31. 8. 2026 - 6. 9. 2026)" or "1. týždeň (29. 12. 2025 - 4. 1. 2026)"
  const match = rawLabel.match(/^(\d+)\.\s*týždeň\s*\((.*?)\s*-\s*(.*?)\)$/i);
  let weekNumber = parseInt(code.slice(4), 10) || 1;
  let startDate = "";
  let endDate = "";
  let month = 1;

  if (match) {
    weekNumber = parseInt(match[1], 10);
    startDate = match[2].trim();
    endDate = match[3].trim();

    // Parse month from endDate (e.g. "6. 9. 2026")
    const parts = endDate.split(".").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const parsedMonth = parseInt(parts[1], 10);
      if (parsedMonth >= 1 && parsedMonth <= 12) {
        month = parsedMonth;
      }
    }
  } else {
    // Fallback: estimate month from weekNumber
    month = Math.min(12, Math.max(1, Math.ceil((weekNumber * 7) / 30.5)));
    startDate = `${weekNumber}. týždeň`;
    endDate = `${year}`;
  }

  const monthName = SLOVAK_MONTHS[month - 1] || "Neznámy";

  return {
    weekNumber,
    startDate,
    endDate,
    month,
    monthName,
    dateLabel: rawLabel || `${weekNumber}. týždeň ${year}`,
  };
}

export async function fetchFuelPricesForYear(
  targetYear: number = CURRENT_YEAR
): Promise<FuelPricesApiResponse> {
  const url = `https://data.statistics.sk/api/v2/dataset/sp0207ts/${targetYear}*/all?lang=sk&type=json`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    next: { revalidate: 3600 }, // 1 hour cache
  });

  if (!response.ok) {
    throw new Error(
      `Nepodarilo sa stiahnuť dáta z ŠÚ SR (status ${response.status})`
    );
  }

  const data = (await response.json()) as JsonStatResponse;

  const tyzDimension = data.dimension?.sp0207ts_tyz;
  const ukazDimension = data.dimension?.sp0207ts_ukaz;

  if (!tyzDimension || !ukazDimension || !data.value) {
    return {
      year: targetYear,
      availableYears: getAvailableYears(),
      updatedAt: data.update || null,
      items: [],
      latestSummary: [],
    };
  }

  const numUkaz = data.size?.[1] || Object.keys(ukazDimension.category.index).length;

  const weekEntries = Object.entries(tyzDimension.category.label);

  // Parse rows
  const parsedRows: FuelWeekRow[] = weekEntries.map(([weekCode, rawLabel]) => {
    const weekIdx = tyzDimension.category.index[weekCode];
    const { weekNumber, startDate, endDate, month, monthName, dateLabel } =
      parseWeekMeta(rawLabel, weekCode, targetYear);

    const prices: Partial<Record<FuelIndicatorCode, number | null>> = {};

    for (const [ukazCode, uIdx] of Object.entries(ukazDimension.category.index)) {
      const flatIndex = weekIdx * numUkaz + uIdx;
      const rawVal = data.value[flatIndex];
      prices[ukazCode as FuelIndicatorCode] =
        typeof rawVal === "number" && !isNaN(rawVal) ? rawVal : null;
    }

    return {
      key: weekCode,
      weekCode,
      weekNumber,
      year: targetYear,
      month,
      monthName,
      dateLabel,
      startDate,
      endDate,
      isMonthBoundary: false,
      prices,
      diffs: {},
    };
  });

  // Sort descending by week code (newest week at the top)
  parsedRows.sort((a, b) => b.weekCode.localeCompare(a.weekCode));

  // Compute diffs against previous chronological week
  for (let i = 0; i < parsedRows.length; i++) {
    const current = parsedRows[i];
    const nextInList = parsedRows[i + 1]; // Older week chronologically

    if (nextInList) {
      for (const [code] of Object.entries(FUEL_INDICATORS)) {
        const curPrice = current.prices[code as FuelIndicatorCode];
        const prevPrice = nextInList.prices[code as FuelIndicatorCode];
        if (
          typeof curPrice === "number" &&
          typeof prevPrice === "number" &&
          curPrice !== null &&
          prevPrice !== null
        ) {
          const diff = Math.round((curPrice - prevPrice) * 1000) / 1000;
          current.diffs[code as FuelIndicatorCode] = diff;
        } else {
          current.diffs[code as FuelIndicatorCode] = null;
        }
      }
    }

    // Flag month boundaries for soft visual separation
    const prevMonthInList = i > 0 ? parsedRows[i - 1].month : null;
    current.isMonthBoundary = i === 0 || current.month !== prevMonthInList;
  }

  // Construct latestSummary for top KPI badges
  const latestRow = parsedRows[0];
  const summaryCodes: FuelIndicatorCode[] = [
    "UKAZ01", // Benzin 95
    "UKAZ04", // Nafta
    "UKAZ03", // LPG
    "UKAZ021", // Benzin 98-100 (alebo UKAZ02)
  ];

  const latestSummary: LatestFuelSummaryItem[] = [];

  if (latestRow) {
    for (const code of summaryCodes) {
      const meta = FUEL_INDICATORS[code];
      if (!meta) continue;

      let price = latestRow.prices[code] ?? null;
      let diff = latestRow.diffs[code] ?? null;

      // Fallback for 98 if 98-100 is null in older years
      if (code === "UKAZ021" && price === null) {
        price = latestRow.prices["UKAZ02"] ?? null;
        diff = latestRow.diffs["UKAZ02"] ?? null;
      }

      latestSummary.push({
        code,
        label: meta.shortLabel,
        unit: meta.unit,
        price,
        diff,
      });
    }
  }

  return {
    year: targetYear,
    availableYears: getAvailableYears(),
    updatedAt: data.update || null,
    items: parsedRows,
    latestSummary,
  };
}
