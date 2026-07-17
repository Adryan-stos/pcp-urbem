import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

const CLASSES = ['C24', 'C14', 'NÃO ESTRUTURAL', 'MADEIRA ÚMIDA', 'MADEIRA TORTA']

function pacoteDoItem(item) {
  return item.pacotes_materia_prima || {}
}

function novaSaida(item) {
  const pacote = pacoteDoItem(item)
  return {
    pacote_origem_id: item.estoque_item_id,
    classe_saida: 'C24',
    espessura_mm: pacote.espessura_mm || '',
    largura_mm: pacote.largura_mm || '',
    comprimento_mm: pacote.comprimento_mm || '',
    quantidade_saida: item.quantidade_prevista || ''
  }
}

export default function ModalClassificacaoLote({ aberto, opLote, carregando, onCancelar, onConfirmar }) {
  const itens = useMemo(
    () => (opLote?.op_lote_itens || []).filter((item) => item.status === 'Reservado'),
    [opLote]
  )
  const [saidas, setSaidas] = useState([])
  const [perdas, setPerdas] = useState({})
  const [operador, setOperador] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!aberto) return
    setSaidas(itens.map(novaSaida))
    setPerdas(Object.fromEntries(itens.map((item) => [item.estoque_item_id, 0])))
    setOperador('')
    setErro('')
  }, [aberto, itens])

  if (!aberto || !opLote) return null

  function atualizarSaida(index, campo, valor) {
    setSaidas((atuais) => atuais.map((saida, i) => (
      i === index ? { ...saida, [campo]: valor } : saida
    )))
  }

  function adicionarSaida(pacoteOrigemId) {
    const item = itens.find((atual) => atual.estoque_item_id === pacoteOrigemId) || itens[0]
    if (!item) return
    setSaidas((atuais) => [...atuais, { ...novaSaida(item), quantidade_saida: '' }])
  }

  function totaisDoPacote(item) {
    const totalSaida = saidas
      .filter((saida) => saida.pacote_origem_id === item.estoque_item_id)
      .reduce((total, saida) => total + Number(saida.quantidade_saida || 0), 0)
    const perda = Number(perdas[item.estoque_item_id] || 0)
    const previsto = Number(item.quantidade_prevista || 0)
    return { totalSaida, perda, previsto, diferenca: previsto - totalSaida - perda }
  }

  function confirmar() {
    const invalidas = saidas.some((saida) =>
      !saida.pacote_origem_id ||
      !CLASSES.includes(saida.classe_saida) ||
      Number(saida.espessura_mm) <= 0 ||
      Number(saida.largura_mm) <= 0 ||
      Number(saida.comprimento_mm) <= 0 ||
      Number(saida.quantidade_saida) <= 0
    )

    if (invalidas) {
      setErro('Preencha classe, dimensões e quantidade de todas as saídas.')
      return
    }

    const divergente = itens.find((item) => totaisDoPacote(item).diferenca !== 0)
    if (divergente) {
      setErro('A soma das saídas e perdas deve ser igual à quantidade reservada de cada pacote.')
      return
    }

    onConfirmar({
      operador,
      saidas: saidas.map((saida) => ({
        ...saida,
        espessura_mm: Number(saida.espessura_mm),
        largura_mm: Number(saida.largura_mm),
        comprimento_mm: Number(saida.comprimento_mm),
        quantidade_saida: Number(saida.quantidade_saida)
      })),
      perdas: itens.map((item) => ({
        pacote_origem_id: item.estoque_item_id,
        quantidade_perda: Number(perdas[item.estoque_item_id] || 0)
      }))
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card classificacao-modal">
        <div className="op-modal-header">
          <div>
            <span>Classificadora</span>
            <h3>Finalizar classificação</h3>
            <small>{opLote.numero_op_lote}</small>
          </div>
          <button type="button" className="btn ghost" onClick={onCancelar}>Fechar</button>
        </div>

        {erro && <div className="alert">{erro}</div>}

        <label className="classificacao-operador">
          Operador
          <input value={operador} onChange={(event) => setOperador(event.target.value)} placeholder="Nome do operador" />
        </label>

        <div className="classificacao-pacotes">
          {itens.map((item) => {
            const pacote = pacoteDoItem(item)
            const totais = totaisDoPacote(item)
            const codigo = pacote.codigo_pacote || pacote.codigo_item || item.estoque_item_id
            return (
              <section className="classificacao-pacote" key={item.id}>
                <header>
                  <div>
                    <strong>{codigo}</strong>
                    <span>{pacote.especie} {pacote.classe} • {pacote.espessura_mm} × {pacote.largura_mm} × {pacote.comprimento_mm} mm</span>
                  </div>
                  <div className={`classificacao-saldo ${totais.diferenca === 0 ? 'ok' : 'pendente'}`}>
                    <span>Reservado: {totais.previsto}</span>
                    <strong>{totais.diferenca === 0 ? 'Fechado' : `Faltam ${totais.diferenca}`}</strong>
                  </div>
                </header>

                <div className="classificacao-saida-legenda" aria-hidden="true">
                  <span>Classe</span>
                  <span>Espessura (mm)</span>
                  <span>Largura (mm)</span>
                  <span>Comprimento (mm)</span>
                  <span>Quantidade</span>
                  <span />
                </div>

                {saidas.map((saida, index) => saida.pacote_origem_id === item.estoque_item_id && (
                  <div className="classificacao-saida-grid" key={`${item.id}-${index}`}>
                    <select value={saida.classe_saida} onChange={(e) => atualizarSaida(index, 'classe_saida', e.target.value)}>
                      {CLASSES.map((classe) => <option key={classe}>{classe}</option>)}
                    </select>
                    <input type="number" min="0.01" step="0.01" value={saida.espessura_mm} onChange={(e) => atualizarSaida(index, 'espessura_mm', e.target.value)} placeholder="Espessura" />
                    <input type="number" min="0.01" step="0.01" value={saida.largura_mm} onChange={(e) => atualizarSaida(index, 'largura_mm', e.target.value)} placeholder="Largura" />
                    <input type="number" min="0.01" step="0.01" value={saida.comprimento_mm} onChange={(e) => atualizarSaida(index, 'comprimento_mm', e.target.value)} placeholder="Comprimento" />
                    <input type="number" min="1" step="1" value={saida.quantidade_saida} onChange={(e) => atualizarSaida(index, 'quantidade_saida', e.target.value)} placeholder="Quantidade" />
                    <button type="button" className="icon-button" onClick={() => setSaidas((atuais) => atuais.filter((_, i) => i !== index))} aria-label="Excluir saída">
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}

                <div className="classificacao-pacote-actions">
                  <button type="button" className="btn ghost" onClick={() => adicionarSaida(item.estoque_item_id)}>
                    <Plus size={16} /> Nova classificação
                  </button>
                  <label>
                    Perda
                    <input type="number" min="0" step="1" value={perdas[item.estoque_item_id] ?? 0} onChange={(e) => setPerdas((atuais) => ({ ...atuais, [item.estoque_item_id]: e.target.value }))} />
                  </label>
                </div>
              </section>
            )
          })}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancelar}>Cancelar</button>
          <button type="button" className="btn primary" onClick={confirmar} disabled={carregando}>
            {carregando ? 'Finalizando...' : 'Finalizar e gerar pacotes'}
          </button>
        </div>
      </div>
    </div>
  )
}
