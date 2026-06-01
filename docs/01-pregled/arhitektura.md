# Arhitektura sistema

## Pregled

**Confera** sledi večplastni (layered) arhitekturi z ločenim frontendom, backendom in podatkovnimi sloji. Vse komponente tečejo v Docker kontejnerjih; frontend je nameščen na Vercel, backend pa na Render.

## Visokonivojski arhitekturni koncepti

- **Frontend (Next.js)** skrbi za uporabniški vmesnik udeležencev in organizatorjev ter komunicira z backendom prek REST API klicev.
- **Backend (NestJS)** izpostavlja REST API, upravlja poslovno logiko in komunicira s Firebase ter Supabase.
- **Firebase (Firestore)** hrani operativne podatke (profili, dogodki, termini, srečanja).
- **Supabase (PostgreSQL + pgvector)** je namenjen AI matchingu in vektorskemu iskanju.
- **Resend** skrbi za pošiljanje e‑mail obvestil.
- **Docker** zagotavlja enotna razvojna in produkcijska okolja.

---

## Diagram komponent

```
┌─────────────────────────────────────────────────────────────┐
│                        ODJEMALEC                            │
│                   Next.js (Vercel)                          │
│         Spletni UI │ Administratorski UI                    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / REST
┌───────────────────────────▼─────────────────────────────────┐
│                  BACKEND — NestJS (Render)                  │
│                                                             │
│  Global Pipes          Global Filters        Guards         │
│  ValidationPipe        HttpExceptionFilter   AuthGuard      │
│  (whitelist, strict)                         RolesGuard     │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Auth modul  │  │ Users modul  │  │ Matching modul     │  │
│  └─────────────┘  └──────────────┘  └────────────────────┘  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Events modul│  │ Scheduling   │  │ Notifications      │  │
│  │             │  │ modul        │  │ modul (Resend)     │  │
│  └─────────────┘  └──────────────┘  └────────────────────┘  │
│                                                             │
│  Swagger UI dostopen na /api                                │
└──────────┬──────────────────────────────┬───────────────────┘
           │                              │
┌──────────▼──────────┐      ┌────────────▼────────────────┐
│      Firebase       │      │          Supabase           │
│  (glavna baza)      │◄─────│      (AI matching)          │
│  NoSQL / Firestore  │      │  PostgreSQL + pgvector      │
│  - uporabniki       │      │  - pobere profile iz        │
│  - dogodki          │      │    Firebasa                 │
│  - termini          │      │  - generira embeddings      │
│  - prostori         │      │  - predlaga udeležence      │
│  - srečanja         │      │  - predlaga dogodke         │
│  - sejem            │      │                             │
└─────────────────────┘      └─────────────────────────────┘
```

---

## Tok podatkov

### Registracija in prijava
1. Uporabnik se prijavi prek spletnega vmesnika (Next.js)
2. Frontend pošlje zahtevo na NestJS REST API
3. Backend validira podatke prek `ValidationPipe` (whitelist, strict mode)
4. `AuthGuard` preveri Firebase ID žeton in vrne JWT za nadaljnje zahteve

### AI matching — predlog udeležencev in dogodkov
1. Supabase matching servis pobere profile udeležencev iz Firebasa
2. Profile pretvori v vektorske reprezentacije (embeddings)
3. Z vektorskim iskanjem (kosinusna podobnost, pgvector) poišče relevantne udeležence in dogodke
4. Backend obogati rezultate z dodatnimi kriteriji (vloga, razpoložljivost, cilji) in jih vrne frontendu

### Razporejanje srečanj
1. Udeleženec sprejme priporočilo za srečanje
2. Backend preveri razpoložljivost obeh udeležencev ter prostih terminov in prostorov
3. Sistem optimizacijsko dodeli termin in prostor ter shrani srečanje v Firebase
4. Oba udeleženca prejmeta e-mail obvestilo prek **Resend**

---

## Ključne arhitekturne odločitve

### Global Pipes in Filters
Backend uporablja `ValidationPipe` z `whitelist: true` in `forbidNonWhitelisted: true` — vsak request ki vsebuje nedovoljene lastnosti je avtomatsko zavrnjen. `HttpExceptionFilter` centralizirano obravnava napake in vrne enotno strukturirane error odgovore.

### Swagger / OpenAPI
API je dokumentiran z Swagger UI, dostopnim na `/api`. Dokumentacija se generira avtomatsko iz dekoratorjev na kontrolerjih in DTO objektih ter vključuje Bearer Auth shemo.

### Ločitev baz podatkov
Firebase pokriva vse operativne podatke. Supabase je namenjen izključno AI matchingu ker podpira pgvector razširitev za učinkovito vektorsko iskanje — funkcionalnost ki je Firebase ne ponuja.

### Docker kontejnerizacija
Celoten sistem teče v Docker kontejnerjih kar zagotavlja enaka okolja v razvoju, stagingu in produkciji ter poenostavi onboarding.


--- 
## Ključne arhitekturne prednosti
- Ločitev operativnih podatkov (Firebase) in AI matchinga (Supabase)
- Modularna backend arhitektura (NestJS)
- Enostavno skaliranje frontenda in backenda
- Hitro vektorsko iskanje prek pgvector
- Enotna kontejnerizacija z Dockerjem

