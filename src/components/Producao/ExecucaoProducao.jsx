import { useState } from 'react'
import BuscaTalao from './BuscaTalao.jsx'
import { buscarTalaoExecucao } from '../../services/execucaoService.js'

export default function ExecucaoProducao() {
  const [busca, setBusca] = useState('')
  const [talao, setTalao] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [podeExecutar, setPodeExecutar] = useState(false)
  const [mensagemExecucao, setMensagemExecucao] = useState('')
  const [processosPendentes, setProcessosPendentes] = useState([])  

  async function buscarTalao() {
    try {
      setCarregando(true)

      // Limpa os estados antes de uma nova busca
      setErro('')
      setTalao(null)
      setPodeExecutar(false)
      setMensagemExecucao('')
      setProcessosPendentes([])

      const dados = await buscarTalaoExecucao(busca)

      setTalao(dados.talao)
      setPodeExecutar(dados.podeExecutar)
      setMensagemExecucao(dados.mensagem)
      setProcessosPendentes(dados.processosPendentes)

    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="execucao-producao">
      {!talao && (
        <BuscaTalao
          valor={busca}
          setValor={setBusca}
          onBuscar={buscarTalao}
        />
      )}

      {erro && <div className="alert">{erro}</div>}

      {carregando && (
        <div className="empty-card">
          Buscando talão...
        </div>
      )}

      {talao && (
        <section className="execucao-talao-card">
          <div className="execucao-talao-header">
            <div>
              <span>Talão encontrado</span>
              <h3>{talao.numero_talao}</h3>
            </div>

            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setTalao(null)
                setBusca('')

                setPodeExecutar(false)
                setMensagemExecucao('')
                setProcessosPendentes([])
              }}
            >
              Nova busca
            </button>
          </div>

          <div className="execucao-talao-grid">
            <div>
              <span>OP</span>
              <strong>{talao.ordens_producao?.numero_op || '-'}</strong>
            </div>

            <div>
              <span>Projeto</span>
              <strong>
                {talao.ordens_producao?.itens_projeto?.projetos?.codigo_interno || '-'}
              </strong>
            </div>

            <div>
              <span>Master</span>
              <strong>
                {talao.ordens_producao?.itens_projeto?.codigo_interno_item || '-'}
              </strong>
            </div>

            <div>
              <span>Processo</span>
              <strong>{talao.sequencia} - {talao.processo}</strong>
            </div>

            <div>
              <span>Recurso</span>
              <strong>{talao.recurso || '-'}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>{talao.status}</strong>
            </div>

            <div>
              <span>Entrada</span>
              <strong>{talao.produto_entrada || '-'}</strong>
            </div>

            <div>
              <span>Saída</span>
              <strong>{talao.produto_saida || '-'}</strong>
            </div>
          </div>

          {mensagemExecucao && (
            <div className={`execucao-status-box ${podeExecutar ? 'liberado' : 'bloqueado'}`}>
              <strong>
                {podeExecutar ? 'Processo liberado' : 'Processo bloqueado'}
              </strong>

              <span>{mensagemExecucao}</span>

              {!podeExecutar && processosPendentes.length > 0 && (
                <ul>
                  {processosPendentes.map((processo) => (
                    <li key={processo.id}>
                      {processo.sequencia} - {processo.processo} | {processo.status}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button
            type="button"
            className="execucao-start-button"
            disabled={!podeExecutar}
          >
            {podeExecutar ? '▶ Iniciar Produção' : 'Processo bloqueado'}
          </button>
        </section>
      )}
    </div>
  )
}