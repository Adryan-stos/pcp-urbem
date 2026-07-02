import { supabase } from '../lib/supabase'

export async function listarTaloesExecucao() {
  const { data, error } = await supabase
    .from('op_processos')
    .select(`
      id,
      sequencia,
      numero_talao,
      processo,
      recurso,
      tipo_item_processo,
      produto_entrada,
      produto_saida,
      status,
      prioridade,
      data_prevista_inicio,
      data_prevista_fim,
      status_pcp,
      ordens_producao (
        id,
        numero_op,
        status,
        item_id,
        itens_projeto (
          id,
          codigo_interno_item,
          volume_m3,
          projetos (
            codigo_interno,
            nome_projeto,
            cliente,
            data_entrega
          )
        )
      )
    `)
    .not('prioridade', 'is', null)
    .in('status', ['Programado', 'Em produção', 'Bloqueado'])
    .order('prioridade', { ascending: true })
    .order('sequencia', { ascending: true })

  if (error) throw error

  return data || []
}