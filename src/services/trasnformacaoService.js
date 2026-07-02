import { supabase } from '../lib/supabase'

export async function criarTransformacaoPreApontada(opProcesso, dados = {}) {
  const { data, error } = await supabase
    .from('transformacoes_producao')
    .insert([
      {
        op_processo_id: opProcesso.id,

        produto_entrada: opProcesso.produto_entrada,
        quantidade_entrada_prevista: opProcesso.quantidade_entrada_prevista,
        quantidade_entrada_real: dados.quantidadeEntradaReal ?? null,

        produto_saida: opProcesso.produto_saida,
        quantidade_saida_prevista: opProcesso.quantidade_saida_prevista,
        quantidade_saida_real: dados.quantidadeSaidaReal ?? null,

        produto_sobra: dados.produtoSobra ?? null,
        quantidade_sobra: dados.quantidadeSobra ?? null,

        produto_perda: dados.produtoPerda ?? null,
        quantidade_perda: dados.quantidadePerda ?? null,

        status: 'Pré-apontado',

        observacao: dados.observacao ?? null,
        operador: dados.operador ?? null,
        recurso: dados.recurso ?? opProcesso.recurso ?? null,

        inicio_producao: dados.inicioProducao ?? null,
        fim_producao: dados.fimProducao ?? null
      }
    ])
    .select()
    .single()

  if (error) throw error

  return data
}

export async function listarTransformacoesPorProcesso(opProcessoId) {
  const { data, error } = await supabase
    .from('transformacoes_producao')
    .select('*')
    .eq('op_processo_id', opProcessoId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}

export async function listarTransformacoesPendentes() {
  const { data, error } = await supabase
    .from('transformacoes_producao')
    .select(`
      *,
      op_processos (
        id,
        numero_talao,
        sequencia,
        processo,
        recurso,
        ordem_producao_id,
        ordens_producao (
          id,
          numero_op,
          status
        )
      )
    `)
    .eq('status', 'Pré-apontado')
    .order('created_at', { ascending: true })

  if (error) throw error

  return data || []
}

export async function validarTransformacao(transformacaoId) {
  const { data, error } = await supabase
    .from('transformacoes_producao')
    .update({
      status: 'Validado'
    })
    .eq('id', transformacaoId)
    .select()
    .single()

  if (error) throw error

  return data
}

export async function rejeitarTransformacao(transformacaoId, observacao = null) {
  const { data, error } = await supabase
    .from('transformacoes_producao')
    .update({
      status: 'Rejeitado',
      observacao
    })
    .eq('id', transformacaoId)
    .select()
    .single()

  if (error) throw error

  return data
}