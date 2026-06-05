# Podatkovni modeli

Dokumentacija vseh kolekcij v Firestore. Ta dokument se bo posodabljal
tekom razvoja — nekatere kolekcije so načrtovane in še niso implementirane.

---

## Implementirane kolekcije

### `users`

Glavna kolekcija za vse uporabnike sistema. Vsak dokument ima kot ID Firebase Auth UID.

| Polje            | Tip       | Obvezno | Opis                                                                                     |
| ---------------- | --------- | ------- | ---------------------------------------------------------------------------------------- |
| uid              | string    | Da      | Firebase Auth UID                                                                        |
| email            | string    | Da      | E-poštni naslov                                                                          |
| displayName      | string    | Da      | Prikazno ime                                                                             |
| role             | string    | Da      | Vloga: `participant`, `organizer`, `industry`, `admin`, `guest`                          |
| profileStatus    | string    | Da      | Status izpolnjenosti profila; AI ujemanje trenutno uporablja prisotnost `tags` kot praktični pogoj indeksiranja |
| createdAt        | timestamp | Da      | Čas registracije                                                                         |
| bio              | string    | Ne      | Kratka predstavitev                                                                      |
| affiliation      | string    | Ne      | Organizacija ali institucija                                                             |
| tags             | string[]  | Ne      | Oznake, ki jih uporabnik izbere; glavni vhod za AI ujemanje udeležencev                  |
| meetingType      | string    | Ne      | `online`, `in-person` ali `both`                                                         |
| roleProfile      | map       | Ne      | Fleksibilna polja specifična za vlogo                                                    |

**Profilni signal za AI ujemanje:** trenutna implementacija uporablja izbrane
`tags`. Uporabnik označi teme, ki ga zanimajo, backend pa te oznake sinhronizira
v `participant_profile_index`. Polja `interests`, `goals`, `competencies` in
`researchKeywords` niso več del trenutnega podatkovnega modela profila.

**Primer dokumenta:**
```json
{
  "uid": "gI7mP2nQ",
  "email": "janez@primer.com",
  "displayName": "Janez Novak",
  "role": "participant",
  "profileStatus": "incomplete",
  "createdAt": "2026-05-14T16:06:06.576Z",
  "bio": "Raziskovalec na FRI",
  "affiliation": "Univerza v Ljubljani",
  "tags": ["ai", "strojno-ucenje"],
  "meetingType": "both",
  "roleProfile": {
    "previousEvents": ["SloTech 2025"]
  }
}
```

---

### `roleRequests`

Zahtevki udeležencev za spremembo vloge. Čaka na odobritev admina.

| Polje         | Tip       | Obvezno | Opis                                  |
| ------------- | --------- | ------- | ------------------------------------- |
| id            | string    | Da      | Firestore auto-generated ID           |
| uid           | string    | Da      | UID uporabnika, ki je oddal zahtevek  |
| email         | string    | Da      | E-pošta uporabnika                    |
| requestedRole | string    | Da      | `organizer` ali `industry`            |
| reason        | string    | Ne      | Razlog za zahtevek                    |
| status        | string    | Da      | `pending`, `approved` ali `rejected`  |
| reviewedBy    | string    | Ne      | UID admina, ki je obravnaval zahtevek |
| reviewedAt    | timestamp | Ne      | Čas obravnave                         |
| createdAt     | timestamp | Da      | Čas oddaje zahtevka                   |

**Indeksi:**

| Polja                  | Namen                                   |
| ---------------------- | --------------------------------------- |
| `uid` + `status`       | Iskanje obstoječega zahtevka uporabnika |
| `status` + `createdAt` | Seznam vseh pending zahtevkov po datumu |


**Primer dokumenta:**
```json
{
  "id": "gI7mP2nQ",
  "uid": "abc123",
  "email": "janez@primer.com",
  "requestedRole": "organizer",
  "reason": "Organiziram konferenco v juniju 2026",
  "status": "pending",
  "reviewedBy": null,
  "reviewedAt": null,
  "createdAt": "2026-05-16T09:05:03.112Z"
}
```

---

### `guestInvitations`

Povabila gostujočim uporabnikom na dogodke.

| Polje             | Tip       | Obvezno | Opis                                |
| ----------------- | --------- | ------- | ----------------------------------- |
| id                | string    | Da      | Firestore auto-generated ID         |
| guestUid          | string    | Da      | UID gostujočega uporabnika          |
| eventId           | string    | Da      | ID dogodka                          |
| invitedBy         | string    | Da      | UID organizatorja                   |
| status            | string    | Da      | `pending`, `accepted` ali `expired` |
| confirmationToken | string    | Da      | Potrditveni žeton za povabilo       |
| expiresAt         | timestamp | Da      | Datum poteka povabila               |
| createdAt         | timestamp | Da      | Čas ustvaritve                      |

