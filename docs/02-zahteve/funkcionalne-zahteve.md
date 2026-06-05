# Funkcionalne zahteve

## 1. Upravljanje uporabnikov

### 1.1 Registracija in prijava (NUJNO)
- Uporabnik se lahko registrira in prijavi prek spletnega vmesnika.
- Sistem uporablja Firebase Auth za preverjanje identitete.
- Uporabnik ima eno izmed vlog: *udeleženec*, *organizator*, *zaposlovalec*.

### 1.2 Uporabniški profil (NUJNO)
- Uporabnik lahko ureja svoj profil: ime, opis, vloga in oznake (`tags`).
- Polja `interests`, `goals` in `competencies` niso več del trenutnega uporabniškega profila.
- Uporabnik določi svojo razpoložljivost za srečanja.
- Sistem omogoča nalaganje profilne slike (opcijsko).

---

## 2. Uvoz in upravljanje podatkov

### 2.1 Uvoz udeležencev (NUJNO)
- Organizator lahko uvozi udeležence prek standardizirane CSV/Excel predloge.
- Sistem preveri skladnost predloge in zavrne napačno oblikovane datoteke.

### 2.2 Upravljanje oznak (NUJNO)
- Organizator lahko definira seznam profilnih oznak.
- Uporabniki lahko izberejo več oznak.

---

## 3. AI matching

### 3.1 Generiranje vektorskih reprezentacij (NUJNO)
- Sistem pretvori profile udeležencev v embeddings (Supabase pgvector).

### 3.2 Izračun podobnosti (NUJNO)
- Sistem izračuna podobnost med udeleženci s kosinusno metriko.
- Rezultat temelji na hibridnem iskanju nad izbranimi oznakami.

### 3.3 Prikaz razlage ujemanja (NUJNO)
- Uporabnik vidi razlago ujemanja na osnovi skupnih oznak.

### 3.4 Napredni matching (ZAŽELENO)
- Uteževanje oznak in semantične podobnosti.
- Semantično bogatejši embedding model.

---

## 4. Razporejanje srečanj

### 4.1 Optimizacijsko dodeljevanje terminov (NUJNO)
- Sistem dodeli termin in prostor glede na razpoložljivost udeležencev.
- Sistem minimizira konflikte in maksimizira število izvedenih srečanj.

### 4.2 Upravljanje terminov in prostorov (NUJNO)
- Organizator definira prostore in časovne termine.
- Sistem ne omogoča dinamičnega dodajanja terminov med konferenco.

---

## 5. Raziskovalni sejem

### 5.1 Upravljanje razstavišč (NUJNO)
- Organizator registrira razstavišča in dodeli prostore.
- Udeleženci lahko pregledujejo razstavitelje.

### 5.2 Prikaz programa sejma (NUJNO)
- Sistem generira pregled programa sejma.

---

## 6. Seje in predavatelji

### 6.1 Upravljanje sej (NUJNO)
- Organizator ustvari sejo znotraj dogodka (naslov, opis, lokacija, čas, kapaciteta, oznake).
- Organizator lahko pri ustvarjanju seje povabi predavatelja po imenu.
- Sistem prikaže dropdown z ujemajočimi uporabniki vlog `organizer`, `industry` in `admin` (ne `participant`).
- Če je vnešeno ime, ki ne ustreza nobenemu uporabniku v sistemu, se seja samodejno potrdi z gostujočim predavateljem.

### 6.2 Potrjevanje predavatelja (NUJNO)
- Povabljeni predavatelj (v sistemu) prejme sistemsko obvestilo in e-mail.
- Predavatelj potrdi ali zavrne vabilo neposredno v aplikaciji.
- Ob potrditvi organizator prejme obvestilo; seja ostane aktivna.
- Ob zavrnitvi organizator prejme obvestilo; **seja se samodejno označi kot odpovedana**.

---

## 7. Karierni razgovori

### 7.1 Predlog termina (NUJNO)
- Predstavnik industrije predlaga termin za karierne razgovore znotraj dogodka.
- Predlog je v stanju `pending_approval` in ni viden udeležencem.
- Organizator ali admin prejme sistemsko obvestilo in e-mail o novem predlogu.

### 7.2 Odobritev ali zavrnitev predloga (NUJNO)
- Organizator ali admin odobri ali zavrne predlog termina.
- Industrijalec prejme obvestilo in e-mail o odločitvi.
- Samo odobreni termini (`approved`) so vidni udeležencem.
- Organizatorji, admini in ustvarjalec termina vidijo vse termine (vključno s čakajočimi in zavrnjenimi).
- Organizator/admin, ki ustvari termin neposredno, ga dobi avtomatično odobrenega.

### 7.3 Prijava na termin (NUJNO)
- Udeleženec (vloga `participant`) se prijavi na razpoložljiv pod-termin znotraj odobrenega termina.
- Ob prijavi industrijalec prejme sistemsko obvestilo in e-mail.
- Industrijalec potrdi ali zavrne posamezno prijavo neposredno v kartici termina.
- Ob odločitvi udeleženec prejme obvestilo in e-mail.

---

## 8. Obvestila

### 8.1 E‑mail obvestila (NUJNO)
- Obvestilo ob potrditvi ali zavrnitvi predavatelja.
- Obvestilo ob predlogu kariernega termina (organizatorju).
- Obvestilo ob odobritvi ali zavrnitvi kariernega termina (industrijalcu).
- Obvestilo ob prijavi na pod-termin (industrijalcu).
- Obvestilo ob potrditvi ali zavrnitvi prijave (udeležencu).

---

## 9. Statistika in KPI

### 9.1 Osnovna statistika (NUJNO)
- Povprečno število priporočil na uporabnika.
- Stopnja sprejetih srečanj (%).
- Stopnja izvedenih srečanj (%).
- Zasedenost terminov (%).
- Povprečen čas do prvega srečanja.

### 9.2 Napredna statistika (ZAŽELENO)
- Analiza mreženja.
- Vizualizacija grafa povezav.

---

## 10. Dodatne funkcionalnosti

### 10.1 Napredni filtri (ZAŽELENO)
- Filtri po oznakah, vlogi in razpoložljivosti.

### 10.2 Gamifikacija (DODATNO)
- Značke, točke, napredovanje.

### 10.3 Mobilna optimizacija (DODATNO)
- Prilagoditev za mobilne naprave (ne native aplikacija).
