import { useState } from 'react'
import { LayoutDashboard, FolderKanban, Factory, ClipboardList, Settings, BarChart3, History, Wrench, PackageSearch} from 'lucide-react'

import Dashboard from './pages/Dashboard.jsx'
import NovoProjeto from './pages/NovoProjeto.jsx'
import ProjetosExistentes from './pages/ProjetosExistentes.jsx'
import EngenhariaImportar from './pages/EngenhariaImportar.jsx'
import DetalheProjeto from './pages/DetalheProjeto.jsx'
import CarteiraProjetos from './pages/CarteiraProjetos.jsx'
import CargaMaquina from './pages/CargaMaquina.jsx'
import Producao from './pages/Producao.jsx'
import Recebimentos from './pages/Recebimentos.jsx'
import EstoqueMateriais from './pages/EstoqueMateriais.jsx'
import ConfiguracoesCapacidade from './pages/ConfiguracoesCapacidade.jsx'

function App() {

  const [paginaAtual, setPaginaAtual] = useState('dashboard')
  const [projetoSelecionado, setProjetoSelecionado] = useState(null)
  const [projetoImportacao, setProjetoImportacao] = useState(null)
  const [menuAberto, setMenuAberto] = useState(null)

  function alternarMenu(menu) { setMenuAberto((atual) => (atual === menu ? null : menu)) }

  function renderPage() {
  switch (paginaAtual) {

    case 'detalhe-projeto':
      return (
        <DetalheProjeto
          projeto={projetoSelecionado}
          voltar={() => setPaginaAtual('projetos-existentes')}
        />
      )

    case 'novo-projeto':
      return (
        <NovoProjeto
          irParaImportacao={(projeto) => {
            setProjetoImportacao(projeto)
            setPaginaAtual('importar-engenharia')
          }}
        />
      )

    case 'projetos-existentes':
      return (
        <ProjetosExistentes
          abrirProjeto={(projeto) => {
            setProjetoSelecionado(projeto)
            setPaginaAtual('detalhe-projeto')
          }}
        />
      )

    case 'importar-engenharia':
      return <EngenhariaImportar projetoInicial={projetoImportacao} />

    case 'carteira-projetos':
      return <CarteiraProjetos />
    
    case 'carga-maquina':
      return <CargaMaquina />

    case 'producao':
      return <Producao />

    case 'recebimentos':
      return <Recebimentos />

    case 'estoque-materiais':
      return <EstoqueMateriais />

    case 'configuracoes-capacidade':
      return <ConfiguracoesCapacidade />

    default:
      return <Dashboard />
  }
}


  

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div>
            <h1>Urbem Control<br />Tower</h1>
            <span>PCP Industrial</span>
          </div>
        </div>

        <nav className="menu">
          <button
            className={`menu-item ${paginaAtual === 'dashboard' ? 'active' : ''}`}
            onClick={() => setPaginaAtual('dashboard')}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>

          <div className="menu-group">
            <button
              className={`menu-item ${paginaAtual.startsWith('projetos') ? 'active' : ''}`}
              onClick={() => alternarMenu('projetos')}
            >
              <FolderKanban size={18} />
              Projetos
            </button>


            {menuAberto === 'projetos' && (
            <div className="submenu">
              <button onClick={() => setPaginaAtual('novo-projeto')}>
                Criar novo projeto
              </button>

              <button onClick={() => setPaginaAtual('projetos-existentes')}>
                Projetos existentes
              </button>
            </div>
          )}
            <div className="menu-group">
              <button
                className={`menu-item ${menuAberto === 'suprimentos' ? 'active' : ''}`}
                onClick={() => alternarMenu('suprimentos')}
              >
                <PackageSearch size={18} />
                Suprimentos
              </button>

              {menuAberto === 'suprimentos' && (
                <div className="submenu">
                  <button onClick={() => setPaginaAtual('recebimentos')}>
                    Recebimentos
                  </button>

                  <button onClick={() => setPaginaAtual('estoque-materiais')}>
                    Estoque de Materiais
                  </button>
                </div>
              )}
            </div>

          </div>

          <div className="menu-group">
            <button 
              className={`menu-item ${menuAberto === 'engenharia' ? 'active' : ''}`}
              onClick={() => alternarMenu('engenharia')}
            >
              <Factory size={18} />
              Engenharia
            </button>

            {menuAberto === 'engenharia' && (
              <div className="submenu">
                <button>Criar novo item</button>
                <button onClick={() => setPaginaAtual('importar-engenharia')}>
                  Importar estrutura
                </button>
              </div>
            )}
          </div>

          <div className="menu-group">
            <button
              className={`menu-item ${menuAberto === 'programacao' ? 'active' : ''}`}
              onClick={() => alternarMenu('programacao')}
            >
              <ClipboardList size={18} />
              Programação
            </button>

            {menuAberto === 'programacao' && (
              <div className="submenu">
                <button onClick={() => setPaginaAtual('carteira-projetos')}>
                  Carteira de Produção
                </button>

                <button onClick={() => setPaginaAtual('carga-maquina')}>
                  Carga Máquina
                </button>
              </div>
            )}
          </div>

          <button
              className={`menu-item ${paginaAtual === 'producao' ? 'active' : ''}`}
              onClick={() => setPaginaAtual('producao')}
            >
              <Wrench size={18} />
              Produção
          </button>

          <button className="menu-item">
            <History size={18} />
            Histórico GRD
          </button>

          <button className="menu-item">
            <BarChart3 size={18} />
            Indicadores
          </button>

          <button
            className={`menu-item ${paginaAtual === 'configuracoes-capacidade' ? 'active' : ''}`}
            onClick={() => setPaginaAtual('configuracoes-capacidade')}
          >
            <Settings size={18} />
            Configurações
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  )
}

export default App
