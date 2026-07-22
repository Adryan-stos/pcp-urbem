import { useState } from 'react'
import { Printer } from 'lucide-react'
import { VALIDACOES_PROCESSO } from '../../config/validacoesProcesso.js'
import { listarEtiquetasClassificacao } from '../../services/execucaoOpLoteService.js'
import ModalEtiquetasClassificacao from '../Etiquetas/ModalEtiquetasClassificacao.jsx'
import ModalEtiquetaOperacao from '../Etiquetas/ModalEtiquetaOperacao.jsx'

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
  const [etiquetas, setEtiquetas] = useState([])
  const [carregandoEtiquetas, setCarregandoEtiquetas] = useState(false)
  const [erroEtiquetas, setErroEtiquetas] = useState('')
  const [etiquetaOperacaoAberta, setEtiquetaOperacaoAberta] = useState(false)
  const regra = VALIDACOES_PROCESSO[talao.processo] || { exigeQuantidade: false, exigeDimensao: true, loteEntrada: 'Talão Anterior' }
  const ehLote = talao._tipo_operacao === 'lote'
  const operacaoConcluida = ['Concluído', 'Finalizado', 'Validado'].includes(talao.status)
  const possuiEtiquetasClassificacao = ehLote && talao.processo === 'CLASSIFICADORA'
  const permiteReimpressao = operacaoConcluida

  async function abrirReimpressao() {
    try {
      setCarregandoEtiquetas(true)
      setErroEtiquetas('')
      if (possuiEtiquetasClassificacao) {
        const dados = await listarEtiquetasClassificacao(talao.id)
        if (!dados.length) throw new Error('Nenhuma etiqueta foi encontrada para esta OP.')
        setEtiquetas(dados)
      } else {
        setEtiquetaOperacaoAberta(true)
      }
    } catch (error) {
      setErroEtiquetas(error.message)
    } finally {
      setCarregandoEtiquetas(false)
    }
  }

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
        <div><span>OP</span><strong>{ehLote ? talao.numero_op_lote : talao.ordens_producao?.numero_op || '-'}</strong></div>
        <div><span>{ehLote ? 'Pacotes' : 'Projeto'}</span><strong>{ehLote ? (talao.op_lote_itens || []).length : talao.ordens_producao?.itens_projeto?.projetos?.codigo_interno || '-'}</strong></div>
        <div><span>{ehLote ? 'Tipo' : 'Master'}</span><strong>{ehLote ? 'OP por lote' : talao.ordens_producao?.itens_projeto?.codigo_interno_item || '-'}</strong></div>
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

      {erroEtiquetas && <div className="alert">{erroEtiquetas}</div>}

      {permiteReimpressao && (
        <div className="execucao-reimpressao-card">
          <div>
            <strong>{possuiEtiquetasClassificacao ? 'Etiquetas geradas pela classificação' : 'Etiqueta da operação concluída'}</strong>
            <span>Imprima uma segunda via identificada como reimpressão, sem alterar estoque ou apontamentos.</span>
          </div>
          <button type="button" className="btn primary" onClick={abrirReimpressao} disabled={carregandoEtiquetas}>
            <Printer size={17} /> {carregandoEtiquetas ? 'Carregando...' : 'Reimprimir etiquetas'}
          </button>
        </div>
      )}

      {podeExecutar && (
        <div className="execucao-validacao-card">
          <h4>{ehLote ? 'Validação inicial da OP de lote' : 'Validação inicial da peça'}</h4>
          <span>{ehLote ? 'Confirme o operador e os pacotes reservados antes de iniciar.' : 'Confirme as dimensões físicas antes de iniciar a produção.'}</span>

          <div className="execucao-validacao-grid">
            {ehLote && (
              <input
                placeholder="Operador"
                value={dadosInicio.operador || ''}
                onChange={(e) => setDadosInicio({ ...dadosInicio, operador: e.target.value })}
              />
            )}

            {!ehLote && (
              <>
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
              </>
            )}
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

      <ModalEtiquetasClassificacao
        aberto={Boolean(etiquetas.length)}
        saidas={etiquetas}
        opLote={talao}
        reimpressao
        onFechar={() => setEtiquetas([])}
      />

      <ModalEtiquetaOperacao
        aberto={etiquetaOperacaoAberta}
        operacao={talao}
        onFechar={() => setEtiquetaOperacaoAberta(false)}
      />

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
