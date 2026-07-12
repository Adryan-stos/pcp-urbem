import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  criarOPLote,
  listarOPLotesPorProcesso,
  reordenarOPLotes
} from '../services/opLoteService.js'
import ModalOPLote from '../components/Programacao/ModalOPLote.jsx'
import PlannerFabrica1 from '../components/Programacao/PlannerFabrica1.jsx'
import PlannerFabrica2 from '../components/Programacao/PlannerFabrica2.jsx'

const setoresFabrica1 = [
  { id: 'AUTOCLAVE', label: 'Autoclave', fabrica: 1, tipoOP: 'lote' },
  { id: 'GRADEADOR', label: 'Gradeador', fabrica: 1, tipoOP: 'lote' },
  { id: 'ESTUFA', label: 'Estufa', fabrica: 1, tipoOP: 'lote' },
  { id: 'CLASSIFICADORA', label: 'Classificadora', fabrica: 1, tipoOP: 'lote' }
]

const setoresFabrica2 = [
  { id: 'OTIMIZADORA/FINGER', label: 'Otimizadora / Finger', fabrica: 2, tipoOP: 'projeto' },
  { id: 'PLAINA', label: 'Plainas', fabrica: 2, tipoOP: 'projeto' },
  { id: 'PRENSA', label: 'Prensas', fabrica: 2, tipoOP: 'projeto' },
  { id: 'DESTOPADEIRA', label: 'Destopadeira', fabrica: 2, tipoOP: 'projeto' },
  { id: 'CNC', label: 'CNC', fabrica: 2, tipoOP: 'projeto' },
  { id: 'ACABAMENTO', label: 'Acabamento', fabrica: 2, tipoOP: 'projeto' }
]

const setores = [...setoresFabrica1, ...setoresFabrica2]

const capacidadeFilaSetor = {
  AUTOCLAVE: 11, GRADEADOR: 11, ESTUFA: 11, CLASSIFICADORA: 11,

  'OTIMIZADORA/FINGER': 21, PLAINA: 21, PRENSA: 21,

  DESTOPADEIRA: 31, CNC: 31, ACABAMENTO: 31
}


