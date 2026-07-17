import { useEffect, useState } from 'react'
import { CalendarClock, X } from 'lucide-react'

function agoraLocal() {
  const data = new Date()
  data.setMinutes(data.getMinutes() - data.getTimezoneOffset())
  return data.toISOString().slice(0, 16)
}

export default function ModalPlanejamentoOperacao({ operacao, onCancelar, onAplicar }) {
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const minimo = agoraLocal()

  useEffect(() => {
    setInicio(operacao?.inicio ? String(operacao.inicio).slice(0, 16) : '')
    setFim(operacao?.fim ? String(operacao.fim).slice(0, 16) : '')
    setErro('')
  }, [operacao])

  if (!operacao) return null

  async function aplicar(event) {
    event.preventDefault()
    if (!inicio || !fim) {
      setErro('Informe o início e o término previstos.')
      return
    }
    if (inicio < minimo) {
      setErro('O início previsto não pode ser anterior ao momento atual.')
      return
    }
    if (fim < minimo) {
      setErro('O término previsto não pode ser anterior ao momento atual.')
      return
    }
    if (fim <= inicio) {
      setErro('O término previsto deve ser posterior ao início previsto.')
      return
    }

    try {
      setSalvando(true)
      setErro('')
      await onAplicar({ ...operacao, inicio, fim })
    } catch (error) {
      setErro(error.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="planning-modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onCancelar()}>
      <form className="planning-modal" onSubmit={aplicar} role="dialog" aria-modal="true" aria-labelledby="planning-modal-title">
        <div className="planning-modal-header">
          <div><CalendarClock size={21} /><span><small>Planejamento PCP</small><strong id="planning-modal-title">Alterar datas da operação</strong></span></div>
          <button type="button" onClick={onCancelar} aria-label="Fechar"><X size={18} /></button>
        </div>

        <div className="planning-modal-operation">
          <span>Operação</span>
          <strong>{operacao.titulo || 'OP sem número'}</strong>
          <small>A alteração será aplicada ao início e ao término previstos.</small>
        </div>

        {erro && <div className="alert">{erro}</div>}

        <div className="planning-modal-fields">
          <label>Início previsto<input type="datetime-local" min={minimo} value={inicio} onChange={(e) => setInicio(e.target.value)} /></label>
          <label>Término previsto<input type="datetime-local" min={inicio || minimo} value={fim} onChange={(e) => setFim(e.target.value)} /></label>
        </div>

        <div className="planning-modal-actions">
          <button type="button" className="btn ghost" onClick={onCancelar} disabled={salvando}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={salvando}>{salvando ? 'Aplicando...' : 'Aplicar datas'}</button>
        </div>
      </form>
    </div>
  )
}
