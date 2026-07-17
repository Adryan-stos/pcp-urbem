import { useMemo, useState } from 'react'
import { CalendarRange } from 'lucide-react'
import { calcularCapacidadePeriodo, formatarDataLocal, somarDias } from '../../utils/capacidadeDisponivel.js'

const HORIZONTE_DIAS = 14

function normalizarOperacoes(processos, opLotes) {
  const projetos = processos.map((processo) => ({
    id: `processo-${processo.id}`,
    recursoId: processo.recurso_id,
    inicio: processo.data_prevista_inicio,
    fim: processo.data_prevista_fim,
    titulo: processo.ordens_producao?.numero_op || 'OP sem número',
    volume: Number(processo.ordens_producao?.volume_m3 || 0),
    status: processo.status_pcp || processo.status
  }))

  const lotes = opLotes.map((op) => ({
    id: `lote-${op.id}`,
    recursoId: op.recurso_id,
    inicio: op.data_prevista_inicio,
    fim: op.data_prevista_fim,
    titulo: op.numero_op_lote,
    volume: (op.op_lote_itens || []).reduce(
      (total, item) => total + Number(item.volume_previsto_m3 || 0), 0
    ),
    status: op.status
  }))

  return [...projetos, ...lotes]
}

export default function GanttCargaMaquina({ recursos, processos, opLotes }) {
  const hoje = formatarDataLocal(new Date())
  const [inicio, setInicio] = useState(hoje)
  const fim = somarDias(inicio, HORIZONTE_DIAS - 1)
  const operacoes = useMemo(() => normalizarOperacoes(processos, opLotes), [processos, opLotes])
  const dias = useMemo(() => Array.from({ length: HORIZONTE_DIAS }, (_, indice) => {
    const data = somarDias(inicio, indice)
    const objeto = new Date(`${data}T00:00:00`)
    return { data, rotulo: String(objeto.getDate()).padStart(2, '0'), fimSemana: objeto.getDay() === 0 || objeto.getDay() === 6 }
  }), [inicio])

  const inicioMs = new Date(`${inicio}T00:00:00`).getTime()
  const fimMs = new Date(`${somarDias(fim, 1)}T00:00:00`).getTime()
  const duracao = fimMs - inicioMs

  return (
    <section className="machine-gantt-card">
      <div className="machine-gantt-header">
        <div>
          <span>Planejamento visual</span>
          <h3><CalendarRange size={19} /> Gantt de carga por máquina</h3>
          <small>Capacidade e programação de {inicio.split('-').reverse().join('/')} a {fim.split('-').reverse().join('/')}.</small>
        </div>
        <label>
          Início do horizonte
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </label>
      </div>

      <div className="machine-gantt-scroll">
        <div className="machine-gantt-grid">
          <div className="machine-gantt-corner">Recurso / capacidade</div>
          <div className="machine-gantt-days">
            {dias.map((dia) => <span key={dia.data} className={dia.fimSemana ? 'weekend' : ''}>{dia.rotulo}</span>)}
          </div>

          {recursos.map((recurso) => {
            const capacidade = calcularCapacidadePeriodo(recurso, inicio, fim)
            const operacoesRecurso = operacoes.filter((op) => op.recursoId === recurso.id)
            const volume = operacoesRecurso.reduce((total, op) => total + op.volume, 0)
            const saldo = capacidade.unidade === 'm³' ? capacidade.capacidade - volume : null

            return (
              <div className="machine-gantt-row" key={recurso.id}>
                <div className="machine-gantt-resource">
                  <strong>{recurso.nome}</strong>
                  {capacidade.configurado ? (
                    <small>{capacidade.capacidade.toFixed(2)} {capacidade.unidade} disp. · {volume.toFixed(2)} m³ prog.{saldo !== null ? ` · ${saldo.toFixed(2)} m³ saldo` : ''}</small>
                  ) : <small>Capacidade ou calendário não configurado</small>}
                </div>
                <div className="machine-gantt-track">
                  {dias.map((dia) => <span key={dia.data} className={dia.fimSemana ? 'weekend' : ''} />)}
                  {operacoesRecurso.filter((op) => op.inicio).map((op) => {
                    const opInicio = Math.max(inicioMs, new Date(op.inicio).getTime())
                    const opFimOriginal = op.fim ? new Date(op.fim).getTime() : opInicio + 86400000
                    const opFim = Math.min(fimMs, Math.max(opInicio + 3600000, opFimOriginal))
                    if (opFim <= inicioMs || opInicio >= fimMs) return null
                    const esquerda = ((opInicio - inicioMs) / duracao) * 100
                    const largura = ((opFim - opInicio) / duracao) * 100
                    return (
                      <div
                        key={op.id}
                        className="machine-gantt-bar"
                        style={{ left: `${esquerda}%`, width: `${Math.max(largura, 1.2)}%` }}
                        title={`${op.titulo} · ${op.volume.toFixed(2)} m³ · ${op.status || '-'}`}
                      >
                        {op.titulo}
                      </div>
                    )
                  })}
                  {!operacoesRecurso.some((op) => op.inicio) && <em>Sem OP programada neste horizonte</em>}
                </div>
              </div>
            )
          })}

          {!recursos.length && <div className="machine-gantt-empty">Nenhum recurso ativo cadastrado para este setor.</div>}
        </div>
      </div>
    </section>
  )
}
