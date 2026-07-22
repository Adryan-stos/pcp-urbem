import { useMemo, useState } from 'react'
import { CalendarRange, ChevronDown, ChevronRight, Filter } from 'lucide-react'
import { calcularCapacidadePeriodo, formatarDataLocal, somarDias } from '../../utils/capacidadeDisponivel.js'
import { obterSituacaoOperacao } from '../../utils/situacaoOperacao.js'

function normalizarOperacoes(processos, opLotes) {
  const projetos = processos.map((processo) => {
    const item = processo.ordens_producao?.itens_projeto
    const projeto = item?.projetos
    return {
      id: `processo-${processo.id}`,
      tipo: 'processo',
      registroId: processo.id,
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
      status: processo.status_pcp || processo.status || '-',
      inicioReal: processo.inicio_producao,
      fimReal: processo.fim_producao
    }
  })

  const lotes = opLotes.map((op) => {
    const itens = op.op_lote_itens || []
    const pacote = itens[0]?.pacotes_materia_prima
    return {
      id: `lote-${op.id}`,
      tipo: 'lote',
      registroId: op.id,
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
      status: op.status || '-',
      inicioReal: op.inicio_producao,
      fimReal: op.fim_producao
    }
  })

  return [...projetos, ...lotes]
}

export default function GanttCargaMaquina({ recursos, processos, opLotes, onEditarPlanejamento }) {
  const hoje = formatarDataLocal(new Date())
  const [inicio, setInicio] = useState(hoje)
  const [fabrica, setFabrica] = useState('1')
  const [processo, setProcesso] = useState('')
  const [recursoId, setRecursoId] = useState('')
  const [status, setStatus] = useState('')
  const [busca, setBusca] = useState('')
  const [horizonteDias, setHorizonteDias] = useState(3)
  const [densidade, setDensidade] = useState('normal')
  const [expandidos, setExpandidos] = useState(new Set())
  const fim = somarDias(inicio, horizonteDias - 1)
  const operacoes = useMemo(() => normalizarOperacoes(processos, opLotes), [processos, opLotes])
  const processosDisponiveis = [...new Set(recursos.filter((r) => String(r.fabrica) === fabrica).map((r) => r.processo))].sort()
  const recursosFiltrados = recursos.filter((recurso) =>
    String(recurso.fabrica) === fabrica &&
    (!processo || recurso.processo === processo) &&
    (!recursoId || recurso.id === recursoId)
  )
  const recursosDoProcesso = recursos.filter((r) => String(r.fabrica) === fabrica && (!processo || r.processo === processo))
  const dias = Array.from({ length: horizonteDias }, (_, indice) => {
    const data = somarDias(inicio, indice)
    const objeto = new Date(`${data}T00:00:00`)
    return {
      data,
      rotulo: String(objeto.getDate()).padStart(2, '0'),
      fimSemana: objeto.getDay() === 0 || objeto.getDay() === 6,
      hoje: data === hoje
    }
  })
  const inicioMs = new Date(`${inicio}T00:00:00`).getTime()
  const fimMs = new Date(`${somarDias(fim, 1)}T00:00:00`).getTime()
  const totalHoras = horizonteDias * 24
  const larguraInfo = 230
  const pixelsHoraBase = horizonteDias <= 1 ? 44 : horizonteDias <= 3 ? 32 : horizonteDias <= 7 ? 22 : horizonteDias <= 14 ? 15 : 10
  const fatorDensidade = densidade === 'detalhada' ? 1.5 : densidade === 'compacta' ? 0.72 : 1
  const pixelsPorHora = pixelsHoraBase * fatorDensidade
  const larguraTimeline = totalHoras * pixelsPorHora
  const passoHora = horizonteDias <= 3 ? 1 : horizonteDias <= 7 ? 2 : horizonteDias <= 14 ? 4 : 6
  const horasMarcadas = Array.from({ length: Math.ceil(24 / passoHora) }, (_, indice) => indice * passoHora)
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
  const totalAtrasadas = operacoesFiltradas.filter((op) => obterSituacaoOperacao(op).atrasada).length
  const totalEmProducao = operacoesFiltradas.filter((op) => obterSituacaoOperacao(op).classe.includes('production')).length
  const totalEmPausa = operacoesFiltradas.filter((op) => obterSituacaoOperacao(op).classe.includes('paused')).length

  function alternarRecurso(id) {
    setExpandidos((atual) => {
      const proximo = new Set(atual)
      proximo.has(id) ? proximo.delete(id) : proximo.add(id)
      return proximo
    })
  }

  function renderTrilha(operacoesLinha, vazia = 'Sem OP programada neste horizonte') {
    return (
      <div className="machine-gantt-track" style={{ width: `${larguraTimeline}px`, '--hour-width': `${pixelsPorHora}px` }}>
        {dias.map((dia, indice) => <span key={dia.data} className={`machine-gantt-day-background ${dia.fimSemana ? 'weekend' : ''} ${dia.hoje ? 'today' : ''}`} style={{ left: `${indice * 24 * pixelsPorHora}px`, width: `${24 * pixelsPorHora}px` }} />)}
        {operacoesLinha.filter((op) => op.inicio).map((op) => {
          const situacao = obterSituacaoOperacao(op)
          const originalInicio = new Date(op.inicio).getTime()
          const originalFim = op.fim ? new Date(op.fim).getTime() : originalInicio + 86400000
          if (originalFim <= inicioMs || originalInicio >= fimMs) return null
          const barraInicio = Math.max(inicioMs, originalInicio)
          const barraFim = Math.min(fimMs, Math.max(barraInicio + 3600000, originalFim))
          const esquerda = ((barraInicio - inicioMs) / 3600000) * pixelsPorHora
          const largura = ((barraFim - barraInicio) / 3600000) * pixelsPorHora
          const horario = new Date(originalInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          return <div key={op.id} className={`machine-gantt-bar ${situacao.classe}`} style={{ left: `${esquerda}px`, width: `${Math.max(largura, 18)}px` }} title={`${op.titulo} · ${new Date(originalInicio).toLocaleString('pt-BR')} → ${new Date(originalFim).toLocaleString('pt-BR')} · ${op.volume.toFixed(2)} m³ · ${situacao.rotulo}`}><b>{horario}</b><span>{op.titulo}</span></div>
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
          <div className={totalAtrasadas ? 'danger' : ''}><span>Atrasadas</span><strong>{totalAtrasadas}</strong></div>
          <div><span>Em produção</span><strong>{totalEmProducao}</strong></div>
          <div><span>Em pausa</span><strong>{totalEmPausa}</strong></div>
        </section>

        <section className="machine-gantt-card">
          <div className="machine-gantt-header">
            <div><span>Planejamento visual</span><h3><CalendarRange size={19} /> Gantt de carga por máquina</h3><small>{inicio.split('-').reverse().join('/')} a {fim.split('-').reverse().join('/')}</small></div>
            <div className="machine-gantt-controls"><label className="machine-gantt-zoom">Período
              <select value={horizonteDias} onChange={(e) => setHorizonteDias(Number(e.target.value))}>
                <option value="1">1 dia</option>
                <option value="3">3 dias</option>
                <option value="7">7 dias</option>
                <option value="14">14 dias</option>
                <option value="30">30 dias</option>
              </select>
            </label><label className="machine-gantt-zoom">Escala
              <select value={densidade} onChange={(e) => setDensidade(e.target.value)}>
                <option value="compacta">Compacta</option><option value="normal">Normal</option><option value="detalhada">Detalhada</option>
              </select>
            </label></div>
          </div>
          <div className="machine-gantt-scroll">
            <div className="machine-gantt-grid" style={{ width: `${larguraInfo + larguraTimeline}px` }}>
              <div className="machine-gantt-corner">Máquina / OP / item</div>
              <div className="machine-gantt-days" style={{ width: `${larguraTimeline}px` }}>{dias.map((dia) => <div key={dia.data} className={`machine-gantt-day-header ${dia.fimSemana ? 'weekend' : ''} ${dia.hoje ? 'today' : ''}`} style={{ width: `${24 * pixelsPorHora}px` }}><strong>{new Date(`${dia.data}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</strong><div>{horasMarcadas.map((hora) => <span key={hora} style={{ width: `${passoHora * pixelsPorHora}px` }}>{String(hora).padStart(2, '0')}:00</span>)}</div></div>)}</div>
              {recursosFiltrados.map((recurso) => {
                const capacidade = calcularCapacidadePeriodo(recurso, inicio, fim)
                const ops = operacoesFiltradas.filter((op) => op.recursoId === recurso.id)
                const aberto = expandidos.has(recurso.id)
                const volume = ops.reduce((total, op) => total + op.volume, 0)
                return (
                  <div className="machine-gantt-resource-group" key={recurso.id}>
                    <div className="machine-gantt-row" style={{ gridTemplateColumns: `${larguraInfo}px ${larguraTimeline}px` }}>
                      <button type="button" className="machine-gantt-resource" onClick={() => alternarRecurso(recurso.id)}>{aberto ? <ChevronDown size={15} /> : <ChevronRight size={15} />}<span><strong>{recurso.nome}</strong><small>{capacidade.configurado ? `${capacidade.capacidade.toFixed(2)} ${capacidade.unidade} · ${volume.toFixed(2)} m³ programados` : 'Capacidade ou calendário não configurado'}</small></span></button>
                      {renderTrilha(ops)}
                    </div>
                    {aberto && ops.map((op) => (
                      <div className="machine-gantt-row machine-gantt-detail-row" key={op.id} style={{ gridTemplateColumns: `${larguraInfo}px ${larguraTimeline}px` }}>
                        <div className="machine-gantt-resource"><span><strong>{op.titulo}</strong><small>{op.projeto} · {op.item}</small><small>{op.quantidade.toFixed(0)} un. · {op.volume.toFixed(2)} m³ · {op.inicio ? new Date(op.inicio).toLocaleString('pt-BR') : 'sem início'} → {op.fim ? new Date(op.fim).toLocaleString('pt-BR') : 'sem término'}</small><span className={`machine-gantt-status ${obterSituacaoOperacao(op).classe}`}>{obterSituacaoOperacao(op).rotulo}</span><button type="button" className="machine-planning-date-button" onClick={() => onEditarPlanejamento?.(op)}>Alterar início e término</button></span></div>
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
