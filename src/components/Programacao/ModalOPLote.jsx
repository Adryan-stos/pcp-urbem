import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { listarEstoqueParaOPLote } from '../../services/opLoteService.js'

export default function ModalOPLote({ aberto, processo,onCancelar, onSalvar, carregando }) 
{
  const [estoque, setEstoque] = useState([])
  const [erro, setErro] = useState('')
  const [dados, setDados] = useState({ prioridade: '', dataPrevistaInicio: '', dataPrevistaFim: '', observacao: '' })
  const [itensSelecionados, setItensSelecionados] = useState({})
  const [filtrosEstoque, setFiltrosEstoque] = useState({ material: '', nf: '', rua: '', secao: '' })

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

    async function carregarEstoque() {
      try {
        setErro('')
        const dadosEstoque = await listarEstoqueParaOPLote(processo)
        setEstoque(dadosEstoque)
      } catch (error) {
        setErro(error.message)
      }
    }

    carregarEstoque()
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

        const volume =
          estoqueItem?.quantidade_saldo > 0
            ? (quantidade / Number(estoqueItem.quantidade_saldo || 1)) *
              Number(estoqueItem.volume_saldo_m3 || 0)
            : 0

        return {
          estoque_item_id: estoqueItemId,
          quantidade_prevista: quantidade,
          volume_previsto_m3: volume
        }
      })
      .filter((item) => item.quantidade_prevista > 0)

    if (!itens.length) {
      setErro('Selecione pelo menos um item e informe a quantidade.')
      return
    }

    onSalvar({
      prioridade: dados.prioridade === '' ? null : Number(dados.prioridade),
      dataPrevistaInicio: dados.dataPrevistaInicio || null,
      dataPrevistaFim: dados.dataPrevistaFim || null,
      observacao: dados.observacao || null,
      itens
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
              Prioridade
              <input
                type="number"
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
                    <strong>{item.codigo_item}</strong>
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
                      {Number(item.quantidade_saldo || 0).toFixed(0)} peças
                    </strong>
                    <small>
                      {Number(item.volume_saldo_m3 || 0).toFixed(4)} m³
                    </small>
                  </div>

                  <label>
                    Qtd. Peças
                    <input
                      type="number"
                      disabled={!selecionado}
                      max={Number(item.quantidade_saldo || 0)}
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
                                Number(item.quantidade_saldo || 1)) *
                              Number(item.volume_saldo_m3 || 0)
                            ).toFixed(4)} m³ previstos`
                          : 'Informe a quantidade em peças'}
                      </small>
                  </label>

                </div>
              )
            })}

            {!estoque.length && (
              <div className="empty">
                Nenhum item disponível para este processo.
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