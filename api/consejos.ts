import Anthropic from '@anthropic-ai/sdk';
import type { Habitos, Resultado } from '../src/types';

const USOS = ['ducha', 'inodoro', 'lavarropas', 'platos', 'riego', 'auto', 'perdidas'] as const;

const SYSTEM_PROMPT = `Sos un asistente que ayuda a hogares de Mendoza, Argentina, a cuidar el agua (emergencia hídrica). Recibís un JSON con el consumo en litros por persona por día, desglosado por uso, y los hábitos. No calcules ni inventes números. Elegí los 3 usos con más litros y proponé un cambio concreto y realista para cada uno. Español rioplatense, con 'vos', tono cercano. Respondé SOLO JSON: {"consejos":[{"uso":"ducha","titulo":"...","detalle":"..."}]}`;

const SCHEMA = {
  type: 'object',
  properties: {
    consejos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          uso: { type: 'string', enum: [...USOS] },
          titulo: { type: 'string' },
          detalle: { type: 'string' },
        },
        required: ['uso', 'titulo', 'detalle'],
        additionalProperties: false,
      },
    },
  },
  required: ['consejos'],
  additionalProperties: false,
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function bodyValido(b: any): b is { resultado: Resultado; habitos: Habitos } {
  return (
    b && typeof b === 'object' &&
    b.resultado && typeof b.resultado.totalLPersonaDia === 'number' &&
    b.resultado.desglose && USOS.every((u) => typeof b.resultado.desglose[u] === 'number') &&
    b.habitos && typeof b.habitos === 'object'
  );
}

export async function POST(request: Request) {
  if (!process.env.AI_API_KEY) return json({ error: 'Falta AI_API_KEY' }, 500);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body inválido' }, 400);
  }
  if (!bodyValido(body)) return json({ error: 'Body inválido' }, 400);

  try {
    // Haiku sin razonamiento previo: ~3 s, bien por debajo del timeout de 8 s del front.
    // (Opus tardaba ~13 s y Sonnet ~7 s: siempre caía al fallback.)
    const client = new Anthropic({ apiKey: process.env.AI_API_KEY, timeout: 7000, maxRetries: 0 });
    const res = await client.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [
        { role: 'user', content: JSON.stringify({ resultado: body.resultado, habitos: body.habitos }) },
      ],
    } as any);

    if (res.stop_reason === 'refusal') return json({ error: 'Sin consejos' }, 500);
    const texto = res.content.find((b: any) => b.type === 'text') as { text: string } | undefined;
    if (!texto) return json({ error: 'Sin consejos' }, 500);

    const data = JSON.parse(texto.text);
    const consejos = (data.consejos ?? [])
      .filter((c: any) => USOS.includes(c.uso) && c.titulo && c.detalle)
      .slice(0, 3);
    if (consejos.length === 0) return json({ error: 'Sin consejos' }, 500);

    return json({ consejos });
  } catch (err) {
    console.error('consejos IA falló:', err);
    return json({ error: 'No se pudieron generar consejos' }, 500);
  }
}
