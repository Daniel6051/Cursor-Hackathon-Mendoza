import { useState } from 'react';
import { Resultado } from './components/Resultado';
import { Finca } from './components/finca/Finca';
import { MapaMendoza } from './components/mapa/MapaMendoza';
import { calcular } from './lib/calculo';
import type { Habitos } from './types';

const base: Habitos = {
  personas: 3,
  duchaMin: 10,
  duchasPorDia: 1,
  duchaAhorradora: false,
  descargasPorPersona: 5,
  inodoroDobleDescarga: false,
  lavarropasPorSemana: 3,
  platosPorDia: 2,
  riegoMinPorSemana: 60,
  autoLavadosPorMes: 2,
  canillasQueGotean: 0,
};

const alta: Habitos = {
  ...base,
  duchaMin: 20,
  duchasPorDia: 2,
  descargasPorPersona: 8,
  riegoMinPorSemana: 180,
  canillasQueGotean: 2,
};

export default function App() {
  const [preset, setPreset] = useState<'base' | 'alta'>('base');
  const [vista, setVista] = useState<'casa' | 'finca'>('casa');
  const habitos = preset === 'base' ? base : alta;
  const resultado = calcular(habitos);

  return (
    <div className="min-h-screen bg-[#F4F8F7]">
      <header className="bg-[#0E2A3B]">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <img src="/marca-horizontal-clara.png" alt="Agua Mendoza" className="h-14 w-auto sm:h-16" />
          <p className="max-w-sm text-sm leading-snug text-[#F4F8F7]/80">
            Mendoza está en emergencia hídrica. ¿Cuánta agua gastás vos?
          </p>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-3xl gap-2 px-4 pt-6">
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-sm font-medium ${vista === 'casa' ? 'bg-[#0E2A3B] text-white' : 'bg-white text-[#0E2A3B]'}`}
          onClick={() => setVista('casa')}
        >
          Mi casa
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-sm font-medium ${vista === 'finca' ? 'bg-[#0E2A3B] text-white' : 'bg-white text-[#0E2A3B]'}`}
          onClick={() => setVista('finca')}
        >
          Mi finca
        </button>
      </div>
      <main className="px-4 py-8">
      {vista === 'casa' ? (
        <>
      <div className="mx-auto mb-6 flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#0E2A3B]/70">
          Vista previa de la parte B, con los hábitos de ejemplo. El formulario de A va a pasar estas mismas props.
        </p>
        <button
          type="button"
          className="shrink-0 rounded-full bg-[#0E2A3B] px-4 py-2 text-sm font-medium text-white"
          onClick={() => setPreset((actual) => (actual === 'base' ? 'alta' : 'base'))}
        >
          {preset === 'base' ? 'Cargar casa alta' : 'Volver al caso de 237 L'}
        </button>
      </div>
      <Resultado resultado={resultado} habitos={habitos} />
        </>
      ) : (
        <Finca />
      )}
      </main>
      <MapaMendoza />
    </div>
  );
}
