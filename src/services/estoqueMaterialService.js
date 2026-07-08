import { supabase } from '../lib/supabase'

export async function listarEstoqueMateriais() {
  const { data, error } = await supabase
    .from('pacotes_materia_prima')
    .select(`
      *,
      recebimentos_materia_prima (
        numero_nf,
        fornecedor,
        data_recebimento
      )
    `)
    .eq('ativo', true)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}