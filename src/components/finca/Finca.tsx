import { useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  calcularFinca,
  EFICIENCIAS_RIEGO_ESTIMADAS,
  NOTA_METODOLOGICA,
  NOTA_SUPUESTOS,
  SUPUESTO_CONSUMO_MENSUAL_POR_PERSONA_M3,
  type Cultivo,
  type DatosFinca,
  type MetodoRiego,
} from '../../lib/finca';
import { obtenerConsejosFinca } from './consejosFinca';

const CULTIVOS: Cultivo[] = ['Vid', 'Olivo', 'Frutales', 'Huerta'];
const METODOS: MetodoRiego[] = ['Manto', 'Surco', 'Goteo'];

const NAVY = '#0E2A3B';
const TEAL = '#2BB3C0';
const ORANGE = '#F2994A';

const numero = new Intl.NumberFormat('es-AR');

const inputClassName =
  'mt-1 w-full rounded-xl border border-[#0E2A3B]/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2BB3C0] focus:ring-2 focus:ring-[#2BB3C0]/25 disabled:cursor-not-allowed disabled:opacity-70';

const eficienciasTexto = (Object.entries(EFICIENCIAS_RIEGO_ESTIMADAS) as [MetodoRiego, number][])
  .map(([metodo, eficiencia]) => `${metodo} ${Math.round(eficiencia * 100)}%`)
  .join(' · ');

