/** Contenido educativo de la enciclopedia. */

export interface EncyclopediaEntry {
  id: string
  title: string
  summary: string
  definition: string
  importance: string
  consequences: string
  example: string
  mechanics: string
  related: string[]
}

export const ENCYCLOPEDIA: EncyclopediaEntry[] = [
  {
    id: 'agricultura-sostenible',
    title: 'Agricultura sostenible',
    summary: 'Producir alimentos hoy sin comprometer la capacidad de producir mañana.',
    definition:
      'Sistema de producción que busca equilibrar tres dimensiones: la productividad agrícola, la viabilidad económica de quien produce y la conservación de los recursos naturales (suelo, agua, biodiversidad) de los que depende la producción.',
    importance:
      'Las fincas dependen de servicios ecosistémicos —suelo fértil, agua limpia, polinizadores, controladores naturales de plagas— que no aparecen en la contabilidad pero sostienen la producción. Cuidarlos reduce costos y riesgos en el largo plazo.',
    consequences:
      'Maximizar la producción a corto plazo con exceso de insumos y sin protección del suelo puede generar ganancias iniciales, pero degrada la base productiva: menos fertilidad, más erosión, agua contaminada y más plagas, con costos crecientes.',
    example:
      'Una finca que combina abonos orgánicos, coberturas, sombrío y manejo integrado de plagas puede producir algo menos al inicio, pero mantiene su fertilidad y evita multas o pérdidas por degradación.',
    mechanics:
      'En EcoFinca la puntuación global pondera Productividad (30 %), Rentabilidad (30 %) y Sostenibilidad (40 %). Si la sostenibilidad es menor a 60 la clasificación máxima es «Aceptable», y menor a 40 «Deficiente».',
    related: ['fertilidad', 'erosion', 'contaminacion-hidrica'],
  },
  {
    id: 'fertilidad',
    title: 'Fertilidad del suelo',
    summary: 'La capacidad del suelo para suministrar nutrientes a las plantas.',
    definition:
      'Conjunto de propiedades químicas (nutrientes, acidez), físicas (estructura, retención de agua) y biológicas (microorganismos, materia orgánica) que permiten a un suelo sostener el crecimiento de los cultivos.',
    importance:
      'El café extrae nutrientes en cada cosecha, especialmente durante el llenado del grano. Sin reposición, la productividad cae y las plantas se vuelven más susceptibles a enfermedades como la mancha de hierro.',
    consequences:
      'La erosión arrastra la capa fértil; el uso exclusivo de fertilizante químico puede acidificar el suelo y el exceso se lava hacia las fuentes de agua.',
    example:
      'Un lote con fertilidad 30 produce aproximadamente la mitad que uno con fertilidad 70 en las mismas condiciones. El abono orgánico libera nutrientes durante varios meses y mejora la biota del suelo.',
    mechanics:
      'F(t+1) = F(t) + Recuperación − Degradación. La recuperación proviene del abono orgánico, coberturas, sombrío y barbecho; la degradación, de la extracción del cultivo, la erosión, la lixiviación y la acidificación.',
    related: ['erosion', 'cobertura-vegetal', 'agricultura-sostenible'],
  },
  {
    id: 'erosion',
    title: 'Erosión del suelo',
    summary: 'Pérdida de suelo arrastrado por la lluvia y la escorrentía.',
    definition:
      'Proceso de desprendimiento y transporte de partículas del suelo. En las laderas cafeteras es causado principalmente por el impacto de las gotas de lluvia y el agua que escurre sobre suelo desprotegido.',
    importance:
      'Formar unos pocos centímetros de suelo puede tardar siglos, mientras que una temporada de aguaceros sobre suelo desnudo puede arrastrarlos. La capa superficial es la más rica en materia orgánica y nutrientes.',
    consequences:
      'Menor fertilidad y retención de agua, cárcavas, sedimentos que enturbian la quebrada y deterioran la calidad del agua aguas abajo.',
    example:
      'Preparar un lote y dejarlo sin cobertura durante la temporada de lluvias multiplica la erosión. Las barreras vivas en contorno y la cobertura vegetal la reducen drásticamente.',
    mechanics:
      'La ganancia de erosión depende de la erosividad de la lluvia (cantidad e intensidad), la pendiente y la protección (cobertura hasta −75 %, barreras hasta −60 %, sombrío hasta −30 %). La erosión reduce la fertilidad y genera sedimentos.',
    related: ['cobertura-vegetal', 'fertilidad', 'contaminacion-hidrica'],
  },
  {
    id: 'contaminacion-hidrica',
    title: 'Contaminación hídrica',
    summary: 'Deterioro de la calidad del agua por residuos agrícolas y del beneficio.',
    definition:
      'Presencia en el agua de sustancias que alteran su calidad: nutrientes de fertilizantes, residuos de plaguicidas, sedimentos y materia orgánica de las aguas residuales del beneficio del café (aguas mieles).',
    importance:
      'La quebrada abastece a la finca y a las comunidades vecinas. Las aguas mieles tienen una carga orgánica muy alta que consume el oxígeno del agua y afecta la vida acuática.',
    consequences:
      'Agua no apta para consumo, pérdida de biodiversidad acuática, conflictos con vecinos y sanciones de la autoridad ambiental.',
    example:
      'El beneficio tradicional usa mucha agua por kilo de café y vierte aguas mieles sin tratar. Un beneficio ecológico reduce el consumo de agua y permite tratar los residuos y compostar la pulpa.',
    mechanics:
      'C(t+1) = C(t) + Aportes − Mitigación. Aportes: escorrentía de fertilizante químico, plaguicidas, sedimentos y aguas residuales. Mitigación: autodepuración, ronda hídrica protegida y bosque. La calidad del agua converge hacia un objetivo que depende de la contaminación y los sedimentos.',
    related: ['conservacion-recursos', 'fertilidad', 'manejo-integrado-plagas'],
  },
  {
    id: 'agroforesteria',
    title: 'Agroforestería',
    summary: 'Combinar árboles con cultivos en el mismo terreno.',
    definition:
      'Sistema de uso de la tierra que integra deliberadamente árboles (de sombra, frutales o maderables) con cultivos agrícolas. En café se conoce como café con sombrío.',
    importance:
      'Los árboles regulan la temperatura, reducen la evaporación, aportan hojarasca que nutre el suelo, protegen contra la erosión y ofrecen hábitat para aves e insectos benéficos.',
    consequences:
      'Un sombrío muy denso puede reducir la producción; uno bien manejado estabiliza los rendimientos frente al calor y la sequía y diversifica los ingresos.',
    example:
      'Sembrar guamo, plátano o nogal cafetero entre los surcos protege el cafetal en una ola de calor y aumenta la biodiversidad del lote.',
    mechanics:
      'El sombrío madura en 12 meses. Reduce la evapotranspiración hasta 20 %, el daño por calor a la mitad, aumenta la biodiversidad objetivo y reduce el potencial productivo en 10 %.',
    related: ['agricultura-sostenible', 'conservacion-recursos', 'manejo-integrado-plagas'],
  },
  {
    id: 'manejo-integrado-plagas',
    title: 'Manejo integrado de plagas (MIP)',
    summary: 'Controlar plagas combinando métodos y usando químicos solo como último recurso.',
    definition:
      'Estrategia que combina monitoreo, prácticas culturales (como la recolección oportuna y de frutos caídos), control biológico (por ejemplo, hongos entomopatógenos contra la broca) y, solo cuando es necesario, productos químicos selectivos.',
    importance:
      'El uso repetido de plaguicidas elimina también a los enemigos naturales, genera resistencia y contamina el agua. El MIP mantiene las plagas por debajo del nivel de daño económico de forma duradera.',
    consequences:
      'Sin manejo, la broca reduce la cantidad y calidad del café; la roya defolia las plantas susceptibles. El control químico exclusivo eleva la contaminación y reduce la biodiversidad.',
    example:
      'Ante un foco de broca, una campaña de MIP reduce la incidencia sin dañar a la fauna benéfica, y cosechar a tiempo evita que los frutos caídos alimenten la plaga.',
    mechanics:
      'Control químico: −75 % de incidencia y 2 meses de protección, pero contamina y reduce la biodiversidad. MIP: −50 % y 3 meses de protección, aumenta la biodiversidad. La biodiversidad reduce el crecimiento de las plagas (control natural).',
    related: ['agroforesteria', 'contaminacion-hidrica'],
  },
  {
    id: 'cobertura-vegetal',
    title: 'Cobertura vegetal',
    summary: 'Mantener el suelo cubierto con plantas para protegerlo.',
    definition:
      'Vegetación de porte bajo (arvenses nobles, leguminosas) o residuos que cubren el suelo entre las plantas del cultivo.',
    importance:
      'Es la primera defensa contra la erosión: amortigua el impacto de la lluvia, aumenta la infiltración, conserva la humedad y aporta materia orgánica y nitrógeno.',
    consequences:
      'Un suelo desnudo pierde fertilidad, se compacta y se erosiona; un suelo cubierto se recupera con el tiempo.',
    example:
      'En el escenario de suelo degradado, establecer cobertura en los lotes con más pendiente detiene la pérdida de suelo antes de invertir en fertilizantes.',
    mechanics:
      'Se establece en 3 meses. Reduce la erosión hasta 75 %, la escorrentía, la evaporación en 10 %, aporta fertilidad cada mes y aumenta la biodiversidad del lote.',
    related: ['erosion', 'fertilidad', 'conservacion-recursos'],
  },
  {
    id: 'conservacion-recursos',
    title: 'Conservación de recursos',
    summary: 'Proteger el agua, el bosque y la biodiversidad de la finca.',
    definition:
      'Conjunto de prácticas para mantener la cantidad y calidad de los recursos naturales: proteger nacimientos y rondas de agua, conservar y restaurar bosques, usar el agua con eficiencia y tratar los residuos.',
    importance:
      'Los bosques regulan el caudal de las quebradas; la vegetación de ribera filtra contaminantes. En una crisis hídrica, cada metro cúbico ahorrado mantiene vivos los cultivos.',
    consequences:
      'Deforestar y usar el agua sin control reduce el caudal, aumenta el riesgo de quedarse sin agua en los meses secos y deteriora la calidad del agua para todos.',
    example:
      'Conservar la ronda de la quebrada y cambiar a riego por goteo permite mantener la producción con menos agua en el escenario de crisis hídrica.',
    mechanics:
      'La ronda hídrica protegida aumenta la mitigación de la contaminación, la calidad del agua y el caudal. El bosque y la reforestación mejoran el caudal y la biodiversidad. El reservorio vacío se registra como un fallo de gestión del agua.',
    related: ['contaminacion-hidrica', 'agroforesteria', 'agricultura-sostenible'],
  },
]
