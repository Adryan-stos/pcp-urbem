import { useEffect, useState } from 'react'
import { Printer, X } from 'lucide-react'
import QRCode from 'qrcode'

function formatarNumero(valor, casas = 0) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  })
}

export default function ModalEtiquetaRecebimento({ aberto, pacote, recebimento, onFechar }) {
  const [qrCode, setQrCode] = useState('')

  useEffect(() => {
    if (!aberto || !pacote?.id) return

    QRCode.toDataURL(`URBEM:PACOTE:${pacote.id}`, {
      width: 360,
      margin: 1,
      errorCorrectionLevel: 'M'
    }).then(setQrCode)
  }, [aberto, pacote])

  if (!aberto || !pacote) return null

  const codigo = pacote.codigo_pacote || pacote.codigo_item || pacote.id
  const bitola = [pacote.espessura_mm, pacote.largura_mm, pacote.comprimento_mm]
    .filter((valor) => valor !== null && valor !== undefined && valor !== '')
    .join(' × ')

  return (
    <div className="etiqueta-modal-overlay" role="dialog" aria-modal="true" aria-label="Etiqueta de recebimento">
      <div className="etiqueta-modal">
        <div className="etiqueta-modal-header no-print">
          <div>
            <strong>Etiqueta de recebimento</strong>
            <span>Confira os dados antes de imprimir.</span>
          </div>
          <button type="button" className="icon-button" onClick={onFechar} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="etiqueta-preview">
          <article className="etiqueta-print-area etiqueta-recebimento">
            <header className="etiqueta-cabecalho">
              <div className="etiqueta-marca">
                <img src="/Urbem.200730.Logomarca_RGB-01.png" alt="Urbem" />
              </div>
              <div>
                <strong>MATÉRIA-PRIMA</strong>
                <span>RECEBIMENTO</span>
              </div>
            </header>

            <div className="etiqueta-conteudo">
              <div className="etiqueta-dados">
                <div className="etiqueta-campo destaque">
                  <span>CÓDIGO DO PACOTE</span>
                  <strong>{codigo}</strong>
                </div>

                <div className="etiqueta-linha">
                  <div className="etiqueta-campo">
                    <span>QUANTIDADE</span>
                    <strong>{formatarNumero(pacote.quantidade_inicial || pacote.quantidade_saldo)} un.</strong>
                  </div>
                  <div className="etiqueta-campo">
                    <span>VOLUME</span>
                    <strong>{formatarNumero(pacote.volume_inicial_m3 || pacote.volume_saldo_m3, 3)} m³</strong>
                  </div>
                </div>

                <div className="etiqueta-campo">
                  <span>BITOLA</span>
                  <strong>{bitola || 'Não informada'} mm</strong>
                </div>

                <div className="etiqueta-linha etiqueta-secundaria">
                  <div className="etiqueta-campo">
                    <span>ESPÉCIE / CLASSE</span>
                    <strong>{[pacote.especie, pacote.classe].filter(Boolean).join(' • ') || '-'}</strong>
                  </div>
                  <div className="etiqueta-campo">
                    <span>NF</span>
                    <strong>{recebimento?.numero_nf || '-'}</strong>
                  </div>
                </div>

                <div className="etiqueta-linha etiqueta-secundaria">
                  <div className="etiqueta-campo">
                    <span>FORNECEDOR</span>
                    <strong>{recebimento?.fornecedor || '-'}</strong>
                  </div>
                  <div className="etiqueta-campo">
                    <span>DATA</span>
                    <strong>{recebimento?.data_recebimento || '-'}</strong>
                  </div>
                </div>
              </div>

              <div className="etiqueta-qr">
                {qrCode && <img src={qrCode} alt={`QR Code do pacote ${codigo}`} />}
                <strong>{codigo}</strong>
                <span>{pacote.buffer_atual || 'BUFFER AUTOCLAVE'}</span>
              </div>
            </div>

            <footer>
              <strong>RASTREABILIDADE</strong>
              <span>RECEBIMENTO → CLASSIFICAÇÃO</span>
            </footer>
          </article>
        </div>

        <div className="etiqueta-modal-actions no-print">
          <button type="button" className="btn ghost" onClick={onFechar}>Cancelar</button>
          <button type="button" className="btn primary" onClick={() => window.print()}>
            <Printer size={17} />
            Imprimir etiqueta
          </button>
        </div>
      </div>
    </div>
  )
}
