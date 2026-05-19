# API Dokumentacija

Osnovni URL: `http://localhost:{port}`
Interaktivna dokumentacija: `http://localhost:{port}/api` (Swagger)

Vse zaščitene poti zahtevajo Firebase ID žeton v glavi zahteve:
```
Authorization: Bearer <firebase-id-token>
```

---

## Avtentikacija

### POST /auth/register
Registracija novega uporabnika.

**Zahteva avtentikacijo:** Ne

**Telo zahteve**
| Polje | Tip | Pravila |
|---|---|---|
| email | string | veljaven e-poštni naslov |
| password | string | najmanj 12 znakov, 1 velika črka, 1 številka, 1 poseben znak |
| displayName | string | obvezno |
| inviteToken | string | neobvezno — za dodelitev vloge ob registraciji |

**Odgovori**
| Status | Pomen |
|---|---|
| 201 | Uporabnik uspešno ustvarjen |
| 400 | Napaka pri validaciji |
| 409 | E-poštni naslov že obstaja |
| 500 | Nepričakovana napaka strežnika |

**Uspešen odgovor**
```json
{
  "uid": "firebase-uid",
  "email": "uporabnik@primer.com",
  "role": "participant"
}
```

---

### POST /auth/login
Prijava in pridobitev Firebase ID žetona.

**Zahteva avtentikacijo:** Ne

**Opomba:** Ta endpoint je namenjen razvoju in testiranju. V produkciji se prijava izvaja neposredno prek Firebase klientske knjižnice.

**Telo zahteve**
| Polje | Tip | Pravila |
|---|---|---|
| email | string | veljaven e-poštni naslov |
| password | string | obvezno |

**Odgovori**
| Status | Pomen |
|---|---|
| 200 | Prijava uspešna, vrne žeton |
| 401 | Napačne poverilnice |

**Uspešen odgovor**
```json
{
  "idToken": "firebase-id-token",
  "uid": "firebase-uid"
}
```

---

## Profil

### GET /profile/me
Pridobitev profila trenutno prijavljenega uporabnika.

**Zahteva avtentikacijo:** Da

**Odgovori**
| Status | Pomen |
|---|---|
| 200 | Profil uspešno vrnjen |
| 401 | Ni avtentikacije |
| 404 | Profil ni najden |

**Uspešen odgovor**
```json
{
  "uid": "firebase-uid",
  "email": "uporabnik@primer.com",
  "displayName": "Janez Novak",
  "role": "participant",
  "profileStatus": "incomplete",
  "bio": "Researcher at FRI",
  "affiliation": "Univerza v Ljubljani",
  "interests": ["AI", "Machine Learning"],
  "goals": ["Mreženje z investitorji"],
  "meetingType": "both",
  "competencies": ["TypeScript", "NestJS"],
  "researchKeywords": ["nevronske mreže"],
  "roleProfile": {},
  "createdAt": "2026-05-14T16:06:06.576Z"
}
```

---

### PATCH /profile/me
Posodobitev profila — sprejme lahko katerokoli kombinacijo polj.

**Zahteva avtentikacijo:** Da

**Telo zahteve** — vsa polja so neobvezna
| Polje | Tip | Opis |
|---|---|---|
| bio | string | Kratka predstavitev |
| affiliation | string | Organizacija ali institucija |
| interests | string[] | Seznam interesov |
| goals | string[] | Cilji udeležbe |
| meetingType | string | `online`, `in-person` ali `both` |
| competencies | string[] | Kompetence in veščine |
| researchKeywords | string[] | Ključne besede raziskovanja |
| roleProfile | object | Fleksibilna polja specifična za vlogo |

**Odgovori**
| Status | Pomen |
|---|---|
| 200 | Profil uspešno posodobljen |
| 400 | Napaka pri validaciji |
| 401 | Ni avtentikacije |

**Uspešen odgovor**
```json
{
  "message": "Profile updated successfully"
}
```

---

### GET /profile/:uid
Javni profil kateregakoli uporabnika.

**Zahteva avtentikacijo:** Ne

**Parametri URL**
| Parameter | Opis |
|---|---|
| uid | Firebase UID uporabnika |

**Odgovori**
| Status | Pomen |
|---|---|
| 200 | Profil uspešno vrnjen |
| 404 | Profil ni najden |

---

## AI ujemanje

### GET /matches/me
Vrne priporočene udeležence za trenutno prijavljenega uporabnika.

**Zahteva avtentikacijo:** Da

**Opomba:** Endpoint uporablja PostgreSQL + `pgvector` indeks. Če `DATABASE_URL`
ni nastavljen ali baza nima razširitve `pgvector`, endpoint vrne `503`, ostali
deli aplikacije pa še naprej delujejo prek Firestore.

**Odgovori**
| Status | Pomen |
|---|---|
| 200 | Priporočila uspešno vrnjena |
| 401 | Ni avtentikacije |
| 404 | Profil ni najden |
| 503 | SQL matching indeks ni konfiguriran |

**Uspešen odgovor**
```json
[
  {
    "uid": "firebase-uid",
    "displayName": "Petra Kos",
    "affiliation": "Univerza v Ljubljani",
    "bio": "Raziskovalka na področju AI",
    "interests": ["Umetna inteligenca", "Medicina"],
    "goals": ["Raziskovalno sodelovanje"],
    "competencies": ["Strojno učenje"],
    "researchKeywords": ["LLM"],
    "meetingType": "both",
    "score": 0.031,
    "reasons": [
      "Skupna področja interesa: Umetna inteligenca",
      "Ujemanje ključnih besed: LLM"
    ]
  }
]
```

---

## Prošnja za vlogo

### POST /role-requests
Oddaja prošnje za spremembo vloge. Samo udeleženci (`participant`) lahko oddajo zahtevek.

