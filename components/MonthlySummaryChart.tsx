'use client';

// Gráfico de barras do "Resumo mensal": total gasto por categoria no mês
// selecionado, já ordenado de forma decrescente pelo componente que chama
// este (app/analises/page.tsx). Usa Recharts, que faz o desenho do SVG e a
// interatividade (tooltip ao passar o mouse) por baixo dos panos.

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTheme } from './ThemeProvider';

interface MonthlySummaryChartProps {
  data: { category: string; total: number }[];
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
  },
  dark: {
    grid: '#3a3a38',
    axisTick: '#a3a29c',
    axisLine: '#52514e',
    tooltipCursor: '#262624',
    tooltipBorder: '#3a3a38',
    labelText: '#d4d3ce',
    bar: '#5b9bdb',
  },
} as const;

// Recharts passa o valor tipado de forma bem genérica (pode ser number,
// string, ou até um array) para formatters de tooltip/label. Como aqui o
// valor sempre vem de dataKey="total" (um number), convertemos com segurança.
function formatCurrencyValue(value: unknown): string {
  return typeof value === 'number' ? currencyFormatter.format(value) : String(value ?? '');
}

export default function MonthlySummaryChart({ data }: MonthlySummaryChartProps) {
  const { resolvedTheme } = useTheme();
  const palette = CHART_PALETTES[resolvedTheme];

  if (data.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum gasto registrado neste mês.</p>;
  }

  // Altura proporcional ao número de categorias, para as barras não ficarem
  // espremidas quando há muitas nem esticadas demais quando há poucas.
  const chartHeight = Math.max(120, data.length * 48);

  return (
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
        <Bar dataKey="total" fill={palette.bar} radius={[0, 4, 4, 0]} barSize={22} maxBarSize={24}>
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
  );
}
