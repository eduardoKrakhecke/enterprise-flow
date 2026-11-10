
import {
  Component
} from '@angular/core';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss'
})
export class DashboardPageComponent {

  readonly indicators = [
    {
      title: 'Clientes cadastrados',
      value: '1.284',
      variation: '+12,5%',
      icon: 'pi-users'
    },
    {
      title: 'Projetos ativos',
      value: '38',
      variation: '+8,2%',
      icon: 'pi-briefcase'
    },
    {
      title: 'Receita mensal',
      value: 'R$ 48.250',
      variation: '+15,8%',
      icon: 'pi-wallet'
    },
    {
      title: 'Tarefas pendentes',
      value: '24',
      variation: '-4,3%',
      icon: 'pi-list-check'
    }
  ];

  readonly activities = [
    {
      title: 'Novo cliente cadastrado',
      description: 'Cliente Empresa Alpha',
      time: 'Há 15 minutos'
    },
    {
      title: 'Projeto atualizado',
      description: 'Implantação ERP',
      time: 'Há 1 hora'
    },
    {
      title: 'Novo usuário adicionado',
      description: 'Departamento financeiro',
      time: 'Há 3 horas'
    },
    {
      title: 'Relatório gerado',
      description: 'Relatório financeiro mensal',
      time: 'Há 5 horas'
    }
  ];
}
