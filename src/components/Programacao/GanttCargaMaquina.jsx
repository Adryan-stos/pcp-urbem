import { useMemo, useState } from 'react'
import { CalendarRange, ChevronDown, ChevronRight, Filter } from 'lucide-react'
import { calcularCapacidadePeriodo, formatarDataLocal, somarDias } from '../../utils/capacidadeDisponivel.js'

const HORIZONTE_DIAS = 14

function normalizarOperacoes(processos, opLotes) {
  const projetos = processos.map((processo) => {
    const item = processo.ordens_producao?.itens_projeto
    const projeto = item?.projetos
    return {
      id: `processo-${processo.id}`,
      fabrica: 2,
      processo: processo.processo,
      recursoId: processo.recurso_id,
      inicio: processo.data_prevista_inicio,
      fim: processo.data_prevista_fim,
      titulo: processo.ordens_producao?.numero_op || 'OP sem número',
      projeto: projeto?.codigo_interno || projeto?.nome_projeto || '-',
      item: item?.codigo_interno_item || item?.tipo_material || '-',
      quantidade: Number(processo.quantidade_entrada_prevista || processo.quantidade_saida_prevista || 0),
      volume: Number(processo.ordens_producao?.volume_m3 || 0),
      status: processo.status_pcp || processo.status || '-'
    }
  })

  const lotes = opLotes.map((op) => {
    const itens = op.op_lote_itens || []
    const pacote = itens[0]?.pacotes_materia_prima
    return {
      id: `lote-${op.id}`,
      fabrica: 1,
      processo: op.processo,
      recursoId: op.recurso_id,
      inicio: op.data_prevista_inicio,
      fim: op.data_prevista_fim,
      titulo: op.numero_op_lote,
      projeto: 'Produção por lote',
      item: pacote?.codigo_pacote || pacote?.codigo_item || pacote?.codigo ||
        [pacote?.especie, pacote?.classe].filter(Boolean).join(' ') || '-',
      quantidade: itens.reduce((total, item) => total + Number(item.quantidade_prevista || 0), 0),
      volume: itens.reduce((total, item) => total + Number(item.volume_previsto_m3 || 0), 0),
      status: op.status || '-'
    }
  })

  return [...projetos, ...lotes]
}

