export interface AcContact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  createdDate: string;
}

export interface ContactSignals {
  suspiciousName: boolean;
  sharedPhoneCount: number;
}

export interface ClassifiedContact extends AcContact {
  category: "hard" | "soft";
  reasons: string[];
  signals: ContactSignals;
}

export interface ClassificationResult {
  hard: ClassifiedContact[];
  soft: ClassifiedContact[];
  cleanCount: number;
}

const HARD_DOMAINS = ["example.com", "example.org", "example.net"];

const OWN_DOMAIN = "investinslovakia.eu";

const SUSPICIOUS_LOCAL_WORDS = ["test", "testuje", "cokolvek", "incest", "asdf", "qwert"];

const SUSPICIOUS_NAME_WORDS = ["spravca", "správca", "admin", "adminko", "test"];

const splitEmail = (email: string) => {
  const [localPart = "", domain = ""] = email.toLowerCase().trim().split("@");
  return { localPart, domain };
};

const isTemplateName = (firstName: string, lastName: string) =>
  /first$/i.test(firstName.trim()) && /last$/i.test(lastName.trim());

const hasSuspiciousName = (firstName: string, lastName: string) => {
  const full = `${firstName} ${lastName}`.toLowerCase();
  return SUSPICIOUS_NAME_WORDS.some((w) => full.includes(w));
};

const normalizePhone = (phone: string) => phone.replace(/[\s\-()]/g, "");

export function classifyContacts(contacts: AcContact[]): ClassificationResult {
  const phoneCounts = new Map<string, number>();
  for (const c of contacts) {
    const phone = normalizePhone(c.phone || "");
    if (phone.length >= 6) {
      phoneCounts.set(phone, (phoneCounts.get(phone) ?? 0) + 1);
    }
  }

  const hard: ClassifiedContact[] = [];
  const soft: ClassifiedContact[] = [];
  let cleanCount = 0;

  for (const contact of contacts) {
    const email = (contact.email || "").toLowerCase().trim();
    if (!email) {
      cleanCount++;
      continue;
    }

    const { localPart, domain } = splitEmail(email);
    const hardReasons: string[] = [];
    const softReasons: string[] = [];

    if (HARD_DOMAINS.includes(domain)) {
      hardReasons.push(`rezervovaná/placeholder doména (${domain})`);
    }

    if (isTemplateName(contact.firstName || "", contact.lastName || "")) {
      hardReasons.push(`meno-šablóna (${contact.firstName} ${contact.lastName})`);
    }

    if (domain === OWN_DOMAIN && localPart.includes("+")) {
      hardReasons.push(`vlastná doména, alias s "+"`);
    }

    if (domain === OWN_DOMAIN && !localPart.includes("+")) {
      const domainStem = OWN_DOMAIN.split(".")[0];
      if (localPart === domainStem) {
        softReasons.push("vlastná doména, local-part zhodný s doménou — netypický vzor");
      }
      const matchedWord = SUSPICIOUS_LOCAL_WORDS.find((w) => localPart.includes(w));
      if (matchedWord) {
        softReasons.push(`podozrivý pattern v local-parte ("${matchedWord}")`);
      }
    }

    if (hardReasons.length === 0 && softReasons.length === 0) {
      cleanCount++;
      continue;
    }

    const phone = normalizePhone(contact.phone || "");
    const sharedPhoneCount = phone.length >= 6 ? (phoneCounts.get(phone) ?? 1) : 1;
    const signals: ContactSignals = {
      suspiciousName: hasSuspiciousName(contact.firstName || "", contact.lastName || ""),
      sharedPhoneCount,
    };

    if (signals.suspiciousName) {
      (hardReasons.length > 0 ? hardReasons : softReasons).push(
        "meno potvrdzuje interný test (admin/spravca/...)"
      );
    }
    if (sharedPhoneCount > 1) {
      (hardReasons.length > 0 ? hardReasons : softReasons).push(
        `telefón zdieľaný s ${sharedPhoneCount - 1} inými kontaktmi`
      );
    }

    const classified: ClassifiedContact = {
      ...contact,
      category: hardReasons.length > 0 ? "hard" : "soft",
      reasons: hardReasons.length > 0 ? hardReasons : softReasons,
      signals,
    };

    (classified.category === "hard" ? hard : soft).push(classified);
  }

  return { hard, soft, cleanCount };
}
