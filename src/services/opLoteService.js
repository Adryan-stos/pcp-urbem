import { supabase } from '../lib/supabase'
import {
  obterBuffersEntrada,
  obterBuffersSaida,
  normalizarProcesso
} from './processoEstoqueService.js'

export function gerarNumeroOPLote(processo) {
  const data = new Date()

  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  const hora = String(data.getHours()).padStart(2, '0')
  const minuto = String(data.getMinutes()).padStart(2, '0')
  const segundo = String(data.getSeconds()).padStart(2, '0')

  const processoNormalizado = normalizarProcesso(processo)

  return `OPL-${processoNormalizado}-${ano}${mes}${dia}${hora}${minuto}${segundo}`
}

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
    .order('prioridade', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}

export async function listarEstoqueParaOPLote(processo) {
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
    .eq('status', 'Disponível')
    .gt('quantidade_saldo', 0)
    .gt('volume_saldo_m3', 0)
    .in('buffer_atual', buffersEntrada)
    .order('created_at', { ascending: true })

  if (error) throw error

  return data || []
}

export async function criarOPLote({
  processo,
  prioridade = null,
  dataPrevistaInicio = null,
  dataPrevistaFim = null,
  observacao = null,
  itens = []
}) {
  const processoNormalizado = normalizarProcesso(processo)

  const buffersEntrada = obterBuffersEntrada(processoNormalizado)
  const buffersSaida = obterBuffersSaida(processoNormalizado)

  if (!buffersEntrada.length) {
    throw new Error('Processo sem buffer de entrada configurado.')
  }

  if (!buffersSaida.length) {
    throw new Error('Processo sem buffer de saída configurado.')
  }

  if (!itens.length) {
    throw new Error('Selecione pelo menos um item de estoque para a OP de lote.')
  }

  const numeroOPLote = gerarNumeroOPLote(processoNormalizado)

  const { data: opLote, error: erroOP } = await supabase
    .from('op_lotes')
    .insert([
      {
        numero_op_lote: numeroOPLote,
        processo: processoNormalizado,
        buffer_entrada: buffersEntrada[0],
        buffer_saida: buffersSaida[0],
        prioridade,
        data_prevista_inicio: dataPrevistaInicio,
        data_prevista_fim: dataPrevistaFim,
        observacao,
        status: 'Programado'
      }
    ])
    .select()
    .single()

  if (erroOP) throw erroOP

  const itensFormatados = itens.map((item) => ({
    op_lote_id: opLote.id,
    estoque_item_id: item.estoque_item_id,
    quantidade_prevista: Number(item.quantidade_prevista || 0),
    volume_previsto_m3: Number(item.volume_previsto_m3 || 0),
    status: 'Reservado'
  }))

  const { error: erroItens } = await supabase
    .from('op_lote_itens')
    .insert(itensFormatados)

  if (erroItens) throw erroItens

  const idsEstoque = itens.map((item) => item.estoque_item_id)

  const { error: erroReservaEstoque } = await supabase
    .from('pacotes_materia_prima')
    .update({
      status: 'Reservado'
    })
    .in('id', idsEstoque)

  if (erroReservaEstoque) throw erroReservaEstoque

  return opLote
}