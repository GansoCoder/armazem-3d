# Análise dos recursos (Fase 1)

Data: 3 de novembro de 2026. Recursos recebidos: a especificação, 4 fotografias (4000 × 2252 px) e, numa segunda fase, 2 vídeos (`1000028787.mp4`, 65 s; `1000028788.mp4`, 32 s).

## 1. Inventário de recursos

| Foto | Ficheiro original | Ficheiro na app | Conteúdo |
|---|---|---|---|
| 1 | `1000028774.jpg` | `public/assets/armazem/foto-1.jpg` | Vista a partir do portão: porta-paletes de vigas amarelas, estante de vidros (etiquetas verdes **20** e **21**), extintor em suporte, 2 caixotes Alstom com módulos metálicos, porta-paletes manual, empilhador ao fundo. |
| 2 | `1000028772.jpg` | `foto-2.jpg` | Estante ligeira (cilindros, motores), etiqueta **R76467100**, contentores gradeados com etiquetas, bobina de cabo, quadro elétrico, postigo amarelo, porta-paletes da **Área de Receção e Expedição**, caixas ALSTOM em paletes. |
| 3 | `1000028773.jpg` | `foto-3.jpg` | Corredor: Receção e Expedição à esquerda, porta-paletes amarelo e estante de vidros à direita, empilhador Mitsubishi e paletes com volumes brancos ao fundo. |
| 4 | `1000028771.jpg` | `foto-4.jpg` | 6–7 filas de estantes ligeiras com pequenas etiquetas verdes (ilegíveis), contentores gradeados à direita. |

Não foram fornecidos ficheiros de inventário, plantas, dimensões nem modelos 3D.

## 2. Texto legível nas fotografias

| Onde | Texto | Confiança |
|---|---|---|
| Contentor gradeado (fotos 2, 4) | **42173490** — “Cepo freio sintético K” | Alta |
| Contentor gradeado (fotos 2, 4) | **42173428** — “Cepo freio sintético … s/ amianto” (resto ilegível) | Alta (código) / parcial (designação) |
| Mesmo contentor (foto 2) | Inscrição manual **“494 UN”** | Alta (leitura); a correspondência com a quantidade é uma interpretação |
| Contentor gradeado (foto 2, ampliada) | **42173653** — “Par de calços de freio, sem amianto” | Média-alta |
| Contentor ao fundo (foto 2) | Etiqueta ilegível | — |
| Prateleira (fotos 2, 4) | **R76467100** (sem designação) | Alta |
| Montantes azuis (fotos 1, 3) | **20**, **21** (etiquetas verdes) | Alta |
| Montante (fotos 2, 3) | “Área de Receção e Expedição” | Alta |
| Caixas | “WÄRTSILÄ”, “ALSTOM”, “Propriedade de Alstom” | Alta (marca na embalagem) |

## 3. Disposição (atualizada com os vídeos)

Os dois vídeos começam no mesmo ponto: o corredor entre as filas 11 e 10, virado para a **porta** (portão seccionado com porta pedonal).

**Vídeo 1 (para um lado da porta):**
- **Corredor 01:** porta-paletes de vigas amarelas encostado à parede da porta, com um **armário cinzento** entre ele e a porta. A etiqueta "01" está no montante junto ao armário.
- **Corredores 02 e 03:** estantes azul/laranja do outro lado da porta (caixas Philips, tubos, caixas brancas), com rolos brancos encostados.
- **Corredores 04–11:** filas de estantes ligeiras perpendiculares à parede da porta, com as etiquetas verdes no topo virado para a porta. Os números descem à medida que se afastam (11 junto aos contentores, 04 no extremo). As filas 04–08 têm caixas verdes; as 09–11 têm sacos rosa e motores.
- O 09 não aparece no vídeo; foi deduzido pela sequência.
- Há um **armário cinzento de duas portas** no fundo do corredor entre as filas 04 e 05.

