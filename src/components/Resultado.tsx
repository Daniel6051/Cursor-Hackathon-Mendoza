import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { calcular, MENDOZA, OMS } from '../lib/calculo';
import type { Desglose, Habitos, Resultado } from '../types';

const ETIQUETAS: Record<keyof Desglose, string> = {
  ducha: 'Ducha',
  inodoro: 'Inodoro',
  lavarropas: 'Lavarropas',
  platos: 'Platos',
  riego: 'Riego',
  auto: 'Auto',
  perdidas: 'Pérdidas',
};

const NAVY = '#0E2A3B';
const TEAL = '#2BB3C0';
const ORANGE = '#F2994A';
const OMS_BAR = '#8FB8C4';

const BIDON_L = 20;
const numero = new Intl.NumberFormat('es-AR');

type Props = {
  resultado: Resultado;
  habitos: Habitos;
};

function contra(total: number, referencia: number, nombre: string): string {
  const diferencia = total - referencia;
  if (diferencia > 0) return `${numero.format(diferencia)} L por encima de ${nombre} (${referencia})`;
  if (diferencia < 0) return `${numero.format(Math.abs(diferencia))} L por debajo de ${nombre} (${referencia})`;
  return `al nivel de ${nombre} (${referencia})`;
}

function textoAhorro(ahorro: number): string {
  if (ahorro > 0) return `Ahorrás ${numero.format(ahorro)} L por día`;
  if (ahorro < 0) return `Sumás ${numero.format(Math.abs(ahorro))} L por día`;
  return 'Ahorrás 0 L por día';
}

function bidonesPorMes(litrosPersonaDia: number, personas: number): number {
  return Math.round((litrosPersonaDia * Math.max(1, personas) * 30) / BIDON_L);
}

const CLAVES_DESGLOSE: (keyof Desglose)[] = [
  'ducha', 'inodoro', 'lavarropas', 'platos', 'riego', 'auto', 'perdidas',
];

// Acerca los litros al objetivo en cada frame, así las barras se deslizan
// en vez de saltar cuando se mueve un slider.
function useLitrosSuaves(objetivos: number[]) {
  const [valores, setValores] = useState(objetivos);
  const valoresRef = useRef(objetivos);
  const objetivosRef = useRef(objetivos);
  objetivosRef.current = objetivos;
  const firma = objetivos.join(',');

  useEffect(() => {
    let frame = 0;
    let vivo = true;

    const paso = () => {
      if (!vivo) return;
      const meta = objetivosRef.current;
      const actual = valoresRef.current;
      let listo = true;
      const siguiente = meta.map((destino, i) => {
        const desde = actual[i] ?? destino;
        const diferencia = destino - desde;
        if (Math.abs(diferencia) < 0.4) return destino;
        listo = false;
        return desde + diferencia * 0.16;
      });
      valoresRef.current = siguiente;
      setValores(siguiente);
      if (!listo) frame = requestAnimationFrame(paso);
    };

    frame = requestAnimationFrame(paso);
    return () => {
      vivo = false;
      cancelAnimationFrame(frame);
    };
  }, [firma]);

  return valores;
}

// Mantiene la escala mientras la barra se achica, y la agranda enseguida si el valor sube.
function useTechoEstable(objetivo: number) {
  const [techo, setTecho] = useState(objetivo);

  useEffect(() => {
    if (objetivo >= techo) {
      setTecho(objetivo);
      return;
    }
    const id = window.setTimeout(() => setTecho(objetivo), 700);
    return () => window.clearTimeout(id);
  }, [objetivo, techo]);

  return techo;
}

