const pptxgen = require('pptxgenjs');
const JSZip = require('jszip');
const sharp = require('sharp');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const fa = require('react-icons/fa');
const fs = require('fs');
const path = require('path');
const { applyTheme } = require('C:/Users/david/AppData/Local/Claude-Data/claude_pzs8sxrjxfjjc/local-agent-mode-sessions/skills-plugin/9aa519d6-9f2e-4f6e-a320-c9a4dd34dd3b/6100f2c8-0fe0-4816-be79-e4f7ad22f07b/skills/pptx/scripts/apply_theme.js');

const ASSETS = 'D:/Seedtech/simbio/docs/pitch/assets';
const CAP = 'D:/Seedtech/simbio/docs/pitch/capturas';
const VID = 'D:/Seedtech/simbio/docs/pitch/video';
const OUT = process.argv[2] || 'D:/Seedtech/simbio/docs/pitch/Swapit-Pitch.pptx';

// ---------- Identidad ----------
const K = {
  marino900: '0E2352', marino800: '16367F', marino700: '1D47AD', marino600: '2459D6', marino200: 'A9C2FF', marino100: 'D3E0FF', marino50: 'EAF0FF',
  sol500: 'FF8A00', sol700: 'B34E00', sol100: 'FFE3BD', sol50: 'FFF4E5', limon: 'FFD60A',
  ink: '0F1B33', ink700: '33425E', ink500: '5B6B86', line: 'DDE4EF', bg: 'F8FAFD', white: 'FFFFFF',
  exito: '0C8467', exitoTint: 'DDF4EC', error: 'D92D20', errorTint: 'FEE9E7', agro: '2B8412', agroTint: 'E6F5DA', pesca: '0A7F96', pescaTint: 'DFF4F8',
};
const THEME = {
  name: 'Swapit', headFontFace: 'Trebuchet MS', bodyFontFace: 'Calibri',
  colors: { dk1: K.ink, lt1: K.white, dk2: K.marino900, lt2: K.bg, accent1: K.sol500, accent2: K.marino600, accent3: K.limon, accent4: K.agro, accent5: K.pesca, accent6: '8B3FD9', hlink: K.marino600, folHlink: K.marino700 },
};
const HEAD = 'Trebuchet MS';
const BODY = 'Calibri';

// ---------- Utilidades ----------
const ico = async (name, color, size = 256) => {
  const svg = renderToStaticMarkup(React.createElement(fa[name], { color: '#' + color, size }));
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  return 'image/png;base64,' + buf.toString('base64');
};
const img = (f) => path.join(ASSETS, f);
const b64 = (f) => 'image/png;base64,' + fs.readFileSync(f).toString('base64');
const sombra = () => ({ type: 'outer', color: '0E2352', blur: 12, offset: 3, angle: 90, opacity: 0.18 });

async function recorte(src, x, y, w, h, out) {
  await sharp(src).extract({ left: x, top: y, width: w, height: h }).png().toFile(out);
  return out;
}

