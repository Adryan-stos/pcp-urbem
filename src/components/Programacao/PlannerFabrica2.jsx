import LinhaProcesso from './LinhaProcesso.jsx'

export default function PlannerFabrica2({
  posicoesFila,
  processosSemPrioridade,
  processosDoSetor,
  obterProcessoNaPrioridade,
  linhaArrastada,
  linhaSobre,
  setLinhaSobre,
  iniciarArrasteLinha,
  passarSobreLinha,
  soltarLinha,
  soltarNaPosicao,
  finalizarArraste,
  alterarDataInicio,
  alterarStatusPCP,
  moverPrioridade
}) {
  return (
    <section className="table-card">
      <div className="table-wrapper">
        <table className="machine-table">
          <thead>
            <tr>
              <th>Prioridade</th>
              <th>O.P</th>
              <th>Projeto</th>
              <th>Prazo entrega</th>
              <th>Entrada em máquina</th>
              <th>Previsão término</th>
              <th>Status PCP</th>
              <th>Item</th>
              <th>M³</th>
              <th>Ordem</th>
            </tr>
          </thead>

          <tbody>
            {posicoesFila.map((posicao) => {
              const processo = obterProcessoNaPrioridade(posicao)

              if (!processo) {
                return (
                  <tr
                    key={`vazio-${posicao}`}
                    className={`machine-empty-row ${
                      linhaSobre === `vazio-${posicao}` ? 'drag-over' : ''
                    }`}
                    onDragOver={(event) => event.preventDefault()}
                    onDragEnter={(event) => {
                      event.preventDefault()
                      setLinhaSobre(`vazio-${posicao}`)
                    }}
                    onDragLeave={() => setLinhaSobre(null)}
                    onDrop={(event) => soltarNaPosicao(event, posicao)}
                  >
                    <td className="priority-cell">#{posicao + 1}</td>
                    <td colSpan="9" className="empty">
                      Sem OP programada nesta posição.
                    </td>
                  </tr>
                )
              }

              return (
                <LinhaProcesso
                  key={processo.id}
                  processo={processo}
                  linhaArrastada={linhaArrastada}
                  linhaSobre={linhaSobre}
                  iniciarArrasteLinha={iniciarArrasteLinha}
                  passarSobreLinha={passarSobreLinha}
                  soltarLinha={soltarLinha}
                  finalizarArraste={finalizarArraste}
                  alterarDataInicio={alterarDataInicio}
                  alterarStatusPCP={alterarStatusPCP}
                  moverPrioridade={moverPrioridade}
                />
              )
            })}

            {processosSemPrioridade.length > 0 && (
              <tr className="machine-section-row">
                <td colSpan="10">Aguardando programação</td>
              </tr>
            )}

            {processosSemPrioridade.map((processo) => (
              <LinhaProcesso
                key={processo.id}
                processo={processo}
                semPrioridade
                linhaArrastada={linhaArrastada}
                linhaSobre={linhaSobre}
                iniciarArrasteLinha={iniciarArrasteLinha}
                passarSobreLinha={passarSobreLinha}
                soltarLinha={soltarLinha}
                finalizarArraste={finalizarArraste}
                alterarDataInicio={alterarDataInicio}
                alterarStatusPCP={alterarStatusPCP}
                moverPrioridade={moverPrioridade}
              />
            ))}

            {!processosDoSetor.length && (
              <tr>
                <td colSpan="10" className="empty">
                  Nenhum processo liberado para este setor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}