import { useEffect, useState } from 'react'
import { listarEstoqueParaOPLote } from '../../services/opLoteService.js'

const DADOS_INICIAIS = {
  prioridade: '',
  dataPrevistaInicio: '',
  dataPrevistaFim: '',
  observacao: ''
}

const FILTROS_INICIAIS = { material: '', nf: '', rua: '', secao: '' }

export default function ModalOPLote({
  aberto,
  processo,
  onCancelar,
  onSalvar,
  carregando
}) {
  const [estoque, setEstoque] = useState([])
  const [erro, setErro] = useState('')
  const [dados, setDados] = useState(DADOS_INICIAIS)
  const [itensSelecionados, setItensSelecionados] = useState({})
  const [filtrosEstoque, setFiltrosEstoque] = useState(FILTROS_INICIAIS)

  const estoqueFiltrado = estoque.filter((item) => {
    const material = `${item.especie || ''} ${item.classe || ''} ${item.espessura_mm || ''} ${item.largura_mm || ''} ${item.comprimento_mm || ''}`.toLowerCase()

    return (
      material.includes(filtrosEstoque.material.toLowerCase()) &&
      String(item.recebimentos_materia_prima?.numero_nf || '').includes(filtrosEstoque.nf) &&
      String(item.rua || '').toLowerCase().includes(filtrosEstoque.rua.toLowerCase()) &&
      String(item.secao || '').includes(filtrosEstoque.secao)
    )
  })

  useEffect(() => {
    if (!aberto || !processo) return

    let ativo = true

    setDados(DADOS_INICIAIS)
    setItensSelecionados({})
    setFiltrosEstoque(FILTROS_INICIAIS)
    setEstoque([])

    async function carregarEstoque() {
      try {
        setErro('')
        const dadosEstoque = await listarEstoqueParaOPLote(processo)
        if (ativo) setEstoque(dadosEstoque)
      } catch (error) {
        if (ativo) setErro(error.message)
      }
    }

    carregarEstoque()

    return () => {
      ativo = false
    }
  }, [aberto, processo])

  function alterarItem(itemId, campo, valor) {
    setItensSelecionados((atuais) => ({
      ...atuais,
      [itemId]: {
        ...atuais[itemId],
        [campo]: valor
      }
    }))
  }

  function confirmar() {
    const itens = Object.entries(itensSelecionados)
      .filter(([, item]) => item.selecionado)
      .map(([estoqueItemId, item]) => {
        const estoqueItem = estoque.find((e) => e.id === estoqueItemId)
        const quantidade = Number(item.quantidade_prevista || 0)

        return {
          estoque_item_id: estoqueItemId,
          quantidade_prevista: quantidade,
          quantidade_disponivel: Number(estoqueItem?.quantidade_disponivel || 0)
        }
      })
      .filter((item) => item.quantidade_prevista > 0)

    if (!itens.length) {
      setErro('Selecione pelo menos um item e informe a quantidade.')
      return
    }

    const itemAcimaDoSaldo = itens.find(
      (item) => item.quantidade_prevista > item.quantidade_disponivel
    )

    if (itemAcimaDoSaldo) {
      setErro('A quantidade informada não pode ultrapassar o saldo disponível.')
      return
    }

    if (
      dados.dataPrevistaInicio &&
      dados.dataPrevistaFim &&
      new Date(dados.dataPrevistaFim) < new Date(dados.dataPrevistaInicio)
    ) {
      setErro('O fim previsto deve ser posterior ao início previsto.')
      return
    }

    const posicao = dados.prioridade === '' ? null : Number(dados.prioridade)

    if (posicao !== null && (!Number.isInteger(posicao) || posicao < 1)) {
      setErro('A posição da fila deve ser um número inteiro a partir de 1.')
      return
    }

    onSalvar({
      prioridade: posicao === null ? null : posicao - 1,
      dataPrevistaInicio: dados.dataPrevistaInicio || null,
      dataPrevistaFim: dados.dataPrevistaFim || null,
      observacao: dados.observacao || null,
      itens: itens.map(({ quantidade_disponivel, ...item }) => item)
    })
  }

  if (!aberto) return null

  return (
    <div className="modal-overlay">
      <div className="modal-card op-lote-modal">
        <div className="op-modal-header">
          <div>
            <span>Fábrica 1</span>
            <h3>Nova OP de Lote - {processo}</h3>
          </div>

          <button type="button" className="btn ghost" onClick={onCancelar}>
            Fechar
          </button>
        </div>

        {erro && <div className="alert">{erro}</div>}

        <section className="recebimento-section">
          <h4>Programação</h4>

          <div className="recebimento-form-grid">
            <label>
              Posição na fila
              <input
                type="number"
                min="1"
                step="1"
                placeholder="1 = primeira posição"
                value={dados.prioridade}
                onChange={(e) =>
                  setDados({ ...dados, prioridade: e.target.value })
                }
              />
            </label>

            <label>
              Início previsto
              <input
                type="datetime-local"
                value={dados.dataPrevistaInicio}
                onChange={(e) =>
                  setDados({ ...dados, dataPrevistaInicio: e.target.value })
                }
              />
            </label>

            <label>
              Fim previsto
              <input
                type="datetime-local"
                value={dados.dataPrevistaFim}
                onChange={(e) =>
                  setDados({ ...dados, dataPrevistaFim: e.target.value })
                }
              />
            </label>

            <label>
              Observação
              <input
                value={dados.observacao}
                onChange={(e) =>
                  setDados({ ...dados, observacao: e.target.value })
                }
              />
            </label>
          </div>
        </section>

        <section className="recebimento-section">
          <div className="recebimento-itens-header">
            <div>
              <h4>Itens disponíveis para consumo</h4>
              <span>Somente itens do buffer permitido para este processo.</span>
            </div>
          </div>
          
          <div className="op-lote-filter-grid">
            <input
              placeholder="Material / dimensão"
              value={filtrosEstoque.material}
              onChange={(e) =>
                setFiltrosEstoque({ ...filtrosEstoque, material: e.target.value })
              }
            />

            <input
              placeholder="NF"
              value={filtrosEstoque.nf}
              onChange={(e) =>
                setFiltrosEstoque({ ...filtrosEstoque, nf: e.target.value })
              }
            />

            <input
              placeholder="Rua"
              value={filtrosEstoque.rua}
              onChange={(e) =>
                setFiltrosEstoque({ ...filtrosEstoque, rua: e.target.value })
              }
            />

            <input
              placeholder="Seção"
              value={filtrosEstoque.secao}
              onChange={(e) =>
                setFiltrosEstoque({ ...filtrosEstoque, secao: e.target.value })
              }
            />
          </div>

          <div className="op-lote-estoque-list">
            {estoqueFiltrado.map((item) => {
              const selecionado = itensSelecionados[item.id]?.selecionado

              return (
                <div
                  className={`op-lote-estoque-item ${
                    selecionado ? 'selecionado' : ''
                  }`}
                  key={item.id}
                >
                  <label className="op-lote-check">
                    <input
                      type="checkbox"
                      checked={Boolean(selecionado)}
                      onChange={(e) =>
                        alterarItem(item.id, 'selecionado', e.target.checked)
                      }
                    />
                    <strong>{item.codigo_pacote || item.codigo_item || '-'}</strong>
                  </label>

                  <div>
                    <span>Material</span>
                    <strong>
                      {item.especie} {item.classe}
                    </strong>
                    <small>
                      {item.espessura_mm} x {item.largura_mm} x{' '}
                      {item.comprimento_mm}
                    </small>
                  </div>

                  <div>
                    <span>NF / Fornecedor</span>
                    <strong>
                      NF {item.recebimentos_materia_prima?.numero_nf || '-'}
                    </strong>
                    <small>
                      {item.recebimentos_materia_prima?.fornecedor || '-'}
                    </small>
                  </div>

                  <div>
                    <span>Endereço</span>
                    <strong>{item.buffer_atual || '-'}</strong>
                    <small>
                      Rua {item.rua || '-'} • Seção {item.secao || '-'}
                    </small>
                  </div>

                  <div>
                    <span>Disponível</span>
                    <strong>
                      {Number(item.quantidade_disponivel || 0).toFixed(0)} peças
                    </strong>
                    <small>
                      {Number(item.volume_disponivel_m3 || 0).toFixed(4)} m³
                    </small>
                  </div>

                  <label>
                    Qtd. Peças
                    <input
                      type="number"
                      min="1"
                      step="1"
                      disabled={!selecionado}
                      max={Number(item.quantidade_disponivel || 0)}
                      value={
                        itensSelecionados[item.id]?.quantidade_prevista || ''
                      }
                      onChange={(e) =>
                        alterarItem(
                          item.id,
                          'quantidade_prevista',
                          e.target.value
                        )
                      }
                    />
                    <small>
                      {selecionado
                        ? `${(
                            (Number(itensSelecionados[item.id]?.quantidade_prevista || 0) /
                              Number(item.quantidade_disponivel || 1)) *
                            Number(item.volume_disponivel_m3 || 0)
                          ).toFixed(4)} m³ previstos`
                        : 'Informe a quantidade em peças'}
                    </small>
                  </label>

                </div>
              )
            })}

            {!estoqueFiltrado.length && (
              <div className="empty">
                Nenhum item disponível para os filtros informados.
              </div>
            )}
          </div>
        </section>

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancelar}>
            Cancelar
          </button>

          <button
            type="button"
            className="btn primary"
            onClick={confirmar}
            disabled={carregando}
          >
            {carregando ? 'Salvando...' : 'Criar OP de lote'}
          </button>
        </div>
      </div>
    </div>
  )
}
