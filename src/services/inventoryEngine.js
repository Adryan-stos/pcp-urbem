import { supabase } from '../lib/supabase'

export function gerarCodigoPacote() {
  return `PAC-${Date.now()}`
}

export async function criarPacoteMateriaPrima({
  recebimentoId,
  recebimentoItemId = null,
  item
}) {
  const quantidadePecas = Number(item.quantidade_pecas || 0)
  const volumeM3 = Number(item.volume_m3 || 0)

  const pacote = {
    recebimento_id: recebimentoId,
    recebimento_item_id: recebimentoItemId,

    codigo_pacote: gerarCodigoPacote(),

    especie: item.especie,
    classe: item.classe,

    espessura_mm: Number(item.espessura_mm || 0),
    largura_mm: Number(item.largura_mm || 0),
    comprimento_mm: Number(item.comprimento_mm || 0),

    quantidade_inicial: quantidadePecas,
    quantidade_saldo: quantidadePecas,

    volume_inicial_m3: volumeM3,
    volume_saldo_m3: volumeM3,

    buffer_atual: item.buffer_atual || 'BUFFER AUTOCLAVE',
    rua: item.rua || 'A',
    secao: item.secao || '1',
    localizacao: item.localizacao || 'BUFFER AUTOCLAVE - Rua A - Seção 1',

    fsc: Boolean(item.fsc),
    localizacao: item.localizacao || null,
    status: 'Disponível'
  }

  const { data, error } = await supabase
    .from('pacotes_materia_prima')
    .insert([pacote])
    .select()
    .single()

  if (error) throw error

  return data
}