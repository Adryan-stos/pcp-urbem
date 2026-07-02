import { useEffect, useState } from 'react'
import { carregarCarteira } from '../services/carteiraService.js'
import { criarOP, carregarProcessosOP } from '../services/opService.js'

export function useCarteira() {
  const [itens, setItens] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const [opSelecionada, setOpSelecionada] = useState(null)
  const [processosOP, setProcessosOP] = useState([])
  const [modalOPAberta, setModalOPAberta] = useState(false)
  const [masterSelecionada, setMasterSelecionada] = useState(null)
  const [abaMaster, setAbaMaster] = useState('resumo')

  async function atualizarCarteira() {
    try {
      setCarregando(true)
      setErro('')

      const dados = await carregarCarteira()
      setItens(dados)
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  async function handleCriarOP(master) {
    try {
      await criarOP(master)
      await atualizarCarteira()
    } catch (error) {
      alert(error.message)
    }
  }

  async function visualizarOP(op, master = null) {
    try {
      const processos = await carregarProcessosOP(op.id)

      setOpSelecionada(op)
      setMasterSelecionada(master)
      setProcessosOP(processos)
      setAbaMaster('resumo')
      setModalOPAberta(true)
    } catch (error) {
      alert(error.message)
    }
  }

  useEffect(() => {
    atualizarCarteira()
  }, [])

  return {
    itens,
    carregando,
    erro,

    opSelecionada,
    processosOP,
    modalOPAberta,
    masterSelecionada,
    abaMaster,

    setAbaMaster,
    setModalOPAberta,

    atualizarCarteira,
    handleCriarOP,
    visualizarOP
  }
}