# Poročilo: AI Matching Quality Testing

Datum generiranja: 2026-06-01T10:49:07.141Z

## Testni nabor podatkov

- Dataset: `event-matching-quality-v1`
- Ustvarjen: 2026-06-01T00:00:00.000Z
- Profili: 3
- Dogodki: 6
- Poizvedbe: 3
- K vrednosti: 1, 3, 5

## Definicije metrik

- **Precision@K**: delež relevantnih dogodkov med prvimi K priporočili.
- **Recall@K**: delež vseh relevantnih dogodkov, najdenih med prvimi K.
- **MRR** (Mean Reciprocal Rank): kako visoko se pojavi prvi relevanten rezultat.
- **NDCG@K**: kakovost rangiranja glede na položaj relevantnih rezultatov.

## Primerjava modelov

- AI model: `ai_model`
- Baseline model: `tag_baseline` (samo ujemanje tagov + social boost)
- MRR (AI): 100.00%
- MRR (Baseline): 100.00%
- Razlika MRR: 0.00 p.p.

| K | Precision@K (AI) | Precision@K (Baseline) | Δ Precision | Recall@K (AI) | Recall@K (Baseline) | Δ Recall | NDCG@K (AI) | NDCG@K (Baseline) | Δ NDCG |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 100.00% | 100.00% | 0.00% | 50.00% | 50.00% | 0.00% | 100.00% | 100.00% | 0.00% |
| 3 | 66.67% | 44.44% | 22.22% | 100.00% | 66.67% | 33.33% | 100.00% | 74.21% | 25.79% |
| 5 | 40.00% | 33.33% | 6.67% | 100.00% | 83.33% | 16.67% | 100.00% | 83.01% | 16.99% |

## Kakovostna vrata (CI Gates)

- Status: PASSED
- Pragovi:
  - min MRR: 50.00%
  - min Precision@3: 25.00%
  - min Recall@3: 50.00%
  - min NDCG@3: 60.00%
  - min ΔMRR vs baseline: 0.00 p.p.
  - min ΔNDCG@3 vs baseline: 0.00 p.p.
- Kršitve: ni

## Identificirane težave

- AI in baseline sta na trenutnem datasetu izenačena; razširite dataset z zahtevnejšimi primeri.

## Predlogi izboljšav

- Dodati več označenih primerov (ground-truth) iz realnih uporabniških interakcij.
- Ločeno uteževanje za `tags` in `keywords` po domeni dogodka.
- Razširiti baseline (npr. TF-IDF token overlap) za bolj pošteno primerjavo.
- Vključiti online metrike (CTR/registration rate po priporočilu) kot naslednjo fazo.
