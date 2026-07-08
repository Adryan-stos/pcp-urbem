import { useEffect, useState } from 'react'
import { listarMateriasPrimasPorOP } from '../../services/materiaPrimaService.js'

export default function MateriaPrima({ op }) {
  const [materias, setMaterias] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      if (!op?.id) return

      try {
        setCarregando(true)
        setErro('')

        const dados = await listarMateriasPrimasPorOP(op.id)
        setMaterias(dados)
      } catch (error) {
        setErro(error.message)
      } finally {
        setCarregando(false)
      }
    }

    carregar()
  }, [op?.id])

  const volumeRecebido = materias.reduce(
    (total, item) => total + Number(item.volume_recebido_m3 || 0),
    0
  )

  const volumeConsumido = materias.reduce(
    (total, item) => total + Number(item.volume_consumido_m3 || 0),
    0
  )

  const saldo = materias.reduce(
    (total, item) => total + Number(item.saldo_m3 || 0),
    0
  )

  return (
    <div className="master-360-content">
      <div className="apontamento-header">
        <div>
          <h4>Matéria-Prima</h4>
          <span>Materiais vinculados à O.P. e base de rastreabilidade.</span>
        </div>

        <strong>{materias.length} vínculos</strong>
      </div>

      {erro && <div className="alert">{erro}</div>}

      <div className="materia-kpi-grid">
        <div>
          <span>Volume recebido</span>
          <strong>{volumeRecebido.toFixed(3)} m³</strong>
        </div>

        <div>
          <span>Volume consumido</span>
          <strong>{volumeConsumido.toFixed(3)} m³</strong>
        </div>

        <div>
          <span>Saldo</span>
          <strong>{saldo.toFixed(3)} m³</strong>
        </div>
      </div>

      {carregando && <div className="empty">Carregando matérias-primas...</div>}

      {!carregando && !materias.length && (
        <div className="empty">
          Nenhuma matéria-prima vinculada a esta O.P.
        </div>
      )}

      {!carregando && materias.length > 0 && (
        <div className="materia-list">
          {materias.map((item) => (
            <article className="materia-card" key={item.id}>
              <div className="materia-card-header">
                <div>
                  <span>Fornecedor</span>
                  <h4>{item.fornecedor || '-'}</h4>
                </div>

                <strong>{item.fsc ? 'FSC' : 'Não FSC'}</strong>
              </div>

              <div className="materia-grid">
                <div>
                  <span>NF Recebimento</span>
                  <strong>{item.nf_recebimento || '-'}</strong>
                </div>

                <div>
                  <span>Lote</span>
                  <strong>{item.lote || '-'}</strong>
                </div>

                <div>
                  <span>Espécie</span>
                  <strong>{item.especie || '-'}</strong>
                </div>

                <div>
                  <span>Classe</span>
                  <strong>{item.classe || '-'}</strong>
                </div>

                <div>
                  <span>Recebido</span>
                  <strong>{Number(item.volume_recebido_m3 || 0).toFixed(3)} m³</strong>
                </div>

                <div>
                  <span>Consumido</span>
                  <strong>{Number(item.volume_consumido_m3 || 0).toFixed(3)} m³</strong>
                </div>

                <div>
                  <span>Saldo</span>
                  <strong>{Number(item.saldo_m3 || 0).toFixed(3)} m³</strong>
                </div>
              </div>

              {item.observacao && (
                <div className="materia-observacao">
                  <span>Observação</span>
                  <strong>{item.observacao}</strong>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}