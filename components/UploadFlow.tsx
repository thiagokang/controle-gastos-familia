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
import { CSV_SOURCE_LIST } from '@/lib/sources';
import type { SourceId } from '@/lib/sources';
import type { ReviewRow } from '@/lib/types';
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
  const [parseErrors, setParseErrors] = useState<string[]>([]);
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
  // ou vazio se a empresa é desconhecida). A consulta é feita no servidor
  // porque as regras de categoria aprendidas vivem em category-rules.json,
  // que não é enviado inteiro para o cliente.
  async function handleCompanyChange(reviewId: string, newCompany: string) {
    setKnownCompanies((current) =>
      current.includes(newCompany) ? current : sortAlphabetically([...current, newCompany])
    );

    const learnedCategory = await getLearnedCategoryForCompanyAction(newCompany);
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

  function handleCategoryChange(reviewId: string, newCategory: string) {
    setKnownCategories((current) =>
      current.includes(newCategory) ? current : sortAlphabetically([...current, newCategory])
    );
    setReviewRows((current) =>
      current
        ? current.map((row) =>
            row.reviewId === reviewId ? { ...row, category: newCategory } : row
          )
        : current
    );
  }

  async function handleConfirm() {
    if (!reviewRows) return;
    setIsConfirming(true);
    try {
      await confirmTransactionsAction(
        reviewRows.map(({ date, referenceMonth, type, institution, format, description, company, installment, category, value }) => ({
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
        }))
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
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Fonte do arquivo
        </label>
        <select
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value as SourceId)}
          className="mb-4 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
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

        <p className="mb-4 text-sm text-neutral-600">
          Selecione o arquivo CSV exportado dessa fonte.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mb-4 block w-full text-sm text-neutral-600 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-neutral-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white file:transition-colors hover:file:bg-neutral-700"
        />
        <button
          onClick={handleParse}
          disabled={!file || !sourceId || isParsing}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {isParsing ? 'Lendo arquivo...' : 'Enviar e revisar'}
        </button>

        {parseErrors.length > 0 && (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-red-600">
            {parseErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Passo 2: revisão de Empresa e Categoria antes de confirmar.
  return (
    <div>
      {parseErrors.length > 0 && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {parseErrors.length} linha(s) do arquivo não puderam ser lidas e foram ignoradas.
        </div>
      )}

      {/* A tabela rola internamente (veja o max-h + overflow-auto dentro de
          ReviewTable), então esta barra — fora da área que rola — fica
          sempre visível sozinha, sem precisar de position:sticky. O
          cabeçalho da tabela (thead) é que é sticky, mas relativo à
          rolagem interna da tabela, não à da página. */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">
          {reviewRows.length} transação(ões) encontrada(s). Revise a empresa e a categoria antes de confirmar.
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {isConfirming ? 'Salvando...' : 'Confirmar categorização'}
          </button>
          <button
            onClick={() => {
              setReviewRows(null);
              setFile(null);
            }}
            disabled={isConfirming}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
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
