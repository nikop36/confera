# Definicija področij interesa

Ta dokument opisuje taksonomijo interesov in sorodnih profilnih signalov, ki jih aplikacija uporablja za priporočila in kasnejše AI ujemanje udeležencev.

Vir za uporabniški vmesnik je `frontend/app/lib/profile-taxonomy.ts`. Firestore trenutno shranjuje izbrane vrednosti kot polja `string[]` na dokumentu uporabnika.

---

## Namen

Področja interesa so primarni signal za tematsko podobnost med udeleženci. Sama po sebi niso dovolj za kakovostno priporočanje, zato jih AI matching v1 uporablja skupaj z:

| Polje | Namen pri ujemanju |
|---|---|
| `interests` | Tematska področja, ki uporabnika zanimajo |
| `goals` | Kaj uporabnik želi doseči na konferenci |
| `competencies` | Znanja, izkušnje in vloge uporabnika |
| `researchKeywords` | Bolj specifični strokovni izrazi |
| `bio` | Prosti opis uporabnika |
| `affiliation` | Organizacija ali institucija |
| `meetingType` | Preferenca za spletno ali fizično srečanje |

---

## Shranjevanje

Trenutna struktura v kolekciji `users`:

```json
{
  "interests": ["Umetna inteligenca", "Medicina"],
  "goals": ["Raziskovalno sodelovanje", "Zaposlitev"],
  "competencies": ["Strojno učenje", "Javno nastopanje"],
  "researchKeywords": ["LLM", "Priporočilni sistemi"]
}
```

Vrednosti so za zdaj shranjene kot prikazna besedila. To omogoča hitro implementacijo in enostavno uporabo pri prototipu AI ujemanja.

---

## Področja interesa

### Tehnologija

- Umetna inteligenca
- Strojno učenje
- Robotika
- Podatkovna znanost
- Kibernetska varnost
- Razvoj programske opreme
- Digitalizacija
- Pametne naprave
- Računalniški vid
- NLP
- Blockchain
- Internet stvari

### Naravoslovje

- Kemija
- Biologija
- Fizika
- Matematika
- Biotehnologija
- Materiali
- Okoljske znanosti
- Laboratorijske raziskave

### Medicina in zdravje

- Medicina
- Farmacija
- Digitalno zdravje
- Javno zdravje
- Psihologija
- Prehrana
- Rehabilitacija
- Zdravstvena nega

### Pravo in regulativa

- Pravo
- Varstvo podatkov
- Intelektualna lastnina
- Regulativa AI
- Delovno pravo
- Javna naročila
- Skladnost poslovanja
- Etika in zakonodaja

### Družba in javni sektor

- Javna uprava
- Izobraževanje
- Zdravstvo
- Pametna mesta
- Mobilnost
- Dostopnost
- Etika tehnologije
- Skupnostni projekti

### Humanistika in kultura

- Jeziki
- Zgodovina
- Filozofija
- Mediji
- Komuniciranje
- Kultura
- Umetnost
- Kreativne industrije

### Posel in kariera

- Podjetništvo
- Industrija 4.0
- Marketing
- Prodaja
- Finance
- Kadrovanje
- Vodenje ekip
- Inovacije

### Življenje in vrednote

- Vzdržnost
- Okolje
- Kultura
- Umetnost
- Šport
- Dobro počutje
- Potovanja
- Osebni razvoj

### Inženirstvo in proizvodnja

- Strojništvo
- Elektrotehnika
- Gradbeništvo
- Logistika
- Avtomatizacija proizvodnje
- Energetika
- Kakovost
- Varnost pri delu

---

## Strategija za AI matching v1

Za prvo različico ujemanja sistem izdela tekstovni profil uporabnika iz strukturiranih in prostih polj. Primer:

```txt
Interesi: Umetna inteligenca, Medicina
Cilji: Raziskovalno sodelovanje, Zaposlitev
Kompetence: Strojno učenje, Javno nastopanje
Ključne besede: LLM, Priporočilni sistemi
Opis: ...
Institucija: ...
```

Ta tekstovni profil se sinhronizira v PostgreSQL tabelo
`participant_profile_index`, kjer se uporablja za hibridno iskanje:

- `to_tsvector` za besedilno ujemanje po interesih, ciljih in ključnih besedah
- `pgvector` za semantično podobnost profilov
- združen rezultat, ki vrne rangirane uporabnike in razloge za priporočilo

Firestore ostane vir resnice za profil, PostgreSQL pa je iskalni indeks za AI
ujemanje. Lokalni razvoj lahko uporablja `docker-compose.yml`, ki zažene
`pgvector/pgvector:pg16`.

V trenutni verziji je embedding model označen kot prototip
`prototype-local-hash-384-v1`. To pomeni, da je arhitektura za vektorsko
ujemanje pripravljena, kakovost priporočil pa se bo izboljšala z zamenjavo
`EmbeddingService` z realnim semantičnim modelom.

---

## Pravila za vzdrževanje

- Nove možnosti se dodajajo v `frontend/app/lib/profile-taxonomy.ts`.
- Besedila naj ostanejo v slovenščini, ker so prikazana uporabniku in shranjena v Firestore.
- Ne odstranjuj obstoječih vrednosti brez migracije, ker so lahko že shranjene pri uporabnikih.
- Če bo projekt kasneje potreboval večjo stabilnost, naj se uvedejo stabilni ID-ji, npr. `{ id: "artificial-intelligence", label: "Umetna inteligenca" }`.
- Možnost `Drugo` ostane dovoljena, vendar naj ima pri ujemanju nižjo težo kot vrednosti iz taksonomije, ker ni standardizirana.