export default function GanttCargaMaquina({ recursos, processos, opLotes }) {
  const hoje = formatarDataLocal(new Date())
  const [inicio, setInicio] = useState(hoje)
  const [fabrica, setFabrica] = useState('1')
  const [processo, setProcesso] = useState('')
  const [recursoId, setRecursoId] = useState('')
  const [status, setStatus] = useState('')
  const [busca, setBusca] = useState('')
  const [expandidos, setExpandidos] = useState(new Set())
  const fim = somarDias(inicio, HORIZONTE_DIAS - 1)
  const operacoes = useMemo(() => normalizarOperacoes(processos, opLotes), [processos, opLotes])
  const processosDisponiveis = [...new Set(recursos.filter((r) => String(r.fabrica) === fabrica).map((r) => r.processo))].sort()
  const recursosFiltrados = recursos.filter((recurso) =>
    String(recurso.fabrica) === fabrica &&
    (!processo || recurso.processo === processo) &&
    (!recursoId || recurso.id === recursoId)
  )
  const recursosDoProcesso = recursos.filter((r) => String(r.fabrica) === fabrica && (!processo || r.processo === processo))
  const dias = Array.from({ length: HORIZONTE_DIAS }, (_, indice) => {
    const data = somarDias(inicio, indice)
    const objeto = new Date(`${data}T00:00:00`)
    return { data, rotulo: String(objeto.getDate()).padStart(2, '0'), fimSemana: objeto.getDay() === 0 || objeto.getDay() === 6 }
  })
  const inicioMs = new Date(`${inicio}T00:00:00`).getTime()
  const fimMs = new Date(`${somarDias(fim, 1)}T00:00:00`).getTime()
  const duracao = fimMs - inicioMs
  const termo = busca.trim().toLowerCase()

  const operacoesFiltradas = operacoes.filter((op) =>
    String(op.fabrica) === fabrica &&
    (!processo || op.processo === processo) &&
    (!recursoId || op.recursoId === recursoId) &&
    (!status || op.status === status) &&
    (!termo || `${op.titulo} ${op.projeto} ${op.item}`.toLowerCase().includes(termo))
  )

  const capacidades = recursosFiltrados.map((recurso) => calcularCapacidadePeriodo(recurso, inicio, fim))
  const capacidadeM3 = capacidades.filter((c) => c.unidade === 'm³').reduce((total, c) => total + c.capacidade, 0)
  const volumeProgramado = operacoesFiltradas.reduce((total, op) => total + op.volume, 0)
  const saldo = capacidadeM3 - volumeProgramado
  const ocupacao = capacidadeM3 > 0 ? (volumeProgramado / capacidadeM3) * 100 : 0
  const statusDisponiveis = [...new Set(operacoes.filter((op) => op.status).map((op) => op.status))].sort()

  function alternarRecurso(id) {
    setExpandidos((atual) => {
      const proximo = new Set(atual)
      proximo.has(id) ? proximo.delete(id) : proximo.add(id)
      return proximo
    })
  }

  function renderTrilha(operacoesLinha, vazia = 'Sem OP programada neste horizonte') {
    return (
      <div className="machine-gantt-track">
        {dias.map((dia) => <span key={dia.data} className={dia.fimSemana ? 'weekend' : ''} />)}
        {operacoesLinha.filter((op) => op.inicio).map((op) => {
          const originalInicio = new Date(op.inicio).getTime()
          const originalFim = op.fim ? new Date(op.fim).getTime() : originalInicio + 86400000
          if (originalFim <= inicioMs || originalInicio >= fimMs) return null
          const barraInicio = Math.max(inicioMs, originalInicio)
          const barraFim = Math.min(fimMs, Math.max(barraInicio + 3600000, originalFim))
          const esquerda = ((barraInicio - inicioMs) / duracao) * 100
          const largura = ((barraFim - barraInicio) / duracao) * 100
          return <div key={op.id} className="machine-gantt-bar" style={{ left: `${esquerda}%`, width: `${Math.max(largura, 1.2)}%` }} title={`${op.titulo} · ${op.volume.toFixed(2)} m³ · ${op.status}`}>{op.titulo}</div>
        })}
        {!operacoesLinha.some((op) => op.inicio) && <em>{vazia}</em>}
      </div>
    )
  }

  return (
    <div className="machine-gantt-page-layout">
      <main className="machine-gantt-main">
        <section className="machine-gantt-summary">
          <div><span>Capacidade</span><strong>{capacidadeM3.toFixed(2)} m³</strong></div>
          <div><span>Programado</span><strong>{volumeProgramado.toFixed(2)} m³</strong></div>
          <div className={saldo < 0 ? 'danger' : ''}><span>Disponível</span><strong>{saldo.toFixed(2)} m³</strong></div>
          <div className={ocupacao > 100 ? 'danger' : ''}><span>Ocupação</span><strong>{ocupacao.toFixed(1)}%</strong></div>
          <div><span>OPs filtradas</span><strong>{operacoesFiltradas.length}</strong></div>
        </section>

        <section className="machine-gantt-card">
          <div className="machine-gantt-header">
            <div><span>Planejamento visual</span><h3><CalendarRange size={19} /> Gantt de carga por máquina</h3><small>{inicio.split('-').reverse().join('/')} a {fim.split('-').reverse().join('/')}</small></div>
          </div>
          <div className="machine-gantt-scroll">
            <div className="machine-gantt-grid">
              <div className="machine-gantt-corner">Máquina / OP / item</div>
              <div className="machine-gantt-days">{dias.map((dia) => <span key={dia.data} className={dia.fimSemana ? 'weekend' : ''}>{dia.rotulo}</span>)}</div>
              {recursosFiltrados.map((recurso) => {
                const capacidade = calcularCapacidadePeriodo(recurso, inicio, fim)
                const ops = operacoesFiltradas.filter((op) => op.recursoId === recurso.id)
                const aberto = expandidos.has(recurso.id)
                const volume = ops.reduce((total, op) => total + op.volume, 0)
                return (
                  <div className="machine-gantt-resource-group" key={recurso.id}>
                    <div className="machine-gantt-row">
                      <button type="button" className="machine-gantt-resource" onClick={() => alternarRecurso(recurso.id)}>{aberto ? <ChevronDown size={15} /> : <ChevronRight size={15} />}<span><strong>{recurso.nome}</strong><small>{capacidade.configurado ? `${capacidade.capacidade.toFixed(2)} ${capacidade.unidade} · ${volume.toFixed(2)} m³ programados` : 'Capacidade ou calendário não configurado'}</small></span></button>
                      {renderTrilha(ops)}
                    </div>
                    {aberto && ops.map((op) => (
                      <div className="machine-gantt-row machine-gantt-detail-row" key={op.id}>
                        <div className="machine-gantt-resource"><span><strong>{op.titulo}</strong><small>{op.projeto} · {op.item}</small><small>{op.quantidade.toFixed(0)} un. · {op.volume.toFixed(2)} m³ · {op.inicio ? new Date(op.inicio).toLocaleString('pt-BR') : 'sem início'} → {op.fim ? new Date(op.fim).toLocaleString('pt-BR') : 'sem término'}</small></span></div>
                        {renderTrilha([op], 'Sem data prevista')}
                      </div>
                    ))}
                  </div>
                )
              })}
              {!recursosFiltrados.length && <div className="machine-gantt-empty">Nenhuma máquina encontrada para os filtros.</div>}
            </div>
          </div>
        </section>
      </main>

      <aside className="machine-gantt-filters">
        <div className="machine-gantt-filter-title"><Filter size={17} /><div><strong>Filtros</strong><span>Atualizam resumo e Gantt</span></div></div>
        <label>Fábrica<select value={fabrica} onChange={(e) => { setFabrica(e.target.value); setProcesso(''); setRecursoId('') }}><option value="1">Fábrica 1</option><option value="2">Fábrica 2</option></select></label>
        <label>Processo<select value={processo} onChange={(e) => { setProcesso(e.target.value); setRecursoId('') }}><option value="">Todos os processos</option>{processosDisponiveis.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Máquina<select value={recursoId} onChange={(e) => setRecursoId(e.target.value)}><option value="">Todas as máquinas</option>{recursosDoProcesso.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
        <label>Início do horizonte<input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></label>
        <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos os status</option>{statusDisponiveis.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>OP, projeto ou item<input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." /></label>
        <button type="button" className="btn ghost" onClick={() => { setProcesso(''); setRecursoId(''); setStatus(''); setBusca(''); setInicio(hoje) }}>Limpar filtros</button>
      </aside>
    </div>
  )
}
