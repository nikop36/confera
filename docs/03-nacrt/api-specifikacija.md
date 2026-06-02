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
| `profile` | Urejanje profila, interesi, kompetence |
| `role-requests` | Zahteve za spremembo vloge, pregled in odločitev |
| `matching` | AI priporočila ujemanja udeležencev |
| `scheduling` | Termini in prostori za srečanja |
| `connections` | Zahteve za mreženje med udeleženci |
| `invites` | Povabila na karierne razgovore |
| `career-interviews` | Upravljanje kariernih razgovorov |
| `events` | Konferenčni dogodki in seje |
| `guests` | Gostovska povabila in potrditve |
| `tags` | Upravljanje oznak interesnih področij |
| `notifications` | Sistemska obvestila |
| `export` | Izvoz podatkov (udeleženci, statistika) |
| `statistics` | KPI metrike in analitika |

---

## Konvencije

- Vsi endpointi vračajo napake v obliki NestJS `HttpException` (polje `statusCode`, `message`)
- Vhodni podatki so validirani prek DTO razredov — neznana polja so zavrnjena (`forbidNonWhitelisted`)
- Bearer token mora ustrezati vlogi ki jo endpoint zahteva — napačna vloga vrne `403 Forbidden`