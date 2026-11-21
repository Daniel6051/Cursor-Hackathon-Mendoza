import { extraerCamposFactura, type CamposFactura } from './lecturaFactura';

const completo = (campos: CamposFactura) => campos.consumo !== null && campos.dias !== null && campos.tipo !== null;

async function iniciarOCR() {
  const [{ createWorker }, { default: workerPath }, { default: corePath }, { default: modelo }] = await Promise.all([
    import('tesseract.js'),
    import('tesseract.js/dist/worker.min.js?url'),
    import('tesseract.js-core/tesseract-core-lstm.wasm.js?url'),
    import('@tesseract.js-data/spa/4.0.0_best_int/spa.traineddata.gz?url'),
  ]);
  const langPath = new URL('.', new URL(modelo, document.baseURI)).href;
  return new Promise<Awaited<ReturnType<typeof createWorker>>>((resolver, rechazar) => {
    let vencido = false;
    function fallar(causa: unknown) {
      vencido = true;
      window.clearTimeout(limite);
      rechazar(causa);
    }
    const limite = window.setTimeout(() => fallar(new Error('No se pudo iniciar la lectura')), 20000);
    createWorker('spa', 1, { workerPath, corePath, langPath, workerBlobURL: false, errorHandler: fallar })
      .then(worker => {
        window.clearTimeout(limite);
        if (vencido) void worker.terminate();
        else resolver(worker);
      }, fallar);
  });
}

export async function leerArchivoFactura(archivo: File): Promise<CamposFactura> {
  const esPdf = archivo.type === 'application/pdf' || /\.pdf$/i.test(archivo.name);
  if (!esPdf) {
    const worker = await iniciarOCR();
    try {
      return extraerCamposFactura((await worker.recognize(archivo)).data.text);
    } finally {
      await worker.terminate();
    }
  }

  const [pdfjs, { default: workerSrc }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const tarea = pdfjs.getDocument({ data: new Uint8Array(await archivo.arrayBuffer()) });
  try {
    const pdf = await tarea.promise;
    const paginas = [];
    let texto = '';
    for (let pagina = 1; pagina <= Math.min(3, pdf.numPages); pagina++) {
      const actual = await pdf.getPage(pagina);
      paginas.push(actual);
      const { items } = await actual.getTextContent();
      texto += items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('') + '\n';
    }
    const extraidos = extraerCamposFactura(texto);
    if (completo(extraidos)) return extraidos;

    let worker;
    try {
      worker = await iniciarOCR();
      for (const pagina of paginas) {
        const canvas = document.createElement('canvas');
        const base = pagina.getViewport({ scale: 1 });
        const viewport = pagina.getViewport({ scale: Math.min(2.3, 2200 / Math.max(base.width, base.height)) });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await pagina.render({ canvas, viewport }).promise;
        const leido = extraerCamposFactura((await worker.recognize(canvas)).data.text);
        const combinado = {
          consumo: extraidos.consumo ?? leido.consumo,
          dias: extraidos.dias ?? leido.dias,
          tipo: extraidos.tipo ?? leido.tipo,
        };
        if (completo(combinado)) return combinado;
        extraidos.consumo ??= leido.consumo;
        extraidos.dias ??= leido.dias;
        extraidos.tipo ??= leido.tipo;
      }
      return extraidos;
    } catch {
      return extraidos;
    } finally {
      await worker?.terminate();
    }
  } finally {
    await tarea.destroy();
  }
}
