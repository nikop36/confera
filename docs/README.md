# Confera — Dokumentacija

> Sistem za ciljno usmerjeno mreženje udeležencev konference z AI-podprtim ujemanjem, razporejanjem srečanj, upravljanjem raziskovalnega sejma in kariernih razgovorov.

---

## O projektu

**Confera** je spletna platforma, ki povezuje udeležence konference iz akademske sfere, industrije in javne uprave. Sistem avtomatizira razporejanje srečanj na podlagi interesov in razpoložljivosti ter vključuje AI modul za večkriterijsko ujemanje udeležencev (multi-objective matching).

| | |
|---|---|
| **Frontend** | Next.js → Vercel |
| **Backend** | NestJS → Render  |
| **Glavna podatkovna baza** | Firebase (NoSQL) |
| **AI matching** | Supabase (PostgreSQL + pgvector) |
| **Kontainerizacija** | Docker |

---

## Kazalo dokumentacije

### 📋 [01 — Pregled sistema](./01-pregled/)
Vizija projekta, arhitektura sistema in tehnološki stack.

| Datoteka | Vsebina |
|---|---|
| [vizija.md](./01-pregled/vizija.md) | Namen, cilji, ključni uporabniki, konkurenčna prednost |
| [arhitektura.md](./01-pregled/arhitektura.md) | Pregled celotne arhitekture in komponent |
| [tehnologije.md](./01-pregled/tehnologije.md) | Opis vseh tehnologij in razlogi za izbiro |

---

### 📌 [02 — Zahteve](./02-zahteve/)
Funkcionalne in nefunkcionalne zahteve ter meje sistema.

| Datoteka | Vsebina |
|---|---|
| [funkcionalne-zahteve.md](./02-zahteve/funkcionalne-zahteve.md) | Zahteve s prioritetami (Nujno / Zaželeno / Dodatno) |
| [nefunkcionalne-zahteve.md](./02-zahteve/nefunkcionalne-zahteve.md) | Performančne, varnostne in okoljske zahteve |
| [meje-sistema.md](./02-zahteve/meje-sistema.md) | Kar sistem NE vključuje |

---

### 🗂️ [03 — Načrt](./03-nacrt/)
Podatkovni modeli, API specifikacija in UI načrt.

| Datoteka | Vsebina |
|---|---|
| [podatkovni-model.md](./03-nacrt/podatkovni-model.md) | ER diagram, opisi entitet in relacij |
| [api-specifikacija.md](./03-nacrt/api-specifikacija.md) | REST API endpointi, zahteve in odgovori |
| [ui-nacrt.md](./03-nacrt/ui-nacrt.md) | Opis vmesnikov, tokovi in wireframes |
| [/diagrami](./03-nacrt/diagrami/) | Vsebuje nastavitveni diagram, sekvenčni diagrami in diagram akvtivnosti, UML diagram |


---

### 🤖 [04 — AI Matching](./04-ai-matching/)
Opis, algoritem in evalvacija AI modula za ujemanje udeležencev.

| Datoteka | Vsebina |
|---|---|
| [ai-matching.md](./04-ai-matching/pregled.md) | Kaj modul dela in zakaj, opis evalvacije in algoritmov |


---

### ⚙️ [05 — Infrastruktura](./05-infrastruktura/)
Docker, deployment, baze podatkov in okolja.

| Datoteka | Vsebina |
|---|---|
| [deployment.md](./05-infrastruktura/deployment.md) | Render (backend), Vercel (frontend), CI/CD pipeline |
| [baze-podatkov.md](./05-infrastruktura/baze-podatkov.md) | Firebase in Supabase — namena, konfiguracija |
| [okolja.md](./05-infrastruktura/okolja.md) | Development, staging in production okolja, secrets, docker |

---

### 🛠️ [06 — Razvoj](./06-razvoj/)
Navodila za razvijalce: vzpostavitev, konvencije in testiranje.

| Datoteka | Vsebina |
|---|---|
| [zacetek.md](./06-razvoj/zacetek.md) | Kako zagnati projekt lokalno (onboarding) |
| [konvencije.md](./06-razvoj/konvencije.md) | Coding style, git workflow, commit sporočila |
| [testiranje.md](./06-razvoj/testiranje.md) | Unit, integracijski in funkcijski testi |



