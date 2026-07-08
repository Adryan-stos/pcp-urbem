import { supabase } from '../lib/supabase'

export async function listarFornecedores() {
  const { data, error } = await supabase
    .from('fornecedores')
    .select('*')
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data || []
}

export async function listarMateriasPrimas() {
  const { data, error } = await supabase
    .from('materias_primas')
    .select('*')
    .eq('ativo', true)
    .order('descricao')

  if (error) throw error
  return data || []
}