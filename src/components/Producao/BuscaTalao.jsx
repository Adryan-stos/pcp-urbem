import { Search, ScanLine } from 'lucide-react'

export default function BuscaTalao({ valor, setValor, onBuscar }) {
  return (
    <section className="execucao-busca-card">
      <div className="execucao-scan-icon">
        <ScanLine size={46} />
      </div>

      <h3>Leia o QR Code ou Código de Barras</h3>
      <p>Também é possível digitar o número do talão manualmente.</p>

      <div className="execucao-busca-form">
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Digite ou bipar talão"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onBuscar()
          }}
        />

        <button type="button" className="btn primary" onClick={onBuscar}>
          <Search size={16} />
          Buscar
        </button>
      </div>
    </section>
  )
}