export type CamposFactura = {
  consumo: number | null;
  dias: number | null;
  tipo: 'medido' | 'presunto' | null;
};

const numero = String.raw`\d+(?:[.,]\d+)*`;
const fecha = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4}|\d{2})\b/g;

export function numeroFactura(texto: string): number | null {
  const limpio = texto.trim();
  if (!new RegExp(`^${numero}$`).test(limpio)) return null;
  const valor = /^[0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]+)?$/.test(limpio)
    ? Number(limpio.replaceAll('.', '').replace(',', '.'))
    : Number(limpio.replace(',', '.'));
  return Number.isFinite(valor) ? valor : null;
}

function valorTras(texto: string, etiqueta: string) {
  // Si la etiqueta se encuentra en una línea aparte, admitir solo un salto antes del número.
  const patron = new RegExp(`(?:${etiqueta})(?:[ \\t]+(?:del |de |en )?(?:periodo|m3))*[ \\t:|=–-]*\\n?[ \\t]*(${numero})(?![\\d.,]|[/-]\\d)`, 'i');
  const coincidencias = [...texto.matchAll(new RegExp(patron.source, 'gi'))];
  const valores = [...new Set(coincidencias.map(item => numeroFactura(item[1])))];
  return valores.length === 1 ? valores[0] : null;
}

function duracion(texto: string) {
  const explicita = valorTras(texto, 'dias(?: del periodo| facturados)?|duracion del periodo');
  if (explicita !== null && Number.isInteger(explicita) && explicita > 0 && explicita <= 400) return explicita;
  const linea = texto.split('\n').find(l => /periodo|desde|lectura anterior/.test(l) && [...l.matchAll(fecha)].length === 2);
  if (linea) {
    const fechas = [...linea.matchAll(fecha)].map(([, d, m, a]) => {
      const anio = Number(a.length === 2 ? '20' + a : a);
      const instante = new Date(Date.UTC(anio, Number(m) - 1, Number(d)));
      return instante.getUTCDate() === Number(d) && instante.getUTCMonth() + 1 === Number(m) ? +instante : NaN;
    });
    const dias = (fechas[1] - fechas[0]) / 86400000;
    if (dias > 0 && dias <= 400) return dias;
  }
  if (/\bperiodo\s*:?\s*bimestral\b/.test(texto)) return 60;
  if (/\bperiodo\s*:?\s*mensual\b/.test(texto)) return 30;
  return null;
}

export function extraerCamposFactura(original: string): CamposFactura {
  const texto = original.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/m\s*[³3]/g, 'm3').replace(/\r\n?/g, '\n');
  const presunto = valorTras(texto, 'consumo (?:presunto|asignado|basico|incluido)|m3 (?:presuntos|asignados|incluidos)');
  const medido = valorTras(texto, 'consumo (?:medido|real)|m3 consumidos');
  const informado = valorTras(texto, '\\bconsumo(?: facturado| del periodo| total)?');
  const superficie = /\b(?:no medid[ao]|por superficie|cuota fija)\b/.test(texto);
  const anterior = valorTras(texto, 'lectura anterior');
  const actual = valorTras(texto, 'lectura actual');
  const diferencia = anterior !== null && actual !== null && actual >= anterior ? actual - anterior : null;
  const tipo = superficie ? 'presunto' : medido !== null || diferencia !== null ? 'medido' : presunto !== null ? 'presunto' : null;
  const consumo = tipo === 'medido' ? medido ?? diferencia : tipo === 'presunto' ? presunto ?? informado : informado;
  return { consumo, tipo, dias: duracion(texto) };
}
