export default function CardExecucao({ card, onExecutar }) {
  const criticidadeLabel = {
    'no-prazo': 'No prazo',
    atencao: 'Atenção',
    atrasado: 'Atrasado',
    bloqueado: 'Bloqueado'
  }

  const classeSituacao = {
    'no-prazo': 'scheduled',
    atencao: 'upcoming',
    atrasado: 'late',
    bloqueado: 'blocked'
  }[card.criticidade] || 'scheduled'

  return (
    <article className={`execucao-lote-card ${classeSituacao}`}>
      <header>
        <div>
          <span className="execucao-lote-prioridade">
            Prioridade #{String(card.prioridade).padStart(2, '0')}
          </span>
          <h4>{card.talao}</h4>
        </div>
        <span className={`execucao-lote-status ${classeSituacao}`}>
          {criticidadeLabel[card.criticidade] || card.status}
        </span>
      </header>

      <div className="execucao-lote-resumo">
        <div><span>Processo</span><strong>{card.setor}</strong></div>
        <div><span>Sequência</span><strong>{card.processo}</strong></div>
        <div><span>Transformação</span><strong>{card.transformacao}</strong></div>
        <div><span>Status</span><strong>{card.status}</strong></div>
      </div>

      <div className="execucao-lote-pacotes">
        {card.master && card.master !== '-' && <span>ITEM {card.master}</span>}
        {card.projeto && card.projeto !== '-' && <span>PROJETO {card.projeto}</span>}
      </div>

      <div className="execucao-lote-actions">
        <button type="button" className="btn primary" onClick={onExecutar}>
          Executar
        </button>
      </div>
    </article>
  )
}
