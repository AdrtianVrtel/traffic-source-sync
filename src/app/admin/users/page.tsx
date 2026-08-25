"use client";

import { ToolPage } from "@/shared/ui/ToolPage";
import { UserManagement } from "@/features/user-management/components/UserManagement";

export default function AdminUsersPage() {
  return (
    <ToolPage
      pageKey="admin-users-page"
      resource="users"
      noAccessDescription="Správa používateľov je dostupná len administrátorom."
    >
      <UserManagement />
    </ToolPage>
  );
}
