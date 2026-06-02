# Deployment

Confera uporablja ločena pipeline za frontend in backend. Vsak push na `main` sproži samodejni deploy prek GitHub Actions.

---

## Frontend — Vercel

Next.js aplikacija se namesti neposredno na Vercel. GitHub Actions izvede lint, teste in build pred deployem.

**Pipeline koraki:**
1. Lint
2. Test
3. Build
4. Deploy na Vercel

Okoljske spremenljivke se konfigurirajo v Vercel nadzorni plošči (Settings → Environment Variables). Vrednosti ustrezajo spremenljivkam iz `frontend/.env.local`.

---

## Backend — Render

NestJS aplikacija se namesti na Render prek Docker kontejnerja. Pipeline pred deployem vključuje tudi SonarQube Cloud analizo kode.

**Pipeline koraki:**
1. Lint
2. Test
3. Build
4. SonarQube Cloud scan
5. Deploy na Render

Okoljske spremenljivke se konfigurirajo v Render nadzorni plošči (Environment). Vrednosti ustrezajo spremenljivkam iz `backend/.env`.

---

## CI/CD — GitHub Actions

Datoteke workflow živijo v `.github/workflows/`. Oba pipeline sta neodvisna — napaka na enem ne blokira drugega.

Render deploy se sproži z Render deploy hook URL-jem, ki se shrani kot GitHub Actions secret.

---

## Zunanje storitve

Naslednje storitve nimajo lastnega deployment procesa — upravljajo se prek njihovih oblačnih konzol:

| Storitev | Konzola |
|---|---|
| Firebase (Firestore + Auth) | [console.firebase.google.com](https://console.firebase.google.com) |
| Supabase (PostgreSQL + pgvector) | [supabase.com/dashboard](https://supabase.com/dashboard) |
| Resend | [resend.com](https://resend.com) |