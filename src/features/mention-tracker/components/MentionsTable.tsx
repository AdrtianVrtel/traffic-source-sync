"use client";

import React from "react";
import { Button, Empty, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import { CheckOutlined, UndoOutlined } from "@ant-design/icons";
import { formatDate } from "@/shared/utils/format-date";
import { MentionSnippet } from "./MentionSnippet";
import { SourceFavicon } from "./SourceFavicon";
import type { Mention, TrackedTerm } from "../types";

const { Link: AntLink } = Typography;

interface MentionsTableProps {
  mentions: Mention[];
  terms: TrackedTerm[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  filterTermId: number | null;
  emptyText?: string;
  totalSuffix?: string;
  onFilterTermChange: (termId: number | null) => void;
  onPageChange: (page: number, pageSize: number) => void;
  onMarkRead: (mention: Mention, isRead: boolean) => void;
}

export const MentionsTable = ({
  mentions,
  terms,
  loading,
  total,
  page,
  pageSize,
  filterTermId,
  emptyText,
  totalSuffix = "zmienok",
  onFilterTermChange,
  onPageChange,
  onMarkRead,
}: MentionsTableProps) => {
  const columns = [
    {
      title: "Titulok",
      key: "title",
      width: 320,
      render: (_: unknown, record: Mention) => (
        <Space size={6} wrap>
          <AntLink href={record.url} target="_blank" rel="noopener noreferrer" strong={!record.isRead}>
            {record.title || record.url}
          </AntLink>
          {!record.isRead && <Tag color="blue">Nové</Tag>}
        </Space>
      ),
    },
    {
      title: "Doména",
      key: "sourceDomain",
      width: 180,
      render: (_: unknown, record: Mention) =>
        record.sourceDomain && (
          <Tag icon={<SourceFavicon url={record.faviconUrl} />}>{record.sourceDomain}</Tag>
        ),
    },
    {
      title: "Úryvok",
      dataIndex: "snippet",
      key: "snippet",
      width: 420,
      render: (snippet: string, record: Mention) => <MentionSnippet text={snippet} term={record.term} />,
    },
    {
      title: "Kľúčové slovo",
      dataIndex: "term",
      key: "term",
      width: 170,
      render: (term: string | null) => (term ? <Tag color="blue">{term}</Tag> : "—"),
    },
    {
      title: "Publikované",
      key: "publishedDate",
      width: 160,
      render: (_: unknown, record: Mention) => (
        <Tooltip title={`Prvýkrát videné: ${formatDate(record.firstSeenAt)}`}>
          {record.publishedDate ? formatDate(record.publishedDate) : formatDate(record.firstSeenAt)}
        </Tooltip>
      ),
    },
    {
      title: "Akcia",
      key: "actions",
      width: 190,
      render: (_: unknown, record: Mention) =>
        record.isRead ? (
          <Button size="small" type="text" icon={<UndoOutlined />} onClick={() => onMarkRead(record, false)}>
            Označiť neprečítané
          </Button>
        ) : (
          <Button size="small" icon={<CheckOutlined />} onClick={() => onMarkRead(record, true)}>
            Označiť prečítané
          </Button>
        ),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Select
        allowClear
        placeholder="Všetky kľúčové slová"
        style={{ minWidth: 220 }}
        value={filterTermId ?? undefined}
        options={terms.map((t) => ({ label: t.term, value: t.id }))}
        onChange={(value) => onFilterTermChange(value ?? null)}
      />
      <Table
        dataSource={mentions}
        columns={columns}
        rowKey="id"
        loading={loading}
        scroll={{ x: "max-content" }}
        locale={emptyText ? { emptyText: <Empty description={emptyText} /> } : undefined}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `Celkom ${t} ${totalSuffix}`,
          onChange: onPageChange,
        }}
      />
    </Space>
  );
};
