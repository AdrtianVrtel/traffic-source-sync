"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Button, Card, message, Space, Tabs, Typography } from "antd";
import { CheckOutlined, SyncOutlined } from "@ant-design/icons";
import { formatDate } from "@/shared/utils/format-date";
import { MentionsTable } from "./MentionsTable";
import { TermsTable } from "./TermsTable";
import type { LastRun, Mention, MentionsPage, ReadFilter, TrackedTerm } from "../types";

const { Title, Text } = Typography;

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
  const [filterRead, setFilterRead] = useState<ReadFilter>("all");

  const fetchMentionsData = useCallback(async (): Promise<MentionsPage> => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filterTermId) params.set("termId", String(filterTermId));
    if (filterRead === "unread") params.set("read", "false");
    if (filterRead === "read") params.set("read", "true");

    const response = await fetch(`/api/mentions?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Nepodarilo sa načítať zmienky.");
    return data;
  }, [page, pageSize, filterTermId, filterRead]);

  const fetchTermsData = useCallback(async (): Promise<{ terms: TrackedTerm[] }> => {
    const response = await fetch("/api/tracked-terms");
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Nepodarilo sa načítať kľúčové slová.");
    return data;
  }, []);

  const applyMentionsData = (data: MentionsPage) => {
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

  const handleAddTerm = async (term: string) => {
    try {
      const response = await fetch("/api/tracked-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Pridanie zlyhalo.");
      setTerms((prev) => [...prev, data.term]);
      message.success(`Kľúčové slovo "${data.term.term}" pridané. Zachytí sa pri ďalšom fetchi.`);
      return true;
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Pridanie zlyhalo.");
      return false;
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
                <MentionsTable
                  mentions={mentionList}
                  terms={terms}
                  loading={loading}
                  total={total}
                  page={page}
                  pageSize={pageSize}
                  filterTermId={filterTermId}
                  filterRead={filterRead}
                  onFilterTermChange={(termId) => {
                    setFilterTermId(termId);
                    setPage(1);
                  }}
                  onFilterReadChange={(filter) => {
                    setFilterRead(filter);
                    setPage(1);
                  }}
                  onPageChange={(nextPage, nextPageSize) => {
                    setPage(nextPage);
                    setPageSize(nextPageSize);
                  }}
                  onMarkRead={handleMarkRead}
                />
              ),
            },
            {
              key: "terms",
              label: `Kľúčové slová (${activeTermsCount} aktívnych)`,
              children: (
                <TermsTable
                  terms={terms}
                  loading={loading}
                  onAdd={handleAddTerm}
                  onToggle={handleToggleTerm}
                  onDelete={handleDeleteTerm}
                />
              ),
            },
          ]}
        />
      </Space>
    </Card>
  );
};
