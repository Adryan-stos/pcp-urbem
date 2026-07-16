import { useEffect, useMemo, useState } from 'react'
import { Calculator, CalendarDays, Database, Plus, RefreshCw, Save, X } from 'lucide-react'
import {
  criarCapacidadeRecurso,
  criarRecursoProdutivo,
  listarRecursosProdutivos,
  salvarCalendarioRecurso
} from '../services/capacidadeService.js'

const NOMES_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function formatarDataLocal(data) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function somarDias(data, quantidade) {
  const resultado = new Date(`${data}T00:00:00`)
  resultado.setDate(resultado.getDate() + quantidade)
  return formatarDataLocal(resultado)
}

function dataComHora(data, hora) {
  return new Date(`${data}T${String(hora).slice(0, 5)}:00`)
}

function minutosEntre(inicio, fim) {
  return Math.max(0, (fim.getTime() - inicio.getTime()) / 60000)
}

function calcularProjecao(recurso, dataInicio, dataFim) {
  if (!recurso || !dataInicio || !dataFim || dataFim < dataInicio) return []

  const resultado = []
  const cursor = new Date(`${dataInicio}T00:00:00`)
  const limite = new Date(`${dataFim}T00:00:00`)

  while (cursor <= limite && resultado.length < 93) {
    const data = formatarDataLocal(cursor)
    const calendario = (recurso.calendarios_recursos || []).find(
      (item) => Number(item.dia_semana) === cursor.getDay() && item.ativo
    )
    const capacidade = (recurso.capacidades_recursos || []).find(
      (item) => item.ativo && item.vigencia_inicio <= data && (!item.vigencia_fim || item.vigencia_fim >= data)
    )

    let minutosCalendario = 0
    let minutosBloqueados = 0

    if (calendario) {
      const inicio = dataComHora(data, calendario.hora_inicio)
      const fim = dataComHora(data, calendario.hora_fim)
      const segmentos = calendario.intervalo_inicio && calendario.intervalo_fim
        ? [
            [inicio, dataComHora(data, calendario.intervalo_inicio)],
            [dataComHora(data, calendario.intervalo_fim), fim]
          ]
        : [[inicio, fim]]

      minutosCalendario = segmentos.reduce(
        (total, [segmentoInicio, segmentoFim]) => total + minutosEntre(segmentoInicio, segmentoFim),
        0
      )

      const bloqueios = (recurso.bloqueios_recursos || []).filter(
        (item) => item.ativo && new Date(item.inicio) < fim && new Date(item.fim) > inicio
      )

      minutosBloqueados = segmentos.reduce((total, [segmentoInicio, segmentoFim]) => (
        total + bloqueios.reduce((subtotal, bloqueio) => {
          const sobreposicaoInicio = new Date(Math.max(segmentoInicio.getTime(), new Date(bloqueio.inicio).getTime()))
          const sobreposicaoFim = new Date(Math.min(segmentoFim.getTime(), new Date(bloqueio.fim).getTime()))
          return subtotal + minutosEntre(sobreposicaoInicio, sobreposicaoFim)
        }, 0)
      ), 0)
    }

    const minutosDisponiveis = Math.max(0, minutosCalendario - Math.min(minutosCalendario, minutosBloqueados))
    let capacidadeDisponivel = 0

    if (capacidade && minutosDisponiveis > 0) {
      const nominal = Number(capacidade.capacidade_nominal || 0)
      const multiplicador = Number(recurso.quantidade_recursos || 1)

      if (capacidade.tipo_medicao === 'Por hora') {
        capacidadeDisponivel = nominal * (minutosDisponiveis / 60) * multiplicador
      } else if (capacidade.tipo_medicao === 'Por turno') {
        capacidadeDisponivel = minutosCalendario > 0
          ? nominal * (minutosDisponiveis / minutosCalendario) * multiplicador
          : 0
      } else {
        const minutosCiclo = Number(capacidade.duracao_ciclo_minutos || 0)
          + Number(capacidade.tempo_setup_minutos || 0)
        capacidadeDisponivel = minutosCiclo > 0
          ? Math.floor(minutosDisponiveis / minutosCiclo) * nominal * multiplicador
          : 0
      }
    }

    resultado.push({
      data,
      dia: NOMES_DIAS[cursor.getDay()],
      minutosCalendario,
      minutosBloqueados: Math.min(minutosCalendario, minutosBloqueados),
      minutosDisponiveis,
      capacidadeDisponivel,
      unidade: capacidade?.unidade || '-',
      configurado: Boolean(calendario && capacidade)
    })

    cursor.setDate(cursor.getDate() + 1)
  }

  return resultado
}

