import { useEffect, useState } from 'react'
import { Plus, ChevronDown, ChevronRight, Pencil} from 'lucide-react'
import { supabase } from '../lib/supabase'


export default function DetalheProjeto({ projeto, voltar }) {
  const [abaAtual, setAbaAtual] = useState('informacoes')
  const [carregamentos, setCarregamentos] = useState([])
  const [novoCarregamento, setNovoCarregamento] = useState({numero_carregamento: '',data_prevista: '',observacoes: ''})
  const [itensDisponiveis, setItensDisponiveis] = useState([])
  const [itemSelecionado, setItemSelecionado] = useState(null)
  const [carregamentoSelecionado, setCarregamentoSelecionado] = useState('')
  const [todosItensFilhos, setTodosItensFilhos] = useState([])
  const [decisaoPCP, setDecisaoPCP] = useState({ pcp_cnc: false, pcp_destopadeira: false, pcp_acabamento: true })
  const [carregamentosAbertos, setCarregamentosAbertos] = useState({})
  const [editandoCarregamentoItem, setEditandoCarregamentoItem] = useState(false)
  const [novoCarregamentoItem, setNovoCarregamentoItem] = useState('')
  const [filtrosItens, setFiltrosItens] = useState({ codigo: '', material: '',carregamento: '' })
  

  async function carregarItensProjeto() {
    const { data, error } = await supabase
      .from('itens_projeto')
      .select(`
        *,
        ordens_producao (
          id,
          numero_op,
          status,
          op_processos (
            id,
            processo,
            recurso,
            sequencia,
            status,
            status_pcp,
            prioridade,
            data_prevista_inicio,
            data_prevista_fim
          )
        )
      `)
      .eq('projeto_id', projeto.id)
      .eq('ativo', true)
      .eq('tipo_item', 'FILHO')
      .order('codigo_interno_item', { ascending: true })

    if (error) return

    const todos = data || []

    setTodosItensFilhos(todos)

    setItensDisponiveis(
      todos.filter((item) => !item.carregamento_id)
    )
  }
  async function vincularItemCarregamento(event) {
    event.preventDefault()

    if (!itemSelecionado || !carregamentoSelecionado) return

    const { error } = await supabase
      .from('itens_projeto')
      .update({
          carregamento_id: carregamentoSelecionado,
          pcp_cnc: decisaoPCP.pcp_cnc,
          pcp_destopadeira: decisaoPCP.pcp_destopadeira,
          pcp_acabamento: decisaoPCP.pcp_acabamento
        })
      .eq('id', itemSelecionado)

    if (error) {
      alert(error.message)
      return
    }

    setItemSelecionado(null)
    setCarregamentoSelecionado('')
    setDecisaoPCP({ pcp_cnc: false, pcp_destopadeira: false, pcp_acabamento: true })
    carregarItensProjeto()
  }

function contarItensDoCarregamento(carregamentoId) {
          const itens = todosItensFilhos.filter(
            (item) => item.carregamento_id === carregamentoId
          )

          const total = itens.length

          const itensMLC = itens.filter((item) =>
            String(item.tipo_material || '')
              .toUpperCase()
              .includes('MLC')
          )

          const itensCLT = itens.filter((item) =>
            String(item.tipo_material || '')
              .toUpperCase()
              .includes('CLT')
          )

          const mlc = itensMLC.length
          const clt = itensCLT.length

          const volumeMLC = itensMLC.reduce(
            (total, item) => total + Number(item.volume_m3 || 0),
            0
          )

          const volumeCLT = itensCLT.reduce(
            (total, item) => total + Number(item.volume_m3 || 0),
            0
          )

          const volumeTotal = volumeMLC + volumeCLT

          return {
            total,
            mlc,
            clt,
            volumeMLC,
            volumeCLT,
            volumeTotal
          }
        }


  async function carregarCarregamentos() {
          const { data, error } = await supabase
            .from('carregamentos_projeto')
            .select('*')
            .eq('projeto_id', projeto.id)
            .eq('ativo', true)
            .order('numero_carregamento', { ascending: true })

          if (!error) setCarregamentos(data || [])
        }

        useEffect(() => {
          carregarCarregamentos()
          carregarItensProjeto()
        }, [projeto.id])

      function calcularPrioridade(dataEntrega) {
          if (!dataEntrega) return 'Em análise'

          const hoje = new Date()
          const entrega = new Date(`${dataEntrega}T00:00:00`)
          const diffMs = entrega - hoje
          const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

          if (dias < 0) return 'Crítica'
          if (dias <= 7) return 'Crítica'
          if (dias <= 14) return 'Alta'
          if (dias <= 30) return 'Normal'
          return 'Baixa'
        }

      function classePrioridade(prioridade) {
          return prioridade
            .toLowerCase()
            .replace('í', 'i')
            .replace('á', 'a')
            .replace(' ', '-')
        }

        async function criarCarregamento(event) {
          event.preventDefault()

          const payload = {
            projeto_id: projeto.id,
            numero_carregamento: Number(novoCarregamento.numero_carregamento),
            nome_carregamento: `Carregamento ${novoCarregamento.numero_carregamento}`,
            data_prevista: novoCarregamento.data_prevista,
            observacoes: novoCarregamento.observacoes
          }

          console.log('Enviando carregamento:', payload)

          const { error } = await supabase
            .from('carregamentos_projeto')
            .insert([payload])

          if (error) {
            console.error(error)
            alert(error.message)
            return
          }

          setNovoCarregamento({
            numero_carregamento: '',
            data_prevista: '',
            observacoes: ''
          })

          carregarCarregamentos()
        }


      function obterStatusPlanejamento(item, carregamentos) {
            const carregamentoPCP = carregamentos.find(
              (c) => c.id === item.carregamento_id
            )

            if (!carregamentoPCP) {
              return {
                texto: 'Sem vínculo',
                classe: 'status-sem-vinculo'
              }
            }

            const engenharia = Number(item.carregamento_engenharia)
            const pcp = Number(carregamentoPCP.numero_carregamento)

            if (engenharia === pcp) {
              return {
                texto: 'Conforme',
                classe: 'status-conforme'
              }
            }

            if (pcp > engenharia) {
              return {
                texto: 'Reprogramado',
                classe: 'status-reprogramado'
              }
            }

            return {
              texto: 'Antecipado',
              classe: 'status-antecipado'
            }
          }

      function calcularResumoItens() {
            const itensMLC = todosItensFilhos.filter((item) =>
              String(item.tipo_material || '').toUpperCase().includes('MLC')
            )

            const itensCLT = todosItensFilhos.filter((item) =>
              String(item.tipo_material || '').toUpperCase().includes('CLT')
            )

            const volumeMLC = itensMLC.reduce(
              (total, item) => total + Number(item.volume_m3 || 0),
              0
            )

            const volumeCLT = itensCLT.reduce(
              (total, item) => total + Number(item.volume_m3 || 0),
              0
            )

            return {
              qtdMLC: itensMLC.length,
              qtdCLT: itensCLT.length,
              qtdTotal: todosItensFilhos.length,
              volumeMLC,
              volumeCLT,
              volumeTotal: volumeMLC + volumeCLT
            }
          }

    function alternarCarregamento(carregamentoId) {
                        setCarregamentosAbertos((atual) => ({
                          ...atual,
                          [carregamentoId]: !atual[carregamentoId]
                        }))
                      }

                      function obterItensDoCarregamento(carregamentoId) {
                        return todosItensFilhos.filter(
                          (item) => item.carregamento_id === carregamentoId
                        )
                      }

                      function obterRotaPCP(item) {
                        const rotas = []

                        if (item.pcp_destopadeira) rotas.push('Destopo')
                        if (item.pcp_cnc) rotas.push('CNC')
                        if (item.pcp_acabamento) rotas.push('Acab.')

                        return rotas.length ? rotas.join(' + ') : 'Não definida'
                      }

                      function calcularProgressoCarregamento(contagem) {
                        if (!contagem.total) {
                          return 0
                        }

                        return Math.round((contagem.concluidos || 0) / contagem.total * 100)
      
                      }

                      const resumoItens = calcularResumoItens()
                      
              const itensFiltrados = todosItensFilhos.filter((item) => {
              const carregamento = carregamentos.find(
                (c) => c.id === item.carregamento_id
              )

              const codigoOk = String(item.codigo_interno_item || '')
                .toLowerCase()
                .includes(filtrosItens.codigo.toLowerCase())

              const materialOk = !filtrosItens.material ||
                String(item.tipo_material || '').toLowerCase().includes(filtrosItens.material.toLowerCase())

              const carregamentoOk = !filtrosItens.carregamento ||
                String(carregamento?.numero_carregamento || '') === filtrosItens.carregamento

              return codigoOk && materialOk && carregamentoOk
            })
          
          

  return (
    <div className="page">
      <div className="project-detail-header">
        <button
          type="button"
          className="back-link"
          onClick={voltar}
        >
          ← Projetos
        </button>

        <div className="project-title-block">
          <span className="eyebrow">Projeto</span>

          <div className="project-title-row">
            <strong>{projeto.codigo_interno}</strong>
            <h2>{projeto.nome_projeto}</h2>
          </div>

        <div className="project-subinfo">
          <span>Cliente: {projeto.cliente || '-'}</span>
          <span>Entrega: {projeto.data_entrega || '-'}</span>
        </div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${abaAtual === 'informacoes' ? 'active' : ''}`}
          onClick={() => setAbaAtual('informacoes')}
        >
          Informações
        </button>

        <button
          className={`tab ${abaAtual === 'carregamentos' ? 'active' : ''}`}
          onClick={() => setAbaAtual('carregamentos')}
        >
          Carregamentos
        </button>

        <button
          className={`tab ${abaAtual === 'itens' ? 'active' : ''}`}
          onClick={() => setAbaAtual('itens')}
        >
          Itens
        </button>

        <button
          className={`tab ${abaAtual === 'producao' ? 'active' : ''}`}
          onClick={() => setAbaAtual('producao')}
        >
          Produção
        </button>
      </div>

      {abaAtual === 'informacoes' && (
        <section className="form-card">
          <h3>Informações do Projeto</h3>

          <div className="project-info-grid">
            <div>
              <span>Código interno</span>
              <strong>{projeto.codigo_interno}</strong>
            </div>

            <div>
              <span>Código do projeto</span>
              <strong>{projeto.codigo_projeto}</strong>
            </div>

            <div>
              <span>Cliente</span>
              <strong>{projeto.cliente || '-'}</strong>
            </div>

            <div>
              <span>Comercial</span>
              <strong>{projeto.comercial || '-'}</strong>
            </div>

            <div>
              <span>Entrega</span>
              <strong>{projeto.data_entrega || '-'}</strong>
            </div>

            <div>
              <span>Fase</span>
              <strong>{projeto.fase_projeto || '-'}</strong>
            </div>
          </div>
        </section>
      )}

      {abaAtual === 'carregamentos' && (
        <div className="carregamentos-layout">
          <form className="form-card carregamento-form" onSubmit={criarCarregamento}>
            <h3>Novo Carregamento</h3>

            <div className="form-grid">
              <label>
                Número
                <input
                  type="number"
                  min="1"
                  value={novoCarregamento.numero_carregamento}
                  onChange={(e) =>
                    setNovoCarregamento({
                      ...novoCarregamento,
                      numero_carregamento: e.target.value
                    })
                  }
                  placeholder="Ex: 1"
                  required
                />
              </label>

              <label>
                Data de entrega
                <input
                  type="date"
                  value={novoCarregamento.data_prevista}
                  onChange={(e) =>
                    setNovoCarregamento({
                      ...novoCarregamento,
                      data_prevista: e.target.value
                    })
                  }
                  required
                />
              </label>

              <label className="full">
                Observações
                <textarea
                  value={novoCarregamento.observacoes}
                  onChange={(e) =>
                    setNovoCarregamento({
                      ...novoCarregamento,
                      observacoes: e.target.value
                    })
                  }
                  placeholder="Observações sobre este carregamento..."
                />
              </label>
            </div>

            <button className="primary-button compact-button" type="submit">
              <Plus size={16} />
              Adicionar carregamento
            </button>
          </form>

          <section className="carregamentos-grid">

                  
            {carregamentos.map((carregamento) => {
              const prioridade = calcularPrioridade(carregamento.data_prevista)
              const contagem = contarItensDoCarregamento(carregamento.id)
              const aberto = !!carregamentosAbertos[carregamento.id]
              const itensCarregamento = obterItensDoCarregamento(carregamento.id)

              
              return (
                    <div
                      className={`carregamento-card ${aberto ? 'open' : ''}`}
                      key={carregamento.id}
                      onClick={() => alternarCarregamento(carregamento.id)}
                    >
                      <div className="carregamento-card-header">
                        <div>
                          <span>Carregamento</span>
                          <strong>{carregamento.numero_carregamento}</strong>
                        </div>

                        <div className="carregamento-header-right">
                          <span className={`priority ${classePrioridade(prioridade)}`}>
                            {prioridade}
                          </span>

                          {aberto ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                      </div>

                      <div className="carregamento-card-body">
                        <p>
                          <span>Entrega</span>
                          <strong>{carregamento.data_prevista || '-'}</strong>
                        </p>

                        <p>
                          <span>Itens vinculados</span>
                          <strong>{contagem.total}</strong>
                        </p>

                        <div className="carregamento-material-counts">
                          <div>
                            <span>MLC</span>
                            <strong>{contagem.mlc}</strong>
                          </div>

                          <div>
                            <span>CLT</span>
                            <strong>{contagem.clt}</strong>
                          </div>
                        </div>
                        
                        <div className="carregamento-volume-info">
                          <div>
                            <span>M³ MLC</span>
                            <strong>{contagem.volumeMLC.toFixed(2)}</strong>
                          </div>

                          <div>
                            <span>M³ CLT</span>
                            <strong>{contagem.volumeCLT.toFixed(2)}</strong>
                          </div>

                          <div>
                            <span>Total</span>
                            <strong>{contagem.volumeTotal.toFixed(2)}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="carregamento-progress">
                        <div className="progress-header">
                          <span>Progresso do carregamento</span>
                          <strong>{calcularProgressoCarregamento(contagem)}%</strong>
                        </div>

                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{ width: `${calcularProgressoCarregamento(contagem)}%` }}
                          />
                        </div>
                      </div>

              

                      {aberto && (
                        <div className="carregamento-items">
                          {itensCarregamento.map((item) => (
                            <div className="carregamento-item" key={item.id}>
                              <div>
                                <strong>{item.codigo_interno_item}</strong>
                                <span>
                                  {item.base_mm || '-'} x {item.altura_mm || '-'} x {item.comprimento_mm || '-'}
                                </span>
                              </div>

                              <div className="item-route">
                                {obterRotaPCP(item)}
                              </div>
                            </div>
                          ))}

                          {!itensCarregamento.length && (
                            <p className="empty carregamento-empty">
                              Nenhum item vinculado a este carregamento.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
            })}

            {!carregamentos.length && (
              <div className="empty-card">
                Nenhum carregamento cadastrado para este projeto.
              </div>
            )}
          </section>
        </div>
      )}

      {abaAtual === 'itens' && (
  <div className="itens-operacional">
    <section className="itens-kpi-grid">
      <div className="kpi-card">
        <span>Total de Itens</span>
        <strong>{resumoItens.qtdTotal}</strong>
        <small>{resumoItens.volumeTotal.toFixed(2)} m³ total</small>
      </div>

      <div className="kpi-card">
        <span>MLC</span>
        <strong>{resumoItens.qtdMLC}</strong>
        <small>{resumoItens.volumeMLC.toFixed(2)} m³</small>
      </div>

      <div className="kpi-card">
        <span>CLT</span>
        <strong>{resumoItens.qtdCLT}</strong>
        <small>{resumoItens.volumeCLT.toFixed(2)} m³</small>
      </div>

      <div className="kpi-card">
        <span>Volume Médio</span>
        <strong>
          {resumoItens.qtdTotal
            ? (resumoItens.volumeTotal / resumoItens.qtdTotal).toFixed(2)
            : '0.00'}
        </strong>
        <small>m³ por item</small>
      </div>
    </section>

    <section className="itens-workspace">
      <div className="form-card itens-list-card">
        <h3>Lista de Itens</h3>
            <div className="itens-filter">
              <input
                placeholder="Buscar código"
                value={filtrosItens.codigo}
                onChange={(e) =>
                  setFiltrosItens({ ...filtrosItens, codigo: e.target.value })
                }
              />

              <select
                value={filtrosItens.material}
                onChange={(e) =>
                  setFiltrosItens({ ...filtrosItens, material: e.target.value })
                }
              >
                <option value="">Material</option>
                <option value="MLC">MLC</option>
                <option value="CLT">CLT</option>
              </select>

              <select
                value={filtrosItens.carregamento}
                onChange={(e) =>
                  setFiltrosItens({ ...filtrosItens, carregamento: e.target.value })
                }
              >
                <option value="">Carregamento</option>
                {carregamentos.map((carregamento) => (
                  <option
                    key={carregamento.id}
                    value={String(carregamento.numero_carregamento)}
                  >
                    Carregamento {carregamento.numero_carregamento}
                  </option>
                ))}
              </select>
            </div>

        <div className="itens-list">
          {itensFiltrados.map((item) => {
            const carregamento = carregamentos.find(
              (c) => c.id === item.carregamento_id
            )

            return (
              <button
                type="button"
                key={item.id}
                className={`item-list-row ${
                  itemSelecionado?.id === item.id ? 'active' : ''
                }`}
                onClick={() => setItemSelecionado(item)}
              >
                <strong>{item.codigo_interno_item}</strong>

                <span>
                  {item.base_mm || '-'} x {item.altura_mm || '-'} x {item.comprimento_mm || '-'}
                </span>

                <small>
                  {item.tipo_material || '-'} | {carregamento
                    ? `Carregamento ${carregamento.numero_carregamento}`
                    : 'Sem carregamento'}
                </small>
              </button>
            )
          })}

          {!itensFiltrados.length && (
            <p className="empty">Nenhum item encontrado.</p>
          )}
        </div>
      </div>

      <div className="form-card item-detail-card">
        {!itemSelecionado ? (
          <div className="empty item-detail-empty">
            Selecione um item para visualizar os detalhes.
          </div>
        ) : (
          <div className="item-detail-sections">
            <section className="item-detail-section">
              <h3>Dados do Item</h3>

              <div className="item-detail-grid">
                <div>
                  <span>Código</span>
                  <strong>{itemSelecionado.codigo_interno_item}</strong>
                </div>

                <div>
                  <span>Material</span>
                  <strong>{itemSelecionado.tipo_material}</strong>
                </div>

                <div>
                  <span>Dimensão</span>
                  <strong>
                    {itemSelecionado.base_mm || '-'} x {itemSelecionado.altura_mm || '-'} x {itemSelecionado.comprimento_mm || '-'}
                  </strong>
                </div>

                <div>
                  <span>Volume</span>
                  <strong>{itemSelecionado.volume_m3 || '-'} m³</strong>
                </div>
              </div>
            </section>

            <section className="item-detail-section">
              <h3>Carregamento</h3>
              <div className="planning-box">
                <div>
                  <span>Planejamento atual</span>

                  <strong>
                    {carregamentos.find((c) => c.id === itemSelecionado.carregamento_id)
                      ? `Carregamento ${
                          carregamentos.find((c) => c.id === itemSelecionado.carregamento_id)
                            .numero_carregamento
                        }`
                      : 'Sem carregamento'}
                  </strong>

                  <small>
                    Engenharia: {itemSelecionado.carregamento_engenharia || '-'}
                  </small>
                </div>

                <button
                  type="button"
                  className="edit-link"
                  onClick={() => {
                    setEditandoCarregamentoItem(true)
                    setNovoCarregamentoItem(itemSelecionado.carregamento_id || '')
                  }}
                >
                  <Pencil size={14} />
                  Alterar
                </button>
              </div>

              {editandoCarregamentoItem && (
                <div className="planning-edit-box">
                  <strong>Atenção ao alterar o carregamento</strong>

                  <p>
                    Este item foi planejado originalmente pela Engenharia.
                    Alterar o carregamento pode impactar o planejamento de produção,
                    prioridade e acompanhamento do projeto.
                  </p>

                  <label>
                    Novo carregamento
                    <select
                      value={novoCarregamentoItem}
                      onChange={(e) => setNovoCarregamentoItem(e.target.value)}
                    >
                      <option value="">Sem carregamento</option>
                      {carregamentos.map((carregamento) => (
                        <option key={carregamento.id} value={carregamento.id}>
                          Carregamento {carregamento.numero_carregamento}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="planning-actions">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        setEditandoCarregamentoItem(false)
                        setNovoCarregamentoItem('')
                      }}
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      className="btn primary"
                      onClick={async () => {
                        const novoId = novoCarregamentoItem || null

                        const { error } = await supabase
                          .from('itens_projeto')
                          .update({ carregamento_id: novoId })
                          .eq('id', itemSelecionado.id)

                        if (error) {
                          alert(error.message)
                          return
                        }

                        const itemAtualizado = {
                          ...itemSelecionado,
                          carregamento_id: novoId
                        }

                        setItemSelecionado(itemAtualizado)

                        setTodosItensFilhos((itens) =>
                          itens.map((item) =>
                            item.id === itemSelecionado.id ? itemAtualizado : item
                          )
                        )

                        setEditandoCarregamentoItem(false)
                        setNovoCarregamentoItem('')
                      }}
                    >
                      Confirmar alteração
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="item-detail-section">
              <h3>Situação Operacional</h3>

              <div className="item-status-grid">
                <div>
                  <span>OP</span>
                  <strong>Não criada</strong>
                </div>

                <div>
                  <span>Programação</span>
                  <strong>Não programado</strong>
                </div>

                <div>
                  <span>Produção</span>
                  <strong>Não iniciada</strong>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  </div>
)}

      {abaAtual === 'producao' && (
        <section className="form-card">
          <h3>Produção</h3>
          <p>Programação e execução produtiva do projeto.</p>
        </section>
      )}
    </div>
  )
}