**Primer dokumenta:**
```json
{
  "id": "gI7mP2nQ",
  "guestUid": "guest123",
  "eventId": "event456",
  "invitedBy": "organizer789",
  "status": "pending",
  "confirmationToken": "4f9c8b2d7e",
  "expiresAt": "2026-06-30T23:59:59.000Z",
  "createdAt": "2026-06-01T10:15:00.000Z"
}
```

---

### `tags`

Oznake za kategorizacijo dogodkov, sej in profilov.

| Polje     | Tip       | Obvezno | Opis                          |
| --------- | --------- | ------- | ----------------------------- |
| id        | string    | Da      | Firestore auto-generated ID   |
| label     | string    | Da      | Prikazno ime oznake           |
| slug      | string    | Da      | Unikatni identifikator oznake |
| createdAt | timestamp | Da      | Čas ustvaritve                |

**Primer dokumenta:**

```json
{
  "id": "gI7mP2nQ",
  "label": "Artificial Intelligence",
  "slug": "artificial-intelligence",
  "createdAt": "2026-06-01T08:00:00.000Z"
}
```

---

### `rooms`

Prostori za sestanke, intervjuje ali druge aktivnosti.

| Polje     | Tip       | Obvezno | Opis                        |
| --------- | --------- | ------- | --------------------------- |
| id        | string    | Da      | Firestore auto-generated ID |
| name      | string    | Da      | Naziv prostora              |
| location  | string    | Ne      | Lokacija prostora           |
| capacity  | number    | Da      | Maksimalna kapaciteta       |
| active    | boolean   | Da      | Ali je prostor aktiven      |
| createdAt | timestamp | Da      | Čas ustvaritve              |

**Primer dokumenta:**

```json
{
  "id": "gI7mP2nQ",
  "name": "Conference Room A",
  "location": "1st Floor",
  "capacity": 20,
  "active": true,
  "createdAt": "2026-06-01T09:30:00.000Z"
}
```

---

### `timeSlots`

Razpoložljivi termini za sestanke in intervjuje.

| Polje     | Tip       | Obvezno | Opis                        |
| --------- | --------- | ------- | --------------------------- |
| id        | string    | Da      | Firestore auto-generated ID |
| startAt   | timestamp | Da      | Začetek termina             |
| endAt     | timestamp | Da      | Konec termina               |
| createdAt | timestamp | Da      | Čas ustvaritve              |

**Primer dokumenta:**

```json
{
  "id": "gI7mP2nQ",
  "startAt": "2026-06-15T09:00:00.000Z",
  "endAt": "2026-06-15T09:30:00.000Z",
  "createdAt": "2026-06-01T11:00:00.000Z"
}
```

---

### `connectionRequests`

Zahteve za povezovanje med uporabniki.

| Polje        | Tip       | Obvezno | Opis                                 |
| ------------ | --------- | ------- | ------------------------------------ |
| id           | string    | Da      | Firestore auto-generated ID          |
| requesterUid | string    | Da      | UID pošiljatelja zahteve             |
| recipientUid | string    | Da      | UID prejemnika zahteve               |
| status       | string    | Da      | `pending`, `accepted` ali `rejected` |
| createdAt    | timestamp | Da      | Čas pošiljanja zahteve               |
| respondedAt  | timestamp | Ne      | Čas odgovora na zahtevo              |


**Primer dokumenta:**

```json
{
  "id": "gI7mP2nQ",
  "requesterUid": "abc123",
  "recipientUid": "abc123",
  "status": "pending",
  "createdAt": "2026-06-01T11:00:00.000Z",
  "respondedAt": "2026-06-01T12:00:00.000Z"
}
```

---

### `careerInterviews`

Karierni intervjuji med kandidati in predstavniki industrije.

