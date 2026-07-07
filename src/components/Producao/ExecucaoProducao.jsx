import { useEffect, useState } from 'react'
import BuscaTalao from './BuscaTalao.jsx'
import { buscarTalaoExecucao, iniciarExecucaoProducao } from '../../services/execucaoService.js'
import PainelExecucao from './PainelExecucao.jsx'
import ValidacaoInicial from './ValidacaoInicial.jsx'


export default function ExecucaoProducao({ talaoInicial = '' }) {
  const [busca, setBusca] = useState('')
  const [talao, setTalao] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [podeExecutar, setPodeExecutar] = useState(false)
  const [mensagemExecucao, setMensagemExecucao] = useState('')
  const [processosPendentes, setProcessosPendentes] = useState([])
  const [dadosInicio, setDadosInicio] = useState({ loteEntrada: '',espessuraInicio: '', larguraInicio: '', comprimentoInicio: '', observacao: '' })
  const [somenteConsulta, setSomenteConsulta] = useState(false)

  function limparBusca() {
    setTalao(null)
    setBusca('')
    setErro('')
    setPodeExecutar(false)
    setMensagemExecucao('')
    setProcessosPendentes([])
    setSomenteConsulta(false)
    setDadosInicio({ loteEntrada: '',espessuraInicio: '', larguraInicio: '', comprimentoInicio: '', observacao: '' })
  }
  
useEffect(() => {
  if (!talaoInicial) return

  setBusca(talaoInicial)

  async function carregarTalaoInicial() {
    try {
      setCarregando(true)
      setErro('')
      setTalao(null)
      setPodeExecutar(false)
      setMensagemExecucao('')
      setProcessosPendentes([])
      setSomenteConsulta(false)

      const dados = await buscarTalaoExecucao(talaoInicial)

      setTalao(dados.talao)
      setPodeExecutar(dados.podeExecutar)
      setMensagemExecucao(dados.mensagem)
      setProcessosPendentes(dados.processosPendentes)
      setSomenteConsulta(dados.somenteConsulta ?? false)
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  carregarTalaoInicial()
}, [talaoInicial])

async function buscarTalao() {
    try {
      setCarregando(true)
      setErro('')
      setTalao(null)
      setPodeExecutar(false)
      setMensagemExecucao('')
      setProcessosPendentes([])
      setSomenteConsulta(false)

      const dados = await buscarTalaoExecucao(busca)

      setTalao(dados.talao)
      setPodeExecutar(dados.podeExecutar)
      setMensagemExecucao(dados.mensagem)
      setProcessosPendentes(dados.processosPendentes)
      setSomenteConsulta(dados.somenteConsulta ?? false)
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  async function iniciarProducao() {
    try {
      if (!talao?.id) return

      if (
        !dadosInicio.espessuraInicio ||
        !dadosInicio.larguraInicio ||
        !dadosInicio.comprimentoInicio
      ) {
        setErro('Informe espessura, largura e comprimento antes de iniciar.')
        return
      }

      const processoAtualizado = await iniciarExecucaoProducao(talao.id, {
        espessuraInicio: Number(dadosInicio.espessuraInicio),
        larguraInicio: Number(dadosInicio.larguraInicio),
        comprimentoInicio: Number(dadosInicio.comprimentoInicio),
        observacao: dadosInicio.observacao
      })

      setTalao((atual) => ({
        ...atual,
        ...processoAtualizado
      }))

      setErro('')
    } catch (error) {
      setErro(error.message)
    }
  }

  return (
    <div className="execucao-producao">
      {!talao && (
        <BuscaTalao
          valor={busca}
          setValor={setBusca}
          onBuscar={buscarTalao}
        />
      )}

      {erro && <div className="alert">{erro}</div>}

      {carregando && <div className="empty-card">Buscando talão...</div>}

      {talao && ['Em produção', 'Em pausa'].includes(talao.status) && (
        <PainelExecucao talao={talao} somenteConsulta={somenteConsulta} onNovaBusca={limparBusca} />
      )}

      {talao && !['Em produção', 'Em pausa'].includes(talao.status) && (
        <ValidacaoInicial
          talao={talao}
          podeExecutar={podeExecutar}
          mensagemExecucao={mensagemExecucao}
          processosPendentes={processosPendentes}
          dadosInicio={dadosInicio}
          setDadosInicio={setDadosInicio}
          onIniciar={iniciarProducao}
          onNovaBusca={limparBusca}
        />
      )}
    </div>
  )
}