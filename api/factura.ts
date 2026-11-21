import Anthropic from '@anthropic-ai/sdk';

// Leer números de una foto necesita un modelo con buena visión; no hay timeout de 8 s acá.
export const config = { maxDuration: 30 };

const PROMPT = `Es una factura de agua de Mendoza, Argentina (AySAM u operador local). Respondé SOLO JSON {"medido":boolean,"consumoM3":number|null,"dias":number|null,"monto":number|null}.
- medido: true solo si la factura muestra consumo medido por medidor (lecturas anterior/actual o m3 consumidos). Si se cobra por superficie, cuota fija o "no medido", false.
- consumoM3: metros cúbicos consumidos en el período facturado.
- dias: cantidad de días del período (calculala de las fechas de lectura o del período si figuran).
- monto: importe total a pagar, en pesos, como número sin símbolos.
Si un dato no figura o no se lee bien, null. No inventes.`;

const SCHEMA = {
  type: 'object',
  properties: {
    medido: { type: 'boolean' },
    consumoM3: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    dias: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    monto: { anyOf: [{ type: 'number' }, { type: 'null' }] },
  },
  required: ['medido', 'consumoM3', 'dias', 'monto'],
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

export async function POST(request: Request) {
  if (!process.env.AI_API_KEY) return json({ error: 'Falta AI_API_KEY' }, 500);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body inválido' }, 400);
  }
  const { imagenBase64, mimeType } = body ?? {};
  const esPdf = mimeType === 'application/pdf';
  if (typeof imagenBase64 !== 'string' || !imagenBase64 || (!esPdf && !IMAGENES.includes(mimeType))) {
    return json({ error: 'Archivo inválido' }, 400);
  }

  // La imagen se usa solo para esta llamada: no se guarda en ningún lado.
  const archivo = esPdf
    ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: imagenBase64 } }
    : { type: 'image' as const, source: { type: 'base64' as const, media_type: mimeType, data: imagenBase64 } };

  try {
    const client = new Anthropic({ apiKey: process.env.AI_API_KEY, timeout: 25000, maxRetries: 0 });
    const res = await client.messages.create({
      model: 'claude-sonnet-5-5',
      max_tokens: 2000,
      thinking: { type: 'between_tools' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: [archivo, { type: 'text', text: PROMPT }] }],
    } as any);

    if (res.stop_reason === 'refusal') return json({ error: 'No se pudo leer la factura' }, 500);
    const texto = res.content.find((b: any) => b.type === 'text') as { text: string } | undefined;
    if (!texto) return json({ error: 'No se pudo leer la factura' }, 500);

    const d = JSON.parse(texto.text);
    if (typeof d.medido !== 'boolean') return json({ error: 'No se pudo leer la factura' }, 500);

    return json({
      medido: d.medido,
      consumoM3: numeroOk(d.consumoM3, 2000),
      dias: numeroOk(d.dias, 400),
      monto: numeroOk(d.monto, 100_000_000),
    });
  } catch (err) {
    console.error('factura IA falló:', err);
    return json({ error: 'No se pudo leer la factura' }, 500);
  }
}
