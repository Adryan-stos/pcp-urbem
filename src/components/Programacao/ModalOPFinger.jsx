import { useEffect, useMemo, useState } from 'react'
import { cadastrarBlank, formatarBlank, listarBlanks } from '../../services/blanksService.js'
import { listarItensDisponiveisParaOPFinger } from '../../services/opService.js'

const NOVO_BLANK_INICIAL = { classe: '', espessuraMm: '', larguraMm: '', comprimentoMm: '' }

export default function ModalOPFinger({ aberto, onCancelar, onSalvar, carregando }) {
  const [itens, setItens] = useState([])
  const [blanks, setBlanks] = useState([])
  const [itemId, setItemId] = useState('')
  const [blankId, setBlankId] = useState('')
  const [busca, setBusca] = useState('')
  const [criandoBlank, setCriandoBlank] = useState(false)
  const [novoBlank, setNovoBlank] = useState(NOVO_BLANK_INICIAL)
  const [erro, setErro] = useState('')
  const [carregandoDados, setCarregandoDados] = useState(false)

  useEffect(() => {
    if (!aberto) return
    let ativo = true
    setItemId('')
    setBlankId('')
    setBusca('')
    setCriandoBlank(false)
    setNovoBlank(NOVO_BLANK_INICIAL)
    setErro('')

    async function carregar() {
      try {
        setCarregandoDados(true)
        const [itensDisponiveis, catalogo] = await Promise.all([
          listarItensDisponiveisParaOPFinger(),
          listarBlanks()
        ])
        if (ativo) {
          setItens(itensDisponiveis)
          setBlanks(catalogo)
        }
      } catch (error) {
        if (ativo) setErro(error.message)
      } finally {
        if (ativo) setCarregandoDados(false)
      }
    }
    carregar()
    return () => { ativo = false }
  }, [aberto])

  const blanksFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return blanks
    return blanks.filter((blank) =>
      `${blank.codigo} ${blank.descricao} ${formatarBlank(blank)}`.toLowerCase().includes(termo)
    )
  }, [blanks, busca])

  async function salvarNovoBlank() {
    try {
      setErro('')
      const criado = await cadastrarBlank(novoBlank)
      setBlanks((atuais) => [...atuais.filter((blank) => blank.id !== criado.id), criado])
      setBlankId(criado.id)
      setCriandoBlank(false)
      setNovoBlank(NOVO_BLANK_INICIAL)
    } catch (error) {
      setErro(error.message)
    }
  }

  function confirmar() {
    const item = itens.find((registro) => registro.id === itemId)
    if (!item) return setErro('Selecione o projeto e o item da OP.')
    if (!blankId) return setErro('Selecione o Blank que será produzido.')
    onSalvar({ item, blankSaidaId: blankId })
  }

  if (!aberto) return null

  return (
    <div className="modal-overlay">
      <div className="modal-card op-lote-modal">
        <div className="op-modal-header">
          <div><span>Fábrica 2</span><h3>Nova OP — Otimizadora / Finger</h3></div>
          <button type="button" className="btn ghost" onClick={onCancelar}>Fechar</button>
        </div>

        {erro && <div className="alert">{erro}</div>}
        {carregandoDados ? <p>Carregando projetos e catálogo de Blanks...</p> : (
          <>
            <section className="recebimento-section">
              <h4>Projeto da OP</h4>
              <label>
                Projeto / item Master
                <select value={itemId} onChange={(event) => setItemId(event.target.value)}>
                  <option value="">Selecione...</option>
                  {itens.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.projetos?.codigo_interno || 'Sem projeto'} · {item.codigo_interno_item} · {item.tipo_material || 'Material não informado'}
                    </option>
                  ))}
                </select>
              </label>
              {!itens.length && <small>Não há itens Master sem OP disponíveis.</small>}
            </section>

            <section className="recebimento-section">
              <div className="op-modal-header">
                <div><h4>Produto de saída</h4><small>O comprimento faz parte da identificação do Blank.</small></div>
                <button type="button" className="btn ghost" onClick={() => setCriandoBlank((valor) => !valor)}>
                  {criandoBlank ? 'Cancelar novo Blank' : '+ Criar novo Blank'}
                </button>
              </div>

              {criandoBlank ? (
                <div className="recebimento-form-grid">
                  <label>Classe<input value={novoBlank.classe} onChange={(e) => setNovoBlank({ ...novoBlank, classe: e.target.value.toUpperCase() })} placeholder="C24" /></label>
                  <label>Espessura (mm)<input type="number" min="0.01" value={novoBlank.espessuraMm} onChange={(e) => setNovoBlank({ ...novoBlank, espessuraMm: e.target.value })} /></label>
                  <label>Largura (mm)<input type="number" min="0.01" value={novoBlank.larguraMm} onChange={(e) => setNovoBlank({ ...novoBlank, larguraMm: e.target.value })} /></label>
                  <label>Comprimento (mm)<input type="number" min="0.01" value={novoBlank.comprimentoMm} onChange={(e) => setNovoBlank({ ...novoBlank, comprimentoMm: e.target.value })} /></label>
                  <button type="button" className="btn primary" onClick={salvarNovoBlank}>Salvar e selecionar Blank</button>
                </div>
              ) : (
                <>
                  <label>Pesquisar Blank<input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Código, classe ou dimensão" /></label>
                  <label>
                    Blank de saída
                    <select value={blankId} onChange={(event) => setBlankId(event.target.value)}>
                      <option value="">Selecione...</option>
                      {blanksFiltrados.map((blank) => <option key={blank.id} value={blank.id}>{blank.codigo} · {formatarBlank(blank)}</option>)}
                    </select>
                  </label>
                </>
              )}
            </section>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancelar}>Cancelar</button>
          <button type="button" className="btn primary" onClick={confirmar} disabled={carregando || carregandoDados || criandoBlank}>
            {carregando ? 'Criando OP...' : 'Criar OP da Finger'}
          </button>
        </div>
      </div>
    </div>
  )
}
