export default function ModalParada({ aberto, motivos, motivoSelecionado, setMotivoSelecionado, observacao, setObservacao, onConfirmar, onCancelar , carregando 
    
}) 
    {
        if (!aberto) return null

         return (
    <div className="modal-overlay">
      <div className="modal-card parada-modal">
        <div className="op-modal-header">
          <div>
            <span>Produção</span>
            <h3>Registrar parada</h3>
          </div>

          <button type="button" className="btn ghost" onClick={onCancelar}>
            Fechar
          </button>
        </div>

        <div className="form-grid">
          <label>
            Motivo da parada
            <select
              value={motivoSelecionado}
              onChange={(e) => setMotivoSelecionado(e.target.value)}
            >
              <option value="">Selecione um motivo</option>

              {motivos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigo} - {item.motivo || item.descricao || 'Sem descrição'}
                </option>
              ))}
            </select>
          </label>

          <label>
            Observação
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Descreva detalhes da parada, se necessário"
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
            {carregando ? 'Registrando...' : 'Confirmar parada'}
          </button>
        </div>
      </div>
    </div>
  )
}
