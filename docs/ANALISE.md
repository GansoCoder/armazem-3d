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

## 3a. Esquema do armazém (4/11/2026)

O responsável enviou um esquema da planta com o número de cada estante, que substitui a disposição interpretada das fotografias e vídeos:

- **Parede de cima**, com o portão 1 e o portão 2: vidros 21 e 20 (horizontais, à esquerda), porta-paletes 01 com o armário "ARM", porta-paletes 02 e os rolos brancos do corredor 03.
- **Lado esquerdo:** estante 17 encostada à parede e a fila dupla 16|15, compridas (continuam para lá do desenho).
- **Contentores de ferro** ao centro: corredor 14 à esquerda e 13 à direita, com A em cima e B e C de lado (exemplos de localização no esquema). O D, na fila de baixo, foi deduzido pela sequência; o Excel só tem 1B14A01D.
- **Estantes ligeiras costas com costas:** 12|11, 10|9, 8|7, 6|5 e o 04 sozinho, encostado à parede direita. As duas últimas estantes do 04 são armários.
- **Parede de baixo** com a porta; a parede corta o canto de baixo à direita (outra área).

No modelo:
- Medidas: 1 px do esquema ≈ 1 cm. Os corredores entre as filas de estantes ligeiras foram alargados para ~0,9 m, porque no esquema são mais estreitos do que as próprias estantes.
- Coluna 01 de cada fila no extremo de cima, do lado das etiquetas. As duas colunas de armário do corredor 04 foram consideradas a 04 e a 05: no Excel são as únicas colunas do 04 com prateleiras E–G.
- 15, 16 e 17 desenhados como porta-paletes de 4 colunas × 4 prateleiras (A–D), segundo o Excel; o tipo e o comprimento são estimados.
- Os seis artigos observados nas fotografias estavam em estruturas que deixaram de existir (porta-paletes A, Receção e Expedição, zonas de chão): ficaram com a localização por confirmar e uma nota.

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

## 3c. Zona 1C (esquema e vídeo, 13/11/2026)

- **Onde fica:** na reentrância da planta, atrás da porta da zona 1B (x −1,5 a 3,9; z 3,9 a 9). A porta de cima do esquema é a porta já existente; as estruturas da 1B não mudaram.
- **Escala:** o esquema não tem medidas. Na horizontal, a porta do esquema foi alinhada com a porta existente e a parede esquerda com a parede da 1B; na vertical, a sala ocupa a reentrância até z = 9. Todas as medidas são **estimadas**.
- **Salas:** uma parede interior com porta separa a sala de cima (1C01, 1C02|1C03 costas com costas, 1C07 e uma estante em L sem número) da sala de baixo (1C04, 1C05, 1C06 e duas mesas). A sala de baixo tem outra porta na parede direita, para zonas a acrescentar mais tarde.
- **Estantes:** estantes ligeiras metálicas como as da 1B (vídeo: etiquetas verdes 01–05, mangueiras no 05). Colunas e prateleiras pelo Excel: 01 → 4 × 8 (A–H); 02 e 03 → 3 × 6; 04 → 3 × 9 (A–I); 05 → 2 × 7; 06 → 2 × 6; 07 → 2 × 5.
- **Resultado:** 308 dos 309 materiais da 1C ficaram ligados ao 3D (só `1C07402G`, gralha, não liga).
- **Por confirmar:** o lado da frente de 1C05 e 1C06; o extremo da coluna 01 de cada estante; se a peça em L junto a 1C07 é estante (e de que corredor) ou bancada; as medidas reais.

## 3d. Zona 1A (esquema, 14/11/2026)

