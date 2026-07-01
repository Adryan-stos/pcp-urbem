import { useEffect, useState } from 'react'
import { RefreshCw, Eye, Pencil, Factory, Package, Ticket} from 'lucide-react'
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
  const [masterSelecionada, setMasterSelecionada] = useState(null)
  const [abaMaster, setAbaMaster] = useState('resumo')


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

            const { data: masters, error: erroMasters } = await supabase
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
                numero_op_base,
                status
                )
            `)
            .eq('ativo', true)
            .in('tipo_item', ['PAI', 'MASTER'])
            .eq('projetos.ativo', true)
            .eq('projetos.fase_projeto', 'Pronto para produção')
            .order('codigo_interno_item', { ascending: true })

            if (erroMasters) throw erroMasters

            const idsMasters = (masters || []).map((master) => master.id)

            let filhos = []

            if (idsMasters.length) {
            const { data: filhosData, error: erroFilhos } = await supabase
                .from('itens_projeto')
                .select(`
                id,
                item_pai_id,
                codigo_interno_item,
                tipo_material,
                volume_m3,
                base_mm,
                altura_mm,
                comprimento_mm,
                pcp_destopadeira,
                pcp_cnc,
                pcp_acabamento
                `)
                .eq('ativo', true)
                .eq('tipo_item', 'FILHO')
                .in('item_pai_id', idsMasters)

            if (erroFilhos) throw erroFilhos

            filhos = filhosData || []
            }

            const mastersComFilhos = (masters || []).map((master) => ({
            ...master,
            itens_filhos: filhos.filter((filho) => filho.item_pai_id === master.id)
            }))

            setItens(mastersComFilhos)
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

    async function gerarNumeroOPBase() {
        const { data, error } = await supabase.rpc('gerar_numero_op')

        if (error) throw error

        return data
    }


    function montarProcessosOP(item, ordemProducaoId, numeroOPBase) {
        const processos = []

        const material = String(item.tipo_material || '').toUpperCase()
        const isCLT = material.includes('CLT')
        const isMLC = material.includes('MLC')

        function adicionarProcesso(sequencia, processo, recurso = null, tipoItemProcesso = 'FILHO') {
            const primeiroProcesso = processos.length === 0

            processos.push({
            ordem_producao_id: ordemProducaoId,
            sequencia,
            numero_talao: `${numeroOPBase}-${sequencia}`,
            processo,
            recurso,
            tipo_item_processo: tipoItemProcesso,
            status: primeiroProcesso ? 'Liberado para programação' : 'Pendente',
            liberado_programacao: primeiroProcesso,
            prioridade: null,
            origem: 'Sugestão do sistema'
            })
        }

        if (isMLC) {
            adicionarProcesso(10, 'OTIMIZADORA/FINGER', 'OTIMIZADORA/FINGER', 'MASTER')
            adicionarProcesso(20, 'PLAINA', 'A DEFINIR', 'MASTER')
            adicionarProcesso(30, 'PRENSA', 'A DEFINIR', 'MASTER')

            if (item.pcp_destopadeira) {
            adicionarProcesso(40, 'DESTOPADEIRA', 'DESTOPADEIRA', 'FILHO')
            }

            if (item.pcp_cnc) {
            adicionarProcesso(50, 'CNC', 'CNC', 'FILHO')
            }

            if (item.pcp_acabamento) {
            adicionarProcesso(60, 'ACABAMENTO', 'ACABAMENTO', 'FILHO')
            }
        }

        if (isCLT) {
            adicionarProcesso(10, 'OTIMIZADORA/FINGER', 'OTIMIZADORA/FINGER', 'MASTER')
            adicionarProcesso(20, 'PLAINA', 'A DEFINIR', 'MASTER')
            adicionarProcesso(30, 'PRENSA', 'MINDA', 'MASTER')
            adicionarProcesso(40, 'CNC', 'CNC', 'FILHO')
            adicionarProcesso(50, 'ACABAMENTO', 'ACABAMENTO', 'FILHO')
        }

        return processos
    }


    async function criarOP(master) {
        try {
            const numeroOPBase = await gerarNumeroOPBase()
            const numeroOP = `OP-${numeroOPBase}`

            const { data: opCriada, error: erroOP } = await supabase
            .from('ordens_producao')
            .insert([
                {
                numero_op: numeroOP,
                numero_op_base: numeroOPBase,
                projeto_id: master.projeto_id,
                carregamento_id: master.carregamento_id,
                item_id: master.id,
                item_pai_id: master.id,
                status: 'Em programação',
                volume_m3: master.volume_m3 || 0,
                ativo: true
                }
            ])
            .select()
            .single()

            if (erroOP) throw erroOP

            const processos = montarProcessosOP(master, opCriada.id, numeroOPBase)

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

        async function visualizarOP(op, master = null) {
            try {
                const { data, error } = await supabase
                .from('op_processos')
                .select('*')
                .eq('ordem_producao_id', op.id)
                .order('sequencia')

                if (error) throw error

                setOpSelecionada(op)
                setMasterSelecionada(master)
                setProcessosOP(data || [])
                setAbaMaster('resumo')
                setModalOPAberta(true)
            } catch (error) {
                alert(error.message)
            }
        }

        function classeProcessoStatus(status) {
            switch (status) {
                case 'Finalizado':
                case 'Concluído':
                return 'finalizado'

                case 'Liberado para programação':
                return 'liberado'

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

        const filhosMasterSelecionada = masterSelecionada?.itens_filhos || []

        const volumeMasterSelecionada = Number(masterSelecionada?.volume_m3 || 0)

        const volumeFilhosSelecionada = filhosMasterSelecionada.reduce((total, filho) => total + Number(filho.volume_m3 || 0), 0)

        const aproveitamentoSelecionada = volumeMasterSelecionada > 0 ? (volumeFilhosSelecionada / volumeMasterSelecionada) * 100: 0

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Programação</p>
          <h2>Carteira de Produção</h2>
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
                        onClick={() => alternarOrdenacao('master')}
                    >
                        Master {renderSortIcon('master')}
                    </button>
                    </th>

                    <th>
                    Filhos
                    </th>

                    <th>
                    <button
                        type="button"
                        className="sort-header"
                        onClick={() => alternarOrdenacao('volume')}
                    >
                        Volume Master {renderSortIcon('volume')}
                    </button>
                    </th>

                    <th>
                    Aproveitamento Previsto
                    </th>

                    <th>
                    Ordem de Produção
                    </th>

                    <th>
                    Status
                    </th>

                    <th>
                    Ações
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
                {itensFiltrados.map((master) => {
                    const temOP = master.ordens_producao?.length > 0
                    const op = temOP ? master.ordens_producao[0] : null

                    const filhos = master.itens_filhos || []

                    const volumeMaster = Number(master.volume_m3 || 0)

                    const volumeFilhos = filhos.reduce(
                    (total, filho) => total + Number(filho.volume_m3 || 0),
                    0
                    )

                    const aproveitamento =volumeMaster > 0 ? (volumeFilhos / volumeMaster) * 100 : 0

                    return (
                    <tr key={master.id}>
                        <td>
                        <strong>{master.projetos?.codigo_interno || '-'}</strong>
                        <br />
                        <small>{master.projetos?.nome_projeto || '-'}</small>
                        </td>

                        <td>
                        {master.carregamentos_projeto
                            ? `Carregamento ${master.carregamentos_projeto.numero_carregamento}`
                            : '-'}
                        </td>

                        <td>
                        <strong>{master.codigo_interno_item}</strong>
                        <br />
                        <small>
                            {master.base_mm || '-'} x {master.altura_mm || '-'} x {master.comprimento_mm || '-'}
                        </small>
                        </td>

                        <td>
                        <strong>{filhos.length}</strong>
                        <br />
                        <small>itens filhos</small>
                        </td>

                        <td>
                        <strong>{volumeMaster.toFixed(2)}</strong>
                        <br />
                        <small>m³ Master</small>
                        </td>

                        <td>
                        <strong>{volumeFilhos.toFixed(2)}</strong>
                        <br />
                        <small>{aproveitamento.toFixed(1)}% aproveit.</small>
                        </td>

                        <td>{op?.numero_op || '-'}</td>

                        <td>
                        {op ? (
                            <span className={`op-status ${classeStatusOP(op.status)}`}>
                            {op.status}
                            </span>
                        ) : (
                            <span className="op-status sem-op">Sem OP</span>
                        )}
                        </td>

                        <td>
                        {op ? (
                            <div className="table-actions">
                            <button
                                type="button"
                                className="table-icon-action"
                                onClick={() => visualizarOP(op, master)}
                                title="Visualizar OP"
                            >
                                <Eye size={16} />
                            </button>
                            </div>
                        ) : (
                            <button
                            type="button"
                            className="table-action"
                            onClick={() => criarOP(master)}
                            >
                            Criar OP
                            </button>
                        )}
                        </td>

                        <td>
                        {master.carregamentos_projeto?.data_prevista ||
                            master.projetos?.data_entrega ||
                            '-'}
                        </td>
                    </tr>
                    )
                })}

                {!itensFiltrados.length && (
                    <tr>
                    <td colSpan="10" className="empty">
                        Nenhuma Master disponível na carteira.
                    </td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
      </section>


      {modalOPAberta && (
        <div className="modal-overlay">
        <div className="modal-card op-modal master-360-modal">
            <div className="op-modal-header">
            <div>
                <span>Master 360</span>
                <h3>{masterSelecionada?.codigo_interno_item || opSelecionada?.numero_op}</h3>
            </div>

            <button
                type="button"
                className="btn ghost"
                onClick={() => setModalOPAberta(false)}
            >
                Fechar
            </button>
            </div>

            <div className="master-360-tabs">
            <button
                type="button"
                className={abaMaster === 'resumo' ? 'active' : ''}
                onClick={() => setAbaMaster('resumo')}
            >
                Resumo
            </button>

            <button
                type="button"
                className={abaMaster === 'fluxo' ? 'active' : ''}
                onClick={() => setAbaMaster('fluxo')}
            >
                Fluxo da OP
            </button>

            <button
                type="button"
                className={abaMaster === 'filhos' ? 'active' : ''}
                onClick={() => setAbaMaster('filhos')}
            >
                Filhos
            </button>

            <button
                type="button"
                className={abaMaster === 'apontamentos' ? 'active' : ''}
                onClick={() => setAbaMaster('apontamentos')}
            >
                Apontamentos
            </button>

            <button
                type="button"
                className={abaMaster === 'historico' ? 'active' : ''}
                onClick={() => setAbaMaster('historico')}
            >
                Histórico
            </button>
            </div>

            {abaMaster === 'resumo' && (
            <div className="master-360-content">
                <section className="master-summary-grid">
                <div>
                    <span>Projeto</span>
                    <strong>{masterSelecionada?.projetos?.codigo_interno || '-'}</strong>
                </div>

                <div>
                    <span>Cliente</span>
                    <strong>{masterSelecionada?.projetos?.cliente || '-'}</strong>
                </div>

                <div>
                    <span>Carregamento</span>
                    <strong>
                    {masterSelecionada?.carregamentos_projeto
                        ? `Carga ${masterSelecionada.carregamentos_projeto.numero_carregamento}`
                        : '-'}
                    </strong>
                </div>

                <div>
                    <span>OP Base</span>
                    <strong>{opSelecionada?.numero_op || '-'}</strong>
                </div>

                <div>
                    <span>Volume Master</span>
                    <strong>{volumeMasterSelecionada.toFixed(2)} m³</strong>
                </div>

                <div>
                    <span>Volume Filhos</span>
                    <strong>{volumeFilhosSelecionada.toFixed(2)} m³</strong>
                </div>

                <div>
                    <span>Aproveitamento previsto</span>
                    <strong>{aproveitamentoSelecionada.toFixed(1)}%</strong>
                </div>

                <div>
                    <span>Filhos vinculados</span>
                    <strong>{filhosMasterSelecionada.length}</strong>
                </div>
                </section>
            </div>
            )}

            {abaMaster === 'fluxo' && (
            <div className="master-360-content">
                <div className="op-flow">
                {processosOP.map((processo, index) => {
                    const statusClasse = classeProcessoStatus(processo.status)

                    const indiceAtual = processosOP.findIndex(
                        (p) => !['Finalizado', 'Concluído'].includes(p.status)
                    )

                    const processoAtual = index === indiceAtual

                    return (
                        <div
                        className={`op-flow-step ${statusClasse} ${processoAtual ? 'processo-atual' : ''}`}
                        key={processo.id}
                        >
                        <div className={`op-flow-dot ${statusClasse}`}>
                            {processo.sequencia}
                        </div>

                        <div className="op-flow-content">
                            <strong>
                            {processo.sequencia} - {processo.processo}
                            </strong>

                            <div className="processo-tags">
                            <span className="tag-processo">
                                <Factory size={13} />
                                {processo.recurso || 'A definir'}
                            </span>

                            <span className="tag-processo">
                                <Package size={13} />
                                {processo.tipo_item_processo || '-'}
                            </span>

                            <span className="tag-processo">
                                <Ticket size={13} />
                                {processo.numero_talao || '-'}
                            </span>
                            </div>

                            <small className={`processo-status ${statusClasse}`}>
                            {processo.status}
                            </small>
                        </div>
                        </div>
                    )
                })}
                </div>
            </div>
            )}

            {abaMaster === 'filhos' && (
            <div className="master-360-content">
                <div className="master-children-list">
                {filhosMasterSelecionada.map((filho) => (
                    <div className="master-child-card" key={filho.id}>
                    <div>
                        <strong>{filho.codigo_interno_item}</strong>
                        <span>
                        {filho.base_mm || '-'} x {filho.altura_mm || '-'} x {filho.comprimento_mm || '-'}
                        </span>
                    </div>

                    <div>
                        <small>{filho.tipo_material || '-'}</small>
                        <strong>{Number(filho.volume_m3 || 0).toFixed(2)} m³</strong>
                    </div>
                    </div>
                ))}

                {!filhosMasterSelecionada.length && (
                    <div className="empty">
                    Nenhum filho vinculado a esta Master.
                    </div>
                )}
                </div>
            </div>
            )}

            {abaMaster === 'apontamentos' && (
            <div className="master-360-content">
                <div className="empty">
                Apontamentos serão exibidos aqui após a estruturação do pré-apontamento e validação PCP.
                </div>
            </div>
            )}

            {abaMaster === 'historico' && (
            <div className="master-360-content">
                <div className="empty">
                Histórico da Master será exibido aqui futuramente, incluindo mudanças de status, reprogramações, sobras, peças mortas e retrabalhos.
                </div>
            </div>
            )}
        </div>
        </div>
        )}      
    </div>
  )
}