"use client";

import { Authenticated, CanAccess } from "@refinedev/core";
import { Alert } from "antd";
import { Layout } from "@/components/layout";
import { UserManagement } from "@/components/user-management";

export default function SettingsPage() {
  return (
    <Authenticated key="settings-page" fallback={<div style={{ padding: 24 }}>Načítavam...</div>}>
      <Layout>
        <CanAccess
          resource="users"
          action="list"
          fallback={
            <Alert
              type="warning"
              showIcon
              message="Nedostatočné oprávnenia"
              description="Správa používateľov je dostupná len administrátorom."
            />
          }
        >
          <UserManagement />
        </CanAccess>
      </Layout>
    </Authenticated>
  );
}
