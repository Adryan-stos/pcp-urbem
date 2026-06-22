export default function Dashboard() {
  return (
    <>
      <section className="hero-dashboard">
        <div>
          <p className="eyebrow">Sistema de Programação e Controle</p>
          <h2>Torre de Controle da Produção</h2>
          <p>
            Gestão de projetos, engenharia, programação, execução e histórico produtivo da Fábrica 2.
          </p>
        </div>
      </section>

      <section className="cards-grid">
        <div className="card">
          <span>Projetos concluídos</span>
          <strong>0</strong>
          <small>Histórico geral</small>
        </div>

        <div className="card">
          <span>Projetos em execução</span>
          <strong>0</strong>
          <small>Fábrica 2</small>
        </div>

        <div className="card">
          <span>Projetos em programação</span>
          <strong>0</strong>
          <small>Aguardando sequenciamento</small>
        </div>

        <div className="card">
          <span>Setores ativos</span>
          <strong>6</strong>
          <small>Finger, Plaina, Prensa, CNC...</small>
        </div>
      </section>
    </>
  )
}