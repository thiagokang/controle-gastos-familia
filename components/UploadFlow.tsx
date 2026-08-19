'use client';

// Controla os três passos do fluxo de upload:
//   1. escolher a fonte do arquivo (isso decide o mapeamento de colunas) e
//      o próprio arquivo CSV, e mandar para o servidor fazer o parsing;
//   2. revisar/editar Empresa e Categoria sugeridas;
//   3. confirmar.
// Nada é salvo permanentemente até o usuário clicar em "Confirmar categorização".

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseCsvAction, confirmTransactionsAction, getLearnedCategoryForCompanyAction } from '@/app/actions';
import { applyCategoryToSameCompany, normalizeCompanyName } from '@/lib/categorization';
import { CSV_SOURCE_LIST } from '@/lib/sources';
import type { ParseError, SourceId } from '@/lib/sources';
import type { ReviewRow } from '@/lib/types';
import CollapsibleWarning from './CollapsibleWarning';
import ReviewTable from './ReviewTable';

function sortAlphabetically(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// Transações sem Empresa E sem Categoria definidas são as que mais precisam
// de atenção do usuário — aparecem primeiro na revisão. Array.prototype.sort
// é garantidamente estável, então dentro de cada grupo (pendente / já
// resolvida) a ordem original do arquivo é preservada. Chamada uma única vez
// quando o arquivo é lido (handleParse) — não reordena a cada edição, senão
// uma linha "pularia" de lugar assim que o usuário terminasse de preenchê-la,
// atrapalhando quem está revisando a lista de cima para baixo.
function sortPendingFirst(rows: ReviewRow[]): ReviewRow[] {
  return [...rows].sort((a, b) => {
    const aIsPending = a.company === '' && a.category === '' ? 0 : 1;
    const bIsPending = b.company === '' && b.category === '' ? 0 : 1;
    return aIsPending - bIsPending;
  });
}

interface UploadFlowProps {
  knownCompanies: string[];
  knownCategories: string[];
}

export default function UploadFlow({
  knownCompanies: initialKnownCompanies,
  knownCategories: initialKnownCategories,
}: UploadFlowProps) {
  const router = useRouter();
  const [sourceId, setSourceId] = useState<SourceId | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [reviewRows, setReviewRows] = useState<ReviewRow[] | null>(null);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  // Listas de empresas/categorias oferecidas nos dropdowns desta sessão de
  // revisão. Começam com o que já existia salvo, mas crescem na hora quando
  // o usuário cria uma opção nova em qualquer linha — assim ela já aparece
  // nas outras linhas, sem precisar recarregar a página.
  const [knownCompanies, setKnownCompanies] = useState(initialKnownCompanies);
  const [knownCategories, setKnownCategories] = useState(initialKnownCategories);

  async function handleParse() {
    if (!file || !sourceId) return;
    setIsParsing(true);
    setParseErrors([]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await parseCsvAction(sourceId, formData);
      setReviewRows(sortPendingFirst(result.rows));
      setParseErrors(result.errors);
    } finally {
      setIsParsing(false);
    }
  }

  // Editar a Empresa de uma linha dispara a cascata: recalcula a Categoria
  // dessa linha a partir da empresa nova (categoria já aprendida para ela,
  // ou vazio se a empresa é desconhecida).
  //
  // Prioridade 1: outra linha desta MESMA sessão de revisão (ainda não
  // confirmada, portanto ainda não salva em category-rules.json) já foi
  // categorizada para essa empresa. Sem checar isso primeiro, categorizar a
  // primeira linha de uma empresa nova só valeria para as outras linhas depois
  // de confirmar a revisão inteira — o usuário teria que repetir manualmente
  // a mesma categoria em cada linha da mesma empresa dentro da própria tela
  // de revisão.
  // Prioridade 2: se nenhuma linha da sessão atual ajuda, aí sim consulta o
  // servidor, porque as regras aprendidas de uploads anteriores vivem em
  // category-rules.json, que não é enviado inteiro para o cliente.
  async function handleCompanyChange(reviewId: string, newCompany: string) {
    setKnownCompanies((current) =>
      current.includes(newCompany) ? current : sortAlphabetically([...current, newCompany])
    );

    const normalizedNewCompany = normalizeCompanyName(newCompany);
    const sessionMatch =
      normalizedNewCompany === ''
        ? undefined
        : reviewRows?.find(
            (row) =>
              row.reviewId !== reviewId &&
              row.category !== '' &&
              normalizeCompanyName(row.company) === normalizedNewCompany
          );

    const learnedCategory = sessionMatch ? sessionMatch.category : await getLearnedCategoryForCompanyAction(newCompany);
    if (learnedCategory) {
      setKnownCategories((current) =>
        current.includes(learnedCategory) ? current : sortAlphabetically([...current, learnedCategory])
      );
    }

    setReviewRows((current) =>
      current
        ? current.map((row) =>
            row.reviewId === reviewId
              ? {
                  ...row,
                  company: newCompany,
                  category: learnedCategory,
                  categorySource: learnedCategory ? 'aprendida' : 'sem-sugestao',
                }
              : row
          )
        : current
    );
  }

  // Mesmo mecanismo de correção retroativa da tela de Transações (ver
  // updateTransactionCategoryAction em app/actions.ts): editar a categoria de
  // uma linha propaga a mudança para todas as outras linhas do lote ainda em
  // revisão que sejam da mesma empresa, via applyCategoryToSameCompany.
  function handleCategoryChange(reviewId: string, newCategory: string) {
    setKnownCategories((current) =>
      current.includes(newCategory) ? current : sortAlphabetically([...current, newCategory])
    );
    setReviewRows((current) => {
      if (!current) return current;
      const target = current.find((row) => row.reviewId === reviewId);
      if (!target) return current;
      const withEdit = current.map((row) =>
        row.reviewId === reviewId ? { ...row, category: newCategory } : row
      );
      return applyCategoryToSameCompany(withEdit, target.company, newCategory);
    });
  }

  async function handleConfirm() {
    if (!reviewRows) return;
    setIsConfirming(true);
    try {
      await confirmTransactionsAction(
        reviewRows.map(
          ({
            date,
            referenceMonth,
            type,
            institution,
            format,
            description,
            company,
            installment,
            category,
            value,
            isPixPessoaFisica,
            responsible,
          }) => ({
            date,
            referenceMonth,
            type,
            institution,
            format,
            description,
            company,
            installment,
            category,
            value,
            isPixPessoaFisica,
            responsible,
          })
        )
      );
      router.push('/transacoes');
    } finally {
      setIsConfirming(false);
    }
  }

  // Passo 1: nenhum arquivo processado ainda.
  if (!reviewRows) {
    return (
      <div className="max-w-xl">
        <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Fonte do arquivo
        </label>
        <select
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value as SourceId)}
          className="mb-4 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        >
          <option value="" disabled>
            Selecione de onde veio o arquivo...
          </option>
          {CSV_SOURCE_LIST.map((source) => (
            <option key={source.id} value={source.id}>
              {source.label}
            </option>
          ))}
        </select>

        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          Selecione o arquivo CSV exportado dessa fonte.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mb-4 block w-full text-sm text-neutral-600 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-neutral-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white file:transition-colors hover:file:bg-neutral-700 dark:text-neutral-400 dark:file:bg-neutral-100 dark:file:text-neutral-900 dark:hover:file:bg-neutral-300"
        />
        <button
          onClick={handleParse}
          disabled={!file || !sourceId || isParsing}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {isParsing ? 'Lendo arquivo...' : 'Enviar e revisar'}
        </button>
      </div>
    );
  }

  // Passo 2: revisão de Empresa e Categoria antes de confirmar. O aviso de
  // linhas inválidas (se houver) fica sempre visível aqui — mesmo
  // componente de aviso colapsável usado pelo aviso de categorias com saldo
  // negativo do Resumo mensal (ver CollapsibleWarning), pra manter a
  // experiência consistente entre as duas telas.
  return (
    <div>
      {parseErrors.length > 0 && (
        <CollapsibleWarning
          summary={`⚠️ ${parseErrors.length} linha(s) do arquivo não puderam ser lidas e foram ignoradas`}
        >
          <ul className="divide-y divide-amber-200 dark:divide-amber-900">
            {parseErrors.map((error, index) => (
              <li key={index} className="py-1.5 text-sm first:pt-0 last:pb-0">
                <div className="font-medium">
                  {error.line !== null ? `Linha ${error.line}` : 'Arquivo'}: {error.reason}
                </div>
                {error.raw && (
                  <div
                    className="mt-0.5 truncate font-mono text-xs text-amber-700/80 dark:text-amber-400/80"
                    title={error.raw}
                  >
                    {error.raw}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CollapsibleWarning>
      )}

      {/* A tabela rola internamente (veja o max-h + overflow-auto dentro de
          ReviewTable), então esta barra — fora da área que rola — fica
          sempre visível sozinha, sem precisar de position:sticky. O
          cabeçalho da tabela (thead) é que é sticky, mas relativo à
          rolagem interna da tabela, não à da página. */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {reviewRows.length} transação(ões) encontrada(s). Revise a empresa e a categoria antes de confirmar.
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {isConfirming ? 'Salvando...' : 'Confirmar categorização'}
          </button>
          <button
            onClick={() => {
              setReviewRows(null);
              setFile(null);
            }}
            disabled={isConfirming}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
          >
            Cancelar
          </button>
        </div>
      </div>

      <ReviewTable
        rows={reviewRows}
        knownCompanies={knownCompanies}
        knownCategories={knownCategories}
        onCompanyChange={handleCompanyChange}
        onCategoryChange={handleCategoryChange}
      />
    </div>
  );
}
