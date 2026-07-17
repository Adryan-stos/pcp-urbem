export function datetimeLocalParaIso(valor) {
  if (!valor) return null

  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) {
    throw new Error('Data e hora inválidas.')
  }

  return data.toISOString()
}

export function isoParaDatetimeLocal(valor) {
  if (!valor) return ''

  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return ''

  const deslocamento = data.getTimezoneOffset() * 60000
  return new Date(data.getTime() - deslocamento).toISOString().slice(0, 16)
}

export function agoraDatetimeLocal() {
  return isoParaDatetimeLocal(new Date().toISOString())
}
