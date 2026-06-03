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
| `src/auth/__tests__/auth.service.spec.ts` | Logika registracije in prijave |
| `src/notifications/__tests__/notifications.service.spec.ts` | Ustvarjanje, branje, označevanje in arhiviranje obvestil |
| `src/guest/__tests__/guests.service.spec.ts` | Povabila gostov, potrditve, validacije tokenov |
| `src/export/__tests__/export.service.spec.ts` | CSV import profilnih podatkov |
| `src/scheduling/__tests__/scheduling-analytics.service.spec.ts` | Zasedenost sob, potrjeni sestanki, heatmap, funnel |
| `src/scheduling/__tests__/scheduling.service.spec.ts` | Time sloti, dodeljevanje sestankov, konflikti, brisanje |
| `src/events/__tests__/events.service.spec.ts` | Ustvarjanje dogodkov, registracije, priporočila dogodkov |
| `src/connections/__tests__/connections.service.spec.ts` | Zahteve za povezave, brisanje, zavrnitve |
| `src/connections/__tests__/graph.service.spec.ts` | Gradnja grafa povezav, match edge, interaction edge |
| `src/profile/__tests__/profile.service.spec.ts` | Profilna logika, posodobitve, validacije |
| `src/users/__tests__/users.service.spec.ts` | Upravljanje uporabnikov, brisanje, seznam skupnosti |
| `src/matching/__tests__/embedding.service.spec.ts` | Lokalni embedding za indeksiranje profilov |
| `src/matching/__tests__/event-matching-evaluator.spec.ts` | Evalvacija AI modela proti baseline |
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

### CareerInterviewService — create(), assign(), updateStatus(), update(), delete()

| Primer | Pričakovan rezultat |
|---|---|
| Ustvarjanje osnutka intervjuja | Intervju ustvarjen s statusom `draft`; kandidat obstaja |
| Ustvarjanje — kandidat ne obstaja | Vrže `NotFoundException` |
| Dodelitev intervjuja | Nastavljeni `interviewerUid`, `roomId`, `slotId`; status posodobljen v `scheduled`; ustvarjene 3 notifikacije |
| Dodelitev — interviewer ima časovni konflikt | Vrže `ConflictException` |
| Dodelitev — interviewer nima ustrezne vloge | Vrže `BadRequestException` |
| Dodelitev — kandidat in interviewer nista povezana | Vrže `BadRequestException` |
| Posodobitev statusa — scheduled brez predhodne dodelitve | Vrže `BadRequestException` |
| Posodobitev statusa — uspešna posodobitev | Status posodobljen v `scheduled`; preverjeni časovni konflikti |
| Preklic intervjuja | Ustvarjeni 2 notifikaciji o preklicu |
| Posodobitev intervjuja | Posodobljeni `candidateUid`, `notes`, `updatedByUid` |
| Brisanje intervjuja | Intervju izbrisan; vrne `{ message: 'Career interview deleted successfully' }` |

---

### AnalyticsService — getOverview(), getMatchingPerformance(), getUsageTrend(), getEngagement()

| Primer | Pričakovan rezultat |
|---|---|
| Izračun overview metrike | Vrne pravilne vrednosti: `usersTotal`, `usersCreatedInRange`, `profilesCompletedInRange`, `profileCompletionRatePercent`, `confirmedMeetings`, `confirmedCareerInterviews`, `acceptedConnectionsTotal` |
| Izračun matching conversion rate | Vrne pravilne vrednosti: `acceptedConnectionsInRange`, `meetingConversions`, `interviewConversions`, `totalConversions`, `connectionToConversionRatePercent` |
| Izračun usage trend metrike | Vrne `roleBreakdown`, `inactiveByRole` ter časovno serijo z `usersCreated`, `profilesCompleted`, `activeUsers` |
| Izračun engagement metrike | Vrne `notificationsInRange`, `unreadNotificationsInRange`, `readRatePercent`, `eventRegistrationsInRange`, `eventCancellationsInRange`, `eventCapacityUtilizationPercent`, `activeEventsInRange`, `topEvents`, `topCancelledEvents` |
| Neveljaven časovni razpon | Vrže `BadRequestException` |

---

### ConnectionsService — rejectRequest(), removeConnection()

| Primer | Pričakovan rezultat |
|---|---|
| Zavrnitev prošnje | Status posodobljen v `rejected`; ne ustvari se nobena notifikacija o zavrnitvi |
| Odstranitev povezave — uporabnik je del povezave | Povezava izbrisana; vrne `{ message: 'Connection removed' }` |
| Odstranitev povezave — request ne obstaja | Vrže `NotFoundException` |
| Odstranitev povezave — uporabnik ni del povezave | Vrže `ForbiddenException` |
| Odstranitev povezave — povezava ni v statusu `accepted` | Vrže `BadRequestException` |

---

### GraphService — getGraph()

