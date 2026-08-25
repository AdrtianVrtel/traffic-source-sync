"use client";

import { ToolPage } from "@/shared/ui/ToolPage";
import { TrafficSyncTool } from "@/features/traffic-sync/components/TrafficSyncTool";

export default function TrafficSyncPage() {
  return (
    <ToolPage pageKey="traffic-sync-page" resource="traffic-sync">
      <TrafficSyncTool />
    </ToolPage>
  );
}