**Zahteva avtentikacijo:** Da

**Telo zahteve**
| Polje | Tip | Pravila |
|---|---|---|
| requestedRole | string | `organizer` ali `industry` |
| reason | string | Neobvezno — razlog za zahtevek, največ 500 znakov |

**Odgovori**
| Status | Pomen |
|---|---|
| 201 | Zahtevek uspešno oddan |
| 400 | Napaka pri validaciji ali zahtevek že obstaja |
| 403 | Uporabnik nima vloge participant |
| 404 | Uporabnik ni najden |

**Uspešen odgovor**
```json
{
  "id": "firestore-generated-id",
  "uid": "firebase-uid",
  "email": "uporabnik@primer.com",
  "requestedRole": "organizer",
  "reason": "Organiziram konferenco v juniju",
  "status": "pending",
  "createdAt": "2026-05-16T09:05:03.112Z"
}
```

---

### GET /role-requests
Seznam vseh zahtevkov s statusom `pending`. Samo admini.

**Zahteva avtentikacijo:** Da (samo admin)

**Odgovori**
| Status | Pomen |
|---|---|
| 200 | Seznam zahtevkov |
| 403 | Ni dovoljenja |

---

### PATCH /role-requests/:id/approve
Odobritev zahtevka za vlogo. Samo admini.

**Zahteva avtentikacijo:** Da (samo admin)

**Parametri URL**
| Parameter | Opis |
|---|---|
| id | ID zahtevka |

**Odgovori**
| Status | Pomen |
|---|---|
| 200 | Zahtevek odobren, vloga posodobljena |
| 400 | Zahtevek je bil že obravnavan |
| 404 | Zahtevek ni najden |

---

### PATCH /role-requests/:id/reject
Zavrnitev zahtevka za vlogo. Samo admini.

**Zahteva avtentikacijo:** Da (samo admin)

**Odgovori**
| Status | Pomen |
|---|---|
| 200 | Zahtevek zavrnjen |
| 400 | Zahtevek je bil že obravnavan |
| 404 | Zahtevek ni najden |

---

## Obvestila

### GET /notifications
Pridobi vsa obvestila trenutno prijavljenega uporabnika (30 na stran, razvrščena od najnovejšega).

**Zahteva avtentikacijo:** Da

**Parametri poizvedbe**
| Parameter | Tip | Opis |
|---|---|---|
| cursor | string | Neobvezno — vrednost `createdAt` zadnjega obvestila prejšnje strani (ISO format) |

**Odgovori**
| Status | Pomen |
|---|---|
| 200 | Seznam obvestil |
| 401 | Ni avtentikacije |

**Uspešen odgovor**
```json
[
  {
    "id": "notif-id-789",
    "uid": "firebase-uid",
    "type": "role_approved",
    "message": "Vaš zahtevek za vlogo \"organizer\" je bil odobren.",
    "read": false,
    "archived": false,
    "createdAt": "2026-05-16T09:05:03.112Z"
  }
]
```

**Paginacija:**
Prva stran — brez cursorja. Naslednja stran — pošlji `createdAt` zadnjega obvestila kot cursor:
```
GET /notifications?cursor=2026-05-16T09:05:03.112Z
```

---

### PATCH /notifications/read-all
Označi vsa neprebrana obvestila trenutnega uporabnika kot prebrana.

**Zahteva avtentikacijo:** Da

**Odgovori**
| Status | Pomen |
|---|---|
| 200 | Vsa obvestila označena kot prebrana |
| 401 | Ni avtentikacije |

**Uspešen odgovor**
```json
{
  "message": "Vsa obvestila označena kot prebrana"
}
```

---

### PATCH /notifications/:id/read
Označi posamezno obvestilo kot prebrano.

**Zahteva avtentikacijo:** Da

**Parametri URL**
| Parameter | Opis |
|---|---|
| id | Firestore ID obvestila |

**Odgovori**
| Status | Pomen |
|---|---|
| 200 | Obvestilo označeno kot prebrano |
| 401 | Ni avtentikacije |
| 403 | Obvestilo pripada drugemu uporabniku |
| 404 | Obvestilo ni najdeno |

**Uspešen odgovor**
```json
{
  "message": "Obvestilo označeno kot prebrano"
}
```

---

### DELETE /notifications/:id
Arhivira obvestilo (soft delete — obvestilo ostane v bazi, ni več prikazano).

**Zahteva avtentikacijo:** Da

**Parametri URL**
| Parameter | Opis |
|---|---|
| id | Firestore ID obvestila |

**Odgovori**
| Status | Pomen |
|---|---|
| 200 | Obvestilo arhivirano |
| 401 | Ni avtentikacije |
| 403 | Obvestilo pripada drugemu uporabniku |
| 404 | Obvestilo ni najdeno |

**Uspešen odgovor**
```json
{
  "message": "Obvestilo izbrisano"
}
```

---

### Tipi obvestil

| Tip | Opis | Sproži se ob |
|---|---|---|
| `role_approved` | Zahtevek za vlogo odobren | Admin odobri zahtevek |
| `role_rejected` | Zahtevek za vlogo zavrnjen | Admin zavrne zahtevek |
| `meeting_request` | Prejeto povabilo na sestanek | Uporabnik pošlje zahtevo za sestanek |
| `meeting_accepted` | Sestanek potrjen | Prejemnik sprejme sestanek |
| `meeting_rejected` | Sestanek zavrnjen | Prejemnik zavrne sestanek |

---

## Zdravje sistema

### GET /health
Preverjanje delovanja strežnika.

**Zahteva avtentikacijo:** Ne

**Uspešen odgovor**
```json
{ "status": "ok" }
```