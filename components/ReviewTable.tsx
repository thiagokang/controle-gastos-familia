'use client';

// Tabela da tela de revisão: uma linha por transação do CSV. Empresa e
// Categoria são ambas editáveis, cada uma com um selo indicando de onde veio
// a sugestão. Abaixo do nome da Empresa aparece a descrição bruta original
// (menor, cor discreta) — é só leitura, nunca editável, serve de referência
// para o usuário entender por que aquela empresa foi sugerida.

import type { ReviewRow } from '@/lib/types';
import { formatDateBR } from '@/lib/dateUtils';
import SuggestionBadge from './SuggestionBadge';
import SuggestionSelect from './SuggestionSelect';

interface ReviewTableProps {
  rows: ReviewRow[];
  knownCompanies: string[];
  knownCategories: string[];
  onCompanyChange: (reviewId: string, newCompany: string) => void;
  onCategoryChange: (reviewId: string, newCategory: string) => void;
}

export default function ReviewTable({
  rows,
  knownCompanies,
  knownCategories,
  onCompanyChange,
  onCategoryChange,
}: ReviewTableProps) {
  // A rolagem acontece DENTRO desta caixa (max-h + overflow-auto), não na
  // página inteira — é isso que permite o cabeçalho da tabela ficar "sticky"
  // de verdade (gruda no topo desta caixa, não da página) e a barra de botões
  // acima dela (fora da caixa) ficar sempre visível sem precisar de nenhum
  // truque de posicionamento.
  return (
    <div className="max-h-[65vh] overflow-auto rounded-lg border border-neutral-200">
      <table className="min-w-full divide-y divide-neutral-200 text-sm">
        <thead className="sticky top-0 z-10 bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500">
          <tr>
            <th className="px-3 py-2">Data</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Instituição</th>
            <th className="px-3 py-2">Formato</th>
            <th className="px-3 py-2">Empresa</th>
            <th className="px-3 py-2">Parcela</th>
            <th className="px-3 py-2">Valor</th>
            <th className="px-3 py-2">Categoria</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <tr key={row.reviewId}>
              <td className="whitespace-nowrap px-3 py-2">{formatDateBR(row.date)}</td>
              <td className="whitespace-nowrap px-3 py-2 capitalize">{row.type}</td>
              <td className="whitespace-nowrap px-3 py-2">{row.institution}</td>
              <td className="whitespace-nowrap px-3 py-2">{row.format}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <SuggestionSelect
                    value={row.company}
                    options={knownCompanies}
                    onChange={(newCompany) => onCompanyChange(row.reviewId, newCompany)}
                    newOptionLabel="+ Nova empresa..."
                    newOptionPlaceholder="Nome da empresa"
                  />
                  <SuggestionBadge source={row.companySource} />
                </div>
                <div className="mt-1 max-w-[220px] truncate text-xs text-neutral-400" title={row.description}>
                  {row.description}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-2">{row.installment ?? '—'}</td>
              <td className="whitespace-nowrap px-3 py-2">
                {row.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                <div className="flex items-center gap-2">
                  <SuggestionSelect
                    value={row.category}
                    options={knownCategories}
                    onChange={(newCategory) => onCategoryChange(row.reviewId, newCategory)}
                    newOptionLabel="+ Nova categoria..."
                    newOptionPlaceholder="Nome da categoria"
                  />
                  <SuggestionBadge source={row.categorySource} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
