import type { MetodoRiego } from '../../lib/finca';

export type ConsejoFinca = {
  titulo: string;
  detalle: string;
};

const consejosComunes: ConsejoFinca[] = [
  {
    titulo: 'Regiá en horarios frescos',
    detalle:
      'Regar durante la noche o temprano por la mañana para reducir las pérdidas por evaporación.',
  },
  {
    titulo: 'Controlá la conducción',
    detalle:
      'Revisar periódicamente las pérdidas de agua en acequias y canales.',
  },
];

const consejoSegunMetodo: Record<MetodoRiego, ConsejoFinca> = {
  Manto: {
    titulo: 'Evaluá el goteo',
    detalle:
      'Evaluar la incorporación del sistema de riego por goteo para optimizar el consumo.',
  },
  Surco: {
    titulo: 'Evaluá el goteo',
    detalle:
      'Evaluar la incorporación del sistema de riego por goteo para optimizar el consumo.',
  },
  Goteo: {
    titulo: 'Mantené el sistema',
    detalle:
      'Ya usás el sistema más eficiente contemplado: revisá filtros y emisores para conservar su rendimiento.',
  },
};

export function obtenerConsejosFinca(metodo: MetodoRiego): ConsejoFinca[] {
  return [...consejosComunes, consejoSegunMetodo[metodo]];
}
