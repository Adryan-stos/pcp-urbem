import { supabase } from '../lib/supabase'

export async function carregarDiarioProducao(ordemProducaoId) {
  const { data, error } = await supabase
    .from('op_processos')
    .select(`
      *,
      op_apontamentos(*),
      paradas_producao(
        *,
        motivos_parada(
          codigo,
          motivo,
          categoria
        )
      )
    `)
    .eq('ordem_producao_id', ordemProducaoId)
    .order('sequencia', { ascending: true })

  if (error) throw error

  return data || []
}

export function somarTempoParado(paradas = []) {
  return paradas.reduce(
    (total, parada) => total + Number(parada.duracao_segundos || 0),
    0
  )
}

export function calcularTempoTotalSegundos(inicio, fim) {
  if (!inicio || !fim) return 0

  const inicioData = new Date(inicio)
  const fimData = new Date(fim)

  return Math.max(
    Math.floor((fimData.getTime() - inicioData.getTime()) / 1000),
    0
  )
}

export function formatarTempo(segundos = 0) {
  const total = Number(segundos || 0)

  const horas = Math.floor(total / 3600)
  const minutos = Math.floor((total % 3600) / 60)
  const seg = total % 60

  if (horas > 0) {
    return `${horas}h ${String(minutos).padStart(2, '0')}min`
  }

  if (minutos > 0) {
    return `${minutos}min ${String(seg).padStart(2, '0')}s`
  }

  return `${seg}s`
}