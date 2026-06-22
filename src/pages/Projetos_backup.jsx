import { useEffect, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { criarProjeto, listarProjetos } from '../services/projetosService'

const projetoInicial = {
  codigo_projeto: '',
  nome_projeto: '',
  cliente: '',
  comercial: '',
  data_entrega: '',
  fabrica: 'Fábrica 2',
  fase_projeto: 'Fase inicial',
  status: 'Em cadastro',
  observacoes: ''
}

export default function Projetos({ abrirProjeto }) {
  const [projetos, setProjetos] = useState([])
  const [form, setForm] = useState(projetoInicial)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

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

  async function salvarProjeto(event) {
    event.preventDefault()

    try {
      setCarregando(true)
      setErro('')
      await criarProjeto(form)
      setForm(projetoInicial)
      await carregarProjetos()
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarProjetos()
  }, [])

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Torre de Controle da Produção</span>
          <h1>Projetos</h1>
          <p>Cadastro padrão Urbem para iniciar o fluxo de programação e controle da Fábrica 2.</p>
        </div>
        <button className="btn ghost" onClick={carregarProjetos} disabled={carregando}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </header>

      {erro && <div className="alert">{erro}</div>}

      <section className="grid two-columns">
        <form className="card form" onSubmit={salvarProjeto}>
          <h2>Novo projeto</h2>

          <label>
            Código do projeto
            <input
              value={form.codigo_projeto}
              onChange={(e) => setForm({ ...form, codigo_projeto: e.target.value })}
              placeholder="Ex: 1438"
              required
            />
          </label>

          <label>
            Nome do projeto
            <input
              value={form.nome_projeto}
              onChange={(e) => setForm({ ...form, nome_projeto: e.target.value })}
              placeholder="Ex: U-EBEN-PASSEO"
              required
            />
          </label>

          <label>
            Cliente
            <input
              value={form.cliente}
              onChange={(e) => setForm({ ...form, cliente: e.target.value })}
              placeholder="Cliente / Obra"
            />
          </label>

          <div className="row">
            <label>
              Entrega
              <input
                type="date"
                value={form.data_entrega}
                onChange={(e) => setForm({ ...form, data_entrega: e.target.value })}
              />
            </label>

            <label>
              Comercial responsável
              <input
                value={form.comercial}
                onChange={(e) => setForm({ ...form, comercial: e.target.value })}
                placeholder="Nome do comercial"
              />
            </label>

            <label>
              Fase do projeto
              <select
                value={form.fase_projeto}
                onChange={(e) => setForm({ ...form, fase_projeto: e.target.value })}
              >
                <option>Fase inicial</option>
                <option>Projeto civil/arquitetura</option>
                <option>Pronto para produção</option>
                <option>Em produção</option>
                <option>Aprovado</option>
                <option>Faturado</option>
              </select>
            </label>

          </div>

          <label>
            Observações
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Informações importantes do projeto"
            />
          </label>

          <button className="btn primary" type="submit" disabled={carregando}>
            <Plus size={16} /> Cadastrar projeto
          </button>
        </form>

        <section className="card">
          <h2>Projetos cadastrados</h2>

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
                </tr>
              </thead>
              <tbody>
                {projetos.map((projeto) => (
                  <tr
                    key={projeto.id}
                    onClick={() => abrirProjeto && abrirProjeto(projeto)}
                    className="clickable-row">
                    <td>{projeto.codigo_interno}</td>
                    <td>{projeto.codigo_projeto}</td>
                    <td>{projeto.nome_projeto}</td>
                    <td>{projeto.cliente || '-'}</td>
                    <td>{projeto.comercial || '-'}</td>
                    <td>{projeto.data_entrega || '-'}</td>
                    <td><span className="pill">{projeto.fase_projeto}</span></td>
                    <td>
                      <span className={`priority ${projeto.prioridade_calculada?.toLowerCase().replace('í', 'i').replace(' ', '-')}`}>
                        {projeto.prioridade_calculada || 'Em análise'}
                      </span>
                    </td>
                  </tr>
                ))}

                {!projetos.length && (
                  <tr>
                    <td colSpan="5" className="empty">Nenhum projeto cadastrado ainda.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  )
}
