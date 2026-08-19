'use client';

// Aviso colapsável reutilizável: mostra só um resumo por padrão (recolhido)
// e, ao clicar, expande pra revelar os detalhes (children). Usado tanto
// pelo aviso de categorias com saldo negativo do Resumo mensal (ver
// app/analises/resumo-mensal/page.tsx) quanto pelo aviso de linhas
// inválidas na tela de revisão do upload (ver components/UploadFlow.tsx) —
// mesmo componente nos dois lugares, por pedido explícito, pra manter a
// experiência consistente entre eles.
//
// Aceita children vindos de um Server Component (ex: uma lista de <Link>
// montada em app/analises/resumo-mensal/page.tsx): passar JSX já renderizado
// no servidor como children de um Client Component é um padrão suportado
// pelo App Router, não exige que o conteúdo em si seja "client".

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleWarningProps {
  summary: string;
  children: React.ReactNode;
}

export default function CollapsibleWarning({ summary, children }: CollapsibleWarningProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-900/30 dark:text-amber-300">
      <button
        onClick={() => setIsExpanded((current) => !current)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium"
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {summary}
      </button>
      {isExpanded && <div className="border-t border-amber-200 px-3 py-2 dark:border-amber-900">{children}</div>}
    </div>
  );
}
