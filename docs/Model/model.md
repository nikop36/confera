# Podatkovni modeli

Dokumentacija vseh kolekcij v Firestore. Ta dokument se bo posodabljal
tekom razvoja — nekatere kolekcije so načrtovane in še niso implementirane.

---

## Implementirane kolekcije

### `users`
Glavna kolekcija za vse uporabnike sistema. Vsak dokument ima kot ID
Firebase Auth UID.

| Polje | Tip | Obvezno | Opis |
|---|---|---|---|
| uid | string | Da | Firebase Auth UID |
| email | string | Da | E-poštni naslov |
| displayName | string | Da | Prikazno ime |
| role | string | Da | Vloga: `participant`, `organizer`, `industry`, `admin`, `guest` |
| profileStatus | string | Da | `incomplete` — profil ni v AI ujemanju; `complete` — profil je indeksiran za AI ujemanje |
| createdAt | timestamp | Da | Čas registracije |
| bio | string | Ne | Kratka predstavitev |
| affiliation | string | Ne | Organizacija ali institucija |
| interests | string[] | Ne | Seznam interesov |
| goals | string[] | Ne | Cilji udeležbe |
| meetingType | string | Ne | `online`, `in-person` ali `both` |
| competencies | string[] | Ne | Kompetence in veščine |
| researchKeywords | string[] | Ne | Ključne besede za iskanje |
| roleProfile | map | Ne | Fleksibilna polja specifična za vlogo |

**Taksonomija profilnih signalov:** podrobna definicija področij interesa,
ciljev mreženja, kompetenc in ključnih besed je dokumentirana v
[interests.md](./interests.md). Ta polja so trenutno shranjena kot `string[]`,
ker aplikacija podpira vnaprej pripravljene izbire in uporabniško možnost
`Drugo`.

**Indeksi:** noben sestavljen indeks trenutno ni potreben

**Primer dokumenta:**
```json
{
  "uid": "abc123",
  "email": "janez@primer.com",
  "displayName": "Janez Novak",
  "role": "participant",
  "profileStatus": "incomplete",
  "createdAt": "2026-05-14T16:06:06.576Z",
  "bio": "Raziskovalec na FRI",
  "affiliation": "Univerza v Ljubljani",
  "interests": ["AI", "strojno učenje"],
  "goals": ["mreženje", "iskanje investitorjev"],
  "meetingType": "both",
  "competencies": ["Python", "TypeScript"],
  "researchKeywords": ["nevronske mreže", "LLM"],
  "roleProfile": {
    "previousEvents": ["SloTech 2025"]
  }
}
```

---

### `roleRequests`
Zahtevki udeležencev za spremembo vloge. Čaka na odobritev admina.

| Polje | Tip | Obvezno | Opis |
|---|---|---|---|
| id | string | Da | Firestore auto-generated ID |
| uid | string | Da | UID uporabnika ki je oddal zahtevek |
| email | string | Da | E-pošta uporabnika |
| requestedRole | string | Da | `organizer` ali `industry` |
| reason | string | Ne | Razlog za zahtevek |
| status | string | Da | `pending`, `approved` ali `rejected` |
| reviewedBy | string | Ne | UID admina ki je obravnaval zahtevek |
| reviewedAt | timestamp | Ne | Čas obravnave |
| createdAt | timestamp | Da | Čas oddaje zahtevka |

**Indeksi:**
| Polja | Namen |
|---|---|
| `uid` + `status` | Iskanje obstoječega zahtevka uporabnika |
| `status` + `createdAt` | Seznam vseh pending zahtevkov po datumu |

**Primer dokumenta:**
```json
{
  "id": "xK9mP2nQ",
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

## Načrtovane kolekcije

### `invites`
Začasni zapisi za udeležence, uvožene iz CSV, ki še nimajo Firebase računa. Dokument ID je normaliziran e-poštni naslov.

Ko se tak uporabnik registrira z istim e-poštnim naslovom, se gostujoči zapis izbriše in uporabnik dobi vlogo `participant` v kolekciji `users`.

| Polje | Tip | Opis |
|---|---|---|
| email | string | E-poštni naslov (hkrati document ID) |
| displayName | string | Prikazno ime iz CSV uvoza |
| createdAt | timestamp | Čas uvoza |

**Opomba:** Gostujočim zapisom ni ustvarjen Firebase Auth račun. Vloga je konceptualno `guest` — ob registraciji se samodejno nadgradi v `participant`.

---

### `events`
Konference in dogodki ki jih organizirajo organizatorji.

| Polje | Tip | Opis |
|---|---|---|
| id | string | Firestore auto-generated ID |
| title | string | Naziv dogodka |
| description | string | Opis |
| organizerUid | string | UID organizatorja |
| startDate | timestamp | Začetek |
| endDate | timestamp | Konec |
| location | string | Lokacija ali spletna povezava |
| status | string | `draft`, `published`, `cancelled` |
| createdAt | timestamp | Čas ustvaritve |

---

### `eventParticipants`
Udeleženci posameznega dogodka. Subcollection ali samostojna kolekcija.

| Polje | Tip | Opis |
|---|---|---|
| eventId | string | ID dogodka |
| uid | string | UID udeleženca |
| registeredAt | timestamp | Čas prijave |
| status | string | `registered`, `attended`, `cancelled` |

---

### `meetings`
Sestanki med udeleženci na dogodku — načrtovani ali zahtevani.

| Polje | Tip | Opis |
|---|---|---|
| id | string | Firestore auto-generated ID |
| eventId | string | ID dogodka |
| requestedBy | string | UID ki je zahteval sestanek |
| requestedTo | string | UID prejemnika zahteve |
| status | string | `pending`, `accepted`, `rejected`, `completed` |
| scheduledAt | timestamp | Dogovorjen čas |
| meetingType | string | `online` ali `in-person` |
| notes | string | Opombe |
| createdAt | timestamp | Čas zahteve |

---

### `notifications`
Obvestila za uporabnike — odobritve vlog, povabila na sestanke itd.

| Polje | Tip | Opis |
|---|---|---|
| id | string | Firestore auto-generated ID |
| uid | string | Prejemnik obvestila |
| type | string | `role_approved`, `role_rejected`, `meeting_request`, `meeting_accepted` itd. |
| message | string | Besedilo obvestila |
| read | boolean | Ali je bilo prebrano |
| createdAt | timestamp | Čas ustvaritve |
| relatedId | string | ID povezanega dokumenta (zahtevek, sestanek itd.) |