| Primer | Pričakovan rezultat |
|---|---|
| Vračanje self in peer vozlišč | Vrne 2 vozlišči: `self` in `connection` |
| Ustvarjanje connection edge | Ustvari `connection` edge za vsakega sprejetega peer uporabnika |
| Ustvarjanje match edge | Ustvari `match` edge z `weight` in `reasons`, ko AI vrne ujemanje |
| Ustvarjanje interaction edge | Ustvari `interaction` edge z `count`, ko obstajajo skupni sestanki |
| Napaka pri AI matching — brez match edge | Če AI matching vrže napako, se `match` edge ne ustvari, ostali pa ostanejo |
| Filtriranje pending povezav | Pending povezave se izločijo; vrne samo self node brez povezav |
| Vozlišča vsebujejo tags | Self in peer vozlišča vsebujeta `tags` iz profila |
| Manjkajoči tags v profilu | Če profil nima `tags`, se vrne prazen seznam `[]` |

---

### EventsService — createEvent(), updateEvent(), deleteEvent(), registerForEvent(), cancelRegistration(), listRegistrations(), getEventById(), listRecommendedEvents()

| Primer | Pričakovan rezultat |
|---|---|
| Ustvarjanje dogodka | `registeredCount` nastavljen na 0; `startAt` in `endAt` pretvorjena v `Date`; dogodek ustvarjen |
| Posodobitev dogodka — ne obstaja | Vrže `NotFoundException` |
| Posodobitev dogodka — posodobi samo podana polja | Posodobljena so samo polja iz DTO |
| Posodobitev dogodka — pretvorba datumov | `startAt` in `endAt` pretvorjena v `Date` |
| Posodobitev dogodka — ne posreduje nepodana polja | V update grejo samo dejansko nastavljena polja |
| Brisanje dogodka — ne obstaja | Vrže `NotFoundException` |
| Brisanje dogodka — uspešno | Dogodek izbrisan; poklican tudi `safeRemoveEvent` |
| Registracija — dogodek ne obstaja | Vrže `NotFoundException` |
| Registracija — uspešna | Uporabnik uspešno registriran |
| Registracija — dogodek poln | Vrže `ConflictException` |
| Preklic registracije | Preklic delegiran v repository |
| Pridobitev registracij — dogodek ne obstaja | Vrže `NotFoundException` |
| Pridobitev registracij — uspešno | Vrne seznam registracij |
| Pridobitev dogodka po ID — obstaja | Vrne dogodek z `isRegistered` metapodatki |
| Pridobitev dogodka po ID — ne obstaja | Vrže `NotFoundException` |
| Priporočeni dogodki — višje ujemanje pred naključnim | Dogodki rangirani po semantični podobnosti; bolj relevanten dogodek višje |
| Priporočeni dogodki — SQL semantično iskanje prazno | Vrne rangirane dogodke preko fallback metode |

---

### SchedulingService — generateTimeSlots(), assignMeeting(), deleteMeeting(), updateMeetingStatus(), deleteRoom(), deleteTimeSlot()

| Primer | Pričakovan rezultat |
|---|---|
| Generiranje časovnih slotov | Ustvari pravilno število slotov; `generatedCount` ustreza številu novih slotov; `existingCount = 0` |
| Generiranje časovnih slotov — neveljaven razpon | Vrže `BadRequestException` |
| Dodelitev sestanka — brez konfliktov | Sestanek ustvarjen; vrne `meeting-1` |
| Dodelitev sestanka — soba zasedena | Vrže `ConflictException` |
| Dodelitev sestanka — udeleženec zaseden | Vrže `ConflictException` |
| Dodelitev sestanka — soba ne obstaja | Vrže `NotFoundException` |
| Dodelitev sestanka — isti uporabnik na obeh straneh | Vrže `BadRequestException` |
| Brisanje sestanka — obstaja | Sestanek izbrisan; vrne `{ message: 'Meeting deleted successfully' }` |
| Brisanje sestanka — ne obstaja | Vrže `NotFoundException` |
| Posodobitev statusa — soba že zasedena | Vrže `ConflictException` |
| Posodobitev statusa — udeleženec ima konflikt | Vrže `ConflictException` |
| Brisanje sobe — brez povezanih sestankov | Soba izbrisana |
| Brisanje sobe — ima povezane sestanke | Vrže `ConflictException` |
| Brisanje časovnega slota — brez povezanih sestankov | Slot izbrisan |
| Brisanje časovnega slota — ima povezane sestanke | Vrže `ConflictException` |

---

### StatisticsService — getRoomOccupancyStats(), getConfirmedMeetingsStats()

