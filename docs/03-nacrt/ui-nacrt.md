# UI-načrt — Confera

Dokument opisuje zaslonsko zasnovo vseh glavnih strani aplikacije. Vsaka stran vsebuje ASCII-skico postavitve, opis komponent in opombe o vedenju.

---

## Splošna postavitev (desktop)

Vse strani (razen prijave/registracije) so ovite v `AppShell`, ki definira tristolpčno postavitev:

```
┌──────────────────────────────────────────────────────────────────────┐
│  LEVA STRANSKA VRSTICA (220px)  │  OSREDNJI VSEBINSKI PROSTOR  │  DESNA STRANSKA VRSTICA (280px)  │
│                                 │  (flex-1, min-w-0)           │                                  │
│  [Avatar + ime + e-pošta]       │                              │  [Obvestila]                     │
│                                 │  <children>                  │  [Predlogi za mreženje]          │
│  Navigacija:                    │                              │                                  │
│  · Dogodki        /home         │                              │                                  │
│  · Profil         /profile      │                              │                                  │
│  · Povabila       /invites      │                              │                                  │
│  · Prijatelji     /connections  │                              │                                  │
│  · Skupnost       /community    │                              │                                  │
│  · Program        /events  *    │                              │                                  │
│  · Nastavitve     /settings     │                              │                                  │
│                                 │                              │                                  │
│  [Confera 2026 branding]        │                              │                                  │
│  [Admin panel]  (samo admin)    │                              │                                  │
│  [Odjava]                       │                              │                                  │
└──────────────────────────────────────────────────────────────────────┘

* Program je viden samo vlogam: admin, organizer, industry
```

**Mobilna postavitev** (`lg:hidden`):
- Zgoraj: fiksna glava z logotipom + zvonec za obvestila
- Spodaj: fiksna navigacijska vrstica s 4 ikonami (Dogodki, Prijatelji, Skupnost, Več)
- Meni „Več": odpre drsnik od spodaj z dostopom do Profil, Povabila, Nastavitve, Odjava

---

## 1. Prijava — `/login`

```
┌─────────────────────────────────┐
│          [Logo Confera]         │
│                                 │
│   ┌─────────────────────────┐   │
│   │  E-pošta                │   │
│   └─────────────────────────┘   │
│   ┌─────────────────────────┐   │
│   │  Geslo              👁  │   │
│   └─────────────────────────┘   │
│                                 │
│   [ Prijava ]                   │
│                                 │
│   Nimate računa? Registracija → │
└─────────────────────────────────┘
```

- Napake se prikažejo pod gumbom (rdeče ozadje)
- Gumb je onemogočen med nalaganjem

---

## 2. Registracija — `/register`

```
┌─────────────────────────────────┐
│          [Logo Confera]         │
│                                 │
│   ┌─────────────────────────┐   │
│   │  Ime in priimek         │   │
│   └─────────────────────────┘   │
│   ┌─────────────────────────┐   │
│   │  E-pošta                │   │
│   └─────────────────────────┘   │
│   ┌─────────────────────────┐   │
│   │  Geslo              👁  │   │
│   └─────────────────────────┘   │
│   ┌─────────────────────────┐   │
│   │  Potrdi geslo       👁  │   │
│   └─────────────────────────┘   │
│                                 │
│   [ Registracija ]              │
│                                 │
│   Že imate račun? Prijava →     │
└─────────────────────────────────┘
```

---

## 3. Domov / Dogodki — `/home`

Prikazano vsem vlogam. Udeleženec ob kliku mobilne ikone „Events" pristane tukaj.

```
┌────────────────────────────────────────────────┐
│  Dogodki                                        │
│  12 events                                      │
│                                                 │
│  [Iskanje oznak]                                │
│  ┌──────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ │
│  │  AI  │ │ Design │ │ Research │ │ +8 more  │ │
│  └──────┘ └────────┘ └──────────┘ └──────────┘ │
│  [ Počisti filter ]                             │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │  ★ Priporočeno     [gradient]            │   │
│  │  Pon, 15. sep · 10:00                    │   │
│  ├──────────────────────────────────────────┤   │
│  │  AI Summit 2026                          │   │
│  │  📍 Maribor                              │   │
│  │  Konferenca o umetni inteligenci...      │   │
│  │  [AI] [ML] [Research]                    │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │  [gradient]        18/100                │   │
│  │  Tor, 16. sep · 14:00                    │   │
│  ├──────────────────────────────────────────┤   │
│  │  Karierni sejem                          │   │
│  │  📍 Ljubljana                            │   │
│  │  [Design] [Career]                       │   │
│  └──────────────────────────────────────────┘   │
└────────────────────────────────────────────────┘
```

