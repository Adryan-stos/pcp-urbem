import { supabase } from '../lib/supabase'

export async function listarMateriasPrimasPorOP(ordemProducaoId) {
  const { data, error } = await supabase
    .from('materias_primas_op')
    .select('*')
    .eq('ordem_producao_id', ordemProducaoId)
    .eq('ativo', true)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}