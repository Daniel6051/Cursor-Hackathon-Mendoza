import { useState } from 'react'
import { cuencas, cultivos, sistemasRiego, zonasAgricolas, type Cuenca } from '../../data/mendozaFinca'
import { calcularFinca, demandaPorHectarea, diferenciaBruta } from '../../lib/calculoMendoza'
import { numero } from '../ConsumoVisual'
import { Barras, Cifra, colores, Marco, SinDatos } from './Visuales'

const unidad = 'm³/año'
const unidadHectarea = 'm³/ha/año'

function useSeleccionFinca() {
  const [cuenca, setCuenca] = useState<Cuenca>('Mendoza')
  const [nombreZona, setNombreZona] = useState('Mendoza Norte')
  const [cultivo, setCultivo] = useState(0)
  const zonas = zonasAgricolas.filter(zona => zona.cuenca === cuenca)
  const zona = zonas.find(zona => zona.zona === nombreZona) ?? zonas[0]
  const zonaFilas = zona.cultivos.map(({ nombre, valor }) => ({ nombre, valor: demandaPorHectarea(valor) }))
  const geoFilas = zonas.map(({ zona, cultivos }) => ({ nombre: zona, valor: demandaPorHectarea(cultivos[cultivo].valor) }))

  function cambiarCuenca(nueva: Cuenca) {
    setCuenca(nueva)
    const primera = zonasAgricolas.find(zona => zona.cuenca === nueva)!
    setNombreZona(primera.zona)
    if (primera.cultivos[cultivo].valor === null) setCultivo(primera.cultivos.findIndex(item => item.valor !== null))
  }

  return { cuenca, zona, zonas, cultivo, setCultivo, setNombreZona, cambiarCuenca, zonaFilas, geoFilas }
}

function FiltrosFinca({ seleccion }: { seleccion: ReturnType<typeof useSeleccionFinca> }) {
  const { cuenca, zona, zonas, cultivo, setCultivo, setNombreZona, cambiarCuenca } = seleccion
  return <>
    <label>Cuenca<select className="field" value={cuenca} onChange={e => cambiarCuenca(e.target.value as Cuenca)}>
      {cuencas.map(valor => <option key={valor}>{valor}</option>)}
    </select></label>
    <label>Zona<select className="field" value={zona.zona} onChange={e => setNombreZona(e.target.value)}>
      {zonas.map(({ zona }) => <option key={zona}>{zona}</option>)}
    </select></label>
    <label>Cultivo<select className="field" value={cultivo} onChange={e => setCultivo(Number(e.target.value))}>
      {cultivos.map((nombre, indice) => <option key={nombre} value={indice}>{nombre}{zona.cultivos[indice].valor === null ? ' · Sin dato' : ''}</option>)}
    </select></label>
  </>
}

