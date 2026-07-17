import { ArrowUp, ArrowDown, GripVertical } from 'lucide-react'
import { obterSituacaoOperacao } from '../../utils/situacaoOperacao.js'

export default function LinhaOPLote({
  opLote,
  linhaArrastada,
  linhaSobre,
  setLinhaArrastada,
  setLinhaSobre,
  reorganizarFilaOPLote,
  moverPrioridadeOPLote,
  recursosSetor,
  alterarRecursoOPLote,
  alterarDataInicioOPLote
}) {
  const itens = opLote.op_lote_itens || []

  const quantidadeTotal = itens.reduce(
    (total, item) => total + Number(item.quantidade_prevista || 0),
    0
  )

  const volumeTotal = itens.reduce(
    (total, item) => total + Number(item.volume_previsto_m3 || 0),
    0
  )

  const primeiroItem = itens[0]?.pacotes_materia_prima
  const situacao = obterSituacaoOperacao(opLote)

  return (
    <tr
      key={opLote.id}
      className={linhaSobre === opLote.id ? 'drag-over' : ''}
    >
      <td
        className="drag-handle-cell"
        draggable
        onDragStart={(e) => {
          setLinhaArrastada(opLote)
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setLinhaSobre(opLote.id)
        }}
        onDrop={async (e) => {
          e.preventDefault()

          if (!linhaArrastada) return

          await reorganizarFilaOPLote(
            linhaArrastada,
            Number(opLote.prioridade)
          )

          setLinhaArrastada(null)
          setLinhaSobre(null)
        }}
        onDragEnd={() => {
          setLinhaArrastada(null)
          setLinhaSobre(null)
        }}
      >
        <GripVertical size={18} />
      </td>

      <td className="priority-cell">
        {opLote.prioridade == null
          ? '-'
          : `#${Number(opLote.prioridade) + 1}`}
      </td>

      <td>
        <strong>{opLote.numero_op_lote}</strong>
        <br />
        <small>{opLote.processo}</small>
      </td>

      <td>
        <strong>
          {primeiroItem
            ? `${primeiroItem.especie || '-'} ${primeiroItem.classe || ''}`
            : '-'}
        </strong>
        <br />
        <small>
          {primeiroItem
            ? `${primeiroItem.espessura_mm || '-'} x ${primeiroItem.largura_mm || '-'} x ${primeiroItem.comprimento_mm || '-'}`
            : 'Sem item vinculado'}
        </small>
      </td>

      <td>
        <strong>{quantidadeTotal.toFixed(0)}</strong>
        <br />
        <small>peças reservadas</small>
      </td>

      <td>
        <strong>{volumeTotal.toFixed(4)}</strong>
        <br />
        <small>m³ reservado</small>
      </td>

      <td>
        <strong>{opLote.buffer_entrada || '-'}</strong>
        <br />
        <small>Entrada</small>
      </td>

      <td>
        <strong>{opLote.buffer_saida || '-'}</strong>
        <br />
        <small>Saída</small>
      </td>

      <td>
        <select
          value={opLote.recurso_id || ''}
          onChange={(e) => alterarRecursoOPLote(opLote.id, e.target.value)}
          aria-label={`Máquina da ${opLote.numero_op_lote}`}
        >
          <option value="">Selecionar máquina</option>
          {recursosSetor.map((recurso) => (
            <option key={recurso.id} value={recurso.id}>
              {recurso.nome}
            </option>
          ))}
        </select>
      </td>

      <td>
        <div className="machine-date-editor">
          <input
            type="datetime-local"
            value={opLote.data_prevista_inicio ? opLote.data_prevista_inicio.slice(0, 16) : ''}
            onChange={(e) => alterarDataInicioOPLote(opLote.id, e.target.value)}
          />
          <span className={`machine-gantt-status ${situacao.classe}`}>{situacao.rotulo}</span>
        </div>
      </td>

      <td>
        <span className="op-status liberado">
          {opLote.status || 'Programado'}
        </span>
      </td>

      <td>
        <div className="table-actions">
          <button
            type="button"
            className="table-icon-action"
            onClick={() => moverPrioridadeOPLote(opLote, -1)}
            title="Subir na fila"
          >
            <ArrowUp size={15} />
          </button>

          <button
            type="button"
            className="table-icon-action"
            onClick={() => moverPrioridadeOPLote(opLote, 1)}
            title="Descer na fila"
          >
            <ArrowDown size={15} />
          </button>
        </div>
      </td>
    </tr>
  )
}