const PROCESSOS_POR_FABRICA = {
  1: [
    { valor: 'AUTOCLAVE', nome: 'Autoclave' },
    { valor: 'GRADEADOR', nome: 'Gradeador' },
    { valor: 'ESTUFA', nome: 'Estufa' },
    { valor: 'CLASSIFICADORA', nome: 'Classificadora' }
  ],
  2: [
    { valor: 'OTIMIZADORA/FINGER', nome: 'Otimizadora / Finger' },
    { valor: 'PLAINA', nome: 'Plainas' },
    { valor: 'PRENSA', nome: 'Prensas' },
    { valor: 'DESTOPADEIRA', nome: 'Destopadeira' },
    { valor: 'CNC', nome: 'CNC' },
    { valor: 'ACABAMENTO', nome: 'Acabamento' }
  ]
}

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

const RECURSO_INICIAL = {
  fabrica: '1',
  codigo: '',
  nome: '',
  processo: 'AUTOCLAVE',
  tipoRecurso: 'Máquina individual',
  quantidadeRecursos: '1',
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
  const hoje = formatarDataLocal(new Date())
  const [filtroFabrica, setFiltroFabrica] = useState('1')
  const [recursos, setRecursos] = useState([])
  const [recursoId, setRecursoId] = useState('')
  const [capacidade, setCapacidade] = useState(CAPACIDADE_INICIAL)
  const [novoRecurso, setNovoRecurso] = useState(RECURSO_INICIAL)
  const [formRecursoAberto, setFormRecursoAberto] = useState(false)
  const [calendario, setCalendario] = useState(calendarioInicial)
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [periodoInicio, setPeriodoInicio] = useState(hoje)
  const [periodoFim, setPeriodoFim] = useState(somarDias(hoje, 6))

  const recursoAtual = useMemo(
    () => recursos.find((recurso) => recurso.id === recursoId),
    [recursos, recursoId]
  )

  const projecao = useMemo(
    () => calcularProjecao(recursoAtual, periodoInicio, periodoFim),
    [recursoAtual, periodoInicio, periodoFim]
  )

  const totaisProjecao = useMemo(() => projecao.reduce(
    (total, dia) => ({
      minutosCalendario: total.minutosCalendario + dia.minutosCalendario,
      minutosBloqueados: total.minutosBloqueados + dia.minutosBloqueados,
      minutosDisponiveis: total.minutosDisponiveis + dia.minutosDisponiveis,
      capacidadeDisponivel: total.capacidadeDisponivel + dia.capacidadeDisponivel
    }),
    { minutosCalendario: 0, minutosBloqueados: 0, minutosDisponiveis: 0, capacidadeDisponivel: 0 }
  ), [projecao])

  async function carregar() {
    try {
      setCarregando(true)
      setErro('')
      const dados = await listarRecursosProdutivos(filtroFabrica)
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
  }, [filtroFabrica])

  const processosNovoRecurso = PROCESSOS_POR_FABRICA[Number(novoRecurso.fabrica)]

  function alterarFabricaNovoRecurso(fabrica) {
    const primeiroProcesso = PROCESSOS_POR_FABRICA[Number(fabrica)][0].valor
    setNovoRecurso((atual) => ({ ...atual, fabrica, processo: primeiroProcesso }))
  }

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

  async function salvarRecurso(event) {
    event.preventDefault()

    if (!novoRecurso.codigo.trim() || !novoRecurso.nome.trim() || !novoRecurso.processo.trim()) {
      setErro('Informe código, nome e processo do recurso.')
      return
    }

    if (
      novoRecurso.tipoRecurso === 'Grupo de recursos' &&
      Number(novoRecurso.quantidadeRecursos) < 2
    ) {
      setErro('Um grupo deve possuir no mínimo 2 recursos idênticos.')
      return
    }

    try {
      setSalvando(true)
      setErro('')
      setSucesso('')
      const criado = await criarRecursoProdutivo(novoRecurso)
      setNovoRecurso({ ...RECURSO_INICIAL, fabrica: novoRecurso.fabrica, processo: processosNovoRecurso[0].valor })
      setFormRecursoAberto(false)
      setSucesso('Recurso produtivo cadastrado.')
      await carregar()
      setRecursoId(criado.id)
    } catch (error) {
      setErro(error.message)
    } finally {
      setSalvando(false)
    }
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
          <p className="eyebrow">Configurações · Recursos produtivos</p>
          <h2>Recursos e Capacidade</h2>
          <span>Cadastro das máquinas, linhas e recursos das Fábricas 1 e 2.</span>
        </div>

        <div className="page-header-actions">
          <button
            className="btn primary"
            onClick={() => setFormRecursoAberto((aberto) => !aberto)}
          >
            {formRecursoAberto ? <X size={16} /> : <Plus size={16} />}
            {formRecursoAberto ? 'Fechar cadastro' : 'Novo recurso'}
          </button>
          <button className="btn ghost" onClick={carregar} disabled={carregando}>
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </header>

      {erro && <div className="alert">{erro}</div>}
      {sucesso && <div className="capacity-success">{sucesso}</div>}

      {formRecursoAberto && (
        <form className="capacity-panel capacity-new-resource" onSubmit={salvarRecurso}>
          <div className="capacity-panel-title">
            <Plus size={19} />
            <div>
              <h3>Novo recurso produtivo</h3>
              <span>Cadastre recursos individuais ou grupos idênticos das duas fábricas.</span>
            </div>
          </div>

          <div className="capacity-form-grid capacity-resource-form-grid">
            <label>
              Fábrica
              <select
                value={novoRecurso.fabrica}
                onChange={(e) => alterarFabricaNovoRecurso(e.target.value)}
              >
                <option value="1">Fábrica 1</option>
                <option value="2">Fábrica 2</option>
              </select>
            </label>
            <label>
              Código
              <input
                placeholder={`Ex.: F${novoRecurso.fabrica}-${novoRecurso.processo.replace('/', '-')}-01`}
                value={novoRecurso.codigo}
                onChange={(e) => setNovoRecurso({ ...novoRecurso, codigo: e.target.value })}
              />
            </label>
            <label>
              Nome
              <input
                placeholder="Nome do recurso"
                value={novoRecurso.nome}
                onChange={(e) => setNovoRecurso({ ...novoRecurso, nome: e.target.value })}
              />
            </label>
            <label>
              Processo
              <select
                value={novoRecurso.processo}
                onChange={(e) => setNovoRecurso({ ...novoRecurso, processo: e.target.value })}
              >
                {processosNovoRecurso.map((processo) => (
                  <option key={processo.valor} value={processo.valor}>{processo.nome}</option>
                ))}
              </select>
            </label>
            <label>
              Tipo de recurso
              <select
                value={novoRecurso.tipoRecurso}
                onChange={(e) => setNovoRecurso({ ...novoRecurso, tipoRecurso: e.target.value })}
              >
                <option>Máquina individual</option>
                <option>Equipamento por lote</option>
                <option>Linha de processo</option>
                <option>Recurso manual</option>
                <option>Grupo de recursos</option>
              </select>
            </label>
            {novoRecurso.tipoRecurso === 'Grupo de recursos' && (
              <label>
                Quantidade de recursos idênticos
                <input
                  type="number"
                  min="2"
                  step="1"
                  value={novoRecurso.quantidadeRecursos}
                  onChange={(e) => setNovoRecurso({ ...novoRecurso, quantidadeRecursos: e.target.value })}
                />
                <small>Use somente quando todos compartilham capacidade e calendário.</small>
              </label>
            )}
            <label>
              Observação
              <input
                placeholder="Informação complementar"
                value={novoRecurso.observacao}
                onChange={(e) => setNovoRecurso({ ...novoRecurso, observacao: e.target.value })}
              />
            </label>
          </div>

          <button className="btn primary" disabled={salvando}>
            <Save size={16} />
            Salvar recurso
          </button>
        </form>
      )}

      <div className="capacity-factory-filter" role="group" aria-label="Filtrar recursos por fábrica">
        {[['1', 'Fábrica 1'], ['2', 'Fábrica 2']].map(([valor, rotulo]) => (
          <button
            type="button"
            key={valor}
            className={filtroFabrica === valor ? 'active' : ''}
            onClick={() => { setFiltroFabrica(valor); setRecursoId('') }}
          >
            {rotulo}
          </button>
        ))}
      </div>

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
              <small>Fábrica {recurso.fabrica} · {recurso.processo}</small>
              <small>{recurso.tipo_recurso}{recurso.quantidade_recursos > 1 ? ` · ${recurso.quantidade_recursos} unidades` : ''}</small>
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
        <div className="capacity-empty-state">
          <Database size={28} />
          <strong>Nenhum recurso da Fábrica {filtroFabrica} encontrado</strong>
          <span>
            Execute a migration correspondente no Supabase ou utilize “Novo recurso”.
          </span>
          <button className="btn primary" onClick={() => setFormRecursoAberto(true)}>
            <Plus size={16} />
            Cadastrar recurso
          </button>
        </div>
      )}

      {recursoAtual && (
        <>
        <section className="capacity-panel capacity-projection-panel">
          <div className="capacity-panel-title capacity-projection-title">
            <Calculator size={20} />
            <div>
              <h3>Projeção de capacidade disponível</h3>
              <span>{recursoAtual.nome} · calendário, bloqueios e capacidade vigente</span>
            </div>
            <div className="capacity-period-filter">
              <label>
                De
                <input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} />
              </label>
              <label>
                Até
                <input type="date" min={periodoInicio} value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} />
              </label>
            </div>
          </div>

          <div className="capacity-projection-kpis">
            <div><span>Calendário</span><strong>{(totaisProjecao.minutosCalendario / 60).toFixed(1)} h</strong></div>
            <div><span>Bloqueios</span><strong>{(totaisProjecao.minutosBloqueados / 60).toFixed(1)} h</strong></div>
            <div><span>Disponível</span><strong>{(totaisProjecao.minutosDisponiveis / 60).toFixed(1)} h</strong></div>
            <div><span>Capacidade</span><strong>{totaisProjecao.capacidadeDisponivel.toFixed(2)} {projecao.find((dia) => dia.unidade !== '-')?.unidade || '-'}</strong></div>
          </div>

          <div className="table-wrapper">
            <table className="capacity-projection-table">
              <thead><tr><th>Data</th><th>Dia</th><th>Calendário</th><th>Bloqueado</th><th>Disponível</th><th>Capacidade</th></tr></thead>
              <tbody>
                {projecao.map((dia) => (
                  <tr key={dia.data}>
                    <td>{dia.data.split('-').reverse().join('/')}</td>
                    <td>{dia.dia}</td>
                    <td>{(dia.minutosCalendario / 60).toFixed(1)} h</td>
                    <td>{(dia.minutosBloqueados / 60).toFixed(1)} h</td>
                    <td>{(dia.minutosDisponiveis / 60).toFixed(1)} h</td>
                    <td>{dia.configurado ? `${dia.capacidadeDisponivel.toFixed(2)} ${dia.unidade}` : 'Configuração incompleta'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

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
        </>
      )}
    </div>
  )
}
