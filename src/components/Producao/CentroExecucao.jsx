import { useState } from 'react'
import CardExecucao from './CardExecucao.jsx'
import { useCentroExecucao } from '../../hooks/useCentroExecucao.js'
import ExecucaoLotesFabrica1 from './ExecucaoLotesFabrica1.jsx'

const setores = [
  'AUTOCLAVE',
  'GRADEADOR',
  'ESTUFA',
  'CLASSIFICADORA',
  'OTIMIZADORA/FINGER',
  'PLAINA',
  'PRENSA',
  'DESTOPADEIRA',
  'CNC',
  'ACABAMENTO'
]

const processosFabrica1 = ['AUTOCLAVE', 'GRADEADOR', 'ESTUFA', 'CLASSIFICADORA']

export default function CentroExecucao({ onExecutar }) {
  const [setorSelecionado, setSetorSelecionado] = useState('AUTOCLAVE')
  const { taloes, carregando, erro, carregarTaloes } = useCentroExecucao()
  const fabrica1Selecionada = processosFabrica1.includes(setorSelecionado)

  const cardsFiltrados = taloes
    .filter((talao) =>
      talao.processo === setorSelecionado ||
      talao.recurso === setorSelecionado
    )
    .sort((a, b) => {
      const prioridadeA = a.prioridade ?? 9999
      const prioridadeB = b.prioridade ?? 9999
      return prioridadeA - prioridadeB
    })

  return (
    <section className="centro-execucao">
      <div className="centro-execucao-header">
        <div>
          <h3>Painel Operacional</h3>
          <span>
            Fila de execução do setor, conforme prioridade definida pelo PCP.
          </span>
        </div>

        {!fabrica1Selecionada && (
          <button type="button" className="btn ghost" onClick={carregarTaloes}>
            Atualizar
          </button>
        )}
      </div>

      {!fabrica1Selecionada && erro && <div className="alert">{erro}</div>}

      <div className="machine-sector-tabs">
        {setores.map((setor) => (
          <button
            key={setor}
            type="button"
            className={`machine-sector-tab ${
              setorSelecionado === setor ? 'active' : ''
            }`}
            onClick={() => setSetorSelecionado(setor)}
          >
            {setor}
          </button>
        ))}
      </div>

      {fabrica1Selecionada ? (
        <ExecucaoLotesFabrica1 processo={setorSelecionado} onExecutar={onExecutar} />
      ) : carregando ? (
        <div className="empty-card">
          Carregando talões...
        </div>
      ) : (
        <div className="execucao-lotes-grid">
          {cardsFiltrados.map((talao, index) => (
            <CardExecucao
              key={talao.id}
              card={{
                prioridade: talao.prioridade || index + 1,
                setor: talao.processo,
                processo: `${talao.sequencia} - ${talao.processo}`,
                talao: talao.numero_talao || `SEM TALÃO - ${talao.sequencia}`,
                transformacao: `${talao.produto_entrada || '-'} → ${talao.produto_saida || '-'}`,
                status: talao.status,
                criticidade: talao.status === 'Bloqueado' ? 'bloqueado' : 'no-prazo',
                master:
                  talao.ordens_producao?.itens_projeto?.codigo_interno_item || '-',
                projeto:
                  talao.ordens_producao?.itens_projeto?.projetos?.codigo_interno || '-'
                }}
                onExecutar={() => onExecutar(talao.numero_talao)}
            />
          ))}

          {!cardsFiltrados.length && (
            <div className="empty-card">
              Nenhum talão programado para este setor.
            </div>
          )}
        </div>
      )}
    </section>
  )
}
