import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { Upload, ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import { listarProjetos } from '../services/projetosService'
import { supabase } from '../lib/supabase'

export default function EngenhariaImportar({ projetoInicial }) {
  const [projetos, setProjetos] = useState([])
  const [projetoId, setProjetoId] = useState('')
  const [tipoMaterial, setTipoMaterial] = useState('MLC')
  const [preview, setPreview] = useState([])
  const [arquivoNome, setArquivoNome] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [mostrarPreview, setMostrarPreview] = useState(false)
  const [mostrarArvore, setMostrarArvore] = useState(false)
  const [projetoSelecionado, setProjetoSelecionado] = useState(null)
  const [paisAbertos, setPaisAbertos] = useState({})
  const [filtroDimensao, setFiltroDimensao] = useState({
    base: '',
    altura: '',
    comprimento: ''
    })
  const [filtroTabela, setFiltroTabela] = useState({
    tipo: '',
    material: '',
    nome: '',
    codigo: '',
    nesting: '',
    lamela: '',
    base: '',
    altura: '',
    comprimento: ''
    })

  useEffect(() => {
    async function carregar() {
      const dados = await listarProjetos()
          setProjetos(dados || [])
        }

        carregar()
      }, [])

  useEffect(() => {
      if (projetoInicial?.id) {
        setProjetoId(projetoInicial.id)
      }
    }, [projetoInicial])

  function limparTexto(valor) {
    if (valor === null || valor === undefined) return ''
    return String(valor).trim()
  }

  function normalizarChave(valor) {
    return String(valor || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function buscarValor(linha, nomesPossiveis) {
    const chaves = Object.keys(linha)

    const chaveEncontrada = chaves.find((chave) =>
      nomesPossiveis.some(
        (nome) => normalizarChave(chave) === normalizarChave(nome)
      )
    )

    return chaveEncontrada ? linha[chaveEncontrada] : ''
  }

  function normalizarNumero(valor) {
    if (valor === null || valor === undefined || valor === '') return null

    const numero = Number(
      String(valor)
        .replace(',', '.')
        .replace(/[^\d.-]/g, '')
    )

    return Number.isNaN(numero) ? null : numero
  }

  function identificarTipoLinha(linha) {
    const producao = limparTexto(
      buscarValor(linha, ['No. Produção', 'Produção', 'No Produção'])
    )

    const nesting = limparTexto(
      buscarValor(linha, ['No. Prod Nesting', 'Nesting', 'No Prod Nesting'])
    )

    const comprimento = normalizarNumero(
      buscarValor(linha, ['Comprimento', 'Lenght', 'Length'])
    )

    if (producao.startsWith('O') || !nesting) return 'PAI'

    if (comprimento && comprimento <= 100) return 'CORPO_PROVA'

    return 'FILHO'
  }

  async function lerArquivo(event) {
    const file = event.target.files[0]
    if (!file) return

    setArquivoNome(file.name)
    setMensagem('')

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const primeiraAba = workbook.SheetNames[0]
    const sheet = workbook.Sheets[primeiraAba]

    const linhas = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
      raw: false
    })

    console.log('Colunas encontradas:', Object.keys(linhas[0] || {}))
    const projetoSelecionado = projetos.find((p) => p.id === projetoId)
    const codigoProjeto = projetoSelecionado?.codigo_interno || 'SEM-PROJETO'

    let sequenciaPai = 0
    let sequenciaFilho = 0
    let sequenciaCorpoProva = 0

    let paiAtualCodigoEngenharia = null
    let paiAtualCodigoInterno = null
    let paiAtualSequencia = null


    const dadosTratados = linhas
      .map((linha, index) => {
        const tipoLinha = identificarTipoLinha(linha)

        const materialLinha =
          limparTexto(buscarValor(linha, ['Material'])) || tipoMaterial

        const base = buscarValor(linha, [
            'Base',
            'Base (mm)',
            'Width',
            'Width (mm)',
            'Largura',
            'Largura (mm)',
            'Espessura',
            'Espessura (mm)'
            ])

        const altura = buscarValor(linha, [
            'Altura',
            'Altura (mm)',
            'Height',
            'Height (mm)'
            ])

        const comprimento = buscarValor(linha, [
            'Comprimento',
            'Comprimento (mm)',
            'Lenght',
            'Lenght (mm)',
            'Length',
            'Length (mm)'
            ])

        const item = {
          linha_origem: index + 2,
          tipo_material: materialLinha,
          tipo_item: tipoLinha,

          codigo_engenharia: limparTexto(
            buscarValor(linha, ['No. Produção', 'Produção', 'No Produção'])
          ),

          codigo_nesting: limparTexto(
            buscarValor(linha, ['No. Prod Nesting', 'Nesting', 'No Prod Nesting'])
          ),

          codigo_peca: limparTexto(
            buscarValor(linha, ['Peça', 'Peca'])
          ),

          descricao: limparTexto(
            buscarValor(linha, [
              'Nome Master Panels (+peças)',
              'Nome Master Panels (+pecas)',
              'Descrição',
              'Descricao',
              'Nome'
            ])
          ),
          
          lamela: limparTexto(
            buscarValor(linha, ['Lamela', 'Lamelas'])
          ),
          
          resistencia: limparTexto(
            buscarValor(linha, ['Resistência', 'Resistencia'])
          ),
          
          material: materialLinha,
          
                    necessita_cnc: String(materialLinha || '')
                      .toUpperCase()
                      .includes('CLT'),
            
                    necessita_destopadeira: String(materialLinha || '')
                      .toUpperCase()
                      .includes('MLC'),          
          
          base_mm: normalizarNumero(base),
          altura_mm: normalizarNumero(altura),
          comprimento_mm: normalizarNumero(comprimento),
          
          volume_m3: normalizarNumero(
            buscarValor(linha, [
              'Volume',
              'Volume (m³)',
              'Volume (m3)',
              'Volume m³',
              'Volume m3',
              'Vol. m³',
                'Vol m3',
                'Volume(m³)',
                'Volume(m3)'
              ])
          ),
          
          peso_kg: normalizarNumero(
            buscarValor(linha, ['Peso', 'Peso kg'])
          ),
          
          usinagem: limparTexto(
            buscarValor(linha, ['Usinagem'])
          ),
          subgrupo: limparTexto(
            buscarValor(linha, ['Subgrupo'])
          ),
          
          carregamento: limparTexto(
            buscarValor(linha, ['Carregamento'])
          ),

          carregamento_engenharia: limparTexto(
            buscarValor(linha, [
              'Carregamento Engenharia',
              'Carregamento Sugerido',
              'Carregamento',
              'Carga',
              'Entrega'
            ])
          ),
          
          arquivo_origem: file.name,
          _pai_temporario: null
        }
        
        const materialCodigo = limparTexto(materialLinha)
            .toUpperCase()
            .includes('CLT')
            ? 'CLT'
            : 'MLC'

            if (tipoLinha === 'PAI') {
            sequenciaPai += 1
            sequenciaFilho = 0
            sequenciaCorpoProva = 0

            paiAtualSequencia = String(sequenciaPai).padStart(3, '0')
            paiAtualCodigoEngenharia = item.codigo_engenharia || `LINHA_${index + 2}`
            paiAtualCodigoInterno = `${codigoProjeto}-${materialCodigo}-PAI-${paiAtualSequencia}`

            item.codigo_interno_item = paiAtualCodigoInterno
            item.codigo_interno_pai = null
            item.item_pai_codigo = null
            item.codigo_projeto_interno = codigoProjeto
            item.sequencia_item = sequenciaPai
            }

            if (tipoLinha === 'FILHO') {
            sequenciaFilho += 1

            item.codigo_interno_item = `${codigoProjeto}-${materialCodigo}-${paiAtualSequencia}-FIL-${String(sequenciaFilho).padStart(3, '0')}`
            item.codigo_interno_pai = paiAtualCodigoInterno
            item.item_pai_codigo = paiAtualCodigoEngenharia
            item.codigo_projeto_interno = codigoProjeto
            item.sequencia_item = sequenciaFilho
            }

            if (tipoLinha === 'CORPO_PROVA') {
            sequenciaCorpoProva += 1

            item.codigo_interno_item = `${codigoProjeto}-${materialCodigo}-${paiAtualSequencia}-CP-${String(sequenciaCorpoProva).padStart(3, '0')}`
            item.codigo_interno_pai = paiAtualCodigoInterno
            item.item_pai_codigo = paiAtualCodigoEngenharia
            item.codigo_projeto_interno = codigoProjeto
            item.sequencia_item = sequenciaCorpoProva
            }

        return item
      })
      .filter((item) =>
        item.codigo_engenharia ||
        item.descricao ||
        item.comprimento_mm ||
        item.volume_m3
      )

    setPreview(dadosTratados)

    setMostrarPreview(false)
    setMostrarArvore(false)
  }

  async function importarItens() {
    if (!projetoId) {
      setMensagem('Selecione um projeto antes de importar.')
      return
    }

    if (!preview.length) {
      setMensagem('Nenhum item encontrado para importar.')
      return
    }

    function extrairNumeroCarregamento(valor) {
      const texto = String(valor || '')
      const numero = texto.match(/\d+/)?.[0]

      return numero || ''
    }

    const itensParaSalvar = preview.map(({ _pai_temporario, ...item }) => ({
      ...item,
      projeto_id: projetoId,
      origem: 'importacao_excel',
      status: 'Pendente',
      ativo: true
    }))

    const { error } = await supabase
      .from('itens_projeto')
      .insert(itensParaSalvar)

    if (error) {
      setMensagem(error.message)
      return
    }

    const carregamentosUnicos = [
        ...new Set(
          itensParaSalvar
            .map((item) =>
              String(item.carregamento_engenharia || '')
                .replace(/[^\d]/g, '')
                .trim()
            )
            .filter((numero) => numero && !Number.isNaN(Number(numero)))
        )
      ]

    if (carregamentosUnicos.length) {
      const carregamentosParaCriar = carregamentosUnicos.map((numero) => ({
        projeto_id: projetoId,
        numero_carregamento: Number(numero),
        nome_carregamento: `Carregamento ${numero}`,
        status: 'Planejado',
        ativo: true,
        observacoes: 'Criado automaticamente pela importação da engenharia.'
      }))

      console.log('Carregamentos para criar:', carregamentosParaCriar)

      const { data: carregamentosUpsert, error: erroUpsertCarregamentos } = await supabase
          .from('carregamentos_projeto')
          .upsert(carregamentosParaCriar, {
            onConflict: 'projeto_id,numero_carregamento'
          })
          .select()

        console.log('Carregamentos criados/atualizados:', carregamentosUpsert)
        console.log('Erro upsert carregamentos:', erroUpsertCarregamentos)

        if (erroUpsertCarregamentos) {
          setMensagem(erroUpsertCarregamentos.message)
          return
        }

      const { data: carregamentosCriados, error: erroBuscarCarregamentos } =
        await supabase
          .from('carregamentos_projeto')
          .select('id, numero_carregamento')
          .eq('projeto_id', projetoId)

      if (erroBuscarCarregamentos) {
        setMensagem(erroBuscarCarregamentos.message)
        return
      }

      for (const carregamento of carregamentosCriados || []) {
            const itensDoCarregamento = itensParaSalvar.filter((item) => {
              const numero = String(item.carregamento_engenharia || '')
                .replace(/[^\d]/g, '')
                .trim()

              return Number(numero) === Number(carregamento.numero_carregamento)
            })

            const idsItens = itensDoCarregamento
              .map((item) => item.codigo_interno_item)
              .filter(Boolean)

            if (!idsItens.length) continue

            await supabase
              .from('itens_projeto')
              .update({ carregamento_id: carregamento.id })
              .eq('projeto_id', projetoId)
              .in('codigo_interno_item', idsItens)
          }
    }

    setMensagem( `${itensParaSalvar.length} itens importados com sucesso. ${carregamentosUnicos.length} carregamentos identificados.` )
    setPreview([])
  }

  function montarArvore() {
        const pais = preview.filter(
            (item) => item.tipo_item === 'PAI'
        )

        return pais.map((pai) => ({
            ...pai,
            filhos: preview.filter(
            (item) =>
                item.codigo_interno_pai ===
                pai.codigo_interno_item
            )
        }))
    }
    const arvore = montarArvore()

  function alternarPai(codigoPai) {
        setPaisAbertos((atual) => ({
            ...atual,
            [codigoPai]: !atual[codigoPai]
        }))
        }

        function limparFiltroDimensao() {
        setFiltroDimensao({
            base: '',
            altura: '',
            comprimento: ''
        })
      }

        function dimensaoContem(valorItem, valorFiltro) {
        if (!valorFiltro) return true

        return String(valorItem || '')
            .replace(',', '.')
            .includes(String(valorFiltro).replace(',', '.'))
        }

        const arvoreFiltrada = arvore.filter((pai) => {
        return (
            dimensaoContem(pai.base_mm, filtroDimensao.base) &&
            dimensaoContem(pai.altura_mm, filtroDimensao.altura) &&
            dimensaoContem(pai.comprimento_mm, filtroDimensao.comprimento)
        )
        })
        function limparFiltroTabela() {
            setFiltroTabela({
                tipo: '',
                material: '',
                nome: '',
                codigo: '',
                nesting: '',
                lamela: '',
                base: '',
                altura: '',
                comprimento: ''
            })
            }

            function textoContem(valorItem, valorFiltro) {
            if (!valorFiltro) return true

            return String(valorItem || '')
                .toLowerCase()
                .includes(String(valorFiltro).toLowerCase())
            }

            const previewFiltrado = preview.filter((item) => {
            return (
                textoContem(item.tipo_item, filtroTabela.tipo) &&
                textoContem(item.tipo_material, filtroTabela.material) &&
                textoContem(item.descricao, filtroTabela.nome) &&
                textoContem(item.codigo_engenharia, filtroTabela.codigo) &&
                textoContem(item.codigo_nesting, filtroTabela.nesting) &&
                textoContem(item.lamela, filtroTabela.lamela) &&
                dimensaoContem(item.base_mm, filtroTabela.base) &&
                dimensaoContem(item.altura_mm, filtroTabela.altura) &&
                dimensaoContem(item.comprimento_mm, filtroTabela.comprimento)
            )
            })

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Engenharia</p>
          <h2>Importar Estrutura</h2>
          <span>Importação de itens pai e filhos por planilha da engenharia.</span>
        </div>
      </div>

      <section className="form-card">
        <div className="form-grid">
          <label>
            Projeto
            <select value={projetoId} onChange={(e) => setProjetoId(e.target.value)}>
              <option value="">Selecione...</option>
              {projetos.map((projeto) => (
                <option key={projeto.id} value={projeto.id}>
                  {projeto.codigo_interno} - {projeto.nome_projeto}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tipo de importação
            <select value={tipoMaterial} onChange={(e) => setTipoMaterial(e.target.value)}>
              <option value="MLC">MLC</option>
              <option value="CLT">CLT</option>
            </select>
          </label>

          <label className="full">
            Planilha
            <input type="file" accept=".xlsx,.xls,.xlsm" onChange={lerArquivo} />
          </label>
        </div>

        {arquivoNome && <p className="import-info">Arquivo selecionado: {arquivoNome}</p>}

        <button className="primary-button" onClick={importarItens}>
          <Upload size={16} />
          Confirmar importação
        </button>

        {mensagem && <div className="alert" style={{ marginTop: 16 }}>{mensagem}</div>}
      </section>
      
      <section className="table-card collapsible-card" style={{ marginTop: 24 }}>
        <button
            type="button"
            className="collapsible-header"
            onClick={() => setMostrarPreview(!mostrarPreview)}
        >
            <div>
            <h3>Pré-visualização da Planilha</h3>
            <span>{previewFiltrado.length} de {preview.length} linhas identificadas</span>
            </div>

            {mostrarPreview ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>

        {mostrarPreview && (
            <>
            <div className="tree-filter">
                <div className="tree-filter-title">
                <Search size={16} />
                <span>Filtrar dados da planilha</span>
                </div>

                <div className="preview-filter-fields">
                <input placeholder="Tipo" value={filtroTabela.tipo} onChange={(e) => setFiltroTabela({ ...filtroTabela, tipo: e.target.value })} />
                <input placeholder="Material" value={filtroTabela.material} onChange={(e) => setFiltroTabela({ ...filtroTabela, material: e.target.value })} />
                <input placeholder="Nome" value={filtroTabela.nome} onChange={(e) => setFiltroTabela({ ...filtroTabela, nome: e.target.value })} />
                <input placeholder="Código" value={filtroTabela.codigo} onChange={(e) => setFiltroTabela({ ...filtroTabela, codigo: e.target.value })} />
                <input placeholder="Nesting" value={filtroTabela.nesting} onChange={(e) => setFiltroTabela({ ...filtroTabela, nesting: e.target.value })} />
                <input placeholder="Lamela" value={filtroTabela.lamela} onChange={(e) => setFiltroTabela({ ...filtroTabela, lamela: e.target.value })} />
                <input placeholder="Base" value={filtroTabela.base} onChange={(e) => setFiltroTabela({ ...filtroTabela, base: e.target.value })} />
                <input placeholder="Altura" value={filtroTabela.altura} onChange={(e) => setFiltroTabela({ ...filtroTabela, altura: e.target.value })} />
                <input placeholder="Comprimento" value={filtroTabela.comprimento} onChange={(e) => setFiltroTabela({ ...filtroTabela, comprimento: e.target.value })} />

                <button type="button" className="filter-clear" onClick={limparFiltroTabela}>
                    <X size={14} />
                    Limpar
                </button>
                </div>
            </div>

            <div className="table-wrapper">
                <table>
                <thead>
                    <tr>
                    <th>Linha</th>
                    <th>Tipo</th>
                    <th>Material</th>
                    <th>Cód. Interno</th>
                    <th>Pai Interno</th>
                    <th>Nome</th>
                    <th>Código</th>
                    <th>Nesting</th>
                    <th>Lamela</th>
                    <th>Dimensão</th>
                    <th>Volume</th>
                    <th>Carreg. Eng.</th>
                    </tr>
                </thead>

                <tbody>
                    {previewFiltrado.map((item, index) => (
                    <tr key={`${item.linha_origem}-${index}`}>
                        <td>{item.linha_origem}</td>
                        <td>{item.tipo_item}</td>
                        <td>{item.tipo_material}</td>
                        <td>{item.codigo_interno_item || '-'}</td>
                        <td>{item.codigo_interno_pai || '-'}</td>
                        <td>{item.descricao || '-'}</td>
                        <td>{item.codigo_engenharia || '-'}</td>
                        <td>{item.codigo_nesting || '-'}</td>
                        <td>{item.lamela || '-'}</td>
                        <td>{item.base_mm || '-'} x {item.altura_mm || '-'} x {item.comprimento_mm || '-'}</td>
                        <td>{item.volume_m3 || '-'}</td>
                        <td>{item.carregamento_engenharia || '-'}</td>
                    </tr>
                    ))}

                    {!previewFiltrado.length && (
                    <tr>
                        <td colSpan="12" className="empty">
                        Nenhuma planilha carregada ainda.
                        </td>
                    </tr>
                    )}
                </tbody>
                </table>
            </div>
            </>
        )}
        </section>

        <section className="table-card collapsible-card" style={{ marginTop: 24 }}>
            <button
                type="button"
                className="collapsible-header"
                onClick={() => setMostrarArvore(!mostrarArvore)}
            >
                <div>
                <h3>Árvore do Projeto</h3>
                <span>
                    {arvoreFiltrada.length} de {arvore.length} itens pai identificados
                </span>
                </div>

                {mostrarArvore ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>

            {mostrarArvore && (
                <>
                <div className="tree-filter">
                    <div className="tree-filter-title">
                    <Search size={16} />
                    <span>Filtrar dimensões do item pai</span>
                    </div>

                    <div className="tree-filter-fields">
                    <input
                        placeholder="Base"
                        value={filtroDimensao.base}
                        onChange={(e) =>
                        setFiltroDimensao({ ...filtroDimensao, base: e.target.value })
                        }
                    />

                    <input
                        placeholder="Altura"
                        value={filtroDimensao.altura}
                        onChange={(e) =>
                        setFiltroDimensao({ ...filtroDimensao, altura: e.target.value })
                        }
                    />

                    <input
                        placeholder="Comprimento"
                        value={filtroDimensao.comprimento}
                        onChange={(e) =>
                        setFiltroDimensao({ ...filtroDimensao, comprimento: e.target.value })
                        }
                    />

                    <button type="button" className="filter-clear" onClick={limparFiltroDimensao}>
                        <X size={14} />
                        Limpar
                    </button>
                    </div>
                </div>

                {!arvoreFiltrada.length && (
                    <p className="empty">Nenhum item pai encontrado com os filtros informados.</p>
                )}

                <div className="tree-list">
                    {arvoreFiltrada.map((pai) => {
                    const aberto = !!paisAbertos[pai.codigo_interno_item]

                    const qtdFilhos = pai.filhos.filter(
                        (filho) => filho.tipo_item === 'FILHO'
                    ).length

                    const qtdCP = pai.filhos.filter(
                        (filho) => filho.tipo_item === 'CORPO_PROVA'
                    ).length

                    return (
                        <div className="tree-parent" key={pai.codigo_interno_item}>
                        <button
                            type="button"
                            className="tree-parent-toggle"
                            onClick={() => alternarPai(pai.codigo_interno_item)}
                        >
                            <div className="tree-parent-left">
                            {aberto ? <ChevronDown size={18} /> : <ChevronRight size={18} />}

                            <div>
                                <strong>
                                {pai.base_mm || '-'} x {pai.altura_mm || '-'} x {pai.comprimento_mm || '-'}
                                </strong>

                                <div className="tree-meta">
                                Engenharia: {pai.codigo_engenharia || '-'} · Volume: {pai.volume_m3 || '-'} m³ · Lamela: {pai.lamela || '-'}
                                </div>
                            </div>
                            </div>

                            <div className="tree-parent-badges">
                            <span className="material-badge">{pai.tipo_material}</span>
                            <span>{qtdFilhos} filhos</span>
                            <span>{qtdCP} CP</span>
                            <span className="code-badge">{pai.codigo_interno_item}</span>
                            </div>
                        </button>

                        {aberto && (
                            <div className="tree-children">
                            {pai.filhos.map((filho) => (
                                <div className="tree-child" key={filho.codigo_interno_item}>
                                <span className={filho.tipo_item === 'CORPO_PROVA' ? 'child-type cp' : 'child-type'}>
                                    {filho.tipo_item === 'CORPO_PROVA' ? 'CP' : 'FIL'}
                                </span>

                                <div>
                                    <strong>
                                    {filho.base_mm || '-'} x {filho.altura_mm || '-'} x {filho.comprimento_mm || '-'}
                                    </strong>

                                    <small>
                                    {filho.codigo_interno_item} · Engenharia: {filho.codigo_engenharia || '-'} · Volume: {filho.volume_m3 || '-'} m³
                                    </small>
                                </div>
                                </div>
                            ))}

                            {!pai.filhos.length && (
                                <p className="empty">Nenhum filho vinculado a este item pai.</p>
                            )}
                            </div>
                        )}
                        </div>
                    )
                    })}
                </div>
                </>
            )}
            </section>
    </div>
  )
}