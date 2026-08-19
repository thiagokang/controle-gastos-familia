'use client';

// Lista de transações confirmadas do mês selecionado. Empresa e Categoria
// são editáveis ali mesmo:
//   - editar a Categoria chama updateTransactionCategoryAction (aplica a
//     correção retroativamente a todas as transações da mesma empresa);
//   - editar a Empresa chama updateTransactionCompanyAction (aplica
//     retroativamente a todas as transações com a mesma descrição bruta, E
//     recalcula a categoria de cada uma — a "cascata" comentada em
//     app/actions.ts).
// Em ambos os casos, depois de chamar a ação usamos router.refresh() para
// buscar os dados atualizados do servidor — isso é importante porque a
// edição de UMA linha pode mudar várias outras linhas já exibidas na tabela.
//
// Ordenação e filtro (ver docs/PRD.md, seção "Ordenação e filtro na tela de
// Transações") vivem como estado local deste componente, não na URL: o
// componente é remontado (via key={mês} no page.tsx) toda vez que o usuário
// troca de fatura/mês, o que reseta esse estado automaticamente pro padrão
// (ordenado por Data decrescente, sem filtro).

import { useEffect, useRef, useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from 'lucide-react';
import { updateTransactionCategoryAction, updateTransactionCompanyAction } from '@/app/actions';
import type { Responsible, Transaction, TransactionType } from '@/lib/types';
import { formatDateBR } from '@/lib/dateUtils';
import { RESPONSIBLE_VALUES, getResponsible } from '@/lib/responsible';
import { NO_CATEGORY_FILTER } from '@/lib/categoryFilter';
import SuggestionSelect from './SuggestionSelect';
import CompanyFilterCombobox from './transactions/CompanyFilterCombobox';
import RangeFilterFields from './transactions/RangeFilterFields';

interface TransactionsTableProps {
  transactions: Transaction[];
  knownCompanies: string[];
  knownCategories: string[];
  // Filtro de Categoria a aplicar já na primeira renderização — usado
  // quando se chega aqui a partir de um link externo (ex: o aviso de
  // categorias com saldo negativo do Resumo mensal), que já quer abrir a
  // tela de Transações filtrada. Valor bruto da categoria, ou
  // NO_CATEGORY_FILTER para "Sem categoria". Sem efeito depois da primeira
  // renderização — dali em diante o filtro é só estado local (ver key={...}
  // em app/transacoes/page.tsx, que remonta o componente quando essa prop
  // muda).
  initialCategoryFilter?: string;
}

function sortAlphabetically(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// ---- Modelo de ordenação/filtro ----
// Só uma coluna ordenada e um filtro ativos por vez (podem coexistir entre
// si), conforme docs/PRD.md. "Parcela" e "Descrição" ficam de fora — não têm
// ordenação/filtro dedicados.

type SortableColumn = 'date' | 'type' | 'institution' | 'format' | 'company' | 'category' | 'value' | 'responsible';

interface SortState {
  column: SortableColumn;
  direction: 'asc' | 'desc';
}

const DEFAULT_SORT: SortState = { column: 'date', direction: 'desc' };

// Sentinela pro filtro de Categoria = "Sem categoria" (categoria vazia), pra
// não confundir com "nenhum filtro selecionado" (que também precisaria de um
// valor especial se usássemos '' pros dois casos). Compartilhado com quem
// monta links pra cá já filtrados (ver lib/categoryFilter.ts).
const NO_CATEGORY = NO_CATEGORY_FILTER;

type FilterState =
  | { column: 'category'; value: string }
  | { column: 'institution'; value: string }
  | { column: 'format'; value: string }
  | { column: 'type'; value: TransactionType }
  | { column: 'company'; query: string }
  | { column: 'value'; min: number | null; max: number | null }
  | { column: 'date'; dayMin: number | null; dayMax: number | null }
  | { column: 'responsible'; value: Responsible };

function getSortValue(transaction: Transaction, column: SortableColumn): string | number {
  switch (column) {
    case 'date':
      return transaction.date;
    case 'type':
      return transaction.type;
    case 'institution':
      return transaction.institution;
    case 'format':
      return transaction.format;
    case 'company':
      return transaction.company;
    case 'category':
      return transaction.category;
    case 'value':
      return transaction.value;
    case 'responsible':
      return getResponsible(transaction);
  }
}

function sortTransactions(list: Transaction[], sort: SortState): Transaction[] {
  const sorted = [...list].sort((a, b) => {
    const valueA = getSortValue(a, sort.column);
    const valueB = getSortValue(b, sort.column);
    if (typeof valueA === 'number' && typeof valueB === 'number') return valueA - valueB;
    return String(valueA).localeCompare(String(valueB), 'pt-BR');
  });
  return sort.direction === 'asc' ? sorted : sorted.reverse();
}

// Empresa filtra só pelo campo "company" (nome já normalizado) — por pedido
// explícito, não varre a Descrição bruta, mesmo o PRD/Notion mencionando
// essa possibilidade (fica como divergência conhecida/documentada).
function filterTransactions(list: Transaction[], filter: FilterState | null): Transaction[] {
  if (!filter) return list;
  switch (filter.column) {
    case 'category':
      return list.filter((t) => (filter.value === NO_CATEGORY ? t.category === '' : t.category === filter.value));
    case 'institution':
      return list.filter((t) => t.institution === filter.value);
    case 'format':
      return list.filter((t) => t.format === filter.value);
    case 'type':
      return list.filter((t) => t.type === filter.value);
    case 'company': {
      const query = filter.query.trim().toLowerCase();
      return query === '' ? list : list.filter((t) => t.company.toLowerCase().includes(query));
    }
    case 'value':
      return list.filter(
        (t) => (filter.min === null || t.value >= filter.min) && (filter.max === null || t.value <= filter.max)
      );
    case 'date':
      return list.filter((t) => {
        const day = Number(t.date.slice(8, 10));
        return (filter.dayMin === null || day >= filter.dayMin) && (filter.dayMax === null || day <= filter.dayMax);
      });
    case 'responsible':
      return list.filter((t) => getResponsible(t) === filter.value);
  }
}

function getFilterChipLabel(filter: FilterState): string {
  switch (filter.column) {
    case 'category':
      return `Categoria: ${filter.value === NO_CATEGORY ? 'Sem categoria' : filter.value}`;
    case 'institution':
      return `Instituição: ${filter.value}`;
    case 'format':
      return `Formato: ${filter.value}`;
    case 'type':
      return `Tipo: ${filter.value === 'entrada' ? 'Entrada' : 'Saída'}`;
    case 'company':
      return `Empresa: "${filter.query}"`;
    case 'value':
      return `Valor: ${filter.min ?? '—'} a ${filter.max ?? '—'}`;
    case 'date':
      return `Data: dia ${filter.dayMin ?? '—'} a ${filter.dayMax ?? '—'}`;
    case 'responsible':
      return `Responsável: ${filter.value}`;
  }
}

// ---- Popover de filtro por coluna: um ícone que abre um pequeno painel,
// fechando sozinho ao clicar fora dele. ----

function ColumnFilterPopover({
  isOpen,
  onOpenChange,
  isActive,
  children,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isActive: boolean;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onOpenChange]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        onClick={() => onOpenChange(!isOpen)}
        aria-label="Filtrar coluna"
        className={`rounded p-0.5 transition-colors ${
          isActive
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300'
        }`}
      >
        <Filter size={13} fill={isActive ? 'currentColor' : 'none'} />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 rounded-lg border border-neutral-200 bg-white p-3 normal-case font-normal text-neutral-700 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
          {children}
        </div>
      )}
    </div>
  );
}

