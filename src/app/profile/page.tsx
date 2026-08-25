"use client";

import { ToolPage } from "@/shared/ui/ToolPage";
import { ProfileSettings } from "@/features/user-management/components/ProfileSettings";

export default function ProfilePage() {
  return (
    <ToolPage pageKey="profile-page">
      <ProfileSettings />
    </ToolPage>
  );
}
