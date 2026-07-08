export const FLUXO_ESTOQUE_PROCESSO = {
  AUTOCLAVE: { entrada: ['BUFFER AUTOCLAVE'], saida: ['BUFFER SERRADO TRATADO']  },
  GRADEADOR: { entrada: ['BUFFER SERRADO TRATADO'], saida: ['BUFFER TRATADO GRADEADO'] },
  ESTUFA: {  entrada: ['BUFFER TRATADO GRADEADO'],  saida: ['BUFFER TRATADO SECO']  },
  CLASSIFICADORA: { entrada: ['BUFFER TRATADO SECO'], saida: ['BUFFER PRE OTIMIZAÇÃO'] },
  OTIMIZADORA_FINGER: { entrada: ['BUFFER PRE OTIMIZAÇÃO'],saida: ['BUFFER PRE PLAINAS'] },
  PLAINAS: { entrada: ['BUFFER PRE PLAINAS'], saida: ['BUFFER PRENSAS'] },
  PRENSAS: { entrada: ['BUFFER PRE PLAINAS'], saida: ['BUFFER PRENSAS'] },
  DESTOPADEIRA: { entrada: ['BUFFER PRENSAS'], saida: ['BUFFER DESTOPADEIRA'] },
  CNC: { entrada: ['BUFFER DESTOPADEIRA', 'BUFFER PRENSAS'], saida: ['BUFFER CNC', 'BUFFER ACABAMENTO'] },
  ACABAMENTO: { entrada: ['BUFFER DESTOPADEIRA', 'BUFFER CNC'], saida: ['BUFFER ACABAMENTO', 'BUFFER EXPEDIÇÃO'] }
}

export function normalizarProcesso(processo) {
  return String(processo || '')
    .trim()
    .toUpperCase()
    .replaceAll('/', '_')
    .replaceAll(' ', '_')
}

export function obterFluxoEstoquePorProcesso(processo) {
  const processoNormalizado = normalizarProcesso(processo)
  return FLUXO_ESTOQUE_PROCESSO[processoNormalizado] || null
}

export function processoUsaEstoque(processo) {
  return Boolean(obterFluxoEstoquePorProcesso(processo))
}

export function obterBuffersEntrada(processo) {
  return obterFluxoEstoquePorProcesso(processo)?.entrada || []
}

export function obterBuffersSaida(processo) {
  return obterFluxoEstoquePorProcesso(processo)?.saida || []
}