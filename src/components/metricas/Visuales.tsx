import type { ReactNode } from 'react'
import {
  Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { ArrowSquareOut } from '@phosphor-icons/react'
import { fuentes, type Fuente } from '../../data/fuentesMendoza'
import { chartTooltip, Contador, numero, useAnimacion } from '../ConsumoVisual'

export const colores = { azul: 'var(--blue)', cyan: '#20a8c8', verde: '#1ca489', historial: '#8395b3', previo: '#9a6cdb' }

export function FuenteOficial({ fuente }: { fuente: Fuente }) {
  const documento = fuentes[fuente]
  return <a className="source-link" href={documento.urlFuente} target="_blank" rel="noopener noreferrer"
    aria-label={`Ver fuente oficial: ${documento.documento} (abre en otra pestaña)`}>
    Ver fuente oficial <ArrowSquareOut size={13} aria-hidden="true" />
  </a>
}

export function Marco({ titulo, fuente, nota, children }: {
  titulo: string; fuente: Fuente; nota?: string; children: ReactNode
}) {
  return <section className="surface section-pad mza-card">
    <header className="mza-card-heading"><h2>{titulo}</h2><FuenteOficial fuente={fuente} /></header>
    {nota && <p className="chart-caption">{nota}</p>}
    {children}
  </section>
}

export function Cifra({ titulo, valor, unidad, fuente, nota, animar = false }: {
  titulo: string; valor: number | string; unidad?: string; fuente: Fuente; nota?: string; animar?: boolean
}) {
  return <article className="surface metric">
    <h2>{titulo}</h2>
    <strong>{typeof valor === 'number' ? animar ? <Contador valor={valor} /> : numero.format(valor) : valor}
      {unidad && <small> {unidad}</small>}
    </strong>
    {nota && <p>{nota}</p>}
    <FuenteOficial fuente={fuente} />
  </article>
}

export type Fila = { nombre: string; [clave: string]: string | number | null }
type Serie = { clave: string; nombre: string; color?: string }

export function Barras({ filas, series, unidad, horizontal = true, apiladas = false, referencia, altura }: {
  filas: Fila[]; series: Serie[]; unidad: string; horizontal?: boolean; apiladas?: boolean;
  referencia?: number; altura?: number
}) {
  const animar = useAnimacion()
  const tick = { fill: 'var(--muted)', fontSize: 11 }
  const textoCorto = (valor: string) => valor.length > 21 ? valor.slice(0, 19) + '…' : valor
  if (!filas.some(fila => series.some(serie => typeof fila[serie.clave] === 'number'))) {
    return <p className="mza-empty muted">Sin datos para esta selección.</p>
  }

  return <div className="mza-chart" style={{ height: altura ?? (horizontal ? Math.max(130, filas.length * 34 + 55) : 240) }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={filas} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" horizontal={!horizontal} vertical={horizontal} />
        <XAxis type={horizontal ? 'number' : 'category'} dataKey={horizontal ? undefined : 'nombre'}
          tickFormatter={horizontal ? valor => numero.format(valor) : textoCorto} tick={tick} axisLine={false} tickLine={false} />
        <YAxis type={horizontal ? 'category' : 'number'} dataKey={horizontal ? 'nombre' : undefined}
          tickFormatter={horizontal ? textoCorto : valor => numero.format(valor)} tick={tick}
          width={horizontal ? 116 : 54} interval={0} axisLine={false} tickLine={false} />
        {referencia !== undefined && (horizontal
          ? <ReferenceLine x={referencia} stroke="var(--muted)" strokeDasharray="4 4" />
          : <ReferenceLine y={referencia} stroke="var(--muted)" strokeDasharray="4 4" />)}
        <Tooltip contentStyle={chartTooltip} cursor={{ fill: 'var(--field)', opacity: 0.5 }}
          formatter={(valor: number) => `${numero.format(valor)} ${unidad}`} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map(({ clave, nombre, color }) => (
          <Bar key={clave} dataKey={clave} name={nombre} fill={color ?? colores.azul}
            stackId={apiladas ? 'total' : undefined} radius={apiladas ? 0 : 4}
            maxBarSize={36} isAnimationActive={animar} animationBegin={0} animationDuration={330} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  </div>
}

export function SinDatos({ filas }: { filas: Fila[] }) {
  const faltantes = filas.filter(fila => fila.valor === null)
  return faltantes.length > 0 ? <p className="chart-caption">Sin dato: {faltantes.map(fila => fila.nombre).join(', ')}.</p> : null
}
