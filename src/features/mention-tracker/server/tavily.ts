import { env } from "@/shared/env";

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  rawContent: string | null;
  favicon: string | null;
  score: number | null;
  publishedDate: string | null;
}

export const isTavilyConfigured = () => Boolean(env.TAVILY_API_KEY);

interface RawTavilyResult {
  title?: string;
  url?: string;
  content?: string;
  raw_content?: string | null;
  favicon?: string | null;
  score?: number;
  published_date?: string;
}

export async function searchTavily(query: string): Promise<TavilyResult[]> {
  if (!isTavilyConfigured()) {
    throw new Error("Tavily API nie je nakonfigurované (chýba TAVILY_API_KEY).");
  }

  const response = await fetch(`${env.TAVILY_API_URL.replace(/\/$/, "")}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.TAVILY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      exact_match: true,
      max_results: 10,
      topic: "general",
      time_range: "week",
      include_answer: false,
      include_raw_content: "text",
      include_images: false,
      include_favicon: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Tavily API vrátilo ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  const results: RawTavilyResult[] = data.results ?? [];

  return results
    .filter((r) => r.url)
    .map((r) => ({
      title: r.title ?? "",
      url: r.url!,
      content: r.content ?? "",
      rawContent: r.raw_content ?? null,
      favicon: r.favicon ?? null,
      score: typeof r.score === "number" ? r.score : null,
      publishedDate: r.published_date ?? null,
    }));
}
