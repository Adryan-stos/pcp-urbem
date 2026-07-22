import { supabase } from '../lib/supabase'

export async function gerarNumeroOPBase() {
  const { data, error } = await supabase.rpc('gerar_numero_op')

  if (error) throw error

  return data
}

export function montarProcessosOP(item, ordemProducaoId, numeroOPBase) {
  const processos = []

  const material = String(item.tipo_material || '').toUpperCase()
  const isCLT = material.includes('CLT')

  function adicionarProcesso({
    sequencia,
    processo,
    recurso = null,
    tipoItemProcesso = 'FILHO',
    produtoEntrada = null,
    quantidadeEntradaPrevista = null,
    produtoSaida = null,
    quantidadeSaidaPrevista = null
  }) {
    const primeiroProcesso = processos.length === 0

    processos.push({
      ordem_producao_id: ordemProducaoId,
      sequencia,
      numero_talao: `${numeroOPBase}-${sequencia}`,
      processo,
      recurso,
      tipo_item_processo: tipoItemProcesso,
      produto_entrada: produtoEntrada,
      quantidade_entrada_prevista: quantidadeEntradaPrevista,
      produto_saida: produtoSaida,
      quantidade_saida_prevista: quantidadeSaidaPrevista,
      status: primeiroProcesso ? 'Liberado para programação' : 'Pendente',
      liberado_programacao: primeiroProcesso,
      prioridade: null,
      origem: 'Sugestão do sistema'
    })
  }

  adicionarProcesso({
    sequencia: 10,
    processo: 'AUTOCLAVE',
    recurso: 'AUTOCLAVE',
    tipoItemProcesso: 'LAMELA',
    produtoEntrada: 'LAMELA',
    produtoSaida: 'LAMELA'
  })

  adicionarProcesso({
    sequencia: 15,
    processo: 'GRADEADOR',
    recurso: 'GRADEADOR',
    tipoItemProcesso: 'LAMELA',
    produtoEntrada: 'LAMELA',
    produtoSaida: 'LAMELA'
  })

  adicionarProcesso({
    sequencia: 20,
    processo: 'ESTUFA',
    recurso: 'ESTUFA',
    tipoItemProcesso: 'LAMELA',
    produtoEntrada: 'LAMELA',
    produtoSaida: 'LAMELA'
  })

  adicionarProcesso({
    sequencia: 25,
    processo: 'CLASSIFICADORA',
    recurso: 'CLASSIFICADORA',
    tipoItemProcesso: 'LAMELA',
    produtoEntrada: 'LAMELA',
    produtoSaida: 'LAMELA'
  })

  adicionarProcesso({
    sequencia: 30,
    processo: 'OTIMIZADORA/FINGER',
    recurso: 'OTIMIZADORA/FINGER',
    tipoItemProcesso: 'BLANK',
    produtoEntrada: 'LAMELA',
    produtoSaida: 'BLANK'
  })

  adicionarProcesso({
    sequencia: 35,
    processo: 'PLAINA',
    recurso: 'A DEFINIR',
    tipoItemProcesso: 'BLANK',
    produtoEntrada: 'BLANK',
    produtoSaida: 'BLANK'
  })

  adicionarProcesso({
    sequencia: 40,
    processo: 'PRENSA',
    recurso: isCLT ? 'MINDA' : 'A DEFINIR',
    tipoItemProcesso: 'MASTER',
    produtoEntrada: 'BLANK',
    produtoSaida: 'MASTER',
    quantidadeSaidaPrevista: 1
  })

  if (item.pcp_destopadeira) {
    adicionarProcesso({
      sequencia: 44,
      processo: 'DESTOPADEIRA',
      recurso: 'DESTOPADEIRA',
      tipoItemProcesso: 'FILHO',
      produtoEntrada: 'MASTER',
      quantidadeEntradaPrevista: 1,
      produtoSaida: 'FILHO'
    })
  }

  if (item.pcp_cnc) {
    adicionarProcesso({
      sequencia: 50,
      processo: 'CNC',
      recurso: 'CNC',
      tipoItemProcesso: 'FILHO',
      produtoEntrada: item.pcp_destopadeira ? 'FILHO' : 'MASTER',
      quantidadeEntradaPrevista: 1,
      produtoSaida: 'FILHO',
      quantidadeSaidaPrevista: 1
    })
  }

  if (item.pcp_acabamento) {
    adicionarProcesso({
      sequencia: 55,
      processo: 'ACABAMENTO',
      recurso: 'ACABAMENTO',
      tipoItemProcesso: 'FILHO',
      produtoEntrada: 'FILHO',
      quantidadeEntradaPrevista: 1,
      produtoSaida: 'FILHO',
      quantidadeSaidaPrevista: 1
    })
  }

  return processos
}

