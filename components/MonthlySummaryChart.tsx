'use client';

// Gráfico de barras do "Resumo mensal": total gasto por categoria no mês
// selecionado, já ordenado de forma decrescente pelo componente que chama
// este (app/analises/page.tsx). Usa Recharts, que faz o desenho do SVG e a
// interatividade (tooltip ao passar o mouse) por baixo dos panos.

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface MonthlySummaryChartProps {
  data: { category: string; total: number }[];
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Recharts passa o valor tipado de forma bem genérica (pode ser number,
// string, ou até um array) para formatters de tooltip/label. Como aqui o
// valor sempre vem de dataKey="total" (um number), convertemos com segurança.
function formatCurrencyValue(value: unknown): string {
  return typeof value === 'number' ? currencyFormatter.format(value) : String(value ?? '');
}

export default function MonthlySummaryChart({ data }: MonthlySummaryChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-neutral-500">Nenhum gasto registrado neste mês.</p>;
  }

  // Altura proporcional ao número de categorias, para as barras não ficarem
  // espremidas quando há muitas nem esticadas demais quando há poucas.
  const chartHeight = Math.max(120, data.length * 48);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 96, bottom: 8, left: 8 }}>
        <CartesianGrid horizontal={false} stroke="#e1e0d9" />
        <XAxis
          type="number"
          tickFormatter={formatCurrencyValue}
          tick={{ fill: '#898781', fontSize: 12 }}
          axisLine={{ stroke: '#c3c2b7' }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="category"
          width={140}
          tick={{ fill: '#52514e', fontSize: 13 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={formatCurrencyValue}
          cursor={{ fill: '#f9f9f7' }}
          contentStyle={{ borderRadius: 8, borderColor: '#e1e0d9', fontSize: 13 }}
        />
        <Bar dataKey="total" fill="#2a78d6" radius={[0, 4, 4, 0]} barSize={22} maxBarSize={24}>
          <LabelList
            dataKey="total"
            position="right"
            formatter={formatCurrencyValue}
            fill="#52514e"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
