## Sprint 2

**Beno**
Drugi sprint je bil osredotočen na uporabniške profile, vloge in izboljšanje avtentikacijskih mehanizmov. V tem sklopu sem:

- Pripravil in dokumentiral UML diagrame za nadaljnji razvoj.
- Implementiral endpoint-e za upravljanje uporabniških profilov.
- Implementacijo dodeljevanja vlog ob registraciji ter logiko za oddajo prošenj za vloge.
- Izvedel testiranje registracije in prijave.
- Pripravil skripto za pridobivanje Bearer žetonov za potrebe testiranja.
- Implementiral `admin guard` ter dokončal logiko za role request kolekcijo.
- Dokumentiral modele ter razširil API dokumentacijo in testne primere.

---

**Niko**
Drugi sprint je bil osredotočen na vzpostavitev razvojnega okolja in gradnjo admin dela aplikacije. Uspešno sem:

- Dockeriziral oba servisa (frontend in backend) ter uredil prenos Firebase okoljskih spremenljivk v kontejner.
- Narisal wireframe za strani registracije, profila in domače strani po prijavi.
- Implementiral prijavo prek Firebase REST API-ja, kar je odpravilo odvisnost od Firebase SDK-ja na backend strani.
- Zgradil **AdminShell** — ločen layout za admin del z avtentikacijskim guardom.
- Implementiral stran za upravljanje zahtevkov za spremembo vloge z odobritvijo/zavrnitvijo z enim klikom.
- Uredil preusmeritev `/admin → /admin/role-requests` in popravil napake pri nalaganju admin layouta.
- Uvedel tematske spremembe in posodobil vizualno podobo aplikacije.

---