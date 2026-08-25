"use client";

import React from "react";
import { theme, Typography } from "antd";
import { findTermMatches } from "@/features/mention-tracker/snippet";

const { Text, Paragraph } = Typography;

const buildHighlightedParts = (text: string, term: string, color: string): React.ReactNode[] => {
  const matches = findTermMatches(text, term);
  if (!text || matches.length === 0) return [text];

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    if (match.start > cursor) parts.push(text.slice(cursor, match.start));
    parts.push(
      <Text key={`${match.start}-${index}`} strong style={{ color }}>
        {text.slice(match.start, match.end)}
      </Text>
    );
    cursor = match.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return parts;
};

export const MentionSnippet = ({ text, term }: { text: string; term: string | null }) => {
  const { token } = theme.useToken();
  const parts = term ? buildHighlightedParts(text, term, token.colorPrimary) : [text];

  return (
    <Paragraph
      type="secondary"
      style={{ marginBottom: 0 }}
      ellipsis={{
        rows: 3,
        expandable: "collapsible",
        symbol: (isExpanded: boolean) => (isExpanded ? "Zobraziť menej" : "Zobraziť viac"),
      }}
    >
      {parts}
    </Paragraph>
  );
};
