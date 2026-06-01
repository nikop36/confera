# Deployment in CI/CD

## Pregled

Sistem Confera uporablja avtomatiziran CI/CD proces, ki zagotavlja stabilne deploye, preverjanje kakovosti kode in varno uvajanje sprememb.

---

## 1. CI/CD pipeline (GitHub Actions)

Pipeline se sproži ob vsakem push na `main`.

### Koraki:
1. **Linting** (ESLint, Prettier)
2. **Unit testi** (Jest)
3. **Integracijski testi** (SuperTest)
4. **Statična analiza kode** (SonarQube cloud)
5. **Build** frontenda in backenda
6. **Deploy**:
   - Backend → Render
   - Frontend → Vercel

---

## 2. Deployment backenda (Render)

- Render poganja NestJS kot Docker kontejner.
- Render samodejno ponovno zažene storitev ob novem deployu.
- Okoljske spremenljivke se upravljajo prek Render nadzorne plošče.

---

## 3. Deployment frontenda (Vercel)

- Vercel samodejno gradi Next.js projekt.
- Uporablja `NEXT_PUBLIC_*` spremenljivke.
- Podpira predogledne deploye (preview deployments).

---

## 4. Monitoring

- Render dashboard za spremljanje API odzivnosti.
- Firebase dashboard za spremljanje obremenitev.
- Supabase dashboard za spremljanje vektorskih poizvedb.
- KPI metrike v administratorskem panelu.

---

## 5. Priporočila

- Uporabljaj ločene API ključe za staging in produkcijo.
- Uporabljaj health‑check endpoint za Render.
- Pred vsakim deployem zaženi Playwright E2E teste.
