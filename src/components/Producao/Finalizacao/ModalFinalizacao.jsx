import { useEffect, useMemo, useState } from 'react'
import { cadastrarBlank, formatarBlank, listarBlanks } from '../../../services/blanksService.js'

export default function ModalFinalizacao({ aberto, dados, setDados, onConfirmar, onCancelar, carregando, processo, blankPlanejado }) 

{
  const [blanks, setBlanks] = useState([])
  const [criandoBlank, setCriandoBlank] = useState(false)
  const [carregandoBlanks, setCarregandoBlanks] = useState(false)
  const [erroBlank, setErroBlank] = useState('')
  const [alterandoBlank, setAlterandoBlank] = useState(false)
  const ehOtimizadora = processo === 'OTIMIZADORA/FINGER'
  const novoBlank = dados.novoBlank || { classe: '', espessuraMm: '', larguraMm: '', comprimentoMm: '' }

  useEffect(() => {
    if (!aberto || !ehOtimizadora) return
    setAlterandoBlank(false)
    setCriandoBlank(false)
    async function carregar() {
      try {
        setCarregandoBlanks(true)
        setErroBlank('')
        setBlanks(await listarBlanks())
      } catch (error) {
        setErroBlank(error.message)
      } finally {
        setCarregandoBlanks(false)
      }
    }
    carregar()
  }, [aberto, ehOtimizadora])

  const blankSelecionado = useMemo(
    () => blanks.find((blank) => blank.id === dados.blankSaidaId),
    [blanks, dados.blankSaidaId]
  )

  function alterarNovoBlank(campo, valor) {
    setDados({ ...dados, novoBlank: { ...novoBlank, [campo]: valor } })
  }

  async function criarBlank() {
    try {
      setCarregandoBlanks(true)
      setErroBlank('')
      const criado = await cadastrarBlank(novoBlank)
      setBlanks((atuais) => [...atuais.filter((item) => item.id !== criado.id), criado])
      setDados({ ...dados, blankSaidaId: criado.id, novoBlank: { classe: '', espessuraMm: '', larguraMm: '', comprimentoMm: '' } })
      setCriandoBlank(false)
    } catch (error) {
      setErroBlank(error.message)
    } finally {
      setCarregandoBlanks(false)
    }
  }

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
          {ehOtimizadora && (
            <div className="blank-finalizacao full">
              <div className="blank-finalizacao-header">
                <div><strong>Blank produzido</strong><span>Classe e dimensões completas são obrigatórias.</span></div>
                <button type="button" className="btn ghost" onClick={() => setCriandoBlank((atual) => !atual)}>
                  {criandoBlank ? 'Selecionar existente' : '+ Novo Blank'}
                </button>
              </div>

              {erroBlank && <div className="alert">{erroBlank}</div>}

              {!criandoBlank ? (
                <>
                  {blankSelecionado && !alterandoBlank ? (
                    <div className="op-finger-blank-selected">
                      <div>
                        <small>{blankPlanejado?.id === blankSelecionado.id ? 'Blank planejado na criação da OP' : 'Blank selecionado para a produção'}</small>
                        <strong>{blankSelecionado.codigo} · {formatarBlank(blankSelecionado)}</strong>
                        <span>Confirme se este foi o padrão efetivamente produzido.</span>
                      </div>
                      <button type="button" className="btn ghost" onClick={() => setAlterandoBlank(true)}>Alterar</button>
                    </div>
                  ) : (
                    <label>
                      Padrão efetivamente produzido
                      <select value={dados.blankSaidaId || ''} onChange={(e) => { setDados({ ...dados, blankSaidaId: e.target.value }); setAlterandoBlank(false) }} disabled={carregandoBlanks}>
                        <option value="">{carregandoBlanks ? 'Carregando Blanks...' : 'Selecione o Blank produzido'}</option>
                        {blanks.map((blank) => <option key={blank.id} value={blank.id}>{blank.codigo} · {formatarBlank(blank)}</option>)}
                      </select>
                      <small>Altere somente se a produção real for diferente do planejamento.</small>
                    </label>
                  )}
                </>
              ) : (
                <div className="blank-dimensoes-grid">
                  <label>Classe<input value={novoBlank.classe} onChange={(e) => alterarNovoBlank('classe', e.target.value.toUpperCase())} placeholder="Ex.: C24" /></label>
                  <label>Espessura (mm)<input type="number" min="0.01" step="0.01" value={novoBlank.espessuraMm} onChange={(e) => alterarNovoBlank('espessuraMm', e.target.value)} /></label>
                  <label>Largura (mm)<input type="number" min="0.01" step="0.01" value={novoBlank.larguraMm} onChange={(e) => alterarNovoBlank('larguraMm', e.target.value)} /></label>
                  <label>Comprimento (mm)<input type="number" min="0.01" step="0.01" value={novoBlank.comprimentoMm} onChange={(e) => alterarNovoBlank('comprimentoMm', e.target.value)} /></label>
                  <button type="button" className="btn primary" onClick={criarBlank} disabled={carregandoBlanks}>Cadastrar e selecionar</button>
                </div>
              )}
            </div>
          )}

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
            disabled={carregando || (ehOtimizadora && !dados.blankSaidaId)}
          >
            {carregando ? 'Finalizando...' : 'Confirmar finalização'}
          </button>
        </div>
      </div>
    </div>
  )
}
