import { Factory, FolderKanban, CalendarDays, BarChart3, ClipboardList } from 'lucide-react'

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Factory size={26} />
          <div>
            <strong>PCP Urbem</strong>
            <span>Fábrica 2</span>
          </div>
        </div>

        <nav className="menu">
          <a className="active"><FolderKanban size={18} /> Projetos</a>
          <a><ClipboardList size={18} /> Estrutura</a>
          <a><CalendarDays size={18} /> Programação</a>
          <a><BarChart3 size={18} /> Indicadores</a>
        </nav>
      </aside>

      <main className="content">
        {children}
      </main>
    </div>
  )
}
