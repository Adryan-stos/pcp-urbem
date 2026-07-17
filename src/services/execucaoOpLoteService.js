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
    .in('status', ['Programado', 'Em produção', 'Aguardando programação'])
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
