import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { listarEstoqueMateriais } from '../services/estoqueMaterialService.js'

export default function EstoqueMateriais() {
  const [pacotes, setPacotes] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [filtros, setFiltros] = useState({ nf: '', fornecedor: '', material: '', buffer: '', rua: '', secao: '' })
  const [filtroRapido, setFiltroRapido] = useState('todos')
  const [grupoSelecionado, setGrupoSelecionado] = useState(null)

  const quantidadeDisponivel = (pacote) => Math.max(Number(pacote.quantidade_saldo || 0) - Number(pacote.quantidade_reservada || 0), 0)
  const volumeDisponivel = (pacote) => Math.max(Number(pacote.volume_saldo_m3 || 0) - Number(pacote.volume_reservado_m3 || 0), 0)
  const reservaInconsistente = (pacote) => Number(pacote.quantidade_reservada || 0) > Number(pacote.quantidade_saldo || 0) || Number(pacote.volume_reservado_m3 || 0) > Number(pacote.volume_saldo_m3 || 0)

  async function carregar() {
    try {
      setCarregando(true)
      setErro('')

      const dados = await listarEstoqueMateriais()
      setPacotes(dados)
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const pacotesBaseFiltrados = pacotes.filter((pacote) => {
    const nf = pacote.recebimentos_materia_prima?.numero_nf || ''
    const fornecedor = pacote.recebimentos_materia_prima?.fornecedor || ''
    const material = `${pacote.especie || ''} ${pacote.classe || ''} ${pacote.espessura_mm || ''} ${pacote.largura_mm || ''} ${pacote.comprimento_mm || ''}`

    const atendeBusca = (
      nf.toLowerCase().includes(filtros.nf.toLowerCase()) &&
      fornecedor.toLowerCase().includes(filtros.fornecedor.toLowerCase()) &&
      material.toLowerCase().includes(filtros.material.toLowerCase()) &&
      String(pacote.buffer_atual || '').toLowerCase().includes(filtros.buffer.toLowerCase()) &&
      String(pacote.rua || '').toLowerCase().includes(filtros.rua.toLowerCase()) &&
      String(pacote.secao || '').toLowerCase().includes(filtros.secao.toLowerCase())
    )
    const atendeRapido = filtroRapido === 'todos' ||
      (filtroRapido === 'disponivel' && quantidadeDisponivel(pacote) > 0) ||
      (filtroRapido === 'reservado' && Number(pacote.quantidade_reservada || 0) > 0) ||
      (filtroRapido === 'inconsistente' && reservaInconsistente(pacote)) ||
      (filtroRapido === 'minimo' && Number(pacote.estoque_minimo || 0) > 0 && quantidadeDisponivel(pacote) < Number(pacote.estoque_minimo))
    return atendeBusca && atendeRapido
  })

  const pacotesFiltrados = grupoSelecionado
    ? pacotesBaseFiltrados.filter((pacote) => grupoSelecionado.ids.includes(pacote.id))
    : pacotesBaseFiltrados

  const arvoreEstoque = pacotesBaseFiltrados.reduce((arvore, pacote) => {
    const buffer = pacote.buffer_atual || 'SEM BUFFER'
    const especie = pacote.especie || 'SEM ESPÉCIE'
    const classe = pacote.classe || 'SEM CLASSE'
    const bitola = `${pacote.espessura_mm || '-'} × ${pacote.largura_mm || '-'} × ${pacote.comprimento_mm || '-'}`
    arvore[buffer] ??= {}
    arvore[buffer][especie] ??= {}
    arvore[buffer][especie][classe] ??= {}
    arvore[buffer][especie][classe][bitola] ??= []
    arvore[buffer][especie][classe][bitola].push(pacote)
    return arvore
  }, {})

  function resumoGrupo(lista) {
    return {
      pacotes: lista.length,
      disponiveis: lista.reduce((total, item) => total + quantidadeDisponivel(item), 0),
      reservadas: lista.reduce((total, item) => total + Number(item.quantidade_reservada || 0), 0),
      volume: lista.reduce((total, item) => total + volumeDisponivel(item), 0)
    }
  }

  const totalPacotesGeral = pacotes.length

  const totalPecasGeral = pacotes.reduce( (total, pacote) => total + Number(pacote.quantidade_saldo || 0), 0)

  const totalVolumeGeral = pacotes.reduce( (total, pacote) => total + Number(pacote.volume_saldo_m3 || 0), 0 )

  const totalPacotesFiltrado = pacotesFiltrados.length

  const totalPecasFiltrado = pacotesFiltrados.reduce((total, pacote) => total + quantidadeDisponivel(pacote), 0)

  const totalVolumeFiltrado = pacotesFiltrados.reduce((total, pacote) => total + volumeDisponivel(pacote), 0)
  const totalPecasReservadas = pacotesFiltrados.reduce((total, pacote) => total + Number(pacote.quantidade_reservada || 0), 0)
  const totalVolumeReservado = pacotesFiltrados.reduce((total, pacote) => total + Number(pacote.volume_reservado_m3 || 0), 0)
  

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Suprimentos</p>
          <h2>Estoque de Materiais</h2>
          <span>Pacotes disponíveis por buffer, rua e seção.</span>
        </div>

        <button className="btn ghost" onClick={carregar} disabled={carregando}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </header>

      {erro && <div className="alert">{erro}</div>}

      <section className="estoque-kpi-grid">
        <div>
          <span>Pacotes total</span>
          <strong>{totalPacotesGeral}</strong>
        </div>

        <div>
          <span>Peças total</span>
          <strong>{totalPecasGeral.toFixed(0)}</strong>
        </div>

        <div>
          <span>Volume total</span>
          <strong>{totalVolumeGeral.toFixed(4)} m³</strong>
        </div>

        <div>
          <span>Pacotes filtrados</span>
          <strong>{totalPacotesFiltrado}</strong>
        </div>

        <div>
          <span>Peças disponíveis</span>
          <strong>{totalPecasFiltrado.toFixed(0)}</strong>
        </div>

        <div>
          <span>Volume disponível</span>
          <strong>{totalVolumeFiltrado.toFixed(4)} m³</strong>
        </div>

        <div>
          <span>Peças reservadas</span>
          <strong>{totalPecasReservadas.toFixed(0)}</strong>
        </div>

        <div>
          <span>Volume reservado</span>
          <strong>{totalVolumeReservado.toFixed(4)} m³</strong>
        </div>
      </section>

      <section className="estoque-buffer-section">
        <div className="estoque-buffer-header">
          <div><span>Visão hierárquica</span><h3>Buffer → espécie → classe → bitola</h3></div>
          {grupoSelecionado && <button type="button" className="btn ghost" onClick={() => setGrupoSelecionado(null)}>Remover seleção</button>}
        </div>
        <div className="estoque-quick-filters">
          {[['todos', 'Todos'], ['disponivel', 'Somente disponível'], ['reservado', 'Somente reservado'], ['inconsistente', 'Com inconsistência'], ['minimo', 'Abaixo do mínimo']].map(([valor, rotulo]) => (
            <button type="button" key={valor} className={filtroRapido === valor ? 'active' : ''} onClick={() => { setFiltroRapido(valor); setGrupoSelecionado(null) }}>{rotulo}</button>
          ))}
        </div>
        <div className="estoque-tree">
          {Object.entries(arvoreEstoque).sort(([a], [b]) => a.localeCompare(b)).map(([buffer, especies]) => {
            const pacotesBuffer = Object.values(especies).flatMap((classes) => Object.values(classes).flatMap((bitolas) => Object.values(bitolas).flat()))
            const resumoBuffer = resumoGrupo(pacotesBuffer)
            return <details key={buffer} open>
              <summary><strong>{buffer}</strong><span>{resumoBuffer.pacotes} pacotes · {resumoBuffer.disponiveis.toFixed(0)} un. disponíveis · {resumoBuffer.volume.toFixed(4)} m³</span></summary>
              <div className="estoque-tree-level">
                {Object.entries(especies).sort(([a], [b]) => a.localeCompare(b)).map(([especie, classes]) => {
                  const pacotesEspecie = Object.values(classes).flatMap((bitolas) => Object.values(bitolas).flat())
                  return <details key={especie} open>
                    <summary><strong>{especie}</strong><span>{resumoGrupo(pacotesEspecie).disponiveis.toFixed(0)} un. disponíveis</span></summary>
                    <div className="estoque-tree-level">
                      {Object.entries(classes).sort(([a], [b]) => a.localeCompare(b)).map(([classe, bitolas]) => (
                        <details key={classe}>
                          <summary><strong>{classe}</strong><span>{resumoGrupo(Object.values(bitolas).flat()).pacotes} pacotes</span></summary>
                          <div className="estoque-tree-bitolas">
                            {Object.entries(bitolas).sort(([a], [b]) => a.localeCompare(b)).map(([bitola, lista]) => {
                              const resumo = resumoGrupo(lista)
                              const ativo = grupoSelecionado?.chave === `${buffer}|${especie}|${classe}|${bitola}`
                              return <button type="button" key={bitola} className={ativo ? 'active' : ''} onClick={() => setGrupoSelecionado({ chave: `${buffer}|${especie}|${classe}|${bitola}`, ids: lista.map((item) => item.id) })}>
                                <strong>{bitola} mm</strong><span>{resumo.pacotes} pacotes</span><span>{resumo.disponiveis.toFixed(0)} peças disponíveis</span><span>{resumo.reservadas.toFixed(0)} reservadas</span><b>{resumo.volume.toFixed(4)} m³</b>
                              </button>
                            })}
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                })}
              </div>
            </details>
          })}
          {!Object.keys(arvoreEstoque).length && <div className="empty-card">Nenhum estoque encontrado para os filtros selecionados.</div>}
        </div>
      </section>

      <section className="form-card carteira-filter-card">
        <div className="carteira-filter-header">
          <div>
            <h3>Filtros</h3>
            <span>Refine por NF, fornecedor, material ou endereço.</span>
          </div>

          <button
            type="button"
            className="filter-clear"
            onClick={() =>
              { setFiltros({
                nf: '',
                fornecedor: '',
                material: '',
                buffer: '',
                rua: '',
                secao: ''
              }); setFiltroRapido('todos'); setGrupoSelecionado(null) }
            }
          >
            Limpar
          </button>
        </div>

        <div className="estoque-filter-grid">
          <input
            placeholder="NF"
            value={filtros.nf}
            onChange={(e) => setFiltros({ ...filtros, nf: e.target.value })}
          />

          <input
            placeholder="Fornecedor"
            value={filtros.fornecedor}
            onChange={(e) =>
              setFiltros({ ...filtros, fornecedor: e.target.value })
            }
          />

          <input
            placeholder="Material"
            value={filtros.material}
            onChange={(e) =>
              setFiltros({ ...filtros, material: e.target.value })
            }
          />

          <input
            placeholder="Buffer"
            value={filtros.buffer}
            onChange={(e) => setFiltros({ ...filtros, buffer: e.target.value })}
          />

          <input
            placeholder="Rua"
            value={filtros.rua}
            onChange={(e) => setFiltros({ ...filtros, rua: e.target.value })}
          />

          <input
            placeholder="Seção"
            value={filtros.secao}
            onChange={(e) => setFiltros({ ...filtros, secao: e.target.value })}
          />
        </div>
      </section>

      <section className="table-card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Pacote</th>
                <th>Material</th>
                <th>NF / Fornecedor</th>
                <th>Endereço</th>
                <th>Peças: total / reservada / disponível</th>
                <th>Volume: total / reservado / disponível</th>
                <th>Situação</th>
              </tr>
            </thead>

            <tbody>
              {pacotesFiltrados.map((pacote) => {
                const reservaInconsistente = Number(pacote.quantidade_reservada || 0) > Number(pacote.quantidade_saldo || 0) || Number(pacote.volume_reservado_m3 || 0) > Number(pacote.volume_saldo_m3 || 0)
                return <tr key={pacote.id} className={reservaInconsistente ? 'estoque-reserva-inconsistente' : ''}>
                  <td>
                    <strong>{pacote.codigo_pacote || pacote.codigo_item || '-'}</strong>
                    <br />
                    <small>
                      {pacote.created_at
                        ? new Date(pacote.created_at).toLocaleDateString('pt-BR')
                        : '-'}
                    </small>
                  </td>

                  <td>
                    <strong>
                      {pacote.especie || '-'} {pacote.classe || ''}
                    </strong>
                    <br />
                    <small>
                      {pacote.espessura_mm || '-'} x {pacote.largura_mm || '-'} x{' '}
                      {pacote.comprimento_mm || '-'}
                    </small>
                  </td>

                  <td>
                    <strong>
                      NF {pacote.recebimentos_materia_prima?.numero_nf || '-'}
                    </strong>
                    <br />
                    <small>
                      {pacote.recebimentos_materia_prima?.fornecedor || '-'}
                    </small>
                  </td>

                  <td>
                    <strong>{pacote.buffer_atual || '-'}</strong>
                    <br />
                    <small>
                      Rua {pacote.rua || '-'} • Seção {pacote.secao || '-'}
                    </small>
                  </td>

                  <td>
                    <strong>{Number(pacote.quantidade_saldo || 0).toFixed(0)} total</strong><br />
                    <small>{Number(pacote.quantidade_reservada || 0).toFixed(0)} reservadas · {quantidadeDisponivel(pacote).toFixed(0)} disponíveis</small>
                  </td>

                  <td>
                    <strong>{Number(pacote.volume_saldo_m3 || 0).toFixed(4)} m³ total</strong><br />
                    <small>{Number(pacote.volume_reservado_m3 || 0).toFixed(4)} reservado · {volumeDisponivel(pacote).toFixed(4)} disponível</small>
                  </td>

                  <td>
                    <span className={`op-status ${reservaInconsistente ? 'cancelado' : 'liberado'}`}>
                      {reservaInconsistente ? 'Reserva inconsistente' : pacote.status || 'Disponível'}
                    </span>
                  </td>
                </tr>
              })}

              {!pacotesFiltrados.length && (
                <tr>
                  <td colSpan="7" className="empty">
                    Nenhum pacote encontrado no estoque.
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
