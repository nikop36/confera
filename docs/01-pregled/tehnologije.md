# Tehnološki stack

## Pregled

Sistem Confera uporablja sodoben tehnološki nabor, zasnovan za skalabilnost, modularnost in hitro obdelavo podatkov. Arhitektura temelji na ločenih sklopih za frontend, backend in podatkovni sloj, vse komponente pa tečejo v Docker kontejnerjih.

## Tehnologije po slojih

| Sloj | Tehnologija | Gostovanje |
|---|---|---|
| Frontend | Next.js (React) | Vercel |
| Backend | NestJS (Node.js, TypeScript) | Render |
| Kontejnerizacija | Docker / Docker Compose | Lokalno |
| Glavna baza podatkov | Firebase (Firestore) | Google Cloud |
| AI matching | Supabase (PostgreSQL + pgvector) | Supabase Cloud |
| Avtentikacija | Firebase Auth | Google Cloud |
| Shranjevanje slik | Supabase Storage | Supabase Cloud |
| E‑mail obvestila | Resend | Resend Cloud |
| API dokumentacija | Swagger / OpenAPI | `/api` (backend) |
| CI/CD | GitHub Actions + SonarQube | GitHub |
| Upravljanje nalog | GitHub Projects | GitHub |
| Funkcionalno testiranje | Playwright + Bruno | Lokalno / CI |
| Unit / integracijski testi | Jest + SuperTest | Lokalno / CI |

---

## Frontend — Next.js

**Gostovanje:** Vercel
**Konfiguracija:** `frontend/.env.local`

Next.js je izbran zaradi server-side renderinga (SSR), vgrajenega routinga in brezhibne integracije z Vercelom. Frontend komunicira izključno prek REST API klicev na NestJS backend.

**Ključne odgovornosti:**
- Spletni UI za udeležence (profil, priporočila, sejem, razgovori)
- Administratorski vmesnik za organizatorje
- Nalaganje slik v Supabase Storage 
- Upravljanje avtentikacijskega stanja (Firebase Auth SDK)

---

## Backend — NestJS

**Gostovanje:** Render (Docker kontejner)
**Konfiguracija:** `backend/.env`

NestJS je izbran zaradi strogo tipiziranega TypeScript okolja in modularne arhitekture. Backend izpostavlja REST API in komunicira s Firebase kot primarno podatkovno shrambo ter s Supabase za AI matching.

**Ključne odgovornosti:**
- Poslovna logika  
- AI matching integracija (Supabase)  
- Upravljanje terminov, srečanj, sejma in razgovorov  
- Pošiljanje e‑mail obvestil prek Resend  
- Generiranje Swagger dokumentacije  

---

## Firebase (Firestore + Auth)

Firebase je primarna operativna platforma sistema.

**Firestore (NoSQL):**
- Hrani ključne podatke: uporabniki, dogodki, termini, prostori, srečanja, sejem, razgovori  
- Omogoča hitro branje/pisanje in fleksibilno strukturo dokumentov  
- Primeren za real‑time posodobitve in nizko latenco

**Firebase Auth:**
- Upravljanje identitet (udeleženci, organizatorji, zaposlovalci)  
- Podpora za e‑mail prijavo in integracijo z backendom prek Firebase Admin SDK  
- Varnostno preverjanje JWT žetonov na backendu

---

## Supabase (PostgreSQL + pgvector)

Supabase je ločen podatkovni sloj, namenjen izključno AI matchingu.

**Zakaj Supabase:**
- PostgreSQL omogoča strukturirane podatke in napredne poizvedbe  
- pgvector razširitev omogoča učinkovito vektorsko iskanje  
- Podpora za HNSW/IVFFlat indekse za hitro podobnostno iskanje  
- Ločitev AI obdelave od operativnih podatkov izboljša zmogljivost in skalabilnost

**Shranjeni podatki:**
- embeddings profilov  
- rezultati ujemanj  
- metapodatki o podobnosti

---

## Docker

Docker zagotavlja enotna razvojna in produkcijska okolja.

**Prednosti:**
- isti runtime na lokalnem razvoju, stagingu in produkciji  
- enostavno poganjanje več storitev (backend, frontend, lokalne baze)  
- hitrejši onboarding novih razvijalcev  
- izolacija od sistemskih odvisnosti

**Docker Compose:**
- omogoča lokalno orkestracijo vseh komponent  
- poenostavi razvoj in testiranje

---

## Resend

Resend se uporablja za pošiljanje ključnih e‑mail obvestil.

**Uporaba:**
- potrditev srečanja  
- sprememba ali odpoved termina  
- potrditev kariernega razgovora

**Prednosti:**
- visoka dostavljivost  
- enostavna integracija z NestJS  
- predloge e‑mailov in sledenje dostavi

---

## Swagger / OpenAPI

Backend avtomatsko generira API dokumentacijo na `/api`.

**Prednosti:**
- enotna specifikacija endpointov  
- pregled nad DTO objekti  
- vključena Bearer Auth shema  
- uporabno za testiranje in razvoj frontenda

---

## CI/CD — GitHub Actions + SonarQube

CI/CD pipeline skrbi za kakovost in avtomatiziran deploy.
- Ločena workflowa za frontend in backend  
- Backend vključuje SonarQube analizo  

**Vključuje:**
- linting  
- unit teste  
- statično analizo kode (SonarQube)  
- avtomatski deploy na Render in Vercel

---

## Testiranje

### Playwright + Bruno (funkcionalno testiranje)
- preverjanje celotnih uporabniških tokov  
- API testiranje neodvisno od frontenda  
- simulacija realnih scenarijev

### Jest + SuperTest (unit + integracijski testi)
- testiranje poslovne logike  
- preverjanje integracije med backend moduli  
- hitra povratna informacija pri razvoju

---

## GitHub Projects

Projekt uporablja GitHub Projects za:

- Kanban board  
- Roadmap  
- Issue & task spremljanje  
- Sprint planiranje  