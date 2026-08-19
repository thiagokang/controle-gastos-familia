'use client';

// Gráfico de linhas do "Histórico por categoria": saldo líquido por mês,
// para todos os meses disponíveis nos dados. A linha "Saldo líquido" (a
// agregada, de todas as categorias) só aparece quando NENHUMA categoria
// está selecionada — com 1+ categoria(s) selecionada(s), ela some por
// completo (não fica em estilo secundário/tracejado): sua ordem de
// grandeza costuma ser bem maior que a de uma categoria individual, o que
// achatava visualmente as flutuações das categorias quando as duas
// apareciam juntas. Como o eixo Y do Recharts calcula sua escala a partir
// só das linhas de fato renderizadas, tirar a linha agregada do ar também
// resolve a escala sozinho — sem precisar fixar um domain manualmente (ver
// hasSelection abaixo). Desmarcar todas as categorias volta a mostrar a
// linha "Saldo líquido" automaticamente, sem precisar de um botão "limpar
// seleção" — é só a mesma condição (hasSelection) virando falsa de novo.
//
// Cada categoria selecionada (estado guardado por CategoryHistoryAnalysis)
// vira sua própria linha, com cor distinta. Usa Recharts, mesma biblioteca
// do Resumo mensal (ver MonthlySummaryChart), pelos mesmos motivos: desenha
// o SVG e cuida da interatividade (tooltip) por baixo dos panos.
//
// Cor por categoria: cada categoria conhecida recebe um índice FIXO (ver
// categoryColorIndex, montado por CategoryHistoryAnalysis a partir da lista
// completa de categorias, não só as selecionadas) — assim, uma categoria
// sempre aparece na mesma cor no gráfico, não importa quais outras estão
// selecionadas no momento (selecionar/desmarcar uma categoria não repinta
// as demais já visíveis).
//
// Linha simples (não stacked/area) de propósito — ver docs/PRD.md,
// "Histórico por categoria", para o raciocínio completo: stacked só faz
// sentido com todas as categorias selecionadas, e área preenchida com
// múltiplas categorias sobrepostas tem problema de oclusão visual.

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTheme } from './ThemeProvider';
import type { MonthlyCategoryPoint } from '@/lib/categoryHistory';

interface CategoryHistoryChartProps {
  data: MonthlyCategoryPoint[];
  selectedCategories: string[];
  categoryColorIndex: Map<string, number>;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Mesma paleta categórica validada usada no app (ver skill de dataviz). O
// slot 1 (azul) é reservado pra linha "Saldo líquido" — mesma cor já usada
// nas barras do Resumo mensal (ver MonthlySummaryChart) — e os 7 slots
// seguintes servem às categorias selecionadas.
const CHART_PALETTES = {
  light: {
    grid: '#e1e0d9',
    axisTick: '#898781',
    axisLine: '#c3c2b7',
    tooltipBg: '#fcfcfb',
    tooltipBorder: '#e1e0d9',
    labelText: '#52514e',
    totalMain: '#2a78d6',
    categories: ['#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  },
  dark: {
    grid: '#2c2c2a',
    axisTick: '#a3a29c',
    axisLine: '#52514e',
    tooltipBg: '#1a1a19',
    tooltipBorder: '#3a3a38',
    labelText: '#d4d3ce',
    totalMain: '#5b9bdb',
    categories: ['#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
  },
} as const;

// Ver comentário equivalente em MonthlySummaryChart: o Recharts tipa o
// valor recebido por formatters de forma bem genérica.
function formatCurrencyValue(value: unknown): string {
  return typeof value === 'number' ? currencyFormatter.format(value) : String(value ?? '');
}

export default function CategoryHistoryChart({
  data,
  selectedCategories,
  categoryColorIndex,
}: CategoryHistoryChartProps) {
  const { resolvedTheme } = useTheme();
  const palette = CHART_PALETTES[resolvedTheme];
  const hasSelection = selectedCategories.length > 0;

  // Formato "wide" que o Recharts espera para múltiplas linhas: uma linha
  // por mês, com uma chave por série visível (total + cada categoria
  // selecionada). Categoria sem transação naquele mês vira 0 (saldo líquido
  // vazio), não um ponto ausente.
  const chartData = data.map((point) => {
    const row: Record<string, string | number> = { label: point.label, __total: point.total };
    for (const category of selectedCategories) {
      row[category] = point.byCategory[category] ?? 0;
    }
    return row;
  });

  function colorForCategory(category: string): string {
    const index = categoryColorIndex.get(category) ?? 0;
    return palette.categories[index % palette.categories.length];
  }

  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={palette.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: palette.axisTick, fontSize: 12 }}
          axisLine={{ stroke: palette.axisLine }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCurrencyValue}
          tick={{ fill: palette.axisTick, fontSize: 12 }}
          axisLine={{ stroke: palette.axisLine }}
          tickLine={false}
          width={80}
        />
        <Tooltip
          formatter={formatCurrencyValue}
          contentStyle={{
            borderRadius: 8,
            borderColor: palette.tooltipBorder,
            backgroundColor: palette.tooltipBg,
            color: palette.labelText,
            fontSize: 13,
          }}
        />
        {hasSelection && <Legend wrapperStyle={{ fontSize: 12, color: palette.labelText }} />}
        {!hasSelection && (
          <Line
            dataKey="__total"
            name="Saldo líquido"
            stroke={palette.totalMain}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        )}
        {selectedCategories.map((category) => (
          <Line
            key={category}
            dataKey={category}
            name={category}
            stroke={colorForCategory(category)}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
