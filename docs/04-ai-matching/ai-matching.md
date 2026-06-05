# AI ujemanje v1

Ta dokument opisuje trenutno implementacijo priporočanja udeležencev. Namen
implementacije je pripraviti stabilno osnovo za kasnejšo zamenjavo lokalnega
embedding modela z naprednejšim modelom, brez spremembe glavne arhitekture.

---

## Arhitektura

Sistem uporablja dva podatkovna sloja:

| Sloj | Namen |
|---|---|
| Firebase Auth | Avtentikacija uporabnikov |
| Firestore | Primarna baza in vir resnice za profile |
| PostgreSQL + pgvector | Izveden iskalni indeks za AI ujemanje |

Firestore ostane glavna baza. PostgreSQL ne zamenja Firestore, ampak hrani
kopijo podatkov, ki so potrebni za hitro hibridno iskanje.

```txt
Uporabnik posodobi profil
  -> PATCH /profile/me
  -> profil se shrani v Firestore
  -> backend zgradi tekstovni profil
  -> backend ustvari embedding
  -> backend posodobi participant_profile_index v PostgreSQL
```

Če PostgreSQL ni nastavljen ali sinhronizacija odpove, se profil še vedno shrani
v Firestore. SQL indeks je zato dodaten sloj, ne kritična pot za osnovno uporabo
aplikacije.

V AI ujemanje so vključeni samo profili s `profileStatus: 'complete'`. Uporabniki
z nepopolnim profilom (`incomplete`) aplikacijo normalno uporabljajo, vendar niso
vidni v priporočilih in ne prejemajo ujemanj.

Vhod za AI ujemanje udeležencev so samo profilne oznake (`tags`).
---

## Podatkovni indeks

Backend ob zagonu pripravi tabelo:

```sql
participant_profile_index (
  uid text primary key,
  display_name text not null,
  email text,
  affiliation text,
  bio text,
  tags text[],
  profile_text text not null,
  profile_embedding vector(384),
  embedding_model text,
  profile_hash text not null,
  updated_at timestamptz
)
```

Polje `profile_text` je normaliziran tekstovni opis profila. Primer:

```txt
Oznake: umetna inteligenca, strojno ucenje, llm
```

V dejanski implementaciji `profile_text` vsebuje samo vrstico `Oznake: ...`.
Ime, organizacija in opis so v tabeli shranjeni kot metapodatki za odgovor API-ja,
ne kot vhod v embedding ali full-text iskanje.

---

## Hibridno iskanje

Funkcija `hybrid_profile_search(...)` združuje dva pristopa:

| Pristop | Namen |
|---|---|
| Full-text search | Najde neposredna besedilna ujemanja v profilu |
| Vector similarity | Najde semantično podobne profile |

Rezultat je združen z metodo Reciprocal Rank Fusion:

```sql
coalesce(1.0 / (60 + keyword_rank), 0)
+ coalesce(1.0 / (60 + semantic_rank), 0)
```

Endpoint za uporabo:

```http
GET /matches/me
Authorization: Bearer <firebase-id-token>
```

Odgovor vsebuje rangirane profile in razloge:

```json
[
  {
    "uid": "firebase-uid",
    "displayName": "Petra Kos",
    "score": 0.031,
    "reasons": [
      "Skupne oznake: umetna-inteligenca"
    ]
  }
]
```

---

## Prototipni embedding model

Trenutna implementacija namerno uporablja lokalni deterministični prototipni
embedding:

```txt
prototype-local-hash-384-v1
```

Ta model ni namenjen merjenju končne kakovosti priporočil. Namenjen je temu, da
je celotna infrastruktura za AI ujemanje že delujoča:

- razvoj brez plačljivega zunanjega API-ja
- stabilne teste
- enako dimenzijo kot `vector(384)`
- enostavno zamenjavo z realnim embedding modelom kasneje