export async function criarOP(master) {
  const numeroOPBase = await gerarNumeroOPBase()
  const numeroOP = `OP-${numeroOPBase}`

  const { data: opCriada, error: erroOP } = await supabase
    .from('ordens_producao')
    .insert([
      {
        numero_op: numeroOP,
        numero_op_base: numeroOPBase,
        projeto_id: master.projeto_id,
        carregamento_id: master.carregamento_id,
        item_id: master.id,
        item_pai_id: master.id,
        status: 'Em programação',
        volume_m3: master.volume_m3 || 0,
        ativo: true
      }
    ])
    .select()
    .single()

  if (erroOP) throw erroOP

  const processos = montarProcessosOP(master, opCriada.id, numeroOPBase)

  if (processos.length) {
    const { error: erroProcessos } = await supabase
      .from('op_processos')
      .insert(processos)

    if (erroProcessos) throw erroProcessos
  }

  return opCriada
}

export async function criarOPAPartirDaFinger(master, blankSaidaId) {
  if (!master?.id) throw new Error('Selecione o item/projeto da OP.')
  if (!blankSaidaId) throw new Error('Selecione o Blank de saída.')

  const numeroOPBase = await gerarNumeroOPBase()
  const numeroOP = `OP-${numeroOPBase}`

  const { data: opCriada, error: erroOP } = await supabase
    .from('ordens_producao')
    .insert([{
      numero_op: numeroOP,
      numero_op_base: numeroOPBase,
      projeto_id: master.projeto_id,
      carregamento_id: master.carregamento_id,
      item_id: master.id,
      item_pai_id: master.id,
      status: 'Em programação',
      volume_m3: master.volume_m3 || 0,
      ativo: true
    }])
    .select()
    .single()

  if (erroOP) throw erroOP

  const processos = montarProcessosOP(master, opCriada.id, numeroOPBase)
    .filter((processo) => processo.sequencia >= 30)
    .map((processo, indice) => ({
      ...processo,
      status: indice === 0 ? 'Liberado para programação' : 'Pendente',
      liberado_programacao: indice === 0,
      blank_saida_id: processo.processo === 'OTIMIZADORA/FINGER' ? blankSaidaId : null
    }))

  const { error: erroProcessos } = await supabase
    .from('op_processos')
    .insert(processos)

  if (erroProcessos) {
    await supabase.from('ordens_producao').delete().eq('id', opCriada.id)
    throw erroProcessos
  }

  return opCriada
}

export async function listarItensDisponiveisParaOPFinger() {
  const { data, error } = await supabase
    .from('itens_projeto')
    .select(`
      *,
      projetos (codigo_interno, nome_projeto, cliente),
      carregamentos_projeto (numero_carregamento, data_prevista),
      ordens_producao (id, numero_op, ativo, status)
    `)
    .eq('tipo_item', 'PAI')
    .eq('ativo', true)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).filter((item) =>
    !(item.ordens_producao || []).some((op) => op.ativo && op.status !== 'Cancelado')
  )
}

export async function carregarProcessosOP(opId) {
  const { data, error } = await supabase
    .from('op_processos')
    .select('*')
    .eq('ordem_producao_id', opId)
    .order('sequencia')

  if (error) throw error

  return data || []
}
