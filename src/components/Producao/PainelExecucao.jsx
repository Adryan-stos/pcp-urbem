import { useEffect, useMemo, useState } from 'react'
import ModalParada from './Paradas/ModalParada.jsx'
import { carregarMotivosParada } from '../../services/motivoParadaService.js'
import {
  calcularTempoParadoSegundos,
  iniciarParada,
  listarParadasPorProcesso,
  retomarProducao
} from '../../services/paradaService.js'
import ModalFinalizacao from './Finalizacao/ModalFinalizacao.jsx'
import { finalizarProducao } from '../../services/finalizacaoService.js'
import {
  finalizarClassificacaoOPLote,
  finalizarEtapaOPLote
} from '../../services/execucaoOpLoteService.js'
import ModalClassificacaoLote from './ModalClassificacaoLote.jsx'
import ModalFinalizacaoEtapaLote from './ModalFinalizacaoEtapaLote.jsx'
import ModalEtiquetasClassificacao from '../Etiquetas/ModalEtiquetasClassificacao.jsx'

function formatarDuracao(segundos) {
  const total = Math.max(0, Math.floor(Number(segundos || 0)))
  const horas = Math.floor(total / 3600)
  const minutos = Math.floor((total % 3600) / 60)
  const segundosRestantes = total % 60
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundosRestantes).padStart(2, '0')}`
}

export default function PainelExecucao({ talao, somenteConsulta = false, onNovaBusca }) {
  const [motivos, setMotivos] = useState([])
  const [paradas, setParadas] = useState([])
  const [agora, setAgora] = useState(Date.now())
  const [modalParadaAberto, setModalParadaAberto] = useState(false)
  const [motivoSelecionado, setMotivoSelecionado] = useState('')
  const [observacaoParada, setObservacaoParada] = useState('')
  const [carregandoParada, setCarregandoParada] = useState(false)
  const [erro, setErro] = useState('')
  const [processoAtual, setProcessoAtual] = useState(talao)
  const [modalFinalizacaoAberto, setModalFinalizacaoAberto] = useState(false)
  const [modalClassificacaoAberto, setModalClassificacaoAberto] = useState(false)
  const [modalEtapaAberto, setModalEtapaAberto] = useState(false)
  const [resultadoClassificacao, setResultadoClassificacao] = useState(null)
  const [carregandoFinalizacao, setCarregandoFinalizacao] = useState(false)
  const [dadosFinalizacao, setDadosFinalizacao] = useState({ quantidadeEntrada: '', quantidadeSaida: '', quantidadePerda: '', observacao: '', blankSaidaId: '', novoBlank: { classe: '', espessuraMm: '', larguraMm: '', comprimentoMm: '' } })
  const tipoOperacao = processoAtual._tipo_operacao || 'processo'
  const ehLote = tipoOperacao === 'lote'

  async function carregarParadas() {
    const dados = await listarParadasPorProcesso(processoAtual.id, tipoOperacao)
    setParadas(dados)
  }

  useEffect(() => {
    setProcessoAtual(talao)
  }, [talao])

  useEffect(() => {
    async function carregar() {
      try {
        const [dadosMotivos] = await Promise.all([
          carregarMotivosParada(talao.processo),
          carregarParadas()
        ])
        setMotivos(dadosMotivos)
      } catch (error) {
        setErro(error.message)
      }
    }
    carregar()
  }, [talao.id, talao.processo, tipoOperacao])

  useEffect(() => {
    const intervalo = window.setInterval(() => setAgora(Date.now()), 1000)
    return () => window.clearInterval(intervalo)
  }, [])

  const tempos = useMemo(() => {
    const inicio = processoAtual.inicio_producao ? new Date(processoAtual.inicio_producao).getTime() : agora
    const fim = processoAtual.fim_producao ? new Date(processoAtual.fim_producao).getTime() : agora
    const bruto = Math.max(0, Math.floor((fim - inicio) / 1000))
    const parado = calcularTempoParadoSegundos(paradas)
    return { bruto, parado, produtivo: Math.max(0, bruto - parado) }
  }, [agora, paradas, processoAtual.inicio_producao, processoAtual.fim_producao])

  async function confirmarFinalizacaoProcesso() {
    try {
      setCarregandoFinalizacao(true)
      setErro('')
      const { processoAtualizado } = await finalizarProducao(processoAtual, {
        quantidadeEntrada: dadosFinalizacao.quantidadeEntrada ? Number(dadosFinalizacao.quantidadeEntrada) : null,
        quantidadeSaida: dadosFinalizacao.quantidadeSaida ? Number(dadosFinalizacao.quantidadeSaida) : null,
        quantidadePerda: dadosFinalizacao.quantidadePerda ? Number(dadosFinalizacao.quantidadePerda) : 0,
        observacao: dadosFinalizacao.observacao,
        blankSaidaId: dadosFinalizacao.blankSaidaId || null
      })
      setProcessoAtual((atual) => ({ ...atual, ...processoAtualizado }))
      setModalFinalizacaoAberto(false)
      await carregarParadas()
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregandoFinalizacao(false)
    }
  }

  async function confirmarFinalizacaoEtapa(operador) {
    try {
      setCarregandoFinalizacao(true)
      setErro('')
      const resultado = await finalizarEtapaOPLote(processoAtual.id, operador)
      setProcessoAtual((atual) => ({ ...atual, ...resultado.op_lote, _tipo_operacao: 'lote', numero_talao: resultado.op_lote.numero_op_lote }))
      setModalEtapaAberto(false)
      await carregarParadas()
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregandoFinalizacao(false)
    }
  }

  async function confirmarClassificacao(dados) {
    try {
      setCarregandoFinalizacao(true)
      setErro('')
      const resultado = await finalizarClassificacaoOPLote({ opLoteId: processoAtual.id, ...dados })
      setResultadoClassificacao(resultado)
      setProcessoAtual((atual) => ({ ...atual, ...resultado.op_lote, _tipo_operacao: 'lote', numero_talao: resultado.op_lote.numero_op_lote }))
      setModalClassificacaoAberto(false)
      await carregarParadas()
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregandoFinalizacao(false)
    }
  }

  async function confirmarParada() {
    try {
      if (!motivoSelecionado) {
        setErro('Selecione um motivo de parada.')
        return
      }
      setCarregandoParada(true)
      setErro('')
      const motivoEncontrado = motivos.find((motivo) => motivo.id === motivoSelecionado)
      await iniciarParada(processoAtual.id, {
        motivoParadaId: motivoSelecionado,
        motivo: motivoEncontrado ? `${motivoEncontrado.codigo} - ${motivoEncontrado.motivo}` : null,
        observacao: observacaoParada
      }, tipoOperacao)
      setProcessoAtual((atual) => ({ ...atual, status: 'Em pausa', status_pcp: 'Em pausa' }))
      setModalParadaAberto(false)
      setMotivoSelecionado('')
      setObservacaoParada('')
      await carregarParadas()
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregandoParada(false)
    }
  }

  async function handleRetomar() {
    try {
      setCarregandoParada(true)
      setErro('')
      await retomarProducao(processoAtual.id, tipoOperacao)
      setProcessoAtual((atual) => ({ ...atual, status: 'Em produção', status_pcp: 'Em produção' }))
      await carregarParadas()
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregandoParada(false)
    }
  }

  function abrirFinalizacao() {
    if (!ehLote) {
      setDadosFinalizacao((dadosAtuais) => ({
        ...dadosAtuais,
        blankSaidaId: processoAtual.processo === 'OTIMIZADORA/FINGER'
          ? (processoAtual.blank_saida_id || dadosAtuais.blankSaidaId || '')
          : dadosAtuais.blankSaidaId
      }))
      setModalFinalizacaoAberto(true)
    }
    else if (processoAtual.processo === 'CLASSIFICADORA') setModalClassificacaoAberto(true)
    else setModalEtapaAberto(true)
  }

  return (
    <section className="execucao-talao-card">
      <div className="execucao-talao-header">
        <div>
          <span>{processoAtual.status === 'Concluído' ? 'Produção finalizada' : processoAtual.status === 'Em pausa' ? 'Produção em pausa' : 'Produção em andamento'}</span>
          <h3>{processoAtual.numero_talao}</h3>
        </div>
        <button type="button" className="btn ghost" onClick={onNovaBusca}>Nova busca</button>
      </div>

      {erro && <div className="alert">{erro}</div>}

      <div className={`execucao-status-box ${processoAtual.status === 'Em pausa' ? 'bloqueado' : 'liberado'}`}>
        <strong>{processoAtual.status}</strong>
        <span>Produção iniciada em {processoAtual.inicio_producao ? new Date(processoAtual.inicio_producao).toLocaleString('pt-BR') : '-'}</span>
      </div>

      <div className="execucao-tempos-grid">
        <div><span>Tempo transcorrido</span><strong>{formatarDuracao(tempos.bruto)}</strong></div>
        <div className="parado"><span>Tempo parado</span><strong>{formatarDuracao(tempos.parado)}</strong></div>
        <div className="produtivo"><span>Tempo produtivo</span><strong>{formatarDuracao(tempos.produtivo)}</strong></div>
      </div>

      <div className="execucao-talao-grid">
        <div><span>OP</span><strong>{ehLote ? processoAtual.numero_op_lote : processoAtual.ordens_producao?.numero_op || '-'}</strong></div>
        <div><span>Processo</span><strong>{processoAtual.sequencia} - {processoAtual.processo}</strong></div>
        <div><span>Recurso</span><strong>{processoAtual.recurso || '-'}</strong></div>
        <div><span>Transformação</span><strong>{processoAtual.produto_entrada || '-'} → {processoAtual.produto_saida || '-'}</strong></div>
        {processoAtual.processo === 'OTIMIZADORA/FINGER' && (
          <div>
            <span>Blank planejado</span>
            <strong>{processoAtual.blanks?.codigo || processoAtual.produto_saida || '-'}</strong>
            {processoAtual.blanks && <small>{`${processoAtual.blanks.classe} - ${Number(processoAtual.blanks.espessura_mm)} × ${Number(processoAtual.blanks.largura_mm)} × ${Number(processoAtual.blanks.comprimento_mm)} mm`}</small>}
          </div>
        )}
      </div>

      {processoAtual.status !== 'Concluído' && !somenteConsulta && (
        <div className="execucao-actions-grid">
          {processoAtual.status === 'Em pausa' ? (
            <button type="button" className="execucao-pause-button" onClick={handleRetomar} disabled={carregandoParada}>▶ Retomar produção</button>
          ) : (
            <button type="button" className="execucao-pause-button" onClick={() => setModalParadaAberto(true)}>⏸ Registrar parada</button>
          )}
          <button type="button" className="execucao-finish-button" onClick={abrirFinalizacao}>■ Finalizar produção</button>
        </div>
      )}

      <ModalParada aberto={modalParadaAberto} motivos={motivos} motivoSelecionado={motivoSelecionado} setMotivoSelecionado={setMotivoSelecionado} observacao={observacaoParada} setObservacao={setObservacaoParada} onConfirmar={confirmarParada} onCancelar={() => setModalParadaAberto(false)} carregando={carregandoParada} />
      <ModalFinalizacao aberto={modalFinalizacaoAberto} dados={dadosFinalizacao} setDados={setDadosFinalizacao} onConfirmar={confirmarFinalizacaoProcesso} onCancelar={() => setModalFinalizacaoAberto(false)} carregando={carregandoFinalizacao} processo={processoAtual.processo} blankPlanejado={processoAtual.blanks} />
      <ModalFinalizacaoEtapaLote aberto={modalEtapaAberto} opLote={processoAtual} carregando={carregandoFinalizacao} onCancelar={() => setModalEtapaAberto(false)} onConfirmar={confirmarFinalizacaoEtapa} />
      <ModalClassificacaoLote aberto={modalClassificacaoAberto} opLote={processoAtual} carregando={carregandoFinalizacao} onCancelar={() => setModalClassificacaoAberto(false)} onConfirmar={confirmarClassificacao} />
      <ModalEtiquetasClassificacao aberto={Boolean(resultadoClassificacao?.saidas?.length)} saidas={resultadoClassificacao?.saidas || []} opLote={processoAtual} onFechar={() => setResultadoClassificacao(null)} />
    </section>
  )
}
