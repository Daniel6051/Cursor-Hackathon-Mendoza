import { useEffect, useRef, useState } from 'react';
import { MENDOZA, OMS } from '../lib/constants';
import {
  brecha,
  consumoFactura,
  feedbackFijo,
  veredicto,
  type AnalisisFactura,
} from '../lib/factura';

type Props = { personas: number; estimado: number };

type Estado =
  | { paso: 'inicio' }
  | { paso: 'leyendo' }
  | { paso: 'listo'; analisis: AnalisisFactura }
  | { paso: 'manual'; motivo: string };

const LADO_MAX = 1600;
const MAX_PDF_BYTES = 3_000_000; // Vercel limita el body a ~4,5 MB (y base64 suma un 33%)
const numero = new Intl.NumberFormat('es-AR');

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
  const camara = useRef<HTMLInputElement>(null);
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
        body: JSON.stringify({ imagenBase64, mimeType, personas, estimado }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) throw new Error('api');
      const analisis: AnalisisFactura = await r.json();
      // Medida pero sin los m3: completalos a mano.
      if (analisis.medido && analisis.litrosFactura === null) {
        setEstado({ paso: 'manual', motivo: 'Tu factura es medida, pero no pudimos leer el consumo.' });
        return;
      }
      setEstado({ paso: 'listo', analisis });
    } catch {
      setEstado({ paso: 'manual', motivo: 'No pudimos leer la factura. Cargá los datos a mano:' });
    }
  }

  function usarManual(e: React.FormEvent) {
    e.preventDefault();
    const consumoM3 = Number(m3.replace(',', '.'));
    const d = Number(dias);
    if (consumoM3 > 0 && d > 0) {
      const { fuente, litros } = consumoFactura({ medido: true, consumoM3, dias: d, monto: null }, personas);
      setEstado({
        paso: 'listo',
        analisis: { medido: true, fuente, litrosFactura: litros, feedback: feedbackFijo(fuente, litros, estimado) },
      });
    }
  }

  return (
    <section className="tarjeta rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0E2A3B]/5">
      <h3 className="text-lg font-bold text-[#0E2A3B]">¿Esto es lo que gastás de verdad?</h3>
      <p className="mt-1 text-sm text-slate-600">
        Subí tu factura de agua y la comparamos con la estimación: vas a ver si estás bien, si hay una
        pérdida que no ves y cuánta plata podés ahorrar.
      </p>

      {/* Dos inputs: uno abre el selector de archivos (foto de la galería o PDF) y el otro la cámara. */}
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = ''; }}
      />
      <input
        ref={camara}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = ''; }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="rounded-xl border-2 border-[#2BB3C0] px-4 py-2 font-semibold text-[#0E2A3B] hover:bg-[#2BB3C0]/10"
        >
          📁 Elegir archivo
        </button>
        <button
          type="button"
          onClick={() => camara.current?.click()}
          className="rounded-xl border-2 border-[#2BB3C0] px-4 py-2 font-semibold text-[#0E2A3B] hover:bg-[#2BB3C0]/10"
        >
          📷 Sacar foto
        </button>
        {archivo && estado.paso !== 'listo' && (
          <button
            type="button"
            onClick={leer}
            disabled={estado.paso === 'leyendo'}
            className="rounded-xl bg-[#0E2A3B] px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            {estado.paso === 'leyendo' ? 'Analizando tu factura…' : 'Comparar con mi estimación'}
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

      {estado.paso === 'listo' && <Comparacion analisis={estado.analisis} estimado={estimado} />}

      <p className="mt-4 text-xs text-slate-400">🔒 Tu factura no se guarda: se analiza una vez y se descarta. No hace falta cuenta ni perfil.</p>
    </section>
  );
}

function Comparacion({ analisis, estimado }: { analisis: AnalisisFactura; estimado: number }) {
  const { fuente, litrosFactura, feedback } = analisis;

  // Comparamos solo si la factura dice algo de litros (medido o presunto por superficie).
  const barras = litrosFactura !== null
    ? [
        {
          nombre: fuente === 'presunto' ? 'Te cobran por' : 'Tu factura',
          litros: litrosFactura,
          color: fuente === 'presunto' ? '#8FB8C4' : ({ bien: '#2BB3C0', medio: '#F2C94C', alto: '#F2994A' } as const)[veredicto(litrosFactura)],
        },
        { nombre: 'Tus hábitos', litros: estimado, color: '#0E2A3B' },
        { nombre: 'Objetivo OMS', litros: OMS, color: '#B9D3DA' },
        { nombre: 'Promedio Mendoza', litros: MENDOZA, color: '#D9E3E7' },
      ]
    : null;
  const max = Math.max(litrosFactura ?? 0, estimado, MENDOZA) * 1.1;
  const perdida = fuente === 'medido' && litrosFactura !== null && brecha(litrosFactura, estimado).tipo === 'perdida';

  return (
    <div className="mt-4 space-y-4">
      <div className={`rounded-xl border-l-4 p-4 ${perdida ? 'border-[#F2994A] bg-[#F2994A]/10' : 'border-[#2BB3C0] bg-[#F4F8F7]'}`}>
        <p className="font-bold text-[#0E2A3B]">{feedback.titulo}</p>
        <ul className="mt-2 space-y-1.5 text-sm text-[#0E2A3B]">
          {feedback.puntos.map((p) => (
            <li key={p} className="flex gap-2"><span className="text-[#2BB3C0]">•</span><span>{p}</span></li>
          ))}
        </ul>
      </div>

      {barras && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Litros por persona por día</p>
          {barras.map((x) => (
            <div key={x.nombre} className="grid grid-cols-[8.5rem_1fr_3.5rem] items-center gap-2 text-sm">
              <span className="text-slate-600">{x.nombre}</span>
              <div className="h-4 rounded-full bg-slate-100">
                <div className="h-4 rounded-full transition-all duration-700" style={{ width: `${(x.litros / max) * 100}%`, background: x.color }} />
              </div>
              <span className="text-right font-semibold text-[#0E2A3B]">{numero.format(x.litros)} L</span>
            </div>
          ))}
          {fuente === 'presunto' && (
            <p className="text-xs text-slate-500">Tu factura no es medida: "Te cobran por" es el consumo que la tarifa supone por la superficie de tu casa.</p>
          )}
        </div>
      )}
    </div>
  );
}
