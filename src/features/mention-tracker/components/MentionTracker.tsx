"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Form,
  Input,
  message,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  theme,
  Tooltip,
  Typography,
} from "antd";
import {
  CheckOutlined,
  DeleteOutlined,
  GlobalOutlined,
  PlusOutlined,
  SyncOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { findTermMatches } from "@/features/mention-tracker/snippet";

const { Title, Text, Paragraph, Link: AntLink } = Typography;

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

const MentionSnippet = ({ text, term }: { text: string; term: string | null }) => {
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

const SourceFavicon = ({ url }: { url: string | null }) => {
  const [failed, setFailed] = useState(false);

  if (!url || failed) return <GlobalOutlined />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={16}
      height={16}
      style={{ borderRadius: 2, verticalAlign: "middle" }}
      onError={() => setFailed(true)}
    />
  );
};

interface Mention {
  id: number;
  termId: number;
  term: string | null;
  url: string;
  title: string;
  snippet: string;
  sourceDomain: string;
  faviconUrl: string | null;
  publishedDate: string | null;
  isRead: boolean;
  firstSeenAt: string;
}

interface TrackedTerm {
  id: number;
  term: string;
  query: string;
  active: boolean;
  createdAt: string;
  mentionsCount: number;
}

interface LastRun {
  runAt: string;
  status: "running" | "success" | "error";
  trigger: "cron" | "manual";
  resultsCount: number;
  newMentionsCount: number;
  errorMessage: string | null;
}

const CREDIT_BUDGET_WARNING = 900;
const RUNS_PER_DAY = 4;

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("sk-SK") : "—";

const emitMentionsUpdated = () => window.dispatchEvent(new Event("mentions-updated"));

export const MentionTrackerTool = () => {
  const [mentionList, setMentionList] = useState<Mention[]>([]);
  const [terms, setTerms] = useState<TrackedTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [lastRun, setLastRun] = useState<LastRun | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterTermId, setFilterTermId] = useState<number | null>(null);
  const [filterRead, setFilterRead] = useState<"all" | "unread" | "read">("all");
  const [termForm] = Form.useForm();

  const fetchMentionsData = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filterTermId) params.set("termId", String(filterTermId));
    if (filterRead === "unread") params.set("read", "false");
    if (filterRead === "read") params.set("read", "true");

    const response = await fetch(`/api/mentions?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Nepodarilo sa načítať zmienky.");
    return data;
  }, [page, pageSize, filterTermId, filterRead]);

  const fetchTermsData = useCallback(async () => {
    const response = await fetch("/api/tracked-terms");
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Nepodarilo sa načítať kľúčové slová.");
    return data;
  }, []);

  const applyMentionsData = (data: {
    mentions: Mention[];
    total: number;
    unreadCount: number;
    configured: boolean;
    lastRun: LastRun | null;
  }) => {
    setMentionList(data.mentions);
    setTotal(data.total);
    setUnreadCount(data.unreadCount);
    setConfigured(data.configured);
    setLastRun(data.lastRun);
  };

  const loadMentions = async () => applyMentionsData(await fetchMentionsData());
  const loadTerms = async () => setTerms((await fetchTermsData()).terms);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchMentionsData(), fetchTermsData()])
      .then(([mentionsData, termsData]) => {
        if (!cancelled) {
          applyMentionsData(mentionsData);
          setTerms(termsData.terms);
        }
      })
      .catch((error) => {
        if (!cancelled) message.error(error instanceof Error ? error.message : "Načítanie zlyhalo.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchMentionsData, fetchTermsData]);

  const handleFetchNow = async () => {
    setFetching(true);
    try {
      const response = await fetch("/api/mentions/fetch-now", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Fetch zlyhal.");
      message.success(
        `Hotovo: ${data.termsSearched} kľúčových slov, ${data.resultsCount} výsledkov, ${data.newMentionsCount} nových zmienok.`
      );
      await Promise.all([loadMentions(), loadTerms()]);
      emitMentionsUpdated();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Fetch zlyhal.");
    } finally {
      setFetching(false);
    }
  };

  const handleMarkRead = async (mention: Mention, isRead: boolean) => {
    try {
      const response = await fetch(`/api/mentions/${mention.id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead }),
      });
      if (!response.ok) throw new Error("Zmena zlyhala.");
      setMentionList((prev) => prev.map((m) => (m.id === mention.id ? { ...m, isRead } : m)));
      setUnreadCount((prev) => prev + (isRead ? -1 : 1));
      emitMentionsUpdated();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Zmena zlyhala.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch("/api/mentions/mark-all-read", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Hromadné označenie zlyhalo.");
      message.success(`Označených ${data.markedCount} zmienok ako prečítané.`);
      await loadMentions();
      emitMentionsUpdated();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Hromadné označenie zlyhalo.");
    }
  };

  const handleAddTerm = async (values: { term: string }) => {
    try {
      const response = await fetch("/api/tracked-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: values.term }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Pridanie zlyhalo.");
      setTerms((prev) => [...prev, data.term]);
      termForm.resetFields();
      message.success(`Kľúčové slovo "${data.term.term}" pridané. Zachytí sa pri ďalšom fetchi.`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Pridanie zlyhalo.");
    }
  };

  const handleToggleTerm = async (term: TrackedTerm, active: boolean) => {
    try {
      const response = await fetch(`/api/tracked-terms/${term.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Zmena zlyhala.");
      setTerms((prev) => prev.map((t) => (t.id === term.id ? { ...t, active } : t)));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Zmena zlyhala.");
    }
  };

  const handleDeleteTerm = async (term: TrackedTerm) => {
    try {
      const response = await fetch(`/api/tracked-terms/${term.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Zmazanie zlyhalo.");
      setTerms((prev) => prev.filter((t) => t.id !== term.id));
      message.success(`Kľúčové slovo "${term.term}" zmazané.`);
      await loadMentions();
      emitMentionsUpdated();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Zmazanie zlyhalo.");
    }
  };

  const activeTermsCount = terms.filter((t) => t.active).length;
  const monthlyCreditEstimate = activeTermsCount * RUNS_PER_DAY * 30;

  const mentionColumns = [
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
          <Button
            size="small"
            type="text"
            icon={<UndoOutlined />}
            onClick={() => handleMarkRead(record, false)}
          >
            Označiť neprečítané
          </Button>
        ) : (
          <Button size="small" icon={<CheckOutlined />} onClick={() => handleMarkRead(record, true)}>
            Označiť prečítané
          </Button>
        ),
    },
  ];

  const termColumns = [
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
        <Switch size="small" checked={active} onChange={(checked) => handleToggleTerm(record, checked)} />
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
          onConfirm={() => handleDeleteTerm(record)}
          okText="Áno, zmazať"
          cancelText="Nie"
        >
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card variant="borderless">
      <Title level={4}>Mention Tracker</Title>
      <Text type="secondary">
        Automatické sledovanie verejných zmienok o IIS na webe (Tavily API). Nové zmienky sa zvýrazňujú ako
        neprečítané; pravidelný fetch beží cez Coolify Scheduled Task.
      </Text>

      {!configured && !loading && (
        <Alert
          style={{ marginTop: 16 }}
          type="warning"
          showIcon
          message="Tavily API nie je nakonfigurované"
          description="V prostredí chýba TAVILY_API_KEY. Fetch zmienok zatiaľ nie je možné spustiť."
        />
      )}

      <Space direction="vertical" style={{ width: "100%", marginTop: 24 }} size="large">
        <Space wrap>
          <Button
            type="primary"
            icon={<SyncOutlined />}
            onClick={handleFetchNow}
            loading={fetching}
            disabled={!configured}
          >
            Fetch now
          </Button>
          <Button icon={<CheckOutlined />} onClick={handleMarkAllRead} disabled={unreadCount === 0}>
            Označiť všetko ako prečítané ({unreadCount})
          </Button>
          {lastRun && (
            <Text type="secondary">
              Posledný beh: {formatDate(lastRun.runAt)} ({lastRun.trigger === "cron" ? "automatický" : "manuálny"}
              {lastRun.status === "error" ? `, chyba: ${lastRun.errorMessage}` : `, ${lastRun.newMentionsCount} nových`}
              )
            </Text>
          )}
        </Space>

        <Tabs
          defaultActiveKey="mentions"
          items={[
            {
              key: "mentions",
              label: (
                <Space size={6}>
                  Zmienky
                  <Badge count={unreadCount} color="red" />
                </Space>
              ),
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Space wrap>
                    <Select
                      allowClear
                      placeholder="Všetky kľúčové slová"
                      style={{ minWidth: 220 }}
                      value={filterTermId ?? undefined}
                      options={terms.map((t) => ({ label: t.term, value: t.id }))}
                      onChange={(value) => {
                        setFilterTermId(value ?? null);
                        setPage(1);
                      }}
                    />
                    <Radio.Group
                      value={filterRead}
                      onChange={(e) => {
                        setFilterRead(e.target.value);
                        setPage(1);
                      }}
                      options={[
                        { label: "Všetky", value: "all" },
                        { label: "Neprečítané", value: "unread" },
                        { label: "Prečítané", value: "read" },
                      ]}
                      optionType="button"
                      buttonStyle="solid"
                    />
                  </Space>
                  <Table
                    dataSource={mentionList}
                    columns={mentionColumns}
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: "max-content" }}
                    pagination={{
                      current: page,
                      pageSize,
                      total,
                      showSizeChanger: true,
                      onChange: (p, ps) => {
                        setPage(p);
                        setPageSize(ps);
                      },
                    }}
                  />
                </Space>
              ),
            },
            {
              key: "terms",
              label: `Kľúčové slová (${activeTermsCount} aktívnych)`,
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  {monthlyCreditEstimate > CREDIT_BUDGET_WARNING && (
                    <Alert
                      type="warning"
                      showIcon
                      message={`Odhad ~${monthlyCreditEstimate} Tavily creditov/mesiac pri ${activeTermsCount} aktívnych slovách a fetchi ${RUNS_PER_DAY}×/deň - free tier má 1000/mesiac.`}
                    />
                  )}
                  <Form form={termForm} layout="inline" onFinish={handleAddTerm}>
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
                    columns={termColumns}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    scroll={{ x: "max-content" }}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Space>
    </Card>
  );
};
