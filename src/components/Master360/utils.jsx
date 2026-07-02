export function classeProcessoStatus(status) {
            switch (status) {
                case 'Finalizado':
                case 'Concluído':
                return 'finalizado'

                case 'Liberado para programação':
                return 'liberado'

                case 'Programado':
                return 'programado'

                case 'Em produção':
                return 'producao'

                case 'Atrasado':
                return 'atrasado'

                case 'Bloqueado':
                return 'bloqueado'

                default:
                return 'pendente'
            }
        }