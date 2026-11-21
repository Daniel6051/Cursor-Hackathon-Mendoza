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

export function MapaMendoza({ insignia }: { insignia: string }) {
  return (
    <section className="w-full min-w-0">
      <header className="surface dashboard-heading page-heading map-heading">
        <div>
          <h1>Mapa de Mendoza</h1>
          <p>Tocá un punto para consultar un caso real y su fuente.</p>
        </div>
        <img className="map-emblem" src={insignia} alt="" />
      </header>

      <div className="surface relative overflow-hidden">
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
                <p className="text-xs font-semibold uppercase tracking-wide accent">
                  {ETIQUETAS[caso.tipo]}
                </p>
                <p className="mt-1 font-semibold text-[var(--text)]">{caso.titulo}</p>
                <p className="text-sm muted">{caso.lugar}</p>
                <p className="mt-2 text-sm text-[var(--text)]">{caso.dato}</p>
                <a
                  href={caso.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm font-semibold accent"
                >
                  Ver fuente
                </a>
                <p className="mt-1 text-xs muted">{caso.fuente}</p>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {(Object.keys(ETIQUETAS) as Caso['tipo'][]).map((tipo) => (
              <li key={tipo} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full ring-2 ring-[var(--border)]"
                  style={{ backgroundColor: COLORES[tipo] }}
                />
                {ETIQUETAS[tipo]}
              </li>
            ))}
          </ul>
          <p className="text-xs muted">Ubicaciones aproximadas</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {DATOS_MENDOZA.map((item) => (
          <a
            key={item.url}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="surface p-4 text-sm font-medium hover:underline"
          >
            {item.dato}
            <span className="mt-2 block text-xs font-semibold accent">Ver fuente</span>
          </a>
        ))}
      </div>
    </section>
  );
}
