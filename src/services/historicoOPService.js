import { supabase } from '../lib/supabase'

const STATUS_HISTORICO = ['Concluído', 'Finalizado', 'Validado', 'Cancelado']

export async function listarHistoricoOPs() {
  const [lotes, processos, importados] = await Promise.all([
    supabase
      .from('op_lotes')
      .select(`
        *,
        recursos_produtivos (id, codigo, nome, fabrica),
        op_lote_itens (*, pacotes_materia_prima (*))
      `)
      .in('status', STATUS_HISTORICO)
      .order('created_at', { ascending: false }),
    supabase
      .from('op_processos')
      .select(`
        *,
        recursos_produtivos (id, codigo, nome, fabrica),
        ordens_producao (
          id, numero_op, status, volume_m3,
          itens_projeto (
            id, codigo_interno_item, tipo_material,
            projetos (codigo_interno, nome_projeto, cliente)
          )
        )
      `)
      .in('status', STATUS_HISTORICO)
      .order('fim_producao', { ascending: false }),
    supabase.from('historico_grd_importado').select('*').order('encerrado_em', { ascending: false })
  ])

  if (lotes.error) throw lotes.error
  if (processos.error) throw processos.error
  if (importados.error && !['42P01', 'PGRST205'].includes(importados.error.code)) throw importados.error

  const historicoLotes = (lotes.data || []).map((op) => ({
    ...op,
    _tipo_operacao: 'lote',
    _id: `lote:${op.id}`,
    numero: op.numero_op_lote,
    numero_talao: op.numero_op_lote,
    fabrica: `Fábrica ${op.recursos_produtivos?.fabrica || 1}`,
    recurso_nome: op.recursos_produtivos?.nome || op.processo,
    projeto: '-',
    item: (op.op_lote_itens || [])
      .map((i) => i.pacotes_materia_prima?.codigo_pacote || i.pacotes_materia_prima?.codigo_item)
      .filter(Boolean).join(', '),
    operador: op.finalizado_por || op.iniciado_por || '-',
    encerrado_em: op.finalizado_em || op.cancelado_em || op.created_at,
    volume_m3: (op.op_lote_itens || []).reduce((soma, item) => soma + Number(item.volume_previsto_m3 || 0), 0)
  }))

  const historicoProcessos = (processos.data || []).map((op) => ({
    ...op,
    _tipo_operacao: 'processo',
    _id: `processo:${op.id}`,
    numero: op.numero_talao,
    fabrica: `Fábrica ${op.recursos_produtivos?.fabrica || 2}`,
    recurso_nome: op.recursos_produtivos?.nome || op.recurso || op.processo,
    projeto: op.ordens_producao?.itens_projeto?.projetos?.codigo_interno || '-',
    item: op.ordens_producao?.itens_projeto?.codigo_interno_item || op.produto_saida || '-',
    operador: op.finalizado_por || op.iniciado_por || '-',
    encerrado_em: op.fim_producao || op.updated_at,
    volume_m3: Number(op.ordens_producao?.volume_m3 || 0)
  }))

  const historicoImportado = (importados.data || []).map((op) => ({
    ...op, _tipo_operacao: 'grd', _id: `grd:${op.id}`, numero: op.numero_operacao,
    fabrica: `Fábrica ${op.fabrica}`, recurso_nome: op.recurso || op.processo,
    operador: 'Importação GRD', tempo_execucao_segundos: 0, tempo_parado_segundos: 0
  }))

  return [...historicoLotes, ...historicoProcessos, ...historicoImportado]
    .sort((a, b) => new Date(b.encerrado_em || 0) - new Date(a.encerrado_em || 0))
}

export async function registrarReimpressao({ operacao, pacoteId = null }) {
  const { error } = await supabase.from('reimpressoes_etiquetas').insert({
    tipo_operacao: operacao._tipo_operacao,
    op_lote_id: operacao._tipo_operacao === 'lote' ? operacao.id : null,
    op_processo_id: operacao._tipo_operacao === 'processo' ? operacao.id : null,
    pacote_id: pacoteId,
    numero_operacao: operacao.numero_op_lote || operacao.numero_talao,
    processo: operacao.processo
  })

  if (error) throw error
}

export async function contarReimpressoes(operacoes) {
  if (!operacoes.length) return {}
  const { data, error } = await supabase
    .from('reimpressoes_etiquetas')
    .select('op_lote_id, op_processo_id')

  if (error) {
    // Mantém o histórico utilizável antes da aplicação da migration.
    if (error.code === '42P01' || error.code === 'PGRST205') return {}
    throw error
  }

  return (data || []).reduce((acc, registro) => {
    const chave = registro.op_lote_id ? `lote:${registro.op_lote_id}` : `processo:${registro.op_processo_id}`
    acc[chave] = (acc[chave] || 0) + 1
    return acc
  }, {})
}
