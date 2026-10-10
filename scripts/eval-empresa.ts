// ============================================================================
// EVAL DA IDENTIFICAÇÃO DE EMPRESA — `npm run eval:empresa`
// ============================================================================
//
// Mede quanto o motor de normalização de Empresa (lib/companyNormalization.ts,
// suggestCompany) acerta ao importar um mês novo. Spec: página do Notion
// "Avaliação da identificação de Empresa (eval)" e docs/PRD.md.
//
// Para cada Mês de referência X (do segundo em diante), reconstrói o
// conhecimento do motor SÓ com transações de meses anteriores (descrição
// bruta -> Empresa final) e compara a sugestão do motor com a Empresa final
// confirmada (o gabarito).
//
// SOMENTE LEITURA: lê data/transactions.json direto com fs (não importa
// lib/storage.ts, que cria arquivos ausentes) e só escreve em data/evals/.
// Determinístico: mesmos dados -> mesmo resultado.
//
// Limitação conhecida: a Empresa final já inclui correções feitas depois do
// mês X, então o resultado é um pouco otimista ("e se eu já tivesse a
// nomenclatura atual naquele mês").

import { promises as fs } from 'fs';
import path from 'path';
import { containsCnpj } from '../lib/cnpj';
import { normalizeCompanyName } from '../lib/categorization';
import { normalizeDescriptionKey, suggestCompany } from '../lib/companyNormalization';
import type { CompanyRules, Transaction } from '../lib/types';

type Outcome = 'match' | 'nova' | 'naoEncontrou' | 'sugestaoErrada';

interface ErrorEntry {
  month: string;
  outcome: 'naoEncontrou' | 'sugestaoErrada';
  description: string;
  predicted: string;
  expected: string;
  suggestionSource: string;
}

interface MonthResult {
  month: string;
  scored: number;
  match: number;
  nova: number;
  naoEncontrou: number;
  sugestaoErrada: number;
  // Subconjunto de "nova": o motor (palavra-chave) já sugeriu exatamente o
  // nome final, mesmo a Empresa não existindo antes.
  novaSuggestedCorrectly: number;
  // Fora da pontuação: o motor não é consultado (extrato Nubank sem CNPJ,
  // mesma regra do app), separado por Formato...
  outPix: number;
  outBoleto: number;
  outDebito: number;
  outOutro: number;
  // ...ou a transação não tem Empresa preenchida (e passou pelo motor).
  emptyCompany: number;
}

// Fonte reconstruída a partir de institution + format (o JSON não guarda o
// id da fonte). Extrato Nubank = Nubank com formato diferente de cartão.
function sourceLabel(t: Transaction): string {
  const isCredit = t.format === 'Cartão de crédito';
  if (t.institution === 'Nubank') return isCredit ? 'Nubank crédito' : 'Nubank extrato';
  if (t.institution === 'C6') return isCredit ? 'C6 crédito' : 'C6 (outro)';
  return `${t.institution} ${t.format}`;
}

// Mesma regra de app/actions.ts: Fonte 3 (extrato Nubank) sem CNPJ.
function isPixPessoaFisica(t: Transaction): boolean {
  return sourceLabel(t) === 'Nubank extrato' && !containsCnpj(t.description);
}

function pct(n: number, total: number): string {
  return total === 0 ? '   -  ' : `${((n / total) * 100).toFixed(1).padStart(5)}%`;
}

function pad(s: string | number, n: number): string {
  return String(s).padStart(n);
}

