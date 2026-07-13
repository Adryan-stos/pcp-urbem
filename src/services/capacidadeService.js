import { supabase } from '../lib/supabase'

export async function listarRecursosProdutivos(fabrica = null) {
  let consulta = supabase
    .from('recursos_produtivos')
    .select(`
      *,
      capacidades_recursos (*),
      calendarios_recursos (*),
      bloqueios_recursos (*)
    `)
    .eq('ativo', true)
    .order('fabrica')
    .order('nome')

  if (fabrica) consulta = consulta.eq('fabrica', Number(fabrica))

  const { data, error } = await consulta

  if (error) throw error

  return (data || []).map((recurso) => ({
    ...recurso,
    capacidades_recursos: [...(recurso.capacidades_recursos || [])].sort(
      (a, b) => String(b.vigencia_inicio).localeCompare(String(a.vigencia_inicio))
    ),
    calendarios_recursos: [...(recurso.calendarios_recursos || [])].sort(
      (a, b) => Number(a.dia_semana) - Number(b.dia_semana)
    )
  }))
}

export async function criarRecursoProdutivo(recurso) {
  const { data, error } = await supabase
    .from('recursos_produtivos')
    .insert([{
      codigo: recurso.codigo.trim().toUpperCase(),
      nome: recurso.nome.trim(),
      fabrica: Number(recurso.fabrica),
      processo: recurso.processo.trim().toUpperCase(),
      tipo_recurso: recurso.tipoRecurso,
      quantidade_recursos: recurso.tipoRecurso === 'Grupo de recursos'
        ? Number(recurso.quantidadeRecursos || 1)
        : 1,
      observacao: recurso.observacao || null
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function criarCapacidadeRecurso(recursoId, capacidade) {
  const { data, error } = await supabase
    .from('capacidades_recursos')
    .insert([{
      recurso_id: recursoId,
      tipo_medicao: capacidade.tipoMedicao,
      unidade: capacidade.unidade,
      capacidade_nominal: Number(capacidade.capacidadeNominal),
      duracao_ciclo_minutos: capacidade.duracaoCicloMinutos
        ? Number(capacidade.duracaoCicloMinutos)
        : null,
      tempo_setup_minutos: Number(capacidade.tempoSetupMinutos || 0),
      fonte: capacidade.fonte || 'Estimativa inicial',
      nivel_confianca: capacidade.nivelConfianca || 'Estimado',
      vigencia_inicio: capacidade.vigenciaInicio,
      vigencia_fim: capacidade.vigenciaFim || null,
      observacao: capacidade.observacao || null
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function salvarCalendarioRecurso(recursoId, dias) {
  const registros = dias.map((dia) => ({
    recurso_id: recursoId,
    dia_semana: dia.diaSemana,
    hora_inicio: dia.horaInicio,
    hora_fim: dia.horaFim,
    intervalo_inicio: dia.intervaloInicio || null,
    intervalo_fim: dia.intervaloFim || null,
    ativo: dia.ativo
  }))

  const { error } = await supabase
    .from('calendarios_recursos')
    .upsert(registros, { onConflict: 'recurso_id,dia_semana' })

  if (error) throw error
}
