"use client";

import { Authenticated, CanAccess } from "@refinedev/core";
import { Alert } from "antd";
import { Layout } from "@/components/layout";
import { AcCleanerTool } from "@/components/ac-cleaner";

export default function AcCleanerPage() {
  return (
    <Authenticated key="ac-cleaner-page" fallback={<div style={{ padding: 24 }}>Načítavam...</div>}>
      <Layout>
        <CanAccess
          resource="ac-cleaner"
          action="list"
          fallback={
            <Alert
              type="warning"
              showIcon
              message="Nedostatočné oprávnenia"
              description="K nástroju ActiveCampaign Cleaner nemáte prístup. Kontaktujte administrátora."
            />
          }
        >
          <AcCleanerTool />
        </CanAccess>
      </Layout>
    </Authenticated>
  );
}
