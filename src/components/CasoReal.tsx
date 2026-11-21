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
    <article className="mt-4 rounded-2xl border-l-4 border-[#2BB3C0] bg-[#F4F8F7] p-4 shadow-sm ring-1 ring-[#0E2A3B]/10">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#2BB3C0]">Caso real</p>
      <h3 className="mt-1 font-semibold text-[#0E2A3B]">{caso.titulo}</h3>
      {caso.lugar ? <p className="text-xs text-[#0E2A3B]/60">{caso.lugar}</p> : null}
      <p className="mt-3 font-display text-lg font-semibold leading-snug text-[#0E2A3B]">{caso.dato}</p>
      <p className="mt-2 text-sm text-[#0E2A3B]/70">{explicacion}</p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-[#0E2A3B]/60">
        <span>Fuente: {fuente}</span>
        {caso.url ? (
          <a
            href={caso.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-[#2BB3C0] underline-offset-2 hover:underline"
          >
            Ver fuente
          </a>
        ) : (
          <span className="font-semibold text-[#B4542A]">Fuente pendiente de verificación</span>
        )}
      </div>
    </article>
  );
}

export default CasoReal;
