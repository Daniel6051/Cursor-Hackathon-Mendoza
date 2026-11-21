import { CircleMarker, MapContainer, Popup, TileLayer, ZoomControl } from 'react-leaflet';
import { CASOS, DATOS_MENDOZA, type Caso } from '../../data/casos';
import 'leaflet/dist/leaflet.css';

const COLORES: Record<Caso['tipo'], string> = {
  casa: '#2BB3C0',
  finca: '#2E7D32',
  red: '#F2994A',
};

const ETIQUETAS: Record<Caso['tipo'], string> = {
  casa: 'Casa',
  finca: 'Finca',
  red: 'Red de agua',
};

export function MapaMendoza() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-12 font-sans text-[#0E2A3B]">
      <h2 className="font-display text-3xl font-semibold sm:text-4xl">
        Mendoza y el agua: casos reales
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[#0E2A3B]/70">
        Tocá un punto para ver el dato y la fuente. El mapa une lo que pasa en la casa con lo que pasa en la finca.
      </p>

      <div className="relative mt-5 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-[#0E2A3B]/10">
        <MapContainer
          center={[-33.3, -68.6]}
          zoom={7}
          scrollWheelZoom={false}
          zoomControl={false}
          className="z-0 h-[420px] w-full"
        >
          <ZoomControl position="bottomleft" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {CASOS.map((caso) => (
            <CircleMarker
              key={caso.id}
              center={[caso.lat, caso.lng]}
              radius={11}
              pathOptions={{
                color: '#0E2A3B',
                weight: 2,
                fillColor: COLORES[caso.tipo],
                fillOpacity: 0.95,
              }}
            >
              <Popup>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2BB3C0]">
                  {ETIQUETAS[caso.tipo]}
                </p>
                <p className="mt-1 font-semibold text-[#0E2A3B]">{caso.titulo}</p>
                <p className="text-sm text-[#0E2A3B]/70">{caso.lugar}</p>
                <p className="mt-2 text-sm text-[#0E2A3B]">{caso.dato}</p>
                <a
                  href={caso.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm font-semibold text-[#2BB3C0]"
                >
                  Ver fuente
                </a>
                <p className="mt-1 text-xs text-[#0E2A3B]/60">{caso.fuente}</p>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        <div className="flex flex-col gap-3 border-t border-[#0E2A3B]/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {(Object.keys(ETIQUETAS) as Caso['tipo'][]).map((tipo) => (
              <li key={tipo} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full ring-2 ring-[#0E2A3B]"
                  style={{ backgroundColor: COLORES[tipo] }}
                />
                {ETIQUETAS[tipo]}
              </li>
            ))}
          </ul>
          <p className="text-xs text-[#0E2A3B]/60">Ubicaciones aproximadas</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {DATOS_MENDOZA.map((item) => (
          <a
            key={item.url}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl bg-white p-4 text-sm font-medium shadow-sm ring-1 ring-[#0E2A3B]/10 hover:text-[#2BB3C0]"
          >
            {item.dato}
            <span className="mt-2 block text-xs font-semibold text-[#2BB3C0]">Ver fuente</span>
          </a>
        ))}
      </div>
    </section>
  );
}
