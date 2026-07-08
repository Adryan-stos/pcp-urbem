import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Eye, ChevronDown, ChevronRight } from 'lucide-react'
import { listarRecebimentos, criarRecebimento} from '../services/recebimentoService.js'
import ModalRecebimento from '../components/Suprimentos/ModalSuprimento.jsx'


export default function Recebimentos() {
  const [recebimentos, setRecebimentos] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [filtros, setFiltros] = useState({ nf: '', fornecedor: '', data: '', descricao: '' })
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [recebimentoAbertoId, setRecebimentoAbertoId] = useState(null)

  async function carregar() {
    try {
      setCarregando(true)
      setErro('')

      const dados = await listarRecebimentos()
      setRecebimentos(dados)
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const recebimentosFiltrados = recebimentos.filter((recebimento) => {
  const pacotes = recebimento.pacotes_materia_prima || []

  const descricaoPacotes = pacotes
    .map((p) => `${p.especie || ''} ${p.classe || ''} ${p.espessura_mm || ''} ${p.largura_mm || ''}`)
    .join(' ')
    .toLowerCase()

    return (
      String(recebimento.numero_nf || '').toLowerCase().includes(filtros.nf.toLowerCase()) &&
      String(recebimento.fornecedor || '').toLowerCase().includes(filtros.fornecedor.toLowerCase()) &&
      (!filtros.data || recebimento.data_recebimento === filtros.data) &&
      descricaoPacotes.includes(filtros.descricao.toLowerCase())
    )
  })

  async function salvarRecebimento(recebimento, itens) {
    try {
      setSalvando(true)
      setErro('')

      await criarRecebimento(recebimento, itens)

      setModalAberto(false)
      await carregar()
    } catch (error) {
      setErro(error.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Suprimentos</p>
          <h2>Recebimentos</h2>
          <span>Controle de NFs, itens e seus saldos.</span>
        </div>
        <div> </div>

        <div className="header-actions">
          <button className="btn ghost" onClick={carregar} disabled={carregando}>
            <RefreshCw size={16} />
            Atualizar
          </button>

          <button type="button" className="btn primary" onClick={() => setModalAberto(true)}>
            <Plus size={16} />
            Novo Recebimento
          </button>

          <ModalRecebimento
            aberto={modalAberto}
            onCancelar={() => setModalAberto(false)}
            onSalvar={salvarRecebimento}
            carregando={salvando}
          />
        </div>
      </header>

      {erro && <div className="alert">{erro}</div>}

      <section className="form-card carteira-filter-card">
        <div className="carteira-filter-header">
          <div>
            <h3>Filtros</h3>
            <span>Refine por NF, fornecedor, data ou material.</span>
          </div>

          <button
            type="button"
            className="filter-clear"
            onClick={() =>
              setFiltros({
                nf: '',
                fornecedor: '',
                data: '',
                descricao: ''
              })
            }
          >
            Limpar
          </button>
        </div>

        <div className="recebimento-filter-grid">
          <input
            placeholder="NF"
            value={filtros.nf}
            onChange={(e) => setFiltros({ ...filtros, nf: e.target.value })}
          />

          <input
            placeholder="Fornecedor"
            value={filtros.fornecedor}
            onChange={(e) => setFiltros({ ...filtros, fornecedor: e.target.value })}
          />

          <input
            type="date"
            value={filtros.data}
            onChange={(e) => setFiltros({ ...filtros, data: e.target.value })}
          />

          <input
            placeholder="Material / descrição"
            value={filtros.descricao}
            onChange={(e) => setFiltros({ ...filtros, descricao: e.target.value })}
          />
        </div>
      </section>

      <section className="table-card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>NF</th>
                <th>Fornecedor</th>
                <th>Data</th>
                <th>Itens</th>
                <th>Volume</th>
                <th>Saldo</th>
                <th>Status</th>
                <th>Detalhes</th>
              </tr>
            </thead>

            <tbody>
              {recebimentosFiltrados.map((recebimento) => {
                const itens = recebimento.pacotes_materia_prima || []

                const volumeTotal = itens.reduce(
                  (total, item) => total + Number(item.volume_inicial_m3 || 0),
                  0
                )

                const saldoTotal = itens.reduce(
                  (total, item) => total + Number(item.volume_saldo_m3 || 0),
                  0
                )

                return (
                  <>
                    <tr
                      key={recebimento.id}
                      onClick={() =>
                        setRecebimentoAbertoId(
                          recebimentoAbertoId === recebimento.id ? null : recebimento.id
                        )
                      }
                      style={{ cursor: 'pointer' }}
                    >
                      <td><strong>{recebimento.numero_nf}</strong></td>
                      <td>{recebimento.fornecedor || '-'}</td>
                      <td>{recebimento.data_recebimento || '-'}</td>
                      <td><strong>{itens.length}</strong><br /><small>itens</small></td>
                      <td><strong>{volumeTotal.toFixed(3)}</strong><br /><small>m³ recebido</small></td>
                      <td><strong>{saldoTotal.toFixed(3)}</strong><br /><small>m³ disponível</small></td>
                      <td><span className="op-status liberado">{recebimento.status || 'Recebido'}</span></td>
                      <td>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setRecebimentoAbertoId(
                              recebimentoAbertoId === recebimento.id ? null : recebimento.id
                            )
                          }}
                          className="btn btn-outline-secondary btn-sm"
                        >
                          {recebimentoAbertoId === recebimento.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                    </tr>

                    {recebimentoAbertoId === recebimento.id && (
                      <tr>
                        <td colSpan="8">
                          <div className="recebimento-itens-detalhe">
                            {itens.map((item) => (
                              <div className="recebimento-item-detalhe" key={item.id}>
                                <strong>{item.codigo_item}</strong>
                                <span>{item.especie} {item.classe}</span>
                                <span>{item.espessura_mm} x {item.largura_mm} x {item.comprimento_mm}</span>
                                <span>{Number(item.quantidade_saldo || 0).toFixed(0)} peças</span>
                                <span>{Number(item.volume_saldo_m3 || 0).toFixed(4)} m³</span>
                                <span>{item.buffer_atual || '-'} • Rua {item.rua || '-'} • Seção {item.secao || '-'}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}

              {!recebimentosFiltrados.length && (
                <tr>
                  <td colSpan="8" className="empty">
                    Nenhum recebimento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}