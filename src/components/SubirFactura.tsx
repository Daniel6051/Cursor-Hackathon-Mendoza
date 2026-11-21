import { useEffect, useRef, useState } from 'react';
import { MENDOZA, OMS } from '../lib/constants';
import {
  ahorroMensualOMS,
  brecha,
  lPersonaDia,
  precioM3,
  veredicto,
  type DatosFactura,
} from '../lib/factura';

type Props = { personas: number; estimado: number };

type Estado =
  | { paso: 'inicio' }
  | { paso: 'leyendo' }
  | { paso: 'listo'; datos: DatosFactura }
  | { paso: 'manual'; motivo: string };

const LADO_MAX = 1600;
const MAX_PDF_BYTES = 3_000_000; // Vercel limita el body a ~4,5 MB (y base64 suma un 33%)
const numero = new Intl.NumberFormat('es-AR');
const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

/** Achica la foto a 1600 px de lado máximo y la pasa a JPEG en base64. */
function achicarImagen(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('imagen'));
    };
    img.src = url;
  });
}

function leerBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export default function SubirFactura({ personas, estimado }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>({ paso: 'inicio' });
  const [m3, setM3] = useState('');
  const [dias, setDias] = useState('');

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function elegir(file: File | undefined) {
    if (!file) return;
    setArchivo(file);
    setPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    setEstado({ paso: 'inicio' });
  }

  async function leer() {
    if (!archivo) return;
    setEstado({ paso: 'leyendo' });
    try {
      let imagenBase64: string;
      let mimeType: string;
      if (archivo.type === 'application/pdf') {
        if (archivo.size > MAX_PDF_BYTES) throw new Error('pesado');
        imagenBase64 = await leerBase64(archivo);
        mimeType = 'application/pdf';
      } else {
        imagenBase64 = await achicarImagen(archivo);
        mimeType = 'image/jpeg';
      }
      const r = await fetch('/api/factura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagenBase64, mimeType }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) throw new Error('api');
      const datos: DatosFactura = await r.json();
      // Medida pero sin los números: completalos a mano.
      if (datos.medido && (!datos.consumoM3 || !datos.dias)) {
        if (datos.consumoM3) setM3(String(datos.consumoM3));
        if (datos.dias) setDias(String(datos.dias));
        setEstado({ paso: 'manual', motivo: 'Tu factura es medida, pero no pudimos leer todos los datos.' });
        return;
      }
      setEstado({ paso: 'listo', datos });
    } catch {
      setEstado({ paso: 'manual', motivo: 'No pudimos leer la factura. Cargá los datos a mano:' });
    }
  }

  function usarManual(e: React.FormEvent) {
    e.preventDefault();
    const consumoM3 = Number(m3.replace(',', '.'));
    const d = Number(dias);
    if (consumoM3 > 0 && d > 0) {
      setEstado({ paso: 'listo', datos: { medido: true, consumoM3, dias: d, monto: null } });
    }
  }

  return (
    <section className="tarjeta rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0E2A3B]/5">
      <h3 className="text-lg font-bold text-[#0E2A3B]">¿Esto es lo que gastás de verdad?</h3>
      <p className="mt-1 text-sm text-slate-600">
        Subí tu factura de agua y la comparamos con la estimación: vas a ver si estás bien, si hay una
        pérdida que no ves y cuánta plata podés ahorrar.
      </p>

      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={(e) => elegir(e.target.files?.[0])}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="rounded-xl border-2 border-[#2BB3C0] px-4 py-2 font-semibold text-[#0E2A3B] hover:bg-[#2BB3C0]/10"
        >
          📷 {archivo ? 'Cambiar factura' : 'Sacar foto o subir archivo'}
        </button>
        {archivo && estado.paso !== 'listo' && (
          <button
            type="button"
            onClick={leer}
            disabled={estado.paso === 'leyendo'}
            className="rounded-xl bg-[#0E2A3B] px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            {estado.paso === 'leyendo' ? 'Leyendo tu factura…' : 'Comparar con mi estimación'}
          </button>
        )}
      </div>

      {archivo && (
        <div className="mt-3">
          {preview ? (
            <img src={preview} alt="Vista previa de la factura" className="max-h-56 rounded-lg border border-slate-200 object-contain" />
          ) : (
            <p className="text-sm text-slate-600">📄 {archivo.name}</p>
          )}
        </div>
      )}

      {estado.paso === 'manual' && (
        <form onSubmit={usarManual} className="mt-4 rounded-xl bg-[#F4F8F7] p-4">
          <p className="text-sm text-[#0E2A3B]">{estado.motivo} Buscá en la factura los m³ consumidos y los días del período.</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              m³ consumidos
              <input value={m3} onChange={(e) => setM3(e.target.value)} inputMode="decimal" className="mt-1 block w-28 rounded-lg border border-slate-300 px-2 py-1" />
            </label>
            <label className="text-sm">
              Días del período
              <input value={dias} onChange={(e) => setDias(e.target.value)} inputMode="numeric" className="mt-1 block w-28 rounded-lg border border-slate-300 px-2 py-1" />
            </label>
            <button type="submit" className="rounded-lg bg-[#2BB3C0] px-4 py-2 font-semibold text-[#0E2A3B]">Comparar</button>
          </div>
        </form>
      )}

      {estado.paso === 'listo' && <Comparacion datos={estado.datos} personas={personas} estimado={estimado} />}

      <p className="mt-4 text-xs text-slate-400">🔒 Tu factura no se guarda: se lee una vez y se descarta.</p>
    </section>
  );
}

function Comparacion({ datos, personas, estimado }: { datos: DatosFactura; personas: number; estimado: number }) {
  const real = lPersonaDia(datos, personas);

  if (real === null) {
    return (
      <div className="mt-4 rounded-xl bg-[#F4F8F7] p-4 text-sm text-[#0E2A3B]">
        <p className="font-semibold">Tu factura no mide consumo (se cobra por superficie). Te mostramos la estimación por hábitos.</p>
        <p className="mt-2">
          Según tus hábitos gastás unos <b>{numero.format(estimado)} L por persona por día</b>.
          {datos.monto ? <> Hoy pagás {pesos.format(datos.monto)} gastes lo que gastes,</> : <> Hoy pagás lo mismo gastes lo que gastes,</>}{' '}
          pero en Mendoza la medición se está extendiendo: con medidor, cada litro de más se paga.
        </p>
      </div>
    );
  }

  const v = veredicto(real);
  const b = brecha(real, estimado);
  const precio = precioM3(datos);
  const ahorro = precio ? ahorroMensualOMS(real, personas, precio) : 0;
  const max = Math.max(real, estimado, MENDOZA) * 1.1;

  const barras = [
    { nombre: 'Tu factura', litros: real, color: v === 'bien' ? '#2BB3C0' : v === 'medio' ? '#F2C94C' : '#F2994A' },
    { nombre: 'Tu estimación', litros: estimado, color: '#0E2A3B' },
    { nombre: 'Objetivo OMS', litros: OMS, color: '#8FB8C4' },
    { nombre: 'Promedio Mendoza', litros: MENDOZA, color: '#C9D6DC' },
  ];

  const titulo = {
    bien: '✅ Estás bien: gastás menos que lo que recomienda la OMS.',
    medio: '🟡 Estás por debajo del promedio de Mendoza, pero arriba de lo que recomienda la OMS.',
    alto: '🔴 Gastás más que el promedio de Mendoza, que ya está en emergencia hídrica.',
  }[v];

  return (
    <div className="mt-4 space-y-4">
      <div>
        <p className="text-sm text-slate-600">Según tu factura:</p>
        <p className="text-3xl font-bold text-[#0E2A3B]">
          {numero.format(real)} L <span className="text-base font-medium">por persona por día</span>
        </p>
        <p className="mt-1 font-medium text-[#0E2A3B]">{titulo}</p>
      </div>

      <div className="space-y-2">
        {barras.map((x) => (
          <div key={x.nombre} className="grid grid-cols-[8.5rem_1fr_3.5rem] items-center gap-2 text-sm">
            <span className="text-slate-600">{x.nombre}</span>
            <div className="h-4 rounded-full bg-slate-100">
              <div className="h-4 rounded-full transition-all duration-700" style={{ width: `${(x.litros / max) * 100}%`, background: x.color }} />
            </div>
            <span className="text-right font-semibold text-[#0E2A3B]">{numero.format(x.litros)} L</span>
          </div>
        ))}
      </div>

      {b.tipo === 'perdida' && (
        <div className="rounded-xl border-l-4 border-[#F2994A] bg-[#F2994A]/10 p-3 text-sm text-[#0E2A3B]">
          <p className="font-semibold">🔍 Hay {numero.format(b.litros)} L por persona por día que tus hábitos no explican.</p>
          <p className="mt-1">
            Puede ser una pérdida que no se ve (el inodoro que corre, un caño). Probá esto: cerrá todas las canillas y
            mirá el medidor; si sigue girando, tenés una pérdida.
          </p>
        </div>
      )}
      {b.tipo === 'sobreestimado' && (
        <p className="rounded-xl bg-[#F4F8F7] p-3 text-sm text-[#0E2A3B]">
          Tu factura marca {numero.format(b.litros)} L menos que la estimación: puede que hayas cargado hábitos de más.
          ¡Mejor así!
        </p>
      )}
      {b.tipo === 'coincide' && (
        <p className="rounded-xl bg-[#F4F8F7] p-3 text-sm text-[#0E2A3B]">
          Tu factura y tu estimación coinciden: los consejos de abajo están hechos a tu medida.
        </p>
      )}

      {precio && (
        <p className="rounded-xl bg-[#0E2A3B] p-3 text-sm text-white">
          💰 Pagás aprox. <b>{pesos.format(precio)} por m³</b> (1.000 L).
          {ahorro > 0
            ? <> Si bajaras al objetivo de la OMS, ahorrarías cerca de <b>{pesos.format(ahorro)} por mes</b>.</>
            : <> Ya estás en el objetivo de la OMS: seguí así.</>}
        </p>
      )}
    </div>
  );
}
