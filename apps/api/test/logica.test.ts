import assert from 'node:assert/strict';
import { test } from 'node:test';
import { construirRuc, puedeTransicionar, siguienteTrasAcuerdo, validarRuc } from '@swapit/shared';
import { MapboxGeocoder } from '../src/common/geocoding/geocoder';
import { MockSunatValidator } from '../src/common/sunat/sunat.validator';

test('validarRuc: RUC real de SUNAT es válido', () => {
  assert.equal(validarRuc('20131312955'), true);
});

test('validarRuc: rechaza dígito verificador incorrecto, largo y prefijo', () => {
  assert.equal(validarRuc('20131312956'), false);
  assert.equal(validarRuc('2013131295'), false);
  assert.equal(validarRuc('30131312955'), false);
  assert.equal(validarRuc('abcdefghijk'), false);
});

test('construirRuc genera RUC válidos', () => {
  for (const base of ['2060000001', '2050123456', '1012345678']) assert.equal(validarRuc(construirRuc(base)), true);
});

test('SUNAT mock: activo, baja y no existente', async () => {
  const s = new MockSunatValidator();
  const activo = await s.consultar(construirRuc('2060000011'));
  assert.equal(activo.estado, 'ACTIVO');
  const baja = await s.consultar(construirRuc('2060000001'.slice(0, 8) + '00'));
  assert.equal(baja.estado, 'BAJA');
  assert.equal((await s.consultar('20131312956')).encontrado, false);
});

test('geocoder aproximado: ubica ciudades del norte y es determinista', () => {
  const g = new MapboxGeocoder();
  const a = g.aproximada('Zona Industrial Mz. B Lt. 4, Piura')!;
  const b = g.aproximada('Zona Industrial Mz. B Lt. 4, Piura')!;
  assert.deepEqual(a, b);
  assert.ok(Math.abs(a.lat - -5.19) < 0.05 && Math.abs(a.lng - -80.63) < 0.05);
  const otra = g.aproximada('Av. Los Incas 300, Piura')!;
  assert.notDeepEqual(a, otra);
  const chiclayo = g.aproximada('Parque Industrial, Chiclayo')!;
  assert.ok(chiclayo.lat < -6.7 && chiclayo.lat > -6.85);
  assert.equal(g.aproximada('Lima Centro'), null);
});

test('máquina de estados: transiciones válidas e inválidas', () => {
  assert.equal(puedeTransicionar('SOLICITADO', 'EN_NEGOCIACION'), true);
  assert.equal(puedeTransicionar('SOLICITADO', 'ENTREGADO'), false);
  assert.equal(puedeTransicionar('ENTREGADO', 'CANCELADO'), false);
  assert.equal(puedeTransicionar('CERRADO', 'CANCELADO'), false);
  assert.equal(siguienteTrasAcuerdo('VENTA'), 'PAGO_RETENIDO');
  assert.equal(siguienteTrasAcuerdo('DONACION'), 'RECOJO_CONFIRMADO');
});
