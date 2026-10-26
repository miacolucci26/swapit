/**
 * Base de conocimiento «usos ↔ insumos»: traduce lo que alguien NECESITA («cáscaras para hacer gomitas»)
 * a lo que otros PUBLICAN («cáscara de limón sutil», «pepa de mango»). Sirve para ampliar la búsqueda en
 * lenguaje libre, explicar por qué un lote calza y alimentar al asistente local.
 *
 * Origen: usos publicados en fuentes abiertas (ver docs/investigacion-y-mejoras.md). Es una selección
 * curada para el prototipo, NO una validación técnica ni sanitaria: cada entrada lleva su «cuidado».
 */
export interface UsoInsumo {
  id: string;
  /** Qué quiere lograr quien busca (palabras o frases que diría). */
  necesidades: string[];
  /** Cómo se llama lo que publican quienes lo tienen. */
  insumos: string[];
  categorias: string[];
  titulo: string;
  detalle: string;
  /** Lo que debe verificarse antes de usar el material (inocuidad, permisos, calidad). */
  cuidado: string;
  /** false = reúso directo (el que busca «libros» quiere libros): se explica, pero no se amplía la búsqueda con otros insumos. */
  expande?: boolean;
}

export const USOS_INSUMOS: UsoInsumo[] = [
  {
    id: 'pectina-dulces',
    necesidades: ['gomita', 'gomitas', 'mermelada', 'jalea', 'pectina', 'confiteria', 'caramelo', 'dulce de fruta', 'fruta confitada'],
    insumos: ['cascara de limon', 'cascara de naranja', 'cascara de mandarina', 'cascara de toronja', 'cascara de mango', 'cascara de citrico', 'pectina', 'limon', 'naranja', 'mandarina', 'mango'],
    categorias: ['ORGANICO_AGRO'],
    titulo: 'Pectina y dulces de fruta',
    detalle: 'La cáscara de cítricos y de mango contiene pectina, el gelificante de gomitas, mermeladas y jaleas. Hay estudios locales de extracción de pectina de cáscara de mango.',
    cuidado: 'Pide fecha de generación y confirma que no tuvo contacto con residuos de plaguicidas o aceites de proceso; para consumo humano se necesita registro sanitario de quien transforma.',
  },
  {
    id: 'dulces-harinas',
    necesidades: ['harina', 'snack', 'chifle', 'dulce de platano', 'panetón', 'paneton', 'pan', 'galleta', 'reposteria', 'repostería'],
    insumos: ['cascara de platano', 'cascara de banano', 'cascara de mango', 'bagazo', 'pulpa', 'cascara de maracuya'],
    categorias: ['ORGANICO_AGRO'],
    titulo: 'Panadería y dulces con cáscaras y pulpas',
    detalle: 'Existen productos hechos con cáscara de mango (panetón) y de plátano (dulces) en Piura y Talara; las pulpas y bagazos pueden secarse y molerse como harinas.',
    cuidado: 'Solo material de proceso limpio y refrigerado; para consumo humano la trazabilidad y la inocuidad las responde quien procesa.',
  },
  {
    id: 'compost',
    necesidades: ['compost', 'compostaje', 'abono', 'abono organico', 'biofertilizante', 'humus', 'fertilizar', 'fertilizante', 'mejorar suelo', 'lombriz', 'lombricultura', 'huerto', 'jardin', 'jardín'],
    insumos: ['cascara', 'pulpa', 'bagazo', 'pepa', 'poda', 'hojas', 'descarte', 'residuo organico', 'residuo de fruta', 'espárrago', 'esparrago', 'uva', 'arandano', 'mango', 'limon', 'palta', 'cascarilla', 'raquis'],
    categorias: ['ORGANICO_AGRO', 'BIOMASA'],
    titulo: 'Compost y biofertilizantes',
    detalle: 'Los residuos orgánicos agroindustriales son la base de compost, humus de lombriz y biofertilizantes; hay plantas de abonos para cacao y banano en Piura.',
    cuidado: 'Mezcla material verde y seco; evita restos con aceites o con plaguicidas persistentes. Pide el análisis de humedad si el lote es grande.',
  },
  {
    id: 'alimento-animal',
    necesidades: ['alimento animal', 'forraje', 'cuy', 'cuyes', 'engorde', 'ganado', 'cerdo', 'cerdos', 'chancho', 'gallina', 'gallinas', 'balanceado', 'ensilado', 'pastura'],
    insumos: ['descarte de uva', 'descarte de mango', 'descarte de fruta', 'bagazo', 'pulpa', 'cascara de limon', 'cascara de mango', 'espárrago', 'esparrago', 'pepa', 'fruta', 'uva', 'mango', 'afrecho', 'maiz'],
    categorias: ['ORGANICO_AGRO'],
    titulo: 'Alimento y forraje para animales',
    detalle: 'Descartes de fruta, bagazos y pulpas se usan en mezclas para ganado, cuyes y cerdos, frescos o ensilados.',
    cuidado: 'No usar material con plaguicidas fuera de norma ni en descomposición; los cítricos y el mango se dosifican en mezcla. Consulta a un técnico pecuario.',
  },
  {
    id: 'energia-biomasa',
    necesidades: ['energia', 'combustible', 'caldera', 'pellet', 'pellets', 'leña', 'lena', 'carbon', 'carbón', 'horno', 'secar', 'biomasa'],
    insumos: ['cascarilla de arroz', 'cascarilla', 'raquis', 'poda', 'aserrin', 'aserrín', 'leña', 'lena', 'bagazo', 'pepa', 'hueso', 'madera', 'biomasa'],
    categorias: ['BIOMASA', 'MADERA_PALLETS'],
    titulo: 'Energía con biomasa',
    detalle: 'La cascarilla de arroz, la poda triturada, el aserrín y los huesos secos sirven de combustible en calderas, hornos y pellets.',
    cuidado: 'Pide humedad (menos de 15–20 %) y poder calorífico; la madera tratada o pintada no debe quemarse.',
  },
  {
    id: 'biochar',
    necesidades: ['biochar', 'carbon vegetal', 'carbón vegetal', 'enmienda', 'sustrato', 'almacigo', 'almácigo', 'vivero'],
    insumos: ['cascarilla de arroz', 'poda', 'aserrin', 'biomasa', 'cascarilla'],
    categorias: ['BIOMASA'],
    titulo: 'Biochar y sustratos',
    detalle: 'La cascarilla de arroz carbonizada y la poda se usan como enmienda del suelo y como componente de sustratos de vivero.',
    cuidado: 'El biochar exige pirólisis controlada; la cascarilla sin carbonizar sirve de sustrato solo si está limpia.',
  },
  {
    id: 'conchas-construccion',
    necesidades: ['concreto', 'pavimento', 'asfalto', 'ladrillo', 'adoquin', 'adoquín', 'construccion', 'construcción', 'permeable', 'cal', 'cemento', 'agregado'],
    insumos: ['concha de abanico', 'conchas de abanico', 'concha', 'conchas', 'valva', 'valvas', 'desmonte', 'escombro', 'concreto reciclado', 'agregado'],
    categorias: ['PESCA_MARISCOS', 'CONSTRUCCION'],
    titulo: 'Conchas y escombros en construcción',
    detalle: 'La UDEP probó concreto permeable con 10 % de concha de abanico y la USIL asfalto con conchas; los escombros triturados sirven de agregado reciclado y relleno.',
    cuidado: 'Las conchas deben lavarse y secarse para quitar sales y materia orgánica; el desempeño estructural debe ensayarlo quien construye.',
  },
  {
    id: 'conchas-calcio',
    necesidades: ['calcio', 'carbonato de calcio', 'suplemento', 'avicola', 'avícola', 'cal agricola', 'cal agrícola', 'encalado', 'enmienda de suelo acido', 'filtro', 'tratamiento de agua', 'pellets de concha'],
    insumos: ['concha de abanico', 'conchas de abanico', 'concha', 'conchas', 'valva', 'valvas', 'carbonato de calcio'],
    categorias: ['PESCA_MARISCOS'],
    titulo: 'Calcio y tratamiento de agua con conchas',
    detalle: 'Las conchas molidas aportan carbonato de calcio (suplemento avícola, cal agrícola) y se han ensayado pellets para tratamiento de agua. Sechura concentra cerca del 80 % de la producción nacional de concha de abanico.',
    cuidado: 'Para alimento animal se requiere molienda fina y control de sales y metales; es un uso reportado, no validado por la plataforma.',
  },
  {
    id: 'textil-reuso',
    necesidades: ['relleno', 'almohada', 'cojin', 'cojín', 'peluche', 'trapo', 'trapos', 'limpieza industrial', 'artesania', 'artesanía', 'patchwork', 'accesorio', 'hilado', 'tela reciclada', 'aislante', 'acolchado'],
    insumos: ['retazo', 'retazos', 'recorte', 'recortes', 'tela', 'merma textil', 'algodon', 'algodón', 'pima', 'hilo', 'prenda', 'tejido'],
    categorias: ['TEXTIL', 'ARTICULOS_PERSONALES'],
    titulo: 'Retazos y mermas textiles',
    detalle: 'Los retazos de algodón y de confección se reutilizan como relleno, trapos industriales, artesanía o hilado reciclado.',
    cuidado: 'Separa por fibra (algodón vs sintético) y color; confirma que no esté impregnado de químicos de teñido.',
  },
  {
    id: 'empaques-papel',
    necesidades: ['empaque', 'embalaje', 'caja', 'cajas', 'mudanza', 'envio', 'envío', 'pulpa moldeada', 'bandeja', 'papel reciclado'],
    insumos: ['carton', 'cartón', 'cajas', 'corrugado', 'papel', 'kraft', 'embalaje'],
    categorias: ['PAPEL_CARTON'],
    titulo: 'Cartón y papel',
    detalle: 'El cartón corrugado se reutiliza como caja de mudanza o envío, y el papel/cartón limpio se recicla en empaques y pulpa moldeada.',
    cuidado: 'Debe estar seco y sin restos orgánicos o grasa.',
  },
  {
    id: 'aceite-usado',
    necesidades: ['jabon', 'jabón', 'jabon artesanal', 'biodiesel', 'biodiésel', 'vela', 'velas', 'lubricante'],
    insumos: ['aceite usado', 'aceite de cocina', 'aceite vegetal usado', 'grasa', 'aceite'],
    categorias: ['ACEITES_USADOS'],
    titulo: 'Aceite de cocina usado',
    detalle: 'El aceite vegetal usado se transforma en jabón artesanal, velas o biodiésel; nunca debe botarse al desagüe.',
    cuidado: 'Debe entregarse filtrado, en envases cerrados y sin mezcla con aceite mineral; el biodiésel requiere un operador autorizado.',
  },
  {
    id: 'plastico-reciclado',
    necesidades: ['ecoladrillo', 'ecoladrillos', 'madera plastica', 'madera plástica', 'granulado', 'resina', 'pellet de plastico', 'macetero', 'maceteros'],
    insumos: ['pet', 'pead', 'botella', 'botellas', 'plastico', 'plástico', 'film', 'polietileno', 'tapas'],
    categorias: ['PLASTICO', 'INSUMOS_RECICLADOS'],
    titulo: 'Plástico para reciclaje y manualidades',
    detalle: 'Las botellas PET y el film limpio se reciclan mecánicamente en granulado o se reutilizan en ecoladrillos y maceteros.',
    cuidado: 'Separa por tipo de resina y enjuaga; el plástico que contuvo químicos peligrosos no sirve para uso doméstico.',
  },
  {
    id: 'madera-upcycling',
    necesidades: ['mueble', 'muebles', 'decoracion', 'decoración', 'carpinteria', 'carpintería', 'tarima', 'estante', 'estantes', 'jardinera', 'cerco'],
    insumos: ['pallet', 'pallets', 'palet', 'palets', 'tarima', 'madera', 'tablas', 'aserrin', 'aserrín', 'listones'],
    categorias: ['MADERA_PALLETS'],
    titulo: 'Pallets y madera recuperada',
    detalle: 'Los pallets y tablas en buen estado se reaprovechan en muebles, estantes, jardineras y cercos.',
    cuidado: 'Evita pallets con tratamiento químico (busca el sello HT de tratamiento térmico) o con derrames.',
  },
  {
    id: 'chatarra-fundicion',
    necesidades: ['fundicion', 'fundición', 'soldadura', 'estructura', 'refuerzo', 'metalmecanica', 'metalmecánica', 'fierro', 'acero reciclado'],
    insumos: ['chatarra', 'metal', 'acero', 'fierro', 'hierro', 'aluminio', 'cobre', 'varilla', 'viga', 'lata', 'latas'],
    categorias: ['METAL'],
    titulo: 'Chatarra y metales',
    detalle: 'La chatarra ferrosa y no ferrosa va a fundición o a talleres de metalmecánica; las varillas y vigas en buen estado pueden reutilizarse sin fundir.',
    cuidado: 'Separa ferroso de no ferroso y confirma el pesaje en balanza certificada.',
  },
  {
    id: 'repuestos-reacondicionado',
    necesidades: ['repuesto', 'repuestos', 'reparar', 'reparacion', 'reparación', 'reacondicionar', 'reacondicionado', 'usado', 'seminuevo', 'armar', 'taller'],
    insumos: ['maquina', 'máquina', 'motor', 'equipo', 'compresor', 'bomba', 'laptop', 'celular', 'computadora', 'cargador', 'monitor', 'impresora', 'electrodomestico', 'electrodoméstico'],
    categorias: ['MAQUINARIA_EQUIPOS', 'RAEE'],
    titulo: 'Repuestos y equipos para reacondicionar',
    detalle: 'Equipos fuera de uso sirven de repuestos o se reacondicionan para volver a circular; los aparatos electrónicos deben terminar con gestores autorizados de RAEE.',
    cuidado: 'Borra tus datos antes de entregar un equipo electrónico y no desarmes baterías ni tubos de pantalla.',
  },
  {
    id: 'vidrio-ceramica',
    necesidades: ['vidrio reciclado', 'mosaico', 'vitral', 'ceramica', 'cerámica', 'chamota', 'ladrillo', 'decoracion', 'decoración', 'manualidad', 'manualidades'],
    insumos: ['vidrio', 'botella de vidrio', 'frasco', 'frascos', 'ceramica', 'cerámica', 'loza', 'mayolica', 'mayólica', 'azulejo', 'azulejos'],
    categorias: ['VIDRIO_CERAMICA'],
    titulo: 'Vidrio y cerámica',
    detalle: 'Frascos y botellas de vidrio se reutilizan o van a recicladoras; los restos de cerámica sirven en mosaicos y manualidades.',
    cuidado: 'Manipula con guantes; el vidrio roto debe ir en envase rígido y rotulado.',
  },
  {
    id: 'reuso-hogar',
    necesidades: ['uniforme', 'uniformes', 'libros', 'utiles', 'útiles', 'mochila', 'ropa', 'ropa de bebe', 'ropa de niño', 'juguetes', 'cuna', 'coche', 'mudanza', 'estudiante', 'universidad', 'cuarto', 'departamento'],
    insumos: ['ropa', 'libros', 'texto', 'uniforme', 'mochila', 'juguete', 'juguetes', 'mueble', 'cocina', 'electrodomestico', 'licuadora', 'escritorio', 'silla', 'cama', 'colchon', 'ventilador', 'bicicleta'],
    categorias: ['ARTICULOS_PERSONALES'],
    titulo: 'Reúso directo entre familias y estudiantes',
    detalle: 'Ropa, libros, útiles, muebles y electrodomésticos en buen estado pasan de una casa a otra sin transformarse; es el uso de mayor valor.',
    cuidado: 'Revisa el estado antes de cerrar y encuéntrate en un lugar público y concurrido; no pagues por adelantado fuera de la plataforma.',
    expande: false,
  },
];

