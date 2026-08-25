import { env } from "@/env";
import type { AcContact } from "./rules";

const ARCHIVE_TAG = "test_archived";
const PAGE_SIZE = 100;
const MAX_CONTACTS = 20000;

export const isAcConfigured = () => Boolean(env.AC_API_URL && env.AC_API_KEY);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function acFetch(pathname: string, init: RequestInit = {}, retries = 3): Promise<Response> {
  if (!isAcConfigured()) {
    throw new Error("ActiveCampaign API nie je nakonfigurované (chýba AC_API_URL alebo AC_API_KEY).");
  }
  const url = `${env.AC_API_URL!.replace(/\/$/, "")}${pathname}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Api-Token": env.AC_API_KEY!,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1000 * Math.pow(2, attempt);
      console.warn(`AC rate limit, čakám ${delay}ms (pokus ${attempt + 1}/${retries})`);
      await sleep(delay);
      continue;
    }

    return response;
  }

  throw new Error(`ActiveCampaign API: vyčerpané pokusy pre ${pathname} (rate limit)`);
}

interface RawAcContact {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  cdate: string | null;
}

export async function fetchContactsSince(sinceIso: string | null): Promise<AcContact[]> {
  const contacts: AcContact[] = [];
  let offset = 0;

  while (contacts.length < MAX_CONTACTS) {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
      "orders[cdate]": "ASC",
    });
    if (sinceIso) {
      params.set("filters[created_after]", sinceIso);
    }

    const response = await acFetch(`/api/3/contacts?${params.toString()}`);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`ActiveCampaign API vrátilo ${response.status}: ${body.slice(0, 300)}`);
    }

    const data = await response.json();
    const page: RawAcContact[] = data.contacts ?? [];

    for (const raw of page) {
      contacts.push({
        id: String(raw.id),
        email: raw.email ?? "",
        firstName: raw.firstName ?? "",
        lastName: raw.lastName ?? "",
        phone: raw.phone ?? "",
        createdDate: raw.cdate ?? "",
      });
    }

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    await sleep(250);
  }

  return contacts;
}

let cachedArchiveTagId: string | null = null;

async function getArchiveTagId(): Promise<string> {
  if (cachedArchiveTagId) return cachedArchiveTagId;

  const searchResponse = await acFetch(`/api/3/tags?search=${encodeURIComponent(ARCHIVE_TAG)}`);
  if (searchResponse.ok) {
    const data = await searchResponse.json();
    const existing = (data.tags ?? []).find((t: { tag: string }) => t.tag === ARCHIVE_TAG);
    if (existing) {
      cachedArchiveTagId = String(existing.id);
      return cachedArchiveTagId;
    }
  }

  const createResponse = await acFetch(`/api/3/tags`, {
    method: "POST",
    body: JSON.stringify({
      tag: { tag: ARCHIVE_TAG, tagType: "contact", description: "Označené nástrojom AC Cleaner na archiváciu" },
    }),
  });
  if (!createResponse.ok) {
    throw new Error(`Nepodarilo sa vytvoriť tag "${ARCHIVE_TAG}" (${createResponse.status})`);
  }
  const created = await createResponse.json();
  cachedArchiveTagId = String(created.tag.id);
  return cachedArchiveTagId;
}

export async function archiveContact(contactId: string): Promise<void> {
  const tagId = await getArchiveTagId();

  const tagResponse = await acFetch(`/api/3/contactTags`, {
    method: "POST",
    body: JSON.stringify({ contactTag: { contact: contactId, tag: tagId } }),
  });
  if (!tagResponse.ok && tagResponse.status !== 422) {
    throw new Error(`Nepodarilo sa pridať tag kontaktu ${contactId} (${tagResponse.status})`);
  }

  const listsResponse = await acFetch(`/api/3/contacts/${contactId}/contactLists`);
  if (!listsResponse.ok) {
    throw new Error(`Nepodarilo sa načítať zoznamy kontaktu ${contactId} (${listsResponse.status})`);
  }
  const listsData = await listsResponse.json();
  const memberships: { list: string; status: string }[] = listsData.contactLists ?? [];

  for (const membership of memberships) {
    if (String(membership.status) === "2") continue;

    const unsubResponse = await acFetch(`/api/3/contactLists`, {
      method: "POST",
      body: JSON.stringify({
        contactList: { list: membership.list, contact: contactId, status: 2 },
      }),
    });
    if (!unsubResponse.ok) {
      throw new Error(
        `Nepodarilo sa odhlásiť kontakt ${contactId} zo zoznamu ${membership.list} (${unsubResponse.status})`
      );
    }
    await sleep(250);
  }
}
