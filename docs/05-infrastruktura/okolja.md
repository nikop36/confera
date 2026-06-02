# Okolja sistema

## Pregled

Sistem Confera uporablja ločena okolja za razvoj, testiranje in produkcijo. Projekt je organiziran kot monorepo (`frontend/` + `backend/`), konfiguracija pa je razdeljena med več `.env` datotek.

---

## 1. Lokalno okolje (development)

- Frontend in backend tečeta prek Docker Compose ali lokalno (`npm run dev`)
- Supabase Storage in API ključi so nastavljeni v `.env.local`
- Playwright uporablja `PLAYWRIGHT_BASE_URL` v root `.env`

---

## 2. Testno okolje (staging)

- Ločeni Firebase in Supabase ključi
- Backend uporablja `backend/.env.test`
- Playwright E2E testi se izvajajo proti stagingu

---

## 3. Produkcijsko okolje

- Frontend → Vercel  
- Backend → Render (Docker)  
- Firebase → Firestore + Auth  
- Supabase → PostgreSQL + pgvector + Storage  
- Resend → e‑mail obvestila  

---

## 4. Konfiguracija okolij (.env datoteke)

### Root `.env`
- `PLAYWRIGHT_BASE_URL`

### Backend `.env`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `DATABASE_URL`
- `DATABASE_SSL`
- `PORT` (opcijsko)

### Backend `.env.test`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`
- `FIREBASE_API_KEY`

### Frontend `.env.local`
- `NEXT_PUBLIC_API_URL` (opcijsko)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET`

---

## 5. CI/CD pipeline

Projekt uporablja dva ločena GitHub Actions workflowa:

### Frontend pipeline
- Linting  
- Build  
- Deploy na Vercel  

### Backend pipeline
- Linting  
- Unit testi  
- SonarQube analiza  
- Build  
- Deploy na Render (deploy hook)  

### GitHub Secrets
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- `SONAR_TOKEN`, `SONAR_PROJECT_KEY`, `SONAR_ORGANIZATION`
- `RENDER_DEPLOY_HOOK_URL`

---

## 6. Docker

- Lokalno se uporablja Docker Compose za poganjanje frontenda in backenda
- Backend v produkciji teče kot Docker kontejner na Renderju
- Frontend v produkciji ne uporablja Dockerja (Vercel build)

