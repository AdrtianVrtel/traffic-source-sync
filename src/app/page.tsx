"use client";

import { Authenticated } from "@refinedev/core";
import { Layout } from "@/components/layout";
import { TrafficSyncTool } from "@/components/traffic-sync-tool";

export default function Home() {
  return (
    <Authenticated key="home-page" fallback={<div style={{ padding: 24 }}>Načítavam...</div>}>
      <Layout>
        <TrafficSyncTool />
      </Layout>
    </Authenticated>
  );
}
