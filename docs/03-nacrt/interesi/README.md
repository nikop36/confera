# Definicija oznak profila

Ta dokument opisuje taksonomijo profilnih oznak, ki jih aplikacija uporablja za
priporočila in AI ujemanje udeležencev.

Vir za uporabniški vmesnik je `frontend/app/lib/profile-taxonomy.ts`. Firestore
shranjuje izbrane vrednosti v polje `tags: string[]` na dokumentu uporabnika.

---

## Namen

Oznake so edini profilni signal, ki ga uporablja AI matching udeležencev.
Uporabnik označi teme, ki ga zanimajo, backend pa iz teh oznak zgradi tekstovni
profil za hibridno iskanje.

| Polje | Namen pri ujemanju |
|---|---|
| `tags` | Teme, ki uporabnika zanimajo; edini vhod v `participant_profile_index` za rangiranje in razlage |

---

## Shranjevanje

Trenutna struktura v kolekciji `users`:

```json
{
  "tags": ["umetna-inteligenca", "medicina", "llm"]
}
```

Vrednosti so shranjene kot stabilni slugi. Pri gradnji AI vhoda backend zamenja
vezaje s presledki, npr. `umetna-inteligenca` postane `umetna inteligenca`.

---

## Področja oznak

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

Sistem izdela tekstovni profil uporabnika samo iz oznak. Primer:

```txt
Oznake: umetna inteligenca, medicina, llm
```

Ta tekstovni profil se sinhronizira v PostgreSQL tabelo
`participant_profile_index`, kjer se uporablja za hibridno iskanje:

- `to_tsvector` za besedilno ujemanje po oznakah
- `pgvector` za semantično podobnost profilov
- združen rezultat, ki vrne rangirane uporabnike in razloge na osnovi skupnih oznak

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
- Oznake naj ostanejo stabilni slugi, ker jih AI indeks uporablja kot vhodni signal.
