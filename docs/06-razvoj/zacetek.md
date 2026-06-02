# Začetek — Onboarding

Navodila za vzpostavitev lokalnega razvojnega okolja in pregled konvencij projekta.

---

## Predpogoji

- Node.js 20+
- Docker + Docker Compose
- Git

---

## 1. Kloniranje repozitorija

```bash
git clone <repo-url>
cd confera
```

---

## 2. Konfiguracija okoljskih spremenljivk

Ustvari naslednje datoteke po predlogah (vrednosti pridobi od vodje projekta ali iz ustreznih oblačnih konzol):

**`backend/.env`**
```
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_API_KEY=
RESEND_API_KEY=
EMAIL_FROM=
DATABASE_URL=
DATABASE_SSL=
```

**`backend/.env.test`**
```
TEST_USER_EMAIL=
TEST_USER_PASSWORD=
FIREBASE_API_KEY=
```

**`frontend/.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET=pplProfilePics
```

**`.env`** (root, za Playwright)
```
PLAYWRIGHT_BASE_URL=http://localhost:3001
```

---

## 3. Zagon z Docker Compose

```bash
docker compose up --build
```

Storitve po zagonu:
- Frontend: [http://localhost:3001](http://localhost:3001)
- Backend: [http://localhost:3000](http://localhost:3000)
- Swagger: [http://localhost:3000/api](http://localhost:3000/api)
- PostgreSQL (pgvector): port 5432

---

## 4. Uporabni skripti (backend)

Skripti se poganjajo iz mape `backend/`:

```bash
# Ustvari admin uporabnika (če Firestore dokument še ne obstaja)
npx ts-node scripts/ensure-user.ts <email> admin

# Nastavi obstoječemu uporabniku vlogo admin
npx ts-node scripts/set-admin.ts <email>

# Pridobi Bearer token za testiranje API-ja
npx ts-node scripts/get-token.ts

# Posej demo podatke (graf mreženja)
npx ts-node scripts/seed-graph-demo.ts <email>

# Evalvacija kakovosti AI matchinga
npx ts-node scripts/evaluate-event-matching-quality.ts
```

---

## Konvencije

### Struktura projekta

Projekt je monorepo — `frontend/` in `backend/` sta ločeni aplikaciji v skupnem repozitoriju.

### Git workflow

- Glavna veja: `main`
- Funkcionalnosti se razvijajo na feature vejah: `feat/<opis>`
- Popravki: `fix/<opis>`
- Merge v `main` prek pull requesta

### Commit sporočila

Sporočila sledijo formatu:

```
<tip>: <kratek opis>

feat: dodaj AI matching endpoint
fix: popravi validacijo termina
chore: posodobi odvisnosti
docs: dopolni README
```

### Koda

- TypeScript povsod (strict mode)
- NestJS dekoratorji za vse module, kontrolerje in servise
- Swagger anotacije na vseh endpointih (`@ApiTags`, `@ApiOperation`, `@ApiBearerAuth`)
- Validacija vhodnih podatkov prek DTO razredov z `class-validator` dekoratorji
- Testi v `__tests__/` znotraj vsakega modula

### Sledenje napredku

GitHub Projects — Kanban tabla, roadmap in board pogled.