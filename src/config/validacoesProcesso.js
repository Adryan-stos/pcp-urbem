export const VALIDACOES_PROCESSO = {
  AUTOCLAVE: {
    exigeQuantidade: true,
    exigeDimensao: true,
    loteEntrada: 'NF de Recebimento'
  },
  GRADEADOR: {
    exigeQuantidade: true,
    exigeDimensao: true,
    loteEntrada: 'NF de Recebimento'
  },
  ESTUFA: {
    exigeQuantidade: true,
    exigeDimensao: true,
    loteEntrada: 'Talão Anterior'
  },
  CLASSIFICADORA: {
    exigeQuantidade: true,
    exigeDimensao: true,
    loteEntrada: 'Talão Anterior'
  },
  'OTIMIZADORA/FINGER': {
    exigeQuantidade: true,
    exigeDimensao: true,
    loteEntrada: 'Talão Anterior'
  },
  PLAINA: {
    exigeQuantidade: true,
    exigeDimensao: true,
    loteEntrada: 'Talão Anterior'
  },
  PRENSA: {
    exigeQuantidade: true,
    exigeDimensao: true,
    loteEntrada: 'Talão Anterior'
  },
  DESTOPADEIRA: {
    exigeQuantidade: false,
    exigeDimensao: true,
    loteEntrada: 'Talão Anterior'
  },
  CNC: {
    exigeQuantidade: false,
    exigeDimensao: true,
    loteEntrada: 'Talão Anterior'
  },
  ACABAMENTO: {
    exigeQuantidade: false,
    exigeDimensao: true,
    loteEntrada: 'Talão Anterior'
  }
}