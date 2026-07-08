import { supabase } from '../lib/supabase'
import { obterBuffersEntrada } from './processoEstoqueService.js'

export async function listarItensEstoqueParaProcesso(processo) {
  const buffersEntrada = obterBuffersEntrada(processo)

  if (!buffersEntrada.length) return []

  const { data, error } = await supabase
    .from('pacotes_materia_prima')
    .select(`
      *,
      recebimentos_materia_prima (
        numero_nf,
        fornecedor
      )
    `)
    .eq('ativo', true)
    .gt('quantidade_saldo', 0)
    .gt('volume_saldo_m3', 0)
    .in('buffer_atual', buffersEntrada)
    .order('created_at', { ascending: true })

  if (error) throw error

  return data || []
}