function Campo({
  etiqueta,
  htmlFor,
  error,
  children,
}: {
  etiqueta: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {etiqueta}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-[#B4542A]">{error}</p> : null}
    </div>
  );
}

function Switch({ activo, onChange }: { activo: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label="¿Y si pasás a goteo?"
      onClick={onChange}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
        activo ? 'bg-[#2BB3C0]' : 'bg-[#0E2A3B]/30'
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          activo ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function Finca() {
  const [cultivo, setCultivo] = useState<Cultivo | ''>('Vid');
  const [superficie, setSuperficie] = useState('5');
  const [metodoRiego, setMetodoRiego] = useState<MetodoRiego | ''>('Manto');
  const [consumoMensual, setConsumoMensual] = useState('30000');
  const [usarGoteo, setUsarGoteo] = useState(false);

  const superficieNumero = Number(superficie);
  const consumoNumero = Number(consumoMensual);

  const errores = {
    cultivo: cultivo ? '' : 'Elegí un cultivo.',
    superficie:
      Number.isFinite(superficieNumero) && superficieNumero > 0
        ? ''
        : 'Ingresá una superficie mayor a 0.',
    metodoRiego: metodoRiego ? '' : 'Elegí un método de riego.',
    consumoMensual:
      Number.isFinite(consumoNumero) && consumoNumero > 0
        ? ''
        : 'Ingresá un consumo mensual mayor a 0.',
  };
  const hayErrores = Object.values(errores).some(Boolean);

  const metodoMostrado: MetodoRiego = usarGoteo ? 'Goteo' : metodoRiego || 'Manto';

  const datos = useMemo<DatosFinca>(
    () => ({
      cultivo,
      superficieHa: superficieNumero,
      metodoRiego: metodoRiego || 'Manto',
      consumoMensualM3: consumoNumero,
    }),
    [cultivo, superficieNumero, metodoRiego, consumoNumero],
  );

  const resultadoPotencial = useMemo(() => calcularFinca(datos), [datos]);

  const resultado = useMemo(() => {
    if (!resultadoPotencial.datosValidos || !usarGoteo) {
      return resultadoPotencial;
    }
    const consumoGoteo = resultadoPotencial.consumoConGoteoM3;
    return {
      ...resultadoPotencial,
      consumoActualM3: consumoGoteo,
      consumoConGoteoM3: consumoGoteo,
      aguaAhorradaM3: 0,
      porcentajeAhorro: 0,
      personasAbastecidas: 0,
      yaUtilizaGoteo: true,
    };
  }, [resultadoPotencial, usarGoteo]);

  const resultadoMostrado = hayErrores
    ? {
        ...resultado,
        datosValidos: false,
        consumoActualM3: 0,
        consumoConGoteoM3: 0,
        aguaAhorradaM3: 0,
        porcentajeAhorro: 0,
        personasAbastecidas: 0,
        yaUtilizaGoteo: false,
      }
    : resultado;

  const consejos = useMemo(() => obtenerConsejosFinca(metodoMostrado), [metodoMostrado]);

  const tituloResultado = hayErrores
    ? 'Completá los datos de la finca para ver la estimación.'
    : usarGoteo
      ? `Pasaste a goteo: ahora consumís ${numero.format(resultadoMostrado.consumoActualM3)} m³ por mes, sin ahorro adicional (0%).`
      : resultadoMostrado.yaUtilizaGoteo
        ? 'Tu finca ya usa el sistema más eficiente contemplado por el simulador.'
        : `Con goteo ahorrarías ${numero.format(resultadoMostrado.aguaAhorradaM3)} m³ por mes (${numero.format(resultadoMostrado.porcentajeAhorro)}%).`;

  const textoPersonas = hayErrores
    ? 'Completá los datos para calcular la equivalencia.'
    : resultadoMostrado.personasAbastecidas > 0
      ? `El agua ahorrada alcanzaría para abastecer a ${numero.format(resultadoMostrado.personasAbastecidas)} mendocinos durante un mes.`
      : 'No hay ahorro adicional en este escenario, por eso no hay excedente para abastecer a más mendocinos.';

  const datosGrafico = [
    {
      nombre: usarGoteo ? 'Hoy · goteo' : 'Hoy',
      eficiente: resultadoMostrado.consumoConGoteoM3,
      evitable: resultadoMostrado.aguaAhorradaM3,
    },
    {
      nombre: 'Con goteo',
      eficiente: resultadoMostrado.consumoConGoteoM3,
      evitable: 0,
    },
  ];

  return (
    <section className="w-full bg-[#F4F8F7] px-4 py-10 font-sans text-[#0E2A3B]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#2BB3C0]">
            Uso eficiente del agua
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Mi finca</h1>
          <p className="mt-3 max-w-2xl text-sm text-[#0E2A3B]/70 sm:text-base">
            Cerca del 81% del agua de Mendoza se destina al sector agropecuario. Cargá los datos
            de tu explotación y compará tu riego actual con el riego por goteo.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={(evento) => evento.preventDefault()}
            className="rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-[#0E2A3B]/10 sm:px-8"
          >
            <h2 className="font-display text-2xl font-semibold">Datos de la finca</h2>
            <p className="mt-1 text-sm text-[#0E2A3B]/70">
              Usá tus valores habituales para obtener una estimación comparable.
            </p>

            <div className="mt-6 flex flex-col gap-5">
              <Campo etiqueta="Cultivo" htmlFor="finca-cultivo" error={errores.cultivo}>
                <select
                  id="finca-cultivo"
                  value={cultivo}
                  onChange={(evento) => setCultivo(evento.target.value as Cultivo | '')}
                  className={inputClassName}
                >
                  {CULTIVOS.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {opcion}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo etiqueta="Superficie (hectáreas)" htmlFor="finca-superficie" error={errores.superficie}>
                <input
                  id="finca-superficie"
                  type="number"
                  min="0"
                  step="0.1"
                  value={superficie}
                  onChange={(evento) => setSuperficie(evento.target.value)}
                  className={inputClassName}
                />
              </Campo>

              <Campo etiqueta="Método de riego" htmlFor="finca-metodo" error={errores.metodoRiego}>
                <select
                  id="finca-metodo"
                  value={metodoMostrado}
                  disabled={usarGoteo}
                  onChange={(evento) => setMetodoRiego(evento.target.value as MetodoRiego | '')}
                  className={inputClassName}
                >
                  {METODOS.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {opcion}
                    </option>
                  ))}
                </select>
              </Campo>
              <p className="-mt-3 text-xs text-[#0E2A3B]/60">
                Eficiencia estimada del método activo:{' '}
                {Math.round(EFICIENCIAS_RIEGO_ESTIMADAS[metodoMostrado] * 100)}%.
              </p>

              <Campo
                etiqueta="Agua utilizada por mes (m³)"
                htmlFor="finca-consumo"
                error={errores.consumoMensual}
              >
                <input
                  id="finca-consumo"
                  type="number"
                  min="0"
                  step="1"
                  value={consumoMensual}
                  onChange={(evento) => setConsumoMensual(evento.target.value)}
                  className={inputClassName}
                />
              </Campo>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-[#F4F8F7] p-4 ring-1 ring-[#0E2A3B]/10">
              <div>
                <p className="font-medium">¿Y si pasás a goteo?</p>
                <p className="text-xs text-[#0E2A3B]/60">
                  {usarGoteo
                    ? `Vista previa activa. Al desactivar volvés a ${metodoRiego || 'tu método original'}.`
                    : 'Probá el cambio sin recargar la página.'}
                </p>
              </div>
              <Switch activo={usarGoteo} onChange={() => setUsarGoteo((activo) => !activo)} />
            </div>
          </form>

          <div className="flex flex-col gap-6">
            <article className="rounded-3xl bg-[#0E2A3B] px-6 py-7 text-white shadow-sm sm:px-8">
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#2BB3C0]">
                Resultado estimado
              </p>
              <p className="mt-3 font-display text-2xl font-semibold leading-snug sm:text-3xl">
                {tituloResultado}
              </p>
              <p className="mt-4 text-sm text-white/75 sm:text-base">{textoPersonas}</p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs text-white/70">Consumo actual</p>
                  <p className="mt-1 font-display text-2xl font-semibold">
                    {numero.format(resultadoMostrado.consumoActualM3)}
                  </p>
                  <p className="text-xs text-white/70">m³ por mes</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs text-white/70">Con goteo</p>
                  <p className="mt-1 font-display text-2xl font-semibold text-[#2BB3C0]">
                    {numero.format(resultadoMostrado.consumoConGoteoM3)}
                  </p>
                  <p className="text-xs text-white/70">m³ por mes</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs text-white/70">Ahorro</p>
                  <p className="mt-1 font-display text-2xl font-semibold text-[#F2994A]">
                    {numero.format(resultadoMostrado.aguaAhorradaM3)}
                  </p>
                  <p className="text-xs text-white/70">m³ por mes</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs text-white/70">Mendocinos</p>
                  <p className="mt-1 font-display text-2xl font-semibold">
                    {numero.format(resultadoMostrado.personasAbastecidas)}
                  </p>
                  <p className="text-xs text-white/70">durante un mes</p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-[#0E2A3B]/10 sm:px-8">
              <h2 className="text-lg font-semibold">Consumo actual vs. consumo con goteo</h2>
              <p className="mt-1 text-sm text-[#0E2A3B]/70">
                En naranja, el consumo evitable con el cambio de sistema.
              </p>
              <div className="mt-4 h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosGrafico} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(14,42,59,0.08)" />
                    <XAxis
                      dataKey="nombre"
                      tick={{ fill: NAVY, fontSize: 13 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: NAVY, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                      tickFormatter={(valor) => numero.format(Number(valor))}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(14,42,59,0.05)' }}
                      formatter={(valor) => [`${numero.format(Number(valor))} m³`, 'Agua']}
                    />
                    <Bar dataKey="eficiente" stackId="agua" fill={TEAL} maxBarSize={84} />
                    <Bar
                      dataKey="evitable"
                      stackId="agua"
                      fill={ORANGE}
                      radius={[8, 8, 0, 0]}
                      maxBarSize={84}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#0E2A3B]/70">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: TEAL }} />
                  Uso eficiente
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: ORANGE }} />
                  Consumo evitable
                </span>
              </div>
            </article>
          </div>
        </div>

        <article className="rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-[#0E2A3B]/10 sm:px-8">
          <h2 className="text-lg font-semibold">Consejos para tu finca</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {consejos.map((consejo, indice) => (
              <div key={consejo.titulo} className="rounded-2xl bg-[#F4F8F7] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2BB3C0]">
                  0{indice + 1}
                </p>
                <p className="mt-2 font-medium">{consejo.titulo}</p>
                <p className="mt-1 text-sm text-[#0E2A3B]/70">{consejo.detalle}</p>
              </div>
            ))}
          </div>
        </article>

        <p className="px-2 text-xs leading-relaxed text-[#0E2A3B]/60">
          {NOTA_METODOLOGICA} {NOTA_SUPUESTOS} Eficiencias usadas: {eficienciasTexto}. Supuesto de
          consumo por persona: {numero.format(SUPUESTO_CONSUMO_MENSUAL_POR_PERSONA_M3)} m³ al mes.
        </p>
      </div>
    </section>
  );
}

export default Finca;
