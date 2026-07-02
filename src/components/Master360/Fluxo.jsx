import { Factory, Package, Ticket } from 'lucide-react'
import { classeProcessoStatus } from './utils'

export default function Fluxo({ processos }) {
  const indiceAtual = processos.findIndex(
    (processo) => !['Finalizado', 'Concluído'].includes(processo.status)
  )

  return (
    <div className="master-360-content">
      <div className="op-flow">
        {processos.map((processo, index) => {
          const statusClasse = classeProcessoStatus(processo.status)
          const processoAtual = index === indiceAtual

          return (
            <div
              className={`op-flow-step ${statusClasse} ${
                processoAtual ? 'processo-atual' : ''
              }`}
              key={processo.id}
            >
              <div className={`op-flow-dot ${statusClasse}`}>
                {processo.sequencia}
              </div>

              <div className="op-flow-content">
                <strong>
                  {processo.sequencia} - {processo.processo}
                </strong>

                <div className="processo-tags">
                  <span className="tag-processo">
                    <Factory size={13} />
                    {processo.recurso || 'A definir'}
                  </span>

                  <span className="tag-processo">
                    <Package size={13} />
                    {processo.tipo_item_processo || '-'}
                  </span>

                  <span className="tag-processo">
                    <Ticket size={13} />
                    {processo.numero_talao || '-'}
                  </span>
                </div>

                <small className={`processo-status ${statusClasse}`}>
                  {processo.status}
                </small>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}