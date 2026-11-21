// Correr: npx tsx src/lib/calculo.test.ts
import assert from 'node:assert/strict';
import { calcular } from './calculo';
import type { Habitos } from '../types';

// Valores por defecto del formulario (cuenta en papel abajo)
const base: Habitos = {
  personas: 3, duchaMin: 10, duchasPorDia: 1, duchaAhorradora: false,
  descargasPorPersona: 5, inodoroDobleDescarga: false,
  lavarropasPorSemana: 3, platosPorDia: 2, riegoMinPorSemana: 60,
  autoLavadosPorMes: 2, canillasQueGotean: 0,
};

const r = calcular(base);
assert.deepEqual(r.desglose, {
  ducha: 120,      // 10 × 12 × 1
  inodoro: 50,     // 5 × 10
  lavarropas: 11,  // 3 × 75 ÷ 7 ÷ 3 = 10,71
  platos: 23,      // 2 × 35 ÷ 3 = 23,33
  riego: 24,       // 60 × 8,3 ÷ 7 ÷ 3 = 23,71
  auto: 9,         // 2 × 400 ÷ 30 ÷ 3 = 8,89
  perdidas: 0,
});
assert.equal(r.totalLPersonaDia, 237);

// Ahorradora + doble descarga + 2 canillas goteando
const r2 = calcular({ ...base, duchaAhorradora: true, inodoroDobleDescarga: true, canillasQueGotean: 2 });
assert.equal(r2.desglose.ducha, 70);     // 10 × 7
assert.equal(r2.desglose.inodoro, 30);   // 5 × 6
assert.equal(r2.desglose.perdidas, 33);  // 2 × 50 ÷ 3 = 33,33

console.log('OK ✔ calcular() coincide con la cuenta en papel');