function SortButton({
  active,
  direction,
  onClick,
}: {
  active: boolean;
  direction: 'asc' | 'desc';
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label="Ordenar coluna"
      className={`rounded p-0.5 transition-colors ${
        active
          ? 'text-neutral-900 dark:text-neutral-100'
          : 'text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300'
      }`}
    >
      {active ? direction === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} /> : <ArrowUpDown size={13} />}
    </button>
  );
}

export default function TransactionsTable({
  transactions,
  knownCompanies: companiesFromServer,
  knownCategories: categoriesFromServer,
  initialCategoryFilter,
}: TransactionsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Opções criadas nesta sessão de tela que o servidor ainda não sabe (o
  // router.refresh() ainda não voltou). Juntamos com o que vem do servidor a
  // cada render — assim uma opção nova aparece de imediato em todos os
  // outros dropdowns, sem esperar o refresh ir e voltar, e sem precisar de
  // um useEffect só para sincronizar estado.
  const [locallyAddedCompanies, setLocallyAddedCompanies] = useState<string[]>([]);
  const [locallyAddedCategories, setLocallyAddedCategories] = useState<string[]>([]);
  const knownCompanies = sortAlphabetically(
    Array.from(new Set([...companiesFromServer, ...locallyAddedCompanies]))
  );
  const knownCategories = sortAlphabetically(
    Array.from(new Set([...categoriesFromServer, ...locallyAddedCategories]))
  );
  const knownInstitutions = sortAlphabetically(Array.from(new Set(transactions.map((t) => t.institution))));
  const knownFormats = sortAlphabetically(Array.from(new Set(transactions.map((t) => t.format))));

  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [filter, setFilter] = useState<FilterState | null>(
    initialCategoryFilter ? { column: 'category', value: initialCategoryFilter } : null
  );
  const [openFilterColumn, setOpenFilterColumn] = useState<SortableColumn | null>(null);

  function handleSortClick(column: SortableColumn) {
    setSort((current) =>
      current.column !== column
        ? { column, direction: 'asc' }
        : { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    );
  }

  function closeFilterPopover() {
    setOpenFilterColumn(null);
  }

  function handleCompanyChange(transactionId: string, newCompany: string) {
    setLocallyAddedCompanies((current) =>
      current.includes(newCompany) || companiesFromServer.includes(newCompany)
        ? current
        : [...current, newCompany]
    );
    startTransition(async () => {
      await updateTransactionCompanyAction(transactionId, newCompany);
      router.refresh();
    });
  }

  function handleCategoryChange(transactionId: string, newCategory: string) {
    setLocallyAddedCategories((current) =>
      current.includes(newCategory) || categoriesFromServer.includes(newCategory)
        ? current
        : [...current, newCategory]
    );
    startTransition(async () => {
      await updateTransactionCategoryAction(transactionId, newCategory);
      router.refresh();
    });
  }

  if (transactions.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhuma transação neste mês.</p>;
  }

  const visibleTransactions = sortTransactions(filterTransactions(transactions, filter), sort);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Editar a Empresa ou a Categoria aqui atualiza retroativamente as demais transações relacionadas
          (mesma descrição bruta, para Empresa; mesma empresa, para Categoria).
        </p>
        {filter && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {getFilterChipLabel(filter)}
            <button
              onClick={() => setFilter(null)}
              aria-label="Remover filtro"
              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200"
            >
              ×
            </button>
          </span>
        )}
      </div>
      {/* A rolagem acontece DENTRO desta caixa (max-h + overflow-auto), não na
          página inteira — é isso que faz o cabeçalho da tabela (thead)
          conseguir ficar "sticky" de verdade. Um wrapper só com
          overflow-x-auto (sem max-h) não funciona: o navegador não cria um
          contêiner de rolagem vertical de verdade, então o sticky não tem
          em relação a quê grudar. */}
      <div
        className={`max-h-[70vh] overflow-auto rounded-lg border border-neutral-200 transition-opacity dark:border-neutral-800 ${isPending ? 'opacity-60' : ''}`}
      >
        <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
          <thead className="sticky top-0 z-10 bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
            <tr>
              <th className="px-3 py-2">
                <div className="flex items-center gap-1">
                  Data
                  <SortButton
                    active={sort.column === 'date'}
                    direction={sort.direction}
                    onClick={() => handleSortClick('date')}
                  />
                  <ColumnFilterPopover
                    isOpen={openFilterColumn === 'date'}
                    onOpenChange={(open) => setOpenFilterColumn(open ? 'date' : null)}
                    isActive={filter?.column === 'date'}
                  >
                    <RangeFilterFields
                      minLabel="Dia mínimo (1–31)"
                      maxLabel="Dia máximo (1–31)"
                      initialMin={filter?.column === 'date' ? filter.dayMin : null}
                      initialMax={filter?.column === 'date' ? filter.dayMax : null}
                      onApply={(dayMin, dayMax) => {
                        setFilter(dayMin === null && dayMax === null ? null : { column: 'date', dayMin, dayMax });
                        closeFilterPopover();
                      }}
                      onClear={() => {
                        setFilter(null);
                        closeFilterPopover();
                      }}
                    />
                  </ColumnFilterPopover>
                </div>
              </th>
              <th className="px-3 py-2">
                <div className="flex items-center gap-1">
                  Tipo
                  <SortButton
                    active={sort.column === 'type'}
                    direction={sort.direction}
                    onClick={() => handleSortClick('type')}
                  />
                  <ColumnFilterPopover
                    isOpen={openFilterColumn === 'type'}
                    onOpenChange={(open) => setOpenFilterColumn(open ? 'type' : null)}
                    isActive={filter?.column === 'type'}
                  >
                    <select
                      value={filter?.column === 'type' ? filter.value : 'all'}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilter(value === 'all' ? null : { column: 'type', value: value as TransactionType });
                        closeFilterPopover();
                      }}
                      className="w-32 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    >
                      <option value="all">Todos</option>
                      <option value="entrada">Entrada</option>
                      <option value="saida">Saída</option>
                    </select>
                  </ColumnFilterPopover>
                </div>
              </th>
              <th className="px-3 py-2">
                <div className="flex items-center gap-1">
                  Instituição
                  <SortButton
                    active={sort.column === 'institution'}
                    direction={sort.direction}
                    onClick={() => handleSortClick('institution')}
                  />
                  <ColumnFilterPopover
                    isOpen={openFilterColumn === 'institution'}
                    onOpenChange={(open) => setOpenFilterColumn(open ? 'institution' : null)}
                    isActive={filter?.column === 'institution'}
                  >
                    <select
                      value={filter?.column === 'institution' ? filter.value : 'all'}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilter(value === 'all' ? null : { column: 'institution', value });
                        closeFilterPopover();
                      }}
                      className="w-40 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    >
                      <option value="all">Todas</option>
                      {knownInstitutions.map((institution) => (
                        <option key={institution} value={institution}>
                          {institution}
                        </option>
                      ))}
                    </select>
                  </ColumnFilterPopover>
                </div>
              </th>
              <th className="px-3 py-2">
                <div className="flex items-center gap-1">
                  Responsável
                  <SortButton
                    active={sort.column === 'responsible'}
                    direction={sort.direction}
                    onClick={() => handleSortClick('responsible')}
                  />
                  <ColumnFilterPopover
                    isOpen={openFilterColumn === 'responsible'}
                    onOpenChange={(open) => setOpenFilterColumn(open ? 'responsible' : null)}
                    isActive={filter?.column === 'responsible'}
                  >
                    <select
                      value={filter?.column === 'responsible' ? filter.value : 'all'}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilter(value === 'all' ? null : { column: 'responsible', value: value as Responsible });
                        closeFilterPopover();
                      }}
                      className="w-32 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    >
                      <option value="all">Todos</option>
                      {RESPONSIBLE_VALUES.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </ColumnFilterPopover>
                </div>
              </th>
              <th className="px-3 py-2">
                <div className="flex items-center gap-1">
                  Formato
                  <SortButton
                    active={sort.column === 'format'}
                    direction={sort.direction}
                    onClick={() => handleSortClick('format')}
                  />
                  <ColumnFilterPopover
                    isOpen={openFilterColumn === 'format'}
                    onOpenChange={(open) => setOpenFilterColumn(open ? 'format' : null)}
                    isActive={filter?.column === 'format'}
                  >
                    <select
                      value={filter?.column === 'format' ? filter.value : 'all'}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilter(value === 'all' ? null : { column: 'format', value });
                        closeFilterPopover();
                      }}
                      className="w-40 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    >
                      <option value="all">Todos</option>
                      {knownFormats.map((format) => (
                        <option key={format} value={format}>
                          {format}
                        </option>
                      ))}
                    </select>
                  </ColumnFilterPopover>
                </div>
              </th>
              <th className="px-3 py-2">
                <div className="flex items-center gap-1">
                  Empresa
                  <SortButton
                    active={sort.column === 'company'}
                    direction={sort.direction}
                    onClick={() => handleSortClick('company')}
                  />
                  <ColumnFilterPopover
                    isOpen={openFilterColumn === 'company'}
                    onOpenChange={(open) => setOpenFilterColumn(open ? 'company' : null)}
                    isActive={filter?.column === 'company'}
                  >
                    <CompanyFilterCombobox
                      knownCompanies={knownCompanies}
                      initialQuery={filter?.column === 'company' ? filter.query : ''}
                      onApply={(query) => {
                        setFilter(query.trim() === '' ? null : { column: 'company', query });
                        closeFilterPopover();
                      }}
                      onClear={() => {
                        setFilter(null);
                        closeFilterPopover();
                      }}
                    />
                  </ColumnFilterPopover>
                </div>
              </th>
              <th className="px-3 py-2">
                <div className="flex items-center gap-1">
                  Categoria
                  <SortButton
                    active={sort.column === 'category'}
                    direction={sort.direction}
                    onClick={() => handleSortClick('category')}
                  />
                  <ColumnFilterPopover
                    isOpen={openFilterColumn === 'category'}
                    onOpenChange={(open) => setOpenFilterColumn(open ? 'category' : null)}
                    isActive={filter?.column === 'category'}
                  >
                    <select
                      value={filter?.column === 'category' ? filter.value : 'all'}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilter(value === 'all' ? null : { column: 'category', value });
                        closeFilterPopover();
                      }}
                      className="w-40 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    >
                      <option value="all">Todas</option>
                      <option value={NO_CATEGORY}>Sem categoria</option>
                      {knownCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </ColumnFilterPopover>
                </div>
              </th>
              <th className="px-3 py-2">Parcela</th>
              <th className="px-3 py-2">
                <div className="flex items-center gap-1">
                  Valor
                  <SortButton
                    active={sort.column === 'value'}
                    direction={sort.direction}
                    onClick={() => handleSortClick('value')}
                  />
                  <ColumnFilterPopover
                    isOpen={openFilterColumn === 'value'}
                    onOpenChange={(open) => setOpenFilterColumn(open ? 'value' : null)}
                    isActive={filter?.column === 'value'}
                  >
                    <RangeFilterFields
                      minLabel="Valor mínimo"
                      maxLabel="Valor máximo"
                      initialMin={filter?.column === 'value' ? filter.min : null}
                      initialMax={filter?.column === 'value' ? filter.max : null}
                      onApply={(min, max) => {
                        setFilter(min === null && max === null ? null : { column: 'value', min, max });
                        closeFilterPopover();
                      }}
                      onClear={() => {
                        setFilter(null);
                        closeFilterPopover();
                      }}
                    />
                  </ColumnFilterPopover>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {visibleTransactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  Nenhuma transação encontrada com esse filtro.
                </td>
              </tr>
            ) : (
              visibleTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="whitespace-nowrap px-3 py-2">{formatDateBR(transaction.date)}</td>
                  <td className="whitespace-nowrap px-3 py-2 capitalize">{transaction.type}</td>
                  <td className="whitespace-nowrap px-3 py-2">{transaction.institution}</td>
                  <td className="whitespace-nowrap px-3 py-2">{getResponsible(transaction)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{transaction.format}</td>
                  <td className="px-3 py-2">
                    <SuggestionSelect
                      value={transaction.company}
                      options={knownCompanies}
                      onChange={(newCompany) => handleCompanyChange(transaction.id, newCompany)}
                      newOptionLabel="+ Nova empresa..."
                      newOptionPlaceholder="Nome da empresa"
                    />
                    <div
                      className="mt-1 max-w-[220px] truncate text-xs text-neutral-400 dark:text-neutral-500"
                      title={transaction.description}
                    >
                      {transaction.description}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <SuggestionSelect
                      value={transaction.category}
                      options={knownCategories}
                      onChange={(newCategory) => handleCategoryChange(transaction.id, newCategory)}
                      newOptionLabel="+ Nova categoria..."
                      newOptionPlaceholder="Nome da categoria"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{transaction.installment ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {transaction.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
