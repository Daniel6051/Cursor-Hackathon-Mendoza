import { useEffect, useMemo, useState } from 'react';
import { Leaf, Sparkle } from '@phosphor-icons/react';
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
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Tu plan para ahorrar agua</h2>
        {cargando ? (
          <span role="status" className="flex items-center gap-2 text-sm muted">
            Personalizando… <span className="skeleton min-w-8" aria-hidden="true" />
          </span>
        ) : esIA ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold accent">
            <Sparkle size={15} aria-hidden="true" /> Personalizado con IA
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy={cargando}>
        {lista.map((c) => (
          <article
            key={c.uso}
            className="surface section-pad"
          >
            <span className="icon-tile verde"><Leaf size={18} aria-hidden="true" /></span>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide success-text">{c.uso}</p>
            <h3 className="mt-1 font-semibold">{c.titulo}</h3>
            <p className="mt-2 text-sm muted">{c.detalle}</p>
            {c.ahorroLitros !== undefined && (
              <p className="feedback exito mt-3">
                −{c.ahorroLitros} L/persona/día
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
