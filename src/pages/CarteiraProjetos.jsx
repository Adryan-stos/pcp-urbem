import { useState } from 'react'
import { RefreshCw, Eye } from 'lucide-react'
import  Master360  from '../components/Master360/Master360.jsx'
import { useCarteira } from '../hooks/useCarteira.js'



export default function CarteiraProjetos() {
  const {itens, carregando, erro, opSelecionada,processosOP, modalOPAberta, masterSelecionada, abaMaster, setAbaMaster,
        setModalOPAberta, atualizarCarteira, handleCriarOP, visualizarOP } = useCarteira()
  const [filtros, setFiltros] = useState({ projeto: '', carregamento: '', item: '', 
        material: '', statusOP: '', entregaInicio: '', entregaFim: ''})

  const [ordenacaoTabela, setOrdenacaoTabela] = useState({ coluna: null, direcao: null })

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

    function obterStatusCarteira(op) {
        const processos = op?.op_processos || []

        if (!processos.length) return 'Em programação'

        if (processos.every(p => p.status === 'Concluído'))
            return 'Concluído'

        if (processos.some(p => p.status === 'Em pausa'))
            return 'Em pausa'

        if (processos.some(p => p.status === 'Em produção'))
            return 'Em produção'

        if (processos.some(p => p.status === 'Programado'))
            return 'Em programação'

        return op.status
    }


  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Programação</p>
          <h2>Carteira de Produção</h2>
          <span>Itens disponíveis para geração de O.P e talões de processo.</span>
        </div>

        <button className="btn ghost" onClick={atualizarCarteira} disabled={carregando}>
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
                    Progresso
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
                    const processos = op?.op_processos || []
                    const totalProcessos = processos.length

                    const processosFinalizados = processos.filter( (p) => p.status === 'Concluído' ).length

                    const processoEmProducao = processos.find((p) => ['Programado', 'Em produção', 'Em pausa'].includes(p.status))

                    const percentualProgresso =
                    totalProcessos > 0 ? (processosFinalizados / totalProcessos) * 100 : 0

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
                            <span className={`op-status ${classeStatusOP(obterStatusCarteira(op))}`}>
                            {obterStatusCarteira(op)}
                            </span>
                        ) : (
                            <span className="op-status sem-op">Sem OP</span>
                        )}
                        </td>
                        <td>
                        {op ? (
                            <div className="op-progress-cell">
                            <strong>
                                {processosFinalizados}/{totalProcessos} processos
                            </strong>

                            <div className="op-progress-track">
                                <div
                                className="op-progress-fill"
                                style={{ width: `${percentualProgresso}%` }}
                                />
                            </div>

                            <small>{percentualProgresso.toFixed(0)}%</small>
                            </div>
                        ) : (
                            <span className="op-status sem-op">-</span>
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
                            onClick={() => handleCriarOP(master)}
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
                    <td colSpan="11" className="empty">
                        Nenhuma Master disponível na carteira.
                    </td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
      </section>


      {modalOPAberta && (
        <Master360
            op={opSelecionada}
            master={masterSelecionada}
            processos={processosOP}
            abaAtual={abaMaster}
            setAbaAtual={setAbaMaster}
            onClose={() => setModalOPAberta(false)}
        />
        )}      
    </div>
  )
}