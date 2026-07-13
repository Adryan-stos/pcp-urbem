import { ArrowUp, ArrowDown } from 'lucide-react'

const statusPCP = [
  'Aguardando programação',
  'Aguardando matéria-prima',
  'Aguardando manutenção',
  'Aguardando qualidade',
  'Em produção',
  'Em pausa',
  'Concluído'
]

export default function LinhaProcesso({
  processo,
  semPrioridade = false,
  linhaArrastada,
  linhaSobre,
  iniciarArrasteLinha,
  passarSobreLinha,
  soltarLinha,
  finalizarArraste,
  alterarDataInicio,
  alterarStatusPCP,
  moverPrioridade,
  recursosSetor,
  alterarRecursoProcesso
}) {
  const op = processo.ordens_producao
  const item = op?.itens_projeto
  const projeto = item?.projetos
  const carregamento = item?.carregamentos_projeto

  return (
    <tr
      key={processo.id}
      className={`
        machine-draggable-row
        ${linhaArrastada?.id === processo.id ? 'dragging' : ''}
        ${linhaSobre === processo.id ? 'drag-over' : ''}
      `}
      draggable
      onDragStart={(e) => iniciarArrasteLinha(e, processo)}
      onDragOver={(e) => passarSobreLinha(e, processo)}
      onDragLeave={finalizarArraste}
      onDrop={(e) => soltarLinha(e, processo)}
      onDragEnd={finalizarArraste}
    >
      <td className="priority-cell">
        {semPrioridade ? '-' : `#${Number(processo.prioridade ?? 0) + 1}`}
      </td>

      <td>
        <strong>{op?.numero_op || '-'}</strong>
      </td>

      <td>
        <strong>{projeto?.codigo_interno || '-'}</strong>
        <br />
        <small>{projeto?.nome_projeto || '-'}</small>
      </td>

      <td>{carregamento?.data_prevista || '-'}</td>

      <td>
        <select
          value={processo.recurso_id || ''}
          onChange={(e) => alterarRecursoProcesso(processo.id, e.target.value)}
          aria-label={`Máquina da ${op?.numero_op || 'OP'}`}
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
        <input
          type="datetime-local"
          value={
            processo.data_prevista_inicio
              ? processo.data_prevista_inicio.slice(0, 16)
              : ''
          }
          onChange={(e) => alterarDataInicio(processo.id, e.target.value)}
        />
      </td>

      <td>
        {processo.data_prevista_fim
          ? processo.data_prevista_fim.slice(0, 16).replace('T', ' ')
          : '-'}
      </td>

      <td>
        <select
          value={processo.status_pcp || 'Aguardando programação'}
          onChange={(e) => alterarStatusPCP(processo.id, e.target.value)}
        >
          {statusPCP.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </td>

      <td>
        <strong>{item?.codigo_interno_item || '-'}</strong>
        <br />
        <small>
          {item?.tipo_material || '-'} • {item?.base_mm || '-'} x{' '}
          {item?.altura_mm || '-'} x {item?.comprimento_mm || '-'}
        </small>
      </td>

      <td>{Number(op?.volume_m3 || 0).toFixed(2)}</td>

      <td>
        <div className="table-actions">
          <button
            type="button"
            className="table-icon-action"
            onClick={() => moverPrioridade(processo, -1)}
          >
            <ArrowUp size={15} />
          </button>

          <button
            type="button"
            className="table-icon-action"
            onClick={() => moverPrioridade(processo, 1)}
          >
            <ArrowDown size={15} />
          </button>
        </div>
      </td>
    </tr>
  )
}
