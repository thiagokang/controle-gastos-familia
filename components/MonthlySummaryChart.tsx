'use client';

// Gráfico de barras do "Resumo mensal": total gasto por categoria no mês
// selecionado, já ordenado de forma decrescente pelo componente que chama
// este (components/MonthlySummaryAnalysis.tsx). Usa Recharts, que faz o
// desenho do SVG e a interatividade (tooltip ao passar o mouse) por baixo
// dos panos.
//
// As barras são clicáveis (drill-down de transações — ver
// MonthlySummaryAnalysis, que é quem guarda o estado de seleção e decide o
// que mostrar abaixo do gráfico). Este componente fica só com a
// apresentação: destaca a barra selecionada, dá feedback de hover, e avisa
// o componente pai via onCategoryClick quando uma barra é clicada.
//
// Também avisa o pai (via onSelectedBarVisibilityChange) quando a barra
// selecionada entra/sai da área visível da tela, pra ele decidir quando
// mostrar a barra de resumo fixa (sticky) — ver MonthlySummaryAnalysis. Isso
// usa um IntersectionObserver, em vez de um valor fixo de scroll — assim
// funciona corretamente não importa a posição da categoria selecionada no
// gráfico.
//
// Importante: o observer NÃO fica em cima do <path> que o Recharts desenha
// pra barra. Recharts recria esses nós internamente (animação, re-render por
// causa do hover) e um observer apontando pro nó antigo, já removido do DOM,
// fica "preso" reportando o último estado que viu pra sempre. Em vez disso
// desenhamos nosso próprio <div> "sentinela" invisível, posicionado (via
// matemática simples: altura do gráfico ÷ número de categorias) na mesma
// altura da barra selecionada — esse <div> é só nosso, o React nunca o
// recria à toa, então o observer continua funcionando durante toda a
// seleção.

import { useEffect, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTheme } from './ThemeProvider';

interface MonthlySummaryChartProps {
  data: { category: string; total: number }[];
  selectedCategory: string | null;
  onCategoryClick: (category: string) => void;
  onSelectedBarVisibilityChange: (visible: boolean) => void;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Recharts recebe cores via props inline (stroke, fill), não via classes
// Tailwind — por isso não dá pra usar `dark:` aqui, e o componente precisa
// saber o tema atual via JS (ver useTheme) para escolher a paleta certa.
const CHART_PALETTES = {
  light: {
    grid: '#e1e0d9',
    axisTick: '#898781',
    axisLine: '#c3c2b7',
    tooltipCursor: '#f9f9f7',
    tooltipBorder: '#e1e0d9',
    labelText: '#52514e',
    bar: '#2a78d6',
    barSelected: '#123f7a',
  },
  dark: {
    grid: '#3a3a38',
    axisTick: '#a3a29c',
    axisLine: '#52514e',
    tooltipCursor: '#262624',
    tooltipBorder: '#3a3a38',
    labelText: '#d4d3ce',
    bar: '#5b9bdb',
    barSelected: '#bcdcff',
  },
} as const;

// Recharts passa o valor tipado de forma bem genérica (pode ser number,
// string, ou até um array) para formatters de tooltip/label. Como aqui o
// valor sempre vem de dataKey="total" (um number), convertemos com segurança.
function formatCurrencyValue(value: unknown): string {
  return typeof value === 'number' ? currencyFormatter.format(value) : String(value ?? '');
}

export default function MonthlySummaryChart({
  data,
  selectedCategory,
  onCategoryClick,
  onSelectedBarVisibilityChange,
}: MonthlySummaryChartProps) {
  const { resolvedTheme } = useTheme();
  const palette = CHART_PALETTES[resolvedTheme];
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedCategory || !sentinelRef.current) return;

    const observer = new IntersectionObserver(([entry]) => onSelectedBarVisibilityChange(entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [selectedCategory, onSelectedBarVisibilityChange]);

  if (data.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum gasto registrado neste mês.</p>;
  }

  // Altura proporcional ao número de categorias, para as barras não ficarem
  // espremidas quando há muitas nem esticadas demais quando há poucas.
  const chartHeight = Math.max(120, data.length * 48);
  const rowHeight = chartHeight / data.length;
  const selectedIndex = selectedCategory ? data.findIndex((entry) => entry.category === selectedCategory) : -1;

  return (
    <div className="relative">
      {selectedIndex >= 0 && (
        <div
          ref={sentinelRef}
          aria-hidden
          style={{ position: 'absolute', top: selectedIndex * rowHeight, height: rowHeight, left: 0, width: 1 }}
        />
      )}
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 96, bottom: 8, left: 8 }}>
          <CartesianGrid horizontal={false} stroke={palette.grid} />
          <XAxis
            type="number"
            tickFormatter={formatCurrencyValue}
            tick={{ fill: palette.axisTick, fontSize: 12 }}
            axisLine={{ stroke: palette.axisLine }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="category"
            width={140}
            tick={{ fill: palette.labelText, fontSize: 13 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={formatCurrencyValue}
            cursor={{ fill: palette.tooltipCursor }}
            contentStyle={{
              borderRadius: 8,
              borderColor: palette.tooltipBorder,
              backgroundColor: palette.tooltipCursor,
              color: palette.labelText,
              fontSize: 13,
            }}
          />
          <Bar
            dataKey="total"
            radius={[0, 4, 4, 0]}
            barSize={22}
            maxBarSize={24}
            cursor="pointer"
            onClick={(entry) => {
              const category = (entry as { category?: string }).category;
              if (category) onCategoryClick(category);
            }}
            onMouseEnter={(entry) => setHoveredCategory((entry as { category?: string }).category ?? null)}
            onMouseLeave={() => setHoveredCategory(null)}
          >
            {data.map((entry) => (
              <Cell
                key={entry.category}
                fill={entry.category === selectedCategory ? palette.barSelected : palette.bar}
                fillOpacity={entry.category === hoveredCategory && entry.category !== selectedCategory ? 0.75 : 1}
              />
            ))}
            <LabelList
              dataKey="total"
              position="right"
              formatter={formatCurrencyValue}
              fill={palette.labelText}
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
