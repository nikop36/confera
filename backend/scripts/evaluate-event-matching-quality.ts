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
  gates: {
    config: QualityGateConfig;
    passed: boolean;
    failures: string[];
  };
};

type QualityGateConfig = {
  minMrr: number;
  minPrecisionAt3: number;
  minRecallAt3: number;
  minNdcgAt3: number;
  minMrrDeltaVsBaseline: number;
  minNdcgDeltaAt3VsBaseline: number;
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
  const gateConfig = readGateConfig();
  const gateResult = evaluateGates(results, gateConfig);
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
    gates: {
      config: gateConfig,
      passed: gateResult.passed,
      failures: gateResult.failures,
    },
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

  if (!gateResult.passed) {
    console.error('\nAI matching quality gates FAILED:');
    for (const failure of gateResult.failures) {
      console.error(` - ${failure}`);
    }
    process.exit(1);
  }

  console.log('\nAI matching quality gates PASSED.');
}

function toMarkdown(payload: ReportPayload): string {
  const { dataset, results, generatedAt, gates } = payload;
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

## Kakovostna vrata (CI Gates)

- Status: ${gates.passed ? 'PASSED' : 'FAILED'}
- Pragovi:
  - min MRR: ${format(gates.config.minMrr)}
  - min Precision@3: ${format(gates.config.minPrecisionAt3)}
  - min Recall@3: ${format(gates.config.minRecallAt3)}
  - min NDCG@3: ${format(gates.config.minNdcgAt3)}
  - min ΔMRR vs baseline: ${formatSigned(gates.config.minMrrDeltaVsBaseline)}
  - min ΔNDCG@3 vs baseline: ${formatSigned(gates.config.minNdcgDeltaAt3VsBaseline)}
${gates.failures.length > 0 ? `- Kršitve:\n${gates.failures.map((failure) => `  - ${failure}`).join('\n')}` : '- Kršitve: ni'}

## Identificirane težave

${issues.map((issue) => `- ${issue}`).join('\n')}

## Predlogi izboljšav

- Dodati več označenih primerov (ground-truth) iz realnih uporabniških interakcij.
- Ločeno uteževanje za \`tags\` in \`keywords\` po domeni dogodka.
- Razširiti baseline (npr. TF-IDF token overlap) za bolj pošteno primerjavo.
- Vključiti online metrike (CTR/registration rate po priporočilu) kot naslednjo fazo.
`;
}

function readGateConfig(): QualityGateConfig {
  return {
    minMrr: readEnvNumber('AI_MATCHING_GATE_MIN_MRR', 0.5),
    minPrecisionAt3: readEnvNumber('AI_MATCHING_GATE_MIN_P3', 0.25),
    minRecallAt3: readEnvNumber('AI_MATCHING_GATE_MIN_R3', 0.5),
    minNdcgAt3: readEnvNumber('AI_MATCHING_GATE_MIN_NDCG3', 0.6),
    minMrrDeltaVsBaseline: readEnvNumber('AI_MATCHING_GATE_MIN_MRR_DELTA', 0),
    minNdcgDeltaAt3VsBaseline: readEnvNumber(
      'AI_MATCHING_GATE_MIN_NDCG3_DELTA',
      0,
    ),
  };
}

function evaluateGates(
  results: ReturnType<typeof evaluateEventMatchingQuality>,
  config: QualityGateConfig,
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  const precision3 = results.aiModel.overall.meanPrecisionAtK['3'] ?? 0;
  const recall3 = results.aiModel.overall.meanRecallAtK['3'] ?? 0;
  const ndcg3 = results.aiModel.overall.meanNdcgAtK['3'] ?? 0;
  const mrr = results.aiModel.overall.meanMrr;
  const mrrDelta = results.comparison.mrrDelta;
  const ndcg3Delta = results.comparison.ndcgAtKDelta['3'] ?? 0;

  if (mrr < config.minMrr) {
    failures.push(
      `MRR ${mrr.toFixed(4)} < min ${config.minMrr.toFixed(4)} (AI_MATCHING_GATE_MIN_MRR)`,
    );
  }
  if (precision3 < config.minPrecisionAt3) {
    failures.push(
      `Precision@3 ${precision3.toFixed(4)} < min ${config.minPrecisionAt3.toFixed(4)} (AI_MATCHING_GATE_MIN_P3)`,
    );
  }
  if (recall3 < config.minRecallAt3) {
    failures.push(
      `Recall@3 ${recall3.toFixed(4)} < min ${config.minRecallAt3.toFixed(4)} (AI_MATCHING_GATE_MIN_R3)`,
    );
  }
  if (ndcg3 < config.minNdcgAt3) {
    failures.push(
      `NDCG@3 ${ndcg3.toFixed(4)} < min ${config.minNdcgAt3.toFixed(4)} (AI_MATCHING_GATE_MIN_NDCG3)`,
    );
  }
  if (mrrDelta < config.minMrrDeltaVsBaseline) {
    failures.push(
      `ΔMRR ${mrrDelta.toFixed(4)} < min ${config.minMrrDeltaVsBaseline.toFixed(4)} (AI_MATCHING_GATE_MIN_MRR_DELTA)`,
    );
  }
  if (ndcg3Delta < config.minNdcgDeltaAt3VsBaseline) {
    failures.push(
      `ΔNDCG@3 ${ndcg3Delta.toFixed(4)} < min ${config.minNdcgDeltaAt3VsBaseline.toFixed(4)} (AI_MATCHING_GATE_MIN_NDCG3_DELTA)`,
    );
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

function readEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
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
