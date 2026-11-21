import { indicador } from './fuentesMendoza'

const unidadPoblacion = 'L/hab./día'
const zona = 'Mendoza'

export const poblacion = {
  residencial: indicador('demanda', 'residencial', 'Consumo residencial de referencia', 280, unidadPoblacion,
    'Referencia histórica', 'Estimación de 2010 reutilizada en 2025', zona, 'El Plan Maestro retoma una estimación de 2010.'),
  otros: indicador('demanda', 'otros', 'Otros usos del agua potable', 72, unidadPoblacion,
    'Estimación técnica', 'Escenario de demanda 2022', zona, 'Diferencia entre la demanda neta y el componente residencial.'),
  neta: indicador('demanda', 'neta', 'Demanda poblacional neta', 352, unidadPoblacion,
    'Estimación técnica', 'Escenario de demanda 2022', zona, 'Dato provisto por AYSAM al Plan Maestro. Incluye usos residenciales y otros usos.'),
  perdidas: indicador('demanda', 'perdidas-red', 'Pérdidas del sistema', 46, '%',
    'Estimación técnica', 'Escenario de demanda 2022', 'Cuenca del río Mendoza', 'Estimación de pérdidas de la red en esta cuenca. No se aplica al hogar ni al resto de Mendoza.'),
}

function actividad(id: string, nombre: string, valor: number, grupo: string) {
  return {
    ...indicador('hogar', id, nombre, valor, 'L/acción', 'Ejemplo educativo', 'Material educativo de 2021',
      zona, 'Valor orientativo por acción completa. No mide el consumo de los dispositivos del hogar.'),
    categoria: grupo,
  }
}

export const actividadesHogar = {
  cepilladoCerrada: actividad('cepillado-cerrada', 'Cepillado · cerrada', 0.5, 'Higiene'),
  cepilladoAbierta: actividad('cepillado-abierta', 'Cepillado · abierta', 10, 'Higiene'),
  inodoro: actividad('inodoro', 'Descarga de inodoro', 9, 'Higiene'),
  ducha: actividad('ducha', 'Ducha', 60, 'Higiene'),
  inmersion: actividad('inmersion', 'Baño de inmersión', 300, 'Higiene'),
  platosAbierta: actividad('platos-abierta', 'Platos · abierta', 113, 'Limpieza'),
  platosCerrada: actividad('platos-cerrada', 'Platos · cerrada', 33, 'Limpieza'),
  lavarropas: actividad('lavarropas', 'Ciclo de lavarropas', 75, 'Electrodomésticos'),
}
