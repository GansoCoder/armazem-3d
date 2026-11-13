# Armazém | Gestão de Peças

Aplicação web para consultar visualmente o armazém de peças: modelo 3D navegável, pesquisa em tempo real, listagem e ficha de cada peça, com ligação direta entre a peça e a sua localização no 3D.

> **Dados:** os materiais, as posições, as quantidades e os valores vêm da lista de materiais (Excel). A planta 3D segue o esquema desenhado pelo armazém (disposição e números dos corredores); as dimensões são estimadas, por isso não está à escala. Ver [`docs/ANALISE.md`](docs/ANALISE.md).

## Instalar e executar

Requisitos: Node.js 22.18+ (os scripts importam diretamente `src/utils/planta.ts`).

```bash
npm install
npm run dev        # http://localhost:5173
npm run dev:rede   # também acessível pelos telemóveis na mesma rede (ver "Etiquetas QR")
npm test           # testes automáticos das regras (códigos, ligações, importação, organograma)
npm run build      # versão de produção em dist/
npm run preview    # servir a versão de produção
```

## Stack

| Peça | Escolha | Porquê |
|---|---|---|
| Interface | React 19 + TypeScript | Tipagem dos dados do inventário. |
| Build | Vite | Arranque rápido; a vista 3D é carregada à parte (a listagem abre sem esperar pelo three.js). |
| 3D | three.js via React Three Fiber + drei | Cena declarativa ligada ao mesmo estado React da pesquisa e da listagem. |
| Estilos | CSS com variáveis (`src/index.css`) | Tema único, sem dependências extra. |
| Ícones | lucide-react | |

## Funcionalidades

- **Vista 3D**: rodar (arrastar), deslocar (botão direito / dois dedos), ampliar (roda); botões para aproximar, afastar, rodar, vista de cima, repor vista e ocultar rótulos. Clique numa célula para ver as peças dessa localização. Painel "Estruturas" para navegar por teclado.
- **Cores**: verde = disponível; laranja = stock baixo (só com `stockMinimo` configurado); vermelho = quantidade 0; cinzento = por confirmar (incluindo quantidades estimadas). Cada estado também tem ícone e texto.
- **Pesquisa** (tecla `/`): por referência, nome, descrição, categoria, fabricante, código de localização, estrutura, módulo e nível. Parcial, sem distinção de maiúsculas/acentos, vários termos. Ao escolher uma peça, muda para 3D, enquadra e destaca a localização e abre a ficha. Se a localização estiver por confirmar, avisa em vez de destacar.
- **Listagem**: ordenação por referência, nome, localização, quantidade e valor; filtros por categoria, área (1B, 1C, ARM, ND…), presença no 3D, estado do stock e tipo de registo; paginação; cartões em telemóvel; "Ver no armazém".
- **Ficha da peça**: galeria (o tipo de cada fotografia é indicado), modelo 3D (.glb/.gltf) quando existir, dados com marcas "estimado" / "Por confirmar".
- **UQE** de cada peça: Nenhuma, 2300 ou 3500. Aparece na ficha, na listagem, nos filtros e na pesquisa (`uqe 3500`), e pode ser alterada no editor da peça.
- **Modo de edição local**: criar/editar peças, quantidade, UQE, localização, fotografias e notas — ver limitações abaixo.
- **Organograma** (separador "Organograma" ou "Ver organograma" na ficha): mostra as peças que fazem parte de outras (ex.: o GCP12 leva kits de reparação e anéis tóricos) e as que formam conjuntos — ver abaixo.
- **No terreno**: etiquetas QR para imprimir, leitor de códigos (QR e códigos de barras), ligações diretas para posições e peças, fotografias tiradas com a câmara do telemóvel — ver abaixo.
- **Lista de recolha** com ordem de passagem sugerida e paragens numeradas no 3D.
- **Ferramentas → Importar Excel** (com resumo do que muda) e **Qualidade dos dados**.
- **Editor da planta** (botão "Editar planta" na vista 3D): criar, mover, rodar e alterar estantes, porta-paletes, armários, estantes de vidros e zonas de chão — ver abaixo.

## Códigos de posição

Formato oficial do armazém (indicado pelo responsável):

```text
1B   10   A    02   C
│    │    │    │    └─ caixa (A, B, C…)
│    │    │    └────── coluna (01, 02…)
│    │    └─────────── prateleira, de baixo para cima (A = a mais baixa)
│    └──────────────── corredor (ex.: 10 = fila EL-02)
└───────────────────── zona (1B = zona fotografada; 1C = sala atrás da porta)
```

