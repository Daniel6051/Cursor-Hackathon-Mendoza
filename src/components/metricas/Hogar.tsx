import { useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { actividadesHogar, poblacion } from '../../data/mendozaHogar'
import { calcularHogar, type Actividad, type Canillas, type Frecuencia, type HabitosMendoza } from '../../lib/calculoMendoza'
import { chartTooltip, numero, useAnimacion } from '../ConsumoVisual'
import { Barras, Cifra, colores, Marco } from './Visuales'

const actividades: Record<Actividad, string> = {
  duchas: 'Duchas', descargas: 'Descargas', lavarropas: 'Lavados de ropa',
  platos: 'Lavados de platos', cepillados: 'Cepillados',
}
const claves = Object.keys(actividades) as Actividad[]
const inicial: HabitosMendoza = {
  duchas: { cantidad: 7, periodo: 'semana', alcance: 'persona' },
  descargas: { cantidad: 5, periodo: 'dia', alcance: 'persona' },
  lavarropas: { cantidad: 3, periodo: 'semana', alcance: 'hogar' },
  platos: { cantidad: 2, periodo: 'dia', alcance: 'hogar' },
  cepillados: { cantidad: 2, periodo: 'dia', alcance: 'persona' },
}
const opciones = ['Todas', 'Higiene', 'Limpieza', 'Electrodomésticos']
const paleta = ['#287bff', '#38bdf8', '#20bcae', '#8170f5', '#55ba87']
const { residencial, otros, neta, perdidas } = poblacion

function Canilla({ etiqueta, abierta, cambiar }: {
  etiqueta: string; abierta: boolean; cambiar: (abierta: boolean) => void
}) {
  return <label>{etiqueta}
    <select className="field" value={abierta ? 'abierta' : 'cerrada'} onChange={e => cambiar(e.target.value === 'abierta')}>
      <option value="abierta">Canilla abierta</option>
      <option value="cerrada">Cerrando la canilla</option>
    </select>
  </label>
}

function CanillasForm({ estado, cambiar }: { estado: Canillas; cambiar: (estado: Canillas) => void }) {
  return <div className="mza-fields">
    <Canilla etiqueta="Lavado de platos" abierta={estado.platos} cambiar={platos => cambiar({ ...estado, platos })} />
    <Canilla etiqueta="Cepillado" abierta={estado.cepillados} cambiar={cepillados => cambiar({ ...estado, cepillados })} />
  </div>
}

export function CalculadoraHogarMendoza() {
  const [personas, setPersonas] = useState('4')
  const [habitos, setHabitos] = useState(inicial)
  const [actual, setActual] = useState<Canillas>({ platos: true, cepillados: true })
  const [alternativo, setAlternativo] = useState<Canillas>({ platos: false, cepillados: false })
  const animar = useAnimacion()

  function editar(id: Actividad, cambio: Partial<Frecuencia>) {
    setHabitos(anterior => ({ ...anterior, [id]: { ...anterior[id], ...cambio } }))
  }

  const estimado = calcularHogar(Number(personas), habitos, actual)
  const escenario = calcularHogar(Number(personas), habitos, alternativo)
  const desglose = (estimado?.actividades ?? [])
    .map(({ id, litros }, indice) => ({ nombre: actividades[id], litros, color: paleta[indice] }))
    .filter(item => item.litros > 0)
  const ahorro = estimado && escenario ? estimado.diario - escenario.diario : 0
  const diferencia = poblacion.residencial.valor - (estimado?.porHabitante ?? 0)
  const comparacion = Math.abs(diferencia) < 0.05 ? 'Al nivel de la referencia histórica.' :
    `${numero.format(Math.abs(diferencia))} L/hab./día por ${diferencia > 0 ? 'debajo' : 'encima'} de la referencia histórica.`

  return <div className="flow">
    <Marco titulo="Calculadora del hogar" fuente="hogar"
      nota="Estimación de las actividades ingresadas. Podés editar los hábitos de ejemplo y elegir cómo contar cada frecuencia.">
      <label className="mza-filter">Habitantes
        <input className="field" type="number" min="1" step="1" value={personas} onChange={e => setPersonas(e.target.value)} />
      </label>
      <div className="mza-frequencies">
        {claves.map(id => {
          const frecuencia = habitos[id]
          return <fieldset className="mza-frequency" key={id}>
            <legend>{actividades[id]}</legend>
            <label>Cantidad
              <input className="field" type="number" min="0" step="any" inputMode="decimal"
                value={Number.isFinite(frecuencia.cantidad) ? frecuencia.cantidad : ''}
                onChange={e => editar(id, { cantidad: e.target.valueAsNumber })} />
            </label>
            <label>Período
              <select className="field" value={frecuencia.periodo} onChange={e => editar(id, { periodo: e.target.value as Frecuencia['periodo'] })}>
                <option value="dia">Por día</option><option value="semana">Por semana</option><option value="mes">Por mes</option>
              </select>
            </label>
            <label>Alcance
              <select className="field" value={frecuencia.alcance} onChange={e => editar(id, { alcance: e.target.value as Frecuencia['alcance'] })}>
                <option value="persona">Por persona</option><option value="hogar">Por hogar</option>
              </select>
            </label>
          </fieldset>
        })}
      </div>
      <h3 className="mza-subtitle">Hábitos actuales de la canilla</h3>
      <CanillasForm estado={actual} cambiar={setActual} />
      {!estimado && <p role="alert" className="feedback error mt-3">Ingresá al menos un habitante entero y frecuencias válidas, de cero o más.</p>}
    </Marco>
    {estimado && <div className="mza-grid mza-grid-3" aria-label="Resultados estimados del hogar">
      <Cifra titulo="Consumo diario estimado" valor={estimado.diario} unidad="L/día" fuente="hogar" nota="Total del hogar · Cinco actividades" animar />
      <Cifra titulo="Consumo mensual estimado" valor={estimado.mensual} unidad="L/mes" fuente="hogar" nota="Total del hogar · 30 días" animar />
      <Cifra titulo="Consumo estimado por habitante" valor={estimado.porHabitante} unidad="L/hab./día"
        fuente="demanda" nota={`${comparacion} La referencia de ${residencial.valor} L/hab./día equivale a ${numero.format(estimado.referenciaHogar)} L/día para este hogar.`} animar />
    </div>}
    <div className="mza-grid mza-grid-2">
      <Marco titulo="Composición del consumo familiar" fuente="hogar" nota="Cálculo de Gotea · Litros del hogar por día.">
        {estimado && desglose.length ? <div className="breakdown">
          <div className="donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={desglose} dataKey="litros" nameKey="nombre" innerRadius="60%" outerRadius="92%" stroke="none"
                  isAnimationActive={animar} animationBegin={0} animationDuration={350}>
                  {desglose.map(fila => <Cell key={fila.nombre} fill={fila.color} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltip} formatter={(valor: number) => `${numero.format(valor)} L/día`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="chart-legend">
            {desglose.map(fila => <li key={fila.nombre}>
              <i style={{ background: fila.color }} /><span>{fila.nombre} · {numero.format(fila.litros)} L</span>
              <strong>{numero.format(fila.litros / estimado.diario * 100)} %</strong>
            </li>)}
          </ul>
        </div> : <p className="mza-empty muted">{estimado ? 'Las actividades ingresadas suman 0 litros.' : 'Completá la calculadora para ver el desglose.'}</p>}
      </Marco>
      <Marco titulo="Escenario de ahorro" fuente="hogar"
        nota="Las frecuencias se mantienen. Cambiá el uso de la canilla para estimar la diferencia en litros por día.">
        <CanillasForm estado={alternativo} cambiar={setAlternativo} />
        {estimado && escenario && <>
          <Barras filas={[{ nombre: 'Hábitos actuales', valor: estimado.diario }, { nombre: 'Escenario alternativo', valor: escenario.diario }]}
            series={[{ clave: 'valor', nombre: 'Consumo del hogar' }]} unidad="L/día" />
          <p className="mza-result">{ahorro >= 0 ? 'Ahorro potencial' : 'Consumo adicional'} de {numero.format(Math.abs(ahorro))} L/día.</p>
        </>}
      </Marco>
    </div>
  </div>
}

export default function Hogar() {
  const [filtro, setFiltro] = useState('Todas')
  const filas = Object.values(actividadesHogar)
    .filter(item => filtro === 'Todas' || item.categoria === filtro)
    .map(item => ({ nombre: item.nombre, valor: item.valor }))
  return <div className="mza-grid mza-info-hogar">
    <div className="mza-summary-cards">
      {[residencial, otros, neta].map(dato => <Cifra key={dato.id} titulo={dato.nombre} valor={dato.valor}
        unidad={dato.unidad} fuente={dato.fuente} nota={dato.periodo} />)}
    </div>
      <Marco titulo="Referencias poblacionales" fuente="demanda"
        nota="La demanda neta de 352 L/hab./día, aportada por AYSAM, reúne 280 residenciales y 72 de otros usos.">
        <Barras filas={[{ nombre: 'Demanda neta', residencial: residencial.valor, otros: otros.valor }]}
          series={[{ clave: 'residencial', nombre: 'Residencial' }, { clave: 'otros', nombre: 'Otros usos', color: colores.cyan }]}
          unidad="L/hab./día" apiladas />
        <p className="chart-caption">El {perdidas.valor} % corresponde a pérdidas estimadas de la red de la cuenca del río Mendoza para 2022.</p>
      </Marco>
      <Marco titulo="Consumo por actividad" fuente="hogar" nota="Litros por acción completa según el material educativo de 2021. Para platos y cepillado se distingue si la canilla queda abierta o se cierra.">
        <label className="mza-filter">Actividad
          <select className="field" value={filtro} onChange={e => setFiltro(e.target.value)}>
            {opciones.map(opcion => <option key={opcion}>{opcion}</option>)}
          </select>
        </label>
        <Barras filas={filas} series={[{ clave: 'valor', nombre: 'Consumo orientativo' }]} unidad="L/acción" />
      </Marco>
  </div>
}
