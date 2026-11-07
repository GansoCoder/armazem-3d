/**
 * Tipos de dados do inventário e do modelo do armazém.
 *
 * Convenção de validação:
 *  - um campo com valor e fora de `camposEstimados` foi lido diretamente nas fotografias/etiquetas;
 *  - um campo listado em `camposEstimados` é uma estimativa (ex.: posição deduzida de uma fotografia);
 *  - um campo `null` está "Por confirmar".
 */

export type EstadoValidacao = 'confirmado' | 'estimado' | 'por_confirmar'

export type TipoFotografia = 'peca' | 'no_local' | 'contentor' | 'etiqueta' | 'localizacao'

export interface Fotografia {
  src: string
  /** Miniatura opcional (usada em listagens). */
  thumb?: string
  legenda?: string
  tipo: TipoFotografia
}

export type TipoRegisto = 'referencia' | 'observacao'

/** Unidade (UQE) a que a peça se destina. "nenhuma" = não é específica de uma UQE. */
export type Uqe = 'nenhuma' | '2300' | '3500'

export interface Peca {
  id: string
  referencia: string | null
  nome: string | null
  descricao: string | null
  categoria: string | null
  /** Quantidade (≥ 0). Pode ter casas decimais quando o material é medido em kg, m, etc. */
  quantidade: number | null
  stockMinimo: number | null
  /** Valor do stock em euros (coluna "Valor de Stock" do Excel). */
  valorStock?: number | null
  /** Posição tal como está no ficheiro de origem (ex.: 1B04C02A, ARM05, M100, ND). */
  posicaoOrigem?: string | null
  /** UQE a que se destina (por omissão "nenhuma"). */
  uqe?: Uqe
  /** De onde vem o registo: Excel de materiais, observação nas fotografias, ou criado à mão. */
  fonte?: 'excel' | 'fotografia' | 'manual'
  localizacaoId: string | null
  /** Caixa dentro da posição (A, B, C…), último elemento do código, ex.: 1B09A02**C**. */
  caixa: string | null
  fotografias: Fotografia[]
  modelo3D: string | null
  fabricante: string | null
  notas: string
  estadoValidacao: EstadoValidacao
  /** "referencia": artigo com código visível; "observacao": artigo visto nas fotos sem código legível. */
  tipoRegisto: TipoRegisto
  /** Origem da informação (fotografia, etiqueta...). */
  evidencia: string | null
  /** Campos cujo valor é estimado e não lido diretamente. */
  camposEstimados: string[]
  /** Preenchido apenas para registos alterados/criados no modo de edição local. */
  origemLocal?: 'criado' | 'editado'
  atualizadoEm?: string
}

export interface Localizacao {
  /** Identificador interno e estável (as peças referem-se a ele). */
  id: string
  /**
   * Código oficial do armazém, sem a caixa: zona + corredor + prateleira (letra, de baixo para cima)
   * + coluna (2 dígitos). Ex.: 1B10A02. Null enquanto o corredor da estrutura não estiver confirmado.
   */
  codigo: string | null
  /** Código de uma coluna com prateleira por confirmar, ex.: 1B11?01. */
  codigoParcial?: string | null
  /** Número oficial da coluna (01, 02…), quando difere do índice do módulo (ex.: armários do corredor 04). */
  coluna?: number | null
  zona: string
  estrutura: string
  /** Índice do módulo/coluna (1 = primeiro) ou null quando a localização abrange toda a estrutura. */
  modulo: number | null
  /** Índice do nível/prateleira (0 = o mais baixo = letra A) ou null quando abrange todo o módulo (prateleira por confirmar). */
  nivel: number | null
  descricao: string
  /**
   * "etiqueta_visivel": código existe fisicamente no armazém;
   * "parcial": parte do código foi lida numa etiqueta (ex.: "20"), o resto é provisório;
   * "provisorio": código criado para esta aplicação.
   */
  origemCodigo: 'etiqueta_visivel' | 'parcial' | 'provisorio'
  /** Override opcional da posição 3D calculada a partir do layout. */
  posicao3D?: { x: number; y: number; z: number } | null
  estadoValidacao: EstadoValidacao
  notas?: string
}

export interface Vec2 {
  x: number
  z: number
}

export interface Cores {
  montantes: string
  vigas: string
  prateleiras?: string
}

interface EstruturaBase {
  id: string
  nome: string
  /** Rótulo curto mostrado na vista 3D. */
  rotulo: string
  zona: string
  posicao: Vec2
  /** Rotação em graus em torno do eixo vertical. A frente da estrutura fica virada para +z local. */
  rotacaoY: number
  /** Número oficial do corredor (ex.: "10"). Null = por confirmar. */
  corredor?: string | null
  /** true quando o número do corredor foi deduzido (ex.: pela sequência) e não lido numa etiqueta. */
  corredorInferido?: boolean
  /** Extremo onde está a etiqueta verde do corredor: "inicio" (lado da coluna 01, por defeito) ou "fim". */
  ladoEtiqueta?: 'inicio' | 'fim'
  /** true: a coluna 01 fica no extremo +x local (em vez de −x), para todas as filas começarem do mesmo lado. */
  colunasInvertidas?: boolean
  /** Número da primeira coluna (por defeito 1). Ex.: os armários do corredor 04 são as colunas 04 e 05. */
  colunaInicial?: number
  fotografias?: Fotografia[]
  estadoGeometria: EstadoValidacao
  notas?: string
}

