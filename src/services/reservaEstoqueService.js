import { supabase } from '../lib/supabase'
import { obterBuffersEntrada } from './processoEstoqueService.js'

export async function listarEstoqueDisponivelParaProcesso(processo) {
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

export async function reservarEstoqueParaProcesso({
  ordemProducaoId,
  opProcessoId,
  estoqueItemId,
  quantidadePrevista,
  volumePrevistoM3,
  dataPrevistaConsumo
}) {
  const { data, error } = await supabase
    .from('op_estoque_reservas')
    .insert([
      {
        ordem_producao_id: ordemProducaoId,
        op_processo_id: opProcessoId,
        estoque_item_id: estoqueItemId,
        quantidade_prevista: quantidadePrevista,
        volume_previsto_m3: volumePrevistoM3,
        data_prevista_consumo: dataPrevistaConsumo || null,
        status: 'Reservado'
      }
    ])
    .select()
    .single()

  if (error) throw error

  const { error: erroEstoque } = await supabase
    .from('pacotes_materia_prima')
    .update({ status: 'Reservado' })
    .eq('id', estoqueItemId)

  if (erroEstoque) throw erroEstoque

  return data
}