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

# Prístupy - Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=silne_heslo_123

# Prístupy - Druhý používateľ
USER2_EMAIL=kolega@example.com
USER2_PASSWORD=silne_heslo_456
```

## 4. Nasadenie (Deploy)
1. Po uložení všetkých premenných kliknite v Coolify na tlačidlo **Deploy**.
2. Coolify si stiahne kód, zbuilduje Docker image podľa nášho `Dockerfile` (môže to trvať 1-2 minúty) a aplikáciu spustí.
3. Vaša appka beží na vami zvolenej doméne bez obmedzení a time-outov! 🚀
