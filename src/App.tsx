import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowLeft, Calculator, ChartLineUp, Check, ClockCounterClockwise, House, Leaf,
  MapTrifold, Moon, Plant, Receipt, SignOut, SlidersHorizontal, Sun, Target,
} from '@phosphor-icons/react'
import Consejos from './components/Consejos'
import { numero } from './components/ConsumoVisual'
import Dashboard, { fechaRegistro, type Registro } from './components/Dashboard'
import Formulario, { habitosIniciales } from './components/Formulario'
import Login, { cargarSesion, cuentas, guardarSesion, type Usuario } from './components/Login'
import { Resultado } from './components/Resultado'
import { calcular } from './lib/calculo'
import type { Habitos } from './types'

const Finca = lazy(() => import('./components/finca/Finca').then(modulo => ({ default: modulo.Finca })))
const MapaMendoza = lazy(() => import('./components/mapa/MapaMendoza').then(modulo => ({ default: modulo.MapaMendoza })))
const SubirFactura = lazy(() => import('./components/SubirFactura'))
const MetricasMendoza = lazy(() => import('./components/metricas/MetricasMendoza'))
const CalculadoraHogarMendoza = lazy(() => import('./components/metricas/Hogar').then(modulo => ({ default: modulo.CalculadoraHogarMendoza })))
const CalculadoraFincaMendoza = lazy(() => import('./components/metricas/Finca').then(modulo => ({ default: modulo.CalculadoraFincaMendoza })))

const secciones = [
  { id: 'inicio', etiqueta: 'Inicio', icono: House },
  { id: 'calculadora', etiqueta: 'Calculadora', icono: Calculator },
  { id: 'simulador', etiqueta: 'Simulador', icono: SlidersHorizontal },
  { id: 'recomendaciones', etiqueta: 'Recomendaciones', icono: Leaf },
  { id: 'historial', etiqueta: 'Historial', icono: ClockCounterClockwise },
  { id: 'metas', etiqueta: 'Metas', icono: Target },
  { id: 'metricas', etiqueta: 'Métricas de Mendoza', icono: ChartLineUp },
  { id: 'finca', etiqueta: 'Mi finca', icono: Plant },
  { id: 'factura', etiqueta: 'Factura', icono: Receipt },
  { id: 'mapa', etiqueta: 'Mapa de Mendoza', icono: MapTrifold },
] as const
type Seccion = (typeof secciones)[number]['id']
type Tema = 'claro' | 'oscuro'
const temaClave = 'aquaguard-tema'
const historialClave = 'aquaguard-historial'
const metaClave = 'aquaguard-meta'

function imagenMarca(archivo: string, tema: Tema) {
  const variante = tema === 'oscuro' ? archivo === 'marca-horizontal' ? '-clara' : '-claro' : ''
  return `/${archivo}${variante}.png`
}

function leer(clave: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(clave) ?? 'null')
  } catch {
    return null
  }
}

function guardar(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // La sesión sigue funcionando si el navegador bloquea el almacenamiento.
  }
}

function cargarHistorial(clave: string): Registro[] {
  const datos = leer(clave)
  if (!Array.isArray(datos)) return []
  return datos.filter((registro): registro is Registro => {
    if (!Number.isFinite(registro?.fecha) || Math.abs(registro.fecha) > 8.64e15) return false
    return Object.entries(habitosIniciales).every(([campo, ejemplo]) => {
      const valor = registro.habitos?.[campo]
      return typeof ejemplo === 'boolean'
        ? typeof valor === 'boolean'
        : typeof valor === 'number' && Number.isFinite(valor) && valor >= (campo === 'personas' ? 1 : 0)
    })
  }).slice(0, 60)
}

function cargarMeta(clave: string) {
  const valor = leer(clave)
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? valor : null
}

function Estado({ texto, tipo }: { texto: string; tipo: 'exito' | 'error' }) {
  return (
    <p role={tipo === 'error' ? 'alert' : 'status'} className={`feedback ${tipo}`}>
      {tipo === 'exito' && <Check size={17} aria-hidden="true" />}{texto}
    </p>
  )
}

export default function App() {
  const [usuario, setUsuario] = useState(cargarSesion)
  const [tema, setTema] = useState<Tema>(() => document.documentElement.dataset.tema === 'oscuro' ? 'oscuro' : 'claro')

  useEffect(() => {
    document.documentElement.dataset.tema = tema
  }, [tema])

  function cambiarTema() {
    const nuevo = tema === 'claro' ? 'oscuro' : 'claro'
    guardar(temaClave, nuevo)
    setTema(nuevo)
  }

  function cambiarSesion(nuevo: Usuario | null) {
    guardarSesion(nuevo)
    setUsuario(nuevo)
  }
  return usuario
    ? <PanelGotea key={usuario} usuario={usuario} tema={tema} cambiarTema={cambiarTema} salir={() => cambiarSesion(null)} />
    : <Login ingresar={cambiarSesion} selectorTema={<SelectorTema tema={tema} cambiarTema={cambiarTema} />} />
}

