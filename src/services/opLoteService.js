import { supabase } from '../lib/supabase'
import {
  obterBuffersEntrada,
  normalizarProcesso
} from './processoEstoqueService.js'
import { datetimeLocalParaIso } from '../utils/datasPlanejamento.js'

export async function listarOPLotesPorProcesso(processo) {
  const processoNormalizado = normalizarProcesso(processo)

  const { data, error } = await supabase
    .from('op_lotes')
    .select(`
      *,
      op_lote_itens (
        *,
        pacotes_materia_prima (
          *,
          recebimentos_materia_prima (
            numero_nf,
            fornecedor
          )
        )
      )
    `)
    .eq('ativo', true)
    .eq('processo', processoNormalizado)
    .in('status', ['Aguardando programação', 'Programado', 'Em produção', 'Em pausa'])
    .order('prioridade', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}

export async function listarEstoqueParaOPLote(processo, opLote = null) {
  const buffersEntrada = obterBuffersEntrada(processo)

  if (!buffersEntrada.length) return []

  const { data, error } = await supabase
    .from('pacotes_materia_prima')
    .select(`
      *,
      recebimentos_materia_prima (
        numero_nf,
        fornecedor,
        data_recebimento
      )
    `)
    .eq('ativo', true)
    .gt('quantidade_saldo', 0)
    .gt('volume_saldo_m3', 0)
    .in('buffer_atual', buffersEntrada)
    .order('created_at', { ascending: true })

  if (error) throw error

  const reservasDaOp = new Map((opLote?.op_lote_itens || []).map((item) => [
    item.estoque_item_id,
    { quantidade: Number(item.quantidade_prevista || 0), volume: Number(item.volume_previsto_m3 || 0) }
  ]))

  return (data || [])
    .map((item) => ({
      ...item,
      quantidade_disponivel: Math.max(
        Number(item.quantidade_saldo || 0) - Number(item.quantidade_reservada || 0) + Number(reservasDaOp.get(item.id)?.quantidade || 0),
        0
      ),
      volume_disponivel_m3: Math.max(
        Number(item.volume_saldo_m3 || 0) - Number(item.volume_reservado_m3 || 0) + Number(reservasDaOp.get(item.id)?.volume || 0),
        0
      )
    }))
    .filter(
      (item) =>
        item.quantidade_disponivel > 0 && item.volume_disponivel_m3 > 0
    )
}

export async function criarOPLote({
  processo,
  prioridade = null,
  dataPrevistaInicio = null,
  dataPrevistaFim = null,
  observacao = null,
  itens = []
}) {
  if (!itens.length) {
    throw new Error('Selecione pelo menos um item de estoque para a OP de lote.')
  }

  const { data: opLote, error } = await supabase.rpc(
    'criar_op_lote_transacional',
    {
      p_processo: normalizarProcesso(processo),
      p_prioridade: prioridade,
      p_data_prevista_inicio: datetimeLocalParaIso(dataPrevistaInicio),
      p_data_prevista_fim: datetimeLocalParaIso(dataPrevistaFim),
      p_observacao: observacao,
      p_itens: itens.map((item) => ({
        estoque_item_id: item.estoque_item_id,
        quantidade_prevista: Number(item.quantidade_prevista || 0)
      }))
    }
  )

  if (error) throw error

  return opLote
}

export async function reordenarOPLotes(processo, opLoteIds) {
  const { error } = await supabase.rpc('reordenar_op_lotes_transacional', {
    p_processo: normalizarProcesso(processo),
    p_op_lote_ids: opLoteIds
  })

  if (error) throw error
}

export async function editarMateriaisOPLote(opLoteId, itens) {
  const { data, error } = await supabase.rpc('editar_materiais_op_lote', {
    p_op_lote_id: opLoteId,
    p_itens: itens.map((item) => ({
      estoque_item_id: item.estoque_item_id,
      quantidade_prevista: Number(item.quantidade_prevista || 0)
    }))
  })
  if (error) throw error
  return data
}

export async function cancelarOPLote(opLoteId, motivo) {
  const { data, error } = await supabase.rpc('cancelar_op_lote', {
    p_op_lote_id: opLoteId,
    p_motivo: motivo
  })
  if (error) throw error
  return data
}
