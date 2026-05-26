# Poročilo o testiranju — Career Interview Flow

**Datum:** 26. 5. 2026
**Vrsta testiranja:** Funkcionalno testiranje (Bruno API)
**Tester:** Beno Kavaš
**Okolje:** Lokalno razvojno okolje (`http://localhost:3001`)

---

## Pregled

Funkcionalni test pokriva celoten potek karierne izmenjave od vzpostavitve
povezave med uporabnikoma do izvedbe in čiščenja testnih podatkov.

---

## Testirani tok

```
1. Organizator pošlje prošnjo za povezavo udeležencu
2. Udeleženec sprejme prošnjo → obvestilo poslano organizatorju
3. Organizator ustvari sobo
4. Organizator generira časovne slote
5. Admin ustvari karierni intervju za udeleženca
6. Admin dodeli intervju organizatorju z sobo in slotom
7. Udeleženec sprejme povabilo → obvestilo poslano organizatorju
8. Čiščenje — preklic intervjuja, brisanje intervjuja, slota, sobe in povezave
```

---

## Rezultati

### Uspešni koraki

| Korak | Endpoint | Status | Opomba |
|---|---|---|---|
| 01 — Pošlji prošnjo za povezavo | `POST /connections/requests` | ✓ 201 | Pravilno ustvari prošnjo s statusom `pending` |
| 02 — Sprejmi prošnjo | `PATCH /connections/requests/:id/approve` | ✓ 200 | Pravilno posodobi status na `accepted` |
| 05 — Ustvari intervju | `POST /career-interviews` | ✓ 201 | Pravilno ustvari intervju s statusom `draft` |
| 07 — Sprejmi povabilo | `PATCH /invites/:id/respond` | ✓ 200 | Pravilno posodobi status povabila |
| cleanup-01 — Prekliči intervju | `PATCH /career-interviews/:id/status` | ✓ 200 | — |
| cleanup-02 — Izbriši intervju | `DELETE /career-interviews/:id` | ✓ 200 | — |
| cleanup-03 — Izbriši slot | `DELETE /scheduling/time-slots/:id` | ✓ 200 | — |
| cleanup-04 — Izbriši sobo | `DELETE /scheduling/rooms/:id` | ✓ 200 | — |
| cleanup-05 — Odstrani povezavo | `DELETE /connections/:id` | ✓ 200 | — |

---

### Neuspešni koraki

| Korak | Endpoint | Status | Vzrok |
|---|---|---|---|
| 03 — Ustvari sobo | `POST /scheduling/rooms` | ✗ 500 | Polje `location` je `undefined` — Firestore zavrne nedefinirene vrednosti |
| 04 — Generiraj slote | `POST /scheduling/time-slots/generate` | ✗ 500 | Glej BUG-001 — napaka pri obstoječih Firestore `Timestamp` vrednostih |
| 06 — Dodeli intervju | `PATCH /career-interviews/:id/assign` | ✗ 500 | Kaskadna napaka — `slotId` ni bil shranjen ker je korak 04 propadel |

---

## Odkrite napake

### BUG-001 — Timestamp napaka pri generiranju slotov
Glej `docs/bug-reports/BUG-001-scheduling-timestamp.md`

**Povzetek:** `.toISOString()` klican direktno na Firestore `Timestamp` objektu
namesto na JavaScript `Date` objektu. Napaka se pojavi samo ob obstoječih
zapisih v kolekciji.

**Začasna rešitev za testiranje:** Brisanje kolekcije `timeSlots` v Firestore
konzoli pred zagonom testov.

---

### Opomba — `location` polje pri ustvarjanju sobe

Pri klicu `POST /scheduling/rooms` brez polja `location` vrže Firestore napako
ker repository pošlje `undefined` vrednost. Začasna rešitev je dodati
`location` v testni payload. Trajna rešitev je filtriranje `undefined` vrednosti
v `SchedulingRepository.createRoom()` pred zapisom v Firestore.

---

## Zaključek

Funkcionalni test je uspešno pokril celoten potek karierne izmenjave in odkril
dve regresiski napaki v produkcijskem backend:

1. Rokovanje z `undefined` vrednostmi pri zapisu v Firestore
2. Napačna pretvorba Firestore `Timestamp` → `Date`

Obe napaki sta bili odkrite izključno s funkcionalnim testiranjem — enotni testi
ju ne bi ujeli ker ne testirajo pravega Firestore sloja. To potrjuje vrednost
funkcionalnega testiranja kot dopolnitve k obstoječim enotinim testom.

Po popravku napak (BUG-001 in `location` filter) naj se test ponovi za potrditev
da celoten tok deluje brez ročnega čiščenja podatkov med zagoni.