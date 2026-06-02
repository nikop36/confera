# Testiranje

Confera pokriva tri ravni testiranja: unit/integracijski testi z Jest, API testi z Bruno in end-to-end testi z Playwright.

---

## Unit in integracijski testi — Jest + Supertest

Testi živijo v vsakem backend modulu pod `__tests__/`. Supertest se uporablja za integracijske teste HTTP endpointov.

```bash
cd backend
npm run test
```

---

## API testi — Bruno

Bruno pokriva sloj API → baza (backend + Firebase/Supabase). Testi živijo v `tests/bruno/`.

### Vzpostavitev

1. Namesti [Bruno GUI](https://www.usebruno.com/)
2. Ustvari `tests/bruno/environments/local.bru` po predlogi `local.bru.example`:

```
vars {
  baseUrl: http://localhost:3000
  # Admin token — pridobi z: npm run get-token (admin credentials)
  adminToken: PASTE_ADMIN_TOKEN_HERE
  # Organizer token
  organizerToken: PASTE_ORGANIZER_TOKEN_HERE
  # Participant token
  participantToken: PASTE_PARTICIPANT_TOKEN_HERE
  # Firebase Console → Authentication → Users
  organizerUid: PASTE_ORGANIZER_UID_HERE
  participantUid: PASTE_PARTICIPANT_UID_HERE
  # Nastavi samodejno prek script:post-response — pusti prazno
  connectionRequestId:
  roomId:
  slotId:
  interviewId:
}
```

Tokene pridobi s skriptom:
```bash
cd backend
npx ts-node scripts/get-token.ts
```

UID-je najdeš v Firebase Console → Authentication → Users.

### Zagon

```bash
# Vsi testi
npm run test:api

# Samo auth testi
npm run test:api:auth

# Tok kariernih razgovorov
npm run test:api:flow
```

---

## End-to-end testi — Playwright

Playwright pokriva celoten tok (frontend → backend → API → baza) z uporabniškimi scenariji. Testi živijo v `tests/playwright/`.

### Vzpostavitev

Zagotovi, da je v root `.env` nastavljena spremenljivka:

```
PLAYWRIGHT_BASE_URL=http://localhost:3001
```

### Zagon

```bash
# Vsi e2e testi
npm run test:e2e

# Interaktivni UI način
npm run test:e2e:ui

# Prikaz poročila zadnjega zagona
npm run test:e2e:report
```

---

## Lokacije testov

| Datoteka | Kaj testira |
|---|---|
| `src/auth/__tests__/auth.service.spec.ts` | Logika registracije v AuthService |
| `src/profile/__tests__/profile.service.spec.ts` | Profilna logika |
| `src/matching/__tests__/embedding.service.spec.ts` | Lokalni embedding za indeksiranje profilov |
| `src/matching/__tests__/event-matching-evaluator.spec.ts` | Evalvacijske metrike in primerjava AI modela proti baseline |
| `src/matching/__tests__/profile-search-document.spec.ts` | Gradnja tekstovnega profila in hash |
| `src/matching/__tests__/matching.service.spec.ts` | Orkestracija endpointa za priporočila |
| `src/matching/__tests__/matching-index.service.spec.ts` | Sinhronizacija SQL indeksa in razlage priporočil |
| `src/role-requests/__tests__/role-requests.service.spec.ts` | Logika zahtev za vloge |
| `src/app.controller.spec.ts` | Endpoint za zdravje sistema |

---

## Matrika testov

### AuthService — register()

| Primer | Pričakovan rezultat |
|---|---|
| Veljavni podatki | Vrne `{ uid, email, role: 'participant' }` |
| Firebase klic | `createUser` poklican s pravilnimi podatki |
| Shranjevanje v Firestore | `UsersService.createUser` poklican z `role: 'participant'` in `profileStatus: 'incomplete'` |
| Podvojen e-poštni naslov | Vrže `ConflictException` |
| Neznana napaka Firebase | Vrže `InternalServerErrorException` |
| Napaka Firebase Auth | `UsersService` ni poklican |

---

### ProfileService — findProfile() in updateProfile()

| Primer | Pričakovan rezultat |
|---|---|
| Pridobitev obstoječega profila | Vrne profil uporabnika iz Firestore |
| Pridobitev neobstoječega profila | Vrne `null` |
| Delna posodobitev enega polja | `updateProfile` poklican z zgolj poslanim poljem |
| Posodobitev več polj hkrati | `updateProfile` poklican z vsemi poslanimi polji |
| Posodobitev profila | Po shranjevanju sproži sinhronizacijo v matching indeks |

---

### AI matching v1

| Primer | Pričakovan rezultat |
|---|---|
| Enak vhod v prototipni embedding model | Vrne enak 384-dimenzionalni vektor |
| Neprazen vhod v prototipni embedding model | Vrne normaliziran vektor |
| Pretvorba v SQL vektor | Vrne format, združljiv s `pgvector` |
| Gradnja tekstovnega profila | Združi ime, organizacijo, opis, interese, cilje, kompetence in ključne besede |
| Manjkajoča profilna polja | Uporabi nadomestno vrednost `Ni navedeno` |
| Matching baza ni nastavljena | `MatchingService` vrže `ServiceUnavailableException` |
| Profil ne obstaja | `MatchingService` vrže `NotFoundException` |
| Obstoječ profil | `MatchingService` pokliče `MatchingIndexService.findMatches` |
| SQL indeksiranje profila | `MatchingIndexService` pripravi `insert into participant_profile_index` z embeddingom in hashom |
| Iskanje priporočil | Pokliče `hybrid_profile_search` in vrne rangirane zadetke |
| Razlage priporočil | Vrne razloge na osnovi skupnih interesov, ciljev, ključnih besed in načina srečanja |
| Napaka pri sinhronizaciji indeksa | `safeUpsertProfile` ne prekine shranjevanja profila |
| Kakovost priporočil dogodkov | Izračuna Precision/Recall/MRR/NDCG in primerjavo proti baseline modelu |

---

### RoleRequestsService — createRoleRequest(), getPendingRequests(), approveRequest() in rejectRequest()

| Primer | Pričakovan rezultat |
|---|---|
| Udeleženec odda veljaven zahtevek | Zahtevek shranjen s statusom `pending`, vrne zahtevek |
| Uporabnik ne obstaja | Vrže `NotFoundException` |
| Uporabnik ni udeleženec | Vrže `ForbiddenException` |
| Uporabnik že ima pending zahtevek | Vrže `BadRequestException` |
| Pridobitev vseh pending zahtevkov | Vrne seznam zahtevkov |
| Ni pending zahtevkov | Vrne prazno polje |
| Admin odobri zahtevek | Status posodobljen na `approved`, vloga uporabnika posodobljena |
| Admin zavrne zahtevek | Status posodobljen na `rejected`, vloga uporabnika ni spremenjena |
| Zahtevek ne obstaja pri odobritvi | Vrže `NotFoundException` |
| Zahtevek ne obstaja pri zavrnitvi | Vrže `NotFoundException` |
| Zahtevek že odobren | Vrže `BadRequestException` |
| Zahtevek že zavrnjen | Vrže `BadRequestException` |

---

### NotificationsService — createNotification(), getMyNotifications(), markAsRead(), markAllAsRead(), deleteNotification()

| Primer | Pričakovan rezultat |
|---|---|
| Ustvarjanje obvestila | Obvestilo shranjeno z `read: false` in `archived: false` |
| Pridobitev obvestil | Vrne seznam obvestil za uporabnika |
| Ni obvestil | Vrne prazno polje |
| Označi kot prebrano — lastno obvestilo | Obvestilo označeno kot prebrano |
| Označi kot prebrano — obvestilo ne obstaja | Vrže `NotFoundException` |
| Označi kot prebrano — tuje obvestilo | Vrže `ForbiddenException` |
| Označi vsa kot prebrana | `markAllAsRead` poklican z uid uporabnika |
| Izbriši — lastno obvestilo | Obvestilo arhivirano, ni fizično izbrisano |
| Izbriši — obvestilo ne obstaja | Vrže `NotFoundException` |
| Izbriši — tuje obvestilo | Vrže `ForbiddenException` |

---

## Cilji pokritosti

| Datoteka | Cilj |
|---|---|
| `auth.service.ts` | 100% |
| `notifications.service.ts` | 100% |
| `role-requests.service.ts` | > 80% |
| `profile.service.ts` | > 80% |
| `users.service.ts` | > 80% |
| `matching.service.ts` | > 80% |
| `matching-index.service.ts` | > 80% |
| `embedding.service.ts` | > 80% |

---
