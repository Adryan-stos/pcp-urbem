import { supabase } from '../lib/supabase'

export async function carregarMotivosParada(processo) {
  const processoNormalizado = String(processo || '').trim().toUpperCase()

  const { data, error } = await supabase
    .from('motivos_parada')
    .select('*')
    .eq('ativo', true)
    .eq('processo', processoNormalizado)

  console.log('ERROR:', error)
  console.log('DATA:', data)

  if (error) throw error

  return data || []
}