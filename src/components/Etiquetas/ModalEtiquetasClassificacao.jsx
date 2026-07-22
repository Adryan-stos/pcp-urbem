import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Printer, X } from 'lucide-react'
import QRCode from 'qrcode'

function numero(valor, casas = 0) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  })
}

export default function ModalEtiquetasClassificacao({ aberto, saidas = [], opLote, onFechar, reimpressao = false }) {
  const [indice, setIndice] = useState(0)
  const [qrCode, setQrCode] = useState('')
  const saida = saidas[indice]
  const pacote = saida?.pacote || {}

  useEffect(() => {
    if (aberto) setIndice(0)
  }, [aberto])

  useEffect(() => {
    if (!aberto || !saida?.pacote_saida_id) return
    QRCode.toDataURL(`URBEM:PACOTE:${saida.pacote_saida_id}`, {
      width: 360,
      margin: 1,
      errorCorrectionLevel: 'M'
    }).then(setQrCode)
  }, [aberto, saida])

  if (!aberto || !saida) return null

  const codigo = pacote.codigo_pacote || pacote.codigo_item || saida.pacote_saida_id
  const pacoteOrigem = (opLote?.op_lote_itens || [])
    .find((item) => item.estoque_item_id === saida.pacote_origem_id)
    ?.pacotes_materia_prima
  const codigoOrigem = pacoteOrigem?.codigo_pacote || pacoteOrigem?.codigo_item || saida.pacote_origem_id

  return createPortal(
    <div className="etiqueta-modal-overlay" role="dialog" aria-modal="true">
      <div className="etiqueta-modal">
        <div className="etiqueta-modal-header no-print">
          <div>
            <strong>Etiquetas da classificação</strong>
            <span>Pacote {indice + 1} de {saidas.length}</span>
          </div>
          <button type="button" className="icon-button" onClick={onFechar}><X size={20} /></button>
        </div>

        <div className="etiqueta-preview">
          <article className="etiqueta-print-area etiqueta-classificacao">
            <header className="etiqueta-cabecalho">
              <div className="etiqueta-marca">
                <img src="/Urbem.200730.Logomarca_RGB-01.png" alt="Urbem" />
              </div>
              <div>
                <strong>MATERIAL CLASSIFICADO</strong>
                <span>SAÍDA DA CLASSIFICADORA</span>
              </div>
            </header>

            {reimpressao && <div className="etiqueta-reimpressao">REIMPRESSÃO</div>}

            <div className="etiqueta-conteudo">
              <div className="etiqueta-dados">
                <div className="etiqueta-campo destaque">
                  <span>CÓDIGO DO PACOTE</span>
                  <strong>{codigo}</strong>
                </div>
                <div className="etiqueta-linha">
                  <div className="etiqueta-campo">
                    <span>PRODUTO / CLASSE</span>
                    <strong>{pacote.especie || '-'} • {saida.classe}</strong>
                  </div>
                  <div className="etiqueta-campo">
                    <span>QUANTIDADE</span>
                    <strong>{numero(saida.quantidade)} un.</strong>
                  </div>
                </div>
                <div className="etiqueta-campo">
                  <span>BITOLA</span>
                  <strong>{saida.espessura_mm} × {saida.largura_mm} × {saida.comprimento_mm} mm</strong>
                </div>
                <div className="etiqueta-linha etiqueta-secundaria">
                  <div className="etiqueta-campo">
                    <span>VOLUME</span>
                    <strong>{numero(saida.volume_m3, 4)} m³</strong>
                  </div>
                  <div className="etiqueta-campo">
                    <span>OP DE LOTE</span>
                    <strong>{opLote?.numero_op_lote || '-'}</strong>
                  </div>
                </div>
                <div className="etiqueta-linha etiqueta-secundaria">
                  <div className="etiqueta-campo">
                    <span>PACOTE DE ORIGEM</span>
                    <strong>{codigoOrigem}</strong>
                  </div>
                  <div className="etiqueta-campo">
                    <span>DESTINO</span>
                    <strong>{pacote.buffer_atual || 'BUFFER PRE OTIMIZAÇÃO'}</strong>
                  </div>
                </div>
              </div>

              <div className="etiqueta-qr">
                {qrCode && <img src={qrCode} alt={`QR Code do pacote ${codigo}`} />}
                <strong>{codigo}</strong>
                <span>{saida.classe}</span>
              </div>
            </div>

            <footer>
              <span><strong>RASTREABILIDADE:</strong> CLASSIFICAÇÃO → OTIMIZADORA/FINGER</span>
            </footer>
          </article>
        </div>

        <div className="etiqueta-modal-actions no-print">
          <button type="button" className="btn ghost" disabled={indice === 0} onClick={() => setIndice((atual) => atual - 1)}>
            <ChevronLeft size={17} /> Anterior
          </button>
          <button type="button" className="btn primary" onClick={() => window.print()}>
            <Printer size={17} /> Imprimir esta etiqueta
          </button>
          <button type="button" className="btn ghost" disabled={indice === saidas.length - 1} onClick={() => setIndice((atual) => atual + 1)}>
            Próxima <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
