import type { Caso } from '../casos';

type Props = { caso: Caso };

export function CasoReal({ caso }: Props) {
  return (
    <article className="rounded-2xl border-l-4 border-[#2BB3C0] bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-[#0E2A3B]">Caso real · {caso.lugar}</h3>
      <p className="mt-2 text-sm text-[#0E2A3B]/70">{caso.dato}</p>
      <a
        href={caso.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-sm font-medium text-[#2BB3C0] underline-offset-2 hover:underline"
      >
        Ver fuente
      </a>
    </article>
  );
}

export default CasoReal;
