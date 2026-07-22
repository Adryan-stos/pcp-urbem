import { useEffect, useMemo, useState } from 'react'
import { cadastrarBlank, formatarBlank, listarBlanks } from '../../services/blanksService.js'
import { listarItensDisponiveisParaOPFinger } from '../../services/opService.js'

const NOVO_BLANK_INICIAL = { classe: '', espessuraMm: '', larguraMm: '', comprimentoMm: '' }

export default function ModalOPFinger({ aberto, onCancelar, onSalvar, carregando }) {
  const [itens, setItens] = useState([])
  const [blanks, setBlanks] = useState([])
  const [buscaProjeto, setBuscaProjeto] = useState('')
  const [projetoId, setProjetoId] = useState('')
  const [buscaItem, setBuscaItem] = useState('')
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
    setBuscaProjeto('')
    setProjetoId('')
    setBuscaItem('')
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

  const projetos = useMemo(() => {
    const unicos = new Map()
    itens.forEach((item) => {
      const projeto = item.projetos
      if (!item.projeto_id || !projeto || unicos.has(item.projeto_id)) return
      unicos.set(item.projeto_id, {
        id: item.projeto_id,
        codigo: projeto.codigo_interno || 'Sem código',
        nome: projeto.nome_projeto || projeto.cliente || 'Projeto sem nome'
      })
    })

    const termo = buscaProjeto.trim().toLowerCase()
    return [...unicos.values()].filter((projeto) =>
      !termo || `${projeto.codigo} ${projeto.nome}`.toLowerCase().includes(termo)
    )
  }, [itens, buscaProjeto])

  const itensFiltrados = useMemo(() => {
    if (!projetoId) return []
    const termo = buscaItem.trim().toLowerCase()
    return itens.filter((item) => {
      const pertenceAoProjeto = item.projeto_id === projetoId
      const texto = `${item.codigo_interno_item || ''} ${item.tipo_material || ''}`.toLowerCase()
      return pertenceAoProjeto && (!termo || texto.includes(termo))
    })
  }, [itens, projetoId, buscaItem])

  const blanksFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return blanks
    return blanks.filter((blank) =>
      `${blank.codigo} ${blank.descricao} ${formatarBlank(blank)}`.toLowerCase().includes(termo)
    )
  }, [blanks, busca])

  const blankSelecionado = useMemo(
    () => blanks.find((blank) => blank.id === blankId),
    [blanks, blankId]
  )

  function selecionarProjeto(id) {
    setProjetoId(id)
    setItemId('')
    setBuscaItem('')
  }

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
              <p className="op-finger-section-help">Localize primeiro o projeto e depois escolha o item Master que será vinculado à OP.</p>
              <div className="op-finger-link-grid">
                <label className="op-finger-field">
                  <span>Pesquisar projeto</span>
                  <input value={buscaProjeto} onChange={(event) => setBuscaProjeto(event.target.value)} placeholder="Código, nome ou cliente" />
                </label>
                <label className="op-finger-field">
                  <span>Projeto</span>
                  <select value={projetoId} onChange={(event) => selecionarProjeto(event.target.value)}>
                    <option value="">Selecione o projeto...</option>
                    {projetos.map((projeto) => (
                      <option key={projeto.id} value={projeto.id}>{projeto.codigo} · {projeto.nome}</option>
                    ))}
                  </select>
                </label>
                <label className="op-finger-field">
                  <span>Pesquisar item</span>
                  <input value={buscaItem} onChange={(event) => setBuscaItem(event.target.value)} placeholder="Código ou tipo de material" disabled={!projetoId} />
                </label>
                <label className="op-finger-field">
                  <span>Item Master para vínculo</span>
                  <select value={itemId} onChange={(event) => setItemId(event.target.value)} disabled={!projetoId}>
                    <option value="">{projetoId ? 'Selecione o item...' : 'Selecione primeiro o projeto'}</option>
                    {itensFiltrados.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.codigo_interno_item} · {item.tipo_material || 'Material não informado'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {!itens.length && <small>Não há itens Master sem OP disponíveis.</small>}
              {projetoId && !itensFiltrados.length && <small>Nenhum item disponível encontrado neste projeto.</small>}
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
                <div className="op-finger-blank-picker">
                  <label className="op-finger-field">
                    <span>Pesquisar e selecionar Blank</span>
                    <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Digite o código, a classe ou as dimensões" />
                  </label>

                  {blankSelecionado && (
                    <div className="op-finger-selected">
                      <div><small>Blank selecionado</small><strong>{blankSelecionado.codigo} · {formatarBlank(blankSelecionado)}</strong></div>
                      <button type="button" className="btn ghost" onClick={() => setBlankId('')}>Alterar</button>
                    </div>
                  )}

                  {!blankSelecionado && (
                    <div className="op-finger-blank-results" role="listbox" aria-label="Blanks encontrados">
                      {blanksFiltrados.slice(0, 10).map((blank) => (
                        <button key={blank.id} type="button" className="op-finger-blank-option" onClick={() => setBlankId(blank.id)}>
                          <strong>{blank.codigo}</strong>
                          <span>{formatarBlank(blank)}</span>
                        </button>
                      ))}
                      {!blanksFiltrados.length && <p>Nenhum Blank encontrado. Você pode criar um novo padrão.</p>}
                      {blanksFiltrados.length > 10 && <small>Refine a pesquisa para visualizar os demais resultados.</small>}
                    </div>
                  )}
                </div>
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