- A zona está em `layout.json → codigoZona`; o corredor de cada estrutura em `estruturas[].corredor`.
- O código sem caixa (`1B10A02`) é gerado na localização (`locations.json → codigo`); a caixa é guardada na peça (`parts.json → caixa`).
- Zona 1C (esquema e vídeo, medidas estimadas): corredores 1C01–1C07, numa sala atrás da porta da 1B. Cada estrutura pode ter o seu código de zona (`codigoZona` no layout, ou o campo "Zona" no editor da planta); sem ele, usa o do layout (`1B`).
- Corredores no modelo da 1B (esquema do armazém): 01–17, 20 e 21. O 03 é a zona dos rolos brancos (`1B03`), o 13 e o 14 são os contentores de ferro, e as colunas 04 e 05 do corredor 04 são armários. O armário "ARM" junto ao corredor 01 não tem número.
- Em todas as filas, a coluna 01 está no extremo de cima do esquema (lado das etiquetas). Nas estruturas viradas para a direita isto é indicado com `colunasInvertidas: true`.
- O armário "ARM" junto ao portão 2 tem as posições `ARM01`–`ARM06` (`prefixoCodigo: "ARM"`): cada número é uma prateleira, com a ARM01 em baixo, e a letra seguinte é a caixa (`ARM03C`). `ESQ-ARM1` continua sem 3D.
- Colunas com prateleira por confirmar mostram o código parcial com "?" no lugar da letra, ex.: `1B11?01`.
- Peças cuja prateleira ainda não se sabe ficam na **coluna** (ex.: `EL-01-M1`), mostrada no 3D como um contorno da coluna inteira.
- A pesquisa aceita o código completo ou parcial (`1B10`, `1b10a02c`).

## Importar a lista de materiais (Excel)

```bash
node scripts/gerar-localizacoes.mjs                      # só se o layout mudou
node scripts/importar-excel.mjs "materiais armazem.xlsx"
```

- Lê as colunas **Material**, **Texto breve de material**, **Posição no depósito**, **Estoque total** e **Valor de Stock** (reconhecidas pelo cabeçalho).
- Linhas repetidas com o mesmo material e a mesma posição são somadas.
- Liga cada posição a uma célula do 3D (`1B08F02E` → corredor 08, prateleira F, coluna 02, caixa E). Nos contentores (corredores 13 e 14), a letra final identifica o contentor.
- As posições que o modelo ainda não tem (outras zonas, `ND`, `M100`, `ESCRITORIO`, `ESQ-ARM1`, corredores 18 e 19) continuam na listagem e na pesquisa, com a marca **sem 3D**.
- Mantém o que foi acrescentado à mão nos registos (fotografias, notas, categoria, fabricante, stock mínimo, modelo 3D).
- **UQE**: quando a designação diz explicitamente "UQE2300" ou "UQE3500" (incluindo "UQE2300/2400"), a peça fica com essa UQE, marcada **estimado**. As restantes ficam "Nenhuma". Uma UQE escolhida à mão é mantida nas importações seguintes.
- Escreve [`docs/relatorio-importacao.md`](docs/relatorio-importacao.md) com os totais, as posições por ligar e as possíveis gralhas no Excel.

Para atualizar os dados, exporte de novo o Excel e volte a correr o comando.

## Onde editar os dados

Os dados estão separados da interface em `src/data/`. `src/data/fonte.ts` é o único ponto de carregamento: para ligar a uma API, substitua o corpo de `carregarDadosBase()` por `fetch` com a mesma forma.

### Peças — `src/data/parts.json`

```json
{
  "id": "p-42173490",
  "referencia": "42173490",
  "nome": "Cepo freio sintético K",
  "descricao": "…",
  "categoria": "Freio",
  "quantidade": null,
  "stockMinimo": null,
  "localizacaoId": "CG14-01",
  "fotografias": [{ "src": "/assets/pecas/x.jpg", "thumb": "/assets/pecas/x-thumb.jpg", "legenda": "…", "tipo": "peca" }],
  "modelo3D": null,
  "fabricante": null,
  "notas": "",
  "estadoValidacao": "por_confirmar",
  "tipoRegisto": "referencia",
  "evidencia": "Etiqueta legível nas fotos 2 e 4.",
  "camposEstimados": ["categoria", "localizacaoId"]
}
```

