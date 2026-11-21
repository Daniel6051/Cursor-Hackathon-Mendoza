import { useEffect, useRef, useState, type ComponentType, type KeyboardEvent } from 'react'
import Consejos from './components/Consejos'
import Formulario, { habitosIniciales } from './components/Formulario'
import SubirFactura from './components/SubirFactura'
import { Resultado as ResultadoConsumo } from './components/Resultado'
import { MapaMendoza } from './components/mapa/MapaMendoza'
import { calcular } from './lib/calculo'
import type { Habitos, Resultado } from './types'

const fincas = import.meta.glob<{ default?: ComponentType; Finca?: ComponentType }>(
  './components/finca/Finca.tsx',
  { eager: true },
)
const moduloFinca = fincas['./components/finca/Finca.tsx']
const Finca = moduloFinca?.default ?? moduloFinca?.Finca

const pestanas = [
  { id: 'casa', etiqueta: 'Mi casa' },
  { id: 'finca', etiqueta: 'Mi finca' },
] as const
type Pestana = (typeof pestanas)[number]['id']

function MiCasa() {
  const [habitos, setHabitos] = useState(habitosIniciales)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [revision, setRevision] = useState(0)
  const formularioRef = useRef<HTMLHeadingElement>(null)
  const resultadoRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (revision === 0) return
    const destino = resultado ? resultadoRef.current : formularioRef.current
    const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    destino?.focus({ preventScroll: true })
    destino?.scrollIntoView({ behavior: reducirMovimiento ? 'instant' : 'smooth' })
  }, [resultado, revision])

  function mostrarResultado(nuevosHabitos: Habitos) {
    setHabitos(nuevosHabitos)
    setResultado(calcular(nuevosHabitos))
    setRevision(valor => valor + 1)
  }

  return (
    <>
      <h2 ref={formularioRef} tabIndex={-1} className="mb-6 scroll-mt-6 text-2xl font-bold">
        Hábitos de tu hogar
      </h2>
      <Formulario habitos={habitos} onSubmit={mostrarResultado} />
      {resultado && (
        <section aria-labelledby="titulo-resultado" className="mt-10 space-y-6">
          <h2 id="titulo-resultado" ref={resultadoRef} tabIndex={-1} className="scroll-mt-8 text-2xl font-bold">
            Tu consumo estimado
          </h2>
          <ResultadoConsumo key={revision} resultado={resultado} habitos={habitos} />
          <SubirFactura personas={habitos.personas} estimado={resultado.totalLPersonaDia} />
          <Consejos resultado={resultado} habitos={habitos} />
          <button
            type="button"
            onClick={() => {
              setResultado(null)
              setRevision(valor => valor + 1)
            }}
            className="w-full rounded-xl bg-water px-6 py-3 font-bold text-ink hover:bg-teal-400 sm:w-auto"
          >
            Volver a calcular
          </button>
        </section>
      )}
    </>
  )
}

export default function App() {
  const [activa, setActiva] = useState<Pestana>('casa')
  const botones = useRef<Partial<Record<Pestana, HTMLButtonElement>>>({})

  function navegar(event: KeyboardEvent<HTMLButtonElement>, actual: Pestana) {
    let siguiente: Pestana
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
        siguiente = actual === 'casa' ? 'finca' : 'casa'
        break
      case 'Home':
        siguiente = 'casa'
        break
      case 'End':
        siguiente = 'finca'
        break
      default:
        return
    }
    event.preventDefault()
    setActiva(siguiente)
    botones.current[siguiente]?.focus()
  }

  return (
    <>
      <header className="bg-ink px-4 pt-10 text-white sm:px-8 sm:pt-14">
        <div className="mx-auto max-w-3xl">
          <h1>
            <img src="/marca-horizontal-clara.png" alt="Agua Mendoza" className="h-14 w-auto sm:h-16" />
          </h1>
          <p className="mt-4 max-w-xl text-lg text-teal-100 sm:text-xl">
            Mendoza está en emergencia hídrica. ¿Cuánta agua gastás vos?
          </p>
          <div role="tablist" aria-label="Lugar de consumo" className="mt-7 flex gap-2">
            {pestanas.map(({ id, etiqueta }) => (
              <button
                key={id}
                ref={nodo => { if (nodo) botones.current[id] = nodo }}
                type="button"
                role="tab"
                id={`pestana-${id}`}
                aria-controls={`panel-${id}`}
                aria-selected={activa === id}
                tabIndex={activa === id ? 0 : -1}
                onClick={() => setActiva(id)}
                onKeyDown={event => navegar(event, id)}
                className="min-h-11 rounded-t-lg bg-white/10 px-5 py-2 font-semibold hover:bg-white/20 focus-visible:outline-water aria-selected:bg-water aria-selected:text-ink"
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
        <div
          role="tabpanel"
          id="panel-casa"
          aria-labelledby="pestana-casa"
          aria-hidden={activa !== 'casa'}
          className={activa === 'casa' ? undefined : 'invisible h-0 overflow-hidden'}
        >
          <MiCasa />
        </div>
        <div role="tabpanel" id="panel-finca" aria-labelledby="pestana-finca" hidden={activa !== 'finca'} tabIndex={0}>
          {activa === 'finca' && (
            Finca ? <Finca /> : (
              <p className="rounded-2xl border border-teal-900/10 bg-white p-5 font-medium">Próximamente</p>
            )
          )}
        </div>
      </main>
      <MapaMendoza />
    </>
  )
}