async function main() {
  const file = path.join(process.cwd(), 'data', 'transactions.json');
  const transactions = JSON.parse(await fs.readFile(file, 'utf-8')) as Transaction[];

  // Ordem determinística: mês, data, id. Dentro de um mesmo mês a última
  // linha vence ao montar o conhecimento (mesma ideia de "última correção
  // do usuário sobrescreve a regra").
  const sorted = [...transactions]
    .filter((t) => t.referenceMonth)
    .sort(
      (a, b) =>
        a.referenceMonth!.localeCompare(b.referenceMonth!) ||
        a.date.localeCompare(b.date) ||
        a.id.localeCompare(b.id)
    );
  const months = [...new Set(sorted.map((t) => t.referenceMonth!))];

  const results: MonthResult[] = [];
  const errors: ErrorEntry[] = [];
  const emptyList: { month: string; description: string; source: string }[] = [];

  for (let i = 1; i < months.length; i++) {
    const month = months[i];

    // Conhecimento: só meses anteriores; Pix PF e linhas sem Empresa nunca
    // geram regra (igual ao app).
    const rules: CompanyRules = {};
    const existing = new Set<string>();
    for (const t of sorted) {
      if (t.referenceMonth! >= month) break;
      if (isPixPessoaFisica(t) || !t.company.trim()) continue;
      rules[normalizeDescriptionKey(t.description)] = t.company;
      existing.add(normalizeCompanyName(t.company));
    }

    const r: MonthResult = {
      month, scored: 0, match: 0, nova: 0, naoEncontrou: 0, sugestaoErrada: 0, novaSuggestedCorrectly: 0,
      outPix: 0, outBoleto: 0, outDebito: 0, outOutro: 0, emptyCompany: 0,
    };

    for (const t of sorted.filter((x) => x.referenceMonth === month)) {
      if (isPixPessoaFisica(t)) {
        if (t.format === 'pix') r.outPix++;
        else if (t.format === 'boleto') r.outBoleto++;
        else if (t.format === 'cartão de débito') r.outDebito++;
        else r.outOutro++;
        continue;
      }
      if (!t.company.trim()) {
        r.emptyCompany++;
        emptyList.push({ month, description: t.description, source: sourceLabel(t) });
        continue;
      }

      const { company: predicted, source } = suggestCompany(t.description, rules);
      const finalKey = normalizeCompanyName(t.company);
      const predictedKey = normalizeCompanyName(predicted);
      const finalExisted = existing.has(finalKey);

      let outcome: Outcome;
      if (predictedKey === '') {
        outcome = finalExisted ? 'naoEncontrou' : 'nova';
      } else if (predictedKey === finalKey) {
        outcome = finalExisted ? 'match' : 'nova';
        if (!finalExisted) r.novaSuggestedCorrectly++;
      } else {
        // Qualquer sugestão diferente da Empresa final é errada, exista
        // a sugerida antes ou não (ex: "Azul" para "Zona Azul").
        outcome = 'sugestaoErrada';
      }

      r.scored++;
      r[outcome]++;
      if (outcome === 'naoEncontrou' || outcome === 'sugestaoErrada') {
        errors.push({
          month, outcome, description: t.description, predicted,
          expected: t.company, suggestionSource: source,
        });
      }
    }
    results.push(r);
  }

  const sum = (k: keyof MonthResult) => results.reduce((a, r) => a + (r[k] as number), 0);
  const total: MonthResult = {
    month: 'TOTAL', scored: sum('scored'), match: sum('match'), nova: sum('nova'),
    naoEncontrou: sum('naoEncontrou'), sugestaoErrada: sum('sugestaoErrada'),
    novaSuggestedCorrectly: sum('novaSuggestedCorrectly'),
    outPix: sum('outPix'), outBoleto: sum('outBoleto'), outDebito: sum('outDebito'),
    outOutro: sum('outOutro'), emptyCompany: sum('emptyCompany'),
  };

  // ---- Terminal ----
  console.log(`\nEval de Empresa — base de conhecimento: meses anteriores (${months[0]} só serve de base)\n`);
  console.log('Mês      Pontuadas  ✅ Match    🆕 Nova     ❓ Não achou  ⚠️ Errada   | fora: Pix  Boleto  Débito  Outro | sem Empresa');
  for (const r of [...results, total]) {
    console.log(
      `${r.month.padEnd(8)} ${pad(r.scored, 8)}  ` +
        `${pct(r.match, r.scored)}  ${pct(r.nova, r.scored)}  ${pct(r.naoEncontrou, r.scored)}    ${pct(r.sugestaoErrada, r.scored)}     ` +
        `| ${pad(r.outPix, 9)} ${pad(r.outBoleto, 7)} ${pad(r.outDebito, 7)} ${pad(r.outOutro, 6)} | ${pad(r.emptyCompany, 7)}`
    );
  }
  console.log(`\n(Nova correta inclui ${total.novaSuggestedCorrectly} caso(s) em que a palavra-chave já sugeriu o nome final, mesmo a Empresa sendo nova.)`);

  for (const [label, kind] of [['⚠️ Sugestões erradas', 'sugestaoErrada'], ['❓ Não encontrou', 'naoEncontrou']] as const) {
    const list = errors.filter((e) => e.outcome === kind);
    console.log(`\n${label} (${list.length})`);
    for (const e of list) {
      console.log(`  [${e.month}] ${e.description}\n      previsto: ${e.predicted || '(vazio)'}  [${e.suggestionSource}]\n      esperado: ${e.expected}`);
    }
  }

  console.log(`\nSem Empresa preenchida — fora da pontuação (${emptyList.length})`);
  for (const e of emptyList) console.log(`  [${e.month}] ${e.source} — ${e.description}`);

  // ---- Salvar ----
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(process.cwd(), 'data', 'evals');
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, `empresa-${stamp}.json`);
  await fs.writeFile(
    outFile,
    JSON.stringify({ runAt: now.toISOString(), months: results, total, errors, emptyCompany: emptyList }, null, 2),
    { encoding: 'utf-8', flag: 'wx' }
  );
  console.log(`\nResultado salvo em ${path.relative(process.cwd(), outFile)}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