| Primer | Pričakovan rezultat |
|---|---|
| Zasedenost sob — osnovni izračun | Vrne seznam sob z `bookedSlots`, `totalSlots`, `occupancyRatePercent`, `usedSeats`, `totalSeats`, `capacityUtilizationPercent` |
| Zasedenost sob — ena soba, dva termina | `bookedSlots = 2`, `totalSlots = 2`, `occupancyRatePercent = 100` |
| Statistika potrjenih sestankov — osnovni izračun | Vrne `confirmedMeetingsCount`, `confirmedCareerInterviewsCount`, `confirmedTotalCount`, `pendingInterviewInvitesCount`, `acceptedInterviewInvitesCount`, `rejectedInterviewInvitesCount`, `inviteAcceptanceRatePercent` |
| Statistika potrjenih sestankov — dnevna serija | Vrne `series` z dnevnimi vrednostmi (`meetings`, `interviews`, `total`) |
| Statistika potrjenih sestankov — heatmap | Vrne `heatmap` z razporeditvijo po terminih |
| Statistika potrjenih sestankov — funnel | Vrne `funnel` s 4 koraki procesa |
| Statistika potrjenih sestankov — neveljaven datum | Vrže `BadRequestException` |

---

### TagsService — listTags(), createTag(), deleteTag()

| Primer | Pričakovan rezultat |
|---|---|
| Pridobitev vseh tagov | Vrne seznam vseh tagov iz repozitorija |
| Ustvarjanje taga — slug že obstaja | Vrže `ConflictException`; `create` se ne pokliče |
| Ustvarjanje taga — slug unikaten | Tag ustvarjen z `label` in `slug` |
| Brisanje taga | Brisanje delegirano v repozitorij (`deleteById`) |

---

### UsersService — listCommunityUsers(), deleteUserAsAdmin()

| Primer | Pričakovan rezultat |
|---|---|
| Pridobitev skupnostnih uporabnikov | Vrne samo ne-admin uporabnike; vključena so samo javna polja (`uid`, `displayName`, `affiliation`, `role`, `bio`, `interests`, `goals`, `meetingType`); email NI vključen |
| Ni ne-admin uporabnikov | Vrne prazen seznam `[]` |
| Brisanje uporabnika kot admin | Uporabnik izbrisan; pokliče se `deleteAccountData` |
| Brisanje — admin ne sme izbrisati samega sebe | Vrže napako: *"Admins cannot delete their own account here"* |
| Brisanje — uporabnik ne obstaja | Vrže napako: *"User not found"* |

---

### GuestsService — addGuest(), confirmInvitation()

| Primer | Pričakovan rezultat |
|---|---|
| Dodajanje gosta — dogodek ne obstaja | Vrže `NotFoundException` |
| Dodajanje gosta — klicatelj ni organizator | Vrže `ForbiddenException` |
| Dodajanje gosta — email še ne obstaja | Ustvari novega gosta (`guestStatus: pending`), ustvari povabilo, pošlje prvo notifikacijo |
| Dodajanje gosta — email pripada registriranemu uporabniku | Vrže `BadRequestException` |
| Dodajanje gosta — gost že povabljen na ta dogodek | Vrže `BadRequestException` |
| Potrditev povabila — token neveljaven | Vrže `BadRequestException` |
| Potrditev povabila — povabilo že uporabljeno | Vrže `BadRequestException` |
| Potrditev povabila — povabilo poteklo | Vrže `BadRequestException` |
| Potrditev povabila — gost ne obstaja | Vrže `NotFoundException` |
| Potrditev povabila — prvič potrjen gost | Posodobi `guestStatus`, sprejme povabilo, registrira gosta na dogodek, pošlje notifikacijo |
| Potrditev povabila — dogodek poln | Vrže `BadRequestException` (EventFullError) |

---

### ExportService — importProfile() [CSV Import]

| Primer | Pričakovan rezultat |
|---|---|
| Uvoz veljavnega CSV | Polja `bio`, `affiliation`, `interests`, `meetingType` uspešno posodobljena; `interests` razdeljen na seznam |
| Odstranitev prepovedanih polj | Polja `role`, `uid`, `email` se ignorirajo in se ne posredujejo v update |
| Neveljaven meetingType | Vrže `BadRequestException` |
| CSV brez veljavnih polj | Vrže `BadRequestException` |
| Prevelika datoteka (>1MB) | Vrže `BadRequestException` |
| Napačen MIME tip | Vrže `BadRequestException` |



## Cilji pokritosti

| Datoteka | Cilj |
|---|---|
| `auth.service.ts` | 100% |
| `notifications.service.ts` | 100% |
| `guests.service.ts` | 100% |
| `export.service.ts` (CSV import) | 100% |
| `scheduling-analytics.service.ts` | > 90% |
| `role-requests.service.ts` | > 80% |
| `profile.service.ts` | > 80% |
| `users.service.ts` | > 80% |
| `matching.service.ts` | > 80% |
| `matching-index.service.ts` | > 80% |
| `embedding.service.ts` | > 80% |
| `graph.service.ts` | > 80% |
| `connections.service.ts` | > 80% |
| `events.service.ts` | > 80% |
| `scheduling.service.ts` | > 80% |

