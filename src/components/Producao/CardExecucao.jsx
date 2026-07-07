export default function CardExecucao({ card, onExecutar }) {
  const criticidadeLabel = {
    'no-prazo': 'No prazo',
    atencao: 'Atenção',
    atrasado: 'Atrasado',
    bloqueado: 'Bloqueado'
  }

  return (
    <article className={`exec-card ${card.criticidade}`}>
      <div className="exec-card-top">
        <strong>Prioridade {String(card.prioridade).padStart(2, '0')}</strong>
        <span>{criticidadeLabel[card.criticidade]}</span>
      </div>

      <h4>{card.processo}</h4>

      <div className="exec-card-info">
        <span>Setor</span>
        <strong>{card.setor}</strong>
      </div>

      <div className="exec-card-info">
        <span>Talão</span>
        <strong>{card.talao}</strong>
      </div>

      <div className="exec-card-info">
        <span>Transformação</span>
        <strong>{card.transformacao}</strong>
      </div>

      <div className="exec-card-footer">
        <span>{card.status}</span>

        <button type="button" onClick={onExecutar}>
          Executar
        </button>
      </div>
    </article>
  )
}