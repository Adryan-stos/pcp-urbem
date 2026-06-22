import { useState } from 'react'
import { Plus } from 'lucide-react'
import { criarProjeto } from '../services/projetosService'

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

export default function NovoProjeto({ irParaImportacao }) {
  const [form, setForm] = useState(projetoInicial)
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [projetoCriado, setProjetoCriado] = useState(null)
  const [mostrarModalImportacao, setMostrarModalImportacao] = useState(false)

  async function salvarProjeto(event) {
    event.preventDefault()

    try {
      setCarregando(true)
      setMensagem('')

      const projeto = await criarProjeto(form)
      
      setProjetoCriado(projeto)
      setMostrarModalImportacao(true)

      setForm(projetoInicial)
      setMensagem('Projeto cadastrado com sucesso. Agora você pode importar a estrutura.')
    } catch (error) {
      setMensagem(error.message)
    } finally {
      setCarregando(false)
    }

  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Projetos</p>
          <h2>Novo Projeto</h2>
          <span>Cadastro inicial do projeto antes da importação da engenharia.</span>
        </div>
      </div>

      {mensagem && <div className="alert">{mensagem}</div>}

      <form className="form-card card form" onSubmit={salvarProjeto}>
        <h3>Dados do Projeto</h3>

        <div className="form-grid">
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

          <label>
            Comercial responsável
            <input
              value={form.comercial}
              onChange={(e) => setForm({ ...form, comercial: e.target.value })}
              placeholder="Nome do comercial"
            />
          </label>

          <label>
            Data de entrega
            <input
              type="date"
              value={form.data_entrega}
              onChange={(e) => setForm({ ...form, data_entrega: e.target.value })}
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

          <label className="full">
            Observações
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Informações importantes do projeto"
            />
          </label>
        </div>

          <button className="primary-button compact-button" type="submit" disabled={carregando}>
            <Plus size={16} />
            Criar projeto
        </button>
      </form>

      {mostrarModalImportacao && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Projeto criado com sucesso</h3>

            <p>Deseja importar a estrutura deste projeto agora?</p>

            <strong>{projetoCriado?.codigo_interno}</strong>
            <span>{projetoCriado?.nome_projeto}</span>

            <div className="modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setMostrarModalImportacao(false)}
              >
                Depois
              </button>

              <button
                type="button"
                className="btn primary"
                onClick={() => irParaImportacao(projetoCriado)}
              >
                Importar estrutura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}