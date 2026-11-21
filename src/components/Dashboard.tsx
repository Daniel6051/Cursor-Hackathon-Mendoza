import { ArrowUpRight, CalendarDots, Drop, Leaf, Target } from '@phosphor-icons/react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Contador, chartTooltip, numero, useAnimacion } from './ConsumoVisual'
import { calcular } from '../lib/calculo'
import { aplicarConsejo, consejosFallback, topUsos } from '../lib/fallback'
import type { Desglose, Habitos, Resultado } from '../types'

export type Registro = { fecha: number; habitos: Habitos }

export const fechaRegistro = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' })
const fechaGrafico = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })
const actividades: Record<keyof Desglose, [string, string]> = {
  ducha: ['Ducha', '#287BFF'],
  inodoro: ['Inodoro', '#38BDF8'],
  lavarropas: ['Lavarropas', '#20C4BA'],
  platos: ['Platos', '#8170F5'],
  riego: ['Riego', '#55BA87'],
  auto: ['Auto', '#F1A84D'],
  perdidas: ['Pérdidas', '#E677AE'],
}

type Props = {
  resultado: Resultado
  habitos: Habitos
  registros: Registro[]
  meta: number | null
  logo: string
  abrir: (destino: 'calculadora' | 'recomendaciones' | 'metas') => void
}

export default function Dashboard({ resultado, habitos, registros, meta, logo, abrir }: Props) {
  const animar = useAnimacion()
  const { totalLPersonaDia: total, desglose } = resultado
  const mejorados = topUsos(resultado).reduce((actual, uso) => aplicarConsejo(uso, actual), habitos)
  const ahorro = Math.max(0, total - calcular(mejorados).totalLPersonaDia) * habitos.personas * 30
  const indicadores = [
    { titulo: 'Consumo diario', valor: total, unidad: 'L por persona', icono: Drop, acento: 'azul' },
    { titulo: 'Consumo mensual', valor: total * habitos.personas * 30, unidad: 'L en tu hogar · 30 días', icono: CalendarDots, acento: 'violeta' },
    { titulo: 'Ahorro potencial', valor: ahorro, unidad: 'L al mes en tu hogar', icono: Leaf, acento: 'verde' },
    { titulo: 'Meta diaria', valor: meta, unidad: meta === null ? 'Sin establecer' : 'L por persona', icono: Target, acento: 'ambar' },
  ]
  const consumo = (Object.keys(actividades) as (keyof Desglose)[])
    .filter(uso => desglose[uso] > 0)
    .sort((a, b) => desglose[b] - desglose[a])
    .map(uso => ({ nombre: actividades[uso][0], color: actividades[uso][1], litros: desglose[uso] }))
  const evolucion = registros.slice(0, 10).reverse().map(({ fecha, habitos }) => ({
    fecha,
    litros: calcular(habitos).totalLPersonaDia,
  }))
  const consejo = consejosFallback(resultado)[0]

  return (
    <div className="screen dashboard">
      <div className="page-heading surface dashboard-heading">
        <div>
          <h1>Hola, familia</h1>
          <p>{registros.length ? 'Este es tu resumen de consumo de agua.' : 'Esta es una estimación inicial. Cargá tus hábitos para ver el consumo de tu hogar.'}</p>
          <button className="button button-primary mt-4" onClick={() => abrir('calculadora')}><Drop size={17} /> Calcular consumo</button>
        </div>
        <img className="dashboard-emblem" src={logo} alt="" />
      </div>
      <div className="metric-grid">
        {indicadores.map(({ titulo, valor, unidad, icono: Icono, acento }) => (
          <article className="surface metric" key={titulo}>
            <span className={`icon-tile ${acento}`}><Icono size={20} /></span>
            <h2>{titulo}</h2>
            {valor !== null && <strong><Contador valor={valor} /><small> L</small></strong>}
            <p>{unidad}</p>
          </article>
        ))}
      </div>
      <div className="chart-grid">
        <section className="surface chart-card">
          <h2>Consumo por actividad</h2>
          <div className="breakdown">
            <div className="donut">
              {consumo.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={consumo} nameKey="nombre" dataKey="litros" innerRadius="65%" outerRadius="93%" stroke="none" isAnimationActive={animar} animationBegin={0} animationDuration={430}>
                      {consumo.map(({ nombre, color }) => <Cell key={nombre} fill={color} />)}
                    </Pie>
                    <Tooltip contentStyle={chartTooltip} formatter={(valor: number) => `${numero.format(valor)} L`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="donut-total"><strong>{numero.format(total)} L</strong><span>por persona al día</span></div>
            </div>
            {consumo.length > 0 ? (
              <ul className="chart-legend">
                {consumo.map(({ nombre, color, litros }) => (
                  <li key={nombre}><i style={{ background: color }} /><span>{nombre}</span><strong>{Math.round(litros / total * 100)}%</strong></li>
                ))}
              </ul>
            ) : <p className="muted">Los hábitos cargados suman 0 litros.</p>}
          </div>
        </section>
        <section className="surface chart-card">
          <h2>Evolución del consumo</h2>
          <p className="chart-caption">Litros por persona por día</p>
          {evolucion.length > 0 ? (
            <div className="trend-chart" aria-label="Gráfico del historial de consumo">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucion} margin={{ top: 14, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="relleno-evolucion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--blue)" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="var(--blue)" stopOpacity={0.015} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="fecha" tickFormatter={fecha => fechaGrafico.format(fecha)} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={15} padding={{ left: 12, right: 10 }} />
                  <YAxis domain={[0, 'auto']} width={41} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltip} labelFormatter={fecha => fechaRegistro.format(Number(fecha))} formatter={(valor: number) => [`${numero.format(valor)} L`, 'Consumo']} />
                  <Area type="monotone" dataKey="litros" stroke="var(--blue)" strokeWidth={2.5} fill="url(#relleno-evolucion)" dot={{ r: 3, fill: 'var(--surface)', strokeWidth: 2 }} isAnimationActive={animar} animationDuration={440} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="trend-empty">
              <p>Todavía no hay registros</p>
              <span>El gráfico se completa con tus cálculos guardados.</span>
            </div>
          )}
        </section>
      </div>
      <div className="chart-grid">
        <section className="surface action-panel">
          <span className="icon-tile verde"><Leaf size={20} /></span>
          <div><h2>Recomendaciones</h2><p>{consejo.titulo}</p></div>
          <button className="icon-button" aria-label="Ver recomendaciones" onClick={() => abrir('recomendaciones')}><ArrowUpRight size={20} /></button>
        </section>
        <section className="surface action-panel">
          <span className="icon-tile ambar"><Target size={20} /></span>
          <div><h2>Meta de consumo</h2><p>{meta === null ? 'Definí cuántos litros por día querés usar.' : total <= meta ? 'Estás dentro de tu meta.' : `Te faltan reducir ${numero.format(total - meta)} L por persona al día.`}</p></div>
          <button className="icon-button" aria-label="Ver meta de consumo" onClick={() => abrir('metas')}><ArrowUpRight size={20} /></button>
        </section>
      </div>
    </div>
  )
}
