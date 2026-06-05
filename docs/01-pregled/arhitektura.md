# Arhitektura sistema

**Confera** temelji na ločeni frontend/backend arhitekturi z dvema specializiranima podatkovnima bazama in zunanjim AI modulom. Celoten projekt je organiziran kot **monorepo** — frontend in backend živita skupaj v enem repozitoriju, kar poenostavi deljenje tipov, koordinacijo sprememb in CI/CD konfiguracijo.

---

## Pregled komponent

```
┌─────────────────────────────────────────────────────────────┐
│                      ODJEMALEC                              │
│                  Next.js (Vercel)                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────┐
│                   ZALEDNI SISTEM                            │
│                   NestJS (Render)                           │
│                                                             │
│  Auth · Users · Profile · Matching · Scheduling             │
│  Connections · CareerInterviews · Invites · Events          │
│  Guests · Tags · Notifications · Export · Statistics        │
└─────────────┬─────────────────────────┬─────────────────────┘
              │                         │
┌─────────────▼──────────┐   ┌──────────▼──────────────────────┐
│  Firebase (Firestore)  │   │  Supabase (PostgreSQL+pgvector) │
│                        │   │                                 │
│  Vsi operativni podatki│   │  Profilne slike                 │
│  Auth (FirebaseAuth)   │   │  AI matching (embeddingi)       │
└────────────────────────┘   └─────────────────────────────────┘
                                         │
                              ┌──────────▼───────────┐
                              │   Resend (e-pošta)   │
                              └──────────────────────┘
```

---

## Frontend — Next.js

Spletni vmesnik komunicira z backendom izključno prek REST API-ja. Vsebuje primarni spletni vmesnik za udeležence, organizatorje in industrijo ter administratorski vmesnik. Gostovan na **Vercel**.

## Backend — NestJS

Zaledni sistem je razdeljen na funkcionalne module, vsak z lastnim kontrolerjem, servisom in repozitorijem. Vhodni točki sistema sta globalni `ValidationPipe` (whitelist, forbidNonWhitelisted) in `HttpExceptionFilter`. CORS je omogočen za vse izvore. Swagger dokumentacija je dostopna na `/api`.

Komunikacija z zunanjimi sistemi:
- **Firebase** — branje in pisanje vseh operativnih podatkov prek `FirebaseModule` in `FirebaseService`
- **Supabase** — AI matching in shranjevanje profilnih slik prek `DatabaseModule`
- **Resend** — pošiljanje e-poštnih obvestil prek `EmailModule`

Gostovan na **Render**.

### Moduli

| Modul | Ključne odvisnosti |
|---|---|
| Auth | Firebase, Users |
| Users | Firebase |
| Profile | Firebase, Users, Matching |
| Matching | Database (Supabase), Firebase, Users |
| Scheduling | Firebase, Users |
| Connections | Firebase, Users, Notifications, Matching, Scheduling |
| CareerInterviews | Firebase, Users, Scheduling, Notifications, Connections |
| Invites | Firebase, CareerInterviews, Users, Scheduling, Notifications |
| Events | Firebase, Database, Users, Sessions, Connections, CareerSlots, Notifications |
| Guests | Firebase, Users, Events, Notifications |
| Tags | Firebase, Users |
| Notifications | Firebase, Email |
| Export | Firebase, Users, Events, Connections, Notifications |
| Statistics | Firebase, Users, Scheduling, CareerInterviews |
| Analytics | — |

## Podatkovni sloj

Sistem uporablja dve bazi s ločenima namenoma:

**Firebase (Firestore + Auth)** pokriva vse operativne podatke: uporabniške profile, srečanja, termine, prostore, obvestila, prijave na karierne razgovore, povezovalne zahteve, povabila gostov in podatke sejma. Avtentikacija poteka prek Firebase Auth.

**Supabase (PostgreSQL + pgvector)** je namenjen izključno AI matchingu in shranjevanju profilnih slik. Vsebuje vektorske reprezentacije profilov (embeddingi), nad katerimi se izvaja iskanje podobnosti.

## Obvestilni sistem

Obvestila so razdeljena na dve vrsti:
- **E-poštna** (prek Resend): vloge, srečanja, karierni razgovori, dogodki, povabila gostov
- **Sistemska** (samo v aplikaciji): zahteve za povezavo, spremembe stanja dogodkov, udeležba

## Vloge

Sistem pozna pet vlog: `participant`, `organizer`, `industry`, `admin`, `guest`. Vloga `guest` je posebna — gost prejme povabilo organizatorja in potrdi udeležbo prek žetona.

---

## Podatkovni tok — AI matching

1. Backend pridobi profile udeležencev iz Firebase
2. Izbrane profilne oznake (`tags`) se pretvorijo v vektorske reprezentacije (embeddingi) in shranijo v Supabase
3. Ob zahtevi za matching Supabase izračuna kosinusno podobnost med vektorji
4. Rezultati se razvrstijo po hibridnem iskanju nad oznakami in vrnejo backendu
5. Backend vrne razvrščene predloge z razlago ujemanja odjemalcu
