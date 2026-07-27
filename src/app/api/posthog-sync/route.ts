import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/options";
import { env } from "@/env";

const fetchWithBackoff = async (url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        // Too Many Requests
        const retryAfter = response.headers.get("Retry-After");
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : backoff * Math.pow(2, i);
        console.warn(`Rate limited by PostHog. Retrying after ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, backoff * Math.pow(2, i)));
    }
  }
  throw new Error("Max retries reached");
};

export async function POST(req: Request) {
  try {
    // 1. Verify Authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request body
    const body = await req.json();
    const emails: string[] = body.emails;

    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json({ error: "Invalid emails payload" }, { status: 400 });
    }

    // 3. Load PostHog configuration from environment (Validated by Zod)
    const projectId = env.POSTHOG_PROJECT_ID;
    const personalApiKey = env.POSTHOG_API_KEY;
    const posthogHost = env.POSTHOG_HOST;

    // 4. Fetch person properties for each email from PostHog API
    // Sťahujeme sekvenčne (jeden po druhom) s pauzou, aby sme nevyvolali Rate Limit
    const results: Record<string, any> = {};
    const failedEmails: string[] = [];

    for (const email of emails) {
      try {
        const url = `${posthogHost}/api/projects/${projectId}/persons/?email=${encodeURIComponent(email)}`;
        const response = await fetchWithBackoff(url, {
          headers: {
            "Authorization": `Bearer ${personalApiKey}`,
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) {
          failedEmails.push(email);
        } else {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const person = data.results[0];
            const props = person.properties || {};
            
            results[email] = {
              source: props["Original Traffic Source"] || props["$initial_utm_source"] || "",
              drillDown1: props["Original Traffic Source Drill-Down 1"] || props["$initial_utm_medium"] || "",
              drillDown2: props["Original Traffic Source Drill-Down 2"] || props["$initial_utm_campaign"] || "",
            };
          } else {
            failedEmails.push(email);
          }
        }
      } catch (error) {
        failedEmails.push(email);
      }

      // Striktná pauza 150ms po KAŽDOM maily, aby sme neprekročili limit PostHogu (bezpečný Drip-feeding)
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // 5. Return the mapped results
    return NextResponse.json(results);

  } catch (error) {
    console.error("API Error in posthog-sync:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
