# ActiveCampaign Cleaner – Architektúra a Plán implementácie

Tento dokument slúži ako referencia pre vývojárov a AI agentov pracujúcich na projekte **IIS Tooling**.

---

## 1. Účel nástroja
Nástroj **ActiveCampaign Cleaner** slúži na pravidelnú a bezpečnú údržbu databázy kontaktov v ActiveCampaign (AC). Identifikuje testovacie, spamové, placeholderové a neplatné kontakty a umožňuje ich hromadnú archiváciu cez ActiveCampaign API, čím znižuje náklady na AC predplatné a udržiava dáta čisté.

> [!IMPORTANT]
> **Dôležité objasnenie k CSV matici:**
> Používateľ **nenahráva žiadne CSV súbory** do aplikácie. Vzorové CSV dodané používateľom slúžilo výlučne ako trénovacia vzorka / špecifikácia pravidiel.
> Celý proces beží **100 % automatizovane cez ActiveCampaign API**:
> 1. Používateľ klikne na tlačidlo "Spustiť kontrolu" v UI.
> 2. Aplikácia cez API stiahne kontakty (iba nové od posledného behu).
> 3. Kód aplikácie automaticky aplikuje pravidlá a kontakty roztriedi do skupín ("Na vyradenie" a "Na kontrolu").
> 4. Používateľ v prehľadnej tabuľke skontroluje výsledky (môže vyradiť/ponechať legitímne kontakty).
> 5. Po potvrdení aplikácia zavolá AC API a kontakty archivuje.

---

## 2. Dátová vrstva (SQLite + Drizzle ORM)
Aplikácia využíva lokálnu SQLite databázu riadenú cez **Drizzle ORM** (`better-sqlite3` driver):
- Ukladá históriu behov: dátum a čas poslednej synchronizácie, počet prehľadaných kontaktov, počet identifikovaných podozrivých kontaktov.
- Vďaka Drizzle ORM je možné kedykoľvek bez zmeny aplikačného kódu prepnúť driver na PostgreSQL (napr. na VPS/Coolify).

Tabuľka `sync_history`:
- `id`: primárny kľúč
- `started_at`: čas spustenia behu
- `finished_at`: čas dokončenia behu
- `contacts_scanned`: celkový počet overených kontaktov
- `hard_matches`: počet kontaktov v kategórii "Na zmazanie / vyradenie"
- `soft_matches`: počet kontaktov v kategórii "Na kontrolu"

---

## 3. Pravidlá klasifikácie testovacích kontaktov

### Kategória: "Na vyradenie" (Hard matches / celé zle / zle)
1. **Placeholder a vyhradené domény:**
   - Doména `example.com`, `test.com`, `test.sk`, `localhost` a pod.
2. **Šablónové a automaticky generované mená:**
   - Vzory ako `adminFirst adminLast`, `developer1First developer1Last`, `investor1First investor1Last`.
3. **Interné testovacie aliasy na firemnej doméne:**
   - Doména `@investinslovakia.eu` s `+` aliasom (napr. `+spravca`, `+1`, `+10`, `+test`).
4. **Zjavné testovacie označenia v mene alebo priezvisku:**
   - Meno/priezvisko obsahujúce kľúčové slová: `admin`, `adminko`, `spravca`, `test`, `tester`.
5. **Placeholder kontaktné údaje:**
   - Fiktívne telefónne čísla alebo telefóny masovo zdieľané medzi mnohými testovacími riadkami tej istej osoby.

### Kategória: "Na kontrolu" (Soft matches / Manuálne preverenie)
1. **Podozrivý local-part e-mailu bez aliasu:**
   - E-maily ako `incestinslovakia@...`, `cokolvek@...`, `davidtestuje@...`, `mato@...`.
2. **Kombinácia podozrivého vzoru s finančnou aktivitou:**
   - Ak kontakt vykazuje akúkoľvek finančnú stopu alebo skutočnú aktivitu, **nikdy** sa nezaradí priamo na automatické vyradenie, ale vždy do skupiny "Na kontrolu", aby sa predišlo omylu pri reálnych klientoch.
3. **Netypické názvy účtov na vlastnej doméne** bez `+` aliasu.

---

## 4. Používateľské rozhranie (UI)
- Umiestnené v sidebare pod názvom **ActiveCampaign Cleaner**.
- Obrazovka s dvoma hlavnými záložkami:
  - **Na vyradenie** (vopred zaškrtnuté všetky položky).
  - **Na kontrolu** (vopred nezaškrtnuté, používateľ ich preletí pohľadom).
- Možnosť vymazať riadok z tabuľky (čím je kontakt ušetrený pred archiváciou) alebo ho presunúť medzi skupinami.
- Tlačidlo **Archivovať kontakty** s bezpečnostným potvrdením (Popconfirm), ktoré po odsúhlasení vykoná archiváciu v AC s kontrolovanou rýchlosťou (drip-feed).
