import type { Cadena, Escala, Evidencia, Nivel, Valor, Vida } from './cadenas';
import type { TipoDestino } from './sectores';

/**
 * Cadenas productivas del norte del Perú y de uso transversal, con las vidas de sus residuos.
 * Selección curada para el prototipo a partir de prácticas de la industria, estudios y proyectos abiertos (ver
 * docs/validacion-y-mejoras.md): NO es una validación técnica, sanitaria ni de mercado. Cada vida declara su evidencia.
 * Pendiente: sumar fuentes citables por vida y contrastar con compradores y técnicos de la región.
 */

const v = (uso: string, nivel: Nivel, valor: Valor, destinos: TipoDestino[], negocio: string, requisitos: string, evidencia: Evidencia, escala: Escala = 'AMBAS'): Vida => ({
  uso, nivel, valor, destinos, negocio, requisitos, evidencia, escala,
});

export const CADENAS: Cadena[] = [
  // ───────────────────────── AGRO ─────────────────────────
  {
    id: 'mango',
    sector: 'AGRO',
    nombre: 'Mango',
    zonas: ['Piura', 'Lambayeque'],
    resumen: 'Gran parte de lo que se produce se exporta fresco o congelado; el descarte de selección, la cáscara y la pepa son los flujos que más se pierden.',
    etapas: [
      {
        id: 'campo',
        nombre: 'Campo y cosecha',
        que: 'Cosecha, poda y limpieza del huerto.',
        residuos: [
          {
            id: 'mango-poda',
            nombre: 'Poda y ramas del mango',
            sinonimos: ['ramas de mango', 'hojas de mango', 'leña de mango'],
            categoria: 'BIOMASA',
            descripcion: 'Ramas, hojas y madera que salen cada campaña al podar los árboles.',
            preparacion: 'Triturar o picar y dejar secar; no quemar en el campo.',
            vidas: [
              v('Compost, cobertura (mulch) y enmienda del suelo', 'MATERIAL', 'MEDIO', ['COMPOSTAJE'], 'Se devuelve al propio huerto o se vende a plantas de compost; evita comprar abono y el costo de retirarla.', 'Triturada; sin restos de plástico ni cintas.', 'PRACTICA_COMUN'),
              v('Leña, astillas y pellets para caldera u horno', 'ENERGIA', 'BAJO', ['ENERGIA'], 'Se vende seca a hornos, ladrilleras o calderas cercanas.', 'Humedad baja; madera sin pintura ni tratamiento.', 'PRACTICA_COMUN'),
            ],
          },
        ],
      },
      {
        id: 'seleccion',
        nombre: 'Selección y empaque en fresco',
        que: 'La fruta se clasifica por calibre, madurez y aspecto; lo que no cumple el estándar de exportación se aparta.',
        residuos: [
          {
            id: 'mango-descarte',
            nombre: 'Descarte de mango (fuera de calibre, con manchas o sobremaduro)',
            sinonimos: ['mango de descarte', 'excedente de mango', 'mango no exportable', 'fruta de descarte', 'mango sobremaduro'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'Fruta sana pero que no entra a exportación fresca. Es el residuo de mayor volumen de la cadena y el que primero pierde valor si espera.',
            preparacion: 'Separar la fruta sana de la podrida, mantenerla a la sombra y entregarla en horas, no en días.',
            preguntas: ['¿Qué porcentaje del descarte está sano y qué porcentaje ya empezó a pudrirse?'],
            vidas: [
              v('Seguir siendo alimento: congelado, pulpa, deshidratado o jugo', 'PREVENIR', 'ALTO', ['REPROCESO_ALIMENTOS'], 'El productor vende el descarte a una planta; quien junta varios productores gana por volumen, rapidez y logística. Se suele cerrar antes de la campaña con un precio y una fecha de recojo.', 'Fruta sana y entrega rápida; la planta pone sus condiciones de inocuidad.', 'PRACTICA_COMUN'),
              v('Mercado local, jugueras y comerciantes', 'PREVENIR', 'MEDIO', ['MERCADO_LOCAL'], 'Venta directa de la fruta que no sirve para planta pero sí para el consumo inmediato.', 'Volumen pequeño y transporte corto.', 'PRACTICA_COMUN', 'MYPE'),
              v('Alimento para cerdos, cuyes y ganado (fresco o ensilado)', 'MATERIAL', 'BAJO', ['ALIMENTO_ANIMAL'], 'Se entrega a criadores cercanos; evita el costo de botarla.', 'Sin fermentación avanzada; dosificada en mezcla con asesoría técnica pecuaria.', 'REPORTADO', 'MYPE'),
              v('Compost y biofertilizantes', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se entrega a plantas de compost o se composta en finca.', 'Mezclar con material seco; sin plástico ni etiquetas.', 'PRACTICA_COMUN'),
              v('Biogás', 'ENERGIA', 'BAJO', ['ENERGIA'], 'Solo con volúmenes grandes y constantes junto a una planta; evita el costo de disposición.', 'Requiere inversión en biodigestor y volumen continuo.', 'POR_VALIDAR', 'INDUSTRIAL'),
            ],
          },
        ],
      },
      {
        id: 'proceso',
        nombre: 'Proceso (congelado, pulpa, deshidratado)',
        que: 'La fruta se pela, se despulpa y se procesa; salen cáscara, pepa y pulpa residual.',
        residuos: [
          {
            id: 'mango-cascara',
            nombre: 'Cáscara de mango',
            sinonimos: ['cascara de mango', 'piel de mango'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'Contiene pectina, fibra y compuestos antioxidantes; sale en grandes volúmenes en plantas de pulpa y congelado.',
            preparacion: 'Recogerla limpia y refrigerada o secarla pronto; no mezclarla con pepa ni con restos de proceso.',
            vidas: [
              v('Pectina, fibra y extractos para alimentos y cosmética', 'MATERIAL', 'ALTO', ['INGREDIENTES'], 'Se vende seca o molida a quien extrae pectina y antioxidantes; hay estudios locales de extracción de pectina de cáscara de mango.', 'Trazabilidad e inocuidad; el comprador suele pedir muestra y análisis.', 'REPORTADO', 'INDUSTRIAL'),
              v('Harina o polvo de cáscara para panadería y snacks', 'MATERIAL', 'MEDIO', ['ARTESANIA_MYPE'], 'Una MYPE seca y muele la cáscara y la vende como ingrediente; se reportan panetones con cáscara de mango en Piura.', 'Material limpio y refrigerado; la MYPE necesita registro sanitario para venderlo como alimento.', 'REPORTADO', 'MYPE'),
              v('Alimento animal', 'MATERIAL', 'BAJO', ['ALIMENTO_ANIMAL'], 'Se entrega fresca o ensilada a criadores.', 'Dosificada en mezcla; fresca, sin fermentar.', 'REPORTADO', 'MYPE'),
              v('Compost', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se entrega a plantas de compost o a agricultores.', 'Mezcla con material seco.', 'PRACTICA_COMUN'),
            ],
          },
          {
            id: 'mango-pepa',
            nombre: 'Pepa o semilla de mango',
            sinonimos: ['pepa de mango', 'semilla de mango', 'hueso de mango', 'almendra de mango'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'La almendra de la semilla contiene grasa; la cáscara dura del hueso es biomasa.',
            preparacion: 'Lavar, secar al sol y separar el hueso de la almendra si se busca grasa.',
            vidas: [
              v('Grasa (manteca) de la almendra para cosmética y confitería', 'MATERIAL', 'ALTO', ['INGREDIENTES'], 'La almendra seca se vende a quien extrae la grasa, que se reporta como parecida a la manteca de cacao.', 'Secado y descascarado; volumen constante; el comprador define la calidad mínima.', 'REPORTADO', 'INDUSTRIAL'),
              v('Compost (triturada)', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se entrega triturada a plantas de compost.', 'Triturar: entera tarda mucho en degradarse.', 'REPORTADO'),
              v('Combustible sólido seco', 'ENERGIA', 'BAJO', ['ENERGIA'], 'Se vende seca a hornos y calderas.', 'Humedad baja; queda mejor mezclada con otra biomasa.', 'REPORTADO'),
            ],
          },
          {
            id: 'mango-bagazo',
            nombre: 'Pulpa residual y bagazo de mango',
            sinonimos: ['bagazo de mango', 'pulpa residual de mango', 'residuo de despulpado'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'Lo que queda al despulpar o refinar: fibra con algo de pulpa.',
            vidas: [
              v('Fibra dietaria e ingredientes', 'MATERIAL', 'MEDIO', ['INGREDIENTES'], 'Se seca y muele para venderse como fibra a la industria de alimentos.', 'Secado rápido; sin fermentar; análisis del comprador.', 'POR_VALIDAR', 'INDUSTRIAL'),
              v('Alimento animal', 'MATERIAL', 'BAJO', ['ALIMENTO_ANIMAL'], 'Se entrega fresca o ensilada a criadores.', 'Sin fermentación avanzada.', 'REPORTADO', 'MYPE'),
              v('Compost', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se entrega a plantas de compost.', 'Mezcla con material seco.', 'PRACTICA_COMUN'),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'limon',
    sector: 'AGRO',
    nombre: 'Limón',
    zonas: ['Piura'],
    resumen: 'El limón se vende fresco o se procesa para jugo y aceite esencial; la cáscara y el bagazo tienen varias salidas.',
    etapas: [
      {
        id: 'seleccion',
        nombre: 'Selección y empaque',
        que: 'Se clasifica la fruta por tamaño, color y sanidad; el resto se aparta.',
        residuos: [
          {
            id: 'limon-descarte',
            nombre: 'Descarte de limón (fuera de calibre o con manchas)',
            sinonimos: ['limon de descarte', 'excedente de limon', 'limon sutil de descarte', 'limon industrial'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'Fruta que no entra a mercado fresco pero sirve para extraer jugo y aceite.',
            vidas: [
              v('Jugo y aceite esencial en plantas de proceso', 'PREVENIR', 'ALTO', ['REPROCESO_ALIMENTOS', 'INGREDIENTES'], 'Se vende a plantas que extraen jugo y aceite esencial; el acopiador gana por juntar volumen de varios productores.', 'Fruta sana; precio y fecha de recojo pactados con anticipación.', 'PRACTICA_COMUN'),
              v('Mercado local y jugueras', 'PREVENIR', 'MEDIO', ['MERCADO_LOCAL'], 'Venta directa de lo que no cumple la exportación.', 'Transporte corto.', 'PRACTICA_COMUN', 'MYPE'),
              v('Compost (mezclado con otro material)', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se entrega a plantas de compost.', 'Los cítricos son ácidos: mezclar con material seco.', 'PRACTICA_COMUN'),
            ],
          },
        ],
      },
      {
        id: 'proceso',
        nombre: 'Proceso (jugo y aceite esencial)',
        que: 'Se extraen jugo y aceite; queda la cáscara y el bagazo.',
        residuos: [
          {
            id: 'limon-cascara',
            nombre: 'Cáscara de limón y de cítricos',
            sinonimos: ['cascara de limon', 'cascara de naranja', 'cascara de mandarina', 'cascara de citrico', 'cascara de toronja'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'Rica en pectina, aceites aromáticos y fibra.',
            preparacion: 'Recogerla limpia, sin mezcla con bagazo, y secarla o refrigerarla pronto.',
            vidas: [
              v('Aceite esencial, pectina y fibra cítrica', 'MATERIAL', 'ALTO', ['INGREDIENTES'], 'Se vende a la industria de extractos y alimentos, que paga por la pectina y los aceites.', 'Cáscara limpia y fresca o seca; análisis del comprador; sin residuos de plaguicidas fuera de norma.', 'PRACTICA_COMUN', 'INDUSTRIAL'),
              v('Gomitas, mermeladas, jaleas y confitería', 'MATERIAL', 'MEDIO', ['ARTESANIA_MYPE'], 'Una MYPE aprovecha la pectina de la cáscara para dulces; es la base de varios emprendimientos locales.', 'Material de proceso limpio; registro sanitario de quien transforma.', 'REPORTADO', 'MYPE'),
              v('Cáscara deshidratada para infusiones y condimento', 'MATERIAL', 'MEDIO', ['ARTESANIA_MYPE'], 'Se seca y se vende como insumo de infusiones o sazonadores.', 'Secado higiénico y empaque; registro sanitario.', 'REPORTADO', 'MYPE'),
              v('Compost (mezclada)', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se entrega a plantas de compost.', 'Mezclar con material seco por su acidez.', 'PRACTICA_COMUN'),
            ],
          },
          {
            id: 'limon-bagazo',
            nombre: 'Bagazo de limón y de cítricos',
            sinonimos: ['bagazo de limon', 'bagazo de citrico', 'pulpa de limon', 'orujo de citrico'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'Pulpa, membranas y semillas que quedan tras extraer el jugo.',
            vidas: [
              v('Alimento animal (en mezcla)', 'MATERIAL', 'BAJO', ['ALIMENTO_ANIMAL'], 'Se entrega a criadores o a fábricas de balanceado; la pulpa cítrica seca es un insumo conocido en alimentación de rumiantes.', 'En mezcla, no como única ración; sin fermentación.', 'REPORTADO', 'MYPE'),
              v('Compost', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se entrega a plantas de compost.', 'Mezclar con material seco.', 'PRACTICA_COMUN'),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'uva',
    sector: 'AGRO',
    nombre: 'Uva de mesa',
    zonas: ['Piura', 'Ica'],
    resumen: 'La uva de mesa deja descarte de selección, raquis y sarmientos; el orujo solo existe donde hay vinificación.',
    etapas: [
      {
        id: 'campo',
        nombre: 'Campo y poda',
        que: 'Conducción de parras y poda de invierno.',
        residuos: [
          {
            id: 'uva-sarmientos',
            nombre: 'Sarmientos y poda de vid',
            sinonimos: ['poda de uva', 'sarmientos', 'ramas de vid', 'poda de parra'],
            categoria: 'BIOMASA',
            descripcion: 'Madera fina que sale cada campaña.',
            preparacion: 'Triturar y secar; no quemar en el campo.',
            vidas: [
              v('Compost y cobertura', 'MATERIAL', 'MEDIO', ['COMPOSTAJE'], 'Triturada vuelve al suelo o se vende a plantas de compost.', 'Triturada; sin restos de cintas y amarres plásticos.', 'PRACTICA_COMUN'),
              v('Biochar (carbón vegetal para el suelo)', 'MATERIAL', 'MEDIO', ['COMPOSTAJE'], 'Pirólisis controlada produce biochar que se vende como enmienda.', 'Exige horno de pirólisis y control de calidad.', 'REPORTADO', 'INDUSTRIAL'),
              v('Leña y pellets', 'ENERGIA', 'BAJO', ['ENERGIA'], 'Se vende seca a hornos y calderas.', 'Humedad baja.', 'PRACTICA_COMUN'),
            ],
          },
        ],
      },
      {
        id: 'seleccion',
        nombre: 'Selección y empaque',
        que: 'Se limpian los racimos y se descarta lo que no cumple.',
        residuos: [
          {
            id: 'uva-descarte',
            nombre: 'Descarte de uva (racimos y bayas)',
            sinonimos: ['uva de descarte', 'excedente de uva', 'bayas de uva'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'Racimos o bayas fuera de estándar; pierden calidad en horas.',
            vidas: [
              v('Jugo, mosto o pasas', 'PREVENIR', 'ALTO', ['REPROCESO_ALIMENTOS'], 'Se vende a plantas de jugo o deshidratado.', 'Fruta sana y entrega rápida.', 'REPORTADO'),
              v('Alimento animal (en mezcla)', 'MATERIAL', 'BAJO', ['ALIMENTO_ANIMAL'], 'Se entrega a criadores cercanos.', 'Sin fermentación; dosificada.', 'REPORTADO', 'MYPE'),
              v('Compost', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se entrega a plantas de compost.', 'Mezclar con material seco.', 'PRACTICA_COMUN'),
            ],
          },
          {
            id: 'uva-raquis',
            nombre: 'Raquis o escobajo de uva',
            sinonimos: ['escobajo', 'raquis', 'palito de uva', 'tallos de racimo'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'La estructura leñosa del racimo.',
            vidas: [
              v('Compost y cobertura', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se composta o se vende a plantas de compost.', 'Triturado para acelerar la degradación.', 'PRACTICA_COMUN'),
              v('Biomasa para energía', 'ENERGIA', 'BAJO', ['ENERGIA'], 'Se vende seco a calderas.', 'Humedad baja.', 'REPORTADO'),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'palta-arandano',
    sector: 'AGRO',
    nombre: 'Palta y arándano',
    zonas: ['Costa norte'],
    resumen: 'Cultivos de agroexportación con descarte de selección y residuos de campo; en arándano también hay sustrato agotado.',
    etapas: [
      {
        id: 'seleccion',
        nombre: 'Selección y empaque',
        que: 'Clasificación de fruta fresca para exportación.',
        residuos: [
          {
            id: 'palta-descarte',
            nombre: 'Descarte de palta',
            sinonimos: ['palta de descarte', 'aguacate de descarte', 'palta fuera de calibre'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'Fruta con manchas, golpes o fuera de calibre.',
            vidas: [
              v('Pulpa, guacamole o aceite de palta', 'PREVENIR', 'ALTO', ['REPROCESO_ALIMENTOS', 'INGREDIENTES'], 'Se vende a plantas que despulpan o extraen aceite; el descarte es una materia prima conocida para aceite de palta.', 'Fruta sana, madurez adecuada y entrega rápida.', 'REPORTADO'),
              v('Alimento animal', 'MATERIAL', 'BAJO', ['ALIMENTO_ANIMAL'], 'Se entrega a criadores.', 'Atención: la hoja y la semilla de palta pueden ser tóxicas para algunos animales; consultar a un técnico pecuario.', 'POR_VALIDAR', 'MYPE'),
              v('Compost', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se entrega a plantas de compost.', 'Mezclar con material seco.', 'PRACTICA_COMUN'),
            ],
          },
          {
            id: 'arandano-descarte',
            nombre: 'Descarte de arándano',
            sinonimos: ['arandano de descarte', 'blueberry de descarte', 'arandano fuera de estandar'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'Fruta blanda, pequeña o con daño que no pasa a exportación fresca.',
            vidas: [
              v('Jugo, congelado, deshidratado o ingredientes', 'PREVENIR', 'ALTO', ['REPROCESO_ALIMENTOS', 'INGREDIENTES'], 'Se vende a plantas de congelado o deshidratado y a elaboradores de jugos y mermeladas.', 'Fruta sana, refrigerada y entrega rápida; el comprador fija el grado de madurez.', 'REPORTADO'),
              v('Mermeladas y productos artesanales', 'PREVENIR', 'MEDIO', ['ARTESANIA_MYPE'], 'Una MYPE la transforma en mermeladas, salsas o deshidratados.', 'Registro sanitario de quien transforma.', 'REPORTADO', 'MYPE'),
              v('Compost', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se entrega a plantas de compost.', 'Mezclar con material seco.', 'PRACTICA_COMUN'),
            ],
          },
        ],
      },
      {
        id: 'campo',
        nombre: 'Campo, poda y sustratos',
        que: 'Manejo del cultivo y renovación de plantas y sustratos.',
        residuos: [
          {
            id: 'palta-semilla',
            nombre: 'Semilla y cáscara de palta',
            sinonimos: ['pepa de palta', 'hueso de palta', 'cascara de palta'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'Sale en plantas de pulpa y guacamole.',
            vidas: [
              v('Colorantes naturales y extractos', 'MATERIAL', 'MEDIO', ['INGREDIENTES', 'ARTESANIA_MYPE'], 'Se reportan tintes naturales y extractos a partir de semilla y cáscara.', 'Material seco y limpio; el comprador define la calidad.', 'REPORTADO', 'MYPE'),
              v('Compost', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se entrega triturada.', 'Triturar: la semilla entera tarda en degradarse.', 'PRACTICA_COMUN'),
              v('Combustible sólido seco', 'ENERGIA', 'BAJO', ['ENERGIA'], 'Se vende seca a hornos y calderas.', 'Humedad baja.', 'REPORTADO'),
            ],
          },
          {
            id: 'arandano-sustrato',
            nombre: 'Sustrato agotado de arándano (fibra de coco, turba, aserrín o corteza)',
            sinonimos: ['sustrato de arandano', 'fibra de coco usada', 'turba usada', 'sustrato agotado'],
            categoria: 'BIOMASA',
            descripcion: 'El medio de cultivo en macetas se renueva cada cierto número de campañas.',
            preparacion: 'Retirar plásticos, mangueras y raíces gruesas.',
            vidas: [
              v('Mejorador de suelo y cobertura', 'MATERIAL', 'MEDIO', ['COMPOSTAJE'], 'Se vende o se regala a agricultores que lo usan como cobertura o mejorador.', 'Sin sales excesivas ni enfermedades; el agricultor puede pedir un análisis.', 'REPORTADO'),
              v('Compost (mezclado)', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se entrega a plantas de compost.', 'Limpio de plástico.', 'REPORTADO'),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'banano',
    sector: 'AGRO',
    nombre: 'Banano orgánico',
    zonas: ['Piura', 'Tumbes'],
    resumen: 'El banano deja rechazo de empaque, raquis, pseudotallo y plástico de protección de racimos.',
    etapas: [
      {
        id: 'campo',
        nombre: 'Campo y cosecha',
        que: 'Cosecha de racimos y renovación de plantas.',
        residuos: [
          {
            id: 'banano-pseudotallo',
            nombre: 'Pseudotallo, hojas y raquis del banano',
            sinonimos: ['pseudotallo', 'raquis de banano', 'tallo de platano', 'hojas de banano', 'rastrojo de banano', 'vástago'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'Material fibroso y húmedo que queda tras cosechar el racimo.',
            preparacion: 'Picar para acelerar la degradación; separar el raquis del resto.',
            vidas: [
              v('Fibra para artesanía y papel artesanal', 'MATERIAL', 'MEDIO', ['ARTESANIA_MYPE'], 'Una MYPE extrae la fibra del pseudotallo para cuerdas, papel y artesanías.', 'Fibra lavada y seca; volumen estable; mano de obra.', 'REPORTADO', 'MYPE'),
              v('Compost y abono orgánico', 'MATERIAL', 'MEDIO', ['COMPOSTAJE'], 'Se composta en finca o se vende a plantas de abonos.', 'Picado; mezclado con material seco por su humedad.', 'PRACTICA_COMUN'),
              v('Biomasa para energía', 'ENERGIA', 'BAJO', ['ENERGIA'], 'Solo si se seca; su humedad es alta.', 'Humedad baja; poco rendimiento energético.', 'POR_VALIDAR', 'INDUSTRIAL'),
            ],
          },
        ],
      },
      {
        id: 'empaque',
        nombre: 'Empaque y despacho',
        que: 'Los racimos se lavan, se clasifican y se embalan.',
        residuos: [
          {
            id: 'banano-rechazo',
            nombre: 'Banano de rechazo',
            sinonimos: ['platano de rechazo', 'banano de descarte', 'banano fuera de calibre', 'banano de segunda'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'Dedos o manos con curvatura, tamaño o manchas fuera de la norma del comprador.',
            vidas: [
              v('Puré, harina, chifles y deshidratado', 'PREVENIR', 'ALTO', ['REPROCESO_ALIMENTOS', 'ARTESANIA_MYPE'], 'Se vende a plantas de puré o a MYPE que hacen harina, chifles u hojuelas.', 'Fruta sana; entrega rápida; registro sanitario de quien procesa.', 'PRACTICA_COMUN', 'MYPE'),
              v('Alimento para cerdos, cuyes y ganado', 'MATERIAL', 'BAJO', ['ALIMENTO_ANIMAL'], 'Se entrega a criadores cercanos.', 'Sin fermentación; dosificado.', 'PRACTICA_COMUN', 'MYPE'),
              v('Compost y biogás', 'MATERIAL', 'BAJO', ['COMPOSTAJE', 'ENERGIA'], 'Se composta; con volúmenes grandes puede alimentar un biodigestor.', 'Mezclar con material seco.', 'PRACTICA_COMUN'),
            ],
          },
          {
            id: 'banano-bolsas',
            nombre: 'Bolsas, cintas y plástico de protección de racimos',
            sinonimos: ['bolsas de banano', 'film agricola de banano', 'plastico de racimo', 'cintas de banano'],
            categoria: 'PLASTICO_FILM',
            descripcion: 'Polietileno que protege los racimos en el campo; sale sucio y con tierra.',
            preparacion: 'Sacudir la tierra, secar y agrupar por tipo; no mezclar con cintas de otro material.',
            vidas: [
              v('Reciclaje de film agrícola', 'MATERIAL', 'BAJO', ['RECICLADO_MATERIAL'], 'Se vende por kilo a recicladoras de film; el precio sube si llega limpio y seco.', 'Limpio, seco y sin tierra; sin envases de agroquímicos mezclados.', 'PRACTICA_COMUN'),
              v('Gestión autorizada si estuvo impregnado de agroquímicos', 'DISPOSICION', 'COSTO', ['GESTOR_AUTORIZADO'], 'Es un costo de manejo; conviene prevenirlo separando bien el plástico.', 'Operador autorizado y constancia de entrega.', 'PRACTICA_COMUN'),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'cacao',
    sector: 'AGRO',
    nombre: 'Cacao',
    zonas: ['Piura', 'Tumbes'],
    resumen: 'El grano es una fracción pequeña de la mazorca: la cáscara, el mucílago y la cascarilla son flujos con varias salidas.',
    etapas: [
      {
        id: 'poscosecha',
        nombre: 'Poscosecha (desgrane y fermentación)',
        que: 'Se abren las mazorcas, se extrae el grano con su mucílago y se fermenta.',
        residuos: [
          {
            id: 'cacao-cascara',
            nombre: 'Cáscara de la mazorca de cacao',
            sinonimos: ['cascara de cacao', 'mazorca de cacao', 'cascara de mazorca'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'Es la mayor parte del peso de la mazorca y suele quedar en el campo; es rica en potasio.',
            preparacion: 'Picar la cáscara para acelerar su degradación y evitar focos de enfermedades.',
            vidas: [
              v('Compost y abono (rico en potasio)', 'MATERIAL', 'MEDIO', ['COMPOSTAJE'], 'Se composta en la finca o se vende a plantas de abonos.', 'Picada; mezclada con material seco.', 'PRACTICA_COMUN'),
              v('Alimento animal (dosificado)', 'MATERIAL', 'BAJO', ['ALIMENTO_ANIMAL'], 'Se seca y se muele para mezclas de rumiantes.', 'Contiene teobromina: dosificar con asesoría pecuaria.', 'REPORTADO', 'MYPE'),
              v('Harina, pectina y extractos', 'MATERIAL', 'MEDIO', ['INGREDIENTES', 'ARTESANIA_MYPE'], 'Se reportan harinas y extracción de pectina a partir de la cáscara.', 'Secado higiénico; el comprador define la calidad.', 'REPORTADO', 'INDUSTRIAL'),
              v('Biochar y ceniza (potasa)', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Quemada de forma controlada produce una ceniza rica en potasio, usada en jabones y abonos.', 'Pirólisis o quema controlada; no a cielo abierto.', 'REPORTADO', 'MYPE'),
            ],
          },
          {
            id: 'cacao-mucilago',
            nombre: 'Mucílago o baba del cacao',
            sinonimos: ['baba de cacao', 'pulpa de cacao', 'mucilago de cacao', 'jugo de cacao'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'La pulpa azucarada que rodea el grano; escurre durante la fermentación.',
            preparacion: 'Recogerla limpia y fresca, antes de la fermentación, con envases de acero inoxidable o plástico alimentario.',
            preguntas: ['¿Se recoge antes de que fermente, con envases limpios?'],
            vidas: [
              v('Jugo, mermelada, bebidas y destilados', 'PREVENIR', 'ALTO', ['ARTESANIA_MYPE', 'REPROCESO_ALIMENTOS'], 'Una MYPE o cooperativa la vende como jugo, bebida fermentada o mermelada; es un ingrediente reconocido de varios emprendimientos.', 'Recogida higiénica y refrigerada; registro sanitario.', 'REPORTADO', 'MYPE'),
              v('Vinagre o fermentados', 'MATERIAL', 'MEDIO', ['ARTESANIA_MYPE'], 'Se fermenta para vinagre u otros productos.', 'Proceso controlado y registro sanitario.', 'POR_VALIDAR', 'MYPE'),
            ],
          },
        ],
      },
      {
        id: 'proceso',
        nombre: 'Tostado y transformación',
        que: 'El grano se tuesta, se descascarilla y se transforma en pasta, manteca o chocolate.',
        residuos: [
          {
            id: 'cacao-cascarilla',
            nombre: 'Cascarilla del grano de cacao',
            sinonimos: ['cascarilla de cacao', 'cascara de grano de cacao', 'cascarilla tostada'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'La cubierta fina que se retira al descascarillar el grano tostado.',
            vidas: [
              v('Infusión y té de cascarilla', 'PREVENIR', 'MEDIO', ['ARTESANIA_MYPE'], 'Se vende a MYPE que la empacan como infusión.', 'Limpia, seca y de procesos con inocuidad; registro sanitario.', 'REPORTADO', 'MYPE'),
              v('Cobertura (mulch) y compost', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se entrega a agricultores y viveros.', 'Limpia, sin impurezas.', 'PRACTICA_COMUN'),
              v('Combustible sólido', 'ENERGIA', 'BAJO', ['ENERGIA'], 'Se vende seca a hornos y calderas.', 'Humedad baja.', 'REPORTADO'),
            ],
          },
          {
            id: 'cacao-grano-defectuoso',
            nombre: 'Grano de cacao partido, pizarroso o defectuoso',
            sinonimos: ['cacao de descarte', 'grano partido', 'cacao pizarroso', 'grano de segunda'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'No cumple el estándar de calidad para chocolate fino.',
            vidas: [
              v('Pasta o manteca de calidad industrial', 'PREVENIR', 'MEDIO', ['INGREDIENTES'], 'Se vende a industrias que aceptan un grado de calidad menor.', 'Libre de moho; el comprador fija los defectos permitidos.', 'POR_VALIDAR'),
              v('Compost', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Solo si está enmohecido o fuera de uso alimentario.', 'Descartar el grano con moho: no debe mezclarse con alimento.', 'PRACTICA_COMUN'),
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────── AGROINDUSTRIA ─────────────────────────
  {
    id: 'arroz',
    sector: 'AGROINDUSTRIA',
    nombre: 'Arroz',
    zonas: ['Piura', 'Lambayeque', 'San Martín'],
    resumen: 'El molino separa cascarilla, polvillo, arrocillo y salvado; cada uno tiene compradores propios.',
    etapas: [
      {
        id: 'campo',
        nombre: 'Campo y cosecha',
        que: 'Siembra, cosecha y trilla.',
        residuos: [
          {
            id: 'arroz-paja',
            nombre: 'Paja de arroz',
            sinonimos: ['paja de arroz', 'rastrojo de arroz', 'tamo de arroz'],
            categoria: 'BIOMASA',
            descripcion: 'El rastrojo que queda en el campo tras la cosecha; su quema es una fuente de contaminación.',
            preparacion: 'Empacar en fardos y almacenar en seco.',
            vidas: [
              v('Forraje y alimento para rumiantes (tratada)', 'MATERIAL', 'BAJO', ['ALIMENTO_ANIMAL'], 'Se vende en fardos a criadores, sobre todo en época de falta de pasto.', 'Seca y sin moho; el valor nutritivo es bajo: se usa en mezcla.', 'PRACTICA_COMUN', 'MYPE'),
              v('Cobertura, cama y compost', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se vende para cobertura de cultivos o cama.', 'Seca; sin plaguicidas fuera de norma.', 'PRACTICA_COMUN'),
              v('Pellets y combustible', 'ENERGIA', 'BAJO', ['ENERGIA'], 'Se compacta como biomasa para calderas.', 'Empaque en fardos y transporte barato: su baja densidad encarece el flete.', 'REPORTADO', 'INDUSTRIAL'),
            ],
          },
        ],
      },
      {
        id: 'molino',
        nombre: 'Molino y pilado',
        que: 'Se retira la cascarilla, se pule el grano y se separan los subproductos.',
        residuos: [
          {
            id: 'arroz-cascarilla',
            nombre: 'Cascarilla de arroz',
            sinonimos: ['cascarilla', 'cascara de arroz', 'ceniza de cascarilla'],
            categoria: 'BIOMASA',
            descripcion: 'La cubierta del grano: es el subproducto más voluminoso del molino y tiene varias salidas.',
            preparacion: 'Mantenerla seca y limpia de polvillo; no mezclarla con otros residuos.',
            vidas: [
              v('Cama para aves y animales', 'REUSO', 'MEDIO', ['ALIMENTO_ANIMAL'], 'Se vende por volumen a granjas avícolas y de cuyes; después de usarse puede ir a compost.', 'Seca y sin moho.', 'PRACTICA_COMUN', 'MYPE'),
              v('Sustrato de vivero y enmienda (carbonizada o cruda)', 'MATERIAL', 'MEDIO', ['COMPOSTAJE'], 'Se vende a viveros y agricultores; carbonizada se vende como biochar.', 'Limpia; el biochar exige pirólisis controlada.', 'PRACTICA_COMUN'),
              v('Ceniza de cascarilla para construcción', 'MATERIAL', 'MEDIO', ['CONSTRUCCION'], 'La ceniza, rica en sílice, se estudia como adición para concreto y ladrillos.', 'Quema controlada y ensayos del constructor.', 'REPORTADO', 'INDUSTRIAL'),
              v('Combustible para calderas, hornos y pellets', 'ENERGIA', 'MEDIO', ['ENERGIA'], 'El propio molino la usa en sus calderas o la vende a ladrilleras y secadoras.', 'Humedad menor a 15-20 %; el transporte la hace rentable a corta distancia.', 'PRACTICA_COMUN'),
            ],
          },
          {
            id: 'arroz-polvillo',
            nombre: 'Polvillo y salvado de arroz',
            sinonimos: ['polvillo de arroz', 'salvado de arroz', 'afrecho de arroz', 'afrechillo'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'La capa externa del grano que se retira al pulir.',
            vidas: [
              v('Alimento balanceado para animales', 'PREVENIR', 'MEDIO', ['ALIMENTO_ANIMAL'], 'Se vende a fábricas de balanceado y a criadores; es un insumo energético conocido.', 'Seco; sin rancidez ni moho; humedad controlada.', 'PRACTICA_COMUN'),
              v('Aceite de salvado y harinas funcionales', 'MATERIAL', 'ALTO', ['INGREDIENTES'], 'Se vende a quien extrae aceite o estabiliza el salvado para alimentos.', 'Estabilizar el salvado para evitar rancidez; solo para escalas grandes.', 'REPORTADO', 'INDUSTRIAL'),
            ],
          },
          {
            id: 'arroz-arrocillo',
            nombre: 'Arrocillo y grano partido',
            sinonimos: ['arrocillo', 'arroz partido', 'arroz quebrado', 'grano quebrado'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'Granos quebrados que salen del pilado.',
            vidas: [
              v('Harina de arroz y alimentos', 'PREVENIR', 'ALTO', ['REPROCESO_ALIMENTOS', 'ARTESANIA_MYPE'], 'Se vende a quien muele harina, a cervecerías y a fábricas de alimentos.', 'Limpio y seco; trazabilidad.', 'PRACTICA_COMUN'),
              v('Alimento animal', 'PREVENIR', 'MEDIO', ['ALIMENTO_ANIMAL'], 'Se vende a criadores y fábricas de balanceado.', 'Sin moho.', 'PRACTICA_COMUN', 'MYPE'),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'cana',
    sector: 'AGROINDUSTRIA',
    nombre: 'Caña de azúcar',
    zonas: ['Lambayeque', 'La Libertad', 'Piura'],
    resumen: 'El ingenio genera bagazo, cachaza y melaza en grandes volúmenes: son subproductos con mercados establecidos.',
    etapas: [
      {
        id: 'campo',
        nombre: 'Campo y cosecha',
        que: 'Cosecha de caña y recojo de hojas y cogollo.',
        residuos: [
          {
            id: 'cana-hojas',
            nombre: 'Hojas y cogollo de la caña',
            sinonimos: ['cogollo de cana', 'hojas de cana', 'paja de cana', 'trash de cana'],
            categoria: 'BIOMASA',
            descripcion: 'La parte alta y las hojas que quedan en el campo tras la cosecha.',
            vidas: [
              v('Forraje para ganado', 'PREVENIR', 'MEDIO', ['ALIMENTO_ANIMAL'], 'El cogollo fresco se vende a criadores de ganado.', 'Fresco y sin quema previa.', 'PRACTICA_COMUN', 'MYPE'),
              v('Cobertura del suelo y compost', 'MATERIAL', 'MEDIO', ['COMPOSTAJE'], 'Dejada en el campo conserva humedad y aporta materia orgánica.', 'Sin quema; evita compactación.', 'PRACTICA_COMUN'),
              v('Biomasa para cogeneración', 'ENERGIA', 'BAJO', ['ENERGIA'], 'Empacada puede complementar al bagazo en calderas.', 'Costo de recolección y transporte alto.', 'REPORTADO', 'INDUSTRIAL'),
            ],
          },
        ],
      },
      {
        id: 'ingenio',
        nombre: 'Ingenio (molienda y refinería)',
        que: 'Se extrae el jugo, se clarifica y se cristaliza el azúcar.',
        residuos: [
          {
            id: 'cana-bagazo',
            nombre: 'Bagazo de caña',
            sinonimos: ['bagazo', 'bagazo de cana', 'fibra de cana'],
            categoria: 'BIOMASA',
            descripcion: 'La fibra que queda tras extraer el jugo: es el subproducto más voluminoso del ingenio.',
            vidas: [
              v('Papel, cartón, tableros y vajilla compostable', 'MATERIAL', 'ALTO', ['INGREDIENTES', 'RECICLADO_MATERIAL'], 'Se vende a fábricas de pulpa, tableros y envases compostables.', 'Volumen y calidad constantes; fibra limpia.', 'REPORTADO', 'INDUSTRIAL'),
              v('Compost y sustratos', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Mezclado con cachaza produce compost.', 'Mezcla con material nitrogenado.', 'PRACTICA_COMUN'),
              v('Combustible de calderas y cogeneración', 'ENERGIA', 'MEDIO', ['ENERGIA'], 'Es el uso más extendido: el propio ingenio genera vapor y electricidad.', 'Humedad y poder calorífico controlados.', 'PRACTICA_COMUN', 'INDUSTRIAL'),
            ],
          },
          {
            id: 'cana-cachaza',
            nombre: 'Cachaza (torta de filtro)',
            sinonimos: ['cachaza', 'torta de filtro', 'cachaza de cana'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'Lodo que sale al filtrar el jugo; rico en materia orgánica y fósforo.',
            vidas: [
              v('Compost y fertilizante orgánico', 'MATERIAL', 'MEDIO', ['COMPOSTAJE'], 'Se vende o se devuelve a los cañaverales y a agricultores cercanos.', 'Madurada o compostada; evita olor y moscas.', 'PRACTICA_COMUN'),
              v('Alimento animal (en mezcla)', 'MATERIAL', 'BAJO', ['ALIMENTO_ANIMAL'], 'Se reporta su uso en mezcla para rumiantes.', 'Dosificada y con asesoría.', 'REPORTADO', 'MYPE'),
            ],
          },
          {
            id: 'cana-melaza',
            nombre: 'Melaza',
            sinonimos: ['melaza de cana', 'miel de cana', 'miel final'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'Jarabe residual de la cristalización del azúcar.',
            vidas: [
              v('Complemento energético para alimento animal', 'PREVENIR', 'MEDIO', ['ALIMENTO_ANIMAL'], 'Se vende a fábricas de balanceado y a criadores.', 'Transporte en cisterna o tambores.', 'PRACTICA_COMUN'),
              v('Alcohol, etanol y licores', 'MATERIAL', 'ALTO', ['INGREDIENTES'], 'Se vende a destilerías para etanol y alcohol.', 'Contenido de azúcares; contrato por temporada.', 'PRACTICA_COMUN', 'INDUSTRIAL'),
              v('Levaduras, fermentos y ácidos orgánicos', 'MATERIAL', 'MEDIO', ['INGREDIENTES'], 'Insumo de fermentaciones industriales.', 'Escala industrial y contrato.', 'REPORTADO', 'INDUSTRIAL'),
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────── PESCA ─────────────────────────
  {
    id: 'concha-abanico',
    sector: 'PESCA',
    nombre: 'Concha de abanico',
    zonas: ['Piura (Sechura)'],
    resumen: 'Sechura concentra buena parte de la producción nacional; por cada kilo de carne queda mucho más peso en valvas.',
    etapas: [
      {
        id: 'desembarque',
        nombre: 'Cosecha y desembarque',
        que: 'La concha llega entera a las plantas.',
        residuos: [
          {
            id: 'concha-valvas',
            nombre: 'Conchas o valvas de concha de abanico',
            sinonimos: ['valvas', 'conchas de abanico', 'concha de abanico', 'cascara de concha'],
            categoria: 'PESCA_MARISCOS',
            descripcion: 'Las valvas pesan mucho más que la carne y suelen acumularse en pilas.',
            preparacion: 'Lavar y secar para quitar sales y materia orgánica; separar de las vísceras.',
            vidas: [
              v('Artesanía y decoración', 'REUSO', 'MEDIO', ['ARTESANIA_MYPE'], 'Artesanos las usan para joyería, lámparas y decoración; es una salida de bajo volumen y buen margen.', 'Limpias y secas.', 'PRACTICA_COMUN', 'MYPE'),
              v('Concreto permeable, asfalto, ladrillos y agregados', 'MATERIAL', 'MEDIO', ['CONSTRUCCION'], 'Se vende triturada a constructoras; la UDEP probó concreto permeable con 10 % de concha y la USIL, asfalto con conchas.', 'Lavadas, secas y trituradas; ensayos del constructor.', 'REPORTADO', 'INDUSTRIAL'),
              v('Cal y carbonato de calcio (agrícola y avícola)', 'MATERIAL', 'MEDIO', ['COMPOSTAJE', 'ALIMENTO_ANIMAL'], 'Molidas se venden como enmienda de suelos ácidos y suplemento de calcio.', 'Molienda fina y control de sales y metales; para alimento animal exige análisis.', 'REPORTADO', 'INDUSTRIAL'),
              v('Filtros y tratamiento de agua', 'MATERIAL', 'BAJO', ['INGREDIENTES'], 'Se han ensayado pellets de concha para tratamiento de agua.', 'Aún en ensayo.', 'POR_VALIDAR', 'INDUSTRIAL'),
            ],
          },
        ],
      },
      {
        id: 'planta',
        nombre: 'Planta de proceso',
        que: 'Se separa la carne, el coral y las vísceras.',
        residuos: [
          {
            id: 'concha-visceras',
            nombre: 'Vísceras y partes no comestibles de concha de abanico',
            sinonimos: ['visceras de concha', 'residuos de concha', 'manto de concha'],
            categoria: 'PESCA_MARISCOS',
            descripcion: 'Perecen en horas y tienen olor fuerte; deben manejarse con frío.',
            preparacion: 'Mantener refrigeradas y entregar el mismo día.',
            vidas: [
              v('Harina, ensilado o hidrolizado para alimento animal o acuícola', 'MATERIAL', 'MEDIO', ['PLANTA_HARINAS', 'ALIMENTO_ANIMAL'], 'Se vende a plantas de harina o ensilado.', 'Frío y entrega rápida; control sanitario del subproducto.', 'REPORTADO', 'INDUSTRIAL'),
              v('Compost y fertilizante líquido', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se composta con material seco o se hidroliza.', 'Control de olor y lixiviados.', 'REPORTADO'),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'pesca-crustaceos',
    sector: 'PESCA',
    nombre: 'Langostino, pota y pescado',
    zonas: ['Tumbes', 'Piura (Paita)'],
    resumen: 'Los subproductos pesqueros pierden valor en horas: la cadena de frío y la rapidez de entrega mandan.',
    etapas: [
      {
        id: 'proceso',
        nombre: 'Planta de proceso',
        que: 'Eviscerado, descabezado, pelado y fileteado.',
        residuos: [
          {
            id: 'langostino-cascara',
            nombre: 'Cabezas y cáscara de langostino',
            sinonimos: ['cabezas de langostino', 'cascara de langostino', 'camaron', 'residuos de crustaceo'],
            categoria: 'PESCA_MARISCOS',
            descripcion: 'Concentra quitina, proteína y pigmentos (astaxantina).',
            preparacion: 'Refrigerar o congelar inmediatamente.',
            vidas: [
              v('Harina de crustáceo para alimento acuícola y animal', 'MATERIAL', 'MEDIO', ['PLANTA_HARINAS'], 'Se vende a plantas de harina; aporta proteína y pigmentos.', 'Frío continuo y control sanitario.', 'REPORTADO', 'INDUSTRIAL'),
              v('Quitina, quitosano y astaxantina', 'MATERIAL', 'ALTO', ['INGREDIENTES'], 'Se vende a la industria de extractos; el valor por kilo es el más alto de la cadena.', 'Escala industrial y extracción especializada.', 'REPORTADO', 'INDUSTRIAL'),
              v('Compost y fertilizante', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se composta con material seco.', 'Control de olor.', 'REPORTADO'),
            ],
          },
          {
            id: 'pota-subproductos',
            nombre: 'Piel, vísceras y recortes de pota',
            sinonimos: ['residuos de pota', 'piel de pota', 'visceras de pota', 'calamar gigante', 'recortes de pota'],
            categoria: 'PESCA_MARISCOS',
            descripcion: 'Residuos de la pota procesada para exportación.',
            preparacion: 'Mantener en frío; separar las partes aprovechables.',
            vidas: [
              v('Harina, ensilado e hidrolizados', 'MATERIAL', 'MEDIO', ['PLANTA_HARINAS'], 'Se vende a plantas de harina, ensilado o hidrolizados.', 'Frío y entrega rápida.', 'REPORTADO', 'INDUSTRIAL'),
              v('Alimento animal o acuícola', 'MATERIAL', 'MEDIO', ['ALIMENTO_ANIMAL'], 'Se entrega a fábricas de alimento.', 'Control sanitario.', 'REPORTADO'),
              v('Fertilizante orgánico', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Hidrolizado o compostado.', 'Control de olor.', 'REPORTADO'),
            ],
          },
          {
            id: 'pescado-subproductos',
            nombre: 'Cabezas, espinas y vísceras de pescado',
            sinonimos: ['cabezas de pescado', 'espinas de pescado', 'visceras de pescado', 'recortes de pescado', 'residuos de pescado', 'descarte de pescado'],
            categoria: 'PESCA_MARISCOS',
            descripcion: 'Subproductos del fileteado y eviscerado.',
            vidas: [
              v('Harina y aceite de pescado', 'MATERIAL', 'MEDIO', ['PLANTA_HARINAS'], 'Se vende a plantas de harina y aceite; es el uso más establecido.', 'Frescura y cadena de frío.', 'PRACTICA_COMUN', 'INDUSTRIAL'),
              v('Ensilado y alimento para animales', 'MATERIAL', 'BAJO', ['ALIMENTO_ANIMAL', 'PLANTA_HARINAS'], 'Se ensila con ácidos y se entrega a criadores.', 'Control sanitario.', 'REPORTADO', 'MYPE'),
              v('Colágeno e hidrolizados', 'MATERIAL', 'ALTO', ['INGREDIENTES'], 'Piel y escamas se aprovechan para colágeno y gelatina.', 'Proceso especializado.', 'REPORTADO', 'INDUSTRIAL'),
              v('Compost', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se composta con material seco.', 'Control de olor y lixiviados.', 'PRACTICA_COMUN'),
            ],
          },
          {
            id: 'redes-pesca',
            nombre: 'Redes y cabos de pesca en desuso',
            sinonimos: ['redes de pesca', 'redes viejas', 'nylon de pesca', 'cabos'],
            categoria: 'PLASTICO_MIXTO',
            descripcion: 'Redes de nylon o polietileno retiradas por desgaste.',
            vidas: [
              v('Artesanía y objetos', 'REUSO', 'BAJO', ['ARTESANIA_MYPE'], 'Se usan en artesanías y accesorios.', 'Limpias.', 'REPORTADO', 'MYPE'),
              v('Reciclaje de nylon y polietileno', 'MATERIAL', 'MEDIO', ['RECICLADO_MATERIAL'], 'Algunos programas internacionales compran redes para convertirlas en fibras y objetos.', 'Limpias, sin metales ni lastres.', 'REPORTADO'),
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────── TEXTIL ─────────────────────────
  {
    id: 'algodon-textil',
    sector: 'TEXTIL',
    nombre: 'Algodón y textil',
    zonas: ['Piura', 'Lima'],
    resumen: 'Desde la desmotadora hasta la confección salen semillas, fibras cortas, hilos y retazos con salidas diversas.',
    etapas: [
      {
        id: 'desmotado',
        nombre: 'Campo y desmotado',
        que: 'Se cosecha el algodón y se separa la fibra de la semilla.',
        residuos: [
          {
            id: 'algodon-semilla',
            nombre: 'Semilla de algodón y residuos de desmotado',
            sinonimos: ['semilla de algodon', 'motas', 'linter', 'borra de algodon', 'residuo de desmotado'],
            categoria: 'ORGANICO_AGRO',
            descripcion: 'Semilla con restos de fibra corta (linter) y motas.',
            vidas: [
              v('Aceite y torta para alimento animal', 'PREVENIR', 'ALTO', ['ALIMENTO_ANIMAL', 'INGREDIENTES'], 'Se vende a aceiteras y fábricas de alimento; es una cadena establecida.', 'Cumplir límites de gosipol y plaguicidas.', 'PRACTICA_COMUN', 'INDUSTRIAL'),
              v('Linter y celulosa', 'MATERIAL', 'MEDIO', ['INGREDIENTES'], 'La fibra corta es materia prima de celulosa y papeles.', 'Escala industrial.', 'REPORTADO', 'INDUSTRIAL'),
              v('Compost', 'MATERIAL', 'BAJO', ['COMPOSTAJE'], 'Se composta en la desmotadora o se entrega a plantas de compost cercanas.', 'Mezclar con material seco.', 'PRACTICA_COMUN'),
            ],
          },
        ],
      },
      {
        id: 'confeccion',
        nombre: 'Hilandería y confección',
        que: 'Se hila, teje y corta la tela; salen retazos, hilos y conos.',
        residuos: [
          {
            id: 'textil-retazos',
            nombre: 'Retazos y recortes de tela',
            sinonimos: ['retazos', 'recortes de tela', 'merma textil', 'retazo de algodon', 'sobrantes de tela', 'trapos'],
            categoria: 'TEXTIL',
            descripcion: 'Sobrantes de corte y confección.',
            preparacion: 'Separar por fibra (algodón o sintético), color y tamaño; mantener seco.',
            vidas: [
              v('Artesanía, accesorios y patchwork', 'REUSO', 'MEDIO', ['ARTESANIA_MYPE'], 'Talleres y artesanas los compran por kilo para accesorios, bolsas y patchwork.', 'Separados por color y tamaño.', 'PRACTICA_COMUN', 'MYPE'),
              v('Trapos industriales', 'REUSO', 'BAJO', ['RECICLADO_MATERIAL'], 'Algodón absorbente se vende para limpieza industrial.', 'Algodón sin aceites ni químicos.', 'PRACTICA_COMUN'),
              v('Relleno de cojines, almohadas y aislantes', 'MATERIAL', 'BAJO', ['ARTESANIA_MYPE', 'RECICLADO_MATERIAL'], 'Se vende por kilo a fábricas de colchones y cojines.', 'Limpios y secos; sin químicos de teñido.', 'PRACTICA_COMUN', 'MYPE'),
              v('Hilado reciclado y fibra regenerada', 'MATERIAL', 'ALTO', ['RECICLADO_MATERIAL'], 'Se desfibra y se vuelve a hilar; el valor sube si el material es de un solo tipo de fibra.', 'Separado por fibra; escala industrial.', 'REPORTADO', 'INDUSTRIAL'),
            ],
          },
          {
            id: 'textil-hilos',
            nombre: 'Mermas de hilo, borra y conos',
            sinonimos: ['mermas de hilo', 'hilos', 'borra', 'conos de hilo', 'conos de cartón', 'desperdicio de hilanderia'],
            categoria: 'TEXTIL',
            descripcion: 'Fibra corta y restos de hilo; los conos vacíos son de cartón o plástico.',
            vidas: [
              v('Hilado open-end y relleno', 'MATERIAL', 'MEDIO', ['RECICLADO_MATERIAL'], 'La fibra corta se reutiliza en hilados gruesos y en relleno.', 'Separada por tipo de fibra.', 'PRACTICA_COMUN', 'INDUSTRIAL'),
              v('Reciclaje de conos de cartón o plástico', 'MATERIAL', 'BAJO', ['RECICLADO_MATERIAL'], 'Se vende por kilo a recicladoras de cartón y plástico.', 'Limpios.', 'PRACTICA_COMUN'),
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────── TRANSVERSAL ─────────────────────────
  {
    id: 'empaques-y-apoyo',
    sector: 'OTRO',
    nombre: 'Empaques y materiales de apoyo (todos los sectores)',
    zonas: ['Norte del Perú'],
    resumen: 'Plástico, cartón, madera, metal y aceites aparecen en toda cadena; separarlos bien es lo que más sube su precio.',
    etapas: [
      {
        id: 'plasticos',
        nombre: 'Plásticos y empaques',
        que: 'Envases, film, sacos, jabas y botellas.',
        residuos: [
          {
            id: 'plastico-pead',
            nombre: 'Bidones y envases de PEAD',
            sinonimos: ['bidones', 'bidones de pead', 'envases pead', 'hdpe', 'tapas azules', 'baldes'],
            categoria: 'PLASTICO_PEAD',
            descripcion: 'Bidones, baldes y cajas rígidas de polietileno de alta densidad.',
            preparacion: 'Enjuagar, escurrir y separar por color; retirar tapas de otro material.',
            preguntas: ['¿Qué contuvo? Un envase de agroquímicos no se reutiliza ni se recicla como uno de alimentos.'],
            vidas: [
              v('Reúso del envase (almacenaje no alimentario)', 'REUSO', 'MEDIO', ['MERCADO_LOCAL', 'ARTESANIA_MYPE'], 'Se vende limpio a quien necesita almacenar agua no potable, sólidos o insumos.', 'Que no haya contenido químicos peligrosos.', 'PRACTICA_COMUN', 'MYPE'),
              v('Reciclaje mecánico a granza', 'MATERIAL', 'MEDIO', ['RECICLADO_MATERIAL'], 'Se vende por kilo a recicladoras; el precio sube separado por color y limpio.', 'Limpio, sin tapas de otro polímero y sin contaminantes.', 'PRACTICA_COMUN'),
            ],
          },
          {
            id: 'envases-agroquimicos',
            nombre: 'Envases vacíos de agroquímicos',
            sinonimos: ['envases de plaguicidas', 'envases de pesticidas', 'envases de agroquimicos', 'envases de fertilizantes', 'frascos de agroquimicos'],
            categoria: 'OTROS',
            descripcion: 'Residuos peligrosos: no tienen una vida comercial segura.',
            preparacion: 'Triple lavado en el momento del uso, perforar para evitar su reúso y guardar bajo techo.',
            vidas: [
              v('Entrega a un operador autorizado', 'DISPOSICION', 'COSTO', ['GESTOR_AUTORIZADO'], 'Es un costo de manejo; los programas de recojo de envases de agroquímicos suelen ser la vía.', 'Operador con autorización vigente y constancia de entrega. Verificar la normativa vigente.', 'PRACTICA_COMUN'),
            ],
          },
          {
            id: 'plastico-film',
            nombre: 'Film, stretch y bolsas de polietileno',
            sinonimos: ['film', 'stretch', 'bolsas plasticas', 'ldpe', 'polietileno', 'plastico de invernadero', 'film agricola'],
            categoria: 'PLASTICO_FILM',
            descripcion: 'Embalaje flexible y cobertura agrícola.',
            preparacion: 'Mantener seco y sin tierra; separar el film transparente del de color.',
            vidas: [
              v('Reciclaje de film', 'MATERIAL', 'BAJO', ['RECICLADO_MATERIAL'], 'Se vende por kilo; el film limpio paga mejor.', 'Seco, limpio y sin mezclar con otros plásticos.', 'PRACTICA_COMUN'),
              v('Combustible de última opción', 'ENERGIA', 'BAJO', ['ENERGIA'], 'Solo si no hay quién lo recicle y con un operador autorizado.', 'No debe quemarse a cielo abierto.', 'POR_VALIDAR', 'INDUSTRIAL'),
            ],
          },
          {
            id: 'plastico-big-bags',
            nombre: 'Big bags y sacos de polipropileno',
            sinonimos: ['big bag', 'sacos de polipropileno', 'sacos de rafia', 'sacos pp', 'bolsones'],
            categoria: 'PLASTICO_PP',
            descripcion: 'Sacos de rafia y bolsones de un metro cúbico.',
            vidas: [
              v('Reúso para acopio, compost o transporte', 'REUSO', 'MEDIO', ['MERCADO_LOCAL', 'COMPOSTAJE'], 'Un big bag en buen estado se revende a quien acopia grano, arena o compost.', 'Sin rasgaduras ni contaminación química.', 'PRACTICA_COMUN', 'MYPE'),
              v('Artesanía y bolsas', 'REUSO', 'BAJO', ['ARTESANIA_MYPE'], 'Se transforman en bolsos y organizadores.', 'Limpios.', 'REPORTADO', 'MYPE'),
              v('Reciclaje de polipropileno', 'MATERIAL', 'BAJO', ['RECICLADO_MATERIAL'], 'Se vende por kilo a recicladoras de PP.', 'Limpio y seco.', 'PRACTICA_COMUN'),
            ],
          },
          {
            id: 'plastico-jabas',
            nombre: 'Jabas y cajas plásticas',
            sinonimos: ['jabas', 'cajas plasticas', 'canastas plasticas', 'javas'],
            categoria: 'PLASTICO_PEAD',
            descripcion: 'Cajas rígidas de cosecha y transporte.',
            vidas: [
              v('Reúso y reparación', 'REUSO', 'MEDIO', ['MERCADO_LOCAL'], 'Una jaba en buen estado se revende o se alquila.', 'Sin grietas; lavada.', 'PRACTICA_COMUN', 'MYPE'),
              v('Reciclaje mecánico', 'MATERIAL', 'MEDIO', ['RECICLADO_MATERIAL'], 'Rotas se venden por kilo a recicladoras.', 'Limpias.', 'PRACTICA_COMUN'),
            ],
          },
          {
            id: 'plastico-pet',
            nombre: 'Botellas PET',
            sinonimos: ['botellas pet', 'botellas de plastico', 'pet', 'preformas'],
            categoria: 'PLASTICO_PET',
            descripcion: 'Botellas de bebidas y preformas.',
            vidas: [
              v('Reúso y manualidades', 'REUSO', 'BAJO', ['ARTESANIA_MYPE'], 'Se reutilizan como maceteros, ecoladrillos y objetos.', 'Limpias.', 'PRACTICA_COMUN', 'MYPE'),
              v('Reciclaje a hojuela, fibra y envases', 'MATERIAL', 'MEDIO', ['RECICLADO_MATERIAL'], 'Se vende por kilo; el PET transparente y limpio paga mejor.', 'Sin tapas ni etiquetas; enjuagado.', 'PRACTICA_COMUN'),
            ],
          },
          {
            id: 'eps-tecnopor',
            nombre: 'Tecnopor (poliestireno expandido)',
            sinonimos: ['tecnopor', 'poliestireno expandido', 'eps', 'cajas isotermicas', 'cajas de tecnopor'],
            categoria: 'PLASTICO_MIXTO',
            descripcion: 'Cajas isotérmicas y embalajes; ocupa mucho volumen y pesa poco.',
            vidas: [
              v('Reúso de la caja isotérmica', 'REUSO', 'MEDIO', ['MERCADO_LOCAL'], 'Cajas en buen estado se revenden a pescaderías y comerciantes.', 'Limpias y sin olor.', 'PRACTICA_COMUN', 'MYPE'),
              v('Densificado y reciclaje', 'MATERIAL', 'BAJO', ['RECICLADO_MATERIAL'], 'Densificado se vende por kilo; sin densificar el flete lo hace inviable.', 'Limpio y seco; necesita una máquina de densificado.', 'REPORTADO', 'INDUSTRIAL'),
            ],
          },
        ],
      },
      {
        id: 'carton-madera',
        nombre: 'Cartón, madera y metal',
        que: 'Cajas, pallets, tarimas y chatarra.',
        residuos: [
          {
            id: 'carton-corrugado',
            nombre: 'Cartón corrugado y papel',
            sinonimos: ['carton', 'cajas de carton', 'carton corrugado', 'papel', 'kraft', 'cajas de exportacion'],
            categoria: 'PAPEL_CARTON',
            descripcion: 'Cajas de embalaje y papel de oficina.',
            preparacion: 'Mantener seco y aplastado; no mezclar con residuos orgánicos ni grasa.',
            vidas: [
              v('Reúso como caja de envío o mudanza', 'REUSO', 'BAJO', ['MERCADO_LOCAL'], 'Cajas sanas se revenden por unidad.', 'Secas y sin olor.', 'PRACTICA_COMUN', 'MYPE'),
              v('Reciclaje de papel y cartón', 'MATERIAL', 'MEDIO', ['RECICLADO_MATERIAL'], 'Se vende por kilo a recicladoras; la humedad es lo que más baja el precio.', 'Seco, plano y limpio.', 'PRACTICA_COMUN'),
            ],
          },
          {
            id: 'madera-pallets',
            nombre: 'Pallets, tarimas y madera de embalaje',
            sinonimos: ['pallets', 'palets', 'tarimas', 'madera', 'tablas', 'listones'],
            categoria: 'MADERA_PALLETS',
            descripcion: 'Pallets de madera usados en el despacho de mercadería.',
            preparacion: 'Clasificar por estado; separar los que tengan tratamiento químico.',
            vidas: [
              v('Reúso y reparación del pallet', 'REUSO', 'MEDIO', ['MERCADO_LOCAL'], 'Pallets sanos se revenden o alquilan; los dañados se reparan.', 'Con sello de tratamiento térmico (HT) si va a exportación.', 'PRACTICA_COMUN', 'MYPE'),
              v('Muebles, cercos y decoración', 'MATERIAL', 'MEDIO', ['ARTESANIA_MYPE'], 'Carpinteros y artesanos los convierten en muebles y jardineras.', 'Sin tratamiento químico ni derrames.', 'PRACTICA_COMUN', 'MYPE'),
              v('Astilla, aglomerados y leña', 'ENERGIA', 'BAJO', ['ENERGIA'], 'Rotos se venden como leña o astilla.', 'Madera sin pintura ni tratamiento químico.', 'PRACTICA_COMUN'),
            ],
          },
          {
            id: 'metal-chatarra',
            nombre: 'Chatarra y metales',
            sinonimos: ['chatarra', 'fierro', 'acero', 'aluminio', 'cobre', 'latas', 'metal'],
            categoria: 'METAL',
            descripcion: 'Estructuras, piezas, latas y tambores metálicos.',
            preparacion: 'Separar ferroso de no ferroso y pesar en balanza certificada.',
            vidas: [
              v('Reúso de piezas, tambores y estructuras', 'REUSO', 'MEDIO', ['MERCADO_LOCAL', 'ARTESANIA_MYPE'], 'Talleres de metalmecánica compran piezas y tambores en buen estado.', 'Sin contaminantes; tambores sin residuos peligrosos.', 'PRACTICA_COMUN', 'MYPE'),
              v('Fundición', 'MATERIAL', 'ALTO', ['RECICLADO_MATERIAL'], 'Se vende por kilo a fundidoras; los no ferrosos pagan más.', 'Separado por tipo y pesado en balanza.', 'PRACTICA_COMUN'),
            ],
          },
        ],
      },
      {
        id: 'aceites-equipos',
        nombre: 'Aceites, lubricantes y equipos',
        que: 'Líquidos de cocina o de mantenimiento y equipos fuera de uso.',
        residuos: [
          {
            id: 'aceite-cocina',
            nombre: 'Aceite de cocina usado',
            sinonimos: ['aceite usado', 'aceite de cocina', 'aceite vegetal usado', 'grasa de cocina'],
            categoria: 'ACEITES_USADOS',
            descripcion: 'Aceite vegetal de fritura de restaurantes, comedores y cocinas industriales.',
            preparacion: 'Filtrar, almacenar en envases cerrados y no mezclar con aceite mineral.',
            vidas: [
              v('Jabón, velas y productos artesanales', 'MATERIAL', 'MEDIO', ['ARTESANIA_MYPE'], 'Una MYPE lo transforma en jabón y velas.', 'Filtrado; sin mezcla con aceite de motor.', 'PRACTICA_COMUN', 'MYPE'),
              v('Biodiésel', 'MATERIAL', 'MEDIO', ['INGREDIENTES', 'GESTOR_AUTORIZADO'], 'Se vende por litro a productores de biodiésel.', 'Operador autorizado; filtrado y sin agua.', 'PRACTICA_COMUN', 'INDUSTRIAL'),
            ],
          },
          {
            id: 'aceite-lubricante',
            nombre: 'Aceite lubricante usado y trapos contaminados',
            sinonimos: ['aceite de motor', 'lubricante usado', 'aceite mineral usado', 'trapos con aceite', 'borra de aceite'],
            categoria: 'ACEITES_USADOS',
            descripcion: 'Residuo peligroso: no debe verterse ni mezclarse con otros.',
            vidas: [
              v('Entrega a un operador autorizado', 'DISPOSICION', 'COSTO', ['GESTOR_AUTORIZADO'], 'Es un costo de manejo; algunos operadores lo recuperan como combustible o lo re-refinan.', 'Operador con autorización vigente y constancia de entrega. Verificar la normativa vigente.', 'PRACTICA_COMUN'),
            ],
          },
          {
            id: 'raee-equipos',
            nombre: 'Equipos eléctricos y electrónicos fuera de uso',
            sinonimos: ['raee', 'computadoras', 'equipos electronicos', 'baterias', 'fluorescentes', 'celulares'],
            categoria: 'RAEE',
            descripcion: 'Residuos de aparatos eléctricos y electrónicos.',
            preparacion: 'No desarmar ni quemar; borrar datos antes de entregar.',
            vidas: [
              v('Reparación y reacondicionamiento', 'REUSO', 'MEDIO', ['ARTESANIA_MYPE', 'MERCADO_LOCAL'], 'Talleres reparan o reacondicionan equipos y los revenden.', 'Que funcionen o puedan repararse; datos borrados.', 'PRACTICA_COMUN', 'MYPE'),
              v('Gestión autorizada de RAEE', 'DISPOSICION', 'COSTO', ['GESTOR_AUTORIZADO'], 'Los equipos que no se reparan van a un operador autorizado, que recupera metales.', 'Operador de RAEE autorizado y constancia de entrega. Verificar la normativa vigente.', 'PRACTICA_COMUN'),
            ],
          },
        ],
      },
    ],
  },
];
