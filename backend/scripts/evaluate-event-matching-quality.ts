import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  evaluateEventMatchingQuality,
  type MatchingDataset,
} from '../src/matching/quality/event-matching-evaluator';

type ReportPayload = {
  generatedAt: string;
  dataset: {
    name: string;
    createdAt: string;
    profileCount: number;
    eventCount: number;
    queryCount: number;
    kValues: number[];
  };
  results: ReturnType<typeof evaluateEventMatchingQuality>;
};

function main() {
  const datasetPath = resolve(
    __dirname,
    '../src/matching/quality/datasets/event-matching-quality.dataset.json',
  );
  const dataset = JSON.parse(
    readFileSync(datasetPath, 'utf-8'),
  ) as MatchingDataset;

  const results = evaluateEventMatchingQuality(dataset);
  const payload: ReportPayload = {
    generatedAt: new Date().toISOString(),
    dataset: {
      name: dataset.name,
      createdAt: dataset.createdAt,
      profileCount: dataset.profiles.length,
      eventCount: dataset.events.length,
      queryCount: dataset.queries.length,
      kValues: dataset.kValues,
    },
    results,
  };

  const reportDir = resolve(__dirname, '../../docs/AI/reports');
  mkdirSync(reportDir, { recursive: true });
  const jsonPath = resolve(reportDir, 'event-matching-quality-report.json');
  const mdPath = resolve(reportDir, 'event-matching-quality-report.md');

  writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  writeFileSync(mdPath, toMarkdown(payload), 'utf-8');

  console.log(`AI matching quality report generated:
 - ${jsonPath}
 - ${mdPath}`);
}

function toMarkdown(payload: ReportPayload): string {
  const { dataset, results, generatedAt } = payload;
  const ks = dataset.kValues.map((value) => String(value));

  const format = (value: number) => `${(value * 100).toFixed(2)}%`;
  const formatSigned = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(2)} p.p.`;
  };

  const kRows = ks
    .map((k) => {
      const aiPrecision = results.aiModel.overall.meanPrecisionAtK[k] ?? 0;
      const basePrecision = results.baseline.overall.meanPrecisionAtK[k] ?? 0;
      const aiRecall = results.aiModel.overall.meanRecallAtK[k] ?? 0;
      const baseRecall = results.baseline.overall.meanRecallAtK[k] ?? 0;
      const aiNdcg = results.aiModel.overall.meanNdcgAtK[k] ?? 0;
      const baseNdcg = results.baseline.overall.meanNdcgAtK[k] ?? 0;

      return `| ${k} | ${format(aiPrecision)} | ${format(basePrecision)} | ${format(
        results.comparison.precisionAtKDelta[k] ?? 0,
      )} | ${format(aiRecall)} | ${format(baseRecall)} | ${format(
        results.comparison.recallAtKDelta[k] ?? 0,
      )} | ${format(aiNdcg)} | ${format(baseNdcg)} | ${format(
        results.comparison.ndcgAtKDelta[k] ?? 0,
      )} |`;
    })
    .join('\n');

  const issues = deriveIssues(results);

  return `# Poročilo: AI Matching Quality Testing

Datum generiranja: ${generatedAt}

## Testni nabor podatkov

- Dataset: \`${dataset.name}\`
- Ustvarjen: ${dataset.createdAt}
- Profili: ${dataset.profileCount}
- Dogodki: ${dataset.eventCount}
- Poizvedbe: ${dataset.queryCount}
- K vrednosti: ${dataset.kValues.join(', ')}

## Definicije metrik

- **Precision@K**: delež relevantnih dogodkov med prvimi K priporočili.
- **Recall@K**: delež vseh relevantnih dogodkov, najdenih med prvimi K.
- **MRR** (Mean Reciprocal Rank): kako visoko se pojavi prvi relevanten rezultat.
- **NDCG@K**: kakovost rangiranja glede na položaj relevantnih rezultatov.

## Primerjava modelov

- AI model: \`${results.aiModel.model}\`
- Baseline model: \`${results.baseline.model}\` (samo ujemanje tagov + social boost)
- MRR (AI): ${format(results.aiModel.overall.meanMrr)}
- MRR (Baseline): ${format(results.baseline.overall.meanMrr)}
- Razlika MRR: ${formatSigned(results.comparison.mrrDelta)}

| K | Precision@K (AI) | Precision@K (Baseline) | Δ Precision | Recall@K (AI) | Recall@K (Baseline) | Δ Recall | NDCG@K (AI) | NDCG@K (Baseline) | Δ NDCG |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${kRows}

## Identificirane težave

${issues.map((issue) => `- ${issue}`).join('\n')}

## Predlogi izboljšav

- Dodati več označenih primerov (ground-truth) iz realnih uporabniških interakcij.
- Ločeno uteževanje za \`tags\` in \`keywords\` po domeni dogodka.
- Razširiti baseline (npr. TF-IDF token overlap) za bolj pošteno primerjavo.
- Vključiti online metrike (CTR/registration rate po priporočilu) kot naslednjo fazo.
`;
}

function deriveIssues(
  results: ReturnType<typeof evaluateEventMatchingQuality>,
): string[] {
  const issues: string[] = [];
  if (results.comparison.mrrDelta < 0) {
    issues.push(
      'AI model ima slabši MRR od baseline modela; potreben je tuning uteži.',
    );
  }

  const negativeNdcg = Object.values(results.comparison.ndcgAtKDelta).some(
    (value) => value < 0,
  );
  if (negativeNdcg) {
    issues.push(
      'NDCG pri vsaj enem K je slabši od baseline; rangiranje ni stabilno.',
    );
  }

  if (issues.length === 0) {
    if (results.comparison.mrrDelta > 0) {
      issues.push(
        'Na trenutnem testnem datasetu AI model prekaša baseline v glavnih metrikah.',
      );
    } else if (results.comparison.mrrDelta === 0) {
      issues.push(
        'AI in baseline sta na trenutnem datasetu izenačena; razširite dataset z zahtevnejšimi primeri.',
      );
    } else {
      issues.push(
        'AI model zaostaja za baseline; predlagan je tuning uteži in razširitev učnih primerov.',
      );
    }
  }

  return issues;
}

main();
