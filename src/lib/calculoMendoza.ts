import { actividadesHogar as a, poblacion } from '../data/mendozaHogar'
import { DIAS_MES, DIAS_SEMANA } from './constants'

export const periodos = { dia: 1, semana: DIAS_SEMANA, mes: DIAS_MES }
export type Frecuencia = { cantidad: number; periodo: keyof typeof periodos; alcance: 'persona' | 'hogar' }
export type Actividad = 'duchas' | 'descargas' | 'lavarropas' | 'platos' | 'cepillados'
export type HabitosMendoza = Record<Actividad, Frecuencia>
export type Canillas = { platos: boolean; cepillados: boolean }

export function calcularHogar(habitantes: number, habitos: HabitosMendoza, abierta: Canillas) {
  if (!Number.isSafeInteger(habitantes) || habitantes < 1) return null
  const factores: Record<Actividad, number> = {
    duchas: a.ducha.valor, descargas: a.inodoro.valor, lavarropas: a.lavarropas.valor,
    platos: abierta.platos ? a.platosAbierta.valor : a.platosCerrada.valor,
    cepillados: abierta.cepillados ? a.cepilladoAbierta.valor : a.cepilladoCerrada.valor,
  }
  const actividades = (Object.keys(factores) as Actividad[]).map(id => {
    const { cantidad, periodo, alcance } = habitos[id]
    return {
      id, litros: cantidad < 0 ? NaN :
        cantidad / periodos[periodo] * (alcance === 'persona' ? habitantes : 1) * factores[id],
    }
  })
  const diario = actividades.reduce((suma, actividad) => suma + actividad.litros, 0)
  const mensual = diario * DIAS_MES
  if (!Number.isFinite(mensual)) return null
  return {
    actividades, diario, mensual, porHabitante: diario / habitantes,
    referenciaHogar: poblacion.residencial.valor * habitantes,
  }
}

export function demandaPorHectarea(mm: number | null) {
  return mm === null || !Number.isFinite(mm) || mm < 0 ? null : mm * 10
}

export function calcularFinca(mm: number | null, hectareas: number, eficiencia: number) {
  const porHectarea = demandaPorHectarea(mm)
  if (porHectarea === null || !Number.isFinite(hectareas) || hectareas <= 0 ||
    !Number.isFinite(eficiencia) || eficiencia <= 0 || eficiencia > 100) return null
  const neta = porHectarea * hectareas
  const bruta = neta / (eficiencia / 100)
  return Number.isFinite(bruta) ? { porHectarea, neta, bruta } : null
}

export function diferenciaBruta(base: number, alternativa: number) {
  const volumen = base - alternativa
  return { volumen, porcentaje: base > 0 ? volumen / base * 100 : null }
}
