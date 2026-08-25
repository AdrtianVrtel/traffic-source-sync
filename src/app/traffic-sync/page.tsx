"use client";

import { Authenticated, CanAccess } from "@refinedev/core";
import { Alert } from "antd";
import { Layout } from "@/shared/ui/AppLayout";
import { TrafficSyncTool } from "@/features/traffic-sync/components/TrafficSyncTool";

export default function Home() {
  return (
    <Authenticated key="home-page" fallback={<div style={{ padding: 24 }}>Načítavam...</div>}>
      <Layout>
        <CanAccess
          resource="traffic-sync"
          action="list"
          fallback={
            <Alert
              type="warning"
              showIcon
              message="Nedostatočné oprávnenia"
              description="K nástroju Traffic Source Sync nemáte prístup. Kontaktujte administrátora."
            />
          }
        >
          <TrafficSyncTool />
        </CanAccess>
      </Layout>
    </Authenticated>
  );
}
