"use client";

import { ToolPage } from "@/shared/ui/ToolPage";
import { FuelPricesTool } from "@/features/fuel-prices/components/FuelPricesTool";

export default function FuelPricesPage() {
  return (
    <ToolPage pageKey="fuel-prices-page" resource="fuel-prices">
      <FuelPricesTool />
    </ToolPage>
  );
}