| Polje                 | Tip       | Obvezno | Opis                                              |
| --------------------- | --------- | ------- | ------------------------------------------------- |
| id                    | string    | Da      | Firestore auto-generated ID                       |
| candidateUid          | string    | Da      | UID kandidata                                     |
| interviewerUid        | string    | Ne      | UID intervjuvalca                                 |
| slotId                | string    | Ne      | ID termina                                        |
| roomId                | string    | Ne      | ID prostora                                       |
| notes                 | string    | Ne      | Interni zapiski                                   |
| status                | string    | Da      | `draft`, `scheduled`, `completed` ali `cancelled` |
| invitationStatus      | string    | Ne      | `pending`, `accepted` ali `rejected`              |
| invitationRespondedAt | timestamp | Ne      | Čas odgovora na povabilo                          |
| createdByUid          | string    | Da      | UID uporabnika, ki je ustvaril intervju           |
| updatedByUid          | string    | Da      | UID uporabnika, ki je nazadnje posodobil intervju |
| statusHistory         | array     | Da      | Zgodovina sprememb statusov                       |
| lastStatusChangedAt   | timestamp | Da      | Čas zadnje spremembe statusa                      |
| createdAt             | timestamp | Da      | Čas ustvaritve                                    |
| updatedAt             | timestamp | Da      | Čas zadnje posodobitve                            |

#### `statusHistory`

| Polje        | Tip       | Opis                                    |
| ------------ | --------- | --------------------------------------- |
| status       | string    | Status intervjuja                       |
| changedAt    | timestamp | Čas spremembe                           |
| changedByUid | string    | UID uporabnika, ki je izvedel spremembo |


**Primer dokumenta:**

```json
{
  "id": "interview001",
  "candidateUid": "candidate123",
  "interviewerUid": "industry456",
  "slotId": "slot001",
  "roomId": "room101",
  "notes": "Kandidat ima izkušnje z Angular in Firebase.",
  "status": "scheduled",
  "invitationStatus": "accepted",
  "invitationRespondedAt": "2026-06-10T10:15:00.000Z",
  "createdByUid": "organizer789",
  "updatedByUid": "organizer789",
  "statusHistory": [
    {
      "status": "draft",
      "changedAt": "2026-06-01T08:00:00.000Z",
      "changedByUid": "organizer789"
    },
    {
      "status": "scheduled",
      "changedAt": "2026-06-05T14:30:00.000Z",
      "changedByUid": "organizer789"
    }
  ],
  "lastStatusChangedAt": "2026-06-05T14:30:00.000Z",
  "createdAt": "2026-06-01T08:00:00.000Z",
  "updatedAt": "2026-06-05T14:30:00.000Z"
}
```

---

### `Events`

Dogodki in konference, ki jih organizirajo organizatorji.

| Polje           | Tip       | Obvezno | Opis                           |
| --------------- | --------- | ------- | ------------------------------ |
| id              | string    | Da      | Firestore auto-generated ID    |
| title           | string    | Da      | Naziv dogodka                  |
| description     | string    | Da      | Opis dogodka                   |
| startAt         | timestamp | Da      | Začetek dogodka                |
| endAt           | timestamp | Da      | Konec dogodka                  |
| location        | string    | Da      | Lokacija dogodka               |
| capacity        | number    | Da      | Maksimalno število udeležencev |
| registeredCount | number    | Da      | Število prijavljenih           |
| tags            | string[]  | Ne      | Oznake dogodka                 |
| createdBy       | string    | Da      | UID organizatorja              |
| createdAt       | timestamp | Da      | Čas ustvaritve                 |

#### `sessions`

Posamezne vsebinske seje znotraj dogodkov.

| Polje           | Tip              | Obvezno | Opis                                                                                          |
| --------------- | ---------------- | ------- | --------------------------------------------------------------------------------------------- |
| id              | string           | Da      | Firestore auto-generated ID                                                                   |
| title           | string           | Da      | Naslov seje                                                                                   |
| description     | string           | Da      | Opis seje                                                                                     |
| speakers        | array            | Da      | Seznam predavateljev (ime, bio, userId)                                                       |
| startAt         | timestamp        | Da      | Začetek seje                                                                                  |
| endAt           | timestamp        | Da      | Konec seje                                                                                    |
| location        | string           | Da      | Lokacija seje                                                                                 |
| capacity        | number \| null   | Ne      | Kapaciteta seje                                                                               |
| registeredCount | number           | Da      | Število prijavljenih                                                                          |
| tags            | string[]         | Ne      | Oznake                                                                                        |
| createdBy       | string           | Da      | UID organizatorja                                                                             |
| createdAt       | timestamp        | Da      | Čas ustvaritve                                                                                |
| presenterName   | string           | Ne      | Prikazno ime povabljenega predavatelja (uporabnik v sistemu ali gost)                         |
| presenterUid    | string           | Ne      | UID povabljenega predavatelja, če je v sistemu                                                |
| presenterStatus | string           | Ne      | `pending` — čaka na odgovor; `confirmed`; `auto_confirmed` — gost; `declined` — zavrnjeno    |
| status          | string           | Ne      | `active` (privzeto) ali `cancelled` — nastavi se samodejno ob zavrnitvi predavatelja          |


