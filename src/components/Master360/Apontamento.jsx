import { useEffect, useState } from 'react'
import { listarApontamentosPorOP } from '../../services/apontamentoService.js'

export default function Apontamento({ op }) {
  const [apontamentos, setApontamentos] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregarApontamentos() {
      if (!op?.id) return

      try {
        setCarregando(true)
        setErro('')

        const dados = await listarApontamentosPorOP(op.id)
        setApontamentos(dados)
      } catch (error) {
        setErro(error.message)
      } finally {
        setCarregando(false)
      }
    }

    carregarApontamentos()
  }, [op?.id])

  return (
    <div className="master-360-content">
      <div className="apontamento-header">
        <div>
          <h4>Apontamentos da produção</h4>
          <span>Resumo dos apontamentos registrados para esta O.P.</span>
        </div>

        <strong>{apontamentos.length} registros</strong>
      </div>

      {erro && <div className="alert">{erro}</div>}

      {carregando && <div className="empty">Carregando apontamentos...</div>}

      {!carregando && !apontamentos.length && (
        <div className="empty">
          Nenhum apontamento registrado para esta O.P.
        </div>
      )}

      {!carregando && apontamentos.length > 0 && (
        <div className="apontamento-list">
          {apontamentos.map((apontamento) => (
            <div className="apontamento-card" key={apontamento.id}>
              <div>
                <span>Processo</span>
                <strong>
                  {apontamento.op_processos?.sequencia} -{' '}
                  {apontamento.op_processos?.processo}
                </strong>
              </div>

              <div>
                <span>Talão</span>
                <strong>{apontamento.op_processos?.numero_talao || '-'}</strong>
              </div>

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

              <div>
                <span>Data</span>
                <strong>
                  {apontamento.created_at
                    ? new Date(apontamento.created_at).toLocaleString('pt-BR')
                    : '-'}
                </strong>
              </div>

              {apontamento.observacao && (
                <div className="apontamento-observacao">
                  <span>Observação</span>
                  <strong>{apontamento.observacao}</strong>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}