export default function CargaMaquina() {
  const [setorAtual, setSetorAtual] = useState('AUTOCLAVE')
  const [fabricaAtual, setFabricaAtual] = useState(1)
  const [processos, setProcessos] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [linhaArrastada, setLinhaArrastada] = useState(null)
  const [linhaSobre, setLinhaSobre] = useState(null)
  const [opLotes, setOpLotes] = useState([])
  const [modalOPLoteAberto, setModalOPLoteAberto] = useState(false)
  const [salvandoOPLote, setSalvandoOPLote] = useState(false)

  const setoresDaFabrica = fabricaAtual === 1 ? setoresFabrica1 : setoresFabrica2

  const setorSelecionado = setores.find((setor) => setor.id === setorAtual)
  const ehFabrica1 = setorSelecionado?.fabrica === 1

  const capacidadeFila = capacidadeFilaSetor[setorAtual] || 11
  

async function carregarProcessos() {
  try {
    setCarregando(true)
    setErro('')

    if (ehFabrica1) {
      const lotes = await listarOPLotesPorProcesso(setorAtual)
      setOpLotes(lotes)
      setProcessos([])
      return
    }

    setOpLotes([])

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
      .in('status', [
        'Liberado para programação',
        'Programado',
        'Em produção',
        'Em pausa'
      ])
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
}, [setorAtual, fabricaAtual])

  const processosDoSetor = processos
    .filter((processo) => processo.processo === setorAtual || processo.recurso === setorAtual )
    .sort((a, b) => {
        const prioridadeA = a.prioridade ?? 999
        const prioridadeB = b.prioridade ?? 999

        return prioridadeA - prioridadeB
    })

  const kpis = ehFabrica1
    ? {
        total: opLotes.length,
        semProgramar: opLotes.filter(op => op.prioridade == null).length,

        volumeTotal: opLotes.reduce(
          (t, op) =>
            t +
            (op.op_lote_itens || []).reduce(
              (v, i) => v + Number(i.volume_previsto_m3 || 0),
              0
            ),
          0
        ),

        volumeSemProgramar: opLotes
          .filter(op => op.prioridade == null)
          .reduce(
            (t, op) =>
              t +
              (op.op_lote_itens || []).reduce(
                (v, i) => v + Number(i.volume_previsto_m3 || 0),
                0
              ),
            0
          ),

        projetos: 0
      }
    : {
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

    const programados = filaCompactada.slice(0, capacidadeFila)
    const excedentes = filaCompactada.slice(capacidadeFila)

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
        if (direcao === -1) destino = capacidadeFila - 1
        else return
    } else {
        destino = Number(prioridadeAtual) + direcao
    }

    if (destino < 0) return

    if (destino >= capacidadeFila) {
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
      ? capacidadeFila - 1
      : Number(processoAlvo.prioridade)

    await reorganizarFila(linhaArrastada, prioridadeDestino)
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
        const novaFila = Array(capacidadeFila).fill(null)

        filaAtual.forEach((processo) => {
            const posicao = Number(processo.prioridade)

            if (posicao >= 0 && posicao < capacidadeFila) {
            novaFila[posicao] = processo
            }
        })

        // Remove buracos antes de inserir
        const filaCompactada = novaFila.filter(Boolean)

        // Insere a OP arrastada na posição desejada
        filaCompactada.splice(prioridadeDestino, 0, linhaArrastada)

        // Limita de 0 a 10
        const programados = filaCompactada.slice(0, capacidadeFila)
        const excedentes = filaCompactada.slice(capacidadeFila)

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

    async function salvarOPLote(dados) {
      try {
        setSalvandoOPLote(true)
        setErro('')

        await criarOPLote({
          processo: setorAtual,
          prioridade: dados.prioridade,
          dataPrevistaInicio: dados.dataPrevistaInicio,
          dataPrevistaFim: dados.dataPrevistaFim,
          observacao: dados.observacao,
          itens: dados.itens
        })

        setModalOPLoteAberto(false)
        await carregarProcessos()
      } catch (error) {
        setErro(error.message)
      } finally {
        setSalvandoOPLote(false)
      }
    }
      
    function selecionarFabrica(fabrica) {
        setFabricaAtual(fabrica)
    
        if (fabrica === 1) {
          setSetorAtual('AUTOCLAVE')
        } else {
          setSetorAtual('OTIMIZADORA/FINGER')
        }
      }
  
  function finalizarArraste() {
    setLinhaArrastada(null)
    setLinhaSobre(null)
  }

  const posicoesFila = Array.from(
    { length: capacidadeFila },
    (_, index) => index
  )

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

  async function reorganizarFilaOPLote(opMovida, prioridadeDestino) {
    try {
      setErro('')

      const filaAtual = opLotes
        .filter((op) => op.id !== opMovida.id)
        .sort((a, b) => Number(a.prioridade ?? 999) - Number(b.prioridade ?? 999))

      const novaFila = [...filaAtual]
      novaFila.splice(prioridadeDestino, 0, opMovida)

      await reordenarOPLotes(
        setorAtual,
        novaFila.map((op) => op.id)
      )

      await carregarProcessos()
    } catch (error) {
      setErro(error.message)
    } finally {
      setLinhaArrastada(null)
      setLinhaSobre(null)
    }
  }

  async function moverPrioridadeOPLote(opLote, direcao) {
    const filaOrdenada = [...opLotes].sort(
      (a, b) => Number(a.prioridade ?? 999) - Number(b.prioridade ?? 999)
    )
    const indiceAtual = filaOrdenada.findIndex((op) => op.id === opLote.id)
    const destino = indiceAtual + direcao

    if (destino < 0) return
    if (destino >= filaOrdenada.length) return

    await reorganizarFilaOPLote(opLote, destino)
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

      <section className="machine-overview-panel">
        <div className="machine-overview-header">
          <div>
            <span>Visão Geral</span>
            <h3>Carga Máquina</h3>
          </div>

          <small>
            {fabricaAtual === 1
              ? 'Fábrica 1 · OPs por lote e estoque'
              : 'Fábrica 2 · OPs por projeto e processo'}
          </small>
        </div>

        <div className="machine-factory-card-grid">
          <button
            type="button"
            className={`machine-factory-card ${fabricaAtual === 1 ? 'active' : ''}`}
            onClick={() => selecionarFabrica(1)}
          >
            <span>Produção primária</span>
            <strong>Fábrica 1</strong>
            <small>Autoclave, Gradeador, Estufa e Classificadora</small>
          </button>

          <button
            type="button"
            className={`machine-factory-card ${fabricaAtual === 2 ? 'active' : ''}`}
            onClick={() => selecionarFabrica(2)}
          >
            <span>Produção por projeto</span>
            <strong>Fábrica 2</strong>
            <small>Otimizadora, Plainas, Prensas, CNC e Acabamento</small>
          </button>
        </div>

        <div className="machine-sector-tabs planner-style">
          {setoresDaFabrica.map((setor) => (
            <button
              key={setor.id}
              type="button"
              className={`machine-sector-tab ${setorAtual === setor.id ? 'active' : ''}`}
              onClick={() => setSetorAtual(setor.id)}
            >
              {setor.label}
            </button>
          ))}
        </div>
      </section>
      {ehFabrica1 && (
        <div className="machine-lote-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => setModalOPLoteAberto(true)}
          >
            + Nova OP de Lote
          </button>
        </div>
      )}
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
      {ehFabrica1 ? (
        <PlannerFabrica1
          opLotes={opLotes}
          linhaArrastada={linhaArrastada}
          linhaSobre={linhaSobre}
          setLinhaArrastada={setLinhaArrastada}
          setLinhaSobre={setLinhaSobre}
          reorganizarFilaOPLote={reorganizarFilaOPLote}
          moverPrioridadeOPLote={moverPrioridadeOPLote}
        />
      ) : (
        <PlannerFabrica2
          posicoesFila={posicoesFila}
          processosSemPrioridade={processosSemPrioridade}
          processosDoSetor={processosDoSetor}
          obterProcessoNaPrioridade={obterProcessoNaPrioridade}
          linhaArrastada={linhaArrastada}
          linhaSobre={linhaSobre}
          setLinhaSobre={setLinhaSobre}
          iniciarArrasteLinha={iniciarArrasteLinha}
          passarSobreLinha={passarSobreLinha}
          soltarLinha={soltarLinha}
          soltarNaPosicao={soltarNaPosicao}
          finalizarArraste={finalizarArraste}
          alterarDataInicio={alterarDataInicio}
          alterarStatusPCP={alterarStatusPCP}
          moverPrioridade={moverPrioridade}
        />
      )}

          <ModalOPLote
            aberto={modalOPLoteAberto}
            processo={setorAtual}
            onCancelar={() => setModalOPLoteAberto(false)}
            onSalvar={salvarOPLote}
            carregando={salvandoOPLote}
          />

        </div>

  )
}
