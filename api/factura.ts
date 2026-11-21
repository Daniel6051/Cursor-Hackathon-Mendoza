import Anthropic from '@anthropic-ai/sdk';
import { MENDOZA, OMS } from '../src/lib/constants';
import {
  brecha,
  consumoFactura,
  feedbackFijo,
  pesosPersonaMes,
  type AnalisisFactura,
  type DatosFactura,
} from '../src/lib/factura';

// Dos llamadas (leer + devolución): ~6-9 s. Nada se guarda: la imagen vive solo en este request.
export const config = { maxDuration: 30 };

const PROMPT_LEER = `Es una factura de agua de Mendoza, Argentina (AySAM u operador local). Analizala en detalle y respondé SOLO JSON.
- medido: true solo si muestra consumo medido por medidor (lecturas anterior/actual o m3 consumidos). Si se cobra por superficie, cuota fija o "no medido", false.
- consumoM3: m3 consumidos en el período (solo si es medida).
- consumoPresuntoM3: si NO es medida, los m3 que la tarifa presume, asigna o incluye para el período (puede figurar como consumo presunto, básico, asignado, libre o similar). Si no figura, null.
- dias: días del período (de las fechas; si dice bimestre, 60; mensual, 30).
- monto: importe total a pagar en pesos, número sin símbolos.
Si un dato no figura o no se lee bien, null. No inventes.`;

const SCHEMA_LEER = {
  type: 'object',
  properties: {
    medido: { type: 'boolean' },
    consumoM3: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    consumoPresuntoM3: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    dias: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    monto: { anyOf: [{ type: 'number' }, { type: 'null' }] },
  },
  required: ['medido', 'consumoM3', 'consumoPresuntoM3', 'dias', 'monto'],
  additionalProperties: false,
};

const PROMPT_FEEDBACK = `Sos un asistente que ayuda a hogares de Mendoza, Argentina (emergencia hídrica), a entender su consumo de agua.
Recibís un JSON con HECHOS ya calculados sobre la factura del usuario y su estimación por hábitos. Escribí una devolución corta:
- "titulo": el veredicto en una frase corta (máximo 12 palabras): ¿está bien o no?
- "puntos": 2 o 3 frases cortas que interpreten qué significa y qué le conviene hacer.
Reglas: usá SOLO los números de los HECHOS, no calcules ni inventes otros. No repitas los datos de la factura (total, fechas, superficie): interpretalos.
No uses palabras técnicas como "fuente", "presunto" o "estimado por hábitos": hablá de "lo que te cobran", "lo que gastás según tus hábitos".
Si cobroPorSuperficie es true, la factura se cobra por superficie (eso es seguro, no lo pongas en duda).
Si la fuente es "presunto", explicá que es lo que la tarifa le cobra por superficie, no lo que gasta, y comparalo con su estimación (¿paga por más o por menos agua de la que usa? ¿le convendría pedir un medidor a AySAM?).
Si es "medido" y hay posible pérdida, decilo y sugerí revisar el medidor con todas las canillas cerradas.
Si no hay consumo en la factura, decí que se cobra por superficie y basá la devolución en la estimación contra OMS y Mendoza.
Español rioplatense, con 'vos', tono cercano y concreto.`;

const SCHEMA_FEEDBACK = {
  type: 'object',
  properties: {
    titulo: { type: 'string' },
    puntos: { type: 'array', items: { type: 'string' } },
  },
  required: ['titulo', 'puntos'],
  additionalProperties: false,
};

const IMAGENES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Descarta valores imposibles en vez de mostrarlos.
const numeroOk = (v: unknown, max: number) =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= max ? v : null;

function textoDe(res: any): string | null {
  if (res.stop_reason === 'refusal') return null;
  const b = res.content.find((x: any) => x.type === 'text');
  return b ? b.text : null;
}

export async function POST(request: Request) {
  if (!process.env.AI_API_KEY) return json({ error: 'Falta AI_API_KEY' }, 500);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body inválido' }, 400);
  }
  const { imagenBase64, mimeType } = body ?? {};
  const personas = Math.max(1, Math.round(Number(body?.personas) || 1));
  const estimado = Math.round(Number(body?.estimado) || 0);
  const esPdf = mimeType === 'application/pdf';
  if (typeof imagenBase64 !== 'string' || !imagenBase64 || (!esPdf && !IMAGENES.includes(mimeType)) || estimado <= 0) {
    return json({ error: 'Archivo inválido' }, 400);
  }

  const archivo = esPdf
    ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: imagenBase64 } }
    : { type: 'image' as const, source: { type: 'base64' as const, media_type: mimeType, data: imagenBase64 } };

  const client = new Anthropic({ apiKey: process.env.AI_API_KEY, timeout: 20000, maxRetries: 0 });

  // 1) Leer la factura (modelo con buena visión).
  let datos: DatosFactura;
  try {
    const res = await client.messages.create({
      model: 'claude-sonnet-5-5',
      max_tokens: 2000,
      thinking: { type: 'between_tools' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA_LEER } },
      messages: [{ role: 'user', content: [archivo, { type: 'text', text: PROMPT_LEER }] }],
    } as any);
    const t = textoDe(res);
    if (!t) return json({ error: 'No se pudo leer la factura' }, 500);
    const d = JSON.parse(t);
    if (typeof d.medido !== 'boolean') return json({ error: 'No se pudo leer la factura' }, 500);
    datos = {
      medido: d.medido,
      consumoM3: numeroOk(d.consumoM3, 2000),
      consumoPresuntoM3: d.medido ? null : numeroOk(d.consumoPresuntoM3, 2000),
      dias: numeroOk(d.dias, 400),
      monto: numeroOk(d.monto, 100_000_000),
    };
  } catch (err) {
    console.error('factura: lectura falló:', err);
    return json({ error: 'No se pudo leer la factura' }, 500);
  }

  // 2) Las cuentas las hace el código, no la IA.
  const { fuente, litros } = consumoFactura(datos, personas);
  const b = litros !== null ? brecha(litros, estimado) : null;
  const hechos = {
    fuente,
    cobroPorSuperficie: !datos.medido,
    litrosFacturaPorPersonaDia: litros,
    estimadoPorHabitosPorPersonaDia: estimado,
    diferenciaFacturaMenosEstimado: litros !== null ? litros - estimado : null,
    posiblePerdida: fuente === 'medido' && b?.tipo === 'perdida',
    objetivoOMS: OMS,
    promedioMendoza: MENDOZA,
    pesosPorPersonaPorMes: pesosPersonaMes(datos, personas),
  };

  // 3) La IA escribe la devolución; si falla, va el texto fijo.
  let feedback = feedbackFijo(fuente, litros, estimado);
  try {
    const res = await client.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 800,
      thinking: { type: 'disabled' },
      system: PROMPT_FEEDBACK,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA_FEEDBACK } },
      messages: [{ role: 'user', content: JSON.stringify(hechos) }],
    } as any);
    const t = textoDe(res);
    if (t) {
      const f = JSON.parse(t);
      const puntos = Array.isArray(f.puntos) ? f.puntos.filter((p: unknown) => typeof p === 'string' && p).slice(0, 3) : [];
      if (typeof f.titulo === 'string' && f.titulo && puntos.length) feedback = { titulo: f.titulo, puntos };
    }
  } catch (err) {
    console.error('factura: devolución IA falló, uso la fija:', err);
  }

  const respuesta: AnalisisFactura = { medido: datos.medido, fuente, litrosFactura: litros, feedback };
  return json(respuesta);
}