export function Resultado({ resultado, habitos }: Props) {
  const [duchaMin, setDuchaMin] = useState(habitos.duchaMin);
  const [descargasPorPersona, setDescargasPorPersona] = useState(habitos.descargasPorPersona);
  const [riegoMinPorSemana, setRiegoMinPorSemana] = useState(habitos.riegoMinPorSemana);

  useEffect(() => {
    setDuchaMin(habitos.duchaMin);
    setDescargasPorPersona(habitos.descargasPorPersona);
    setRiegoMinPorSemana(habitos.riegoMinPorSemana);
  }, [habitos.duchaMin, habitos.descargasPorPersona, habitos.riegoMinPorSemana]);

  const simulado = useMemo(
    () => calcular({ ...habitos, duchaMin, descargasPorPersona, riegoMinPorSemana }),
    [habitos, duchaMin, descargasPorPersona, riegoMinPorSemana],
  );

  const litrosSuaves = useLitrosSuaves(CLAVES_DESGLOSE.map((clave) => simulado.desglose[clave]));
  const suavePorUso = Object.fromEntries(
    CLAVES_DESGLOSE.map((clave, i) => [clave, litrosSuaves[i] ?? simulado.desglose[clave]]),
  ) as Desglose;
  const totalSuave = CLAVES_DESGLOSE.reduce((suma, clave) => suma + suavePorUso[clave], 0);
  const total = simulado.totalLPersonaDia;
  const ahorro = resultado.totalLPersonaDia - totalSuave;
  const personas = Math.max(1, habitos.personas);

  const comparacion = [
    { nombre: 'Vos', litros: totalSuave, fill: totalSuave > MENDOZA ? ORANGE : TEAL },
    { nombre: 'Mendoza', litros: MENDOZA, fill: NAVY },
    { nombre: 'OMS', litros: OMS, fill: OMS_BAR },
  ];
  const techoComparacion = useTechoEstable(Math.max(MENDOZA, Math.ceil(total / 50) * 50));
  const techoDesglose = useTechoEstable(Math.max(10, ...CLAVES_DESGLOSE.map((clave) => simulado.desglose[clave])));

  const desglose = CLAVES_DESGLOSE
    .map((clave) => ({ clave, nombre: ETIQUETAS[clave], litros: suavePorUso[clave] }))
    .sort((a, b) => simulado.desglose[b.clave] - simulado.desglose[a.clave] || a.nombre.localeCompare(b.nombre, 'es'));

  const duchaTope = Math.max(30, duchaMin);
  const descargasTope = Math.max(15, descargasPorPersona);
  const riegoTope = Math.max(300, riegoMinPorSemana);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 font-sans text-[#0E2A3B]">
      <header className="rounded-3xl bg-white px-6 py-8 shadow-sm ring-1 ring-[#0E2A3B]/10 sm:px-10">
        <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#2BB3C0]">
          Tu casa gasta
        </p>
        <img src="/logo-principal.png" alt="" className="h-16 w-16 shrink-0" />
        </div>
        <p className="mt-2 flex items-end gap-3">
          <span
            className="font-display text-7xl font-semibold leading-none transition-colors duration-500 sm:text-8xl"
            style={{ color: totalSuave > MENDOZA ? ORANGE : NAVY }}
          >
            {numero.format(Math.round(totalSuave))}
          </span>
          <span className="mb-2 text-lg font-medium leading-tight text-[#0E2A3B]/70">
            L por persona
            <br />
            por día
          </span>
        </p>
        <p className="mt-4 max-w-xl text-lg leading-snug">
          Estás {contra(Math.round(totalSuave), MENDOZA, 'Mendoza')} y {contra(Math.round(totalSuave), OMS, 'la OMS')}.
        </p>
        <p className="mt-3 text-sm text-[#0E2A3B]/70">
          Son unos {numero.format(Math.round((totalSuave * 30) / BIDON_L))} bidones de 20 L al mes por persona.
          En esta casa de {personas}, unos {numero.format(bidonesPorMes(totalSuave, personas))} bidones.
        </p>
      </header>

      <article className="rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-[#0E2A3B]/10 sm:px-8">
        <h2 className="text-lg font-semibold">Vos, Mendoza y la OMS</h2>
        <p className="mt-1 text-sm text-[#0E2A3B]/70">Litros por persona por día. El naranja aparece si superás Mendoza.</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparacion} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="nombre" tick={{ fill: NAVY, fontSize: 14 }} axisLine={false} tickLine={false} />
              <YAxis
                domain={[0, techoComparacion]}
                tick={{ fill: NAVY, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                cursor={{ fill: 'rgba(14,42,59,0.05)' }}
                formatter={(value) => [`${numero.format(Math.round(Number(value)))} L`, 'Por persona']}
              />
              <Bar dataKey="litros" radius={[10, 10, 0, 0]} maxBarSize={72} isAnimationActive={false}>
                {comparacion.map((barra) => (
                  <Cell key={barra.nombre} fill={barra.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-[#0E2A3B]/10 sm:px-8">
        <h2 className="text-lg font-semibold">En qué se va el agua</h2>
        <p className="mt-1 text-sm text-[#0E2A3B]/70">
          De mayor a menor. Suma {numero.format(Math.round(totalSuave))} L, el mismo total de arriba.
        </p>
        <div className="mt-2 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={desglose}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
            >
              <XAxis
                type="number"
                domain={[0, Math.ceil(techoDesglose / 10) * 10]}
                tick={{ fill: NAVY, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="nombre"
                width={92}
                tick={{ fill: NAVY, fontSize: 13 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(43,179,192,0.08)' }}
                formatter={(value) => [`${numero.format(Math.round(Number(value)))} L`, 'Por persona']}
              />
              <Bar dataKey="litros" fill={TEAL} radius={[0, 8, 8, 0]} barSize={18} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-3xl bg-[#0E2A3B] px-6 py-6 text-white shadow-sm sm:px-8">
        <div className="flex items-center gap-3">
          <img src="/icono-claro.png" alt="" className="h-10 w-10" />
          <h2 className="text-lg font-semibold">Simulador</h2>
        </div>
        <p className="mt-1 text-sm text-white/70">
          Partís de tus hábitos. Al mover un slider se vuelve a calcular todo, en el momento.
        </p>

        <div className="mt-6 flex flex-col gap-5">
          <Slider
            id="duchaMin"
            label="Minutos de ducha"
            valor={duchaMin}
            min={1}
            max={duchaTope}
            unidad="min"
            onChange={setDuchaMin}
          />
          <Slider
            id="descargasPorPersona"
            label="Descargas por persona"
            valor={descargasPorPersona}
            min={1}
            max={descargasTope}
            unidad="por día"
            onChange={setDescargasPorPersona}
          />
          <Slider
            id="riegoMinPorSemana"
            label="Minutos de riego por semana"
            valor={riegoMinPorSemana}
            min={0}
            max={riegoTope}
            unidad="min"
            onChange={setRiegoMinPorSemana}
          />
        </div>

        <div className="mt-6 flex flex-col gap-2 rounded-2xl bg-white/10 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
          <p>
            <span className="block text-sm text-white/70">Nuevo total</span>
            <span className="font-display text-4xl font-semibold">{numero.format(Math.round(totalSuave))} L</span>
          </p>
          <p
            className="text-xl font-semibold"
            style={{ color: ahorro > 0 ? '#7DDFC3' : ahorro < 0 ? ORANGE : '#FFFFFF' }}
          >
            {textoAhorro(ahorro)}
          </p>
        </div>
        <p className="mt-3 text-sm text-white/60">
          Tus hábitos cargados dan {numero.format(resultado.totalLPersonaDia)} L por persona por día.
          {ahorro > 0
            ? ` Ese ahorro son unos ${numero.format(bidonesPorMes(ahorro, personas))} bidones de 20 L al mes en la casa.`
            : ''}
        </p>
        <button
          type="button"
          className="mt-4 text-sm font-medium text-[#2BB3C0] underline-offset-2 hover:underline"
          onClick={() => {
            setDuchaMin(habitos.duchaMin);
            setDescargasPorPersona(habitos.descargasPorPersona);
            setRiegoMinPorSemana(habitos.riegoMinPorSemana);
          }}
        >
          Volver a tus hábitos
        </button>
      </article>

      <p className="px-2 text-xs leading-relaxed text-[#0E2A3B]/60">
        ¿De dónde salen los números? Ducha 12 L/min (7 si es ahorradora), referencia MITECO.
        Mendoza 400 L por persona por día (AySAM) y OMS 250 L. El resto de los usos sale de la tabla
        ERAS (argentina.gob.ar): descarga 10 L, lavarropas 75 L, platos 35 L, riego 500 L/hora,
        auto 400 L, canilla que gotea 50 L por día. Cada barra está redondeada a litros enteros y el
        total es la suma de esas barras.
      </p>
    </section>
  );
}

function Slider({
  id,
  label,
  valor,
  min,
  max,
  unidad,
  onChange,
}: {
  id: string;
  label: string;
  valor: number;
  min: number;
  max: number;
  unidad: string;
  onChange: (valor: number) => void;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="font-semibold text-[#2BB3C0]">
          {numero.format(valor)} {unidad}
        </span>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={valor}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-[#2BB3C0]"
      />
    </label>
  );
}
