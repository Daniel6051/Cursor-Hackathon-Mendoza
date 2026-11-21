import { useRef, useState, type KeyboardEvent } from 'react'
import { BookOpen, House, Plant, Waves } from '@phosphor-icons/react'
import { fuentes, type Fuente } from '../../data/fuentesMendoza'
import Finca from './Finca'
import Hogar from './Hogar'
import Situacion from './Situacion'
import { FuenteOficial } from './Visuales'

const modulos = [
  { id: 'hogar', nombre: 'Hogar', icono: House, Contenido: Hogar },
  { id: 'finca', nombre: 'Finca', icono: Plant, Contenido: Finca },
  { id: 'situacion', nombre: 'Situación hídrica', icono: Waves, Contenido: Situacion },
] as const

type Modulo = (typeof modulos)[number]['id']

const notas: Record<Fuente, string> = {
  demanda: 'Los 280 L/hab./día remiten a una estimación de 2010. La tabla poblacional usa un escenario de 2022; el dato de AYSAM incluye usos residenciales y otros usos.',
  hogar: 'Los factores educativos se expresan en litros por acción. La calculadora usa siete días por semana y 30 por mes, y multiplica por habitantes solo las frecuencias declaradas por persona.',
  finca: 'Cada mm sobre una hectárea equivale a 10 m³. La demanda neta anual se obtiene con la superficie y la bruta se estima dividiendo por la eficiencia como fracción. Los datos ausentes se conservan como sin dato.',
  rios: 'Se distingue el escurrimiento registrado de los pronósticos. Los volúmenes corresponden a secciones de aforo. La publicación es de octubre de 2026 y la serie mostrada es estática.',
}

export default function MetricasMendoza() {
  const [activo, setActivo] = useState<Modulo>('hogar')
  const botones = useRef<Partial<Record<Modulo, HTMLButtonElement>>>({})
  const { Contenido } = modulos.find(modulo => modulo.id === activo) ?? modulos[0]

  function mover(e: KeyboardEvent<HTMLButtonElement>, indice: number) {
    const ultimo = modulos.length - 1
    const destinos: Record<string, number> = {
      ArrowLeft: indice === 0 ? ultimo : indice - 1,
      ArrowRight: indice === ultimo ? 0 : indice + 1, Home: 0, End: ultimo,
    }
    const siguiente = destinos[e.key]
    if (siguiente === undefined) return
    e.preventDefault()
    const { id } = modulos[siguiente]
    setActivo(id)
    botones.current[id]?.focus()
  }

  return <div className="screen flow">
    <header className="page-heading"><div>
      <h1>Métricas reales de Mendoza</h1>
      <p>Datos oficiales sobre consumo doméstico, demanda de riego y escurrimiento de los ríos.</p>
    </div></header>
    <div className="mza-tabs" role="tablist" aria-label="Módulos de métricas oficiales">
      {modulos.map(({ id, nombre, icono: Icono }, indice) => <button
        type="button" role="tab" id={`mza-tab-${id}`} key={id} aria-controls="mza-panel"
        aria-selected={activo === id} tabIndex={activo === id ? 0 : -1}
        ref={elemento => { if (elemento) botones.current[id] = elemento }}
        onClick={() => setActivo(id)} onKeyDown={e => mover(e, indice)}>
        <Icono size={17} aria-hidden="true" />{nombre}
      </button>)}
    </div>
    <div id="mza-panel" role="tabpanel" tabIndex={0} aria-labelledby={`mza-tab-${activo}`}>
      <div className="screen" key={activo}><Contenido /></div>
    </div>
    <section className="surface section-pad mza-sources" aria-labelledby="mza-fuentes">
      <h2 id="mza-fuentes"><BookOpen size={20} aria-hidden="true" /> Fuentes y metodología</h2>
      <div className="mza-grid mza-grid-2">
        {(Object.keys(fuentes) as Fuente[]).map(id => <article key={id}>
          <h3>{fuentes[id].documento}</h3>
          <p className="chart-caption">{fuentes[id].organismo} · {fuentes[id].publicacion} · {fuentes[id].pagina}</p>
          <p className="muted">{notas[id]}</p>
          <FuenteOficial fuente={id} />
        </article>)}
      </div>
    </section>
  </div>
}
