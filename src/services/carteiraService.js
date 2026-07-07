import { supabase } from '../lib/supabase'

export async function carregarCarteira() {
  const { data, error } = await supabase
    .from('itens_projeto')
    .select(`
      *,
      projetos(*),
      carregamentos_projeto(*),
      ordens_producao(
        *,
        op_processos(*)
      ),
      itens_filhos:itens_projeto!item_pai_id(*)
    `)
    .eq('tipo_item', 'PAI')
    .eq('ativo', true)

  if (error) throw error

  return data
}