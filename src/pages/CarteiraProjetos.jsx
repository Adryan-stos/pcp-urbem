import { useEffect, useState } from 'react'
import { RefreshCw, Eye, Pencil } from 'lucide-react'
import { supabase } from '../lib/supabase'


export default function CarteiraProjetos() {
  const [itens, setItens] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [filtros, setFiltros] = useState({ projeto: '', carregamento: '', item: '', material: '', statusOP: '' , entregaInicio: '', entregaFim: '' })
  const [ordenacaoTabela, setOrdenacaoTabela] = useState({ coluna: null, direcao: null })
  const [opSelecionada, setOpSelecionada] = useState(null)
  const [processosOP, setProcessosOP] = useState([])
  const [modalOPAberta, setModalOPAberta] = useState(false)


  const itensFiltrados = itens
    .filter((item) => {
        const projetoTexto = `${item.projetos?.codigo_interno || ''} ${item.projetos?.nome_projeto || ''}`.toLowerCase()
        const carregamentoTexto = String(item.carregamentos_projeto?.numero_carregamento || '')
        const itemTexto = String(item.codigo_interno_item || '').toLowerCase()
        const materialTexto = String(item.tipo_material || '').toLowerCase()
        const temOP = item.ordens_producao?.length > 0
        const statusTexto = temOP ? 'com-op' : 'sem-op'

        const dataEntrega =
        item.carregamentos_projeto?.data_prevista ||
        item.projetos?.data_entrega ||
        ''

        const entregaOk =
        (!filtros.entregaInicio || dataEntrega >= filtros.entregaInicio) &&
        (!filtros.entregaFim || dataEntrega <= filtros.entregaFim)

        return (
        projetoTexto.includes(filtros.projeto.toLowerCase()) &&
        carregamentoTexto.includes(filtros.carregamento) &&
        itemTexto.includes(filtros.item.toLowerCase()) &&
        (!filtros.material || materialTexto.includes(filtros.material.toLowerCase())) &&
        (!filtros.statusOP || statusTexto === filtros.statusOP) &&
        entregaOk
        )
    })
    .sort((a, b) => {
    if (!ordenacaoTabela.coluna) return 0

    let valorA = ''
    let valorB = ''

    switch (ordenacaoTabela.coluna) {
        case 'projeto':
        valorA = a.projetos?.codigo_interno || ''
        valorB = b.projetos?.codigo_interno || ''
        break

        case 'item':
        valorA = a.codigo_interno_item || ''
        valorB = b.codigo_interno_item || ''
        break

        case 'volume':
        valorA = Number(a.volume_m3 || 0)
        valorB = Number(b.volume_m3 || 0)
        break

        case 'criacao':
        valorA = a.projetos?.created_at || ''
        valorB = b.projetos?.created_at || ''
        break

        case 'entrega':
        valorA =
            a.carregamentos_projeto?.data_prevista ||
            a.projetos?.data_entrega ||
            ''

        valorB =
            b.carregamentos_projeto?.data_prevista ||
            b.projetos?.data_entrega ||
            ''

        break

        default:
        return 0
    }

    if (ordenacaoTabela.direcao === 'asc') {
        return valorA > valorB ? 1 : -1
    }

    return valorA < valorB ? 1 : -1
    })

    function alternarOrdenacao(coluna) {
        setOrdenacaoTabela((atual) => {
            if (atual.coluna !== coluna) {
            return {
                coluna,
                direcao: 'asc'
            }
            }

            if (atual.direcao === 'asc') {
            return {
                coluna,
                direcao: 'desc'
            }
            }

            return {
            coluna: null,
            direcao: null
            }
        })
        }

    function renderSortIcon(coluna) {
        if (ordenacaoTabela.coluna !== coluna) {
            return '↕'
        }

        return ordenacaoTabela.direcao === 'asc'
            ? '↑'
            : '↓'
        }

  async function carregarCarteira() {
    try {
      setCarregando(true)
      setErro('')

      const { data, error } = await supabase
        .from('itens_projeto')
        .select(`
            *,
            projetos!inner (
            id,
            codigo_interno,
            nome_projeto,
            cliente,
            data_entrega,
            fase_projeto,
            ativo,
            created_at
            ),
            carregamentos_projeto (
            id,
            numero_carregamento,
            data_prevista
            ),
            ordens_producao (
            id,
            numero_op,
            status
            )
        `)
        .eq('ativo', true)
        .eq('tipo_item', 'FILHO')
        .eq('projetos.ativo', true)
        .eq('projetos.fase_projeto', 'Pronto para produção')
        .order('codigo_interno_item', { ascending: true })

      if (error) throw error

      setItens(data || [])
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarCarteira()
  }, [])

    function obterRotaPCP(item) {
        const rotas = []

        if (item.pcp_destopadeira) rotas.push('Destopo')
        if (item.pcp_cnc) rotas.push('CNC')
        if (item.pcp_acabamento) rotas.push('Acab.')

        return rotas.length ? rotas.join(' → ') : 'Não definida'
    }

    function gerarNumeroOP() {
        const agora = new Date()

        const ano = agora.getFullYear()
        const mes = String(agora.getMonth() + 1).padStart(2, '0')
        const dia = String(agora.getDate()).padStart(2, '0')
        const hora = String(agora.getHours()).padStart(2, '0')
        const minuto = String(agora.getMinutes()).padStart(2, '0')
        const segundo = String(agora.getSeconds()).padStart(2, '0')

        return `OP-${ano}${mes}${dia}-${hora}${minuto}${segundo}`
        }


    function montarProcessosOP(item, ordemProducaoId) {
        const processos = []

        const material = String(item.tipo_material || '').toUpperCase()
        const isCLT = material.includes('CLT')
        const isMLC = material.includes('MLC')

        function adicionarProcesso(sequencia, processo, recurso = null) {
            const primeiroProcesso = processos.length === 0

            processos.push({
                ordem_producao_id: ordemProducaoId,
                sequencia,
                processo,
                recurso,
                status: primeiroProcesso ? 'Liberado para programação' : 'Pendente',
                liberado_programacao: primeiroProcesso,
                prioridade: null,
                origem: 'Sugestão do sistema'
            })
        }

        if (isMLC) {
            adicionarProcesso(10, 'OTIMIZADORA/FINGER', 'OTIMIZADORA/FINGER')
            adicionarProcesso(20, 'PLAINA', 'A DEFINIR')
            adicionarProcesso(30, 'PRENSA', 'A DEFINIR')

            if (item.pcp_destopadeira) {
            adicionarProcesso(40, 'DESTOPADEIRA', 'DESTOPADEIRA')
            }

            if (item.pcp_cnc) {
            adicionarProcesso(50, 'CNC', 'CNC')
            }

            if (item.pcp_acabamento) {
            adicionarProcesso(60, 'ACABAMENTO', 'ACABAMENTO')
            }
        }

        if (isCLT) {
            adicionarProcesso(10, 'OTIMIZADORA/FINGER', 'OTIMIZADORA/FINGER')
            adicionarProcesso(20, 'PLAINA', 'A DEFINIR')
            adicionarProcesso(30, 'PRENSA', 'MINDA')
            adicionarProcesso(40, 'CNC', 'CNC')
            adicionarProcesso(50, 'ACABAMENTO', 'ACABAMENTO')
        }

        return processos
        }


    async function criarOP(item) {
        try {
            const numeroOP = gerarNumeroOP()

            const { data: opCriada, error: erroOP } = await supabase
            .from('ordens_producao')
            .insert([
                {
                numero_op: numeroOP,
                projeto_id: item.projeto_id,
                carregamento_id: item.carregamento_id,
                item_id: item.id,
                status: 'Em programação',
                volume_m3: item.volume_m3 || 0,
                ativo: true
                }
            ])
            .select()
            .single()

            if (erroOP) throw erroOP

            const processos = montarProcessosOP(item, opCriada.id)

            if (processos.length) {
            const { error: erroProcessos } = await supabase
                .from('op_processos')
                .insert(processos)

            if (erroProcessos) throw erroProcessos
            }

            await carregarCarteira()
        } catch (error) {
            alert(error.message)
        }
        }

    function classeStatusOP(status) {
        switch (status) {
            case 'Em programação':
            return 'programacao'

            case 'Em produção':
            return 'producao'

            case 'Apontado':
            return 'apontado'

            case 'Liberado':
            return 'liberado'

            case 'Cancelado':
            return 'cancelado'

            default:
            return 'sem-op'
        }
        }

    async function visualizarOP(op) {
        try {
            const { data, error } = await supabase
            .from('op_processos')
            .select('*')
            .eq('ordem_producao_id', op.id)
            .order('sequencia')

            if (error) throw error

            setOpSelecionada(op)
            setProcessosOP(data || [])
            setModalOPAberta(true)

        } catch (error) {
            alert(error.message)
        }
        }

        function classeProcessoStatus(status) {
        switch (status) {
            case 'Finalizado':
            return 'finalizado'

            case 'Programado':
            return 'programado'

            case 'Em produção':
            return 'producao'

            case 'Atrasado':
            return 'atrasado'

            case 'Bloqueado':
            return 'bloqueado'

            default:
            return 'pendente'
        }
        }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Programação</p>
          <h2>Carteira de Projetos</h2>
          <span>Itens disponíveis para geração de O.P e talões de processo.</span>
        </div>

        <button className="btn ghost" onClick={carregarCarteira} disabled={carregando}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </header>

      {erro && <div className="alert">{erro}</div>}

        <section className="form-card carteira-filter-card">
        <div className="carteira-filter-header">
            <div>
            <h3>Filtros</h3>
            <span>Refine os itens liberados para geração de O.P.</span>
            </div>

            <button
            type="button"
            className="filter-clear"
            onClick={() =>
                setFiltros({
                projeto: '',
                carregamento: '',
                item: '',
                material: '',
                statusOP: '',
                entregaInicio: '',
                entregaFim: ''
                })
            }
            >
            Limpar
            </button>
        </div>

        <div className="carteira-filter-grid">
            <input
            placeholder="Projeto"
            value={filtros.projeto}
            onChange={(e) => setFiltros({ ...filtros, projeto: e.target.value })}
            />

            <input
            placeholder="Carregamento"
            value={filtros.carregamento}
            onChange={(e) => setFiltros({ ...filtros, carregamento: e.target.value })}
            />

            <input
            placeholder="Item"
            value={filtros.item}
            onChange={(e) => setFiltros({ ...filtros, item: e.target.value })}
            />

            <select
            value={filtros.material}
            onChange={(e) => setFiltros({ ...filtros, material: e.target.value })}
            >
            <option value="">Material</option>
            <option value="MLC">MLC</option>
            <option value="CLT">CLT</option>
            </select>

            <select
            value={filtros.statusOP}
            onChange={(e) => setFiltros({ ...filtros, statusOP: e.target.value })}
            >
            <option value="">Status OP</option>
            <option value="sem-op">Sem OP</option>
            <option value="com-op">Com OP</option>
            </select>

            <div className="filter-date-group">
            <span>Período de entrega</span>

            <div className="filter-date-fields">
                <label>
                De
                <input
                    type="date"
                    value={filtros.entregaInicio}
                    onChange={(e) =>
                    setFiltros({ ...filtros, entregaInicio: e.target.value })
                    }
                />
                </label>

                <label>
                Até
                <input
                    type="date"
                    value={filtros.entregaFim}
                    onChange={(e) =>
                    setFiltros({ ...filtros, entregaFim: e.target.value })
                    }
                />
                </label>
            </div>
            </div>
        </div>
        </section>

      <section className="table-card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>
                <button
                    type="button"
                    className="sort-header"
                    onClick={() => alternarOrdenacao('projeto')}
                >
                    Projeto {renderSortIcon('projeto')}
                </button>
                </th>
                <th>
                <button
                    type="button"
                    className="sort-header"
                    onClick={() => alternarOrdenacao('carregamento')}
                >
                    Carregamento {renderSortIcon('carregamento')}
                </button>
                </th>
                <th>
                <button
                    type="button"
                    className="sort-header"
                    onClick={() => alternarOrdenacao('item')}
                >
                    Item {renderSortIcon('item')}
                </button>
                </th>
                <th>
                <button
                    type="button"
                    className="sort-header"
                    onClick={() => alternarOrdenacao('material')}
                >
                    Material {renderSortIcon('material')}
                </button>
                </th>
                <th>
                <button
                    type="button"
                    className="sort-header"
                    onClick={() => alternarOrdenacao('dimensao')}
                >
                    Dimensão {renderSortIcon('dimensao')}
                </button>
                </th>
                <th>
                <button
                    type="button"
                    className="sort-header"
                    onClick={() => alternarOrdenacao('volume')}
                >
                    M³ {renderSortIcon('volume')}
                </button>
                </th>
                <th>
                <button
                    type="button"
                    className="sort-header"
                    onClick={() => alternarOrdenacao('rota_pcp')}
                >
                    Rota PCP {renderSortIcon('rota_pcp')}
                </button>
                </th>
                <th>
                <button
                    type="button"
                    className="sort-header"
                    onClick={() => alternarOrdenacao('status_op')}
                >
                    Ordem de Produção {renderSortIcon('status_op')}
                </button>
                </th>
                    <th>
                <button
                    type="button"
                    className="sort-header"
                    onClick={() => alternarOrdenacao('status_op')}
                >
                    Status {renderSortIcon('status_op')}
                </button>
                </th>
                <th> </th>
                <th>
                    <button
                        type="button"
                        className="sort-header"
                        onClick={() => alternarOrdenacao('criacao')}
                    >
                        Criação {renderSortIcon('criacao')}
                    </button>
                </th>
                <th>
                    <button
                        type="button"
                        className="sort-header"
                        onClick={() => alternarOrdenacao('entrega')}
                    >
                        Entrega {renderSortIcon('entrega')}
                    </button>
                </th>
              </tr>
            </thead>

            <tbody>
            {itensFiltrados.map((item) => {
                const temOP = item.ordens_producao?.length > 0
                const op = temOP ? item.ordens_producao[0] : null

                return (
                <tr key={item.id}>
                    <td>
                    <strong>{item.projetos?.codigo_interno || '-'}</strong>
                    <br />
                    <small>{item.projetos?.nome_projeto || '-'}</small>
                    </td>

                    <td>
                    {item.carregamentos_projeto
                        ? `Carregamento ${item.carregamentos_projeto.numero_carregamento}`
                        : '-'}
                    </td>

                    <td>{item.codigo_interno_item}</td>
                    <td>{item.tipo_material}</td>

                    <td>
                    {item.base_mm || '-'} x {item.altura_mm || '-'} x {item.comprimento_mm || '-'}
                    </td>

                    <td>{item.volume_m3 || '-'}</td>
                    <td>{obterRotaPCP(item)}</td>

                    <td>
                        {op?.numero_op || '-'}
                    </td>

                    <td>
                        {op ? (
                            <span className={`op-status ${classeStatusOP(op.status)}`}>
                            {op.status}
                            </span>
                        ) : (
                            <span className="op-status sem-op">
                            Sem OP
                            </span>
                        )}
                    </td>

                    <td>
                    {op ? (
                        <div className="table-actions">
                        <button
                            type="button"
                            className="table-icon-action"
                            onClick={() => visualizarOP(op)}
                            title="Visualizar OP"
                        >
                            <Eye size={16} />
                        </button>
                        </div>
                    ) : (
                        <button
                        type="button"
                        className="table-action"
                        onClick={() => criarOP(item)}
                        >
                        Criar OP
                        </button>
                    )}
                    </td>

                    <td>{item.projetos?.created_at?.slice(0, 10) || '-'}</td>

                    <td>
                    {item.carregamentos_projeto?.data_prevista ||
                        item.projetos?.data_entrega ||
                        '-'}
                    </td>
                </tr>
                )
            })}

            {!itensFiltrados.length && (
                <tr>
                <td colSpan="12" className="empty">
                    Nenhum item disponível na carteira.
                </td>
                </tr>
            )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOPAberta && (
        <div className="modal-overlay">
            <div className="modal-card op-modal">

            <div className="op-modal-header">
                <div>
                <span>Ordem de Produção</span>
                <h3>{opSelecionada?.numero_op}</h3>
                </div>

                <button
                type="button"
                className="btn ghost"
                onClick={() => setModalOPAberta(false)}
                >
                Fechar
                </button>
            </div>

            <div className="op-flow">
                {processosOP.map((processo, index) => (
                    <div className="op-flow-step" key={processo.id}>
                    <div className={`op-flow-dot ${classeProcessoStatus(processo.status)}`}>
                        {processo.sequencia}
                    </div>

                    <div className="op-flow-content">
                        <strong>{processo.processo}</strong>
                        <span>{processo.recurso || 'Não definido'}</span>
                        <small>{processo.status}</small>
                    </div>

                    {index < processosOP.length - 1 && (
                        <div className="op-flow-line" />
                    )}
                    </div>
                ))}
                </div>

                <div className="op-process-list">
                {processosOP.map((processo) => (
                    <div key={processo.id} className="op-process-card">
                    <div>
                        <strong>{processo.sequencia} - {processo.processo}</strong>
                        <span>Recurso: {processo.recurso || 'Não definido'}</span>
                    </div>

                    <span className={`op-status ${classeProcessoStatus(processo.status)}`}>
                        {processo.status}
                    </span>
                    </div>
                ))}
                </div>

            </div>
        </div>
        )}      
    </div>
  )
}