import { useState } from 'react'
import { ArrowSquareOut } from '@phosphor-icons/react'
import { boletinDGI } from '../../data/fuentesMendoza'
import { rios, temporadas } from '../../data/mendozaRios'
import { Barras, Cifra, colores, Marco } from './Visuales'

export default function Situacion() {
  const [seleccion, setSeleccion] = useState(rios[0].id)
  const rio = rios.find(rio => rio.id === seleccion) ?? rios[0]

  return <div className="flow">
    <Marco titulo="Pronóstico 2026–2027" fuente="rios"
      nota="Publicado el 2 de octubre de 2026. El volumen pronosticado describe el escurrimiento en el aforo; la disponibilidad para cada vivienda o finca depende de la distribución y la gestión del agua.">
      <div className="mza-toolbar">
        <label className="mza-filter">Río o alcance
          <select className="field" value={seleccion} onChange={e => setSeleccion(e.target.value)}>
            {rios.map(({ id, nombre }) => <option key={id} value={id}>{nombre}</option>)}
          </select>
        </label>
        <a className="button" href={boletinDGI} target="_blank" rel="noopener noreferrer">Consultar boletín hidrológico del DGI <ArrowSquareOut size={15} /></a>
      </div>
      <p className="chart-caption">Aforo {rio.aforo} · Datos de la publicación indicada. El boletín se consulta en el portal oficial.</p>
    </Marco>
    <div className="mza-grid mza-grid-4" aria-label="Resumen del río seleccionado">
      <Cifra titulo="Temporada 2025–2026" valor={rio.anterior.valor} unidad="hm³" fuente="rios" nota={rio.anterior.tipo} />
      <Cifra titulo="Pronóstico 2026–2027" valor={rio.siguiente.valor} unidad="hm³" fuente="rios" nota={rio.siguiente.tipo} />
      <Cifra titulo="Proporción del año medio" valor={rio.porcentaje.valor} unidad="%" fuente="rios" nota={`Aforo ${rio.aforo}`} />
      <Cifra titulo="Clasificación hidrológica" valor={rio.clima.valor} fuente="rios" nota="Pronóstico 2026–2027" />
    </div>
    <div className="mza-grid mza-grid-2">
      <Marco titulo="Comparación entre temporadas" fuente="rios"
        nota="Volúmenes en hm³. El único valor anterior pronosticado es el de Malargüe.">
        <Barras filas={temporadas} unidad="hm³" altura={370} series={[
          { clave: 'registrado', nombre: '2025–2026 registrado', color: colores.historial },
          { clave: 'anteriorPronosticado', nombre: '2025–2026 pronosticado', color: colores.previo },
          { clave: 'pronostico', nombre: '2026–2027 pronosticado' },
        ]} />
        <p className="chart-caption">Tunuyán y Tunuyán con arroyos representan alcances distintos. Se presentan por separado, sin agregarlos.</p>
      </Marco>
      <Marco titulo="Pronósticos por río" fuente="rios" nota="Proyección 2026–2027 en hm³ · 1 hm³ equivale a 1 millón de m³.">
        <Barras filas={temporadas} unidad="hm³" altura={370} series={[{ clave: 'pronostico', nombre: 'Pronóstico', color: colores.cyan }]} />
      </Marco>
      <Marco titulo="Porcentaje respecto del año medio" fuente="rios"
        nota="100 % equivale al volumen medio histórico. 129 % equivale a un 29 % por encima de ese volumen.">
        <Barras filas={temporadas} unidad="%" referencia={100} series={[{ clave: 'porcentaje', nombre: 'Proporción del año medio' }]} />
      </Marco>
      <Marco titulo="Clasificación hidrológica" fuente="rios" nota="Clasificación del pronóstico por río y sección de aforo.">
        <ul className="mza-classifications">
          {rios.map(item => <li key={item.id}><div><strong>{item.nombre}</strong><p className="muted">{item.aforo}</p></div>
            <span className={`mza-chip ${item.clima.valor === 'Húmedo' ? 'humedo' : ''}`}>{item.clima.valor}</span>
          </li>)}
        </ul>
      </Marco>
    </div>
  </div>
}
