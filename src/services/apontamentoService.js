import { supabase } from '../lib/supabase'

export async function listarApontamentosPorOP(ordemProducaoId) {
  const { data, error } = await supabase
    .from('op_apontamentos')
    .select(`
      id,
      produto_entrada,
      quantidade_entrada,
      produto_saida,
      quantidade_saida,
      quantidade_perda,
      volume_produzido_m3,
      observacao,
      created_at,
      op_processos (
        id,
        sequencia,
        processo,
        numero_talao
      )
    `)
    .eq('op_processos.ordem_producao_id', ordemProducaoId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}