"use client";

import React from "react";
import { Alert, Button, Form, Input, Popconfirm, Space, Switch, Table, Typography } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { formatDate } from "@/shared/utils/format-date";
import type { TrackedTerm } from "../types";

const { Text } = Typography;

const CREDIT_BUDGET_WARNING = 900;
const RUNS_PER_DAY = 4;

interface TermsTableProps {
  terms: TrackedTerm[];
  loading: boolean;
  onAdd: (term: string) => Promise<boolean>;
  onToggle: (term: TrackedTerm, active: boolean) => void;
  onDelete: (term: TrackedTerm) => void;
}

export const TermsTable = ({ terms, loading, onAdd, onToggle, onDelete }: TermsTableProps) => {
  const [form] = Form.useForm();

  const activeTermsCount = terms.filter((t) => t.active).length;
  const monthlyCreditEstimate = activeTermsCount * RUNS_PER_DAY * 30;

  const handleFinish = async (values: { term: string }) => {
    const added = await onAdd(values.term);
    if (added) form.resetFields();
  };

  const columns = [
    { title: "Kľúčové slovo", dataIndex: "term", key: "term" },
    {
      title: "Tavily query",
      dataIndex: "query",
      key: "query",
      render: (q: string) => <Text code>{q}</Text>,
    },
    {
      title: "Zmienok",
      dataIndex: "mentionsCount",
      key: "mentionsCount",
      width: 100,
    },
    {
      title: "Aktívne",
      dataIndex: "active",
      key: "active",
      width: 100,
      render: (active: boolean, record: TrackedTerm) => (
        <Switch size="small" checked={active} onChange={(checked) => onToggle(record, checked)} />
      ),
    },
    {
      title: "Pridané",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (d: string) => formatDate(d),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_: unknown, record: TrackedTerm) => (
        <Popconfirm
          title={`Zmazať "${record.term}"?`}
          description={`Zmaže sa aj ${record.mentionsCount} zmienok nájdených týmto slovom. Na dočasné vypnutie použite prepínač Aktívne.`}
          onConfirm={() => onDelete(record)}
          okText="Áno, zmazať"
          cancelText="Nie"
        >
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      {monthlyCreditEstimate > CREDIT_BUDGET_WARNING && (
        <Alert
          type="warning"
          showIcon
          message={`Odhad ~${monthlyCreditEstimate} Tavily creditov/mesiac pri ${activeTermsCount} aktívnych slovách a fetchi ${RUNS_PER_DAY}×/deň - free tier má 1000/mesiac.`}
        />
      )}
      <Form form={form} layout="inline" onFinish={handleFinish}>
        <Form.Item
          name="term"
          rules={[
            { required: true, message: "Zadajte kľúčové slovo" },
            { min: 2, message: "Aspoň 2 znaky" },
          ]}
        >
          <Input placeholder='Napr. "IIS crowdfunding"' style={{ width: 280 }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
            Pridať kľúčové slovo
          </Button>
        </Form.Item>
      </Form>
      <Table
        dataSource={terms}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        scroll={{ x: "max-content" }}
      />
    </Space>
  );
};
