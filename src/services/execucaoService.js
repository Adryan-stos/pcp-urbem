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
      inicio_producao,
      fim_producao,
      iniciado_por,
      finalizado_por,
      tempo_execucao_segundos,
      tempo_parado_segundos,
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
  
  const { data: paradaAberta, error: erroParadaAberta } = await supabase
    .from('paradas_producao')
    .select('id')
    .eq('op_processo_id', talao.id)
    .eq('status', 'Em pausa')
    .maybeSingle()

  if (erroParadaAberta) throw erroParadaAberta

  if (paradaAberta) {
    talao.status = 'Em pausa'
    talao.status_pcp = 'Em pausa'
  }

  if (talao.status === 'Concluído') {
    return {
      talao,
      podeExecutar: false,
      mensagem:
        'Este talão já foi concluído e está disponível apenas para consulta.',
      processosPendentes: [],
      somenteConsulta: true
    }
  }

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


export async function iniciarExecucaoProducao(opProcessoId, dadosInicio = {}) {
  const inicio = new Date().toISOString()

  // ==========================================================
  // MODO DESENVOLVIMENTO
  // Quando a autenticação estiver pronta, substituir pelo
  // supabase.auth.getUser()
  // ==========================================================
  const usuario = {
    id: null
  }

  const { data, error } = await supabase


    .from('op_processos')
    .update({
      status: 'Em produção',
      status_pcp: 'Em produção',
      inicio_producao: inicio,
      iniciado_por: usuario.id,

      espessura_inicio: dadosInicio.espessuraInicio ?? null,
      largura_inicio: dadosInicio.larguraInicio ?? null,
      comprimento_inicio: dadosInicio.comprimentoInicio ?? null,
      validacao_inicio_observacao: dadosInicio.observacao ?? null
    })
    .eq('id', opProcessoId)
    .select()
    .single()

  if (error) throw error

  if (talao.status === 'Concluído') {
    return {
      talao,
      podeExecutar: false,
      mensagem: 'Este talão já foi concluído e não pode ser apontado novamente.',
      processosPendentes: []
    }
  }

  return data
}