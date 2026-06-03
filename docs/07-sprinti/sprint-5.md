## Sprint 5

**Beno:**
## TODO:

---

**Niko:**
Peti sprint je bil najširši po obsegu sprememb — vizualizacija omrežja, mobilni vmesnik in dva nova kompleksna tokova. Uspešno sem:

- Napisal backend endpoint za ego-mrežo (lastne povezave, prijatelji prijateljev, skupna srečanja).
- Zgradil interaktivni graf omrežja z ReactFlow in d3-force layoutom: barvana vozlišča po vlogi, robovi ločeni po tipu (navezava, AI ujemanje, skupno srečanje).
- Dodal popup ob kliku na vozlišče s podatki in možnostjo pošiljanja zahteve za povezavo ter filter po oznakih v obliki pill gumbov.
- Preuredil `AppShell` za mobilne naprave — fiksna glava z zvoncem za obvestila, spodnja navigacijska vrstica s štirimi ikonami in drsni meni „Več".
- Popravil vse strani in modale za delovanje na manjših zaslonih.
- Predelal `TagPicker` z iskanjem in zlaganjem vrstic po 16 oznakah za enotno izkušnjo filtriranja po vsej aplikaciji.
- Implementiral tok povabila predavatelja: interaktivni dropdown, obvestilo in e-mail, potrjevanje/zavračanje ter samodejno odpovedovanje seje ob zavrnitvi.
- Zgradil tok odobritve kariernih terminov: predlog industrijskega člana → odobritev organizatorja/admina → obvestilo o odločitvi.
- Denormaliziral podatke ob odobritvi prijave v `careerBookings` kolekcijo za zanesljivo poizvedovanje brez Firestore kompozitnih indeksov.
- Posodobil vso relevantno dokumentacijo (funkcionalne zahteve, podatkovni model, API specifikacija, UI-načrt) in zagotovil uspešnost vseh testov.

---

**Aleš:**
V petem sprintu sem dokončal več funkcionalnosti za nastavitve, večjezičnost, optimizacijo nalaganja, produkcijsko postavitev in napredni administratorski del. V tem sklopu sem:

- Implementiral nastavitve računa, vključno z izbiro jezika, časovnega pasu, spremembo gesla in brisanjem računa.
- Razširil podporo za večjezičnost skozi aplikacijo in jo uskladil tudi z administratorskim panelom.
- Optimiziral nalaganje skupnih podatkov, kot so uporabnik, obvestila, priporočila in elementi navigacije.
- Zmanjšal število nepotrebnih API klicev in izboljšal odzivnost aplikacije.
- Dokončal avtomatizirano preverjanje kakovosti AI ujemanja z metrikami, testnim naborom in poročilom.
- Uredil produkcijsko konfiguracijo backend aplikacije za Render in posodobil primere okoljskih spremenljivk.
- Reorganiziral administratorsko statistiko v bolj logične sklope z jasnejšimi karticami, grafi in opisi metrik.
- Dodal napredne statistike za uporabo sistema, aktivne in neaktivne uporabnike, dogodke, obvestila, sobe in poročila.
- Implementiral administratorski pregled uporabnikov s filtriranjem po vlogah, prikazom zadnje aktivnosti in možnostjo brisanja uporabnika.
- Dodal funkcionalnost prijave profilov (report), kjer lahko uporabnik prijavi drug profil, administrator pa vidi število prijav in razloge.
- Popravljal lint, test in build napake ter reševal konflikte po posodobitvah glavne veje.

---
