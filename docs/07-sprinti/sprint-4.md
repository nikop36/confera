## Sprint 4

**Beno:**
V tem sprintu sem se osredotočil na funkcijsko testiranje, razširitev sistema notifikacij ter zaključevanje dokumentacije. Izvedel sem:

- Pripravo osnovnih funkcijskih testov za Playwright in Bruno ter njihovo izvajanje.
- Implementacijo izvoza in uvoza podatkov na nivoju dogodkov za organizatorje.
- Integracijo sistema notifikacij in email obvestil z dogodki.
- Razvoj dodatnih email templata za nove tipe dogodkov.
- Implementacijo logike za gostujoče uporabnike.
- Pripravo zaključne projektne dokumentacije.

---

**Niko:**
Četrti sprint je bil osredotočen na karierni del konference, javne profile in UX obrazcev. Uspešno sem:

- Implementiral karierne termine — sistem za razpisovanje intervjuških terminov industrijskim članom znotraj posameznega dogodka.
- Zgradil backend model s pod-termini (`subSlotIndex`), začetkom, koncem in lokacijo.
- Integriral karierne termine v programsko mrežo z namensko `CareerSlotCard` komponento ter dodal oznake in zahteve za vsak termin.
- Napisal unit teste in popravil test mock za nov `subSlotIndex` API.
- Zgradil javne profilne strani (`/profile/[uid]`) z bio, afiliacijo, oznakami in gumbom za povezovanje.
- Postavil admin upravljanje oznak — admini dodajajo in brišejo oznake, ki se pojavljajo po vsej aplikaciji.
- Obsežno predelal UX za datum/čas: ločena polja za datum in čas z živim predogledom trajanja, picker za čas brez ročnega tipkanja.
- Omejil izbiro časa za seje na okno starševskega dogodka in dodal vizualni urnik s klicanjem ure za karierne intervjuje.
- Popravil CI (Prettier, tsconfig ločljivost modulov) in zagotovil uspešnost vseh testov.

---

**Aleš:**
V četrtem sprintu sem nadgrajeval statistični panel, razširil AI priporočila na dogodke in začel sistematično preverjanje kakovosti ujemanja. Izvedel sem:

- Razširitev administratorske statistike v več ločenih podstrani za pregled, operativo, uporabo, ujemanje, vključenost in poročila.
- Dodajanje časovnih filtrov, grafov, opisov metrik in izvozov poročil v CSV/JSON obliki.
- Izboljšave prikaza statističnih grafov, da so bolj razumljivi in uporabni za administratorje.
- Implementacijo priporočanja dogodkov na podlagi uporabnikovega profila, interesov in oznak dogodkov.
- Pripravo kataloga oznak za dogodke z berljivimi imeni in tehničnimi identifikatorji.
- Prikaz priporočenih dogodkov na profilu uporabnika in povezavo do podrobnosti dogodka.
- Začetek avtomatiziranega preverjanja kakovosti AI priporočil s testnimi podatki in metrikami.
- Pripravo dokumentacije in poročil za razumevanje rezultatov AI priporočanja.
- Stabilizacijo aplikacije pred predstavitvijo z odpravljanjem težav pri nalaganju, testih in prikazu podatkov.

---
