import { useEffect, useMemo, useState } from 'react';
import type { Habitos, Resultado } from '../types';
import { calcular } from '../lib/calculo'; // lo implementa B
import { aplicarConsejo, consejosFallback, type Consejo } from '../lib/fallback';

type Props = { resultado: Resultado; habitos: Habitos };

const TIMEOUT_MS = 8000;
const DEBOUNCE_MS = 600;

/** El ahorro lo calcula calcular() de B, no la IA. */
function conAhorro(consejos: Consejo[], habitos: Habitos, resultado: Resultado): Consejo[] {
  return consejos.map((c) => {
    try {
      const nuevo = calcular(aplicarConsejo(c.uso, habitos));
      const ahorro = Math.round(resultado.totalLPersonaDia - nuevo.totalLPersonaDia);
      return { ...c, ahorroLitros: ahorro > 0 ? ahorro : undefined };
    } catch {
      return c;
    }
  });
}

export default function Consejos({ resultado, habitos }: Props) {
  // El padre puede pasar objetos nuevos en cada render: comparamos por contenido.
  const clave = JSON.stringify({ resultado, habitos });
  const fallback = useMemo(() => consejosFallback(resultado), [JSON.stringify(resultado)]); // eslint-disable-line react-hooks/exhaustive-deps
  const [consejos, setConsejos] = useState<Consejo[]>(fallback);
  const [esIA, setEsIA] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Arrancamos siempre con el fallback: nunca queda vacío.
    setConsejos(fallback);
    setEsIA(false);
    setCargando(true);

    let desmontado = false;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Esperamos a que el usuario suelte el slider antes de llamar a la IA.
    const debounce = setTimeout(() => {
      timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      fetch('/api/consejos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: clave,
        signal: controller.signal,
      })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { consejos?: Consejo[] }) => {
        if (!desmontado && Array.isArray(data.consejos) && data.consejos.length > 0) {
          setConsejos(data.consejos);
          setEsIA(true);
        }
      })
      .catch(() => {
        /* Sin errores al usuario: queda el fallback. */
      })
      .finally(() => {
        clearTimeout(timer);
        if (!desmontado) setCargando(false);
      });
    }, DEBOUNCE_MS);

    return () => {
      desmontado = true;
      clearTimeout(debounce);
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const lista = useMemo(() => conAhorro(consejos, habitos, resultado), [consejos, habitos, resultado]);

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#0E2A3B]">Tu plan para ahorrar agua</h2>
        {cargando ? (
          <span className="animate-pulse text-sm text-[#2BB3C0]">Personalizando…</span>
        ) : esIA ? (
          <span className="rounded-full bg-[#2BB3C0]/15 px-2 py-0.5 text-xs font-medium text-[#0E2A3B]">
            ✨ Personalizado con IA
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {lista.map((c) => (
          <article
            key={c.uso}
            className="rounded-2xl border-l-4 border-[#2BB3C0] bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2BB3C0]">{c.uso}</p>
            <h3 className="mt-1 font-semibold text-[#0E2A3B]">{c.titulo}</h3>
            <p className="mt-2 text-sm text-slate-600">{c.detalle}</p>
            {c.ahorroLitros !== undefined && (
              <p className="mt-3 inline-block rounded-lg bg-[#0E2A3B] px-2 py-1 text-sm font-bold text-white">
                −{c.ahorroLitros} L/persona/día
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
