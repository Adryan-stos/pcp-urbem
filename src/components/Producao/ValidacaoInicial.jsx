import { VALIDACOES_PROCESSO } from '../../config/validacoesProcesso.js'

export default function ValidacaoInicial({
  talao,
  podeExecutar,
  mensagemExecucao,
  processosPendentes,
  dadosInicio,
  setDadosInicio,
  onIniciar,
  onNovaBusca
}) 

{
  const regra = VALIDACOES_PROCESSO[talao.processo] || { exigeQuantidade: false, exigeDimensao: true, loteEntrada: 'Talão Anterior' }

  return (
    <section className="execucao-talao-card">
      <div className="execucao-talao-header">
        <div>
          <span>Talão encontrado</span>
          <h3>{talao.numero_talao}</h3>
        </div>

        <button type="button" className="btn ghost" onClick={onNovaBusca}>
          Nova busca
        </button>
      </div>

      <div className="execucao-talao-grid">
        <div><span>OP</span><strong>{talao.ordens_producao?.numero_op || '-'}</strong></div>
        <div><span>Projeto</span><strong>{talao.ordens_producao?.itens_projeto?.projetos?.codigo_interno || '-'}</strong></div>
        <div><span>Master</span><strong>{talao.ordens_producao?.itens_projeto?.codigo_interno_item || '-'}</strong></div>
        <div><span>Processo</span><strong>{talao.sequencia} - {talao.processo}</strong></div>
        <div><span>Recurso</span><strong>{talao.recurso || '-'}</strong></div>
        <div><span>Status</span><strong>{talao.status}</strong></div>
        <div><span>Entrada</span><strong>{talao.produto_entrada || '-'}</strong></div>
        <div><span>Saída</span><strong>{talao.produto_saida || '-'}</strong></div>
      </div>

      {mensagemExecucao && (
        <div className={`execucao-status-box ${podeExecutar ? 'liberado' : 'bloqueado'}`}>
          <strong>{podeExecutar ? 'Processo liberado' : 'Processo bloqueado'}</strong>
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

      {podeExecutar && (
        <div className="execucao-validacao-card">
          <h4>Validação inicial da peça</h4>
          <span>Confirme as dimensões físicas antes de iniciar a produção.</span>

          <div className="execucao-validacao-grid">
            <input
              type="number"
              placeholder="Espessura"
              value={dadosInicio.espessuraInicio}
              onChange={(e) =>
                setDadosInicio({ ...dadosInicio, espessuraInicio: e.target.value })
              }
            />

            <div className="execucao-validacao-info">
                <strong>Lote de entrada exigido</strong>
                <span>{regra.loteEntrada}</span>
                </div>

                <input
                placeholder={regra.loteEntrada}
                value={dadosInicio.loteEntrada || ''}
                onChange={(e) =>
                    setDadosInicio({ ...dadosInicio, loteEntrada: e.target.value })
                }
                />

                {regra.exigeQuantidade && (
                <input
                    type="number"
                    placeholder="Quantidade"
                    value={dadosInicio.quantidadeInicio || ''}
                    onChange={(e) =>
                    setDadosInicio({ ...dadosInicio, quantidadeInicio: e.target.value })
                    }
                />
                )}

            <input
              type="number"
              placeholder="Largura"
              value={dadosInicio.larguraInicio}
              onChange={(e) =>
                setDadosInicio({ ...dadosInicio, larguraInicio: e.target.value })
              }
            />

            <input
              type="number"
              placeholder="Comprimento"
              value={dadosInicio.comprimentoInicio}
              onChange={(e) =>
                setDadosInicio({ ...dadosInicio, comprimentoInicio: e.target.value })
              }
            />
          </div>

          <textarea
            placeholder="Observação da validação inicial"
            value={dadosInicio.observacao}
            onChange={(e) =>
              setDadosInicio({ ...dadosInicio, observacao: e.target.value })
            }
          />
        </div>
      )}

      <button
        type="button"
        className="execucao-start-button"
        disabled={!podeExecutar}
        onClick={onIniciar}
      >
        {podeExecutar ? '▶ Iniciar Produção' : 'Processo bloqueado'}
      </button>
    </section>
  )
}