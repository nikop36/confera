# Funkcionalne zahteve

## 1. Upravljanje uporabnikov

### 1.1 Registracija in prijava (NUJNO)
- Uporabnik se lahko registrira in prijavi prek spletnega vmesnika.
- Sistem uporablja Firebase Auth za preverjanje identitete.
- Uporabnik ima eno izmed vlog: *udeleženec*, *organizator*, *zaposlovalec*.

### 1.2 Uporabniški profil (NUJNO)
- Uporabnik lahko ureja svoj profil: ime, opis, vloga, interesi, kompetence, cilji.
- Uporabnik določi svojo razpoložljivost za srečanja.
- Sistem omogoča nalaganje profilne slike (opcijsko).

---

## 2. Uvoz in upravljanje podatkov

### 2.1 Uvoz udeležencev (NUJNO)
- Organizator lahko uvozi udeležence prek standardizirane CSV/Excel predloge.
- Sistem preveri skladnost predloge in zavrne napačno oblikovane datoteke.
- Po uvozu sistem generira povzetek uspešnosti uvoza.

### 2.2 Upravljanje interesnih področij (NUJNO)
- Organizator lahko definira seznam interesnih področij in kompetenc.
- Uporabniki lahko izberejo več interesov in kompetenc.

---

## 3. AI matching

### 3.1 Generiranje vektorskih reprezentacij (NUJNO)
- Sistem pretvori profile udeležencev v embeddings (Supabase pgvector).

### 3.2 Izračun podobnosti (NUJNO)
- Sistem izračuna podobnost med udeleženci s kosinusno metriko.
- Rezultat se kombinira z dodatnimi kriteriji: vloga, razpoložljivost, cilji.

### 3.3 Prikaz razlage ujemanja (NUJNO)
- Uporabnik vidi razlago ujemanja (skupni interesi, kompatibilni cilji).

### 3.4 Napredni matching (ZAŽELENO)
- Uteževanje kriterijev (interesi, cilji, vloga, razpoložljivost).
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

## 6. Karierni razgovori

### 6.1 Upravljanje terminov (NUJNO)
- Podjetja razpišejo termine za razgovore.
- Kandidati se lahko prijavijo na razpoložljive termine.

### 6.2 Potrditev ali zavrnitev srečanja (NUJNO)
- Zaposlovalec potrdi ali zavrne prijavo kandidata.

---

## 7. Obvestila

### 7.1 E‑mail obvestila (ZAŽELENO)
- Obvestilo ob potrditvi srečanja.
- Obvestilo ob spremembi ali odpovedi termina.

---

## 8. Statistika in KPI

### 8.1 Osnovna statistika (NUJNO)
- Povprečno število priporočil na uporabnika.
- Stopnja sprejetih srečanj (%).
- Stopnja izvedenih srečanj (%).
- Zasedenost terminov (%).
- Povprečen čas do prvega srečanja.

### 8.2 Napredna statistika (ZAŽELENO)
- Analiza mreženja.
- Vizualizacija grafa povezav.

---

## 9. Dodatne funkcionalnosti

### 9.1 Napredni filtri (ZAŽELENO)
- Filtri po interesih, vlogi, kompetencah, razpoložljivosti.

### 9.2 Gamifikacija (DODATNO)
- Značke, točke, napredovanje.

### 9.3 Mobilna optimizacija (DODATNO)
- Prilagoditev za mobilne naprave (ne native aplikacija).
