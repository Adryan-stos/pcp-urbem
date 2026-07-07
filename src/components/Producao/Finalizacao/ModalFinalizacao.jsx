export default function ModalFinalizacao({ aberto, dados, setDados, onConfirmar, onCancelar, carregando }) 

{
  if (!aberto) return null

  return (
    <div className="modal-overlay">
      <div className="modal-card parada-modal">
        <div className="op-modal-header">
          <div>
            <span>Produção</span>
            <h3>Finalizar produção</h3>
          </div>

          <button type="button" className="btn ghost" onClick={onCancelar}>
            Fechar
          </button>
        </div>

        <div className="form-grid">
          <label>
            Quantidade de entrada
            <input
              type="number"
              value={dados.quantidadeEntrada}
              onChange={(e) =>
                setDados({ ...dados, quantidadeEntrada: e.target.value })
              }
            />
          </label>

          <label>
            Quantidade de saída
            <input
              type="number"
              value={dados.quantidadeSaida}
              onChange={(e) =>
                setDados({ ...dados, quantidadeSaida: e.target.value })
              }
            />
          </label>

          <label>
            Quantidade de perda
            <input
              type="number"
              value={dados.quantidadePerda}
              onChange={(e) =>
                setDados({ ...dados, quantidadePerda: e.target.value })
              }
            />
          </label>

          <label>
            Observação
            <textarea
              value={dados.observacao}
              onChange={(e) =>
                setDados({ ...dados, observacao: e.target.value })
              }
              placeholder="Descreva informações relevantes da finalização"
            />
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancelar}>
            Cancelar
          </button>

          <button
            type="button"
            className="btn primary"
            onClick={onConfirmar}
            disabled={carregando}
          >
            {carregando ? 'Finalizando...' : 'Confirmar finalização'}
          </button>
        </div>
      </div>
    </div>
  )
}