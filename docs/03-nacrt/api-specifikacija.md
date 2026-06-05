# API specifikacija

Confera backend izpostavlja REST API dokumentiran prek Swagger UI, ki se samodejno generira iz NestJS dekoratorjev.

---

## Swagger UI

| Okolje | URL |
|---|---|
| Local | [http://localhost:3000/api](http://localhost:3000/api) |
| Production | `<RENDER_URL>/api` |

---

## Avtentikacija

Večina endpointov zahteva Firebase Bearer token. Izjeme so javni endpointi (npr. potrditev gostovskega povabila).

**Pridobitev tokena:**
```bash
cd backend
npx ts-node scripts/get-token.ts
```

**Uporaba v Swaggeru:** gumb *Authorize* (zgoraj desno) → vnesi token v obliki `Bearer <token>`.

**Uporaba v zahtevah:**
```
Authorization: Bearer <token>
```

---

## Skupine endpointov

| Skupina | Opis |
|---|---|
| `auth` | Prijava, odjava, preverjanje identitete |
| `users` | Upravljanje uporabniških računov |
| `profile` | Urejanje profila in izbranih oznak (`tags`) |
| `role-requests` | Zahteve za spremembo vloge, pregled in odločitev |
| `matching` | AI priporočila ujemanja udeležencev |
| `scheduling` | Termini in prostori za srečanja |
| `connections` | Zahteve za mreženje med udeleženci |
| `invites` | Povabila na karierne razgovore |
| `career-interviews` | Upravljanje kariernih razgovorov |
| `events` | Konferenčni dogodki, seje in registracije |
| `sessions` | Seje znotraj dogodkov — ustvarjanje, urejanje, povabilo predavatelja, potrditev/zavrnitev |
| `career-slots` | Karierni termini — predlog, odobritev organizatorja, prijave udeležencev |
| `guests` | Gostovska povabila in potrditve |
| `tags` | Upravljanje profilnih oznak |
| `notifications` | Sistemska obvestila |
| `export` | Izvoz podatkov (udeleženci, statistika) |
| `statistics` | KPI metrike in analitika |

---

## Ključni endpointi — nove funkcionalnosti

### Seje — predavatelji

| Metoda | Pot | Vloga | Opis |
|--------|-----|-------|------|
| `POST` | `/events/:id/sessions` | organizer, admin | Ustvari sejo; opcijsko `presenterUid` + `presenterName` za povabilo |
| `PATCH` | `/events/:id/sessions/:sid/presenter-response` | kdor je povabljen | Potrdi (`confirmed`) ali zavrni (`declined`) vabilo |

Ko predavatelj zavrne, se `presenterStatus` nastavi na `declined` in `status` seje na `cancelled`.

---

### Karierni termini

| Metoda | Pot | Vloga | Opis |
|--------|-----|-------|------|
| `POST` | `/events/:id/career-slots` | industry, organizer, admin | Predlaga karierni termin; industrijalec dobi `pending_approval`, organizer/admin dobi `approved` |
| `PATCH` | `/events/:id/career-slots/:sid/approve` | organizer, admin | Odobri termin; industrijalec prejme obvestilo |
| `PATCH` | `/events/:id/career-slots/:sid/reject` | organizer, admin | Zavrne termin; industrijalec prejme obvestilo |
| `POST` | `/events/:id/career-slots/:sid/request` | participant, admin | Udeleženec se prijavi na pod-termin |
| `PATCH` | `/events/:id/career-slots/:sid/requests/:rid` | industry, organizer, admin | Potrdi ali zavrne prijavo udeleženca |

---

## Konvencije

- Vsi endpointi vračajo napake v obliki NestJS `HttpException` (polje `statusCode`, `message`)
- Vhodni podatki so validirani prek DTO razredov — neznana polja so zavrnjena (`forbidNonWhitelisted`)
- Bearer token mora ustrezati vlogi ki jo endpoint zahteva — napačna vloga vrne `403 Forbidden`
