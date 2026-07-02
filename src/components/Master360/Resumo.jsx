export default function Resumo({ master, op }) {

    const filhos = master?.itens_filhos || []

    const volumeFilhos = filhos.reduce(
        (total, filho) => total + (Number(filho.volume_m3) || 0),
        0
    )

    const volumeMaster = Number(master?.volume_m3 || 0)

    const aproveitamento =
        volumeMaster > 0
            ? ((volumeFilhos / volumeMaster) * 100).toFixed(1)
            : '0.0'

    return (

        <div className="master-360-content">

            <div className="master-summary-grid">

                <div>
                    <span>Projeto</span>
                    <strong>{master?.projetos?.codigo_interno || '-'}</strong>
                </div>

                <div>
                    <span>Cliente</span>
                    <strong>{master?.projetos?.cliente || '-'}</strong>
                </div>

                <div>
                    <span>Carregamento</span>
                    <strong>{master?.carregamentos_projeto?.nome || '-'}</strong>
                </div>

                <div>
                    <span>OP Base</span>
                    <strong>{op?.numero_op || '-'}</strong>
                </div>

                <div>
                    <span>Volume Master</span>
                    <strong>{volumeMaster.toFixed(2)} m³</strong>
                </div>

                <div>
                    <span>Volume Filhos</span>
                    <strong>{volumeFilhos.toFixed(2)} m³</strong>
                </div>

                <div>
                    <span>Aproveitamento</span>
                    <strong>{aproveitamento}%</strong>
                </div>

                <div>
                    <span>Filhos Vinculados</span>
                    <strong>{filhos.length}</strong>
                </div>

            </div>

        </div>

    )

}