export function CalculadoraFincaMendoza() {
  const seleccion = useSeleccionFinca()
  const { cuenca, zona, cultivo } = seleccion
  const [hectareas, setHectareas] = useState('10')
  const [base, setBase] = useState(0)
  const [alternativo, setAlternativo] = useState(2)

  const metrica = zona.cultivos[cultivo]
  const sistemas = sistemasRiego(cuenca)
  const actual = calcularFinca(metrica.valor, Number(hectareas), sistemas[base].valor)
  const escenario = calcularFinca(metrica.valor, Number(hectareas), sistemas[alternativo].valor)
  const diferencia = actual && escenario ? diferenciaBruta(actual.bruta, escenario.bruta) : null
  return <div className="flow">
    <Marco titulo="Calculadora agrícola" fuente="finca"
      nota="Estimación anual según la tabla del DGI. Elegí una zona y compará el volumen necesario con dos sistemas.">
      <div className="mza-fields">
        <FiltrosFinca seleccion={seleccion} />
        <label>Superficie en hectáreas<input className="field" type="number" min="0" step="any" inputMode="decimal"
          value={hectareas} onChange={e => setHectareas(e.target.value)} /></label>
        <label>Sistema de referencia<select className="field" value={base} onChange={e => setBase(Number(e.target.value))}>
          {sistemas.map(({ nombre }, indice) => <option key={nombre} value={indice}>{nombre}</option>)}
        </select></label>
        <label>Sistema alternativo<select className="field" value={alternativo} onChange={e => setAlternativo(Number(e.target.value))}>
          {sistemas.map(({ nombre }, indice) => <option key={nombre} value={indice}>{nombre}</option>)}
        </select></label>
      </div>
      {!actual && <p className="feedback error mt-3" role="alert">
        {metrica.valor === null ? 'La tabla oficial no publica un valor para este cultivo en la zona elegida.' : 'Ingresá una superficie válida, mayor a 0 hectáreas.'}
      </p>}
    </Marco>
    {actual && metrica.valor !== null && <div className="mza-grid mza-grid-4" aria-label="Resultados estimados de la finca">
      <Cifra titulo="Demanda neta anual" valor={actual.neta} unidad={unidad} fuente="finca" nota="Cálculo de Gotea" animar />
      <Cifra titulo="Demanda por hectárea" valor={actual.porHectarea} unidad={unidadHectarea} fuente="finca" nota={`${numero.format(metrica.valor)} mm/año × 10`} animar />
      <Cifra titulo="Volumen bruto de aplicación" valor={actual.bruta} unidad={unidad} fuente="finca" nota={sistemas[base].nombre} animar />
      <Cifra titulo="Eficiencia del sistema" valor={sistemas[base].valor} unidad="%" fuente="finca" nota="Referencia técnica del DGI" />
    </div>}
    <Marco titulo="Comparador de métodos" fuente="finca" nota={`Demanda estimada para cada método · ${unidad}`}>
      {actual && escenario && diferencia ? <>
        <dl className="mza-comparison">
          <div><dt>Referencia · {sistemas[base].nombre}</dt><dd>{numero.format(actual.bruta)} {unidad}</dd></div>
          <div><dt>Alternativo · {sistemas[alternativo].nombre}</dt><dd>{numero.format(escenario.bruta)} {unidad}</dd></div>
        </dl>
        <Barras filas={[
          { nombre: sistemas[base].nombre, neta: actual.neta, bruta: actual.bruta },
          { nombre: sistemas[alternativo].nombre, neta: escenario.neta, bruta: escenario.bruta },
        ]} series={[{ clave: 'neta', nombre: 'Demanda neta' }, { clave: 'bruta', nombre: 'Demanda bruta', color: colores.cyan }]} unidad={unidad} />
        <p className="mza-result">
          {diferencia.volumen === 0 ? 'Ambos escenarios requieren el mismo volumen bruto.' :
            `El método alternativo requiere ${numero.format(Math.abs(diferencia.volumen))} ${unidad} ${diferencia.volumen > 0 ? 'menos' : 'más'} (${numero.format(Math.abs(diferencia.porcentaje ?? 0))} %).`}
        </p>
        <p className="chart-caption">La diferencia es teórica. El ahorro efectivo y el agua que retorna a la cuenca dependen de las condiciones de campo.</p>
      </> : <p className="mza-empty muted">Completá la calculadora con un cultivo y una superficie válidos.</p>}
    </Marco>
  </div>
}


export default function MetricasFinca() {
  const seleccion = useSeleccionFinca()
  const { cuenca, zona, cultivo, zonaFilas, geoFilas } = seleccion
  const sistemas = sistemasRiego(cuenca)

  return <div className="flow">
    <Marco titulo="Demanda y eficiencia de riego" fuente="finca" nota="Consultá los valores de referencia del DGI por cuenca, zona y cultivo.">
      <div className="mza-fields"><FiltrosFinca seleccion={seleccion} /></div>
    </Marco>
    <div className="mza-grid mza-info-finca">
      <Marco titulo="Demanda por cultivo" fuente="finca" nota={`${zona.zona} · ${unidadHectarea}`}>
        <Barras filas={zonaFilas} series={[{ clave: 'valor', nombre: 'Demanda neta' }]} unidad={unidadHectarea} />
        <SinDatos filas={zonaFilas} />
      </Marco>
      <Marco titulo="Comparación geográfica" fuente="finca" nota={`${cultivos[cultivo]} en la cuenca de ${cuenca} · ${unidadHectarea}`}>
        <Barras filas={geoFilas} series={[{ clave: 'valor', nombre: 'Demanda neta', color: colores.cyan }]} unidad={unidadHectarea} />
        <SinDatos filas={geoFilas} />
      </Marco>
      <Marco titulo="Eficiencia por tecnología" fuente="finca" nota={`Eficiencias de referencia para ${cuenca} · %`}>
        <Barras filas={sistemas.map(({ nombre, valor }) => ({ nombre, valor }))} series={[{ clave: 'valor', nombre: 'Eficiencia', color: colores.verde }]} unidad="%" />
      </Marco>
    </div>
  </div>
}
