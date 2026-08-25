"use client";

import { Authenticated, CanAccess } from "@refinedev/core";
import { Alert } from "antd";
import { Layout } from "@/components/layout";
import { MentionTrackerTool } from "@/components/mention-tracker";

export default function MentionTrackerPage() {
  return (
    <Authenticated key="mention-tracker-page" fallback={<div style={{ padding: 24 }}>Načítavam...</div>}>
      <Layout>
        <CanAccess
          resource="mention-tracker"
          action="list"
          fallback={
            <Alert
              type="warning"
              showIcon
              message="Nedostatočné oprávnenia"
              description="K nástroju Mention Tracker nemáte prístup. Kontaktujte administrátora."
            />
          }
        >
          <MentionTrackerTool />
        </CanAccess>
      </Layout>
    </Authenticated>
  );
}
