import { useEffect, useState } from 'react'
import {
  calcularTempoTotalSegundos,
  carregarDiarioProducao,
  formatarTempo,
  somarTempoParado
} from '../../services/master360Service.js'

export default function Apontamento({ op }) {
  const [processos, setProcessos] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      if (!op?.id) return

      try {
        setCarregando(true)
        setErro('')

        const dados = await carregarDiarioProducao(op.id)
        setProcessos(dados)
      } catch (error) {
        setErro(error.message)
      } finally {
        setCarregando(false)
      }
    }

    carregar()
  }, [op?.id])

  return (
    <div className="master-360-content">
      <div className="apontamento-header">
        <div>
          <h4>Diário de Produção</h4>
          <span>Histórico operacional por processo da O.P.</span>
        </div>

        <strong>{processos.length} processos</strong>
      </div>

      {erro && <div className="alert">{erro}</div>}

      {carregando && <div className="empty">Carregando diário...</div>}

      {!carregando && !processos.length && (
        <div className="empty">Nenhum processo encontrado para esta O.P.</div>
      )}

      {!carregando && processos.length > 0 && (
        <div className="diario-processo-list">
          {processos.map((processo) => {
            const apontamento = processo.op_apontamentos?.[0]
            const paradas = processo.paradas_producao || []

            const tempoTotal = calcularTempoTotalSegundos(
              processo.inicio_producao,
              processo.fim_producao
            )

            const tempoParado = somarTempoParado(paradas)
            const tempoLiquido = Math.max(tempoTotal - tempoParado, 0)

            return (
              <article className="diario-processo-card" key={processo.id}>
                <div className="diario-processo-top">
                  <div>
                    <span>Processo</span>
                    <h4>
                      {processo.sequencia} - {processo.processo}
                    </h4>
                    <small>{processo.numero_talao || '-'}</small>
                  </div>

                  <strong className={`op-status ${processo.status?.toLowerCase().replaceAll(' ', '-')}`}>
                    {processo.status}
                  </strong>
                </div>

                <div className="diario-grid">
                  <div>
                    <span>Início</span>
                    <strong>
                      {processo.inicio_producao
                        ? new Date(processo.inicio_producao).toLocaleString('pt-BR')
                        : '-'}
                    </strong>
                  </div>

                  <div>
                    <span>Fim</span>
                    <strong>
                      {processo.fim_producao
                        ? new Date(processo.fim_producao).toLocaleString('pt-BR')
                        : '-'}
                    </strong>
                  </div>

                  <div>
                    <span>Tempo total</span>
                    <strong>{formatarTempo(tempoTotal)}</strong>
                  </div>

                  <div>
                    <span>Tempo parado</span>
                    <strong>{formatarTempo(tempoParado)}</strong>
                  </div>

                  <div>
                    <span>Tempo líquido</span>
                    <strong>{formatarTempo(tempoLiquido)}</strong>
                  </div>

                  <div>
                    <span>Paradas</span>
                    <strong>{paradas.length}</strong>
                  </div>
                </div>

                {apontamento ? (
                  <div className="diario-apontamento">
                    <h5>Apontamento</h5>

                    <div className="diario-grid">
                      <div>
                        <span>Entrada</span>
                        <strong>
                          {apontamento.quantidade_entrada || 0}{' '}
                          {apontamento.produto_entrada || '-'}
                        </strong>
                      </div>

                      <div>
                        <span>Saída</span>
                        <strong>
                          {apontamento.quantidade_saida || 0}{' '}
                          {apontamento.produto_saida || '-'}
                        </strong>
                      </div>

                      <div>
                        <span>Perdas</span>
                        <strong>{apontamento.quantidade_perda || 0}</strong>
                      </div>

                      <div>
                        <span>M³ produzido</span>
                        <strong>
                          {Number(apontamento.volume_produzido_m3 || 0).toFixed(4)}
                        </strong>
                      </div>
                    </div>

                    {apontamento.observacao && (
                      <div className="diario-observacao">
                        <span>Observação</span>
                        <strong>{apontamento.observacao}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty">Sem apontamento registrado.</div>
                )}

                {paradas.length > 0 && (
                  <div className="diario-paradas">
                    <h5>Paradas</h5>

                    {paradas.map((parada) => (
                      <div className="diario-parada-item" key={parada.id}>
                        <strong>
                          {parada.motivos_parada?.codigo || '-'} -{' '}
                          {parada.motivos_parada?.motivo || parada.motivo || '-'}
                        </strong>

                        <span>
                          {parada.inicio_parada
                            ? new Date(parada.inicio_parada).toLocaleString('pt-BR')
                            : '-'}{' '}
                          até{' '}
                          {parada.fim_parada
                            ? new Date(parada.fim_parada).toLocaleString('pt-BR')
                            : 'em aberto'}
                        </span>

                        <small>
                          Duração: {formatarTempo(parada.duracao_segundos || 0)}
                          {parada.motivo_fechamento
                            ? ` • Fechamento: ${parada.motivo_fechamento}`
                            : ''}
                        </small>

                        {parada.observacao && <p>{parada.observacao}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}