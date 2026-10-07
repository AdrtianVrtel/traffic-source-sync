export type FuelIndicatorCode =
  | "UKAZ01"
  | "UKAZ02"
  | "UKAZ021"
  | "UKAZ03"
  | "UKAZ04"
  | "UKAZ041"
  | "UKAZ042"
  | "UKAZ05"
  | "UKAZ06"
  | "UKAZ07"
  | "UKAZ08"
  | "UKAZ09"
  | "UKAZ10"
  | "UKAZ11";

export interface FuelIndicatorMeta {
  code: FuelIndicatorCode;
  fullLabel: string;
  shortLabel: string;
  unit: string;
  category: "standard" | "premium" | "gas" | "eco";
  priority: number;
}

export const FUEL_INDICATORS: Record<FuelIndicatorCode, FuelIndicatorMeta> = {
  UKAZ01: {
    code: "UKAZ01",
    fullLabel: "Benzín 95 (eur / l)",
    shortLabel: "Benzín 95",
    unit: "€ / l",
    category: "standard",
    priority: 1,
  },
  UKAZ04: {
    code: "UKAZ04",
    fullLabel: "Motorová nafta (eur / l)",
    shortLabel: "Motorová nafta",
    unit: "€ / l",
    category: "standard",
    priority: 2,
  },
  UKAZ03: {
    code: "UKAZ03",
    fullLabel: "LPG (eur / l)",
    shortLabel: "LPG",
    unit: "€ / l",
    category: "standard",
    priority: 3,
  },
  UKAZ02: {
    code: "UKAZ02",
    fullLabel: "Prémiový benzín 98 (eur / l)",
    shortLabel: "Benzín 98",
    unit: "€ / l",
    category: "premium",
    priority: 4,
  },
  UKAZ021: {
    code: "UKAZ021",
    fullLabel: "Prémiový benzín 98 - 100 (eur / l)",
    shortLabel: "Benzín 98-100",
    unit: "€ / l",
    category: "premium",
    priority: 5,
  },
  UKAZ041: {
    code: "UKAZ041",
    fullLabel: "Prémiová motorová nafta (eur / l)",
    shortLabel: "Prémiová nafta",
    unit: "€ / l",
    category: "premium",
    priority: 6,
  },
  UKAZ05: {
    code: "UKAZ05",
    fullLabel: "CNG (eur / kg)",
    shortLabel: "CNG",
    unit: "€ / kg",
    category: "gas",
    priority: 7,
  },
  UKAZ06: {
    code: "UKAZ06",
    fullLabel: "LNG (eur / kg)",
    shortLabel: "LNG",
    unit: "€ / kg",
    category: "gas",
    priority: 8,
  },
  UKAZ042: {
    code: "UKAZ042",
    fullLabel: "HVO (eur / l)",
    shortLabel: "HVO (bionafta)",
    unit: "€ / l",
    category: "eco",
    priority: 9,
  },
  UKAZ07: {
    code: "UKAZ07",
    fullLabel: "bioLNG (eur / kg)",
    shortLabel: "bioLNG",
    unit: "€ / kg",
    category: "eco",
    priority: 10,
  },
  UKAZ08: {
    code: "UKAZ08",
    fullLabel: "Vodík (eur / kg)",
    shortLabel: "Vodík",
    unit: "€ / kg",
    category: "eco",
    priority: 11,
  },
  UKAZ09: {
    code: "UKAZ09",
    fullLabel: "Elektrická energia stredne rýchle nabíjanie / AC (eur / 1 kWh)",
    shortLabel: "Elektrina AC",
    unit: "€ / kWh",
    category: "eco",
    priority: 12,
  },
  UKAZ10: {
    code: "UKAZ10",
    fullLabel: "Elektrická energia rýchle nabíjanie / DC (eur / 1 kWh)",
    shortLabel: "Elektrina DC",
    unit: "€ / kWh",
    category: "eco",
    priority: 13,
  },
  UKAZ11: {
    code: "UKAZ11",
    fullLabel: "Elektrická energia ultrarýchle nabíjanie / DC (eur / 1 kWh)",
    shortLabel: "Elektrina Ultra DC",
    unit: "€ / kWh",
    category: "eco",
    priority: 14,
  },
};

export interface FuelWeekRow {
  key: string;
  weekCode: string;
  weekNumber: number;
  year: number;
  month: number;
  monthName: string;
  dateLabel: string;
  startDate: string;
  endDate: string;
  isMonthBoundary: boolean;
  prices: Partial<Record<FuelIndicatorCode, number | null>>;
  diffs: Partial<Record<FuelIndicatorCode, number | null>>;
}

export interface LatestFuelSummaryItem {
  code: FuelIndicatorCode;
  label: string;
  unit: string;
  price: number | null;
  diff: number | null;
}

export interface FuelPricesApiResponse {
  year: number;
  availableYears: number[];
  updatedAt: string | null;
  items: FuelWeekRow[];
  latestSummary: LatestFuelSummaryItem[];
}
