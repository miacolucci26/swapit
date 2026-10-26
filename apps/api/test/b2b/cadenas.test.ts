import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CADENAS, EVIDENCIAS, FACTORES_IMPACTO, NIVELES, RESIDUOS, SECTORES, TIPOS_DESTINO, VALORES,
  buscarCadenas, buscarResiduos, cadenasDeSector, compradoresDe, diagnosticar, preguntasDe, residuoPorId, resumenVidas, vidasParaMype,
} from '@swapit/shared';

test('integridad: ids únicos, categorías y sectores válidos, textos completos', () => {
  const ids = RESIDUOS.map((r) => r.residuo.id);
  assert.equal(new Set(ids).size, ids.length, 'ids de residuo repetidos');
  assert.equal(new Set(CADENAS.map((c) => c.id)).size, CADENAS.length);
  const sectores = new Set<string>(SECTORES.map((s) => s.id));
  const destinos = new Set<string>(TIPOS_DESTINO.map((d) => d.id));
  for (const c of CADENAS) {
    assert.ok(sectores.has(c.sector), `sector inválido en ${c.id}`);
    assert.ok(c.resumen.length > 20 && c.etapas.length > 0, c.id);
    assert.equal(new Set(c.etapas.map((e) => e.id)).size, c.etapas.length, `etapas repetidas en ${c.id}`);
  }
  for (const { residuo: r, cadena } of RESIDUOS) {
    assert.ok(r.categoria in FACTORES_IMPACTO, `${r.id}: categoría ${r.categoria} no existe`);
    assert.ok(r.nombre && r.descripcion && r.vidas.length >= 1, r.id);
    assert.ok(r.sinonimos.length >= 1, `${r.id} sin sinónimos: no se podrá buscar`);
    for (const v of r.vidas) {
      assert.ok(v.uso && v.negocio.length > 15 && v.requisitos.length > 5, `${cadena.id}/${r.id}: vida incompleta (${v.uso})`);
      assert.ok(v.nivel in NIVELES && v.valor in VALORES && v.evidencia in EVIDENCIAS, `${r.id}: enumerado inválido`);
      assert.ok(v.destinos.length >= 1 && v.destinos.every((d) => destinos.has(d)), `${r.id}: destino inválido en ${v.uso}`);
    }
  }
});

test('jerarquía de residuos: las vidas de cada residuo no suben de nivel (primero prevenir y reusar, al final quemar o disponer)', () => {
  for (const { residuo: r } of RESIDUOS) {
    const ordenes = r.vidas.map((v) => NIVELES[v.nivel].orden);
    assert.deepEqual(ordenes, [...ordenes].sort((a, b) => a - b), `${r.id}: vidas fuera de la jerarquía`);
  }
});

test('honestidad: lo peligroso solo va a un gestor autorizado y nada se presenta como validado sin respaldo', () => {
  for (const id of ['envases-agroquimicos', 'aceite-lubricante']) {
    const r = residuoPorId(id)!.residuo;
    assert.ok(r.vidas.every((v) => v.nivel === 'DISPOSICION' && v.destinos.includes('GESTOR_AUTORIZADO') && v.valor === 'COSTO'), id);
  }
  // Ninguna vida de alto valor ni de escala industrial queda sin evidencia declarada, y las hipótesis nunca son de «valor alto».
  for (const { residuo: r } of RESIDUOS) for (const v of r.vidas) if (v.evidencia === 'POR_VALIDAR') assert.notEqual(v.valor, 'ALTO', `${r.id}: hipótesis con valor alto`);
});

test('cobertura: sectores grandes de Piura y Lambayeque están cubiertos y cada cadena tiene salidas para una MYPE o es industrial', () => {
  for (const id of ['mango', 'limon', 'uva', 'banano', 'cacao', 'arroz', 'cana', 'concha-abanico', 'pesca-crustaceos', 'algodon-textil', 'empaques-y-apoyo']) assert.ok(CADENAS.some((c) => c.id === id), id);
  assert.ok(cadenasDeSector('AGRO').length >= 5);
  assert.ok(cadenasDeSector('PESCA').some((c) => c.id === 'empaques-y-apoyo'), 'la cadena transversal acompaña a todos los sectores');
  assert.ok(RESIDUOS.filter((r) => vidasParaMype(r.residuo).length > 0).length >= RESIDUOS.length * 0.8, 'la mayoría de residuos debería tener una salida accesible a una MYPE');
});

test('búsqueda: entiende frases de la gente y prioriza la más específica', () => {
  assert.equal(buscarResiduos('¿qué puedo hacer con la cáscara de mango?')[0].residuo.id, 'mango-cascara');
  assert.equal(buscarResiduos('tengo descarte de mango')[0].residuo.id, 'mango-descarte');
  assert.equal(buscarResiduos('cascarilla de arroz')[0].residuo.id, 'arroz-cascarilla');
  assert.equal(buscarResiduos('bagazo de caña')[0].residuo.id, 'cana-bagazo');
  assert.equal(buscarResiduos('conchas de abanico')[0].residuo.id, 'concha-valvas');
  assert.equal(buscarResiduos('bidones de PEAD')[0].residuo.id, 'plastico-pead');
  assert.equal(buscarResiduos('envases de plaguicidas')[0].residuo.id, 'envases-agroquimicos');
  assert.equal(buscarResiduos('retazos de tela')[0].residuo.id, 'textil-retazos');
  // «mango» solo trae todo lo del mango, y «bagazo» sin más trae el de varias cadenas.
  assert.ok(buscarResiduos('mango', 10).every((h) => h.cadena.id === 'mango'));
  assert.ok(new Set(buscarResiduos('bagazo', 10).map((h) => h.cadena.id)).size >= 3);
  assert.deepEqual(buscarResiduos('qué hora es'), []);
  assert.deepEqual(buscarResiduos(''), []);
  assert.equal(buscarCadenas('la cadena del mango')[0]?.id, 'mango');
});

test('compradores y preguntas: salen de las vidas y de los destinos', () => {
  const descarte = residuoPorId('mango-descarte')!.residuo;
  const compradores = compradoresDe(descarte);
  assert.ok(compradores.some((c) => c.destino === 'REPROCESO_ALIMENTOS' && c.usos.length >= 1));
  assert.ok(compradores.every((c) => c.nombre.length > 3));
  const preguntas = preguntasDe(descarte);
  assert.ok(preguntas.length >= 3);
  assert.equal(new Set(preguntas).size, preguntas.length, 'sin preguntas repetidas');
  assert.match(resumenVidas(descarte), /5 vidas/);
});

test('diagnóstico por proceso: de las etapas que opera una empresa salen sus residuos y qué hacer con cada uno', () => {
  const d = diagnosticar('mango', ['seleccion', 'proceso'])!;
  assert.deepEqual(d.etapas.map((e) => e.id), ['seleccion', 'proceso']);
  assert.deepEqual(d.residuos.map((r) => r.residuo.id), ['mango-descarte', 'mango-cascara', 'mango-pepa', 'mango-bagazo']);
  assert.ok(d.residuos.every((r) => r.vidas >= 2 && r.primera));
  assert.ok(d.conValor >= 3);
  assert.equal(d.soloGestor, 0);
  assert.equal(diagnosticar('inexistente', []), null);
  assert.deepEqual(diagnosticar('mango', ['no-existe'])!.residuos, []);
  assert.equal(diagnosticar('empaques-y-apoyo', ['plasticos'])!.soloGestor, 1, 'los envases de agroquímicos solo van a un gestor');
});
