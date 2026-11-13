# EnterpriseFlow

Aplicação web para gestão empresarial, projetos, tarefas e produtividade das equipes.

O EnterpriseFlow permite organizar uma empresa por organizações (tenants), controlar membros e permissões, cadastrar projetos e clientes, acompanhar tarefas em lista ou Kanban e analisar indicadores de produtividade.

## Funcionalidades

- Autenticação por e-mail/senha e Google.
- Criação e seleção de organizações.
- Controle de membros por organização.
- Papéis e permissões para visualizar, criar, editar e excluir dados.
- Cadastro e gerenciamento de projetos.
- Associação de projetos a clientes.
- Cadastro de clientes com validação de CPF/CNPJ e consulta de CEP.
- Cadastro de tarefas vinculadas a projetos.
- Visualização de tarefas em lista ou Kanban.
- Alteração de status por edição ou movimentação no Kanban.
- Histórico de atividades e comentários das tarefas.
- Indicadores de tarefas por status, prioridade, responsável e projeto.
- Filtro de produtividade por projeto e período de vencimento.
- Tema claro e escuro.
- Layout responsivo para diferentes tamanhos de tela.

## Tecnologias utilizadas

- Angular 21 com componentes standalone.
- TypeScript.
- Signals e Reactive Forms.
- Angular Router.
- AngularFire e Firebase SDK.
- Firebase Authentication.
- Cloud Firestore.
- Firebase Cloud Functions 2nd gen.
- Firebase Hosting.
- Chart.js para gráficos.
- PrimeNG e PrimeIcons.
- Bootstrap.
- SCSS.
- RxJS.

## Arquitetura

A aplicação utiliza uma organização por funcionalidades:

```text
src/app/
├── core/
│   ├── auth/              # Autenticação, guards e autorização
│   ├── tenant/            # Organizações, membros e contexto ativo
│   ├── layout/            # Shell, header e sidebar
│   └── theme/             # Gerenciamento de tema
├── features/
│   ├── auth/              # Login, cadastro e recuperação de senha
│   ├── dashboard/         # Visão geral da organização
│   ├── projects/          # Projetos e indicadores
│   ├── clients/           # Clientes
│   ├── tasks/             # Tarefas, Kanban e atividades
│   ├── productivity/      # Indicadores e gráficos de produtividade
│   └── members/           # Membros e permissões
└── shared/                # Recursos reutilizáveis
```

As regras do Firestore isolam os dados pelo `tenantId` e verificam o papel e as permissões do membro antes de permitir cada operação.

## Pré-requisitos

- Node.js compatível com Angular 21.
- npm.
- Firebase CLI.
- Acesso ao projeto Firebase configurado no `.firebaserc`.

## Instalação

```bash
npm install
cd functions
npm install
cd ..
```

As configurações do Firebase devem ser fornecidas por arquivos de ambiente locais. Não publique chaves privadas, tokens ou arquivos secretos no repositório.

## Executar localmente

```bash
npm start
```

A aplicação ficará disponível em `http://localhost:4200`.

## Build

```bash
npm run build
```

Os arquivos de produção são gerados em `dist/enterprise-flow`.

## Firebase

O projeto Firebase configurado atualmente é `enterprise-flow-22665`.

Para autenticar a Firebase CLI:

```bash
firebase login
firebase use enterprise-flow-22665
```

### Publicar somente o frontend

```bash
npm run build
firebase deploy --only hosting
```

### Publicar regras e índices do Firestore

```bash
firebase deploy --only firestore
```

### Publicar Cloud Functions

```bash
firebase deploy --only functions
```

### Publicar a aplicação completa

```bash
npm run build
firebase deploy
```

O Hosting utiliza rewrite para `index.html`, permitindo o funcionamento das rotas internas do Angular após o acesso direto a URLs como `/app/tasks` e `/app/productivity`.

## Cloud Functions

As funções ficam em `functions/src` e são compiladas separadamente. A função `trackTaskActivity` registra automaticamente atividades de criação e alteração de status das tarefas.

Antes do deploy das Functions, o Firebase executa o lint e o build definidos no `firebase.json`.

## Testes

```bash
npm test
```

## Emuladores Firebase

Os emuladores configurados no projeto incluem:

- Authentication: `9099`
- Functions: `5001`
- Firestore: `8080`
- Emulator UI: `4000`

Para iniciar os emuladores:

```bash
firebase emulators:start
```

## Deploy atual

A aplicação está publicada em:

[https://enterprise-flow-22665.web.app](https://enterprise-flow-22665.web.app)

## Documentação adicional

- [Fluxo de membros e autenticação](docs/FLUXO-MEMBROS-E-AUTENTICACAO.md)
