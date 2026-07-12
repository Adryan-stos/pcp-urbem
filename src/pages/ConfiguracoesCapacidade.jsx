import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Database, RefreshCw, Save } from 'lucide-react'
import {
  criarCapacidadeRecurso,
  listarRecursosFabrica1,
  salvarCalendarioRecurso
} from '../services/capacidadeService.js'

const NOMES_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const CAPACIDADE_INICIAL = {
  tipoMedicao: 'Por ciclo',
  unidade: 'm³',
  capacidadeNominal: '',
  duracaoCicloMinutos: '',
  tempoSetupMinutos: '0',
  fonte: 'Estimativa inicial',
  nivelConfianca: 'Estimado',
  vigenciaInicio: new Date().toISOString().slice(0, 10),
  vigenciaFim: '',
  observacao: ''
}

function calendarioInicial() {
  return NOMES_DIAS.map((_, diaSemana) => ({
    diaSemana,
    ativo: diaSemana >= 1 && diaSemana <= 5,
    horaInicio: '07:00',
    horaFim: '17:00',
    intervaloInicio: '12:00',
    intervaloFim: '13:00'
  }))
}

export default function ConfiguracoesCapacidade() {
  const [recursos, setRecursos] = useState([])
  const [recursoId, setRecursoId] = useState('')
  const [capacidade, setCapacidade] = useState(CAPACIDADE_INICIAL)
  const [calendario, setCalendario] = useState(calendarioInicial)
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const recursoAtual = useMemo(
    () => recursos.find((recurso) => recurso.id === recursoId),
    [recursos, recursoId]
  )

  async function carregar() {
    try {
      setCarregando(true)
      setErro('')
      const dados = await listarRecursosFabrica1()
      setRecursos(dados)
      setRecursoId((atual) => atual || dados[0]?.id || '')
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  useEffect(() => {
    if (!recursoAtual) return

    const cadastrados = recursoAtual.calendarios_recursos || []

    setCalendario(
      calendarioInicial().map((dia) => {
        const salvo = cadastrados.find(
          (item) => Number(item.dia_semana) === dia.diaSemana
        )

        return salvo
          ? {
              diaSemana: dia.diaSemana,
              ativo: Boolean(salvo.ativo),
              horaInicio: String(salvo.hora_inicio).slice(0, 5),
              horaFim: String(salvo.hora_fim).slice(0, 5),
              intervaloInicio: salvo.intervalo_inicio
                ? String(salvo.intervalo_inicio).slice(0, 5)
                : '',
              intervaloFim: salvo.intervalo_fim
                ? String(salvo.intervalo_fim).slice(0, 5)
                : ''
            }
          : dia
      })
    )
  }, [recursoAtual])

  function alterarCalendario(indice, campo, valor) {
    setCalendario((atual) =>
      atual.map((dia, posicao) =>
        posicao === indice ? { ...dia, [campo]: valor } : dia
      )
    )
  }

  async function salvarCapacidade(event) {
    event.preventDefault()

    if (!recursoId || Number(capacidade.capacidadeNominal) <= 0) {
      setErro('Selecione o recurso e informe uma capacidade maior que zero.')
      return
    }

    if (
      capacidade.tipoMedicao === 'Por ciclo' &&
      Number(capacidade.duracaoCicloMinutos) <= 0
    ) {
      setErro('Informe a duração do ciclo em minutos.')
      return
    }

    try {
      setSalvando(true)
      setErro('')
      setSucesso('')
      await criarCapacidadeRecurso(recursoId, capacidade)
      setCapacidade(CAPACIDADE_INICIAL)
      setSucesso('Nova versão de capacidade registrada.')
      await carregar()
    } catch (error) {
      setErro(error.message)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarCalendario(event) {
    event.preventDefault()

    const diaInvalido = calendario.find(
      (dia) => dia.ativo && (!dia.horaInicio || !dia.horaFim || dia.horaFim <= dia.horaInicio)
    )

    if (diaInvalido) {
      setErro(`Revise os horários de ${NOMES_DIAS[diaInvalido.diaSemana]}.`)
      return
    }

    try {
      setSalvando(true)
      setErro('')
      setSucesso('')
      await salvarCalendarioRecurso(recursoId, calendario)
      setSucesso('Calendário semanal salvo.')
      await carregar()
    } catch (error) {
      setErro(error.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="page capacity-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Configurações · Fábrica 1</p>
          <h2>Recursos e Capacidade</h2>
          <span>Parâmetros versionados para planejamento das OPs de lote.</span>
        </div>

        <button className="btn ghost" onClick={carregar} disabled={carregando}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </header>

      {erro && <div className="alert">{erro}</div>}
      {sucesso && <div className="capacity-success">{sucesso}</div>}

      <section className="capacity-resource-grid">
        {recursos.map((recurso) => {
          const vigente = recurso.capacidades_recursos?.find((item) => item.ativo)

          return (
            <button
              type="button"
              key={recurso.id}
              className={`capacity-resource-card ${recurso.id === recursoId ? 'active' : ''}`}
              onClick={() => setRecursoId(recurso.id)}
            >
              <span>{recurso.codigo}</span>
              <strong>{recurso.nome}</strong>
              <small>{recurso.tipo_recurso}</small>
              <em>
                {vigente
                  ? `${Number(vigente.capacidade_nominal)} ${vigente.unidade} · ${vigente.tipo_medicao}`
                  : 'Capacidade não cadastrada'}
              </em>
            </button>
          )
        })}
      </section>

      {!carregando && !recursos.length && (
        <div className="empty">Execute a migration de capacidade para carregar os recursos.</div>
      )}

      {recursoAtual && (
        <div className="capacity-config-grid">
          <form className="capacity-panel" onSubmit={salvarCapacidade}>
            <div className="capacity-panel-title">
              <Database size={19} />
              <div>
                <h3>Nova versão de capacidade</h3>
                <span>{recursoAtual.nome}</span>
              </div>
            </div>

            <div className="capacity-form-grid">
              <label>
                Tipo de medição
                <select
                  value={capacidade.tipoMedicao}
                  onChange={(e) => setCapacidade({ ...capacidade, tipoMedicao: e.target.value })}
                >
                  <option>Por ciclo</option>
                  <option>Por hora</option>
                  <option>Por turno</option>
                </select>
              </label>

              <label>
                Unidade
                <select
                  value={capacidade.unidade}
                  onChange={(e) => setCapacidade({ ...capacidade, unidade: e.target.value })}
                >
                  <option>m³</option>
                  <option>Peças</option>
                  <option>Pacotes</option>
                  <option>Lotes</option>
                </select>
              </label>

              <label>
                Capacidade nominal
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={capacidade.capacidadeNominal}
                  onChange={(e) => setCapacidade({ ...capacidade, capacidadeNominal: e.target.value })}
                />
              </label>

              <label>
                Duração do ciclo (min)
                <input
                  type="number"
                  min="1"
                  value={capacidade.duracaoCicloMinutos}
                  onChange={(e) => setCapacidade({ ...capacidade, duracaoCicloMinutos: e.target.value })}
                />
              </label>

              <label>
                Setup (min)
                <input
                  type="number"
                  min="0"
                  value={capacidade.tempoSetupMinutos}
                  onChange={(e) => setCapacidade({ ...capacidade, tempoSetupMinutos: e.target.value })}
                />
              </label>

              <label>
                Confiança
                <select
                  value={capacidade.nivelConfianca}
                  onChange={(e) => setCapacidade({ ...capacidade, nivelConfianca: e.target.value })}
                >
                  <option>Estimado</option>
                  <option>Medido</option>
                  <option>Validado</option>
                </select>
              </label>

              <label>
                Início da vigência
                <input
                  type="date"
                  value={capacidade.vigenciaInicio}
                  onChange={(e) => setCapacidade({ ...capacidade, vigenciaInicio: e.target.value })}
                />
              </label>

              <label>
                Fonte
                <input
                  value={capacidade.fonte}
                  onChange={(e) => setCapacidade({ ...capacidade, fonte: e.target.value })}
                />
              </label>
            </div>

            <label>
              Observação
              <textarea
                rows="3"
                value={capacidade.observacao}
                onChange={(e) => setCapacidade({ ...capacidade, observacao: e.target.value })}
              />
            </label>

            <button className="btn primary" disabled={salvando}>
              <Save size={16} />
              Salvar versão
            </button>
          </form>

          <form className="capacity-panel" onSubmit={salvarCalendario}>
            <div className="capacity-panel-title">
              <CalendarDays size={19} />
              <div>
                <h3>Calendário semanal</h3>
                <span>Modelo inicial; revise antes de salvar.</span>
              </div>
            </div>

            <div className="capacity-calendar-list">
              {calendario.map((dia, indice) => (
                <div className={`capacity-calendar-row ${dia.ativo ? '' : 'inactive'}`} key={dia.diaSemana}>
                  <label className="capacity-day-check">
                    <input
                      type="checkbox"
                      checked={dia.ativo}
                      onChange={(e) => alterarCalendario(indice, 'ativo', e.target.checked)}
                    />
                    {NOMES_DIAS[dia.diaSemana]}
                  </label>
                  <input
                    type="time"
                    disabled={!dia.ativo}
                    value={dia.horaInicio}
                    onChange={(e) => alterarCalendario(indice, 'horaInicio', e.target.value)}
                  />
                  <input
                    type="time"
                    disabled={!dia.ativo}
                    value={dia.horaFim}
                    onChange={(e) => alterarCalendario(indice, 'horaFim', e.target.value)}
                  />
                  <input
                    type="time"
                    disabled={!dia.ativo}
                    value={dia.intervaloInicio}
                    onChange={(e) => alterarCalendario(indice, 'intervaloInicio', e.target.value)}
                  />
                  <input
                    type="time"
                    disabled={!dia.ativo}
                    value={dia.intervaloFim}
                    onChange={(e) => alterarCalendario(indice, 'intervaloFim', e.target.value)}
                  />
                </div>
              ))}
            </div>

            <button className="btn primary" disabled={salvando}>
              <Save size={16} />
              Salvar calendário
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