#### `registrations`

Prijave uporabnikov na posamezne seje.

| Polje        | Tip       | Obvezno | Opis           |
| ------------ | --------- | ------- | -------------- |
| uid          | string    | Da      | UID uporabnika |
| registeredAt | timestamp | Da      | Čas prijave    |


#### `careerSlots`

Termini za karierne razgovore, ki jih predlagajo predstavniki industrije ali ustvarijo organizatorji/admini.

| Polje          | Tip       | Obvezno | Opis                                                                                                  |
| -------------- | --------- | ------- | ----------------------------------------------------------------------------------------------------- |
| id             | string    | Da      | Firestore auto-generated ID                                                                           |
| title          | string    | Da      | Naziv termina                                                                                         |
| description    | string    | Da      | Opis termina                                                                                          |
| startAt        | timestamp | Da      | Začetek termina                                                                                       |
| endAt          | timestamp | Da      | Konec termina                                                                                         |
| location       | string    | Da      | Lokacija                                                                                              |
| capacity       | number    | Da      | Število razpoložljivih pod-terminov                                                                   |
| requirements   | string[]  | Ne      | Zahteve za prijavo                                                                                    |
| createdByUid   | string    | Da      | UID ustvarjalca (industrijalec ali organizator)                                                       |
| createdAt      | timestamp | Da      | Čas ustvaritve                                                                                        |
| approvalStatus | string    | Ne      | `pending_approval` — čaka odobritev; `approved` — aktiven; `rejected` — zavrnjen. Organizatorji/admini dobijo `approved` samodejno. |

**Vidnost glede na vlogo:**
- `participant`: vidi samo termine z `approvalStatus: approved`
- `industry` (ustvarjalec): vidi svoje termine ne glede na status
- `organizer` / `admin`: vidi vse termine

#### `careerSlotRequests`

Prijave udeležencev na pod-termine znotraj kariernih terminov.

| Polje        | Tip       | Obvezno | Opis                                                |
| ------------ | --------- | ------- | --------------------------------------------------- |
| id           | string    | Da      | Firestore auto-generated ID                         |
| requesterUid | string    | Da      | UID udeleženca                                      |
| subSlotIndex | number    | Da      | Indeks pod-termina (0 do `capacity - 1`)            |
| status       | string    | Da      | `pending`, `approved` ali `declined`                |
| requestedAt  | timestamp | Da      | Čas prijave                                         |
| respondedAt  | timestamp | Ne      | Čas odgovora industrijalca                          |


**Primer dokumenta (`events`):**

```json
{
  "id": "event001",
  "title": "AI Summit Slovenija 2026",
  "description": "Konferenca o umetni inteligenci in digitalni transformaciji.",
  "startAt": "2026-09-15T08:00:00.000Z",
  "endAt": "2026-09-15T18:00:00.000Z",
  "location": "Maribor",
  "capacity": 500,
  "registeredCount": 327,
  "tags": [
    "AI",
    "Machine Learning"
  ],
  "createdBy": "organizer123",
  "createdAt": "2026-05-01T10:00:00.000Z"
}
```

**Primer dokumenta (`sessions`):**

```json
{
  "id": "session001",
  "title": "Veliki jezikovni modeli v praksi",
  "description": "Pregled uporabe LLM sistemov v podjetjih.",
  "speakers": [
    {
      "name": "Janez Novak",
      "bio": "Vodja AI oddelka",
      "userId": "speaker123"
    }
  ],
  "startAt": "2026-09-15T10:00:00.000Z",
  "endAt": "2026-09-15T11:00:00.000Z",
  "location": "Dvorana A",
  "capacity": 150,
  "registeredCount": 92,
  "tags": [
    "AI",
    "LLM"
  ],
  "createdBy": "organizer123",
  "createdAt": "2026-05-10T08:00:00.000Z"
}
```

**Primer dokumenta (`registrations`):**

```json
{
  "uid": "user123",
  "registeredAt": "2026-09-01T12:30:00.000Z"
}
```

**Primer dokumenta (`careerSlots`):**

```json
{
  "id": "careerSlot001",
  "title": "Karierni pogovori z industrijo",
  "description": "Individualni pogovori s predstavniki podjetij.",
  "startAt": "2026-09-15T13:00:00.000Z",
  "endAt": "2026-09-15T15:00:00.000Z",
  "location": "Karierni kotiček",
  "capacity": 20,
  "requirements": [
    "Življenjepis"
  ],
  "createdByUid": "organizer123",
  "createdAt": "2026-05-10T08:00:00.000Z"
}
```

