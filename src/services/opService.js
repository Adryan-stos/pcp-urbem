import { supabase } from '../lib/supabase'

export async function gerarNumeroOPBase() {
  const { data, error } = await supabase.rpc('gerar_numero_op')

  if (error) throw error

  return data
}

export function montarProcessosOP(item, ordemProducaoId, numeroOPBase) {
  const processos = []

  const material = String(item.tipo_material || '').toUpperCase()
  const isCLT = material.includes('CLT')
  const isMLC = material.includes('MLC')

  function adicionarProcesso(
    sequencia,
    processo,
    recurso = null,
    tipoItemProcesso = 'FILHO'
  ) {
    const primeiroProcesso = processos.length === 0

    processos.push({
      ordem_producao_id: ordemProducaoId,
      sequencia,
      numero_talao: `${numeroOPBase}-${sequencia}`,
      processo,
      recurso,
      tipo_item_processo: tipoItemProcesso,
      status: primeiroProcesso ? 'Liberado para programação' : 'Pendente',
      liberado_programacao: primeiroProcesso,
      prioridade: null,
      origem: 'Sugestão do sistema'
    })
  }

  if (isMLC) {
    adicionarProcesso(10, 'OTIMIZADORA/FINGER', 'OTIMIZADORA/FINGER', 'MASTER')
    adicionarProcesso(20, 'PLAINA', 'A DEFINIR', 'MASTER')
    adicionarProcesso(30, 'PRENSA', 'A DEFINIR', 'MASTER')

    if (item.pcp_destopadeira) {
      adicionarProcesso(40, 'DESTOPADEIRA', 'DESTOPADEIRA', 'FILHO')
    }

    if (item.pcp_cnc) {
      adicionarProcesso(50, 'CNC', 'CNC', 'FILHO')
    }

    if (item.pcp_acabamento) {
      adicionarProcesso(60, 'ACABAMENTO', 'ACABAMENTO', 'FILHO')
    }
  }

  if (isCLT) {
    adicionarProcesso(10, 'OTIMIZADORA/FINGER', 'OTIMIZADORA/FINGER', 'MASTER')
    adicionarProcesso(20, 'PLAINA', 'A DEFINIR', 'MASTER')
    adicionarProcesso(30, 'PRENSA', 'MINDA', 'MASTER')
    adicionarProcesso(40, 'CNC', 'CNC', 'FILHO')
    adicionarProcesso(50, 'ACABAMENTO', 'ACABAMENTO', 'FILHO')
  }

  return processos
}

export async function criarOP(master) {
  const numeroOPBase = await gerarNumeroOPBase()
  const numeroOP = `OP-${numeroOPBase}`

  const { data: opCriada, error: erroOP } = await supabase
    .from('ordens_producao')
    .insert([
      {
        numero_op: numeroOP,
        numero_op_base: numeroOPBase,
        projeto_id: master.projeto_id,
        carregamento_id: master.carregamento_id,
        item_id: master.id,
        item_pai_id: master.id,
        status: 'Em programação',
        volume_m3: master.volume_m3 || 0,
        ativo: true
      }
    ])
    .select()
    .single()

  if (erroOP) throw erroOP

  const processos = montarProcessosOP(master, opCriada.id, numeroOPBase)

  if (processos.length) {
    const { error: erroProcessos } = await supabase
      .from('op_processos')
      .insert(processos)

    if (erroProcessos) throw erroProcessos
  }

  return opCriada
}

export async function carregarProcessosOP(opId) {
  const { data, error } = await supabase
    .from('op_processos')
    .select('*')
    .eq('ordem_producao_id', opId)
    .order('sequencia')

  if (error) throw error

  return data || []
}