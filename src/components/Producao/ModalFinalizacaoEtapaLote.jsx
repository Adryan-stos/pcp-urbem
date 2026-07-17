import { useState } from 'react'

export default function ModalFinalizacaoEtapaLote({ aberto, opLote, carregando, onCancelar, onConfirmar }) {
  const [operador, setOperador] = useState('')

  if (!aberto || !opLote) return null

  return (
    <div className="modal-overlay">
      <div className="modal-card parada-modal">
        <div className="op-modal-header">
          <div>
            <span>{opLote.processo}</span>
            <h3>Finalizar etapa</h3>
            <small>{opLote.numero_op_lote}</small>
          </div>
        </div>

        <div className="alert-info">
          Os pacotes processados serão movimentados de <strong>{opLote.buffer_entrada}</strong> para{' '}
          <strong>{opLote.buffer_saida}</strong>. A mesma identificação acompanhará o material.
        </div>

        <label className="classificacao-operador">
          Operador
          <input value={operador} onChange={(event) => setOperador(event.target.value)} placeholder="Nome do operador" />
        </label>

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancelar}>Cancelar</button>
          <button type="button" className="btn primary" disabled={carregando} onClick={() => onConfirmar(operador)}>
            {carregando ? 'Finalizando...' : 'Confirmar finalização'}
          </button>
        </div>
      </div>
    </div>
  )
}
