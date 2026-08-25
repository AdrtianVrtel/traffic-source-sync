"use client";

import { ToolPage } from "@/shared/ui/ToolPage";
import { MentionTrackerTool } from "@/features/mention-tracker/components/MentionTracker";

export default function MentionTrackerPage() {
  return (
    <ToolPage pageKey="mention-tracker-page" resource="mention-tracker">
      <MentionTrackerTool />
    </ToolPage>
  );
}