- `null` = **Por confirmar**. Não preencha com valores inventados.
- `camposEstimados` lista os campos estimados (aparecem com a marca "estimado").
- `quantidade`: número ≥ 0; pode ter decimais em materiais medidos em kg, m, etc. `stockMinimo`: só ative o alerta laranja quando houver um mínimo real.
- `tipo` da fotografia: `peca`, `no_local`, `contentor`, `etiqueta` ou `localizacao`.
- `tipoRegisto`: `referencia` (código visível) ou `observacao` (artigo visto sem código legível).
- `uqe`: `"nenhuma"`, `"2300"` ou `"3500"` (sem o campo = nenhuma). Com `"uqe"` em `camposEstimados`, foi deduzida da designação.
- `caixa`: letra da caixa dentro da posição (último elemento do código), ou `null`.

A integridade (ids únicos, quantidades válidas, localizações existentes) é verificada ao arrancar; os avisos aparecem na consola e na janela "Sobre o modelo" (ícone ⓘ).

### Localizações — `src/data/locations.json`

Cada localização tem um `id` interno estável (é este que as peças referem) e um `codigo` oficial quando o corredor é conhecido. Aponta para uma estrutura (`estrutura`), um `modulo`/coluna (1 = primeiro) e um `nivel`/prateleira (0 = o mais baixo = A); `null` abrange a coluna ou a estrutura inteira. A posição 3D é calculada a partir do layout; `posicao3D` permite forçá-la. `origemCodigo` indica se o código existe fisicamente (`etiqueta_visivel`), se é parcial (`parcial`, ex.: EV-**20**-N1) ou provisório.

Depois de mudar estruturas no layout, regenere as localizações (mantém notas e descrições já editadas):

```bash
node scripts/gerar-localizacoes.mjs
```

### No terreno: etiquetas QR, leitor e ligações diretas

- **Ligações diretas**: `…/?loc=1B09A02` abre essa posição no 3D; `…/?peca=42173490` abre a peça. Os botões "Copiar ligação" (ficha e painel da posição) dão estas ligações.
- **Etiquetas QR** (Ferramentas → Etiquetas QR, ou o ícone QR no painel da posição): escolha as estruturas e o tipo — **posições** (prateleira + coluna, para colar na estante) ou **caixas** (uma por material, com a referência). Imprime em folhas A4 de 3 × 8 etiquetas de 70 × 37 mm.
- Para os telemóveis abrirem os QR, a aplicação tem de estar acessível na rede: arranque com `npm run dev:rede` e escreva em "Endereço da aplicação" o endereço "Network" que aparece (ex.: `http://192.168.1.20:5173/`). Basta apontar a câmara do telemóvel ao QR.
- **Ler código** (cabeçalho): lê QR e códigos de barras com a câmara no Chrome/Edge (exige `https` ou o próprio computador); em qualquer navegador pode escrever ou colar um código de posição (com ou sem caixa), uma referência ou uma ligação.
- **Tirar fotografia** no editor da peça abre logo a câmara traseira no telemóvel.

### Lista de recolha

- "Adicionar à recolha" na ficha, na listagem ou "Tudo para a recolha" no organograma.
- A lista ordena as paragens a partir da porta, sempre para a posição mais próxima (aproximação, sem contar com as estantes pelo meio). Marque cada peça ao recolher; "Ver percurso no armazém" mostra as paragens numeradas no 3D; "Imprimir" dá uma folha para levar.
- Fica guardada neste navegador.

### Importar o Excel na aplicação e qualidade dos dados

- **Ferramentas → Importar Excel**: arraste o ficheiro. Antes de aplicar mostra os materiais novos, os que deixam de existir e as quantidades, posições e designações alteradas. Usa as mesmas regras do script (`src/utils/importacao.ts`).
- A importação fica neste navegador (IndexedDB) até "Repor dados oficiais"; "Exportar parts.json" dá o ficheiro para substituir `src/data/parts.json`.
- **Ferramentas → Qualidade dos dados**: posições a corrigir no Excel, posições que não cabem nas estantes desenhadas, materiais sem posição no 3D por motivo, e percentagem com fotografia e categoria. Um clique abre a ficha.

### Organograma — `src/data/composicao.json`

Não existe lista técnica, por isso as ligações são feitas à mão na aplicação:

