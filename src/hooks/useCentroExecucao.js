import { useEffect, useState } from 'react'
import { listarTaloesExecucao } from '../services/producaoService.js'

export function useCentroExecucao() {
  const [taloes, setTaloes] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function carregarTaloes() {
    try {
      setCarregando(true)
      setErro('')

      const dados = await listarTaloesExecucao()
      setTaloes(dados)
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarTaloes()
  }, [])

  return {
    taloes,
    carregando,
    erro,
    carregarTaloes
  }
}