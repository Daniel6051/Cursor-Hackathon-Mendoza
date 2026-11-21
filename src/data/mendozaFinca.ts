import { indicador } from './fuentesMendoza'

export const cultivos = ['Vid', 'Forestal', 'Frutal', 'Hortícola de verano', 'Hortícola de invierno',
  'Olivo', 'Pastura', 'Verdeo', 'Papa y rotación'] as const

const zonas = [
  ['Mendoza', 'Mendoza Norte', 939, 1624, 1155, 872, 663, 1079, 1349, null, null],
  ['Mendoza', 'Mendoza Centro', 866, 1590, 1045, 819, 659, 963, 1272, null, null],
  ['Mendoza', 'Mendoza Sur', 781, 1315, 966, 685, 561, null, 1095, null, null],
  ['Tunuyán Superior', 'Superior Oeste', 842, 1364, 1033, 712, 646, null, 1198, null, null],
  ['Tunuyán Superior', 'Superior Centro', 745, 1278, 946, 666, 560, null, 1188, null, null],
  ['Tunuyán Superior', 'Superior Sur', 792, 1337, 979, 698, 581, null, 1105, null, null],
  ['Tunuyán Inferior', 'Inferior Norte Este', 785, 1183, 869, 639, 503, 785, 1080, null, null],
  ['Tunuyán Inferior', 'Inferior Sur Oeste', 869, 1283, 953, 696, 525, 831, 1013, null, null],
  ['Diamante', 'Diamante Oeste', 882, 1480, 1090, 765, null, 1005, 1236, null, null],
  ['Diamante', 'Diamante Este', 938, 1480, 1160, 814, null, 1067, 1316, null, null],
  ['Atuel', 'Alto Atuel', 946, 1660, 1178, 842, 593, 1136, 1412, null, null],
  ['Atuel', 'Bajo Atuel', 973, 1636, 1206, 844, 646, 1097, 1366, null, null],
  ['Malargüe', 'Malargüe', null, 1203, null, 978, null, null, 1235, 859, 882],
] as const

export type Cuenca = (typeof zonas)[number][0]
export const cuencas = [...new Set(zonas.map(([cuenca]) => cuenca))]

export const zonasAgricolas = zonas.map(([cuenca, zona, ...valores], indiceZona) => ({
  cuenca, zona,
  cultivos: cultivos.map((nombre, indice) => indicador('finca', `cultivo-${indiceZona}-${indice}`, nombre,
    valores[indice], 'mm/año', 'Estimación técnica', 'Demanda anual de referencia', zona,
    'Demanda neta estimada por cultivo y zona. Las celdas vacías se conservan como sin dato.')),
}))

const gravitacional: Record<Cuenca, number> = {
  Mendoza: 59, 'Tunuyán Superior': 55, 'Tunuyán Inferior': 65, Diamante: 57, Atuel: 60, Malargüe: 40,
}

export function sistemasRiego(cuenca: Cuenca) {
  return [
    ['Gravitacional', gravitacional[cuenca]],
    ['Gravitacional mejorado', 65],
    ['Goteo', 85],
    ['Aspersión', 75],
    ['Subsuperficial', 90],
  ].map(([nombre, valor], indice) => indicador('finca', `riego-${cuenca}-${indice}`, String(nombre),
    Number(valor), '%', 'Estimación técnica', 'Eficiencia de referencia', indice === 0 ? cuenca : 'Mendoza',
    'Eficiencia técnica de referencia para estimar el volumen bruto de aplicación.'))
}
