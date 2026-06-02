# Okolja

Sistem Confera pozna tri okolja: **development** (lokalno), **staging** (neobvezno, pred produkcijo) in **production** (Vercel + Render). Vsa okolja delijo enako arhitekturo, razlikujejo se v konfiguraciji storitev in načinu poganjanja.

---

## Development (lokalno)

Lokalno okolje temelji na Docker Compose, ki zažene vse potrebne storitve z enim ukazom.

### Storitve (docker-compose.yml)

| Storitev | Slika / Build | Port |
|---|---|---|
| postgres | `pgvector/pgvector:pg16` | 5432 |
| backend | `./backend` (Dockerfile) | 3000 |
| frontend | `./frontend` (Dockerfile) | 3001 |

Postgres služi kot lokalni nadomestek za Supabase (pgvector je vgrajen v sliko). Backend in frontend se poganjata z `start:dev` oz. `dev` ukazom z volumni za hot-reload. Storitev `backend` čaka na `postgres`, `frontend` čaka na `backend` (`depends_on`).

### Dockerfile — Backend

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "start:dev"]
```

### Dockerfile — Frontend

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]
```

---

## Konfiguracija okolij (.env datoteke)

Skrivnosti se nikoli ne commitajo v repozitorij. Vsak razvijalec ustvari datoteke lokalno po predlogah.

### Root `.env`

| Spremenljivka | Namen |
|---|---|
| `PLAYWRIGHT_BASE_URL` | URL frontenda za Playwright e2e teste |

### Backend `.env`

| Spremenljivka | Namen |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase projekt |
| `FIREBASE_CLIENT_EMAIL` | Service account e-pošta |
| `FIREBASE_PRIVATE_KEY` | Service account zasebni ključ |
| `FIREBASE_API_KEY` | Firebase Web API ključ |
| `RESEND_API_KEY` | Resend API ključ za e-pošto |
| `EMAIL_FROM` | Pošiljatelj e-pošte |
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `DATABASE_SSL` | SSL za Supabase povezavo |
| `PORT` | (opcijsko) Vrata backenda, privzeto 3000 |

### Backend `.env.test`

| Spremenljivka | Namen |
|---|---|
| `TEST_USER_EMAIL` | Testni uporabnik za integracijske teste |
| `TEST_USER_PASSWORD` | Geslo testnega uporabnika |
| `FIREBASE_API_KEY` | Firebase Web API ključ za testno okolje |

### Frontend `.env.local`

| Spremenljivka | Namen |
|---|---|
| `NEXT_PUBLIC_API_URL` | (opcijsko) URL backenda, privzeto `http://localhost:3000` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API ključ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase projekt URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon ključ |
| `NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET` | Ime Supabase bucketa za profilne slike (privzeto: `pplProfilePics`) |

> **Opomba:** Spremenljivke z `NEXT_PUBLIC_` predpono so izpostavljene odjemalcu (browser) — ne smejo vsebovati skrivnosti z administrativnimi pravicami.

---

## Production

| Komponenta | Platforma | Opomba |
|---|---|---|
| Frontend | Vercel | Samodejni deploy ob pushu na `main` |
| Backend | Render | Samodejni deploy prek GitHub Actions |
| Baza (operativna) | Firebase (Firestore) | Oblačna storitev, ni lokalne instance |
| Baza (AI / slike) | Supabase | Oblačna storitev, ni lokalne instance |
| E-pošta | Resend | Oblačna storitev |

V produkciji se Docker ne uporablja za poganjanje storitev — Vercel in Render imata lastno infrastrukturo. Docker ostaja orodje za lokalni razvoj in morebitni staging.

---

## Staging

Staging okolje ni obvezno definirano. Ob potrebi se vzpostavi z enako Docker Compose konfiguracijo, usmerje na testne instance Firebase in Supabase ter konfigurira prek ločenih `.env` datotek.