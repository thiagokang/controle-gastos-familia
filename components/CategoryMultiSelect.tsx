'use client';

// Dropdown multi-select com checkboxes para escolher categorias no
// Histórico por categoria. Não usa chips clicáveis: hoje já existem 27
// categorias (com tendência de crescer), o que ficaria visualmente poluído
// nesse formato — ver docs/PRD.md, "Histórico por categoria". "Sem
// categoria" entra na lista como mais uma opção normal (quem monta a lista
// decide a posição — ver components/CategoryHistoryAnalysis.tsx), mesmo
// padrão já usado no filtro de Categoria da tela de Transações.

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CategoryMultiSelectProps {
  categories: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

export default function CategoryMultiSelect({ categories, selected, onChange }: CategoryMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  function toggle(category: string) {
    onChange(selected.includes(category) ? selected.filter((c) => c !== category) : [...selected, category]);
  }

  const buttonLabel =
    selected.length === 0
      ? 'Selecionar categorias'
      : `${selected.length} ${selected.length === 1 ? 'categoria selecionada' : 'categorias selecionadas'}`;

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        onClick={() => setIsOpen((open) => !open)}
        className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
          selected.length > 0
            ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
            : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'
        }`}
      >
        {buttonLabel}
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-1 max-h-72 w-64 overflow-auto rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="mb-1 w-full rounded-md px-2 py-1 text-left text-xs font-medium text-blue-600 hover:bg-neutral-100 dark:text-blue-400 dark:hover:bg-neutral-800"
            >
              Limpar seleção
            </button>
          )}
          <ul className="flex flex-col">
            {categories.map((category) => (
              <li key={category}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
                  <input
                    type="checkbox"
                    checked={selected.includes(category)}
                    onChange={() => toggle(category)}
                    className="h-3.5 w-3.5 rounded border-neutral-300 dark:border-neutral-600"
                  />
                  {category}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
