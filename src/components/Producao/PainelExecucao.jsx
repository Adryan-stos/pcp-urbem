import { useEffect, useState } from 'react'
import ModalParada from './Paradas/ModalParada.jsx'
import { carregarMotivosParada } from '../../services/motivoParadaService.js'
import { iniciarParada, retomarProducao } from '../../services/paradaService.js'
import ModalFinalizacao from './Finalizacao/ModalFinalizacao.jsx'
import { finalizarProducao } from '../../services/finalizacaoService.js'

export default function PainelExecucao({ talao, somenteConsulta = false, onNovaBusca }) {
  const [motivos, setMotivos] = useState([])
  const [modalParadaAberto, setModalParadaAberto] = useState(false)
  const [motivoSelecionado, setMotivoSelecionado] = useState('')
  const [observacaoParada, setObservacaoParada] = useState('')
  const [carregandoParada, setCarregandoParada] = useState(false)
  const [erro, setErro] = useState('')
  const [processoAtual, setProcessoAtual] = useState(talao)
  const [modalFinalizacaoAberto, setModalFinalizacaoAberto] = useState(false)
  const [carregandoFinalizacao, setCarregandoFinalizacao] = useState(false)
  const [dadosFinalizacao, setDadosFinalizacao] = useState({ quantidadeEntrada: '',  quantidadeSaida: '', quantidadePerda: '', observacao: '' })
  
  
  async function confirmarFinalizacao() {
    try {
      setCarregandoFinalizacao(true)
      setErro('')
      
      const { processoAtualizado } = await finalizarProducao(processoAtual, {
        quantidadeEntrada: dadosFinalizacao.quantidadeEntrada
        ? Number(dadosFinalizacao.quantidadeEntrada)
        : null,
        quantidadeSaida: dadosFinalizacao.quantidadeSaida
        ? Number(dadosFinalizacao.quantidadeSaida)
        : null,
        quantidadePerda: dadosFinalizacao.quantidadePerda
        ? Number(dadosFinalizacao.quantidadePerda)
        : 0,
        observacao: dadosFinalizacao.observacao
      })
      
      setProcessoAtual((atual) => ({
        ...atual,
        ...processoAtualizado
      }))
      
      setModalFinalizacaoAberto(false)
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregandoFinalizacao(false)
    }
  }
  
  
  useEffect(() => {
    
    async function carregar() {
      try {
        
        const dados = await carregarMotivosParada(talao.processo)
        
        setMotivos(dados)
      } catch (error) {
        setErro(error.message)
      }
    }
    
    carregar()
  }, [talao.processo])
  
  async function confirmarParada() {
    
    
    try {
      if (!motivoSelecionado) {
        setErro('Selecione um motivo de parada.')
        return
      }
      
      setCarregandoParada(true)
      setErro('')
      
      const motivoEncontrado = motivos.find( (motivo) => motivo.id === motivoSelecionado )
      
      await iniciarParada(processoAtual.id, {
        motivoParadaId: motivoSelecionado,
        motivo: motivoEncontrado
        ? `${motivoEncontrado.codigo} - ${motivoEncontrado.motivo}`
        : null,
          observacao: observacaoParada
        })
        
      setProcessoAtual((atual) => ({
        ...atual,
        status: 'Em pausa',
        status_pcp: 'Em pausa'
      }))
      
      setModalParadaAberto(false)
      setMotivoSelecionado('')
      setObservacaoParada('')
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
      
      await retomarProducao(processoAtual.id)
      
      setProcessoAtual((atual) => ({
        ...atual,
        status: 'Em produção',
        status_pcp: 'Em produção'
      }))
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregandoParada(false)
    }
  }

  return (
    <section className="execucao-talao-card">
      <div className="execucao-talao-header">
        <div>
          <span>
            {processoAtual.status === 'Concluído'
              ? 'Produção finalizada'
              : processoAtual.status === 'Em pausa'
                ? 'Produção em pausa'
                : 'Produção em andamento'}
          </span>
          <h3>{processoAtual.numero_talao}</h3>
        </div>

        <button type="button" className="btn ghost" onClick={onNovaBusca}>
          Nova busca
        </button>
      </div>

      {erro && <div className="alert">{erro}</div>}

      <div
        className={`execucao-status-box ${
          processoAtual.status === 'Em pausa' ? 'bloqueado' : 'liberado'
        }`}
        >
        <strong>{processoAtual.status}</strong>
        <span>
          Produção iniciada em{' '}
          {processoAtual.inicio_producao
            ? new Date(processoAtual.inicio_producao).toLocaleString('pt-BR')
            : '-'}
        </span>
      </div>

      <div className="execucao-talao-grid">
        <div>
          <span>OP</span>
          <strong>{processoAtual.ordens_producao?.numero_op || '-'}</strong>
        </div>

        <div>
          <span>Processo</span>
          <strong>
            {processoAtual.sequencia} - {processoAtual.processo}
          </strong>
        </div>

        <div>
          <span>Recurso</span>
          <strong>{processoAtual.recurso || '-'}</strong>
        </div>

        <div>
          <span>Transformação</span>
          <strong>
            {processoAtual.produto_entrada || '-'} →{' '}
            {processoAtual.produto_saida || '-'}
          </strong>
        </div>
      </div>
        
              {processoAtual.status === 'Concluído' && (
                <div className="execucao-status-box liberado">
                  <strong>Produção finalizada</strong>
                  <span>Este talão foi concluído e está disponível para consulta.</span>
                </div>
              )}

      {processoAtual.status !== 'Concluído' && !somenteConsulta && (
        <div className="execucao-actions-grid">
          {processoAtual.status === 'Em pausa' ? (
            <button
              type="button"
              className="execucao-pause-button"
              onClick={handleRetomar}
              disabled={carregandoParada}
            >
              ▶ Retomar produção
            </button>
          ) : (
            <button
              type="button"
              className="execucao-pause-button"
              onClick={() => setModalParadaAberto(true)}
            >
              ⏸ Registrar parada
            </button>
          )}

          <button
            type="button"
            className="execucao-finish-button"
            onClick={() => setModalFinalizacaoAberto(true)}
          >
            ■ Finalizar produção
          </button>
        </div>
      )}

      <ModalParada
        aberto={modalParadaAberto}
        motivos={motivos}
        motivoSelecionado={motivoSelecionado}
        setMotivoSelecionado={setMotivoSelecionado}
        observacao={observacaoParada}
        setObservacao={setObservacaoParada}
        onConfirmar={confirmarParada}
        onCancelar={() => setModalParadaAberto(false)}
        carregando={carregandoParada}
        />
      <ModalFinalizacao
        aberto={modalFinalizacaoAberto}
        dados={dadosFinalizacao}
        setDados={setDadosFinalizacao}
        onConfirmar={confirmarFinalizacao}
        onCancelar={() => setModalFinalizacaoAberto(false)}
        carregando={carregandoFinalizacao}
        />
    </section>
  )
}