- Na ficha de uma peça, **Editar ligações**: em "Componentes" acrescentam-se as peças que ela leva (com a quantidade, opcional); em "Faz parte de", a peça maior, o equipamento ou o conjunto a que pertence.
- No separador **Organograma**, **+ Conjunto** cria um grupo de peças que vão juntas (ex.: guarda-lamas esquerdo e direito) e **+ Equipamento** cria um equipamento que não está em stock.
- A ligação vale para o material (a referência), em todas as posições do armazém. Ligações circulares são recusadas.
- Cada caixa do organograma mostra o stock e a posição; um clique abre a ficha. **Ver no armazém** e **Ver na listagem** aplicam o filtro "Equipamento / conjunto" e mostram só essas peças (no 3D ficam destacadas as posições).
- **Conjunto completo**: no organograma, indique quantas unidades vai montar/reparar; cada peça mostra quantas são precisas e quantas faltam (ligações sem quantidade contam como 1, marcadas com "?").
- **Folha** (no organograma): preenche muitas ligações de uma vez a partir de um Excel ou CSV com as colunas `Pai`, `Filho`, `Quantidade` e `Tipo do pai` ("equipamento"/"conjunto"). "Modelo (CSV)" descarrega um exemplo. Pais que não sejam referências nem grupos existentes são criados como grupos; linhas inválidas ou circulares são indicadas e ignoradas.
- Tal como as outras edições, as ligações ficam **só neste navegador** até "Exportar composicao.json" (barra amarela). Para as tornar oficiais, substitua `src/data/composicao.json` pelo ficheiro exportado.

```json
{
  "grupos": [{ "id": "G-001", "tipo": "conjunto", "nome": "Guarda-lamas UQE2300", "uqe": "2300" }],
  "ligacoes": [
    { "pai": "GCP12", "filho": "16523021", "quantidade": 2 },
    { "pai": "G-001", "filho": "53103804", "quantidade": null }
  ]
}
```

`pai`/`filho` são referências de material, ids de grupos (`G-…`) ou `id:<id>` para registos sem referência.

### Planta 3D — `src/data/layout.json`

- `edificio`: limites do pavilhão (metros estimados) e `contorno`, o polígono das paredes (a planta é em L: a parede com a porta corta o canto de baixo à direita).
- `estruturas`: `porta-paletes`, `estante-vidros`, `estante-ligeira`, `armario`, `contentores` ou `zona-chao`, com `posicao` (centro), `rotacaoY` (graus; a frente fica virada para +z local: 0 = para baixo no esquema, 90 = para a direita, −90 = para a esquerda), número de módulos, larguras, profundidade, alturas dos níveis, cores e fotografias de referência.
  - `colunasInvertidas`: a coluna 01 fica no outro extremo; `colunaInicial`: número da primeira coluna (os armários do corredor 04 começam na 04).
  - Contentores: `disposicao` dá a posição de cada contentor (A, B, C…) e se está rodado; sem ela ficam em grelha.
  - Zona de chão: `conteudo: "rolos"` desenha os rolos brancos.
- `zonas`: rótulos no chão. `elementos`: contexto (portões, porta…), não são localizações. Os empilhadores, extintores e restantes elementos da planta antiga foram retirados, porque o esquema não indica onde estão.

Quando houver medidas reais, basta corrigir estes valores; não é preciso mexer no código.

### Editor da planta (forma mais fácil)

Na vista 3D, carregue em **Editar planta**:

1. **Nova**: escolha o tipo (estante ligeira, porta-paletes, armário, estante de vidros, zona de chão) e carregue em "Nova". Para alterar uma existente, escolha-a na lista ou clique nela no 3D.
2. Indique o **corredor** (2 dígitos) — ou, num armário sem corredor, o **código das prateleiras** (ex.: `ARM` → ARM01, ARM02…) — o número de **colunas** e de **prateleiras**, a primeira coluna (ex.: 4 se continua outra estrutura) e de que lado fica a coluna 01.
3. Ajuste as **medidas** e a **posição**: setas (passo de 10 cm, 50 cm ou 1 m), coordenadas X/Z, e os botões da frente (para baixo, direita, cima, esquerda).
4. O resumo mostra os **códigos gerados** (ex.: `1B18A01 … 1B18D04`), quantas peças ficam ligadas e que materiais do Excel desse corredor ainda não cabem (para aumentar colunas ou prateleiras).
5. **Guardar** (com confirmação): a planta fica neste navegador e toda a aplicação passa a usá-la; as peças do Excel são religadas automaticamente pela posição. Códigos repetidos entre estruturas impedem a gravação.
6. Para tornar a planta oficial: **Exportar layout.json** (barra amarela), substitua `src/data/layout.json` e corra:

