# Návod na nasadenie cez Coolify

Aplikácia je už plne technicky pripravená na Coolify (obsahuje optimalizovaný produkčný `Dockerfile` a nastavenie pre `standalone` Next.js build). 

Pre úspešné nasadenie postupujte podľa týchto krokov v Coolify administrácii:

## 1. Pripojenie repozitára
1. V Coolify kliknite na **Add New Resource** -> **Project** -> Vytvorte si projekt (napr. *Traffic Sync*).
2. Zvoľte **Application**.
3. Vyberte Git poskytovateľa (napr. GitHub, GitLab), zvoľte váš repozitár a branch (väčšinou `main` alebo `master`).
4. Ako Build Pack zvoľte **Docker** (Coolify by ho mal vďaka prítomnému súboru `Dockerfile` detegovať automaticky).

## 2. Nastavenie domény a portu
V nastaveniach aplikácie v Coolify (Configuration):
1. **Ports Exposes:** Skontrolujte, či je nastavený port `3000` (náš Dockerfile beží na porte 3000).
2. **Domain:** Pridajte doménu alebo subdoménu, na ktorej má aplikácia bežať (napr. `https://sync.vasafirma.sk`). Coolify vám k nej automaticky vygeneruje SSL (Let's Encrypt).

## 3. Environment premenné (DÔLEŽITÉ)
Prejdite do záložky **Environment Variables** vo vašej Coolify aplikácii a pridajte nasledujúce premenné. Kód je poistený knižnicou *Zod*, takže ak niektorú zabudnete, aplikácia vôbec nenaštartuje.

Vložte tam tieto kľúče:

```env
# URL vašej aplikácie (Musí sa presne zhodovať s doménou, inak nebude fungovať prihlásenie!)
NEXTAUTH_URL=https://sync.vasafirma.sk

# Tajný kľúč pre NextAuth (môžete si vygenerovať spustením príkazu: openssl rand -base64 32 v termináli)
NEXTAUTH_SECRET=sem_vlozte_vas_tajny_kluc

# PostHog API
POSTHOG_PROJECT_ID=vas_project_id
POSTHOG_PERSONAL_API_KEY=vas_personal_api_key
# Voliteľné: ak používate európsky PostHog, nechajte tak. Ak americký, zmeňte na https://app.posthog.com
POSTHOG_HOST=https://eu.posthog.com

# Prístupy - Admin (pri prvom štarte sa seedne do DB ako admin)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=silne_heslo_123

# Prístupy - Druhý používateľ (seedne sa ako user so všetkými nástrojmi)
# Pozn.: seed prebehne len ak konto v DB ešte neexistuje. Ďalšia správa používateľov
# (roly, prístupy k nástrojom, noví používatelia) sa robí v appke na stránke
# "Správa používateľov" - zmeny v DB sa pri reštarte NEprepisujú hodnotami z env.
USER2_EMAIL=kolega@example.com
USER2_PASSWORD=silne_heslo_456

# ActiveCampaign Cleaner (voliteľné - bez nich je AC Cleaner vypnutý, zvyšok appky funguje)
AC_API_URL=https://vasucet.api-us1.com
AC_API_KEY=vas_ac_api_kluc
# Poistka: "dry-run" nič reálne neodošle do AC, len loguje. Po odsúhlasení zmeňte na "live".
AC_ARCHIVE_MODE=dry-run

# Cesta k SQLite databáze (v Dockeri je default /app/data/app.db, netreba meniť)
# DATABASE_PATH=/app/data/app.db

# Mention Tracker (voliteľné - bez nich je Mention Tracker vypnutý, zvyšok appky funguje)
TAVILY_API_KEY=tvly-vas_api_kluc
# Náhodný string pre cron endpoint (vygenerujte napr.: openssl rand -hex 32)
CRON_SECRET=sem_vlozte_nahodny_string
# Voliteľný webhook pre notifikácie o nových zmienkach (Slack Incoming Webhook / n8n / Zapier).
# Nenastavené = žiadne externé notifikácie, len in-app unread badge.
# NOTIFICATION_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## 3b. Persistent volume pre SQLite (DÔLEŽITÉ pre AC Cleaner)
ActiveCampaign Cleaner si ukladá históriu behov do SQLite databázy v `/app/data`. Bez volume sa databáza zmaže pri každom redeployi.

1. V Coolify otvorte aplikáciu -> **Persistent Storage** -> **Add**.
2. Zvoľte typ **Volume Mount** a ako **Destination Path** zadajte `/app/data`.
   (Mountujte celý adresár, nie single file - SQLite si vedľa databázy vytvára pomocné súbory `-wal` a `-shm`.)
3. Uložte a redeploynite.

## 3c. Scheduled Task pre Mention Tracker
Pravidelný fetch zmienok spúšťa natívna Coolify funkcia **Scheduled Tasks** (appka nemá vlastný cron).

1. V Coolify otvorte aplikáciu -> tab **Scheduled Tasks** -> **Add**.
2. **Cron expression:** `0 */6 * * *` (každých 6 hodín; frekvencia sa dá kedykoľvek zmeniť bez redeployu).
3. **Command** (image je node:20-alpine bez curl, preto node one-liner - Node 18+ má fetch vstavaný):
```
node -e "fetch('http://localhost:3000/api/mention-tracker/cron',{method:'POST',headers:{Authorization:'Bearer '+process.env.CRON_SECRET}}).then(r=>r.text()).then(console.log).catch(e=>{console.error(e);process.exit(1)})"
```
4. Prvý beh overte priamo v logoch scheduled tasku v Coolify - v odpovedi má byť JSON s počtami (`resultsCount`, `newMentionsCount`). Endpoint má guard proti súbežnému behu, takže prekrývajúce sa spustenia sa bezpečne preskočia (`skipped: true`).

## 4. Nasadenie (Deploy)
1. Po uložení všetkých premenných kliknite v Coolify na tlačidlo **Deploy**.
2. Coolify si stiahne kód, zbuilduje Docker image podľa nášho `Dockerfile` (môže to trvať 1-2 minúty) a aplikáciu spustí.
3. Vaša appka beží na vami zvolenej doméne bez obmedzení a time-outov! 🚀
