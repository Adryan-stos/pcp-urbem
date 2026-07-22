import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Filter, Printer, RefreshCw, Search } from 'lucide-react'
import { contarReimpressoes, listarHistoricoOPs, registrarReimpressao } from '../services/historicoOPService.js'
import { listarEtiquetasClassificacao } from '../services/execucaoOpLoteService.js'
import ModalEtiquetasClassificacao from '../components/Etiquetas/ModalEtiquetasClassificacao.jsx'
import ModalEtiquetaOperacao from '../components/Etiquetas/ModalEtiquetaOperacao.jsx'
import { substituirHistoricoGRD } from '../services/importacaoGRDService.js'

function dataInput(data, fim = false) {
  if (!data) return null
  return new Date(`${data}T${fim ? '23:59:59.999' : '00:00:00'}`)
}

function dataHora(valor) {
  return valor ? new Date(valor).toLocaleString('pt-BR') : '-'
}

export default function HistoricoOPs() {
  const [operacoes, setOperacoes] = useState([])
  const [contagens, setContagens] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [detalhe, setDetalhe] = useState(null)
  const [etiquetaOperacao, setEtiquetaOperacao] = useState(null)
  const [etiquetas, setEtiquetas] = useState([])
  const [filtros, setFiltros] = useState({ busca: '', fabrica: '', processo: '', status: '', inicio: '', fim: '' })
  const [importando, setImportando] = useState(false)

  async function carregar() {
    try {
      setCarregando(true)
      setErro('')
      const dados = await listarHistoricoOPs()
      setOperacoes(dados)
      setContagens(await contarReimpressoes(dados))
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function importarGRD(event) {
    const arquivo = event.target.files?.[0]
    event.target.value = ''
    if (!arquivo) return
    try {
      setImportando(true); setErro('')
      const resultado = await substituirHistoricoGRD(arquivo)
      await carregar()
      window.alert(`${resultado.registros.toLocaleString('pt-BR')} registros importados. Dados disponíveis até ${dataHora(resultado.ultimaData)}.`)
    } catch (error) { setErro(`Não foi possível importar o GRD: ${error.message}`) }
    finally { setImportando(false) }
  }

  const processos = useMemo(() => [...new Set(operacoes.map((op) => op.processo).filter(Boolean))].sort(), [operacoes])
  const filtradas = useMemo(() => operacoes.filter((op) => {
    const termo = filtros.busca.trim().toLocaleLowerCase('pt-BR')
    const texto = [op.numero, op.projeto, op.item, op.operador, op.recurso_nome].join(' ').toLocaleLowerCase('pt-BR')
    const encerramento = op.encerrado_em ? new Date(op.encerrado_em) : null
    return (!termo || texto.includes(termo))
      && (!filtros.fabrica || op.fabrica === filtros.fabrica)
      && (!filtros.processo || op.processo === filtros.processo)
      && (!filtros.status || op.status === filtros.status)
      && (!filtros.inicio || (encerramento && encerramento >= dataInput(filtros.inicio)))
      && (!filtros.fim || (encerramento && encerramento <= dataInput(filtros.fim, true)))
  }), [operacoes, filtros])

  async function abrirEtiqueta(op) {
    try {
      setErro('')
      if (op._tipo_operacao === 'lote' && op.processo === 'CLASSIFICADORA') {
        const dados = await listarEtiquetasClassificacao(op.id)
        if (!dados.length) throw new Error('Nenhuma etiqueta foi encontrada para esta OP.')
        setDetalhe(op)
        setEtiquetas(dados)
      } else {
        setEtiquetaOperacao(op)
      }
    } catch (error) {
      setErro(error.message)
    }
  }

  async function registrar(op, pacoteId = null) {
    try {
      await registrarReimpressao({ operacao: op, pacoteId })
      setContagens((atual) => ({ ...atual, [op._id]: (atual[op._id] || 0) + 1 }))
    } catch (error) {
      setErro(`A etiqueta foi aberta, mas a auditoria da reimpressão falhou: ${error.message}`)
    }
  }

  return (
    <div className="page historico-op-page">
      <header className="page-header historico-op-header">
        <div><p className="eyebrow">GRD</p><h2>Histórico de OPs</h2><span>Consulte operações encerradas e reimprima etiquetas com rastreabilidade.</span></div>
        <div className="header-actions">
          <label className="btn ghost" aria-disabled={importando}><input type="file" accept=".xlsb,.xlsx,.xls" hidden disabled={importando} onChange={importarGRD} />{importando ? 'Importando...' : 'Importar/atualizar GRD'}</label>
          <button type="button" className="btn ghost" onClick={carregar}><RefreshCw size={17} /> Atualizar</button>
        </div>
      </header>

      <section className="historico-filtros">
        <label className="historico-busca"><Search size={17} /><input placeholder="OP, pacote, item, projeto, recurso ou operador" value={filtros.busca} onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })} /></label>
        <select value={filtros.fabrica} onChange={(e) => setFiltros({ ...filtros, fabrica: e.target.value })}><option value="">Todas as fábricas</option><option>Fábrica 1</option><option>Fábrica 2</option></select>
        <select value={filtros.processo} onChange={(e) => setFiltros({ ...filtros, processo: e.target.value })}><option value="">Todos os processos</option>{processos.map((p) => <option key={p}>{p}</option>)}</select>
        <select value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}><option value="">Todos os status</option><option>Concluído</option><option>Finalizado</option><option>Validado</option><option>Cancelado</option></select>
        <label><span>De</span><input type="date" value={filtros.inicio} onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })} /></label>
        <label><span>Até</span><input type="date" value={filtros.fim} onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })} /></label>
        <button type="button" className="btn ghost" onClick={() => setFiltros({ busca: '', fabrica: '', processo: '', status: '', inicio: '', fim: '' })}><Filter size={16} /> Limpar</button>
      </section>

      <div className="historico-resumo"><strong>{filtradas.length}</strong><span>operações encontradas</span></div>
      {erro && <div className="alert">{erro}</div>}
      {carregando && <div className="empty-card">Carregando histórico...</div>}
      {!carregando && !filtradas.length && <div className="empty-card">Nenhuma OP encontrada com os filtros informados.</div>}

      {!carregando && filtradas.map((op) => (
        <article className="historico-op-card" key={op._id}>
          <button type="button" className="historico-op-linha" onClick={() => setDetalhe(detalhe?._id === op._id ? null : op)}>
            <div><span>OP / Talão</span><strong>{op.numero}</strong></div>
            <div><span>Processo</span><strong>{op.processo}</strong></div>
            <div><span>Recurso</span><strong>{op.recurso_nome}</strong></div>
            <div><span>Encerramento</span><strong>{dataHora(op.encerrado_em)}</strong></div>
            <div><span>Status</span><strong className={`historico-status ${op.status === 'Cancelado' ? 'cancelado' : ''}`}>{op.status}</strong></div>
            <div><span>Reimpressões</span><strong>{contagens[op._id] || 0}</strong></div>
            {detalhe?._id === op._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {detalhe?._id === op._id && (
            <div className="historico-op-detalhe">
              <div><span>Fábrica</span><strong>{op.fabrica}</strong></div><div><span>Projeto</span><strong>{op.projeto}</strong></div>
              <div><span>Item / pacote</span><strong>{op.item || '-'}</strong></div><div><span>Operador</span><strong>{op.operador}</strong></div>
              <div><span>Início real</span><strong>{dataHora(op.inicio_producao)}</strong></div><div><span>Tempo produtivo</span><strong>{Math.round(Number(op.tempo_execucao_segundos || 0) / 60)} min</strong></div>
              <div><span>Tempo parado</span><strong>{Math.round(Number(op.tempo_parado_segundos || 0) / 60)} min</strong></div><div><span>Volume</span><strong>{Number(op.volume_m3 || 0).toLocaleString('pt-BR', { maximumFractionDigits: 4 })} m³</strong></div>
              {op._tipo_operacao !== 'grd' && op.status !== 'Cancelado' && <button type="button" className="btn primary" onClick={() => abrirEtiqueta(op)}><Printer size={17} /> Reimprimir etiqueta</button>}
            </div>
          )}
        </article>
      ))}

      <ModalEtiquetaOperacao aberto={Boolean(etiquetaOperacao)} operacao={etiquetaOperacao} onImprimir={() => registrar(etiquetaOperacao)} onFechar={() => setEtiquetaOperacao(null)} />
      <ModalEtiquetasClassificacao aberto={Boolean(etiquetas.length)} saidas={etiquetas} opLote={detalhe} reimpressao onImprimir={(saida) => registrar(detalhe, saida?.pacote_saida_id)} onFechar={() => setEtiquetas([])} />
    </div>
  )
}
