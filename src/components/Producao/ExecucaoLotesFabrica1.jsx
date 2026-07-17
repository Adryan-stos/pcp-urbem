import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { listarOPLotesExecucao } from '../../services/execucaoOpLoteService.js'

export default function ExecucaoLotesFabrica1({ processo = 'AUTOCLAVE', onExecutar }) {
  const [ops, setOps] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function carregar() {
    try {
      setCarregando(true)
      setErro('')
      setOps(await listarOPLotesExecucao(processo))
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [processo])

  return (
    <section className="execucao-lotes-f1">
      <div className="centro-execucao-header">
        <div>
          <h3>{processo} — sequência de produção</h3>
          <span>Fila conforme programação e prioridade definidas pelo PCP.</span>
        </div>
        <button type="button" className="btn ghost" onClick={carregar} disabled={carregando}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {erro && <div className="alert">{erro}</div>}

      <div className="execucao-lotes-grid">
        {ops.map((op) => {
          const itens = (op.op_lote_itens || []).filter((item) => ['Reservado', 'Processado'].includes(item.status))
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
                <button type="button" className="btn primary" onClick={() => onExecutar?.(op.numero_op_lote)}>
                  Executar
                </button>
              </div>
            </article>
          )
        })}

        {!carregando && !ops.length && (
          <div className="empty-card">Nenhuma OP de lote disponível para {processo}.</div>
        )}
      </div>
    </section>
  )
}
