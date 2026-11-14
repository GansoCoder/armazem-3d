import { useState } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import { Modal } from '../common/comum'

const FOTOS = [
  { n: 1, texto: 'A partir do portão: porta-paletes de vigas amarelas, estante de vidros com etiquetas 20 e 21, caixotes Alstom.' },
  { n: 2, texto: 'Estante ligeira com cilindros e motores, contentores gradeados com etiquetas, porta-paletes da Receção e Expedição.' },
  { n: 3, texto: 'Corredor principal: Receção e Expedição à esquerda, porta-paletes amarelo e estante de vidros à direita, empilhador ao fundo.' },
  { n: 4, texto: 'Filas de estantes ligeiras ao fundo, contentores gradeados à direita.' },
]

export function SobreModelo() {
  const { setSobreAberto } = useApp()
  const { dados, pecas, localizacoes } = useInventario()
  const [foto, setFoto] = useState<number | null>(null)

  return (
    <Modal titulo="Sobre o modelo e os dados" aoFechar={() => setSobreAberto(false)} largura={860}>
      <div className="sobre">
        <section>
          <h3>O que é real e o que é estimado</h3>
          <ul className="lista-pontos">
            <li><strong>Esquema do armazém:</strong> disposição das estantes e número de cada corredor (01–17, 20 e 21), portões, porta e exemplos de localização dos contentores.</li>
            <li><strong>Lido nas fotografias e vídeos:</strong> referências 42173490, 42173428, 42173653 e R76467100; designações das etiquetas; sinal “Área de Receção e Expedição”; inscrição “494 UN”.</li>
            <li><strong>Formato de código</strong> (indicado pelo armazém): zona (<code>1B</code>, <code>1C</code>…) + corredor + prateleira (A = a mais baixa) + coluna + caixa, ex.: <code>1B09A02C</code>.</li>
            <li><strong>Estimado:</strong> dimensões do pavilhão e das estantes, larguras dos corredores, tipo das estantes 15–17, sentido de numeração das colunas (coluna 01 assumida do lado dos portões) e letra D dos contentores da fila de baixo.</li>
            <li><strong>Lista de materiais (Excel):</strong> referência, designação, posição, quantidade e valor de cada material vêm do ficheiro “materiais armazem.xlsx”. As posições cujo corredor ou zona ainda não está desenhado aparecem como “sem 3D”.</li>
            <li><strong>Por confirmar:</strong> categorias e fabricantes (não existem no Excel), localização dos corredores 1B18 e 1B19, dos armários ARM01–ARM06, de M100 e do escritório, as zonas 1D e 1E, as medidas das zonas 1C e 1A e as letras de cada palete de baixo da 1A (estimadas a partir dos esquemas), e onde ficam os artigos observados nas fotografias.</li>
          </ul>
          <p className="texto-sec">
            {pecas.length} registos ({pecas.filter((p) => p.fonte === 'excel').length} do Excel, {pecas.filter((p) => p.fonte === 'excel' && p.localizacaoId).length} com posição no 3D) · {localizacoes.length} localizações.
          </p>
        </section>

        <section>
          <h3>Vídeos usados</h3>
          <p className="texto-sec">
            Vídeo 1 (65 s) e vídeo 2 (32 s): usados na primeira versão da planta, entretanto substituída pelo esquema do armazém.
          </p>
        </section>

        <section>
          <h3>Fotografias usadas</h3>
          <div className="sobre-fotos">
            {FOTOS.map((f) => (
              <button key={f.n} onClick={() => setFoto(f.n)}>
                <img src={`/assets/armazem/foto-${f.n}-thumb.jpg`} alt={`Fotografia ${f.n}`} loading="lazy" />
                <span><strong>Foto {f.n}.</strong> {f.texto}</span>
              </button>
            ))}
          </div>
        </section>

        {dados && dados.avisos.length > 0 && (
          <section>
            <h3>Avisos de integridade dos dados</h3>
            <ul className="lista-pontos">{dados.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
          </section>
        )}

        <section>
          <h3>Como corrigir</h3>
          <p className="texto-sec">
            Posições e dimensões das estruturas: <code>src/data/layout.json</code>. Localizações: <code>src/data/locations.json</code>.
            Peças: <code>src/data/parts.json</code>. Ver o README do projeto.
          </p>
        </section>
      </div>

      {foto !== null && (
        <Modal titulo={`Fotografia ${foto}`} aoFechar={() => setFoto(null)} largura={1200}>
          <img className="foto-ampliada" src={`/assets/armazem/foto-${foto}.jpg`} alt={`Fotografia ${foto} do armazém`} />
        </Modal>
      )}
    </Modal>
  )
}