**Vedenje:**
- Priporočeni dogodki (AI ujemanje) se prikažejo prvi, z modrim robom in zvezdico
- TagPicker: iskanje, barvne oznake, collapse po 16 oznakah
- Klik na kartico → `/events/[id]`

---

## 4. Profil — `/profile`

```
┌────────────────────────────────────────────────┐
│  ┌──────────────────────── cover image ──────┐  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│  [Avatar]  3 Srečanja   5 Prijatelji  [Uredi]   │
│                                                 │
│  Janez Novak ✓                                  │
│  janez@primer.com                               │
│  Kratka bio...                                  │
│                                                 │
│  ┌─ Zahtevek za spremembo vloge ──────────────┐ │
│  │  (vidno samo udeležencem)                  │ │
│  │  Vloga: [Organizator] [Industrija]         │ │
│  │  Razlog: ___________________________       │ │
│  │  [ Oddaj zahtevek ]                        │ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  ┌─────────────┬──────────────┬──────────────┐  │
│  │  Dogodki    │   Povabila   │  Prijatelji  │  │
│  └─────────────┴──────────────┴──────────────┘  │
│                                                 │
│  TAB 0 — Dogodki:                               │
│  ┌──────────────┐ ┌──────────────┐             │
│  │ [gradient]   │ │ [gradient]   │             │
│  │ Priporočeno  │ │              │             │
│  │ Naslov seje  │ │ Naslov seje  │             │
│  │ 📍 Lokacija  │ │ 📍 Lokacija  │             │
│  └──────────────┘ └──────────────┘             │
│                                                 │
│  TAB 1 — Povabila:                              │
│  ┌────────────────────────────────────────────┐ │
│  │  3 Srečanja          [ Odpri → ]           │ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  TAB 2 — Prijatelji:                            │
│  ┌────────────────────────────────────────────┐ │
│  │  [JN]  Janez Novak     FRI            >    │ │
│  └────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────┐ │
│  │  [MP]  Maja Petek      StartupSI      >    │ │
│  └────────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

**Urejevalni modal** (razpet čez vsebino):
```
┌──────────────────────────────────────────┐
│  Uredi profil                            │
│  ┌────────────────┐ ┌─────────────────┐  │
│  │  [Avatar]      │ │  [Cover]        │  │
│  │  Izberi · Uredi│ │  Izberi · Uredi │  │
│  └────────────────┘ └─────────────────┘  │
│  Organizacija: ________________________  │
│  Kratka bio:   ________________________  │
│  Oznake:       [TagPicker]               │
│  Vrsta srečanja: [Oba ▼]                 │
│             [ Prekliči ]  [ Shrani ]     │
└──────────────────────────────────────────┘
```

---

## 5. Povezave — `/connections`

```
┌────────────────────────────────────────────────────────┐
│  Povezave                                               │
│  Upravljajte svoje mreženje na konferenci               │
│                                                         │
│  [Zahteve (2)]  [Povezave]  [Graf]    [Filtri ▼]  *     │
│                              (* samo na zavihku Graf)   │
│                                                         │
│  ── ZAHTEVE ──────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────┐   │
│  │ [MP]  Maja Petek              [Potrdi] [Zavrni]  │   │
│  │       maja@primer.com                            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ── POVEZAVE ─────────────────────────────────────────  │
│  ┌──────────────────┐ ┌──────────────────┐             │
│  │ Janez Novak      │ │ Maja Petek       │             │
│  │ janez@primer.com │ │ maja@primer.com  │             │
│  │         [Odstrani]│ │        [Odstrani]│             │
│  └──────────────────┘ └──────────────────┘             │
│                                                         │
│  ── GRAF ─────────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────┐   │
│  │                                                  │   │
│  │     [ReactFlow canvas]                           │   │
│  │     · Moj vozlišče v sredini (modro)             │   │
│  │     · Povezave (sive črte)                       │   │
│  │     · Ujemanja (modre črtk.)                     │   │
│  │     · Skupna srečanja (zelene črtk.)             │   │
│  │                                                  │   │
│  │  [Controls]              [Legenda]               │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

**Popup ob kliku na vozlišče v grafu:**
```
┌────────────────────────────────┐
│  Maja Petek              [×]   │
│  Udeleženec                    │
│  FRI                           │
│  [AI] [Research]               │
│  [Poveži se]    Profil →       │
└────────────────────────────────┘
```

---

## 6. Skupnost — `/community`

