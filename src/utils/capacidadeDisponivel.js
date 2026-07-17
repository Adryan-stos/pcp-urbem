function dataLocal(data) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function comHora(data, hora) {
  return new Date(`${data}T${String(hora).slice(0, 5)}:00`)
}

function minutos(inicio, fim) {
  return Math.max(0, (fim.getTime() - inicio.getTime()) / 60000)
}

export function formatarDataLocal(data) {
  return dataLocal(data)
}

export function somarDias(data, quantidade) {
  const resultado = new Date(`${data}T00:00:00`)
  resultado.setDate(resultado.getDate() + quantidade)
  return dataLocal(resultado)
}

export function calcularCapacidadePeriodo(recurso, inicioPeriodo, fimPeriodo) {
  if (!recurso || !inicioPeriodo || !fimPeriodo || fimPeriodo < inicioPeriodo) {
    return { capacidade: 0, horas: 0, unidade: '-', configurado: false }
  }

  let capacidadeTotal = 0
  let minutosTotal = 0
  let unidade = '-'
  let configurado = false
  const cursor = new Date(`${inicioPeriodo}T00:00:00`)
  const limite = new Date(`${fimPeriodo}T00:00:00`)

  while (cursor <= limite && cursor.getTime() - new Date(`${inicioPeriodo}T00:00:00`).getTime() < 370 * 86400000) {
    const data = dataLocal(cursor)
    const calendario = (recurso.calendarios_recursos || []).find(
      (item) => Number(item.dia_semana) === cursor.getDay() && item.ativo
    )
    const capacidade = (recurso.capacidades_recursos || [])
      .filter((item) => item.ativo && item.vigencia_inicio <= data && (!item.vigencia_fim || item.vigencia_fim >= data))
      .sort((a, b) => String(b.vigencia_inicio).localeCompare(String(a.vigencia_inicio)))[0]

    if (calendario && capacidade) {
      configurado = true
      unidade = capacidade.unidade
      const jornadaInicio = comHora(data, calendario.hora_inicio)
      const jornadaFim = comHora(data, calendario.hora_fim)
      const segmentos = calendario.intervalo_inicio && calendario.intervalo_fim
        ? [
            [jornadaInicio, comHora(data, calendario.intervalo_inicio)],
            [comHora(data, calendario.intervalo_fim), jornadaFim]
          ]
        : [[jornadaInicio, jornadaFim]]

      const bloqueios = (recurso.bloqueios_recursos || []).filter(
        (item) => item.ativo && new Date(item.inicio) < jornadaFim && new Date(item.fim) > jornadaInicio
      )

      const minutosCalendario = segmentos.reduce(
        (total, [segmentoInicio, segmentoFim]) => total + minutos(segmentoInicio, segmentoFim), 0
      )
      const minutosBloqueados = segmentos.reduce((total, [segmentoInicio, segmentoFim]) => (
        total + bloqueios.reduce((subtotal, bloqueio) => {
          const sobreposicaoInicio = new Date(Math.max(segmentoInicio.getTime(), new Date(bloqueio.inicio).getTime()))
          const sobreposicaoFim = new Date(Math.min(segmentoFim.getTime(), new Date(bloqueio.fim).getTime()))
          return subtotal + minutos(sobreposicaoInicio, sobreposicaoFim)
        }, 0)
      ), 0)
      const disponiveis = Math.max(0, minutosCalendario - Math.min(minutosCalendario, minutosBloqueados))
      const nominal = Number(capacidade.capacidade_nominal || 0)
      const multiplicador = Number(recurso.quantidade_recursos || 1)

      minutosTotal += disponiveis

      if (capacidade.tipo_medicao === 'Por hora') {
        capacidadeTotal += nominal * (disponiveis / 60) * multiplicador
      } else if (capacidade.tipo_medicao === 'Por turno') {
        capacidadeTotal += minutosCalendario > 0
          ? nominal * (disponiveis / minutosCalendario) * multiplicador
          : 0
      } else {
        const minutosCiclo = Number(capacidade.duracao_ciclo_minutos || 0)
          + Number(capacidade.tempo_setup_minutos || 0)
        capacidadeTotal += minutosCiclo > 0
          ? Math.floor(disponiveis / minutosCiclo) * nominal * multiplicador
          : 0
      }
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return { capacidade: capacidadeTotal, horas: minutosTotal / 60, unidade, configurado }
}
