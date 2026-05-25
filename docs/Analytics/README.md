# Napredna Statistika in Poročanje (Issue 21)

## Namen
Ta dokument definira metrike napredne analitike in API končne točke za poročanje, namenjene izključno skrbniku.

## Nadzor dostopa
Vse poti `/analytics/*` so omejene na vlogo `admin` preko:
- `FirebaseAuthGuard`
- `RolesGuard`
- `@Roles('admin')`

Testi vključujejo tudi negativni scenarij, kjer je uporabniku z vlogo `organizer` dostop zavrnjen (`403`).

## Pravila časovnega intervala
- Parametra `from` in `to` sta neobvezna (ISO datum/čas).
- Privzeti interval brez parametrov: celoten čas (`1970-01-01` do `9999-12-31`).
- `to` mora biti večji od `from`.

## Definicije metrik (v1)

### 1) Pregled
Končna točka: `GET /analytics/overview`

- `usersTotal`: skupno število uporabnikov (vzorec do 5000).
- `usersCreatedInRange`: uporabniki ustvarjeni v izbranem intervalu.
- `profilesCompletedInRange`: uporabniki v intervalu z `profileStatus='complete'`.
- `profileCompletionRatePercent`: `profilesCompletedInRange / usersCreatedInRange * 100`.
- `confirmedMeetings`: srečanja s statusom `scheduled|completed`.
- `confirmedCareerInterviews`: karierni intervjuji s statusom `scheduled|completed`.
- `acceptedConnectionsTotal`: skupno število sprejetih povezav.

### 2) Trend uporabe
Končna točka: `GET /analytics/usage-trend`

Dnevni agregati:
- `usersCreated`
- `profilesCompleted`

Dodan je tudi razrez po vlogah:
- število uporabnikov po vlogi v izbranem intervalu.

### 3) Uspešnost ujemanja
Končna točka: `GET /analytics/matching-performance`

- `acceptedConnectionsInRange`
- `meetingConversions`
- `interviewConversions`
- `totalConversions = meetingConversions + interviewConversions`
- `connectionToConversionRatePercent = totalConversions / acceptedConnectionsInRange * 100`

Opomba:
- V v1 uporabljamo sprejete povezave kot približek sprejetih priporočil.

### 4) Vključenost
Končna točka: `GET /analytics/engagement`

- `acceptedConnectionsTotal`
- `notificationsInRange`
- `unreadNotificationsInRange`
- `readRatePercent`
- `acceptedInterviewInvites`
- `rejectedInterviewInvites`
- `inviteDecisionCount`

## Izvoz poročil

Končna točka: `GET /analytics/report?format=json|csv&section=all|overview|usage|matching|engagement`

- `json` (privzeto): vrne strukturiran objekt (pregled, trend, uspešnost, vključenost).
- `csv`: vrne vrstice metrik s stolpci:
  - `section`
  - `metric`
  - `value`
- Z `section` lahko izvozimo samo izbrani del poročila.

## Trenutne omejitve (v1)
- Agregacije uporabljajo omejene poizvedbe (`limit` do 5000).
- Vgrajen je 60-sekundni predpomnilnik na ravni storitve za enake intervale.
- Za zelo velike količine podatkov je predvidena prehodna rešitev na predizračunane dnevne/tedenske agregate.

## Opombe o poizvedbah in agregaciji
- Trenutni viri podatkov:
  - `users` (urejeno po `createdAt`)
  - `meetings` in `careerInterviews` preko omejenih list endpointov
  - `connectionRequests` s filtrom `accepted`
  - `notifications` preko omejenega posnetka
- Obstoječe operativne poizvedbe se naslanjajo na indekse za:
  - status + ustvarjanje (`createdAt`)
  - uporabnik (`uid`) + `createdAt` pri obvestilih
  - konfliktne poizvedbe po `slot/room/status`

## Načrt v2
- DAU/WAU/MAU na osnovi realnih dogodkov aktivnosti.
- Natančno merjenje sprejetih priporočil (namenski matching dogodki).
- Predizračunane analitične kolekcije in dodatna optimizacija indeksov.
