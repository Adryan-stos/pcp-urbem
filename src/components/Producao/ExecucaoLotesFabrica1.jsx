import { useEffect, useState } from 'react'
import { Play, RefreshCw, Tags } from 'lucide-react'
import {
  finalizarClassificacaoOPLote,
  iniciarExecucaoOPLote,
  listarOPLotesExecucao
} from '../../services/execucaoOpLoteService.js'
import ModalClassificacaoLote from './ModalClassificacaoLote.jsx'
import ModalEtiquetasClassificacao from '../Etiquetas/ModalEtiquetasClassificacao.jsx'

export default function ExecucaoLotesFabrica1() {
  const [ops, setOps] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [opFinalizacao, setOpFinalizacao] = useState(null)
  const [resultado, setResultado] = useState(null)

  async function carregar() {
    try {
      setCarregando(true)
      setErro('')
      setOps(await listarOPLotesExecucao('CLASSIFICADORA'))
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function iniciar(op) {
    try {
      setCarregando(true)
      setErro('')
      await iniciarExecucaoOPLote(op.id)
      await carregar()
    } catch (error) {
      setErro(error.message)
      setCarregando(false)
    }
  }

  async function finalizar(dados) {
    try {
      setCarregando(true)
      setErro('')
      const resposta = await finalizarClassificacaoOPLote({
        opLoteId: opFinalizacao.id,
        ...dados
      })
      setResultado({ ...resposta, opLote: opFinalizacao })
      setOpFinalizacao(null)
      await carregar()
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <section className="execucao-lotes-f1">
      <div className="centro-execucao-header">
        <div>
          <h3>Classificadora — OPs por lote</h3>
          <span>Execução conectada à fila e aos pacotes reservados pelo PCP.</span>
        </div>
        <button type="button" className="btn ghost" onClick={carregar} disabled={carregando}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {erro && <div className="alert">{erro}</div>}

      <div className="execucao-lotes-grid">
        {ops.map((op) => {
          const itens = (op.op_lote_itens || []).filter((item) => item.status === 'Reservado')
          const quantidade = itens.reduce((total, item) => total + Number(item.quantidade_prevista || 0), 0)
          const volume = itens.reduce((total, item) => total + Number(item.volume_previsto_m3 || 0), 0)
          return (
            <article className="execucao-lote-card" key={op.id}>
              <header>
                <div>
                  <span>Prioridade #{op.prioridade ?? '-'}</span>
                  <h4>{op.numero_op_lote}</h4>
                </div>
                <span className={`op-status ${op.status === 'Em produção' ? 'em-producao' : 'programado'}`}>{op.status}</span>
              </header>
              <div className="execucao-lote-resumo">
                <div><span>Pacotes</span><strong>{itens.length}</strong></div>
                <div><span>Quantidade</span><strong>{quantidade} un.</strong></div>
                <div><span>Volume</span><strong>{volume.toFixed(4)} m³</strong></div>
                <div><span>Destino</span><strong>{op.buffer_saida}</strong></div>
              </div>
              <div className="execucao-lote-pacotes">
                {itens.map((item) => {
                  const pacote = item.pacotes_materia_prima || {}
                  return <span key={item.id}>{pacote.codigo_pacote || pacote.codigo_item || item.estoque_item_id}</span>
                })}
              </div>
              <div className="execucao-lote-actions">
                {op.status === 'Em produção' ? (
                  <button type="button" className="btn primary" onClick={() => setOpFinalizacao(op)}>
                    <Tags size={17} /> Finalizar classificação
                  </button>
                ) : (
                  <button type="button" className="btn primary" onClick={() => iniciar(op)}>
                    <Play size={17} /> Iniciar produção
                  </button>
                )}
              </div>
            </article>
          )
        })}

        {!carregando && !ops.length && (
          <div className="empty-card">Nenhuma OP de lote disponível para a Classificadora.</div>
        )}
      </div>

      <ModalClassificacaoLote
        aberto={Boolean(opFinalizacao)}
        opLote={opFinalizacao}
        carregando={carregando}
        onCancelar={() => setOpFinalizacao(null)}
        onConfirmar={finalizar}
      />

      <ModalEtiquetasClassificacao
        aberto={Boolean(resultado?.saidas?.length)}
        saidas={resultado?.saidas || []}
        opLote={resultado?.opLote}
        onFechar={() => setResultado(null)}
      />
    </section>
  )
}
