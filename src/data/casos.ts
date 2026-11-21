// src/data/casos.ts -- casos reales de Mendoza (ubicaciones aproximadas)
export type Caso = {
  id: string;
  titulo: string;
  lugar: string;
  lat: number;
  lng: number;
  tipo: 'casa' | 'finca' | 'red';
  dato: string;
  fuente: string;
  url: string;
};

export const CASOS: Caso[] = [
  {
    id: 'medidores-dorrego',
    tipo: 'casa',
    titulo: 'Piloto de medidores de AySAM',
    lugar: 'Dorrego, Guaymallén',
    lat: -32.905,
    lng: -68.815,
    dato: 'Se estimaban 700 L por persona por día; con medidor, los usuarios midieron entre 200 y 500 L.',
    fuente: 'Diario UNO (ago 2024), declaraciones del titular de AySAM',
    url: 'https://www.diariouno.com.ar/aysam-demostro-que-la-instalacion-medidores-los-consumidores-redujeron-el-gasto-agua-el-20-n1343478',
  },
  {
    id: 'goteo-tunuyan',
    tipo: 'finca',
    titulo: 'Capacitación en riego por goteo',
    lugar: 'Agua Amarga, Tunuyán',
    lat: -33.6,
    lng: -69.05,
    dato: 'Irrigación capacitó a productores en mantenimiento y operación de riego presurizado (Proyecto Arroyo Villegas - Canal La Pampa).',
    fuente: 'Gobierno de Mendoza',
    url: 'https://www.mendoza.gov.ar/prensa/gran-convocatoria-tuvo-la-capacitacion-riego-por-goteo/',
  },
  {
    id: 'riego-acordado-lavalle',
    tipo: 'finca',
    titulo: 'Prueba piloto de riego acordado',
    lugar: 'Lavalle',
    lat: -32.72,
    lng: -68.59,
    dato: 'Irrigación impulsa el riego acordado entre regantes, con una prueba piloto en Lavalle.',
    fuente: 'Gobierno de Mendoza',
    url: 'https://www.mendoza.gov.ar/prensa/irrigacion-comienza-con-el-riego-acordado-y-habra-una-prueba-piloto-en-lavalle/',
  },
  {
    id: 'hijuela-san-rafael',
    tipo: 'red',
    titulo: 'Impermeabilización de canales',
    lugar: 'Canal Las Paredes, San Rafael',
    lat: -34.62,
    lng: -68.4,
    dato: 'Irrigación impermeabilizó la Hijuela N° 5 para evitar pérdidas de agua por filtración.',
    fuente: 'Gobierno de Mendoza',
    url: 'https://www.mendoza.gov.ar/prensa/irrigacion-optimiza-la-eficiencia-hidrica-a-traves-de-tecnicas-alternativas-de-impermeabilizacion/',
  },
  {
    id: 'lonas-intrafinca',
    tipo: 'finca',
    titulo: 'Lonas reutilizables para riego intrafinca',
    lugar: 'Inspecciones de Cauce (toda la provincia)',
    lat: -33.0,
    lng: -68.6,
    dato: 'Irrigación reparte lonas plásticas reutilizables para mejorar el riego dentro de las fincas; se piden en la Inspección de Cauce.',
    fuente: 'Gobierno de Mendoza',
    url: 'https://www.mendoza.gov.ar/prensa/irrigacion-comenzo-a-repartir-las-lonas-plásticas-reutilizables-para-ayudar-a-mejorar-el-riego-intrafinca/',
  },
];

export const DATOS_MENDOZA = [
  {
    dato: '81% del agua va al agro; la mitad se pierde por riego a manto',
    url: 'https://www.mendoza.gov.ar/prensa/el-50-agua-de-los-mendocinos-se-pierde-por-riego-a-manto/',
  },
  {
    dato: 'Riego por goteo en vid: ahorro de agua de 30-60%',
    url: 'https://www.argentina.gob.ar/sites/default/files/riego_por_goteo_11-08.pdf',
  },
];