```
┌────────────────────────────────────────────────┐
│  Skupnost · 84 udeležencev                      │
│                                                 │
│  ┌──────────────────────────────────────┐       │
│  │ 🔍  Iskanje po imenu ali instituciji │       │
│  └──────────────────────────────────────┘       │
│  [Vsi]  [Ujemanje]  [Udeleženci]  [Industrija]  [Organizatorji] │
│                                                 │
│  Prikazano 12 od 84                             │
│                                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ [Avatar]   │ │ [Avatar]   │ │ [Avatar]   │  │
│  │ Janez N.   │ │ Maja P.    │ │ Ana K.     │  │
│  │ FRI        │ │ StartupSI  │ │ GZS        │  │
│  │ [Ujemanje] │ │            │ │            │  │
│  │ Kratka bio │ │ Kratka bio │ │ Kratka bio │  │
│  │ [AI][ML]   │ │ [Design]   │ │ [Public]   │  │
│  └────────────┘ └────────────┘ └────────────┘  │
│                                                 │
│  Razprta kartica:                               │
│  ┌──────────────────────────────────────────┐   │
│  │ [Avatar]  Janez Novak  [Ujemanje]        │   │
│  │ FRI                                      │   │
│  │ Bio besedilo...                          │   │
│  │ [AI] [ML]                                │   │
│  │ ─────────────────────────────────────── │   │
│  │ Interesi    │  Cilji                     │   │
│  │ [AI][ML]    │  [Mreženje][Investitorji]  │   │
│  │                                          │   │
│  │ 📅 Online   👤 Profil →  [Poveži se]     │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│           [ Naloži še ]                         │
└────────────────────────────────────────────────┘
```

---

## 7. Program — `/events`

*Vidno samo: admin, organizer, industry*

```
┌────────────────────────────────────────────────┐
│  Program                     [ + Dodaj ]  *    │
│  Vsi konferenčni dogodki     (* samo admin/org) │
│                                                 │
│  [Iskanje oznak]                                │
│  [AI] [Design] [Research]  [ Počisti ]          │
│                                                 │
│  10:00 ─────────────────────────────────────   │
│  ┌──────────────────────────────────────────┐   │
│  │  ★  AI Summit 2026                       │   │
│  │     📍 Maribor · 15.–16. sep 2026        │   │
│  │     150 / 500  [AI] [ML]                 │   │
│  │     [Prijavi se]  ✎  🗑                   │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  14:00 ─────────────────────────────────────   │
│  ┌──────────────────────────────────────────┐   │
│  │  Karierni sejem 2026                     │   │
│  │  📍 Ljubljana · 16. sep 2026             │   │
│  │  18 / 100  [Career] [Design]             │   │
│  │  [Prijavi se]                            │   │
│  └──────────────────────────────────────────┘   │
└────────────────────────────────────────────────┘
```

---

## 8. Podrobnosti dogodka — `/events/[id]`

```
┌────────────────────────────────────────────────┐
│  ← Program                                      │
│                                                 │
│  ┌────────────────────────────────────────────┐ │
│  │  AI Summit 2026                            │ │
│  │  Konferenca o umetni inteligenci           │ │
│  │  📅 15. sep 2026 · 08:00 – 18:00           │ │
│  │  📍 Maribor  👥 327 / 500                  │ │
│  │                          [ Prijavi se ]    │ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  PROGRAM ───────────────────────────────────── │
│                                                 │
│  Ponedeljek, 15. september 2026                 │
│  ┌────────┬─────────────────┬────────────────┐  │
│  │        │  Dvorana A      │  Dvorana B     │  │
│  ├────────┼─────────────────┼────────────────┤  │
│  │ 10:00  │ [SessionCard]   │ [SessionCard]  │  │
│  │        │ Naslov seje     │ Naslov seje    │  │
│  │        │ Predavatelj     │ ⏳ pending     │  │
│  ├────────┼─────────────────┼────────────────┤  │
│  │ 11:00  │ [SessionCard]   │ [CareerCard]   │  │
│  │        │                 │ 💼 Karierni    │  │
│  │        │                 │ Podjetje d.o.o │  │
│  │        │                 │ 2 / 4 mesta    │  │
│  └────────┴─────────────────┴────────────────┘  │
│                                                 │
│  [+ Dodaj sejo]   [+ Dodaj karierni termin]  *  │
│  (* samo admin/org/industry)                    │
└────────────────────────────────────────────────┘
```

**SessionCard (razprta):**
```
┌──────────────────────────────────┐
│ 💡 Veliki jezikovni modeli       │
│    Dr. Janez Novak               │
│    ✓ Predavatelj potrdil         │
│    10:00 – 11:00                 │
│    [AI] [LLM]                    │
│    24 / 50                       │
│    [Uredi] [Izbriši]             │
│    [Odjavi se]                   │
└──────────────────────────────────┘
```

**CareerSlotCard (razprta, za upravljalca):**
```
┌──────────────────────────────────┐
│ 💼 Karierni pogovori    Career   │
│    Podjetje d.o.o.               │
│    2 / 4 · [2 pending]           │
│    [Uredi] [Izbriši]             │
│    ─────────────────────────── │
│    10:00–10:30  ✓ Maja Petek     │
│    10:30–11:00  Janez N.  [✓][✕] │
│    11:00–11:30  Prosto           │
└──────────────────────────────────┘
```