function SelectorTema({ tema, cambiarTema }: { tema: Tema; cambiarTema: () => void }) {
  return (
    <button type="button" className="theme-toggle" onClick={cambiarTema} aria-label="Tema oscuro" aria-pressed={tema === 'oscuro'}>
      <span>Tema <span className="theme-name">{tema}</span></span>
      <span className="theme-icon" aria-hidden="true">{tema === 'oscuro' ? <Moon size={17} /> : <Sun size={17} />}</span>
    </button>
  )
}

function PanelGotea({ usuario, tema, cambiarTema, salir }: { usuario: Usuario; tema: Tema; cambiarTema: () => void; salir: () => void }) {
  const inicio = usuario === 'finca' ? 'finca' : 'inicio'
  const disponibles = secciones.filter(({ id }) => usuario === 'admin' ||
    (usuario === 'finca' ? id === 'finca' || id === 'mapa' || id === 'metricas' : id !== 'finca'))
  const claveHistorial = usuario === 'hogar' ? historialClave : `gotea-${usuario}-historial`
  const claveMeta = usuario === 'hogar' ? metaClave : `gotea-${usuario}-meta`
  const [seccion, setSeccion] = useState<Seccion>(inicio)
  const [registros, setRegistros] = useState(() => cargarHistorial(claveHistorial))
  const [meta, setMeta] = useState(() => cargarMeta(claveMeta))
  const [metaBorrador, setMetaBorrador] = useState(() => meta?.toString() ?? '')
  const [mensajeMeta, setMensajeMeta] = useState<{ texto: string; tipo: 'exito' | 'error' } | null>(null)
  const [calculado, setCalculado] = useState(false)
  const [mostrarCalculadoraEducativa, setMostrarCalculadoraEducativa] = useState(false)
  const [mostrarDemandaAgricola, setMostrarDemandaAgricola] = useState(false)
  const panel = useRef<HTMLElement>(null)
  const enfocar = useRef(false)

  const habitos = registros[0]?.habitos ?? habitosIniciales
  const resultado = calcular(habitos)

  useEffect(() => {
    if (!enfocar.current) return
    panel.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [seccion, registros[0]?.fecha])

  function abrir(destino: Seccion) {
    if (destino === seccion || !disponibles.some(({ id }) => id === destino)) return
    enfocar.current = true
    setCalculado(false)
    setSeccion(destino)
  }

  function registrar(nuevosHabitos: Habitos) {
    const fecha = Math.max(Date.now(), (registros[0]?.fecha ?? 0) + 1)
    const nuevos = [{ fecha, habitos: nuevosHabitos }, ...registros].slice(0, 60)
    setRegistros(nuevos)
    guardar(claveHistorial, nuevos)
    abrir('simulador')
    setCalculado(true)
  }

  function guardarMeta(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const valor = Number(metaBorrador)
    if (!Number.isFinite(valor) || valor <= 0) {
      setMensajeMeta({ texto: 'Ingresá una meta mayor a 0 litros.', tipo: 'error' })
      return
    }
    guardar(claveMeta, valor)
    setMeta(valor)
    setMensajeMeta({ texto: 'Meta guardada.', tipo: 'exito' })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand gotea-brand" onClick={() => abrir(inicio)} aria-label="Gotea, inicio">
          <img src={imagenMarca('icono', tema)} alt="" />
          <span>Gotea</span>
        </button>
        <p className="sidebar-role">{cuentas[usuario].rol}</p>
        <nav className="sidebar-nav" aria-label="Navegación principal">
          {disponibles.map(({ id, etiqueta, icono: Icono }) => (
            <button type="button" key={id} onClick={() => abrir(id)} aria-current={seccion === id ? 'page' : undefined}>
              <Icono size={18} aria-hidden="true" /> <span>{etiqueta}</span>
            </button>
          ))}
        </nav>
        <SelectorTema tema={tema} cambiarTema={cambiarTema} />
        <button type="button" className="button sidebar-logout" onClick={salir}><SignOut size={17} aria-hidden="true" /> Cerrar sesión</button>
      </aside>
      <main className="main-panel" ref={panel} tabIndex={-1}>
        {seccion === 'inicio' && <Dashboard resultado={resultado} habitos={habitos} registros={registros} meta={meta}
          logo={imagenMarca('logo-principal', tema)} abrir={abrir} />}
        <div hidden={seccion !== 'calculadora'} className="screen flow">
          <header className="page-heading"><div><h1>Calculadora</h1><p>Cargá los hábitos de tu hogar para estimar cuánta agua usás.</p></div></header>
          <Formulario habitos={habitos} onSubmit={registrar} />
          <details className="surface section-pad" onToggle={evento => setMostrarCalculadoraEducativa(evento.currentTarget.open)}>
            <summary className="cursor-pointer font-semibold">Calculadora con referencias educativas</summary>
            {seccion === 'calculadora' && mostrarCalculadoraEducativa && (
              <div className="mt-4"><Suspense fallback={<p role="status">Cargando calculadora…</p>}>
                <CalculadoraHogarMendoza />
              </Suspense></div>
            )}
          </details>
        </div>
        {seccion === 'simulador' && (
          <div className="screen flow">
            <header className="page-heading">
              <div><h1>Simulador</h1><p>{registros.length ? 'Probá cómo cambia tu consumo al ajustar tus hábitos.' : 'Probá el simulador con los hábitos de ejemplo.'}</p></div>
              <button className="button" onClick={() => abrir('calculadora')}><ArrowLeft size={17} /> Volver a calcular</button>
            </header>
            {calculado && <Estado texto="Consumo calculado correctamente." tipo="exito" />}
            <Resultado resultado={resultado} habitos={habitos} />
            <div className="flex flex-wrap gap-2">
              <button className="button button-primary" onClick={() => abrir('recomendaciones')}><Leaf size={17} /> Ver recomendaciones</button>
              <button className="button" onClick={() => abrir('factura')}><Receipt size={17} /> Comparar con mi factura</button>
            </div>
          </div>
        )}
        {seccion === 'recomendaciones' && (
          <div className="screen">
            <header className="page-heading"><div><h1>Recomendaciones</h1><p>{registros.length ? 'Cambios concretos para reducir el consumo de tu hogar.' : 'Consejos para los hábitos de ejemplo. Calculá tu consumo para personalizarlos.'}</p></div></header>
            <Consejos resultado={resultado} habitos={habitos} />
          </div>
        )}
        {seccion === 'historial' && (
          <div className="screen flow">
            <header className="page-heading"><div><h1>Historial</h1><p>Estimaciones de consumo guardadas en este navegador.</p></div></header>
            <section className="surface section-pad">
              {registros.length ? (
                <ul className="history-list">
                  {registros.map(({ fecha, habitos }) => (
                    <li key={fecha}>
                      <time dateTime={new Date(fecha).toISOString()}>{fechaRegistro.format(fecha)}</time>
                      <strong>{numero.format(calcular(habitos).totalLPersonaDia)} L por persona al día</strong>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">Todavía no hay cálculos guardados.</p>}
            </section>
          </div>
        )}
        {seccion === 'metas' && (
          <div className="screen flow">
            <header className="page-heading"><div><h1>Metas</h1><p>Elegí un objetivo diario de consumo para tu hogar.</p></div></header>
            <section className="surface section-pad">
              <form noValidate onSubmit={guardarMeta} className="goal-form">
                <label>Litros por persona por día<input type="number" min="0" step="any" inputMode="decimal" className="field" value={metaBorrador} onChange={evento => setMetaBorrador(evento.target.value)} /></label>
                <button className="button button-primary" type="submit"><Target size={17} /> Guardar meta</button>
              </form>
              {mensajeMeta && <Estado {...mensajeMeta} />}
              {meta !== null && <p className="mt-4 muted">Meta actual de {numero.format(meta)} L. {registros.length ? 'Tu último cálculo' : 'La estimación inicial'} da {numero.format(resultado.totalLPersonaDia)} L por persona al día.</p>}
            </section>
          </div>
        )}
        {seccion === 'metricas' && (
          <Suspense fallback={<div className="surface section-pad" role="status">Cargando métricas de Mendoza…<span className="skeleton mt-3" aria-hidden="true" /></div>}>
            <MetricasMendoza />
          </Suspense>
        )}
        {seccion === 'finca' && (
          <div className="screen flow">
            <Suspense fallback={<p role="status">Cargando finca…</p>}>
              <Finca />
            </Suspense>
            <details className="surface section-pad" open={mostrarDemandaAgricola} onToggle={evento => setMostrarDemandaAgricola(evento.currentTarget.open)}>
              <summary className="cursor-pointer font-semibold">Demanda anual por cultivo y cuenca</summary>
              {mostrarDemandaAgricola && <div className="mt-4"><Suspense fallback={<p role="status">Cargando demanda agrícola…</p>}>
                <CalculadoraFincaMendoza />
              </Suspense></div>}
            </details>
          </div>
        )}
        {seccion === 'factura' && (
          <div className="screen flow">
            <header className="page-heading"><div><h1>Factura de agua</h1>
              <p>{registros.length ? 'Compará tu factura con el último cálculo del hogar.' : 'La comparación usa los hábitos de ejemplo hasta que guardes un cálculo.'}</p>
            </div></header>
            <Suspense fallback={<p role="status">Cargando factura…</p>}>
              <SubirFactura personas={habitos.personas} estimado={resultado.totalLPersonaDia} />
            </Suspense>
          </div>
        )}
        {seccion === 'mapa' && (
          <div className="screen flow">
            <Suspense fallback={<p role="status">Cargando mapa…</p>}>
              <MapaMendoza insignia={imagenMarca('marca-horizontal', tema)} />
            </Suspense>
          </div>
        )}
      </main>
    </div>
  )
}
