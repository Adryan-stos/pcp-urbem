import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import QRCode from 'qrcode'

function numero(valor, casas = 0) {
  if (valor === null || valor === undefined || valor === '') return '-'
  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  })
}

function dataHora(valor) {
  if (!valor) return '-'
  return new Date(valor).toLocaleString('pt-BR')
}

export default function ModalEtiquetaOperacao({ aberto, operacao, onFechar }) {
  const [qrCode, setQrCode] = useState('')

  const ehLote = operacao?._tipo_operacao === 'lote'
  const codigo = ehLote ? operacao?.numero_op_lote : operacao?.numero_talao
  const numeroOP = ehLote ? operacao?.numero_op_lote : operacao?.ordens_producao?.numero_op
  const item = operacao?.ordens_producao?.itens_projeto
  const quantidade = ehLote
    ? (operacao?.op_lote_itens || []).reduce((total, atual) => total + Number(atual.quantidade_reservada || 0), 0)
    : operacao?.quantidade_saida_prevista || operacao?.quantidade_entrada_prevista

  useEffect(() => {
    if (!aberto || !codigo) return
    QRCode.toDataURL(`URBEM:OPERACAO:${codigo}`, {
      width: 360,
      margin: 1,
      errorCorrectionLevel: 'M'
    }).then(setQrCode)
  }, [aberto, codigo])

  if (!aberto || !operacao) return null

  return createPortal(
    <div className="etiqueta-modal-overlay" role="dialog" aria-modal="true" aria-label="Reimpressão da etiqueta da operação">
      <div className="etiqueta-modal">
        <div className="etiqueta-modal-header no-print">
          <div>
            <strong>Etiqueta da operação</strong>
            <span>{operacao.processo} • {codigo}</span>
          </div>
          <button type="button" className="icon-button" onClick={onFechar}><X size={20} /></button>
        </div>

        <div className="etiqueta-preview">
          <article className="etiqueta-print-area etiqueta-operacao">
            <header className="etiqueta-cabecalho">
              <div className="etiqueta-marca">
                <img src="/Urbem.200730.Logomarca_RGB-01.png" alt="Urbem" />
              </div>
              <div>
                <strong>ORDEM DE PRODUÇÃO</strong>
                <span>{operacao.processo}</span>
              </div>
            </header>

            <div className="etiqueta-reimpressao">REIMPRESSÃO</div>

            <div className="etiqueta-conteudo">
              <div className="etiqueta-dados">
                <div className="etiqueta-campo destaque">
                  <span>{ehLote ? 'OP DE LOTE' : 'NÚMERO DO TALÃO'}</span>
                  <strong>{codigo || '-'}</strong>
                </div>
                <div className="etiqueta-linha">
                  <div className="etiqueta-campo">
                    <span>OP</span>
                    <strong>{numeroOP || '-'}</strong>
                  </div>
                  <div className="etiqueta-campo">
                    <span>QUANTIDADE</span>
                    <strong>{numero(quantidade)} un.</strong>
                  </div>
                </div>
                <div className="etiqueta-campo">
                  <span>ITEM / MATERIAL</span>
                  <strong>{item?.codigo_interno_item || operacao.produto_saida || operacao.buffer_saida || '-'}</strong>
                </div>
                <div className="etiqueta-linha etiqueta-secundaria">
                  <div className="etiqueta-campo">
                    <span>RECURSO</span>
                    <strong>{operacao.recurso || operacao.processo || '-'}</strong>
                  </div>
                  <div className="etiqueta-campo">
                    <span>STATUS</span>
                    <strong>{operacao.status || '-'}</strong>
                  </div>
                </div>
                <div className="etiqueta-linha etiqueta-secundaria">
                  <div className="etiqueta-campo">
                    <span>CONCLUÍDA EM</span>
                    <strong>{dataHora(operacao.fim_producao || operacao.finalizado_em)}</strong>
                  </div>
                  <div className="etiqueta-campo">
                    <span>REIMPRESSA EM</span>
                    <strong>{dataHora(new Date())}</strong>
                  </div>
                </div>
              </div>

              <div className="etiqueta-qr">
                {qrCode && <img src={qrCode} alt={`QR Code da operação ${codigo}`} />}
                <strong>{codigo}</strong>
                <span>{operacao.processo}</span>
              </div>
            </div>

            <footer>
              <span><strong>SEGUNDA VIA:</strong> documento reimpresso após a conclusão</span>
            </footer>
          </article>
        </div>

        <div className="etiqueta-modal-actions no-print">
          <button type="button" className="btn primary" onClick={() => window.print()}>
            <Printer size={17} /> Imprimir etiqueta
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
