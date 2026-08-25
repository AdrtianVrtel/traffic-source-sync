import { NextResponse } from "next/server";
import { requireTool } from "@/shared/auth/permissions";
import { env } from "@/shared/env";

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
    // 1. Verify Authentication + prístup k nástroju
    const user = await requireTool("traffic-sync");
    if (user instanceof NextResponse) return user;

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
            // 1. Zoradíme profily podľa dátumu vytvorenia (od najstaršieho po najnovší)
            const sortedPersons = data.results.sort((a: any, b: any) => {
              const dateA = new Date(a.created_at || 0).getTime();
              const dateB = new Date(b.created_at || 0).getTime();
              return dateA - dateB;
            });

            // 2. Nájdeme najstarší profil, ktorý skutočne obsahuje nejaké traffic data
            let selectedPerson = sortedPersons[0]; // Ak nenájdeme nič lepšie, berieme úplne najstarší
            for (const p of sortedPersons) {
              const pr = p.properties || {};
              const hasSourceInfo = 
                pr["Original Traffic Source"] || 
                pr["$initial_utm_source"] || 
                pr["$initial_referring_domain"] || 
                (pr["$initial_current_url"] && pr["$initial_current_url"].includes("fbclid=")) ||
                (pr["$initial_current_url"] && pr["$initial_current_url"].includes("gclid="));
                
              if (hasSourceInfo) {
                selectedPerson = p;
                break; // Našli sme najstarší s dátami, končíme hľadanie
              }
            }

            // 3. Vytiahneme z neho dáta s inteligentným Fallbackom
            const props = selectedPerson.properties || {};
            
            let source = props["Original Traffic Source"] || props["$initial_utm_source"] || "";
            let drillDown1 = props["Original Traffic Source Drill-Down 1"] || props["$initial_utm_medium"] || "";
            let drillDown2 = props["Original Traffic Source Drill-Down 2"] || props["$initial_utm_campaign"] || "";

            // Ak stále nemáme source (chýbajú UTM parametre), skúsime ho odhadnúť z referrera alebo URL (napr. fbclid)
            if (!source) {
              let referringDomain = props["$initial_referring_domain"] || props["$referring_domain"] || "";
              const currentUrl = props["$initial_current_url"] || props["$current_url"] || "";

              // Ošetríme špecifický PostHog prípad, kedy referrer je text "$direct"
              if (referringDomain === "$direct") {
                referringDomain = "";
              }

              if (currentUrl.includes("fbclid=")) {
                source = "facebook";
                if (!drillDown1) drillDown1 = "cpc"; // Ak to má fbclid, zväčša je to platený klik
              } else if (currentUrl.includes("gclid=")) {
                source = "google";
                if (!drillDown1) drillDown1 = "cpc"; // gclid je jednoznačne Google Ads
              } else if (referringDomain) {
                if (referringDomain.includes("facebook.com") || referringDomain.includes("instagram.com")) {
                  source = "facebook";
                  if (!drillDown1) drillDown1 = "referral";
                } else if (referringDomain.includes("google.")) {
                  source = "google";
                  if (!drillDown1) drillDown1 = "organic";
                } else {
                  source = referringDomain;
                  if (!drillDown1) drillDown1 = "referral";
                }
              } else {
                source = "$direct"; // Ak nie je ani UTM, ani referrer, ani gclid/fbclid
              }
            }

            results[email] = { source, drillDown1, drillDown2 };
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
