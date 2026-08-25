"use client";
import { NotificationOutlined } from "@ant-design/icons";
import { useUnreadMentionsCount } from "@/features/mention-tracker/hooks/use-unread-count";


export const MentionTrackerIcon = () => {
  const count = useUnreadMentionsCount();

  return (
    <span style={{ position: "relative", display: "inline-flex", marginRight: "10px" }}>
      <NotificationOutlined />
      {count > 0 && (
        <sup
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            minWidth: 13,
            height: 13,
            padding: "1px 0 0 0",
            borderRadius: 999,
            background: "#ff4d4f",
            color: "#fff",
            fontSize: 8,
            fontWeight: 600,
            lineHeight: "10px",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          {count > 99 ? "99+" : count}
        </sup>
      )}
    </span>
  );
};
