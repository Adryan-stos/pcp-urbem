import { supabase } from '../lib/supabase'

export function formatarBlank(blank) {
  if (!blank) return '-'
  return `${blank.classe} - ${Number(blank.espessura_mm)} × ${Number(blank.largura_mm)} × ${Number(blank.comprimento_mm)} mm`
}

export async function listarBlanks(termo = '') {
  let consulta = supabase
    .from('blanks')
    .select('*')
    .eq('ativo', true)
    .order('classe')
    .order('espessura_mm')
    .order('largura_mm')
    .order('comprimento_mm')

  const busca = String(termo || '').trim()
  if (busca) consulta = consulta.or(`codigo.ilike.%${busca}%,descricao.ilike.%${busca}%,classe.ilike.%${busca}%`)

  const { data, error } = await consulta.limit(250)
  if (error) throw error
  return data || []
}

export async function cadastrarBlank({ classe, espessuraMm, larguraMm, comprimentoMm }) {
  const { data, error } = await supabase.rpc('cadastrar_blank', {
    p_classe: String(classe || '').trim().toUpperCase(),
    p_espessura_mm: Number(espessuraMm),
    p_largura_mm: Number(larguraMm),
    p_comprimento_mm: Number(comprimentoMm)
  })

  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}
