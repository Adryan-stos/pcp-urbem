import { supabase } from '../lib/supabase'
import { liberarProximoProcesso, atualizarStatusOrdemProducao } from './workflowService.js'

const USUARIO_DESENVOLVIMENTO = 'DESENVOLVIMENTO'

export async function finalizarProducao(opProcesso, dados = {}) {
  if (opProcesso.processo === 'OTIMIZADORA/FINGER' && !dados.blankSaidaId) {
    throw new Error('Selecione ou cadastre o Blank produzido antes de finalizar.')
  }

  let blankSaida = null
  if (dados.blankSaidaId) {
    const { data, error } = await supabase.from('blanks').select('*').eq('id', dados.blankSaidaId).eq('ativo', true).single()
    if (error) throw error
    blankSaida = data
  }

  const fim = new Date()
  const fimISO = fim.toISOString()

  const { data: paradaAberta, error: erroBuscaParada } = await supabase
    .from('paradas_producao')
    .select('*')
    .eq('op_processo_id', opProcesso.id)
    .eq('status', 'Em pausa')
    .maybeSingle()

  if (erroBuscaParada) throw erroBuscaParada
 
  if (paradaAberta) {
    const inicioParada = new Date(paradaAberta.inicio_parada)

    const duracaoSegundos = Math.floor(
      (fim.getTime() - inicioParada.getTime()) / 1000
    )

    const { error: erroFechaParada } = await supabase
      .from('paradas_producao')
      .update({
        fim_parada: fimISO,
        duracao_segundos: duracaoSegundos,
        status: 'Finalizada',
        motivo_fechamento: 'Finalização'
      })
      .eq('id', paradaAberta.id)

    if (erroFechaParada) throw erroFechaParada
  }

    // Dimensões medidas no início da produção
    const espessura = Number(blankSaida?.espessura_mm || opProcesso.espessura_inicio || 0)
    const largura = Number(blankSaida?.largura_mm || opProcesso.largura_inicio || 0)
    const comprimento = Number(blankSaida?.comprimento_mm || opProcesso.comprimento_inicio || 0)

    const quantidadeSaida = Number(dados.quantidadeSaida || 0)

    const volumeProduzidoM3 =
    (espessura * largura * comprimento * quantidadeSaida) / 1000000000

  const { data: apontamento, error: erroApontamento } = await supabase
    .from('op_apontamentos')

    
    .insert([
      {
        op_processo_id: opProcesso.id,
        produto_entrada: opProcesso.produto_entrada,
        quantidade_entrada: dados.quantidadeEntrada ?? null,
        produto_saida: blankSaida?.descricao || opProcesso.produto_saida,
        blank_saida_id: blankSaida?.id || null,
        quantidade_saida: quantidadeSaida,
        quantidade_perda: dados.quantidadePerda ?? 0,
        observacao: dados.observacao ?? null,
        espessura_final: espessura,
        largura_final: largura,
        comprimento_final: comprimento,
        volume_produzido_m3: volumeProduzidoM3,
        apontado_por: USUARIO_DESENVOLVIMENTO
      }
    ])
    .select()
    .single()

  if (erroApontamento) throw erroApontamento

  const { data: processoAtualizado, error: erroProcesso } = await supabase
    .from('op_processos')
    .update({
      status: 'Concluído',
      status_pcp: 'Concluído',
      fim_producao: fimISO,
      finalizado_por: null,
      blank_saida_id: blankSaida?.id || null,
      produto_saida: blankSaida?.descricao || opProcesso.produto_saida
    })
    .eq('id', opProcesso.id)
    .select(`
      *,
      ordens_producao (
        id,
        numero_op,
        status,
        volume_m3,
        itens_projeto (
          id,
          codigo_interno_item,
          tipo_material,
          base_mm,
          altura_mm,
          comprimento_mm,
          projetos (
            codigo_interno,
            nome_projeto,
            cliente
          )
        )
      )
    `)
    .single()

  if (erroProcesso) throw erroProcesso

    await liberarProximoProcesso( processoAtualizado.ordem_producao_id, processoAtualizado.sequencia )

    await atualizarStatusOrdemProducao( processoAtualizado.ordem_producao_id)

  return {
    apontamento,
    processoAtualizado
  }
}
