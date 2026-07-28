'use client';

// Formulário de filtro por faixa (mínimo/máximo), reaproveitado tanto pelo
// filtro de Valor quanto pelo de Data (que filtra por dia do mês, não por
// valor em R$ — daí os rótulos serem configuráveis). Só aplica de fato ao
// clicar em "Aplicar": digitar nos campos não atualiza o filtro sozinho,
// porque teria que digitar min E max antes de fazer sentido filtrar.

import { useState } from 'react';

interface RangeFilterFieldsProps {
  minLabel: string;
  maxLabel: string;
  initialMin: number | null;
  initialMax: number | null;
  onApply: (min: number | null, max: number | null) => void;
  onClear: () => void;
}

export default function RangeFilterFields({
  minLabel,
  maxLabel,
  initialMin,
  initialMax,
  onApply,
  onClear,
}: RangeFilterFieldsProps) {
  const [min, setMin] = useState(initialMin === null ? '' : String(initialMin));
  const [max, setMax] = useState(initialMax === null ? '' : String(initialMax));

  return (
    <div className="flex w-48 flex-col gap-2">
      <label className="text-xs text-neutral-500 dark:text-neutral-400">
        {minLabel}
        <input
          type="number"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />
      </label>
      <label className="text-xs text-neutral-500 dark:text-neutral-400">
        {maxLabel}
        <input
          type="number"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => onApply(min === '' ? null : Number(min), max === '' ? null : Number(max))}
          className="flex-1 rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Aplicar
        </button>
        <button
          onClick={() => {
            setMin('');
            setMax('');
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
