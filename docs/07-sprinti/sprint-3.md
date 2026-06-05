## Sprint 3 

**Beno:**
V tretjem sprintu sem se posvetil razvoju sistema notifikacij, email integracijam ter naprednim funkcionalnostim za uporabnike. Opravil sem:

- Posodobitev in izboljšavo UML diagramov.
- Implementacijo endpointov za notifikacije ter logiko za pošiljanje sistemskih obvestil.
- Posodobitev API dokumentacije in testnih scenarijev, vključno s testiranjem notifikacij.
- Razvoj funkcionalnosti za izvoz in uvoz uporabniških profilov (CSV in Excel).
- Pripravo integracijskega testa za CSV uvoz profilov.
- Integracijo email storitve Resend ter konfiguracijo sistema.
- Pripravo email templata za različne tipe notifikacij (email/system-only).
- Namestitev in konfiguracijo Bruno ter Playwright za funkcijsko testiranje.

---

**Niko:**
Tretji sprint je bil najobsežnejši — zgradil sem tri večje funkcionalnosti. Uspešno sem:

- Implementiral stran Skupnost s pregledom vseh udeležencev, iskanjem po imenu in instituciji, filtriranjem po vlogi in AI ujemanjem.
- Zgradil razprostranljive kartice udeležencev s kolegi, oznakami in gumbom za povezovanje.
- Napisal celoten NestJS backend modul za dogodke: CRUD, atomska registracija za seje in pridobivanje `EventWithMeta` z `isRegistered` poljem za klicatelja.
- Zgradil frontend stran z razporedom dogodkov po časovni osi, `EventCard` in `EventFormModal` za admine in organizatorje.
- Implementiral backend modul za seje s konferenčnim programom in atomsko registracijo (Firestore transakcija), ki prepreči dvojno prijavo in prepoljnitev.
- Zgradil frontend mrežo po prostorih in časovnih blokih z `SessionCard` in `SessionFormModal` z avtodopolnjevanjem predavateljev.
- Dodal sistem oznak — skupno zalogo oznak za dogodke, seje in profile.
- Implementiral prikaz prijateljev na dogodkih (katere sprejete povezave se udeležujejo istega dogodka).
- Popravil vse lint napake in uredil CI pred mergom v main.

---

**Aleš:**
V tretjem sprintu sem razvijal funkcionalnosti za srečanja, prijateljske povezave, karierne razgovore, povabila in osnovno statistiko. Opravil sem:

- Implementacijo modula za razporejanje srečanj s sobami, časovnimi termini in preverjanjem konfliktov.
- Razvoj administratorskega vmesnika za ustvarjanje sob, generiranje terminov in dodeljevanje udeležencev v srečanja.
- Izboljšavo izbire udeležencev z iskanjem po imenih in podporo za več oseb na obeh straneh srečanja.
- Implementacijo pregleda ustvarjenih srečanj z osnovnimi podatki o sobi, terminu, udeležencih in statusu.
- Razvoj sistema prijateljskih povezav z zahtevami, sprejemanjem, zavračanjem in prikazom sprejetih povezav.
- Implementacijo kariernih razgovorov z izbiro intervjuvalca, kandidata, sobe in termina.
- Integracijo povabil in obvestil za prijateljske zahteve, karierne razgovore in spremembe statusov.
- Pripravo prvih administratorskih statistik za srečanja, intervjuje in zasedenost sob.
- Popravke lint in test napak, da so se spremembe lahko varno združile v glavno vejo.

---
