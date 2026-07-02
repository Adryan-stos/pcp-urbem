import { useState } from 'react'
import CentroExecucao from '../components/Producao/CentroExecucao.jsx'
import ExecucaoProducao from '../components/Producao/ExecucaoProducao.jsx'


export default function Producao() {
  const [aba, setAba] = useState('centro')

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Produção</p>
          <h2>Centro de Execução</h2>
          <span>Sequência operacional por setor conforme programação do PCP.</span>
        </div>
      </header>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${aba === 'centro' ? 'active' : ''}`}
          onClick={() => setAba('centro')}
        >
          Painel Operacional
        </button>

        <button
          type="button"
          className={`tab ${aba === 'execucao' ? 'active' : ''}`}
          onClick={() => setAba('execucao')}
        >
          Execução
        </button>
      </div>

      {aba === 'centro' && <CentroExecucao />}

      {aba === 'execucao' && <ExecucaoProducao />}
    </div>
  )
}