Zamenjava je namenoma omejena na `EmbeddingService`. SQL tabela, endpoint
`/matches/me`, sinhronizacija profila in frontend integracija lahko ostanejo
enaki, če novi model še vedno vrača 384-dimenzionalne vektorje.

Če bo izbran model z drugo dimenzijo, je treba uskladiti še:

- `profile_embedding vector(384)`
- parameter `query_embedding vector(384)` v `hybrid_profile_search`
- teste, ki preverjajo dimenzijo embeddinga

Za predstavitev projekta je zato pomembno ločiti:

| Del | Status |
|---|---|
| Arhitektura za AI ujemanje | Implementirana |
| SQL hibridno iskanje | Implementirano |
| Sinhronizacija profila v indeks | Implementirana |
| Kakovosten semantični embedding model | Načrtovana nadgradnja |

---

## Lokalni zagon

Če se uporablja Supabase:

```env
DATABASE_URL=postgresql://...
DATABASE_SSL=true
```

Če se uporablja lokalni Docker PostgreSQL:

```bash
docker compose up postgres
```

```env
DATABASE_URL=postgres://confera:confera@localhost:5432/confera
DATABASE_SSL=false
```

Za delovanje je potrebna razširitev `pgvector`:

```sql
create extension if not exists vector;
```

Backend ob zagonu pripravi tabelo, indekse in SQL funkcijo.

---

## Ročno preverjanje

1. Zaženi backend in preveri log:

```txt
PostgreSQL matching schema is ready.
```

2. Shrani profil prvega uporabnika.
3. Shrani profil drugega uporabnika.
4. V Supabase preveri tabelo `participant_profile_index`.
5. Pokliči endpoint:

```bash
curl http://localhost:3000/matches/me \
  -H "Authorization: Bearer <firebase-id-token>"
```

6. Pričakovan rezultat je seznam priporočil z `score` in `reasons`.

---

## Znane omejitve v1

- Embedding model je začasen in ni primerljiv s produkcijskimi semantičnimi modeli.
- Profili se indeksirajo ob shranjevanju profila, zato stari profili niso v indeksu,
  dokler jih uporabnik ponovno ne shrani.
- SQL indeks trenutno ne pozna dogodkov ali omejitev urnika.
- Razlogi za priporočila so razloženi na osnovi skupnih oznak, ne celotne
  semantične analize.

---

## AI Matching Quality Testing

Za preverjanje kakovosti ujemanja za dogodke je implementiran avtomatiziran evalvacijski pipeline:

- Dataset: `backend/src/matching/quality/datasets/event-matching-quality.dataset.json`
- Metrike: `Precision@K`, `Recall@K`, `MRR`, `NDCG@K`
- Primerjava modelov:
  - `ai_model` (semantika + tagi + social boost)
  - `tag_baseline` (baseline brez semantike)

Zagon:

```bash
cd backend
npm run evaluate:matching-quality
```

Generirana poročila:

- `docs/AI/reports/event-matching-quality-report.json`
- `docs/AI/reports/event-matching-quality-report.md`

Pipeline se požene tudi v CI (GitHub Actions, backend workflow), zato je kakovost
rangiranja preverjena ob vsakem push/PR.

### Quality gates (CI)

Evalvacija ima vgrajene pragove. Če so preseženi navzdol, skripta vrne `exit code 1`
in CI pade.

Nastavljivi ENV parametri:

- `AI_MATCHING_GATE_MIN_MRR` (privzeto `0.5`)
- `AI_MATCHING_GATE_MIN_P3` (privzeto `0.25`)
- `AI_MATCHING_GATE_MIN_R3` (privzeto `0.5`)
- `AI_MATCHING_GATE_MIN_NDCG3` (privzeto `0.6`)
- `AI_MATCHING_GATE_MIN_MRR_DELTA` (privzeto `0`)
- `AI_MATCHING_GATE_MIN_NDCG3_DELTA` (privzeto `0`)
