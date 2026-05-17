# Testiranje

## Zaganjanje testov

### Zaženi vse teste enkrat
```bash
npm test
```

### Način spremljanja med razvojem
```bash
npm test -- --watch
```

### Generiraj poročilo o pokritosti
```bash
npm test -- --coverage
```

HTML poročilo o pokritosti se ustvari v mapi `coverage/lcov-report/index.html`.

---

## Lokacije testov

| Datoteka | Kaj testira |
|---|---|
| `src/auth/__tests__/auth.service.spec.ts` | Logika registracije v AuthService |
| `src/profile/__tests__/profile.service.spec.ts` | Profilna logika |
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

## Cilji pokritosti

| Datoteka | Cilj |
|---|---|
| `auth.service.ts` | 100% |
| `role-requests.service.ts` | > 80% |
| `profile.service.ts` | > 80% |
| `users.service.ts` | > 80% |

---
