import { useState } from 'react'
import {
  Barcode,
  Boxes,
  ChevronRight,
  Package,
  QrCode,
  Ruler,
  Tag,
} from 'lucide-react'

export default function ArvoreProducao({ master }) {
  const [filhoSelecionado, setFilhoSelecionado] = useState(null)

  const filhos = master?.itens_filhos || []

  return (
    <div className="master-360-content arvore-producao-layout">
      <section className="arvore-main">
        <div className="arvore-header">
          <div>
            <span>Árvore de Produção</span>
            <h4>{master?.codigo_interno_item || 'Master'}</h4>
            <p>
              Visualize os filhos originados desta Master e acompanhe a
              rastreabilidade de cada peça.
            </p>
          </div>

          <strong>{filhos.length} filhos</strong>
        </div>

        <div className="arvore-master-node">
          <Package size={18} />
          <div>
            <strong>{master?.codigo_interno_item || '-'}</strong>
            <span>
              {master?.base_mm || '-'} x {master?.altura_mm || '-'} x{' '}
              {master?.comprimento_mm || '-'}
            </span>
          </div>
        </div>

        <div className="arvore-filhos-grid">
          {filhos.map((filho) => (
            <button
              type="button"
              key={filho.id}
              className={`arvore-filho-card ${
                filhoSelecionado?.id === filho.id ? 'active' : ''
              }`}
              onClick={() => setFilhoSelecionado(filho)}
            >
              <div className="arvore-filho-top">
                <div className="arvore-filho-icon">
                  <Boxes size={18} />
                </div>

                <ChevronRight size={16} />
              </div>

              <strong>{filho.codigo_interno_item}</strong>

              <span>
                {filho.base_mm || '-'} x {filho.altura_mm || '-'} x{' '}
                {filho.comprimento_mm || '-'}
              </span>

              <div className="arvore-filho-meta">
                <small>{filho.tipo_material || '-'}</small>
                <small>{Number(filho.volume_m3 || 0).toFixed(2)} m³</small>
              </div>

              <div className="arvore-rastreio">
                <span>🏷 SKU</span>
                <span>🔳 QR</span>
                <span>▌▌ Código</span>
              </div>
            </button>
          ))}

          {!filhos.length && (
            <div className="empty">
              Nenhum filho vinculado a esta Master.
            </div>
          )}
        </div>
      </section>

      <aside className={`filho-drawer ${filhoSelecionado ? 'open' : ''}`}>
        {filhoSelecionado ? (
          <>
            <div className="filho-drawer-header">
              <div>
                <span>Filho selecionado</span>
                <h4>{filhoSelecionado.codigo_interno_item}</h4>
              </div>

              <button
                type="button"
                className="table-icon-action"
                onClick={() => setFilhoSelecionado(null)}
              >
                ×
              </button>
            </div>

            <div className="filho-drawer-list">
              <div>
                <Tag size={15} />
                <span>SKU</span>
                <strong>{filhoSelecionado.codigo_interno_item || '-'}</strong>
              </div>

              <div>
                <QrCode size={15} />
                <span>QR Code</span>
                <strong>Disponível</strong>
              </div>

              <div>
                <Barcode size={15} />
                <span>Código de barras</span>
                <strong>Disponível</strong>
              </div>

              <div>
                <Ruler size={15} />
                <span>Dimensão</span>
                <strong>
                  {filhoSelecionado.base_mm || '-'} x{' '}
                  {filhoSelecionado.altura_mm || '-'} x{' '}
                  {filhoSelecionado.comprimento_mm || '-'}
                </strong>
              </div>

              <div>
                <Package size={15} />
                <span>Volume</span>
                <strong>
                  {Number(filhoSelecionado.volume_m3 || 0).toFixed(2)} m³
                </strong>
              </div>
            </div>
          </>
        ) : (
          <div className="filho-drawer-empty">
            Selecione um filho para visualizar sua rastreabilidade.
          </div>
        )}
      </aside>
    </div>
  )
}