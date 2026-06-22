import { useEffect, useState } from 'react'
import { RefreshCw, Pencil, Trash2 } from 'lucide-react'
import { listarProjetos, excluirProjeto } from '../services/projetosService'

export default function ProjetosExistentes({ abrirProjeto }) {
  const [projetos, setProjetos] = useState([])
  const [filtros, setFiltros] = useState({
    codigoInterno: '',
    codigoProjeto: '',
    projeto: '',
    cliente: '',
    comercial: ''
  })
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [projetoExcluir, setProjetoExcluir] = useState(null)

  async function carregarProjetos() {
    try {
      setCarregando(true)
      setErro('')
      const dados = await listarProjetos()
      setProjetos(dados || [])
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarProjetos()
  }, [])

  function textoContem(valor, filtro) {
    if (!filtro) return true

    return String(valor || '')
      .toLowerCase()
      .includes(String(filtro).toLowerCase())
  }

  const projetosFiltrados = projetos.filter((projeto) => {
    return (
      textoContem(projeto.codigo_interno, filtros.codigoInterno) &&
      textoContem(projeto.codigo_projeto, filtros.codigoProjeto) &&
      textoContem(projeto.nome_projeto, filtros.projeto) &&
      textoContem(projeto.cliente, filtros.cliente) &&
      textoContem(projeto.comercial, filtros.comercial)
    )
  })

  async function confirmarExclusaoProjeto() {
    if (!projetoExcluir) return

    try {
      await excluirProjeto(projetoExcluir.id)
      setProjetoExcluir(null)
      await carregarProjetos()
    } catch (error) {
      alert(error.message)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Projetos</p>
          <h2>Projetos Existentes</h2>
          <span>Consulta e edição dos projetos cadastrados.</span>
        </div>

        <button className="btn ghost" onClick={carregarProjetos} disabled={carregando}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </header>

      {erro && <div className="alert">{erro}</div>}

      <section className="form-card project-filter-card">
        <div className="preview-filter-fields">
          <input
            placeholder="Código interno"
            value={filtros.codigoInterno}
            onChange={(e) => setFiltros({ ...filtros, codigoInterno: e.target.value })}
          />

          <input
            placeholder="Código projeto"
            value={filtros.codigoProjeto}
            onChange={(e) => setFiltros({ ...filtros, codigoProjeto: e.target.value })}
          />

          <input
            placeholder="Projeto"
            value={filtros.projeto}
            onChange={(e) => setFiltros({ ...filtros, projeto: e.target.value })}
          />

          <input
            placeholder="Cliente"
            value={filtros.cliente}
            onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}
          />

          <input
            placeholder="Comercial"
            value={filtros.comercial}
            onChange={(e) => setFiltros({ ...filtros, comercial: e.target.value })}
          />
        </div>
      </section>

      <section className="table-card" style={{ marginTop: 24 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Cód. Interno</th>
                <th>Cód. Projeto</th>
                <th>Projeto</th>
                <th>Cliente</th>
                <th>Comercial</th>
                <th>Entrega</th>
                <th>Fase</th>
                <th>Prioridade</th>
                <th>Ação</th>
              </tr>
            </thead>

            <tbody>
              {projetosFiltrados.map((projeto) => (
                <tr key={projeto.id}>
                  <td>{projeto.codigo_interno}</td>
                  <td>{projeto.codigo_projeto}</td>
                  <td>{projeto.nome_projeto}</td>
                  <td>{projeto.cliente || '-'}</td>
                  <td>{projeto.comercial || '-'}</td>
                  <td>{projeto.data_entrega || '-'}</td>

                  <td>
                    <span className="pill">{projeto.fase_projeto}</span>
                  </td>

                  <td>
                    <span className={`priority ${projeto.prioridade_calculada?.toLowerCase().replace('í', 'i').replace(' ', '-')}`}>
                      {projeto.prioridade_calculada || 'Em análise'}
                    </span>
                  </td>

                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="table-icon-action"
                        onClick={() => abrirProjeto(projeto)}
                        title="Abrir projeto"
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        className="table-icon-action danger"
                        onClick={() => setProjetoExcluir(projeto)}
                        title="Excluir projeto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!projetosFiltrados.length && (
                <tr>
                  <td colSpan="9" className="empty">
                    Nenhum projeto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {projetoExcluir && (
        <div className="modal-overlay">
          <div className="modal-card danger-modal">
            <h3>Excluir Projeto</h3>

            <p>Projeto:</p>

            <strong>{projetoExcluir.codigo_interno}</strong>
            <span>{projetoExcluir.nome_projeto}</span>

            <p className="modal-warning">
              Esta ação ocultará o projeto da operação diária.
              O histórico continuará salvo no banco.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setProjetoExcluir(null)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn danger"
                onClick={confirmarExclusaoProjeto}
              >
                Excluir Projeto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}