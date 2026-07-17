import { supabase } from '../lib/supabase'

const USUARIO_DESENVOLVIMENTO = 'DESENVOLVIMENTO'

export async function iniciarParada(opProcessoId, dados = {}, tipoOperacao = 'processo') {
  if (tipoOperacao === 'lote') {
    const { data, error } = await supabase.rpc('pausar_execucao_op_lote', {
      p_op_lote_id: opProcessoId,
      p_motivo_parada_id: dados.motivoParadaId,
      p_motivo: dados.motivo ?? 'Motivo cadastrado',
      p_observacao: dados.observacao ?? null,
      p_registrado_por: USUARIO_DESENVOLVIMENTO
    })

    if (error) throw error
    return data
  }

  const inicio = new Date().toISOString()

  const { data: paradaAberta, error: erroParadaAberta } = await supabase
    .from('paradas_producao')
    .select('id')
    .eq('op_processo_id', opProcessoId)
    .eq('status', 'Em pausa')
    .maybeSingle()

  if (erroParadaAberta) throw erroParadaAberta

  if (paradaAberta) {
    throw new Error('Já existe uma parada aberta para este processo.')
  }

  const { data, error } = await supabase
    .from('paradas_producao')
    .insert([
      {
        op_processo_id: opProcessoId,
        inicio_parada: inicio,
        motivo_parada_id: dados.motivoParadaId,
        motivo: dados.motivo ?? 'Motivo cadastrado',
        observacao: dados.observacao ?? null,
        status: 'Em pausa',
        registrado_por: USUARIO_DESENVOLVIMENTO
      }
    ])
    .select()
    .single()

  if (error) throw error

  const { error: erroProcesso } = await supabase
    .from('op_processos')
    .update({
      status: 'Em pausa',
      status_pcp: 'Em pausa'
    })
    .eq('id', opProcessoId)

  if (erroProcesso) throw erroProcesso

  return data
}

export async function retomarProducao(opProcessoId, tipoOperacao = 'processo') {
  if (tipoOperacao === 'lote') {
    const { data, error } = await supabase.rpc('retomar_execucao_op_lote', {
      p_op_lote_id: opProcessoId
    })

    if (error) throw error
    return data
  }

  const fim = new Date()
  const fimISO = fim.toISOString()

  const { data: paradaAberta, error: erroBusca } = await supabase
    .from('paradas_producao')
    .select('*')
    .eq('op_processo_id', opProcessoId)
    .eq('status', 'Em pausa')
    .single()

  if (erroBusca) throw erroBusca

  const inicio = new Date(paradaAberta.inicio_parada)
  const duracaoSegundos = Math.floor((fim.getTime() - inicio.getTime()) / 1000)

  const { data, error } = await supabase
    .from('paradas_producao')
    .update({
      fim_parada: fimISO,
      duracao_segundos: duracaoSegundos,
      status: 'Finalizada',
      motivo_fechamento: 'Retomada'
    })
    .eq('id', paradaAberta.id)
    .select()
    .single()

  if (error) throw error

  const { error: erroProcesso } = await supabase
    .from('op_processos')
    .update({
      status: 'Em produção',
      status_pcp: 'Em produção'
    })
    .eq('id', opProcessoId)

  if (erroProcesso) throw erroProcesso

  return data
}

export async function listarParadasPorProcesso(opProcessoId, tipoOperacao = 'processo') {
  const coluna = tipoOperacao === 'lote' ? 'op_lote_id' : 'op_processo_id'
  const { data, error } = await supabase
    .from('paradas_producao')
    .select('*')
    .eq(coluna, opProcessoId)
    .order('inicio_parada', { ascending: true })

  if (error) throw error

  return data || []
}

export function calcularTempoParadoSegundos(paradas = []) {
  const agora = new Date()

  return paradas.reduce((total, parada) => {
    if (parada.duracao_segundos) {
      return total + Number(parada.duracao_segundos)
    }

    if (parada.status === 'Em pausa' && parada.inicio_parada) {
      const inicio = new Date(parada.inicio_parada)
      return total + Math.floor((agora.getTime() - inicio.getTime()) / 1000)
    }

    return total
  }, 0)
}
