import assert from 'node:assert/strict'
import test from 'node:test'
import { boletinDGI, fuentes } from '../data/fuentesMendoza'
import { sistemasRiego, zonasAgricolas } from '../data/mendozaFinca'
import { actividadesHogar, poblacion } from '../data/mendozaHogar'
import { rios, temporadas } from '../data/mendozaRios'
import { calcularFinca, calcularHogar, demandaPorHectarea, diferenciaBruta, type HabitosMendoza } from './calculoMendoza'

test('vid en Mendoza Norte: conversión, demanda neta y demanda bruta con goteo', () => {
  const vid = zonasAgricolas.find(({ zona }) => zona === 'Mendoza Norte')?.cultivos[0]
  const goteo = sistemasRiego('Mendoza').find(({ nombre }) => nombre === 'Goteo')
  assert.equal(vid?.unidad, 'mm/año')
  assert.equal(demandaPorHectarea(vid!.valor), 9390)
  assert.deepEqual(calcularFinca(vid!.valor, 10, goteo!.valor), {
    porHectarea: 9390, neta: 93900, bruta: 93900 / 0.85,
  })
  assert.deepEqual(diferenciaBruta(200, 150), { volumen: 50, porcentaje: 25 })
  assert.deepEqual(diferenciaBruta(0, 0), { volumen: 0, porcentaje: null })
})

test('los datos agrícolas ausentes y las entradas inválidas no producen resultados', () => {
  const sur = zonasAgricolas.find(({ zona }) => zona === 'Mendoza Sur')!
  assert.equal(sur.cultivos.find(({ nombre }) => nombre === 'Olivo')?.valor, null)
  const malargue = zonasAgricolas.find(({ zona }) => zona === 'Malargüe')!
  assert.equal(malargue.cultivos.find(({ nombre }) => nombre === 'Verdeo')?.valor, 859)
  assert.equal(demandaPorHectarea(null), null)
  assert.equal(calcularFinca(null, 10, 85), null)
  assert.equal(calcularFinca(939, 0, 85), null)
  assert.equal(calcularFinca(939, 10, 0), null)
})

const habitos: HabitosMendoza = {
  duchas: { cantidad: 7, periodo: 'semana', alcance: 'persona' },
  descargas: { cantidad: 4, periodo: 'dia', alcance: 'hogar' },
  lavarropas: { cantidad: 30, periodo: 'mes', alcance: 'hogar' },
  platos: { cantidad: 2, periodo: 'dia', alcance: 'hogar' },
  cepillados: { cantidad: 2, periodo: 'dia', alcance: 'persona' },
}

test('los hábitos respetan período y alcance; la referencia histórica se calcula aparte', () => {
  const resultado = calcularHogar(4, habitos, { platos: true, cepillados: false })!
  assert.equal(poblacion.neta.valor, poblacion.residencial.valor + poblacion.otros.valor)
  assert.equal(poblacion.residencial.unidad, 'L/hab./día')
  assert.equal(actividadesHogar.ducha.unidad, 'L/acción')
  assert.equal(resultado.referenciaHogar, 1120)
  assert.deepEqual(resultado.actividades.map(({ litros }) => litros), [240, 36, 75, 226, 4])
  assert.equal(resultado.diario, 581)
  assert.equal(resultado.porHabitante, 145.25)
  assert.equal(resultado.mensual, 17430)
  assert.equal(calcularHogar(0, habitos, { platos: true, cepillados: false }), null)
})

test('cerrar la canilla de los platos reduce 80 litros por lavado', () => {
  const abierto = calcularHogar(4, habitos, { platos: true, cepillados: false })!
  const cerrado = calcularHogar(4, habitos, { platos: false, cepillados: false })!
  assert.equal((abierto.diario - cerrado.diario) / habitos.platos.cantidad, 80)
})

test('las temporadas distinguen registros y pronósticos sin sumar alcances', () => {
  assert.equal(temporadas.length, 7)
  assert.deepEqual(temporadas.find(({ nombre }) => nombre === 'Río Malargüe'), {
    nombre: 'Río Malargüe', aforo: 'La Barda', registrado: null, anteriorPronosticado: 180, pronostico: 310, porcentaje: 104,
  })
  const registros = temporadas.filter(({ registrado }) => registrado !== null)
  assert.equal(registros.length, 6)
  assert.equal(registros[0].registrado, 797)
  assert.equal(registros[0].pronostico, 1780)
  assert.equal(registros[1].registrado, 535)
  assert.equal(registros[2].registrado, 718)
  assert.equal(rios[0].siguiente.unidad, 'hm³')
  assert.equal(rios[0].porcentaje.unidad, '%')
})

test('los documentos y el boletín enlazan a sitios oficiales por HTTPS', () => {
  for (const url of [...Object.values(fuentes).map(fuente => fuente.urlFuente), boletinDGI]) {
    const destino = new URL(url)
    assert.equal(destino.protocol, 'https:')
    assert.ok(['www.mendoza.gov.ar', 'www.irrigacion.gov.ar'].includes(destino.hostname))
  }
})
