import { supabase } from '../lib/supabase'

export async function listarProjetos() {
  const { data, error } = await supabase
    .from('projetos')
    .select('*')
    .eq('ativo',true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function criarProjeto(projeto) {
  const { data, error } = await supabase
    .from('projetos')
    .insert([projeto])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function excluirProjeto(id, motivo = 'Excluído pelo usuário') {
  const { data, error } = await supabase
    .from('projetos')
    .update({
      ativo: false,
      excluido_em: new Date().toISOString(),
      motivo_exclusao: motivo
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return data
}