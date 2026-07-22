import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase.js'

const PROCESSOS = {
  GRADEADOR: { processo: 'GRADEADOR', fabrica: 1 },
  AUTOCLAVE: { processo: 'AUTOCLAVE', fabrica: 1 },
  ESTUFA: { processo: 'ESTUFA', fabrica: 1 },
  'CLASSIFICAÇÃO': { processo: 'CLASSIFICADORA', fabrica: 1 },
  'OTIMIZ>FINGER': { processo: 'OTIMIZADORA/FINGER', fabrica: 2 },
  'PLAINA P': { processo: 'PLAINA', fabrica: 2 },
  PAOLETTI: { processo: 'PRENSA PAOLETTI', fabrica: 2 },
  'PLAINA M': { processo: 'PLAINA', fabrica: 2 },
  MINDA: { processo: 'PRENSA MINDA', fabrica: 2 },
  CNC: { processo: 'CNC', fabrica: 2 },
  DESTOPADEIRA: { processo: 'DESTOPADEIRA', fabrica: 2 },
  ACABAMENTO: { processo: 'ACABAMENTO', fabrica: 2 }
}

const texto = (valor) => valor == null ? '' : String(valor).trim()
const numero = (valor) => Number.isFinite(Number(valor)) ? Number(valor) : 0

function isoData(valor) {
  if (!valor) return null
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor.toISOString()
  if (typeof valor === 'number') {
    const data = XLSX.SSF.parse_date_code(valor)
    if (data) return new Date(Date.UTC(data.y, data.m - 1, data.d, data.H, data.M, Math.floor(data.S))).toISOString()
  }
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data.toISOString()
}

function valorPorCabecalho(linha, cabecalhos, nomes) {
  const indice = cabecalhos.findIndex((item) => nomes.some((nome) => texto(item).toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR')))
  return indice >= 0 ? linha[indice] : null
}

function localizarCabecalho(linhas) {
  let melhor = { indice: -1, pontos: 0 }
  linhas.slice(0, 8).forEach((linha, indice) => {
    const conteudo = linha.map(texto).join('|').toLocaleLowerCase('pt-BR')
    const pontos = ['data retorno', 'op. produção', 'projeto', 'tipo op', 'nº peças'].filter((chave) => conteudo.includes(chave)).length
    if (pontos > melhor.pontos) melhor = { indice, pontos }
  })
  return melhor.indice
}

export async function lerArquivoGRD(arquivo) {
  const workbook = XLSX.read(await arquivo.arrayBuffer(), { type: 'array', cellDates: true })
  const registros = []

  Object.entries(PROCESSOS).forEach(([aba, configuracao]) => {
    const worksheet = workbook.Sheets[aba]
    if (!worksheet) return
    const linhas = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: true })
    const indiceCabecalho = localizarCabecalho(linhas)
    if (indiceCabecalho < 0) return
    const cabecalhos = linhas[indiceCabecalho]

    linhas.slice(indiceCabecalho + 1).forEach((linha, deslocamento) => {
      const tipo = texto(valorPorCabecalho(linha, cabecalhos, ['Tipo OP', 'Tipo op']))
      const encerradoEm = isoData(valorPorCabecalho(linha, cabecalhos, ['Data Retorno', 'DATA (Fim PROD)', 'Fim PROD', 'Data de produção', 'Data de Produção']))
      const numeroOp = texto(valorPorCabecalho(linha, cabecalhos, ['OP. Produção', 'OP Produção', 'NF']))
      const projeto = texto(valorPorCabecalho(linha, cabecalhos, ['PROJETO', 'Projeto']))
      const quantidade = numero(valorPorCabecalho(linha, cabecalhos, ['Nº Peças', 'E.Nº Peças', 'Peça Nesting']))
      const volume = numero(valorPorCabecalho(linha, cabecalhos, ['Madeira Produção (m³)', 'Produção (m³)', 'Volume madeira (m³)', 'Madeira Consumida (m³)', 'Total Madeira Consumida (m³)']))
      if (!encerradoEm || (!numeroOp && !projeto && !quantidade && !volume) || (tipo && !/produ|retrabalho|volta/i.test(tipo))) return

      const dimensao = texto(valorPorCabecalho(linha, cabecalhos, ['Bitola', 'SKU', 'Produto']))
      registros.push({
        fonte: 'GRD', arquivo_origem: arquivo.name, aba_origem: aba, linha_origem: indiceCabecalho + deslocamento + 2,
        fabrica: configuracao.fabrica, processo: configuracao.processo, numero_operacao: numeroOp || `GRD-${aba}-${indiceCabecalho + deslocamento + 2}`,
        status: 'Concluído', projeto: projeto || null, item: dimensao || null, recurso: texto(valorPorCabecalho(linha, cabecalhos, ['Estufa', 'Finger'])) || null,
        inicio_producao: isoData(valorPorCabecalho(linha, cabecalhos, ['DATA (Inicio PROD)', 'Inicio PROD', 'Data Liberação'])),
        encerrado_em: encerradoEm, quantidade_pecas: quantidade, volume_m3: volume,
        dados_origem: Object.fromEntries(cabecalhos.map((cabecalho, i) => [texto(cabecalho) || `coluna_${i + 1}`, linha[i]]).filter(([, valor]) => valor != null))
      })
    })
  })

  if (!registros.length) throw new Error('Nenhum registro de produção reconhecido no arquivo selecionado.')
  return registros
}

export async function substituirHistoricoGRD(arquivo) {
  const registros = await lerArquivoGRD(arquivo)
  const { data, error } = await supabase.rpc('substituir_historico_grd', { p_arquivo: arquivo.name, p_registros: registros })
  if (error) throw error
  return { registros: Number(data || registros.length), ultimaData: registros.map((r) => r.encerrado_em).sort().at(-1) }
}