**Vídeo 2 (para o outro lado):**
- **Contentores gradeados** e bobina, entre o corredor 01 e um **compartimento fechado** (paredes brancas, postigo amarelo, quadro elétrico).
- **Porta-paletes da Receção e Expedição**, comprido, do lado sul do **corredor principal**.
- **Filas de vidros 20 e 21:** duas filas paralelas com o topo (e a etiqueta) virado para o corredor principal.
- **Porta-paletes A** do lado norte do corredor principal.
- Ao fundo, **dois empilhadores** e paletes.

Ainda estimado: distâncias, dimensões, número de colunas e prateleiras de cada estante, sentido de numeração das colunas. A cena 3D mostra o aviso "não está à escala".

## 3b. Lista de materiais (Excel)

O ficheiro `materiais armazem.xlsx` tem 1996 linhas e 1906 materiais distintos (os 87 repetidos estão na mesma posição e foram somados). O relatório da importação está em [`relatorio-importacao.md`](relatorio-importacao.md).

O que se aprendeu com ele:
- **Corredores 13 e 14:** são os contentores gradeados. As três referências das etiquetas estão lá: 42173490 em 1B13A01A; 42173428 em 1B14A01A, com 483 un (a inscrição dizia 494); 42173653 em 1B14A01B.
- **Corredor 03:** a posição `1B03A` é "matéria filtrante em rolo", ou seja, os rolos brancos.
- **R76467100** é um ventilador e está em `M100`, embora a etiqueta apareça numa prateleira do corredor 11 nas fotos.
- **Prateleiras e colunas:** as dimensões dos corredores foram ajustadas às posições do Excel. Exemplos: 04–06 e 08–10 têm 5 colunas; 07 tem 6; 11 tem 4; 06 e 07 vão até à prateleira I; 01, 20 e 21 têm 2 colunas.
- **Armários:** `ARM01`–`ARM06` (e `ESQ-ARM1`) são armários com elétrodos e varetas de soldadura. O modelo só tem 2 armários, sem número.
- **Outras zonas e códigos:**
  - `1C` (corredores 01–07, 309 materiais), `1A` (produtos de limpeza), `1D` (garrafas de gás) e `1E` são outras zonas;
  - `M100` (61), `ESCRITORIO` (38) e `ND` (179) são outros códigos de posição.
- **Possíveis gralhas:** `IB07D03J`, `1B0BE03N`, `1C07402G` e uma posição vazia. A lista está no relatório.

## 4. Dúvidas para confirmação humana

**Respondido (3/11/2026):** o código oficial é zona + corredor + prateleira (A = a mais baixa) + coluna + caixa, ex.: `1B09A02C`. A zona fotografada é a **1B**; o corredor **10** é a fila EL-02. Quantidades: ignorar por agora. Faltam estantes e armários no modelo.

1. Que estruturas são os corredores **1B12** (amortecedores, motores), **1B15** (chapas de policarbonato), **1B16** (molas, borracha), **1B17** (juntas, trapos), **1B18** e **1B19** (contraplacado)? Serão o porta-paletes A, o da Receção e Expedição ou outras estantes?
2. Onde ficam os armários **ARM01–ARM06**, a posição **M100** e o **ESCRITORIO**? O compartimento fechado com o postigo é o escritório?
3. Em que extremo de cada corredor começa a coluna 01? E quantas colunas e prateleiras tem cada estante? Os valores atuais são estimados.
4. As zonas **1C**, **1A**, **1D** e **1E** devem ser desenhadas? Se sim, é preciso um vídeo ou uma planta de cada uma.
5. Planta real e dimensões do pavilhão; posição do portão.
6. Designação de R76467100 e qual o artigo da prateleira a que corresponde.
7. Referências dos vidros, das caixas Wärtsilä/ALSTOM, dos cilindros, motores, equipamento com isoladores e peças tipo reservatório.
8. Conteúdo e etiqueta dos contentores da fila de trás.
9. Número real de filas e módulos das estantes ligeiras e respetivo conteúdo.

## 5. Associação de fotografias

- Recortes de contentores com etiqueta colada → usados como fotografia do **contentor** da referência (tipo `contentor`).
- R76467100 → recorte marcado como **fotografia da etiqueta/localização**, não da peça.
- Artigos observados sem referência → recorte “no local” (tipo `no_local`).
- Fotografias gerais → fotografias de referência das estruturas e janela “Sobre o modelo”.
