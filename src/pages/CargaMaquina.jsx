import { useEffect, useState } from 'react'
import { RefreshCw, ArrowUp, ArrowDown } from 'lucide-react'
import { supabase } from '../lib/supabase'

const setores = [
  { id: 'AUTOCLAVE', label: 'Autoclave' },
  { id: 'GRADEADOR', label: 'Gradeador' },
  { id: 'ESTUFA', label: 'Estufa' },
  { id: 'CLASSIFICADORA', label: 'Classificadora' },
  { id: 'OTIMIZADORA/FINGER', label: 'Otimizadora / Finger' },
  { id: 'PLAINA', label: 'Plainas' },
  { id: 'PRENSA', label: 'Prensas' },
  { id: 'DESTOPADEIRA', label: 'Destopadeira' },
  { id: 'CNC', label: 'CNC' },
  { id: 'ACABAMENTO', label: 'Acabamento' }
]

const statusPCP = [
  'Aguardando programação',
  'Aguardando matéria-prima',
  'Aguardando manutenção',
  'Aguardando qualidade',
  'Em produção',
  'Em pausa',
  'Concluído'
]

export default function CargaMaquina() {
  const [setorAtual, setSetorAtual] = useState('AUTOCLAVE')
  const [processos, setProcessos] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [linhaArrastada, setLinhaArrastada] = useState(null)
  const [linhaSobre, setLinhaSobre] = useState(null)

  async function carregarProcessos() {
    try {
      setCarregando(true)
      setErro('')

      const { data, error } = await supabase
        .from('op_processos')
        .select(`
          *,
          ordens_producao (
            id,
            numero_op,
            status,
            volume_m3,
            itens_projeto (
              codigo_interno_item,
              tipo_material,
              base_mm,
              altura_mm,
              comprimento_mm,
              carregamentos_projeto (
                numero_carregamento,
                data_prevista
              ),
              projetos (
                codigo_interno,
                nome_projeto,
                cliente
              )
            )
          )
        `)
        .eq('ativo', true)
        .eq('liberado_programacao', true)
        .in('status', ['Liberado para programação', 'Programado', 'Em produção'])
        .order('prioridade', { ascending: true, nullsFirst: true })
        .order('ordem_fila', { ascending: true, nullsFirst: true })

      if (error) throw error

      setProcessos(data || [])
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarProcessos()
  }, [])

  const processosDoSetor = processos
    .filter((processo) => processo.processo === setorAtual || processo.recurso === setorAtual )
    .sort((a, b) => {
        const prioridadeA = a.prioridade ?? 999
        const prioridadeB = b.prioridade ?? 999

        return prioridadeA - prioridadeB
    })

  const kpis = {
    total: processosDoSetor.length,
    semProgramar: processosDoSetor.filter((p) => p.prioridade === null).length,
    atrasados: 0,
    volumeTotal: processosDoSetor.reduce(
      (total, p) => total + Number(p.ordens_producao?.volume_m3 || 0),
      0
    ),
    volumeSemProgramar: processosDoSetor
      .filter((p) => p.prioridade === null)
      .reduce((total, p) => total + Number(p.ordens_producao?.volume_m3 || 0), 0),
    projetos: new Set(
      processosDoSetor.map(
        (p) => p.ordens_producao?.itens_projeto?.projetos?.codigo_interno
      )
    ).size
  }

  async function atualizarProcesso(processoId, campos) {
    const { error } = await supabase
      .from('op_processos')
      .update(campos)
      .eq('id', processoId)

    if (error) {
      alert(error.message)
      return
    }

    carregarProcessos()
  }

  async function alterarPrioridade(processoId, prioridade) {
    const prioridadeFinal =
      prioridade === null || prioridade === '' ? null : Number(prioridade)

    await atualizarProcesso(processoId, {
      prioridade: prioridadeFinal,
      status: prioridadeFinal === null ? 'Liberado para programação' : 'Programado',
      status_pcp:
        prioridadeFinal === null ? 'Aguardando programação' : 'Aguardando programação'
    })
  }

  async function alterarDataInicio(processoId, dataInicio) {
    await atualizarProcesso(processoId, {
      data_prevista_inicio: dataInicio || null
    })
  }

  async function alterarStatusPCP(processoId, status) {
    await atualizarProcesso(processoId, {
      status_pcp: status
    })
  }

    async function reorganizarFila(processoMovido, prioridadeDestino) {
    const filaAtual = processosDoSetor
        .filter((p) => p.id !== processoMovido.id)
        .filter((p) => p.prioridade !== null && p.prioridade !== undefined)
        .sort((a, b) => Number(a.prioridade) - Number(b.prioridade))

    const filaCompactada = [...filaAtual]

    filaCompactada.splice(prioridadeDestino, 0, processoMovido)

    const programados = filaCompactada.slice(0, 11)
    const excedentes = filaCompactada.slice(11)

    for (let index = 0; index < programados.length; index++) {
        await supabase
        .from('op_processos')
        .update({
            prioridade: index,
            status: 'Programado'
        })
        .eq('id', programados[index].id)
    }

    for (const processo of excedentes) {
        await supabase
        .from('op_processos')
        .update({
            prioridade: null,
            status: 'Liberado para programação'
        })
        .eq('id', processo.id)
    }

    setLinhaArrastada(null)
    setLinhaSobre(null)
    carregarProcessos()
    }

    async function moverPrioridade(processo, direcao) {
    const prioridadeAtual = processo.prioridade

    let destino

    if (prioridadeAtual === null || prioridadeAtual === undefined) {
        if (direcao === -1) destino = 10
        else return
    } else {
        destino = Number(prioridadeAtual) + direcao
    }

    if (destino < 0) return

    if (destino > 10) {
        await atualizarProcesso(processo.id, {
        prioridade: null,
        status: 'Liberado para programação'
        })
        return
    }

    await reorganizarFila(processo, destino)
    }

    function iniciarArrasteLinha(event, processo) {
    setLinhaArrastada(processo)
    event.dataTransfer.effectAllowed = 'move'
    }

    function passarSobreLinha(event, processo) {
    event.preventDefault()
    if (processo) {
        setLinhaSobre(processo.id)
    }
    }

    async function soltarLinha(event, processoAlvo) {
    event.preventDefault()

    if (!linhaArrastada || !processoAlvo) {
        setLinhaArrastada(null)
        setLinhaSobre(null)
        return
    }

  const prioridadeDestino =
    processoAlvo.prioridade === null || processoAlvo.prioridade === undefined
      ? 10
      : Number(processoAlvo.prioridade)

    await reorganizarFila(linhaArrastada, prioridadeDestino)
    }

    async function soltarNaPosicao(event, prioridadeDestino) {
    event.preventDefault()

    if (!linhaArrastada) return

    await reorganizarFila(linhaArrastada, prioridadeDestino)
    }

    function finalizarArraste() {
        setLinhaArrastada(null)
        setLinhaSobre(null)
        }

    const posicoesFila = Array.from({ length: 11 }, (_, index) => index)

    const processosProgramados = processosDoSetor.filter(
    (processo) => processo.prioridade !== null && processo.prioridade !== undefined
    )

    const processosSemPrioridade = processosDoSetor.filter(
    (processo) => processo.prioridade === null || processo.prioridade === undefined
    )

    function obterProcessoNaPrioridade(prioridade) {
    return processosProgramados.find(
        (processo) => Number(processo.prioridade) === Number(prioridade)
    )
    }

    async function soltarNaPosicao(event, prioridadeDestino) {
        event.preventDefault()

        if (!linhaArrastada) return

        const origem = linhaArrastada.prioridade

        // Se veio de sem prioridade
        const veioSemPrioridade = origem === null || origem === undefined

        // Pega todos os processos programados do setor, exceto o arrastado
        const filaAtual = processosDoSetor
            .filter((p) => p.id !== linhaArrastada.id)
            .filter((p) => p.prioridade !== null && p.prioridade !== undefined)
            .sort((a, b) => Number(a.prioridade) - Number(b.prioridade))

        // Monta uma fila fixa de 0 a 10
        const novaFila = Array(11).fill(null)

        filaAtual.forEach((processo) => {
            const posicao = Number(processo.prioridade)

            if (posicao >= 0 && posicao <= 10) {
            novaFila[posicao] = processo
            }
        })

        // Remove buracos antes de inserir
        const filaCompactada = novaFila.filter(Boolean)

        // Insere a OP arrastada na posição desejada
        filaCompactada.splice(prioridadeDestino, 0, linhaArrastada)

        // Limita de 0 a 10
        const programados = filaCompactada.slice(0, 11)
        const excedentes = filaCompactada.slice(11)

        // Atualiza programados
        for (let index = 0; index < programados.length; index++) {
            await supabase
            .from('op_processos')
            .update({
                prioridade: index,
                status: 'Programado'
            })
            .eq('id', programados[index].id)
        }

        // Quem passou da posição 10 volta para aguardando programação
        for (const processo of excedentes) {
            await supabase
            .from('op_processos')
            .update({
                prioridade: null,
                status: 'Liberado para programação'
            })
            .eq('id', processo.id)
    }

    setLinhaArrastada(null)
    setLinhaSobre(null)
    carregarProcessos()
    }

    function renderLinhaProcesso(processo, semPrioridade = false) {
        const op = processo.ordens_producao
        const item = op?.itens_projeto
        const projeto = item?.projetos
        const carregamento = item?.carregamentos_projeto

        return (
            <tr
            key={processo.id}
            className={`
                machine-draggable-row
                ${linhaArrastada?.id === processo.id ? 'dragging' : ''}
                ${linhaSobre === processo.id ? 'drag-over' : ''}
            `}
            draggable
            onDragStart={(e) => iniciarArrasteLinha(e, processo)}
            onDragOver={(e) => passarSobreLinha(e, processo)}
            onDragLeave={() => setLinhaSobre(null)}
            onDrop={(e) => soltarLinha(e, processo)}
            onDragEnd={finalizarArraste}
            >
            <td className="priority-cell">
                {semPrioridade ? '-' : processo.prioridade}
            </td>

            <td>
                <strong>{op?.numero_op || '-'}</strong>
            </td>

            <td>
                <strong>{projeto?.codigo_interno || '-'}</strong>
                <br />
                <small>{projeto?.nome_projeto || '-'}</small>
            </td>

            <td>{carregamento?.data_prevista || '-'}</td>

            <td>
                <input
                type="datetime-local"
                value={
                    processo.data_prevista_inicio
                    ? processo.data_prevista_inicio.slice(0, 16)
                    : ''
                }
                onChange={(e) => alterarDataInicio(processo.id, e.target.value)}
                />
            </td>

            <td>
                {processo.data_prevista_fim
                ? processo.data_prevista_fim.slice(0, 16).replace('T', ' ')
                : '-'}
            </td>

            <td>
                <select
                value={processo.status_pcp || 'Aguardando programação'}
                onChange={(e) => alterarStatusPCP(processo.id, e.target.value)}
                >
                {statusPCP.map((status) => (
                    <option key={status} value={status}>
                    {status}
                    </option>
                ))}
                </select>
            </td>

            <td>
                <strong>{item?.codigo_interno_item || '-'}</strong>
                <br />
                <small>
                {item?.tipo_material || '-'} • {item?.base_mm || '-'} x {item?.altura_mm || '-'} x {item?.comprimento_mm || '-'}
                </small>
            </td>

            <td>{Number(op?.volume_m3 || 0).toFixed(2)}</td>

            <td>
                <div className="table-actions">
                <button
                    type="button"
                    className="table-icon-action"
                    onClick={() => moverPrioridade(processo, -1)}
                    title="Subir na fila"
                >
                    <ArrowUp size={15} />
                </button>

                <button
                    type="button"
                    className="table-icon-action"
                    onClick={() => moverPrioridade(processo, 1)}
                    title="Descer na fila"
                >
                    <ArrowDown size={15} />
                </button>
                </div>
            </td>
            </tr>
        )
        }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Programação</p>
          <h2>Carga Máquina</h2>
          <span>Sequenciamento operacional por setor produtivo.</span>
        </div>

        <button className="btn ghost" onClick={carregarProcessos} disabled={carregando}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </header>

      {erro && <div className="alert">{erro}</div>}

      <section className="machine-sector-tabs">
        {setores.map((setor) => (
          <button
            key={setor.id}
            type="button"
            className={`machine-sector-tab ${setorAtual === setor.id ? 'active' : ''}`}
            onClick={() => setSetorAtual(setor.id)}
          >
            {setor.label}
          </button>
        ))}
      </section>

      <section className="itens-kpi-grid">
        <div className="kpi-card">
          <span>Itens no setor</span>
          <strong>{kpis.total}</strong>
          <small>liberados para programação</small>
        </div>

        <div className="kpi-card">
          <span>Sem programar</span>
          <strong>{kpis.semProgramar}</strong>
          <small>{kpis.volumeSemProgramar.toFixed(2)} m³</small>
        </div>

        <div className="kpi-card">
          <span>Volume total</span>
          <strong>{kpis.volumeTotal.toFixed(2)}</strong>
          <small>m³ no setor</small>
        </div>

        <div className="kpi-card">
          <span>Projetos</span>
          <strong>{kpis.projetos}</strong>
          <small>com itens no setor</small>
        </div>
      </section>

      <section className="table-card">
        <div className="table-wrapper">
          <table className="machine-table">
            <thead>
                <tr>
                    <th>Prioridade</th>
                    <th>O.P</th>
                    <th>Projeto</th>
                    <th>Prazo entrega</th>
                    <th>Entrada em máquina</th>
                    <th>Previsão término</th>
                    <th>Status PCP</th>
                    <th>Item</th>
                    <th>M³</th>
                    <th>Ordem</th>
                </tr>
            </thead>

            <tbody>
            {posicoesFila.map((posicao) => {
                const processo = obterProcessoNaPrioridade(posicao)

                if (!processo) {
                return (
                    <tr key={`vazio-${posicao}`} className={`machine-empty-row ${linhaSobre === `vazio-${posicao}` ? 'drag-over' : ''}`} onDragOver={(event) => event.preventDefault()} 
                        onDragEnter={(event) => {
                        event.preventDefault()
                        setLinhaSobre(`vazio-${posicao}`)
                    }}
                    onDragLeave={() => setLinhaSobre(null)}
                    onDrop={(event) => soltarNaPosicao(event, posicao)}
                    >
                    <td className="priority-cell">{posicao}</td>
                    <td colSpan="9" className="empty">
                        Sem OP programada nesta posição.
                    </td>
                    </tr>
                )
                }

                return renderLinhaProcesso(processo)
            })}

            {processosSemPrioridade.length > 0 && (
                <tr className="machine-section-row">
                <td colSpan="10">Aguardando programação</td>
                </tr>
            )}

            {processosSemPrioridade.map((processo) =>
                renderLinhaProcesso(processo, true)
            )}

            {!processosDoSetor.length && (
                <tr>
                <td colSpan="10" className="empty">
                    Nenhum processo liberado para este setor.
                </td>
                </tr>
            )}
            </tbody>
          </table>
        </div>
        </section>
    </div>
  )
}