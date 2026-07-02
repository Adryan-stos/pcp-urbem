import Resumo from './Resumo.jsx'
import Fluxo from './Fluxo.jsx'
import ArvoreProducao from './ArvoreProducao.jsx'
import Apontamento from './Apontamento.jsx'
import Historico from './Historico.jsx'

export default function Master360({
  op,
  master,
  processos,
  abaAtual,
  setAbaAtual,
  onClose
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-card op-modal master-360-modal">
        <div className="op-modal-header">
          <div>
            <span>Master 360</span>
            <h3>{master?.codigo_interno_item || op?.numero_op}</h3>
          </div>

          <button type="button" className="btn ghost" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="master-360-tabs">
          <button
            type="button"
            className={abaAtual === 'resumo' ? 'active' : ''}
            onClick={() => setAbaAtual('resumo')}
          >
            Resumo
          </button>

          <button
            type="button"
            className={abaAtual === 'fluxo' ? 'active' : ''}
            onClick={() => setAbaAtual('fluxo')}
          >
            Fluxo da OP
          </button>

          <button
            type="button"
            className={abaAtual === 'arvore' ? 'active' : ''}
            onClick={() => setAbaAtual('arvore')}
          >
            Árvore
          </button>

          <button
            type="button"
            className={abaAtual === 'apontamentos' ? 'active' : ''}
            onClick={() => setAbaAtual('apontamentos')}
          >
            Apontamentos
          </button>

          <button
            type="button"
            className={abaAtual === 'historico' ? 'active' : ''}
            onClick={() => setAbaAtual('historico')}
          >
            Histórico
          </button>
        </div>

        {abaAtual === 'resumo' && <Resumo op={op} master={master} />}

        {abaAtual === 'fluxo' && (
          <Fluxo processos={processos} />
        )}

        {abaAtual === 'arvore' && <ArvoreProducao master={master} />}

        {abaAtual === 'apontamentos' && <Apontamento />}

        {abaAtual === 'historico' && <Historico />}
      </div>
    </div>
  )
}