---

## 9. Povabila — `/invites`

```
┌────────────────────────────────────────────────┐
│  Povabila na karierne razgovore                 │
│                                                 │
│  Moja povabila (2)                              │
│  ┌────────────────────────────────────────────┐ │
│  │  Podjetje XY         pon, 15. sep, 10:30   │ │
│  │  Soba B              [Sprejmi] [Zavrni]    │ │
│  └────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────┐ │
│  │  StartupSI           tor, 16. sep, 14:00   │ │
│  │  Soba A              ✓ Sprejeto            │ │
│  └────────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

---

## 10. Nastavitve — `/settings`

```
┌────────────────────────────────────────────────┐
│  Nastavitve                                     │
│                                                 │
│  ┌────────────────────────────────────────────┐ │
│  │  Jezik in časovni pas                      │ │
│  │  Jezik: [Slovenščina ▼]                    │ │
│  │  Časovni pas: [UTC+2 (Ljubljana) ▼]        │ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  ┌────────────────────────────────────────────┐ │
│  │  Sprememba gesla                           │ │
│  │  Trenutno geslo: ____________________      │ │
│  │  Novo geslo:     ____________________      │ │
│  │  Potrdi geslo:   ____________________      │ │
│  │                       [ Shrani geslo ]     │ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  ┌────────────────────── (rdeče ozadje) ──────┐ │
│  │  Nevarno območje                           │ │
│  │  Brisanje računa je trajno.                │ │
│  │                       [ Izbriši račun ]    │ │
│  └────────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

---

## 11. Javni profil — `/profile/[uid]`

```
┌────────────────────────────────────────────────┐
│  ← Nazaj                                        │
│                                                 │
│  ┌──────────────── cover ─────────────────────┐ │
│  └────────────────────────────────────────────┘ │
│  [Avatar]  Maja Petek ✓                         │
│            Udeleženec · StartupSI               │
│                                                 │
│  Bio besedilo...                                │
│                                                 │
│  Interesi:   [AI] [Design] [Research]           │
│  Cilji:      [Mreženje] [Investitorji]          │
│                                                 │
│             [ Poveži se ]   [ Zahteva poslana ] │
└────────────────────────────────────────────────┘
```

---

## Barvna paleta in tipografija

| Element              | Vrednost                         |
|----------------------|----------------------------------|
| Osnovna pisava       | `system-ui, sans-serif`          |
| Poudarjena modra     | `#0071e3`                        |
| Temna (besedilo)     | `#0d0d0d`                        |
| Siva (sekundarno)    | `#8e8e93`                        |
| Ozadje strani        | `#ffffff`                        |
| Rob kartic           | `#f0f0f0` / `#e5e7eb`            |
| Zelen badge          | `bg-[#ecfdf3] text-[#166534]`    |
| Rdeč badge           | `bg-[#fff1f2] text-[#b91c1c]`    |
| Moder badge          | `bg-[#eff6ff] text-[#1e40af]`    |
| Naslov H2            | `text-[22px] font-bold`          |
| Naslov H3            | `text-[16px] font-semibold`      |
| Telo                 | `text-[13–14px]`                 |
| Majhno               | `text-[11–12px]`                 |

## Ključne komponente

| Komponenta       | Pot                                      | Uporaba                                      |
|------------------|------------------------------------------|----------------------------------------------|
| `AppShell`       | `components/AppShell.tsx`                | Ovoj za vse zaščitene strani                 |
| `EventCard`      | `components/EventCard.tsx`               | Kartica dogodka (Program stran)              |
| `SessionCard`    | `components/SessionCard.tsx`             | Kartica seje v programski mreži              |
| `CareerSlotCard` | `components/CareerSlotCard.tsx`          | Kartica kariernega termina v programski mreži|
| `PersonCard`     | `components/PersonCard.tsx`              | Kartica udeleženca (Skupnost)                |
| `ConnectionGraph`| `components/ConnectionGraph.tsx`         | ReactFlow graf povezav                       |
| `UserPopup`      | `components/UserPopup.tsx`               | Popup ob kliku na vozlišče v grafu           |
| `TagPicker`      | `components/TagPicker.tsx`               | Večizborni filter oznak z iskanjem           |
| `TagPills`       | `components/TagPicker.tsx`               | Bralni prikaz oznak (kartica, modal)         |
| `SessionFormModal`| `components/SessionFormModal.tsx`       | Modal za ustvarjanje/urejanje seje           |
| `SpeakerInput`   | `components/SpeakerInput.tsx`            | Vhod predavatelja z avtodopolnjevanjem       |
| `FilterBar`      | `components/FilterBar.tsx`               | Vrstica za iskanje in filtre (Skupnost)      |
