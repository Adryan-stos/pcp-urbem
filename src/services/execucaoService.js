import { supabase } from '../lib/supabase'

export async function buscarTalaoExecucao(numeroTalao) {
  const talaoLimpo = String(numeroTalao || '').trim()

  if (!talaoLimpo) {
    throw new Error('Informe um número de talão.')
  }

  const { data: talao, error } = await supabase
    .from('op_processos')
    .select(`
      id,
      ordem_producao_id,
      sequencia,
      numero_talao,
      processo,
      recurso,
      tipo_item_processo,
      produto_entrada,
      quantidade_entrada_prevista,
      produto_saida,
      quantidade_saida_prevista,
      status,
      prioridade,
      data_prevista_inicio,
      data_prevista_fim,
      status_pcp,
      ordens_producao (
        id,
        numero_op,
        status,
        volume_m3,
        itens_projeto (
          id,
          codigo_interno_item,
          tipo_material,
          base_mm,
          altura_mm,
          comprimento_mm,
          projetos (
            codigo_interno,
            nome_projeto,
            cliente
          )
        )
      )
    `)
    .eq('numero_talao', talaoLimpo)
    .single()

  if (error) throw error

  const { data: processosOP, error: erroProcessos } = await supabase
    .from('op_processos')
    .select(`
      id,
      sequencia,
      numero_talao,
      processo,
      status
    `)
    .eq('ordem_producao_id', talao.ordem_producao_id)
    .lt('sequencia', talao.sequencia)
    .order('sequencia', { ascending: true })

  if (erroProcessos) throw erroProcessos

  const statusConcluidos = ['Concluído', 'Validado']

  const processosPendentes = (processosOP || []).filter(
    (processo) => !statusConcluidos.includes(processo.status)
  )

  const podeExecutar = processosPendentes.length === 0

  return {
    talao,
    podeExecutar,
    mensagem: podeExecutar
      ? 'Processo liberado para execução.'
      : 'Existem processos anteriores pendentes.',
    processosPendentes
  }
}