// ---------- Utilidades ----------

/** Minúsculas, sin tildes ni signos; palabras separadas por un espacio. */
export function textoPlano(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Raíz mínima para que «cáscaras» coincida con «cáscara» y «gomitas» con «gomita». */
export const raiz = (w: string) => (w.length > 4 && w.endsWith('es') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);
export const tokensDe = (t: string) => textoPlano(t).split(' ').filter(Boolean).map(raiz);

/** ¿Aparece el término (palabra o frase) dentro del texto, comparando por raíz de palabra? */
export function contiene(texto: string, termino: string): boolean {
  const tt = tokensDe(texto);
  const frase = tokensDe(termino);
  if (!frase.length) return false;
  for (let i = 0; i + frase.length <= tt.length; i++) {
    if (frase.every((f, j) => tt[i + j] === f)) return true;
  }
  return false;
}

export interface UsoDetectado {
  uso: UsoInsumo;
  /** Qué parte de la consulta activó el uso. */
  porque: string;
}

/** Usos que responden a lo que alguien dice necesitar. */
export function usosParaNecesidad(texto: string): UsoDetectado[] {
  const hallados: UsoDetectado[] = [];
  for (const uso of USOS_INSUMOS) {
    const t = uso.necesidades.find((n) => contiene(texto, n));
    if (t) hallados.push({ uso, porque: t });
  }
  return hallados;
}

/** Usos posibles de un material que alguien tiene («¿qué hago con cáscara de mango?»). */
export function usosParaMaterial(texto: string): UsoDetectado[] {
  const hallados: UsoDetectado[] = [];
  for (const uso of USOS_INSUMOS) {
    // Se prefieren las frases más específicas: «cáscara de mango» antes que «mango».
    const m = [...uso.insumos].sort((a, b) => b.length - a.length).find((i) => contiene(texto, i));
    if (m) hallados.push({ uso, porque: m });
  }
  return hallados;
}

export interface ConsultaExpandida {
  /** Texto original más los insumos que se sabe que sirven; es lo que se convierte en embedding. */
  texto: string;
  usos: UsoDetectado[];
}

/**
 * Amplía una búsqueda: «necesito cáscaras de fruta para hacer gomitas» agrega «cáscara de limón, naranja, mango…»,
 * de modo que calce con lotes que nunca mencionan «gomitas».
 */
export function expandirConsulta(texto: string): ConsultaExpandida {
  const usos = usosParaNecesidad(texto);
  const amplian = usos.filter((u) => u.uso.expande !== false);
  if (!amplian.length) return { texto, usos };
  const extra = [...new Set(amplian.flatMap((u) => u.uso.insumos.slice(0, 8)))];
  return { texto: `${texto}. Insumos relacionados: ${extra.join(', ')}`, usos };
}

/** Si el título/keywords del lote coincide con los insumos de algún uso detectado, devuelve ese uso. */
export function usoQueCalza(usos: UsoDetectado[], textoLote: string): UsoInsumo | null {
  for (const { uso } of usos) {
    if (uso.insumos.some((i) => contiene(textoLote, i))) return uso;
  }
  return null;
}
