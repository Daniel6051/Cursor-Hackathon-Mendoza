import { indicador } from './fuentesMendoza'

function rio(id: string, nombre: string, aforo: string, anterior: number, siguiente: number, porcentaje: number,
  clima: 'Húmedo' | 'Normal', anteriorPronosticado = false) {
  const zona = `${nombre} · ${aforo}`
  const notas = 'Volumen de escurrimiento en la sección de aforo. No expresa agua entregada a hogares o fincas.'
  return {
    id, nombre, aforo,
    anterior: indicador('rios', `${id}-anterior`, 'Referencia de temporada anterior', anterior, 'hm³',
      anteriorPronosticado ? 'Pronóstico' : 'Medición registrada', '2025–2026', zona, notas),
    siguiente: indicador('rios', `${id}-pronostico`, 'Pronóstico de escurrimiento', siguiente, 'hm³',
      'Pronóstico', '2026–2027', zona, notas),
    porcentaje: indicador('rios', `${id}-porcentaje`, 'Proporción del año medio', porcentaje, '%',
      'Pronóstico', '2026–2027', zona, 'Proporción sobre 100 % del volumen medio histórico.'),
    clima: indicador('rios', `${id}-clima`, 'Clasificación hidrológica', clima, 'Clase',
      'Pronóstico', '2026–2027', zona, 'Clasificación publicada por el DGI para esta temporada.'),
  }
}

export const rios = [
  rio('mendoza', 'Río Mendoza', 'Guido', 797, 1780, 129, 'Húmedo'),
  rio('tunuyan', 'Río Tunuyán', 'Valle de Uco', 535, 990, 117, 'Húmedo'),
  rio('tunuyan-arroyos', 'Tunuyán y arroyos', 'Valle de Uco', 718, 1340, 111, 'Húmedo'),
  rio('diamante', 'Río Diamante', 'La Jaula', 548, 1090, 112, 'Húmedo'),
  rio('atuel', 'Río Atuel', 'La Angostura', 633, 1080, 100, 'Normal'),
  rio('malargue', 'Río Malargüe', 'La Barda', 180, 310, 104, 'Normal', true),
  rio('grande', 'Río Grande', 'La Gotera', 1638, 3470, 111, 'Húmedo'),
]

export const temporadas = rios.map(({ nombre, aforo, anterior, siguiente, porcentaje }) => ({
  nombre,
  aforo,
  registrado: anterior.tipo === 'Medición registrada' ? anterior.valor : null,
  anteriorPronosticado: anterior.tipo === 'Pronóstico' ? anterior.valor : null,
  pronostico: siguiente.valor,
  porcentaje: porcentaje.valor,
}))
