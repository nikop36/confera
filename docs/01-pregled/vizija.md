# Vizija projekta

## Namen

**Confera** je spletna platforma za ciljno usmerjeno mreženje udeležencev konference. Sistem povezuje posameznike iz akademske sfere, industrije in javne uprave ter jim omogoča smiselna srečanja na podlagi skupnih interesnih področij, kompatibilnih ciljev in razpoložljivosti.

Platforma hkrati podpira organizacijo spremljevalnih dogodkov konference — raziskovalnega sejma in kariernih razgovorov — ter organizatorjem zagotavlja pregled nad potekom in statistiko.

---

## Problem

Tradicionalno mreženje na konferencah je naključno in neučinkovito. Udeleženci pogosto ne vedo, kdo od prisotnih je za njih najbolj relevantan, organizatorji nimajo orodij za sistematično spodbujanje povezav, karierni razgovori in sejem pa so organizacijsko zahtevni brez ustrezne digitalne podpore.

---

## Rešitev

Sistem avtomatizira ujemanje udeležencev z AI modulom, ki profile pretvori v vektorske reprezentacije (embedding) in izračuna podobnost med udeleženci s kosinusno metriko. Ujemanje kombinira več kriterijev: skupne interese, kompatibilne vloge, razpoložljivost in cilje udeleženca. Razporejanje srečanj poteka optimizacijsko — sistem minimizira konflikte in maksimizira število izvedenih srečanj znotraj fiksnega nabora prostorov in terminov.

---

## Ključni uporabniki

### Udeleženec konference (raziskovalec / študent)
- Ustvari profil z interesnimi področji, kompetencami in razpoložljivostjo
- Prejme priporočila za srečanja z relevantnimi udeleženci
- Pregleduje razstavitelje sejma in se prijavi na karierne razgovore
- Vidi razlago ujemanja (skupni interesi, kompatibilni cilji)

### Organizator konference
- Uvozi seznam udeležencev iz CSV/Excel predloge
- Upravlja urnik, prostore in konfiguracijo matching parametrov
- Pregleduje statistiko in KPI metrike konference

### Predstavnik industrije / zaposlovalec
- Razstavlja na raziskovalnem sejmu
- Razpisuje termine kariernih razgovorov
- Pregleduje profile kandidatov in potrjuje ali zavrne srečanja

---

## Konkurenčna prednost

| Lastnost | ConferenceConnect | Komercialne rešitve (Brella, Swapcard, Whova…) |
|---|---|---|
| Akademski kontekst (interesi, projekti) | ✅ | ❌ |
| Podpora raziskovalnemu sejmu | ✅ | ❌ |
| Uvoz iz univerzitetnih sistemov (CSV) | ✅ | Omejeno |
| Avtomatizirano razporejanje srečanj | ✅ | Delno |
| Prilagodljivost organizatorju | ✅ | ❌ |
| Nižji stroški | ✅ | ❌ |

---

## Kar sistem ne vključuje

- Native mobilna aplikacija
- Integracija z zunanjimi HR sistemi
- Plačilni sistemi
- Video klici ali virtualna srečanja

---

## Merila uspešnosti (KPI)

| Metrika | Opis |
|---|---|
| Povprečno število priporočil na uporabnika | Kakovost AI matching izhoda |
| Stopnja sprejetih srečanj (%) | Relevantnost priporočil |
| Stopnja izvedenih srečanj (%) | Operativna učinkovitost |
| Zasedenost terminov (%) | Izkoriščenost kapacitet |
| Povprečen čas do prvega srečanja | Hitrost onboardinga udeleženca |