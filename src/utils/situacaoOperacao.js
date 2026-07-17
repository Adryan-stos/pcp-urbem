export function obterSituacaoOperacao(operacao) {
  const texto = String(operacao.status_pcp || operacao.status || '').toLowerCase()
  const concluida = texto.includes('conclu') || texto.includes('finaliz')
  const emProducao = texto.includes('produção') || texto.includes('producao')
  const emPausa = texto.includes('pausa')
  const inicio = operacao.inicio || operacao.data_prevista_inicio
  const fim = operacao.fim || operacao.data_prevista_fim
  const inicioReal = operacao.inicioReal || operacao.inicio_producao
  const fimReal = operacao.fimReal || operacao.fim_producao
  const agora = Date.now()
  const fimPrevistoVencido = fim && new Date(fim).getTime() < agora
  const inicioVencidoSemExecucao = !fim && inicio && new Date(inicio).getTime() < agora && !inicioReal
  const iniciouSemEncerrarAposPrazo = Boolean(inicioReal && !fimReal && fimPrevistoVencido)
  const atrasada = !concluida && (fimPrevistoVencido || inicioVencidoSemExecucao || iniciouSemEncerrarAposPrazo)

  if (concluida) return { classe: 'completed', rotulo: 'Concluída', atrasada: false }
  if (emPausa) return { classe: atrasada ? 'late paused' : 'paused', rotulo: atrasada ? 'Em pausa · atrasada' : 'Em pausa', atrasada }
  if (emProducao) return { classe: atrasada ? 'late production' : 'production', rotulo: atrasada ? 'Em produção · atrasada' : 'Em produção', atrasada }
  if (atrasada) return { classe: 'late', rotulo: 'Atrasada', atrasada: true }
  return { classe: 'scheduled', rotulo: 'No prazo', atrasada: false }
}
