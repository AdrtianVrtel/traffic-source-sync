"use client";

import { ToolPage } from "@/shared/ui/ToolPage";
import { AcCleanerTool } from "@/features/ac-cleaner/components/AcCleanerTool";

export default function AcCleanerPage() {
  return (
    <ToolPage pageKey="ac-cleaner-page" resource="ac-cleaner">
      <AcCleanerTool />
    </ToolPage>
  );
}
