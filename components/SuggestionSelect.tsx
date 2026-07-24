'use client';

// Dropdown genérico reaproveitado para Categoria E Empresa, tanto na tela de
// revisão do upload quanto na edição inline da tela de Transações. Além das
// opções já conhecidas, sempre mostra uma opção "+ Nova ..." que revela um
// campo de texto — assim o usuário não fica preso à lista existente. Quem
// usa este componente decide os textos (newOptionLabel/newOptionPlaceholder)
// para caber tanto "+ Nova categoria..." quanto "+ Nova empresa...".

import { useState } from 'react';

interface SuggestionSelectProps {
  value: string;
  options: string[];
  onChange: (newValue: string) => void;
  newOptionLabel: string;
  newOptionPlaceholder: string;
  className?: string;
}

const CREATE_NEW_OPTION = '__criar_nova_opcao__';

export default function SuggestionSelect({
  value,
  options,
  onChange,
  newOptionLabel,
  newOptionPlaceholder,
  className,
}: SuggestionSelectProps) {
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Garante que o valor atual da linha sempre aparece como opção, mesmo que
  // ele ainda não esteja na lista de opções conhecidas.
  const allOptions = value && !options.includes(value) ? [value, ...options] : options;

  if (isCreatingNew) {
    return (
      <input
        type="text"
        autoFocus
        placeholder={newOptionPlaceholder}
        defaultValue=""
        className={`rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 ${className ?? ''}`}
        onBlur={(e) => {
          const typed = e.target.value.trim();
          if (typed) onChange(typed);
          setIsCreatingNew(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const typed = e.currentTarget.value.trim();
            if (typed) onChange(typed);
            setIsCreatingNew(false);
          }
          if (e.key === 'Escape') setIsCreatingNew(false);
        }}
      />
    );
  }

  return (
    <select
      value={value === '' ? '' : value}
      className={`rounded-md border border-neutral-300 px-2 py-1 text-sm ${className ?? ''}`}
      onChange={(e) => {
        if (e.target.value === CREATE_NEW_OPTION) {
          setIsCreatingNew(true);
          return;
        }
        onChange(e.target.value);
      }}
    >
      <option value="" disabled>
        Selecione...
      </option>
      <option value={CREATE_NEW_OPTION}>{newOptionLabel}</option>
      {allOptions.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
