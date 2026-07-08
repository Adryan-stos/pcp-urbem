import { supabase } from '../lib/supabase'
import { criarPacoteMateriaPrima } from './inventoryEngine.js'

export async function listarRecebimentos() {
  const { data, error } = await supabase
    .from('recebimentos_materia_prima')
    .select(`
      *,
      recebimentos_materia_prima_itens(*),
      pacotes_materia_prima(*)
    `)
    .eq('ativo', true)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}

export async function criarRecebimento(recebimento, itens = []) {
  const { data: recebimentoCriado, error: erroRecebimento } = await supabase
    .from('recebimentos_materia_prima')
    .insert([recebimento])
    .select()
    .single()

  if (erroRecebimento) throw erroRecebimento

  const itensFormatados = itens.map((item) => {
    const quantidadePecas = Number(item.quantidade_pecas || 0)
    const volumeUnitario = Number(item.volume_unitario_m3 || 0)
    const volumeM3 = quantidadePecas * volumeUnitario

    return {
      recebimento_id: recebimentoCriado.id,
      lote_interno: item.lote_interno || `LT-${Date.now()}`,

      especie: item.especie,
      classe: item.classe,

      espessura_mm: Number(item.espessura_mm || 0),
      largura_mm: Number(item.largura_mm || 0),
      comprimento_mm: Number(item.comprimento_mm || 0),

      quantidade_pecas: quantidadePecas,
      volume_m3: volumeM3,

      saldo_pecas: quantidadePecas,
      saldo_m3: volumeM3,

      fsc: Boolean(item.fsc),

      buffer_atual: item.buffer_atual || 'BUFFER AUTOCLAVE',
      rua: item.rua || 'A',
      secao: item.secao || '1',
      localizacao:
        item.localizacao ||
        `BUFFER AUTOCLAVE - Rua ${item.rua || 'A'} - Seção ${item.secao || '1'}`
    }
  })

  if (itensFormatados.length > 0) {
    const { data: itensCriados, error: erroItens } = await supabase
      .from('recebimentos_materia_prima_itens')
      .insert(itensFormatados)
      .select()

    if (erroItens) throw erroItens

    for (const itemCriado of itensCriados || []) {
      await criarPacoteMateriaPrima({
        recebimentoId: recebimentoCriado.id,
        recebimentoItemId: itemCriado.id,
        item: {
          especie: itemCriado.especie,
          classe: itemCriado.classe,
          espessura_mm: itemCriado.espessura_mm,
          largura_mm: itemCriado.largura_mm,
          comprimento_mm: itemCriado.comprimento_mm,
          quantidade_pecas: itemCriado.quantidade_pecas,
          volume_m3: itemCriado.volume_m3,
          fsc: itemCriado.fsc,

          buffer_atual: itemCriado.buffer_atual || 'BUFFER AUTOCLAVE',
          rua: itemCriado.rua || 'A',
          secao: itemCriado.secao || '1',
          localizacao:
            itemCriado.localizacao ||
            `BUFFER AUTOCLAVE - Rua ${itemCriado.rua || 'A'} - Seção ${itemCriado.secao || '1'}`
        }
      })
    }
  }

  return recebimentoCriado
}