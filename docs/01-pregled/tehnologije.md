# Tehnologije

Pregled vseh tehnologij v sistemu Confera in razlogi za njihovo izbiro.

---

## Frontend

### Next.js → Vercel

Next.js je izbran kot React framework z vgrajenim usmerjanjem, podporo za server-side rendering in statično generacijo strani. Vercel je naravno okolje za Next.js — zagotavlja avtomatsko skaliranje, globalni CDN in enostavno integracijo z GitHub za CI/CD brez dodatne konfiguracije.

---

## Backend

### NestJS → Render

NestJS prinaša modularna, opinionated strukturo nad Node.js, ki sili k urejenemu razredu kode (kontroler–servis–repozitorij na modul). TypeScript je prvovrstno podprt, kar skupaj z dekoratorji omogoča berljivo in vzdržljivo kodo. Render ponuja enostavno namestitev Docker kontejnerjev brez upravljanja infrastrukture.

### Swagger

API dokumentacija je samodejno generirana iz NestJS dekoratorjev in dostopna na `/api`. Razvijalci in testeri imajo vedno aktualen pregled nad vsemi endpointi brez ročnega vzdrževanja dokumentacije.

---

## Podatkovne baze

### Firebase (Firestore + Auth)

Firebase pokriva vse operativne podatke sistema (profile, srečanja, termine, obvestila itd.) ter avtentikacijo. Firestore je oblačna NoSQL baza z realtime zmogljivostmi in SDK-ji za vse platforme. Firebase Auth eliminira potrebo po lastni implementaciji avtentikacije — podpira e-pošto, OAuth in žetonsko avtentikacijo brez dodatne infrastrukture.

Aktivni Firestore indeksi: `notifications` (archived, uid, createdAt), `roleRequests` (status, createdAt).

### Supabase (PostgreSQL + pgvector)

Supabase je izbran izključno za AI matching in profilne slike. Razlog je pgvector — PostgreSQL razširitev za vektorsko iskanje, ki omogoča učinkovito iskanje najbližjih sosedov (kosinusna podobnost) neposredno v bazi brez ločenega vektorskega servisa. PostgreSQL je preizkušena relacijska baza z vsemi potrebnimi garancijami za konsistentnost embeddingov.

---

## AI matching

### Embeddingi + kosinusna podobnost (pgvector)

Profili udeležencev se pretvorijo v vektorske reprezentacije z jezikovnim modelom. Podobnost med profili se izračuna s kosinusno metriko neposredno v Supabase (pgvector). Rezultat se kombinira z dodatnimi kriteriji (vloga, razpoložljivost, cilji) in prikaže z razlago ujemanja — kar povečuje transparentnost in zaupanje uporabnikov v priporočila.

---

## Obvestila

### Resend (free tier)

Resend je transakcijska e-poštna storitev z enostavnim API-jem. Uporablja se za vse e-poštne notifikacije (vloge, srečanja, karierni razgovori, dogodki, povabila). Sistemska obvestila znotraj aplikacije se shranjujejo neposredno v Firebase.

---

## Kontejnerizacija

### Docker + Docker Compose

Docker zagotavlja konsistentno razvojno okolje ne glede na platformo razvijalca. Docker Compose orkestrira lokalno poganjanje vseh storitev skupaj: `pgvector/pgvector:pg16` (lokalni Supabase nadomestek), backend (NestJS na portu 3000) in frontend (Next.js na portu 3001). Volumni zagotavljajo persistenco podatkov in hot-reload med razvojem.

---

## CI/CD in razvojna orodja

### GitHub Actions

Ločena pipeline za frontend in backend:
- **Backend**: lint → test → build → SonarQube Cloud scan → deploy na Render
- **Frontend**: lint → test → build → deploy na Vercel

### SonarQube Cloud

Statična analiza kode je vključena v backend pipeline in zagotavlja pregled kakovosti kode pri vsakem pushu.

### Bruno

Funkcionalno testiranje REST API-ja (API–DB sloj). Bruno zahteva lokalno nameščen GUI in datoteko `local.bru` (po predlogi `local.bru.example`).

### Playwright

End-to-end testiranje celotnega toka (frontend → backend → API → DB) s scenariji. Zahteva `.env` z `PLAYWRIGHT_BASE_URL`.

### Jest + Supertest

Unit in integracijski testi živijo v vsakem modulu pod `__tests__`. Zagon: `npm run test`.

### GitHub Projects

Sledenje napredku prek Kanban table, roadmapa in board pogleda.