import assert from 'node:assert/strict';
import test from 'node:test';
import { consumoFactura } from './factura';
import { extraerCamposFactura, numeroFactura } from './lecturaFactura';

test('extrae m³ medidos y calcula el período desde las fechas', () => {
  const campos = extraerCamposFactura('Consumo medido: 30 m³\nPeríodo: 01/10/2026 al 31/10/2026');
  assert.deepEqual(campos, { consumo: 30, dias: 30, tipo: 'medido' });
  assert.deepEqual(consumoFactura({ medido: true, consumoM3: campos.consumo, dias: campos.dias, monto: null }, 3),
    { fuente: 'medido', litros: 333 });
});

test('distingue el consumo asignado y conserva los ceros válidos', () => {
  assert.deepEqual(extraerCamposFactura('Facturación por superficie\nConsumo presunto: 24,5 m3\nDías: 60'),
    { consumo: 24.5, dias: 60, tipo: 'presunto' });
  assert.deepEqual(consumoFactura({ medido: true, consumoM3: 0, dias: 60, monto: null }, 4),
    { fuente: 'medido', litros: 0 });
});

test('usa lecturas del medidor y deja pendientes los datos ambiguos', () => {
  assert.deepEqual(extraerCamposFactura('Lectura anterior: 1.040\nLectura actual: 1.050\nDías del período 31'),
    { consumo: 10, dias: 31, tipo: 'medido' });
  assert.deepEqual(extraerCamposFactura('Consumo facturado: 18 m3\nTotal a pagar: 12000'),
    { consumo: 18, dias: null, tipo: null });
  assert.equal(numeroFactura('1.234,50'), 1234.5);
  assert.equal(numeroFactura(''), null);
});

test('tolera palabras extra en la etiqueta, días entre paréntesis y bimestres', () => {
  assert.deepEqual(
    extraerCamposFactura('Servicio: NO MEDIDO - Régimen por superficie\nPeríodo: Bimestre 5/2026 (01/09 al 31/10)\nConsumo presunto asignado: 48 m3'),
    { consumo: 48, dias: 60, tipo: 'presunto' },
  );
  assert.deepEqual(
    extraerCamposFactura('Servicio: MEDIDO\nPeríodo facturado: 01/09/2026 al 31/10/2026 (61 días)\nConsumo del período: 45 m3'),
    { consumo: 45, dias: 61, tipo: 'medido' },
  );
});
