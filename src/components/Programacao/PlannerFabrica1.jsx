import LinhaOPLote from './LinhaOPLote.jsx'

export default function PlannerFabrica1({
  opLotes, linhaArrastada, linhaSobre, setLinhaArrastada, 
  setLinhaSobre,reorganizarFilaOPLote,moverPrioridadeOPLote,
  recursosSetor, alterarRecursoOPLote, alterarDataInicioOPLote
}) {
  return (
    <section className="table-card">
      <div className="table-wrapper">
        <table className="machine-table">
          <thead>
            <tr>
              <th></th>
              <th>Prioridade</th>
              <th>OP Lote</th>
              <th>Material</th>
              <th>Quantidade</th>
              <th>Volume</th>
              <th>Buffer Entrada</th>
              <th>Buffer Saída</th>
              <th>Máquina</th>
              <th>Início previsto</th>
              <th>Status</th>
              <th>Ordem</th>
            </tr>
          </thead>

          <tbody>
            {opLotes.map((opLote) => (
              <LinhaOPLote
                key={opLote.id}
                opLote={opLote}
                linhaArrastada={linhaArrastada}
                linhaSobre={linhaSobre}
                setLinhaArrastada={setLinhaArrastada}
                setLinhaSobre={setLinhaSobre}
                reorganizarFilaOPLote={reorganizarFilaOPLote}
                moverPrioridadeOPLote={moverPrioridadeOPLote}
                recursosSetor={recursosSetor}
                alterarRecursoOPLote={alterarRecursoOPLote}
                alterarDataInicioOPLote={alterarDataInicioOPLote}
              />
            ))}

            {!opLotes.length && (
              <tr>
                <td colSpan="12" className="empty">
                  Nenhuma OP de lote criada para este setor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
