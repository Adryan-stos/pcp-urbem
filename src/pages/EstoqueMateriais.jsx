import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { listarEstoqueMateriais } from '../services/estoqueMaterialService.js'

export default function EstoqueMateriais() {
  const [pacotes, setPacotes] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [filtros, setFiltros] = useState({ nf: '', fornecedor: '', material: '', buffer: '', rua: '', secao: '' })

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

  const pacotesFiltrados = pacotes.filter((pacote) => {
    const nf = pacote.recebimentos_materia_prima?.numero_nf || ''
    const fornecedor = pacote.recebimentos_materia_prima?.fornecedor || ''
    const material = `${pacote.especie || ''} ${pacote.classe || ''} ${pacote.espessura_mm || ''} ${pacote.largura_mm || ''} ${pacote.comprimento_mm || ''}`

    return (
      nf.toLowerCase().includes(filtros.nf.toLowerCase()) &&
      fornecedor.toLowerCase().includes(filtros.fornecedor.toLowerCase()) &&
      material.toLowerCase().includes(filtros.material.toLowerCase()) &&
      String(pacote.buffer_atual || '').toLowerCase().includes(filtros.buffer.toLowerCase()) &&
      String(pacote.rua || '').toLowerCase().includes(filtros.rua.toLowerCase()) &&
      String(pacote.secao || '').toLowerCase().includes(filtros.secao.toLowerCase())
    )
  })

  const quantidadeDisponivel = (pacote) => Math.max(Number(pacote.quantidade_saldo || 0) - Number(pacote.quantidade_reservada || 0), 0)
  const volumeDisponivel = (pacote) => Math.max(Number(pacote.volume_saldo_m3 || 0) - Number(pacote.volume_reservado_m3 || 0), 0)

  const totalPacotesGeral = pacotes.length

  const totalPecasGeral = pacotes.reduce( (total, pacote) => total + Number(pacote.quantidade_saldo || 0), 0)

  const totalVolumeGeral = pacotes.reduce( (total, pacote) => total + Number(pacote.volume_saldo_m3 || 0), 0 )

  const totalPacotesFiltrado = pacotesFiltrados.length

  const totalPecasFiltrado = pacotesFiltrados.reduce((total, pacote) => total + quantidadeDisponivel(pacote), 0)

  const totalVolumeFiltrado = pacotesFiltrados.reduce((total, pacote) => total + volumeDisponivel(pacote), 0)
  const totalPecasReservadas = pacotesFiltrados.reduce((total, pacote) => total + Number(pacote.quantidade_reservada || 0), 0)
  const totalVolumeReservado = pacotesFiltrados.reduce((total, pacote) => total + Number(pacote.volume_reservado_m3 || 0), 0)
  const buffers = Object.values(pacotes.reduce((grupos, pacote) => {
    const nome = pacote.buffer_atual || 'SEM BUFFER'
    if (!grupos[nome]) grupos[nome] = { nome, pacotes: 0, pecas: 0, reservadas: 0, disponiveis: 0, volume: 0, volumeReservado: 0, volumeDisponivel: 0 }
    const grupo = grupos[nome]
    grupo.pacotes += 1
    grupo.pecas += Number(pacote.quantidade_saldo || 0)
    grupo.reservadas += Number(pacote.quantidade_reservada || 0)
    grupo.disponiveis += quantidadeDisponivel(pacote)
    grupo.volume += Number(pacote.volume_saldo_m3 || 0)
    grupo.volumeReservado += Number(pacote.volume_reservado_m3 || 0)
    grupo.volumeDisponivel += volumeDisponivel(pacote)
    return grupos
  }, {})).sort((a, b) => a.nome.localeCompare(b.nome))
  

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
          <div><span>Visão por estoque</span><h3>Buffers e materiais disponíveis</h3></div>
          <button type="button" className={`estoque-buffer-card todos ${!filtros.buffer ? 'active' : ''}`} onClick={() => setFiltros({ ...filtros, buffer: '' })}>Todos os buffers</button>
        </div>
        <div className="estoque-buffer-grid">
          {buffers.map((buffer) => (
            <button type="button" key={buffer.nome} className={`estoque-buffer-card ${filtros.buffer === buffer.nome ? 'active' : ''}`} onClick={() => setFiltros({ ...filtros, buffer: buffer.nome })}>
              <span>{buffer.nome}</span>
              <strong>{buffer.pacotes} pacotes</strong>
              <div><small>Disponível</small><b>{buffer.disponiveis.toFixed(0)} un. · {buffer.volumeDisponivel.toFixed(4)} m³</b></div>
              <div><small>Reservado</small><b>{buffer.reservadas.toFixed(0)} un. · {buffer.volumeReservado.toFixed(4)} m³</b></div>
            </button>
          ))}
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
              setFiltros({
                nf: '',
                fornecedor: '',
                material: '',
                buffer: '',
                rua: '',
                secao: ''
              })
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