(async () => {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  pres.title = 'Swapit — Pitch SeedTech UDEP 2026';
  pres.author = 'David Blas y Josué Farfán';
  pres.company = 'Swapit';
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  const C = pres.SchemeColor;

  // Layouts: oscuro (portada y cierre) y claro (contenido). El número de lámina vive en la plantilla.
  pres.defineSlideMaster({
    title: 'OSCURO', background: { color: K.marino900 },
    slideNumber: { x: 12.5, y: 7.05, w: 0.5, h: 0.3, color: K.marino200, fontFace: BODY, fontSize: 11, align: 'right' },
  });
  pres.defineSlideMaster({
    title: 'CLARO', background: { color: K.bg },
    objects: [{ image: { x: 0.6, y: 7.0, w: 0.34, h: 0.34, path: img('isotipo.png') } }],
    slideNumber: { x: 12.5, y: 7.05, w: 0.5, h: 0.3, color: K.ink500, fontFace: BODY, fontSize: 11, align: 'right' },
  });

  const notas = {};
  const anim = {}; // por lámina: lista de [objectName, efecto, retraso en ms]
  const trans = {}; // por lámina: transición
  const titulo = (s, texto, opts = {}) =>
    s.addText(texto, { x: 0.6, y: 0.45, w: 12.1, h: 1.0, fontFace: HEAD, fontSize: 38, bold: true, color: K.marino900, margin: 0, valign: 'middle', isTextBox: true, objectName: 'Titulo', ...opts });

  // Iconos
  const I = {};
  for (const [k, n, c] of [
    ['camara', 'FaCamera', K.white], ['etiqueta', 'FaTag', K.white], ['apreton', 'FaHandshake', K.white], ['candado', 'FaLock', K.white],
    ['hoja', 'FaLeaf', K.white], ['camion', 'FaTruck', K.white], ['fabrica', 'FaIndustry', K.white], ['lupa', 'FaSearch', K.white],
    ['equis', 'FaTimes', K.error], ['check', 'FaCheck', K.exito], ['checkBlanco', 'FaCheck', K.white], ['balanza', 'FaBalanceScale', K.white], ['certificado', 'FaCertificate', K.white],
    ['pin', 'FaMapMarkerAlt', K.sol500], ['usuarios', 'FaUsers', K.white], ['laptop', 'FaLaptopCode', K.white], ['grafico', 'FaChartLine', K.white],
    ['dinero', 'FaMoneyBillWave', K.white], ['play', 'FaPlay', K.white], ['mundo', 'FaGlobeAmericas', K.white], ['flecha', 'FaArrowRight', K.sol500],
    ['flechas', 'FaExchangeAlt', K.white], ['flechasSol', 'FaExchangeAlt', K.sol500], ['reciclar', 'FaRecycle', K.white], ['mensaje', 'FaCommentDots', K.white],
  ]) I[k] = await ico(n, c);

  // ============ 1. INTRO / CONTEXTO ============
  {
    const s = pres.addSlide({ masterName: 'OSCURO' });
    s.addShape(pres.ShapeType.ellipse, { x: 9.9, y: -1.4, w: 5.0, h: 5.0, fill: { color: K.sol500 }, line: { type: 'none' }, objectName: 'Sol' });
    s.addShape(pres.ShapeType.ellipse, { x: 5.9, y: 5.9, w: 1.6, h: 1.6, fill: { color: K.limon }, line: { type: 'none' }, objectName: 'Limon' });
    s.addImage({ path: img('logo-horizontal-blanco.png'), x: 0.6, y: 0.5, w: 2.4, h: 0.56, objectName: 'Logo' });
    s.addText('SEEDTECH UDEP 2026  ·  PIURA', { x: 0.6, y: 1.95, w: 5.8, h: 0.4, fontFace: BODY, fontSize: 16, bold: true, color: K.limon, charSpacing: 3, margin: 0, isTextBox: true, objectName: 'Kicker' });
    s.addText('Lo que a uno le sobra, a otro le falta.', { x: 0.6, y: 2.45, w: 5.9, h: 2.5, fontFace: HEAD, fontSize: 46, bold: true, color: K.white, margin: 0, valign: 'top', isTextBox: true, objectName: 'Titular' });
    s.addText('Intercambio de excedentes y residuos aprovechables entre empresas del norte del Perú', { x: 0.6, y: 5.2, w: 5.6, h: 0.9, fontFace: BODY, fontSize: 20, color: K.marino200, margin: 0, isTextBox: true, objectName: 'Bajada' });
    s.addMedia({ type: 'video', path: path.join(VID, 'descarte-mango.mp4'), cover: b64(path.join(VID, 'descarte-mango-poster.png')), x: 6.85, y: 1.45, w: 6.0, h: 3.375, objectName: 'Video descarte' });
    s.addText('Recreación ilustrativa', { x: 6.85, y: 4.9, w: 6.0, h: 0.3, fontFace: BODY, fontSize: 12, italic: true, color: K.marino200, margin: 0, isTextBox: true, objectName: 'Pie video' });
    s.addNotes('[0:00–0:12 · Intro] Esto es mango Kent: dulce por dentro, rechazado por fuera. Cada campaña en Piura deja montañas así. Lo que a uno le sobra, a otro le falta.\n\nRecurso: video de la derecha (hoy una ilustración con movimiento lento; reemplázalo por el clip 1 de Higgsfield, ver docs/pitch/guion-y-storyboard.md). Transición: fundido. Al decir "a otro le falta", corte a la lámina 2. No digas "hola": empieza con el mango.');
    anim[1] = [['Kicker', 'fade', 300], ['Titular', 'wipe', 700], ['Bajada', 'fade', 1500], ['Video descarte', 'fade', 400]];
    trans[1] = '<p:fade/>';
  }

  // ============ 2. PROBLEMA ============
  {
    const s = pres.addSlide({ masterName: 'CLARO' });
    titulo(s, 'No falta demanda: falta encontrarse');
    const filas = ['Sin foto', 'Sin precio', 'Sin garantía'];
    filas.forEach((t, i) => {
      const y = 1.95 + i * 1.5;
      s.addShape(pres.ShapeType.roundRect, { x: 0.6, y, w: 5.4, h: 1.2, fill: { color: K.white }, line: { color: K.line, width: 1 }, rectRadius: 0.2, shadow: sombra(), objectName: `Fila${i}` });
      s.addShape(pres.ShapeType.ellipse, { x: 0.85, y: y + 0.25, w: 0.7, h: 0.7, fill: { color: K.errorTint }, line: { type: 'none' }, objectName: `Circ${i}` });
      s.addImage({ data: I.equis, x: 1.03, y: y + 0.43, w: 0.34, h: 0.34, objectName: `X${i}` });
      s.addText(t, { x: 1.8, y, w: 4.0, h: 1.2, fontFace: HEAD, fontSize: 34, bold: true, color: K.ink, margin: 0, valign: 'middle', isTextBox: true, objectName: `Texto${i}` });
    });
    const datos = [
      ['1,8 %', 'de los residuos municipales se valoriza', 'MINAM, 2022', K.sol700],
      ['50 de 1 838', 'operadores de residuos tienen planta de valorización', 'MINAM, vía estudio UE', K.marino700],
      ['36 %', 'del mango de 2022 no se exportó', 'Midagri, cálculo propio', K.agro],
    ];
    datos.forEach(([n, l, f, c], i) => {
      const y = 1.95 + i * 1.5;
      s.addShape(pres.ShapeType.roundRect, { x: 6.5, y, w: 6.2, h: 1.2, fill: { color: K.white }, line: { color: K.line, width: 1 }, rectRadius: 0.2, shadow: sombra(), objectName: `Dato${i}` });
      s.addText(n, { x: 6.7, y, w: 2.55, h: 1.2, fontFace: HEAD, fontSize: i === 1 ? 26 : 38, bold: true, color: c, margin: 0, valign: 'middle', isTextBox: true, objectName: `Num${i}` });
      s.addText([{ text: l, options: { fontSize: 16, color: K.ink, breakLine: true } }, { text: f, options: { fontSize: 12, color: K.ink500 } }], { x: 9.3, y, w: 3.3, h: 1.2, fontFace: BODY, margin: 0, valign: 'middle', isTextBox: true, objectName: `Etq${i}` });
    });
    s.addText('Hoy el residuo se mueve por conocidos y fotos sueltas. Las empresas nos lo dijeron: no saben qué hacer con él ni a quién dárselo.', { x: 0.6, y: 6.5, w: 11.6, h: 0.45, fontFace: BODY, fontSize: 14, italic: true, color: K.ink700, margin: 0, isTextBox: true, objectName: 'Pie' });
    s.addNotes('[0:12–0:24 · Problema] No falta demanda: falta encontrarse. Hoy el residuo se mueve por conocidos y fotos sueltas, sin precio ni garantía. Las empresas nos lo dijeron: no saben qué hacer con él ni a quién dárselo.\n\nLas tres frases de la izquierda entran una por beat de tu voz. Cifras: 1,8 % de residuos municipales valorizado en 2022 (MINAM); de 1 838 EO-RS activas, 50 tienen planta de valorización (MINAM vía estudio UE); 36 % del mango de 2022 no se exportó = 474 000 t producidas menos 304 034 t exportadas (cálculo propio; incluye consumo interno y proceso, no es solo "desperdicio"). Detalle y fuentes: docs/pitch/investigacion-mercado.md.');
    anim[2] = [['Fila0', 'fade', 300], ['Circ0', 'fade', 300], ['X0', 'fade', 300], ['Texto0', 'wipe', 300], ['Fila1', 'fade', 1900], ['Circ1', 'fade', 1900], ['X1', 'fade', 1900], ['Texto1', 'wipe', 1900], ['Fila2', 'fade', 3500], ['Circ2', 'fade', 3500], ['X2', 'fade', 3500], ['Texto2', 'wipe', 3500],
      ['Dato0', 'fade', 5000], ['Num0', 'fade', 5000], ['Etq0', 'fade', 5000], ['Dato1', 'fade', 5600], ['Num1', 'fade', 5600], ['Etq1', 'fade', 5600], ['Dato2', 'fade', 6200], ['Num2', 'fade', 6200], ['Etq2', 'fade', 6200]];
    trans[2] = '<p:wipe dir="l"/>';
  }

  // ============ 3. SOLUCIÓN ============
  {
    const s = pres.addSlide({ masterName: 'CLARO' });
    titulo(s, 'Foto, oferta, acuerdo: así se intercambia', { fontSize: 36 });
    const pasos = [
      ['camara', 'Publica con foto', 'Ficha y detalle del material', K.marino600],
      ['etiqueta', 'Ofrece tu precio', 'Dentro de la plataforma', K.sol500],
      ['candado', 'Cierra y contacta', 'El contacto solo llega con el acuerdo', K.exito],
    ];
    pasos.forEach(([ic, t, sub, c], i) => {
      const y = 1.85 + i * 1.65;
      s.addShape(pres.ShapeType.ellipse, { x: 0.6, y, w: 1.15, h: 1.15, fill: { color: c }, line: { type: 'none' }, shadow: sombra(), objectName: `Paso${i}` });
      s.addImage({ data: i === 1 ? I.etiqueta : I[ic], x: 0.6 + 0.3, y: y + 0.3, w: 0.55, h: 0.55, objectName: `PasoIco${i}` });
      s.addText(`${i + 1}`, { x: 1.4, y: y - 0.1, w: 0.4, h: 0.4, fontFace: HEAD, fontSize: 14, bold: true, color: K.ink, align: 'center', valign: 'middle', fill: { color: K.limon }, margin: 0, isTextBox: true, objectName: `Num${i}` });
      s.addText([{ text: t, options: { fontFace: HEAD, fontSize: 26, bold: true, color: K.marino900, breakLine: true } }, { text: sub, options: { fontFace: BODY, fontSize: 16, color: K.ink700 } }], { x: 2.0, y: y - 0.05, w: 3.6, h: 1.3, margin: 0, valign: 'middle', isTextBox: true, objectName: `PasoTxt${i}` });
    });
    s.addShape(pres.ShapeType.roundRect, { x: 5.75, y: 1.62, w: 7.15, h: 4.02, fill: { color: K.marino900 }, line: { type: 'none' }, rectRadius: 0.15, shadow: sombra(), objectName: 'Marco video' });
    s.addMedia({ type: 'video', path: path.join(VID, 'recorrido-producto.mp4'), cover: b64(path.join(VID, 'recorrido-producto-poster.png')), x: 5.86, y: 1.72, w: 6.93, h: 3.9, objectName: 'Video producto' });
    s.addText('Recorrido del prototipo con capturas reales', { x: 5.75, y: 5.75, w: 7.15, h: 0.35, fontFace: BODY, fontSize: 13, color: K.ink500, align: 'center', margin: 0, isTextBox: true, objectName: 'Pie video' });
    s.addNotes('[0:24–0:36 · Solución] Swapit es ese lugar de encuentro. Fotografías tu lote y lo publicas. La empresa interesada ve fotos y detalle, y ofrece un precio. Solo con acuerdo se habilita el contacto directo.\n\nRecurso: los tres pasos entran de izquierda a derecha; el video (16 s) es un recorrido real del prototipo: catálogo con fotos, ficha con oferta de precio, aviso de contacto con acuerdo y la vista de impacto. Si falla el video, usa las capturas en docs/pitch/capturas. Transición: empuje horizontal.');
    anim[3] = [['Paso0', 'fade', 300], ['PasoIco0', 'fade', 300], ['Num0', 'fade', 300], ['PasoTxt0', 'wipe', 300], ['Paso1', 'fade', 1400], ['PasoIco1', 'fade', 1400], ['Num1', 'fade', 1400], ['PasoTxt1', 'wipe', 1400], ['Paso2', 'fade', 2500], ['PasoIco2', 'fade', 2500], ['Num2', 'fade', 2500], ['PasoTxt2', 'wipe', 2500], ['Marco video', 'fade', 600], ['Video producto', 'fade', 600]];
    trans[3] = '<p:push dir="l"/>';
  }

  // ============ 4. PROPUESTA DE VALOR ============
  {
    const s = pres.addSlide({ masterName: 'CLARO' });
    titulo(s, 'Cada tonelada llega con foto, precio y huella', { fontSize: 36 });
    const bloque = (y, nombre, icono, color, tint, items, id) => {
      s.addShape(pres.ShapeType.roundRect, { x: 0.6, y, w: 6.2, h: 2.3, fill: { color: K.white }, line: { color: K.line, width: 1 }, rectRadius: 0.2, shadow: sombra(), objectName: `Card${id}` });
      s.addShape(pres.ShapeType.ellipse, { x: 0.85, y: y + 0.25, w: 0.8, h: 0.8, fill: { color }, line: { type: 'none' }, objectName: `Ic${id}` });
      s.addImage({ data: icono, x: 1.05, y: y + 0.45, w: 0.4, h: 0.4, objectName: `IcImg${id}` });
      s.addText(nombre, { x: 1.85, y: y + 0.25, w: 4.5, h: 0.8, fontFace: HEAD, fontSize: 26, bold: true, color: K.marino900, margin: 0, valign: 'middle', isTextBox: true, objectName: `Nom${id}` });
      items.forEach((t, i) => {
        s.addShape(pres.ShapeType.roundRect, { x: 0.85 + i * 1.95, y: y + 1.3, w: 1.85, h: 0.75, fill: { color: tint }, line: { type: 'none' }, rectRadius: 0.37, objectName: `Chip${id}${i}` });
        s.addText(t, { x: 0.85 + i * 1.95, y: y + 1.3, w: 1.85, h: 0.75, fontFace: BODY, fontSize: 14, bold: true, color: K.marino900, align: 'center', valign: 'middle', margin: 0.05, isTextBox: true, objectName: `ChipT${id}${i}` });
      });
    };
    bloque(1.75, 'Quien ofrece', I.fabrica, K.sol500, K.sol100, ['Vende lo que hoy estorba', 'Ve cuánto vale', 'Cobra con acuerdo'], 'A');
    bloque(4.3, 'Quien busca', I.lupa, K.marino600, K.marino100, ['Materia prima con foto', 'Ofrece su precio', 'Conoce el origen'], 'B');
    const recorteImpacto = await recorte(path.join(CAP, 'actividad.png'), 288, 116, 1105, 322, path.join(CAP, 'actividad-impacto.png'));
    s.addImage({ path: recorteImpacto, x: 7.1, y: 1.75, w: 5.6, h: 1.63, objectName: 'Impacto', shadow: sombra() });
    s.addText('Ejemplo del prototipo: impacto estimado con factores de ejemplo', { x: 7.1, y: 3.45, w: 5.6, h: 0.35, fontFace: BODY, fontSize: 12, italic: true, color: K.ink500, margin: 0, isTextBox: true, objectName: 'PieImpacto' });
    s.addShape(pres.ShapeType.roundRect, { x: 7.1, y: 4.0, w: 5.6, h: 2.6, fill: { color: K.sol500 }, line: { type: 'none' }, rectRadius: 0.2, shadow: sombra(), objectName: 'Frase fondo' });
    s.addText('Sabe qué hacer con tu residuo y a quién venderlo, con precio y trazabilidad.', { x: 7.4, y: 4.2, w: 5.0, h: 2.2, fontFace: HEAD, fontSize: 26, bold: true, color: K.ink, margin: 0, valign: 'middle', isTextBox: true, objectName: 'Frase' });
    s.addNotes('[0:36–0:48 · Propuesta de valor] Quien ofrece, vende lo que hoy estorba. Quien busca, consigue materia prima con foto, precio y origen. Cada tonelada llega con su huella: CO₂ evitado, estimado.\n\nOjo: el CO₂eq usa factores de ejemplo (placeholders). Dilo en voz alta: "estimado". Las vidas de cada residuo (qué se puede hacer con él, de mayor a menor valor) son selección de fuentes abiertas, no validación técnica. Frase de posicionamiento recomendada (alternativa A de investigacion-competencia-modelo.md). Transición: cubrir.');
    anim[4] = [['CardA', 'fade', 300], ['IcA', 'fade', 300], ['IcImgA', 'fade', 300], ['NomA', 'wipe', 300], ['ChipA0', 'fade', 900], ['ChipTA0', 'fade', 900], ['ChipA1', 'fade', 1300], ['ChipTA1', 'fade', 1300], ['ChipA2', 'fade', 1700], ['ChipTA2', 'fade', 1700],
      ['CardB', 'fade', 2400], ['IcB', 'fade', 2400], ['IcImgB', 'fade', 2400], ['NomB', 'wipe', 2400], ['ChipB0', 'fade', 3000], ['ChipTB0', 'fade', 3000], ['ChipB1', 'fade', 3400], ['ChipTB1', 'fade', 3400], ['ChipB2', 'fade', 3800], ['ChipTB2', 'fade', 3800],
      ['Impacto', 'fade', 4600], ['PieImpacto', 'fade', 4600], ['Frase fondo', 'fade', 5600], ['Frase', 'wipe', 5600]];
    trans[4] = '<p:cover dir="l"/>';
  }

  // ============ 5. MODELO DE NEGOCIO ============
  {
    const s = pres.addSlide({ masterName: 'CLARO' });
    titulo(s, 'Solo ganamos si ellos intercambian');
    const lado = (x, nombre, color, ic, id) => {
      s.addShape(pres.ShapeType.roundRect, { x, y: 1.75, w: 3.3, h: 1.7, fill: { color }, line: { type: 'none' }, rectRadius: 0.2, shadow: sombra(), objectName: `Lado${id}` });
      s.addImage({ data: ic, x: x + 0.3, y: 2.1, w: 0.55, h: 0.55, objectName: `LadoIc${id}` });
      s.addText(nombre, { x: x + 0.3, y: 2.7, w: 2.8, h: 0.6, fontFace: HEAD, fontSize: 26, bold: true, color: K.white, margin: 0, isTextBox: true, objectName: `LadoT${id}` });
    };
    lado(0.6, 'Ofertante', K.sol700, I.fabrica, 'A');
    lado(9.43, 'Demandante', K.marino600, I.lupa, 'B');
    s.addShape(pres.ShapeType.ellipse, { x: 5.4, y: 1.55, w: 2.1, h: 2.1, fill: { color: K.marino900 }, line: { type: 'none' }, shadow: sombra(), objectName: 'Centro' });
    s.addImage({ path: img('isotipo-blanco.png'), x: 5.9, y: 2.05, w: 1.1, h: 1.1, objectName: 'CentroIso' });
    s.addImage({ data: I.flechasSol, x: 4.3, y: 2.3, w: 0.8, h: 0.6, objectName: 'FlechaI' });
    s.addImage({ data: I.flechasSol, x: 8.25, y: 2.3, w: 0.8, h: 0.6, objectName: 'FlechaD' });
    const ingresos = [
      ['certificado', 'Certificado de trazabilidad', 'S/ 5–20', 'por certificado', K.marino600],
      ['usuarios', 'Suscripción del intermediario', 'S/ 150–700', 'al mes', K.sol700],
      ['apreton', 'Comisión por cierre', '2–5 %', 'con tope por operación', K.exito],
    ];
    ingresos.forEach(([ic, nombre, monto, un, c], i) => {
      const x = 0.6 + i * 4.2;
      s.addShape(pres.ShapeType.roundRect, { x, y: 3.95, w: 3.9, h: 2.45, fill: { color: K.white }, line: { color: K.line, width: 1 }, rectRadius: 0.2, shadow: sombra(), objectName: `Ing${i}` });
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.25, y: 4.2, w: 0.7, h: 0.7, fill: { color: c }, line: { type: 'none' }, objectName: `IngC${i}` });
      s.addImage({ data: I[ic], x: x + 0.42, y: 4.37, w: 0.36, h: 0.36, objectName: `IngI${i}` });
      s.addText(nombre, { x: x + 1.1, y: 4.15, w: 2.6, h: 0.8, fontFace: HEAD, fontSize: 17, bold: true, color: K.marino900, margin: 0, valign: 'middle', isTextBox: true, objectName: `IngN${i}` });
      s.addText(monto, { x: x + 0.25, y: 5.0, w: 3.4, h: 0.8, fontFace: HEAD, fontSize: 38, bold: true, color: c, margin: 0, valign: 'middle', isTextBox: true, objectName: `IngM${i}` });
      s.addText(un, { x: x + 0.25, y: 5.75, w: 3.4, h: 0.4, fontFace: BODY, fontSize: 15, color: K.ink700, margin: 0, isTextBox: true, objectName: `IngU${i}` });
    });
    s.addText('Publicar, ofertar y consultar los usos de cada residuo es gratis: es el gancho. Precios por validar con las empresas.', { x: 0.6, y: 6.5, w: 11.6, h: 0.4, fontFace: BODY, fontSize: 14, italic: true, color: K.ink700, margin: 0, isTextBox: true, objectName: 'Pie' });
    s.addNotes('[0:48–1:00 · Modelo de negocio] Solo ganamos si ellos intercambian: certificados de trazabilidad y suscripción para el intermediario que acopia, y una comisión por operación cerrada. Publicar y consultar es gratis.\n\nIMPORTANTE: los montos son [PLACEHOLDER] de investigacion-competencia-modelo.md §4.2 (bajo–alto): suscripción S/ 150 / 300 / 700, certificado S/ 5 / 10 / 20, comisión 2 / 3 / 5 % con tope. Nadie los ha validado todavía: dilo si preguntan. El README y la decisión 0001 decían "sin comisión"; si el equipo decide no cobrar comisión, quita la tercera tarjeta. Riesgo reconocido: desintermediación (el contacto tras el acuerdo es una mitigación, no una garantía). Transición: partir.');
    anim[5] = [['LadoA', 'fade', 300], ['LadoIcA', 'fade', 300], ['LadoTA', 'fade', 300], ['LadoB', 'fade', 700], ['LadoIcB', 'fade', 700], ['LadoTB', 'fade', 700], ['Centro', 'fade', 1300], ['CentroIso', 'fade', 1300], ['FlechaI', 'fade', 1700], ['FlechaD', 'fade', 1700],
      ['Ing0', 'fade', 2600], ['IngC0', 'fade', 2600], ['IngI0', 'fade', 2600], ['IngN0', 'fade', 2600], ['IngM0', 'wipe', 2900], ['IngU0', 'fade', 2900],
      ['Ing1', 'fade', 4000], ['IngC1', 'fade', 4000], ['IngI1', 'fade', 4000], ['IngN1', 'fade', 4000], ['IngM1', 'wipe', 4300], ['IngU1', 'fade', 4300],
      ['Ing2', 'fade', 5400], ['IngC2', 'fade', 5400], ['IngI2', 'fade', 5400], ['IngN2', 'fade', 5400], ['IngM2', 'wipe', 5700], ['IngU2', 'fade', 5700]];
    trans[5] = '<p:split orient="vert" dir="out"/>';
  }

  // ============ 6. TAMAÑO DE MERCADO ============
  {
    const s = pres.addSlide({ masterName: 'CLARO' });
    titulo(s, 'Empezamos en Piura; el norte es el mercado', { fontSize: 36 });
    const cx = 3.35, base = 6.05;
    const circ = (d, color, nombre) => s.addShape(pres.ShapeType.ellipse, { x: cx - d / 2, y: base - d, w: d, h: d, fill: { color }, line: { color: K.white, width: 3 }, objectName: nombre });
    circ(4.5, K.marino100, 'TAM');
    circ(3.0, K.marino600, 'SAM');
    circ(1.45, K.sol500, 'SOM');
    s.addText('TAM', { x: cx - 0.8, y: base - 4.45, w: 1.6, h: 0.45, fontFace: HEAD, fontSize: 18, bold: true, color: K.marino900, align: 'center', margin: 0, isTextBox: true, objectName: 'TAMt' });
    s.addText('SAM', { x: cx - 0.8, y: base - 2.95, w: 1.6, h: 0.45, fontFace: HEAD, fontSize: 18, bold: true, color: K.white, align: 'center', margin: 0, isTextBox: true, objectName: 'SAMt' });
    s.addText('SOM', { x: cx - 0.7, y: base - 1.0, w: 1.4, h: 0.45, fontFace: HEAD, fontSize: 18, bold: true, color: K.ink, align: 'center', margin: 0, isTextBox: true, objectName: 'SOMt' });
    const niv = [
      ['US$ 46 M', 'TAM · cadenas objetivo del Perú', 'rango 23–80 M al año', K.marino700, 1.75],
      ['US$ 4 M', 'SAM · norte, empresas que ya pueden transar', 'rango 1–12 M al año', K.marino600, 3.05],
      ['US$ 72 mil', 'SOM · ingresos de Swapit en el año 3', 'rango 10–355 mil', K.sol700, 4.35],
    ];
    niv.forEach(([n, l, r, c, y], i) => {
      s.addShape(pres.ShapeType.roundRect, { x: 6.35, y, w: 6.35, h: 1.15, fill: { color: K.white }, line: { color: K.line, width: 1 }, rectRadius: 0.2, shadow: sombra(), objectName: `Niv${i}` });
      s.addText(n, { x: 6.55, y, w: 2.9, h: 1.15, fontFace: HEAD, fontSize: i === 2 ? 30 : 34, bold: true, color: c, margin: 0, valign: 'middle', isTextBox: true, objectName: `NivN${i}` });
      s.addText([{ text: l, options: { fontSize: 14, bold: true, color: K.ink, breakLine: true } }, { text: r, options: { fontSize: 13, color: K.ink500 } }], { x: 9.5, y, w: 3.1, h: 1.15, fontFace: BODY, margin: 0, valign: 'middle', isTextBox: true, objectName: `NivT${i}` });
    });
    s.addShape(pres.ShapeType.roundRect, { x: 6.35, y: 5.6, w: 6.35, h: 0.8, fill: { color: K.marino900 }, line: { type: 'none' }, rectRadius: 0.2, objectName: 'Banda' });
    s.addText([{ text: 'US$ 4 473 M ', options: { bold: true, color: K.limon, fontSize: 22 } }, { text: 'exportó el norte en 2024 · 5,9 % del Perú', options: { color: K.white, fontSize: 15 } }], { x: 6.55, y: 5.6, w: 6.0, h: 0.8, fontFace: HEAD, margin: 0, valign: 'middle', isTextBox: true, objectName: 'BandaT' });
    s.addText('Estimación conservadora del valor anual del material aprovechable; supuestos en docs/pitch/investigacion-mercado.md.', { x: 0.6, y: 6.5, w: 11.9, h: 0.45, fontFace: BODY, fontSize: 12, italic: true, color: K.ink500, margin: 0, isTextBox: true, objectName: 'Pie' });
    s.addNotes('[1:00–1:12 · Tamaño de mercado] Empezamos donde vivimos: mango, banano, arroz y concha de abanico de Sechura. El valor del material aprovechable en nuestras cadenas ronda los 46 millones de dólares al año en el Perú; en el norte, empresas que ya pueden transar, unos 4 millones. Nuestro objetivo a tres años son 72 mil dólares de ingresos, con certificados y suscripciones. Empezamos en Piura.\n\nCÓMO SE CALCULA (medio; bajo–alto entre paréntesis): TAM = Σ volumen nacional × fracción aprovechable × precio de referencia = US$ 45,9 M (22,5–79,9). SAM = valor del material en el norte (S/ 61,8 M) × 25 % formal-digital = US$ 4,1 M (1,0–12,5). SOM año 3 = 45 intermediarios × S/ 199 × 12 + 150 generadores × 12 certificados × S/ 80 + comisión 2 % × 40 % de S/ 15 000 × 150 = S/ 269 460 ≈ US$ 71,5 mil (9,9–354,7 mil). Casi todos los precios y fracciones son SUPUESTOS salvo la cascarilla de arroz (S/ 110/t, verificada). Defiéndelo con honestidad: el negocio no depende de una comisión sobre un mercado de materiales grande, sino de certificados y suscripción impulsados por exigencias de cumplimiento (UE/EE. UU.). Dato de contexto: exportaciones 2024 del norte = Piura US$ 3 350 M + Lambayeque US$ 1 033 M + Tumbes US$ 90 M (BCRP). Transición: zoom.');
    anim[6] = [['TAM', 'fade', 300], ['TAMt', 'fade', 300], ['SAM', 'fade', 1200], ['SAMt', 'fade', 1200], ['SOM', 'fade', 2100], ['SOMt', 'fade', 2100],
      ['Niv0', 'fade', 700], ['NivN0', 'wipe', 700], ['NivT0', 'fade', 700], ['Niv1', 'fade', 1600], ['NivN1', 'wipe', 1600], ['NivT1', 'fade', 1600], ['Niv2', 'fade', 2500], ['NivN2', 'wipe', 2500], ['NivT2', 'fade', 2500], ['Banda', 'fade', 3800], ['BandaT', 'wipe', 3800]];
    trans[6] = '<p:zoom dir="in"/>';
  }

  // ============ 7. FACTOR DIFERENCIADOR ============
  {
    const s = pres.addSlide({ masterName: 'CLARO' });
    titulo(s, 'Marketplace es vitrina; Swapit cierra el trato', { fontSize: 36 });
    s.addText('Marketplace de anuncios', { x: 6.1, y: 1.55, w: 3.2, h: 0.55, fontFace: HEAD, fontSize: 16, bold: true, color: K.ink500, align: 'center', margin: 0, isTextBox: true, objectName: 'ColA' });
    s.addShape(pres.ShapeType.roundRect, { x: 9.55, y: 1.5, w: 3.15, h: 0.65, fill: { color: K.sol500 }, line: { type: 'none' }, rectRadius: 0.3, objectName: 'ColBFondo' });
    s.addText('Swapit', { x: 9.55, y: 1.5, w: 3.15, h: 0.65, fontFace: HEAD, fontSize: 20, bold: true, color: K.ink, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'ColB' });
    const filas = [
      ['Oferta de precio dentro de la plataforma', I.etiqueta],
      ['Contacto solo con acuerdo', I.candado],
      ['Usos y compradores de cada residuo', I.reciclar],
      ['Certificado de trazabilidad con QR', I.certificado],
      ['Impacto medido por intercambio', I.hoja],
    ];
    filas.forEach(([t, ic], i) => {
      const y = 2.3 + i * 0.84;
      s.addShape(pres.ShapeType.roundRect, { x: 0.6, y, w: 12.1, h: 0.72, fill: { color: K.white }, line: { color: K.line, width: 1 }, rectRadius: 0.15, objectName: `Row${i}` });
      s.addShape(pres.ShapeType.ellipse, { x: 0.8, y: y + 0.1, w: 0.52, h: 0.52, fill: { color: K.marino600 }, line: { type: 'none' }, objectName: `RowC${i}` });
      s.addImage({ data: ic, x: 0.93, y: y + 0.23, w: 0.26, h: 0.26, objectName: `RowI${i}` });
      s.addText(t, { x: 1.55, y, w: 4.5, h: 0.72, fontFace: BODY, fontSize: 18, bold: true, color: K.ink, margin: 0, valign: 'middle', isTextBox: true, objectName: `RowT${i}` });
      s.addImage({ data: I.equis, x: 7.5, y: y + 0.17, w: 0.38, h: 0.38, objectName: `No${i}` });
      s.addImage({ data: I.check, x: 10.85, y: y + 0.15, w: 0.42, h: 0.42, objectName: `Si${i}` });
    });
    s.addText('Las plataformas de gestión de residuos (Recylink, Wazte…) gestionan el residuo; Swapit ayuda a venderlo y a saber cuánto vale.', { x: 0.6, y: 6.55, w: 11.8, h: 0.4, fontFace: BODY, fontSize: 14, italic: true, color: K.ink700, margin: 0, isTextBox: true, objectName: 'Pie' });
    s.addNotes('[1:12–1:24 · Diferenciador] Facebook Marketplace es una vitrina. Swapit es un intercambio: oferta dentro de la plataforma, contacto solo con acuerdo, certificado e impacto medido. Y detrás, doce cadenas productivas y cincuenta y dos residuos con sus usos.\n\nNo pongas el logo de Facebook: escribe "Marketplace de anuncios". Lo que NO podemos afirmar: "primera", "única" o "mejor" plataforma (la búsqueda de competidores fue limitada); que el contacto tras acuerdo elimine la desintermediación (es una mitigación). El impacto medido NO diferencia (lo ofrecen EME, Recylink, Wazte…); aquí es parte del paquete, no el argumento. Matriz completa de 19 competidores con ✔/◐/✖/[NV] en docs/pitch/investigacion-competencia-modelo.md. Transición: empuje desde abajo; las filas entran una a una.');
    const a7 = [['ColA', 'fade', 300], ['ColBFondo', 'fade', 300], ['ColB', 'fade', 300]];
    filas.forEach((_, i) => { const d = 900 + i * 1300; a7.push([`Row${i}`, 'fade', d], [`RowC${i}`, 'fade', d], [`RowI${i}`, 'fade', d], [`RowT${i}`, 'wipe', d], [`No${i}`, 'fade', d + 300], [`Si${i}`, 'fade', d + 600]); });
    anim[7] = a7;
    trans[7] = '<p:push dir="u"/>';
  }

  // ============ 8. KPIs / TRACCIÓN ============
  {
    const s = pres.addSlide({ masterName: 'CLARO' });
    titulo(s, 'Siete empresas ya nos abrieron la puerta');
    const k = [
      ['7', 'empresas validadas', 'varias nos invitaron a visitar su planta', K.sol700, K.sol50],
      ['4', 'conversaciones profundas', 'más una entrevista a una agroexportadora de mango', K.marino700, K.marino50],
      ['12', 'cadenas productivas', '52 residuos con sus «vidas» documentadas', K.agro, K.agroTint],
      ['160', 'pruebas automáticas', 'prototipo funcional de punta a punta', K.exito, K.exitoTint],
    ];
    k.forEach(([n, l, sub, c, tint], i) => {
      const x = 0.6 + i * 3.08;
      s.addShape(pres.ShapeType.roundRect, { x, y: 1.75, w: 2.9, h: 2.9, fill: { color: tint }, line: { type: 'none' }, rectRadius: 0.2, objectName: `K${i}` });
      s.addText(n, { x, y: 1.85, w: 2.9, h: 1.3, fontFace: HEAD, fontSize: 72, bold: true, color: c, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: `KN${i}` });
      s.addText([{ text: l, options: { fontSize: 18, bold: true, color: K.ink, breakLine: true } }, { text: sub, options: { fontSize: 13, color: K.ink700 } }], { x: x + 0.15, y: 3.2, w: 2.6, h: 1.35, fontFace: BODY, align: 'center', valign: 'top', margin: 0, isTextBox: true, objectName: `KT${i}` });
    });
    const fotos = ['mango', 'concha', 'film', 'carton', 'textil', 'pallets'];
    fotos.forEach((f, i) => s.addImage({ path: img(`foto-${f}.png`), x: 0.6 + i * 2.05, y: 4.95, w: 1.95, h: 1.3, sizing: { type: 'cover', w: 1.95, h: 1.3 }, objectName: `Foto${i}` }));
    s.addText('33 ofertas de demostración de 15 empresas ficticias · imágenes ilustrativas. Las empresas reales las suben las MIPEs.', { x: 0.6, y: 6.4, w: 11.9, h: 0.45, fontFace: BODY, fontSize: 13, italic: true, color: K.ink500, margin: 0, isTextBox: true, objectName: 'Pie' });
    s.addNotes('[1:24–1:36 · Tracción] Antes de cobrar, validamos. Siete empresas ya nos abrieron la puerta y ofrecieron visitas a planta. Una agroexportadora de mango cierra su descarte con un precio y una fecha de recojo. El prototipo ya funciona.\n\nSolo mostramos lo que podemos sustentar: "7 empresas validadas" es dato del equipo (el detalle no está en el repositorio: ten la lista con fechas); 12 cadenas / 52 residuos y 160 pruebas son datos del repositorio. NO mostramos toneladas ni CO₂ reales (no hay transacciones todavía), ni ingresos, ni "usuarios". Las 33 ofertas son de demostración. Las cifras cuentan hacia arriba si prefieres: el efecto de conteo se hace con la animación de entrada. Transición: fundido.');
    anim[8] = [['K0', 'fade', 300], ['KN0', 'wipe', 300], ['KT0', 'fade', 600], ['K1', 'fade', 1100], ['KN1', 'wipe', 1100], ['KT1', 'fade', 1400], ['K2', 'fade', 1900], ['KN2', 'wipe', 1900], ['KT2', 'fade', 2200], ['K3', 'fade', 2700], ['KN3', 'wipe', 2700], ['KT3', 'fade', 3000],
      ...fotos.map((_, i) => [`Foto${i}`, 'fade', 3800 + i * 250]), ['Pie', 'fade', 5600]];
    trans[8] = '<p:fade/>';
  }

  // ============ 9. EQUIPO ============
  {
    const s = pres.addSlide({ masterName: 'CLARO' });
    titulo(s, 'Construimos y salimos a validar');
    const gente = [['DB', 'David Blas', K.marino700, 2.4], ['JF', 'Josué Farfán', K.sol500, 8.4]];
    gente.forEach(([ini, nom, c, x], i) => {
      s.addShape(pres.ShapeType.ellipse, { x, y: 1.85, w: 2.5, h: 2.5, fill: { color: c }, line: { color: K.white, width: 5 }, shadow: sombra(), objectName: `Av${i}` });
      s.addText(ini, { x, y: 1.85, w: 2.5, h: 2.5, fontFace: HEAD, fontSize: 60, bold: true, color: c === K.sol500 ? K.ink : K.white, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: `AvT${i}` });
      s.addText([{ text: nom, options: { fontFace: HEAD, fontSize: 28, bold: true, color: K.marino900, breakLine: true } }, { text: 'SeedTech UDEP 2026', options: { fontFace: BODY, fontSize: 16, color: K.ink700 } }], { x: x - 0.6, y: 4.5, w: 3.7, h: 1.0, align: 'center', margin: 0, isTextBox: true, objectName: `Nom${i}` });
    });
    const chips = [['laptop', 'Prototipo funcional', K.marino600], ['usuarios', 'Validación con empresas', K.sol700], ['grafico', 'Investigación de mercado', K.exito]];
    chips.forEach(([ic, t, c], i) => {
      const x = 1.2 + i * 3.9;
      s.addShape(pres.ShapeType.roundRect, { x, y: 5.75, w: 3.6, h: 0.85, fill: { color: K.white }, line: { color: K.line, width: 1 }, rectRadius: 0.4, objectName: `Ch${i}` });
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.15, y: 5.88, w: 0.6, h: 0.6, fill: { color: c }, line: { type: 'none' }, objectName: `ChC${i}` });
      s.addImage({ data: I[ic], x: x + 0.3, y: 6.03, w: 0.3, h: 0.3, objectName: `ChI${i}` });
      s.addText(t, { x: x + 0.9, y: 5.75, w: 2.6, h: 0.85, fontFace: BODY, fontSize: 16, bold: true, color: K.ink, margin: 0, valign: 'middle', isTextBox: true, objectName: `ChT${i}` });
    });
    s.addNotes('[1:36–1:48 · Equipo] Somos David Blas y Josué Farfán, de SeedTech UDEP 2026. Construimos el prototipo y salimos a validar con las empresas.\n\nPENDIENTE: reemplaza los círculos con iniciales por la foto real de los dos (idealmente en una visita a planta o ante el prototipo): clic derecho sobre el círculo → Formato de forma → Relleno de imagen. No añadas roles ni organigrama que no estén confirmados. Transición: barrido.');
    anim[9] = [['Av0', 'fade', 300], ['AvT0', 'fade', 300], ['Nom0', 'wipe', 700], ['Av1', 'fade', 1200], ['AvT1', 'fade', 1200], ['Nom1', 'wipe', 1600], ['Ch0', 'fade', 2500], ['ChC0', 'fade', 2500], ['ChI0', 'fade', 2500], ['ChT0', 'fade', 2500], ['Ch1', 'fade', 3000], ['ChC1', 'fade', 3000], ['ChI1', 'fade', 3000], ['ChT1', 'fade', 3000], ['Ch2', 'fade', 3500], ['ChC2', 'fade', 3500], ['ChI2', 'fade', 3500], ['ChT2', 'fade', 3500]];
    trans[9] = '<p:wipe dir="r"/>';
  }

  // ============ 10. CALL TO ACTION ============
  {
    const s = pres.addSlide({ masterName: 'OSCURO' });
    s.addShape(pres.ShapeType.ellipse, { x: -2.6, y: 6.2, w: 5.0, h: 5.0, fill: { color: K.sol500 }, line: { type: 'none' }, objectName: 'Sol' });
    s.addShape(pres.ShapeType.ellipse, { x: 11.6, y: -0.8, w: 2.2, h: 2.2, fill: { color: K.limon }, line: { type: 'none' }, objectName: 'Limon' });
    s.addImage({ path: img('logo-horizontal-blanco.png'), x: 0.6, y: 0.5, w: 2.4, h: 0.56, objectName: 'Logo' });
    s.addText('Su próximo descarte puede tener comprador.', { x: 0.6, y: 1.55, w: 8.0, h: 2.3, fontFace: HEAD, fontSize: 46, bold: true, color: K.white, margin: 0, valign: 'top', isTextBox: true, objectName: 'Titular' });
    s.addShape(pres.ShapeType.roundRect, { x: 0.6, y: 4.1, w: 5.0, h: 0.95, fill: { color: K.sol500 }, line: { type: 'none' }, rectRadius: 0.45, objectName: 'Boton1' });
    s.addText('Un piloto en su planta', { x: 0.6, y: 4.1, w: 5.0, h: 0.95, fontFace: HEAD, fontSize: 22, bold: true, color: K.ink, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'Boton1T' });
    s.addShape(pres.ShapeType.roundRect, { x: 0.6, y: 5.25, w: 5.0, h: 0.95, fill: { type: 'none' }, line: { color: K.white, width: 2.5 }, rectRadius: 0.45, objectName: 'Boton2' });
    s.addText('Presentaciones a compradores', { x: 0.6, y: 5.25, w: 5.0, h: 0.95, fontFace: HEAD, fontSize: 22, bold: true, color: K.white, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'Boton2T' });
    s.addShape(pres.ShapeType.roundRect, { x: 9.0, y: 3.2, w: 3.3, h: 3.3, fill: { color: K.white }, line: { color: K.marino200, width: 2, dashType: 'dash' }, rectRadius: 0.2, objectName: 'QR' });
    s.addText([{ text: 'QR de contacto', options: { fontSize: 20, bold: true, color: K.marino900, breakLine: true } }, { text: 'pega aquí el QR del equipo', options: { fontSize: 14, color: K.ink500 } }], { x: 9.0, y: 3.2, w: 3.3, h: 3.3, fontFace: HEAD, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'QRT' });
    s.addNotes('[1:48–2:00 · Call to action] Buscamos una planta para un primer intercambio piloto, y mentores que nos presenten compradores. Su próximo descarte puede tener comprador. Escríbanos.\n\nPENDIENTE: pon el QR y el correo de contacto del equipo en el recuadro punteado (no se inventó ninguno). Si hay un video de cierre (clip 7 del storyboard: camión yéndose, patio limpio), úsalo de fondo con tinta oscura al 60 %. Fundido a negro lento al decir "Escríbanos"; el QR queda en pantalla durante las preguntas.');
    anim[10] = [['Titular', 'wipe', 400], ['Boton1', 'fade', 1500], ['Boton1T', 'fade', 1500], ['Boton2', 'fade', 2100], ['Boton2T', 'fade', 2100], ['QR', 'fade', 3500], ['QRT', 'fade', 3500]];
    trans[10] = '<p:fade/>';
  }

  const tmp = OUT + '.tmp.pptx';
  await pres.writeFile({ fileName: tmp });
  await applyTheme(tmp, THEME);

  // ---------- Transiciones y animaciones (XML) ----------
  const zip = await JSZip.loadAsync(fs.readFileSync(tmp));
  const efecto = (tipo, spid, id, delay) => {
    const base = (idn, filtro) => `<p:par><p:cTn id="${idn}" presetID="${tipo === 'wipe' ? 22 : 10}" presetClass="entr" presetSubtype="${tipo === 'wipe' ? 8 : 0}" fill="hold" nodeType="withEffect"><p:stCondLst><p:cond delay="${delay}"/></p:stCondLst><p:childTnLst>` +
      `<p:set><p:cBhvr><p:cTn id="${idn + 1}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>` +
      `<p:animEffect transition="in" filter="${filtro}"><p:cBhvr><p:cTn id="${idn + 2}" dur="${tipo === 'wipe' ? 600 : 500}"/><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl></p:cBhvr></p:animEffect></p:childTnLst></p:cTn></p:par>`;
    return base(id, tipo === 'wipe' ? 'wipe(left)' : 'fade');
  };
  for (let n = 1; n <= 10; n++) {
    const f = `ppt/slides/slide${n}.xml`;
    let xml = await zip.file(f).async('string');
    const ids = {};
    for (const m of xml.matchAll(/<p:cNvPr id="(\d+)" name="([^"]*)"/g)) ids[m[2]] = m[1];
    let extra = trans[n] ? `<p:transition spd="med" advClick="1">${trans[n]}</p:transition>` : '';
    const efs = (anim[n] || []).filter(([nombre]) => ids[nombre]);
    const faltan = (anim[n] || []).filter(([nombre]) => !ids[nombre]).map((x) => x[0]);
    if (faltan.length) console.log(`lámina ${n}: sin id para`, [...new Set(faltan)].join(', '));
    if (efs.length) {
      let cid = 5;
      const cuerpo = efs.map(([nombre, tipo, delay]) => { const s = efecto(tipo, ids[nombre], cid, delay); cid += 3; return s; }).join('');
      extra += '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>' +
        '<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst><p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>' +
        cuerpo + '</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>';
    }
    if (extra) {
      if (xml.includes('<p:timing')) throw new Error('la lámina ' + n + ' ya trae timing (video)');
      xml = xml.replace('</p:clrMapOvr>', '</p:clrMapOvr>' + extra);
      zip.file(f, xml);
    }
  }
  fs.writeFileSync(OUT, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  fs.unlinkSync(tmp);
  console.log('listo', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
