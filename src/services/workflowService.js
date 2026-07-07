import { supabase } from '../lib/supabase'

export async function liberarProximoProcesso(ordemProducaoId, sequenciaAtual) {
  const { data: proximoProcesso, error: erroBusca } = await supabase
    .from('op_processos')
    .select('*')
    .eq('ordem_producao_id', ordemProducaoId)
    .gt('sequencia', sequenciaAtual)
    .order('sequencia', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (erroBusca) throw erroBusca

  if (!proximoProcesso) return null

  const { data, error } = await supabase
    .from('op_processos')
    .update({
      status: 'Liberado para programação',
      status_pcp: 'Aguardando programação',
      liberado_programacao: true,
      prioridade: null
    })
    .eq('id', proximoProcesso.id)
    .select()
    .single()

  if (error) throw error

  return data
}

export async function atualizarStatusOrdemProducao(ordemProducaoId) {
  const { data: processos, error } = await supabase
    .from('op_processos')
    .select('status')
    .eq('ordem_producao_id', ordemProducaoId)

  if (error) throw error

  if (!processos?.length) return null

  const todosConcluidos = processos.every((p) => p.status === 'Concluído')
  const algumEmProducao = processos.some((p) => p.status === 'Em produção')
  const algumEmPausa = processos.some((p) => p.status === 'Em pausa')
  const algumConcluido = processos.some((p) => p.status === 'Concluído')

  let statusOP = 'Em programação'

  if (todosConcluidos) statusOP = 'Concluída'
  else if (algumEmProducao) statusOP = 'Em produção'
  else if (algumEmPausa) statusOP = 'Em pausa'
  else if (algumConcluido) statusOP = 'Em produção'

  const { data, error: erroUpdate } = await supabase
    .from('ordens_producao')
    .update({ status: statusOP })
    .eq('id', ordemProducaoId)
    .select()
    .single()

  if (erroUpdate) throw erroUpdate

  return data
}