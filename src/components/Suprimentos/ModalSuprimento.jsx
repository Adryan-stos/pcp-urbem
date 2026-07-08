import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { listarFornecedores, listarMateriasPrimas } from '../../services/cadastroMateriaPrimaService.js'

const itemVazio = { materia_prima_id: '', materia_prima_descricao: '', quantidade_pecas: '', rua:'A', secao:'1' }
const ruas = [ 'A', 'B', 'C', 'D', 'E', 'F' ]
const secoes = Array.from({ length: 10 }, (_, index) => String(index + 1))

const fluxo_baffers = {
  AUTOCLAVE: { entrada: 'BUFFER AUTOCLAVE', saida: 'BUFFER SERRADO TRATADO' },
  GRADEADOR: { entrada: 'BUFFER SERRADO TRATADO', saida: 'BUFFER TRATADO GRADEADO' },
  ESTUFA: { entrada: 'BUFFER TRATADO GRADEADO', saida: 'BUFFER TRATADO SECO' },
  CLASSIFICADORA: { entrada: 'BUFFER TRATADO SECO', saida: 'BUFFER PRE OTIMIZAÇÃO'}
}

export default function ModalRecebimento({ aberto, onCancelar, onSalvar, carregando }) {
  const [fornecedores, setFornecedores] = useState([])
  const [materiasPrimas, setMateriasPrimas] = useState([])
  const [recebimento, setRecebimento] = useState({ fornecedor: '', numero_nf: '', data_recebimento: '', observacao: '' })
  const [itens, setItens] = useState([{ ...itemVazio }])
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!aberto) return

    async function carregarCadastros() {
      try {
        const [fornecedoresDados, materiasDados] = await Promise.all([
          listarFornecedores(),
          listarMateriasPrimas()
        ])

        setFornecedores(fornecedoresDados)
        setMateriasPrimas(materiasDados)
      } catch (error) {
        setErro(error.message)
      }
    }

    carregarCadastros()
  }, [aberto])

  function atualizarItem(index, campo, valor) {
    setItens((atuais) =>
      atuais.map((item, i) => (i === index ? { ...item, [campo]: valor } : item))
    )
  }

  function adicionarItem() {
    setItens((atuais) => [...atuais, { ...itemVazio }])
  }

  function removerItem(index) {
    setItens((atuais) => atuais.filter((_, i) => i !== index))
  }

  function confirmar() {
    setErro('')

    if (!recebimento.fornecedor) {
      setErro('Selecione o fornecedor.')
      return
    }

    if (!recebimento.numero_nf) {
      setErro('Informe o número da NF.')
      return
    }

    const itensFormatados = itens
      .filter((item) => item.materia_prima_id && item.quantidade_pecas)
      .map((item) => {
        const materia = materiasPrimas.find((mp) => mp.id === item.materia_prima_id)

        return {
            materia_prima_id: item.materia_prima_id,
            especie: materia?.especie,
            classe: materia?.classe,
            espessura_mm: materia?.espessura_mm,
            largura_mm: materia?.largura_mm,
            comprimento_mm: materia?.comprimento_mm,
            volume_unitario_m3: materia?.volume_unitario_m3,
            quantidade_pecas: Number(item.quantidade_pecas || 0),
            fsc: materia?.fsc,
            localizacao: `BUFFER AUTOCLAVE - Rua ${item.rua} - Seção ${item.secao}`,
            buffer_atual: 'BUFFER AUTOCLAVE',
            rua: item.rua,
            secao: item.secao,
            localizacao: `BUFFER AUTOCLAVE - Rua ${item.rua} - Seção ${item.secao}`
        }
      })

    if (!itensFormatados.length) {
      setErro('Adicione pelo menos um pacote de matéria-prima.')
      return
    }

    onSalvar(recebimento, itensFormatados)
  }

  if (!aberto) return null

  return (
    <div className="modal-overlay">
      <div className="modal-card recebimento-modal">
        <div className="op-modal-header">
          <div>
            <span>Suprimentos</span>
            <h3>Novo Recebimento</h3>
          </div>

          <button type="button" className="btn ghost" onClick={onCancelar}>
            Fechar
          </button>
        </div>

        {erro && <div className="alert">{erro}</div>}

        <section className="recebimento-section">
          <h4>Dados do recebimento</h4>

          <div className="recebimento-form-grid">
            <label>
              Fornecedor
              <input
                list="lista-fornecedores"
                value={recebimento.fornecedor}
                onChange={(e) =>
                  setRecebimento({ ...recebimento, fornecedor: e.target.value })
                }
                placeholder="Digite ou selecione o fornecedor"
              />
                <datalist id="lista-fornecedores">
                  {fornecedores.map((fornecedor) => (
                    <option key={fornecedor.id} value={fornecedor.nome}/>
                    
                  ))}
                </datalist>
            </label>

            <label>
              Número NF
              <input
                value={recebimento.numero_nf}
                onChange={(e) =>
                  setRecebimento({ ...recebimento, numero_nf: e.target.value })
                }
              />
            </label>

            <label>
              Data recebimento
              <input
                type="date"
                value={recebimento.data_recebimento}
                onChange={(e) =>
                  setRecebimento({
                    ...recebimento,
                    data_recebimento: e.target.value
                  })
                }
              />
            </label>

            <label>
              Observação
              <input
                value={recebimento.observacao}
                onChange={(e) =>
                  setRecebimento({ ...recebimento, observacao: e.target.value })
                }
              />
            </label>
          </div>
        </section>

        <section className="recebimento-section">
          <div className="recebimento-itens-header">
            <div>
              <h4>Pacotes recebidos</h4>
              <span>Selecione materiais cadastrados pela Engenharia.</span>
            </div>

            <button type="button" className="btn ghost" onClick={adicionarItem}>
              + Adicionar pacote
            </button>
          </div>

          <div className="recebimento-table">
            <div className="recebimento-table-head">
              <span>Matéria-prima</span>
              <span>Dimensão</span>
              <span>Qtd. peças</span>
              <span>Volume m³</span>
              <span>Rua</span>
              <span>Seção</span>
              <span>Ações</span>
            </div>

            {itens.map((item, index) => {
              const materia = materiasPrimas.find(
                (mp) => mp.id === item.materia_prima_id
              )

              return (
                <div className="recebimento-table-row" key={index}>
                  <input
                    list={`lista-materias-${index}`}
                    value={item.materia_prima_descricao || ''}
                    onChange={(e) => {
                      const descricao = e.target.value

                      const materiaEncontrada = materiasPrimas.find(
                        (mp) => mp.descricao === descricao
                      )

                      atualizarItem(index, 'materia_prima_descricao', descricao)
                      atualizarItem(index, 'materia_prima_id', materiaEncontrada?.id || '')
                    }}
                    placeholder="Digite ou selecione a matéria-prima"
                  />

                  <datalist id={`lista-materias-${index}`}>
                    {materiasPrimas.map((materiaPrima) => (
                      <option key={materiaPrima.id} value={materiaPrima.descricao} />
                    ))}
                  </datalist>

                  <strong>
                    {materia
                      ? `${materia.espessura_mm} x ${materia.largura_mm} x ${materia.comprimento_mm}`
                      : '-'}
                  </strong>

                  <input
                    type="number"
                    value={item.quantidade_pecas}
                    onChange={(e) =>
                      atualizarItem(index, 'quantidade_pecas', e.target.value)
                    }
                  />

                  <strong>
                    {materia
                      ? (
                          Number(item.quantidade_pecas || 0) *
                          Number(materia.volume_unitario_m3 || 0)
                        ).toFixed(4)
                      : '0.0000'}
                  </strong>

                  <select
                    value={item.rua}
                    onChange={(e) => atualizarItem(index, 'rua', e.target.value)}
                  >
                    {ruas.map((rua) => (
                      <option key={rua} value={rua}>
                        Rua {rua}
                      </option>
                    ))}
                  </select>

                  <select
                    value={item.secao}
                    onChange={(e) => atualizarItem(index, 'secao', e.target.value)}
                  >
                    {secoes.map((secao) => (
                      <option key={secao} value={secao}>
                        Seção {secao}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="btn ghost icon-only"
                    onClick={() => removerItem(index)}
                    disabled={itens.length === 1}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancelar}>
            Cancelar
          </button>

          <button
            type="button"
            className="btn primary"
            onClick={confirmar}
            disabled={carregando}
          >
            {carregando ? 'Salvando...' : 'Salvar recebimento'}
          </button>
        </div>
      </div>
    </div>
  )
}