- **Onde fica:** do lado direito da 1B (x 10 a 17,7; z −7 a 3,9), com o **Portão 3** na parede de cima. A antiga parede direita da 1B passa a ser interior; as estruturas existentes não mudaram.
- **Escala:** a altura do esquema ocupa a parede direita da 1B; cada quadrado fica com ~1,1 m (uma palete). Medidas estimadas.
- **Paletes e letras** (`1A01A`–`1A01U`): A = garrafas de gás (em cima, à direita); B–F coluna da direita, de cima para baixo; G–P paletes de baixo, da direita para a esquerda (estas paletes têm vários materiais); Q–U coluna da esquerda, de cima para baixo. A ordem foi deduzida das posições do Excel dos materiais desenhados (17213118 = F, 17451030 = K, 17451060 = Q).
- **Materiais só com "1A" no Excel:** 17717657 (garrafas de gás) e 17213067 ficaram em A e U pelo esquema. Os outros 5 materiais só com "1A" não estão no esquema e ficam sem posição.
- **Resultado:** 17 materiais da 1A ligados ao 3D.
- **Por confirmar:** que letras estão em cada palete de baixo (o modelo assume G–H, I–K, L–M, N–O, P, da direita para a esquerda); se há porta entre a 1B e a 1A; posições exatas (a corrigir depois).

## 3e. Escritório (esquema, 14/11/2026)

- **Onde fica:** por baixo da zona 1A (x 10 a 17,7; z 3,9 a 9). A parede de baixo da 1A passa a ser interior; o resto da planta não mudou. A largura do esquema é a da 1A e a altura vai até à parede de baixo do edifício. Medidas estimadas.
- **Armários** (encostados à parede com a 1A, da esquerda para a direita): armário castanho pequeno, **ESQ-ARM1**, dois armários e um armário pequeno. Só o ESQ-ARM1 tem código no Excel; cada armário é uma só localização (prateleiras por confirmar).
- **Mesas:** seis mesas e uma mesa redonda, como no esquema.
- **ESCRITORIO:** os 38 materiais com esta posição no Excel ficam ligados à sala (o Excel não diz em que armário ou mesa estão). Os 3 do ESQ-ARM1 ficam no armário.
- **Por confirmar:** onde é a porta do escritório; o que guardam os outros armários e se têm código; as medidas reais.

## 4. Dúvidas para confirmação humana

**Respondido (3/11/2026):** o código oficial é zona + corredor + prateleira (A = a mais baixa) + coluna + caixa, ex.: `1B09A02C`. A zona fotografada é a **1B**; o corredor **10** é a fila EL-02. Quantidades: ignorar por agora. Faltam estantes e armários no modelo.

1. ~~Que estruturas são os corredores 1B12 e 1B15–1B17?~~ Respondido pelo esquema (4/11/2026). Falta: onde ficam **1B18** e **1B19** (contraplacado)? E as estantes 15–17 são porta-paletes? Quantas colunas têm?
1b. Os contentores da fila de baixo são o **1B14A01D** e o **1B13A01D**?
2. ~~Onde ficam os armários ARM01–ARM06?~~ No armário "ARM" junto ao portão 2 (indicação do armazém, 4/11/2026); assumido ARM01 = prateleira de baixo. **ESQ-ARM1** e o **ESCRITORIO** foram desenhados a 14/11/2026 (ver 3e). Falta a posição **M100**. O compartimento fechado com o postigo, na 1B, é outra sala?
3. Em que extremo de cada corredor começa a coluna 01? O modelo assume o extremo de cima do esquema (lado dos portões). E quantas colunas e prateleiras tem cada estante? Os valores atuais vêm do Excel.
4. ~~A zona 1C deve ser desenhada?~~ Desenhada a partir do esquema e do vídeo (13/11/2026, ver 3c). Faltam **1D** e **1E**: é preciso um esquema ou vídeo de cada uma. A **1A** foi desenhada a 14/11/2026 (ver 3d).
5. Planta real e dimensões do pavilhão; posição do portão.
6. Designação de R76467100 e qual o artigo da prateleira a que corresponde.
7. Referências dos vidros, das caixas Wärtsilä/ALSTOM, dos cilindros, motores, equipamento com isoladores e peças tipo reservatório.
8. Conteúdo e etiqueta dos contentores da fila de trás.
9. Número real de filas e módulos das estantes ligeiras e respetivo conteúdo.

## 5. Associação de fotografias

- Recortes de contentores com etiqueta colada → usados como fotografia do **contentor** da referência (tipo `contentor`).
- R76467100 → recorte marcado como **fotografia da etiqueta/localização**, não da peça.
- Artigos observados sem referência → recorte “no local” (tipo `no_local`).
- Fotografias gerais → fotografias de referência das estruturas (a janela “Sobre o modelo” foi retirada a 14/11/2026).