```bash
node scripts/gerar-localizacoes.mjs
node scripts/importar-excel.mjs "materiais armazem.xlsx"
```

"Repor planta original" descarta a planta local. As regras de códigos e ligações estão em `src/utils/planta.ts`, usadas tanto pelo editor como pelos scripts.

### Editar o layout.json à mão

**Adicionar uma estante ou um armário:** acrescente um objeto a `estruturas` (copie o de `EL10` e mude `id`, `nome`, `rotulo`, `posicao`, `rotacaoY`, `corredor`, `modulos` = n.º de colunas e `niveis` = altura de cada prateleira, de baixo para cima). Para um armário use `"tipo": "armario"` (ids `AR01`, `AR02`…). Depois corra `node scripts/gerar-localizacoes.mjs`: as células e os códigos `1B…` são criados automaticamente.

### Fotografias e modelos 3D

- Fotos gerais: `public/assets/armazem/`. Fotos das estruturas: `public/assets/localizacoes/`. Fotos das peças: `public/assets/pecas/` (crie também uma miniatura `-thumb.jpg` de ~320 px).
- Modelos 3D: coloque o `.glb` em `public/assets/modelos-3d/` e preencha `"modelo3D": "/assets/modelos-3d/ficheiro.glb"`. O visualizador só carrega quando a ficha é aberta.

## Modo de edição local — limitações

Não existe servidor. As alterações feitas na interface ficam **apenas no `localStorage` deste navegador**:

- não são partilhadas com outros utilizadores nem dispositivos e desaparecem se os dados do site forem limpos;
- **não são inventário oficial** — cada gravação exige confirmação explícita e os registos ficam marcados "criado/editado localmente", com um aviso permanente no topo;
- fotografias carregadas são reduzidas, mas o espaço é limitado (~5 MB);
- "Exportar JSON" descarrega a lista completa no formato de `parts.json`, para rever e integrar no ficheiro; "Repor dados originais" descarta tudo.

## Dados que ainda precisam de validação

Ver a lista completa em [`docs/ANALISE.md`](docs/ANALISE.md#4-dúvidas-para-confirmação-humana). Em resumo: onde ficam os corredores 1B18 e 1B19, o armário ESQ-ARM1, M100 e o escritório; se a ordem das prateleiras ARM01–ARM06 (ARM01 em baixo) está certa; esquemas das zonas 1A, 1D e 1E; medidas reais e lado da frente das estantes da 1C; em que extremo começa a coluna 01; tipo e comprimento das estantes 15–17; letra dos contentores da fila de baixo; dimensões reais; onde ficam agora os 6 artigos observados nas fotografias.

## Estrutura do projeto

```text
src/
  components/
    Header/  SearchBar/  Filters/  PartsList/  PartDetails/  LocationPanel/
    LocationNavigator/  Warehouse3D/  WarehouseControls/  Editor/  EditorPlanta/  Organograma/  Etiquetas/  Leitor/
    Recolha/  Importar/  Qualidade/  About/  common/
  utils/__tests__/   testes (npm test)
  data/        layout.json  locations.json  parts.json  composicao.json  fonte.ts
  hooks/       useInventario (dados + rascunho local)  useApp (estado de interface)  usePecasVisiveis
  types/       tipos do domínio
  utils/       planta e importacao (partilhados com os scripts), editorPlanta, composicao (organograma), ligacoes (QR e
               ligações diretas), recolha, armazenamento (IndexedDB), pesquisa, stock, geometria 3D, validação, texto, imagem
public/assets/ armazem/  localizacoes/  pecas/  modelos-3d/
scripts/       gerar-localizacoes.mjs  importar-excel.mjs
docs/          ANALISE.md
```

## Notas técnicas

- Em desenvolvimento, a consola mostra avisos "Attempted to synchronously unmount a root…" ao montar a vista 3D: vêm dos rótulos HTML do drei com o `StrictMode` do React (montagem dupla) e não ocorrem na versão de produção.
- A cena usa `frameloop="demand"` (só desenha quando algo muda) e agrupa montantes/vigas/prateleiras em `InstancedMesh`, para manter poucas chamadas de desenho.
