import { useEffect, useRef, useState } from 'react';
import { Camera, FolderOpen, PencilSimple } from '@phosphor-icons/react';
import { numeroFactura } from '../lib/lecturaFactura';
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
  const [tipo, setTipo] = useState<'medido' | 'presunto' | ''>('');
  const [errorCampos, setErrorCampos] = useState('');

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function elegir(file: File | undefined) {
    if (!file) return;
    setArchivo(file);
    setPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    setM3('');
    setDias('');
    setTipo('');
    setErrorCampos('');
    setEstado({ paso: 'inicio' });
  }

  async function leer() {
    if (!archivo) return;
    setEstado({ paso: 'leyendo' });
    try {
      const { leerArchivoFactura } = await import('../lib/leerArchivoFactura');
      const datos = await leerArchivoFactura(archivo);
      setM3(datos.consumo === null ? '' : String(datos.consumo).replace('.', ','));
      setDias(datos.dias === null ? '' : String(datos.dias));
      setTipo(datos.tipo ?? '');
      setEstado({
        paso: 'manual',
        motivo: datos.consumo !== null && datos.dias !== null && datos.tipo
          ? 'Encontramos estos datos. Revisalos antes de comparar.'
          : 'Revisá los datos detectados y completá los campos que faltan.',
      });
    } catch {
      setEstado({ paso: 'manual', motivo: 'No pudimos extraer datos del archivo. Podés completarlos abajo.' });
    }
  }

  async function leerConIA() {
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
      const analisis: AnalisisFactura & { datos?: { consumoM3: number | null; consumoPresuntoM3?: number | null; dias: number | null } } = await r.json();
      if (analisis.datos) {
        const consumo = analisis.medido ? analisis.datos.consumoM3 : analisis.datos.consumoPresuntoM3;
        setTipo(analisis.medido ? 'medido' : 'presunto');
        if (consumo != null) setM3(String(consumo).replace('.', ','));
        if (analisis.datos.dias !== null) setDias(String(analisis.datos.dias));
        setEstado({ paso: 'manual', motivo: 'Revisá el consumo y el período detectados antes de comparar.' });
        return;
      }
      if (analisis.litrosFactura === null) {
        setEstado({ paso: 'manual', motivo: 'La lectura con IA no encontró valores comparables.' });
        return;
      }
      setEstado({ paso: 'listo', analisis });
    } catch {
      setEstado({ paso: 'manual', motivo: 'El servicio de lectura con IA no está disponible o no pudo leer el archivo.' });
    }
  }

  function usarManual(e: React.FormEvent) {
    e.preventDefault();
    const consumoM3 = numeroFactura(m3);
    const d = Number(dias);
    if (!tipo || consumoM3 === null || !Number.isInteger(d) || d <= 0 || d > 400) {
      setErrorCampos('Elegí el tipo de consumo e ingresá los m³ y la cantidad de días del período.');
      return;
    }
    const medido = tipo === 'medido';
    const { fuente, litros } = consumoFactura({
      medido, consumoM3: medido ? consumoM3 : null, consumoPresuntoM3: medido ? null : consumoM3, dias: d, monto: null,
    }, personas);
    setErrorCampos('');
    setEstado({ paso: 'listo', analisis: { medido, fuente, litrosFactura: litros, feedback: feedbackFijo(fuente, litros, estimado) } });
  }

  return (
    <section className="surface section-pad">
      <h2 className="text-lg font-bold">Comparar consumo facturado</h2>
      <p className="mt-1 text-sm muted">
        Compará los datos de tu factura de agua con el consumo estimado de tu hogar.
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
          disabled={estado.paso === 'leyendo'}
          className="button"
        >
          <FolderOpen size={18} aria-hidden="true" /> Elegir archivo
        </button>
        <button
          type="button"
          onClick={() => camara.current?.click()}
          disabled={estado.paso === 'leyendo'}
          className="button"
        >
          <Camera size={18} aria-hidden="true" /> Sacar foto
        </button>
        {estado.paso !== 'leyendo' && (
          <button type="button" className="button" onClick={() => setEstado({ paso: 'manual', motivo: '' })}>
            <PencilSimple size={18} aria-hidden="true" /> Cargar datos manualmente
          </button>
        )}
        {archivo && estado.paso !== 'listo' && (
          <button
            type="button"
            onClick={leer}
            disabled={estado.paso === 'leyendo'}
            className="button button-primary"
          >
            {estado.paso === 'leyendo' ? 'Leyendo factura…' : 'Leer factura'}
          </button>
        )}
        {archivo && estado.paso === 'manual' && !import.meta.env.DEV && (
          <button type="button" className="button" onClick={leerConIA}>Intentar lectura con IA</button>
        )}
      </div>

      {archivo && (
        <div className="mt-3">
          {preview ? (
            <img src={preview} alt="Vista previa de la factura" className="max-h-56 rounded-lg border border-[var(--border)] object-contain" />
          ) : (
            <p className="text-sm muted">{archivo.name}</p>
          )}
        </div>
      )}

      {estado.paso === 'manual' && (
        <form onSubmit={usarManual} className="mt-4 rounded-xl bg-[var(--field)] p-4">
          <p className="text-sm text-[var(--text)]">{estado.motivo || 'Ingresá el consumo en m³ y los días del período.'}</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              Tipo de consumo
              <select className="field mt-1" value={tipo} onChange={e => setTipo(e.target.value as typeof tipo)}>
                <option value="">Elegí una opción</option>
                <option value="medido">Medido por medidor</option>
                <option value="presunto">Asignado por tarifa</option>
              </select>
            </label>
            <label className="text-sm">
              Consumo en m³
              <input value={m3} onChange={(e) => setM3(e.target.value)} inputMode="decimal" className="field mt-1 max-w-28" />
            </label>
            <label className="text-sm">
              Días del período
              <input value={dias} onChange={(e) => setDias(e.target.value)} inputMode="numeric" className="field mt-1 max-w-28" />
            </label>
            <button type="submit" className="button button-primary">Comparar</button>
          </div>
          {errorCampos && <p className="feedback error mt-3" role="alert">{errorCampos}</p>}
        </form>
      )}

      {estado.paso === 'listo' && <Comparacion analisis={estado.analisis} estimado={estimado} />}

      <p className="mt-4 text-xs muted">La lectura inicial se hace en tu navegador. La lectura con IA, cuando está disponible, envía el archivo al servicio de análisis.</p>
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
      <div className={`rounded-xl border-l-4 p-4 ${perdida ? 'border-[#F2994A] bg-[#F2994A]/10' : 'border-[#2BB3C0] bg-[var(--field)]'}`}>
        <p className="font-bold text-[var(--text)]">{feedback.titulo}</p>
        <ul className="mt-2 space-y-1.5 text-sm text-[var(--text)]">
          {feedback.puntos.map((p) => (
            <li key={p} className="flex gap-2"><span className="accent">•</span><span>{p}</span></li>
          ))}
        </ul>
      </div>

      {barras && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide muted">Litros por persona por día</p>
          {barras.map((x) => (
            <div key={x.nombre} className="grid grid-cols-[minmax(4.5rem,8.5rem)_minmax(1.5rem,1fr)_minmax(3.5rem,auto)] items-center gap-2 text-sm">
              <span className="muted">{x.nombre}</span>
              <div className="h-4 rounded-full bg-[var(--field)]">
                <div className="h-4 rounded-full transition-all duration-700" style={{ width: `${(x.litros / max) * 100}%`, background: x.color }} />
              </div>
              <span className="text-right font-semibold text-[var(--text)]">{numero.format(x.litros)} L</span>
            </div>
          ))}
          {fuente === 'presunto' && (
            <p className="text-xs muted">Tu factura no es medida: "Te cobran por" es el consumo que la tarifa supone por la superficie de tu casa.</p>
          )}
        </div>
      )}
    </div>
  );
}
