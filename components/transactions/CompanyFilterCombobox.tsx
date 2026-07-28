'use client';

// Campo de busca com autocomplete para o filtro de Empresa no header da
// tabela de Transações. Diferente do SuggestionSelect (usado pra editar a
// Empresa de uma transação), aqui o usuário digita um texto livre — não
// precisa bater com uma opção exata da lista — e a lista de sugestões
// (Empresas normalizadas já conhecidas) é só um atalho pra preencher mais
// rápido. Aplicar (Enter ou clicar numa sugestão) casa por substring contra
// o nome da Empresa das transações, não contra a Descrição bruta.

import { useState } from 'react';

interface CompanyFilterComboboxProps {
  knownCompanies: string[];
  initialQuery: string;
  onApply: (query: string) => void;
  onClear: () => void;
}

export default function CompanyFilterCombobox({
  knownCompanies,
  initialQuery,
  onApply,
  onClear,
}: CompanyFilterComboboxProps) {
  const [query, setQuery] = useState(initialQuery);

  const normalizedQuery = query.trim().toLowerCase();
  const suggestions =
    normalizedQuery === ''
      ? []
      : knownCompanies.filter((company) => company.toLowerCase().includes(normalizedQuery)).slice(0, 8);

  function apply(value: string) {
    setQuery(value);
    onApply(value);
  }

  return (
    <div className="flex w-56 flex-col gap-2">
      <input
        type="text"
        autoFocus
        value={query}
        placeholder="Buscar empresa..."
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') apply(query);
        }}
        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      />
      {suggestions.length > 0 && (
        <ul className="max-h-40 overflow-auto rounded-md border border-neutral-200 text-sm dark:border-neutral-800">
          {suggestions.map((company) => (
            <li key={company}>
              <button
                onClick={() => apply(company)}
                className="block w-full px-2 py-1 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                {company}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => apply(query)}
          className="flex-1 rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Aplicar
        </button>
        <button
          onClick={() => {
            setQuery('');
            onClear();
          }}
          className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