---

### `notifications`

Obvestila za uporabnike — odobritve vlog, povabila na sestanke, spremembe terminov in druge sistemske aktivnosti.

| Polje     | Tip       | Obvezno | Opis                        |
| --------- | --------- | ------- | --------------------------- |
| id        | string    | Da      | Firestore auto-generated ID |
| uid       | string    | Da      | UID prejemnika              |
| type      | string    | Da      | Tip obvestila               |
| message   | string    | Da      | Besedilo obvestila          |
| read      | boolean   | Da      | Ali je bilo prebrano        |
| archived  | boolean   | Da      | Ali je arhivirano           |
| createdAt | timestamp | Da      | Čas ustvaritve              |

**Tipi obvestil (`type`) in ali pošljejo e-mail:**

| Vrednost                          | E-mail | Opis                                                    |
| --------------------------------- | ------ | ------------------------------------------------------- |
| `role_approved`                   | Da     | Admin je odobril zahtevek za spremembo vloge            |
| `role_rejected`                   | Da     | Admin je zavrnil zahtevek za spremembo vloge            |
| `meeting_request`                 | Da     | Nova zahteva za sestanek                                |
| `meeting_accepted`                | Da     | Sestanek sprejet                                        |
| `meeting_rejected`                | Da     | Sestanek zavrnjen                                       |
| `connection_request`              | Ne     | Nova zahteva za povezavo                                |
| `connection_accepted`             | Ne     | Zahteva za povezavo sprejeta                            |
| `connection_rejected`             | Ne     | Zahteva za povezavo zavrnjena                           |
| `career_interview_assigned`       | Da     | Karierni intervju dodeljen                              |
| `career_interview_rescheduled`    | Da     | Karierni intervju prestavljen                           |
| `career_interview_cancelled`      | Da     | Karierni intervju odpovedan                             |
| `session_presenter_invited`       | Da     | Povabilo za predavatelja seje                           |
| `session_presenter_confirmed`     | Da     | Predavatelj je potrdil vabilo                           |
| `session_presenter_declined`      | Da     | Predavatelj je zavrnil vabilo (seja se označi kot odpovedana) |
| `career_slot_approval_request`    | Da     | Industrijalec je predlagal karierni termin (organizatorju) |
| `career_slot_organizer_approved`  | Da     | Organizator je odobril karierni termin (industrijalcu)  |
| `career_slot_organizer_rejected`  | Da     | Organizator je zavrnil karierni termin (industrijalcu)  |
| `career_slot_requested`           | Da     | Udeleženec se je prijavil na pod-termin (industrijalcu) |
| `career_slot_approved`            | Da     | Industrijalec je potrdil prijavo udeleženca             |
| `career_slot_declined`            | Da     | Industrijalec je zavrnil prijavo udeleženca             |

**Indeksi:**

| Polja       |
| ----------- |
| `archived`  |
| `uid`       |
| `createdAt` |

**Primer dokumenta:**

```json
{
  "id": "notification001",
  "uid": "user123",
  "type": "meeting_request",
  "message": "Prejeli ste novo zahtevo za sestanek.",
  "read": false,
  "archived": false,
  "createdAt": "2026-06-12T09:45:00.000Z"
}
```

---

### `meetings`

Dogovorjeni sestanki med uporabniki.

| Polje           | Tip       | Obvezno | Opis                                     |
| --------------- | --------- | ------- | ---------------------------------------- |
| id              | string    | Da      | Firestore auto-generated ID              |
| slotId          | string    | Da      | ID termina                               |
| roomId          | string    | Da      | ID prostora                              |
| requestedByUids | string[]  | Da      | Uporabniki, ki so zahtevali sestanek     |
| requestedToUids | string[]  | Da      | Uporabniki, katerim je sestanek namenjen |
| participantUids | string[]  | Da      | Vsi udeleženci sestanka                  |
| status          | string    | Da      | `scheduled`, `completed` ali `cancelled` |
| createdAt       | timestamp | Da      | Čas ustvaritve                           |

**Primer dokumenta:**

```json
{
  "id": "meeting001",
  "slotId": "slot001",
  "roomId": "room101",
  "requestedByUids": [
    "user123"
  ],
  "requestedToUids": [
    "user456"
  ],
  "participantUids": [
    "user123",
    "user456"
  ],
  "status": "scheduled",
  "createdAt": "2026-06-15T08:00:00.000Z"
}
```

---
