import { supabase } from '../lib/supabase'

export async function listarOPLotesExecucao(processo = 'CLASSIFICADORA') {
  const { data, error } = await supabase
    .from('op_lotes')
    .select(`
      *,
      op_lote_itens (
        *,
        pacotes_materia_prima (*)
      )
    `)
    .eq('ativo', true)
    .eq('processo', processo)
    .in('status', ['Programado', 'Em produção', 'Em pausa', 'Aguardando programação'])
    .order('prioridade', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function iniciarExecucaoOPLote(opLoteId, operador = '') {
  const { data, error } = await supabase.rpc('iniciar_execucao_op_lote', {
    p_op_lote_id: opLoteId,
    p_operador: operador || null
  })

  if (error) throw error
  return data
}

export async function finalizarClassificacaoOPLote({ opLoteId, saidas, perdas, operador }) {
  const { data, error } = await supabase.rpc('finalizar_classificacao_op_lote_com_tempos', {
    p_op_lote_id: opLoteId,
    p_saidas: saidas,
    p_perdas: perdas,
    p_operador: operador || null
  })

  if (error) throw error
  return data
}

export async function finalizarEtapaOPLote(opLoteId, operador = '') {
  const { data, error } = await supabase.rpc('finalizar_etapa_op_lote_com_tempos', {
    p_op_lote_id: opLoteId,
    p_operador: operador || null
  })

  if (error) throw error
  return data
}

export async function listarEtiquetasClassificacao(opLoteId) {
  const { data: classificacoes, error } = await supabase
    .from('op_lote_classificacoes')
    .select('*')
    .eq('op_lote_id', opLoteId)
    .order('created_at', { ascending: true })

  if (error) throw error
  if (!classificacoes?.length) return []

  const pacoteIds = classificacoes.map((item) => item.pacote_saida_id).filter(Boolean)
  const { data: pacotes, error: erroPacotes } = await supabase
    .from('pacotes_materia_prima')
    .select('*')
    .in('id', pacoteIds)

  if (erroPacotes) throw erroPacotes
  const pacotesPorId = Object.fromEntries((pacotes || []).map((pacote) => [pacote.id, pacote]))

  return classificacoes.map((item) => ({
    classificacao_id: item.id,
    pacote_origem_id: item.pacote_origem_id,
    pacote_saida_id: item.pacote_saida_id,
    classe: item.classe_saida,
    espessura_mm: item.espessura_mm,
    largura_mm: item.largura_mm,
    comprimento_mm: item.comprimento_mm,
    quantidade: item.quantidade_saida,
    volume_m3: item.volume_saida_m3,
    pacote: pacotesPorId[item.pacote_saida_id] || {}
  }))
}
