import type { Caso } from '../data/casos';

type DatosCaso = Pick<Caso, 'titulo' | 'dato'> & Partial<Pick<Caso, 'lugar' | 'fuente' | 'url'>>;

type Props = {
  caso: DatosCaso;
  explicacion: string;
};

function nombreFuente(caso: DatosCaso): string {
  if (caso.fuente) return caso.fuente;
  if (!caso.url) return 'Pendiente de verificación';
  try {
    return new URL(caso.url).hostname.replace(/^www\./, '');
  } catch {
    return 'Pendiente de verificación';
  }
}

export function CasoReal({ caso, explicacion }: Props) {
  const fuente = nombreFuente(caso);

  return (
    <article className="mt-4 rounded-2xl border-l-4 border-[#2BB3C0] bg-[var(--field)] p-4 shadow-sm ring-1 ring-[var(--border)]">
      <p className="text-xs font-semibold uppercase tracking-wide accent">Caso real</p>
      <h3 className="mt-1 font-semibold text-[var(--text)]">{caso.titulo}</h3>
      {caso.lugar ? <p className="text-xs muted">{caso.lugar}</p> : null}
      <p className="mt-3 font-display text-lg font-semibold leading-snug text-[var(--text)]">{caso.dato}</p>
      <p className="mt-2 text-sm muted">{explicacion}</p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs muted">
        <span>Fuente: {fuente}</span>
        {caso.url ? (
          <a
            href={caso.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold accent underline-offset-2 hover:underline"
          >
            Ver fuente
          </a>
        ) : (
          <span className="font-semibold warning-text">Fuente pendiente de verificación</span>
        )}
      </div>
    </article>
  );
}

export default CasoReal;