export interface EstruturaEstante extends EstruturaBase {
  tipo: 'porta-paletes' | 'estante-vidros' | 'estante-ligeira' | 'armario'
  modulos: number
  larguraModulo: number
  profundidade: number
  /** Altura da base de cada nível (o primeiro é normalmente 0 = chão). */
  niveis: number[]
  altura: number
  nomesNiveis?: string[]
  /**
   * Estruturas sem corredor cujas prateleiras têm código próprio: prefixo + número da prateleira
   * (01 = a mais baixa), ex.: "ARM" → ARM01, ARM02… A letra seguinte (ARM03C) é a caixa.
   */
  prefixoCodigo?: string
  cores: Cores
  divisoriasVerticais?: boolean
}

export interface EstruturaContentores extends EstruturaBase {
  tipo: 'contentores'
  colunas: number
  filas: number
  larguraContentor: number
  profundidadeContentor: number
  alturaContentor: number
  empilhamento: number
  /**
   * Posição de cada contentor (coordenadas locais, em metros), pela ordem das letras A, B, C…
   * "rodado" = contentor virado 90°. Sem disposição, os contentores ficam numa grelha colunas × filas.
   */
  disposicao?: { x: number; z: number; rodado?: boolean }[]
}

export interface EstruturaZonaChao extends EstruturaBase {
  tipo: 'zona-chao'
  largura: number
  profundidade: number
  /** Desenho do conteúdo (ex.: "rolos" = rolos brancos deitados). */
  conteudo?: 'rolos'
}

export type Estrutura = EstruturaEstante | EstruturaContentores | EstruturaZonaChao

export interface ZonaPiso {
  id: string
  nome: string
  x: number
  z: number
  largura: number
  profundidade: number
}

export type TipoElemento =
  | 'empilhador'
  | 'extintor'
  | 'portao'
  | 'quadro-eletrico'
  | 'postigo'
  | 'bobina'
  | 'porta-paletes-manual'
  | 'paletes'
  | 'sacos'
  | 'caixotes'
  | 'caixas'
  | 'compartimento'

export interface ElementoDecorativo {
  id: string
  tipo: TipoElemento
  posicao: Vec2
  rotacaoY?: number
  rotulo?: string
  /** Largura (para portões e compartimentos) ou número de unidades (para pilhas). */
  largura?: number
  /** Altura do vão (portões e portas). */
  altura?: number
  profundidade?: number
  quantidade?: number
}

export interface Layout {
  versao: number
  aviso: string
  /** Código da zona do armazém representada (primeiro elemento do código de posição). */
  codigoZona: string
  edificio: {
    xMin: number
    xMax: number
    zMin: number
    zMax: number
    altura: number
    /** Contorno das paredes (polígono), quando a planta não é um retângulo. */
    contorno?: Vec2[]
  }
  estruturas: Estrutura[]
  zonas: ZonaPiso[]
  elementos: ElementoDecorativo[]
}

export type EstadoStock = 'disponivel' | 'baixo' | 'sem_stock' | 'por_confirmar'

export type Vista = '3d' | 'lista' | 'organograma'

/**
 * Composição das peças (organograma): que peças fazem parte de outras ou formam conjuntos.
 * Os nós são referências de material (ex.: "GCP12"), "id:<id>" para registos sem referência,
 * ou ids de grupos ("G-…") para equipamentos/conjuntos que não são artigos de stock.
 */
export interface GrupoComposicao {
  id: string
  /** "equipamento": equipamento maior que não está em stock; "conjunto": peças que formam um conjunto. */
  tipo: 'equipamento' | 'conjunto'
  nome: string
  uqe?: Uqe
  notas?: string
}

export interface LigacaoComposicao {
  /** Nó de cima (o equipamento, conjunto ou peça maior). */
  pai: string
  /** Nó de baixo (a peça que faz parte). */
  filho: string
  /** Quantas unidades leva (null = por confirmar). */
  quantidade?: number | null
  notas?: string
}

export interface Composicao {
  grupos: GrupoComposicao[]
  ligacoes: LigacaoComposicao[]
}

export interface Filtros {
  categoria: string
  /** Área do armazém pela posição (1B, 1C, ARM, ND…). */
  zona: string
  estado: '' | EstadoStock
  tipoRegisto: '' | TipoRegisto
  /** Peças com ("sim") ou sem ("nao") ligação a uma posição do modelo 3D. */
  no3D: '' | 'sim' | 'nao'
  uqe: '' | Uqe
  /** Só as peças de uma estrutura do organograma (nó de topo). */
  composicao: string
}
