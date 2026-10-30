# FutFly

FutFly é uma plataforma web para acompanhar jogos de futebol em tempo real, com placares, eventos do jogo e uma interface focada em atualizações rápidas e leitura simples.

O projeto nasceu como um experimento para testar ideias de UX e integração com dados esportivos em uma aplicação moderna. A ideia principal é deixar a experiência de acompanhar futebol mais direta, visual e acessível, sem cadastro e sem cobrança.

Hoje, o FutFly também funciona como base open source para quem quiser criar um projeto similar ou estudar uma implementação real de painel esportivo com Next.js.

## O que ele faz

- Mostra partidas ao vivo, próximas e finalizadas
- Exibe placar, competição, horário e status da partida
- Atualiza os dados em tempo real com eventos do jogo
- Lista gols, cartões e substituições
- Permite filtrar por categoria e procurar por time ou competição
- Tem interface responsiva para desktop e mobile
- Pode enviar notificações do navegador para atualizações importantes

## Demonstração

- Site: https://futfly.vercel.app

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Lucide React
- API-Sports

## Estrutura do projeto

```bash
.
├── app/
│   ├── api/
│   │   └── matches/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── jogo/
├── components/
├── lib/
├── public/
├── package.json
├── pnpm-lock.yaml
├── next.config.mjs
├── postcss.config.mjs
├── tsconfig.json
├── components.json
├── README.md
└── .gitignore
```

## Como funciona

A aplicação consulta uma API de futebol para buscar os jogos do dia e transforma os dados em uma interface amigável para o usuário. A rota `/api/matches` faz a requisição para a API externa e retorna os jogos em um formato pronto para a página principal.

Na tela inicial, o frontend monta o painel de partidas e organiza as informações em uma experiência de acompanhamento esportivo com:

- filtro de partidas
- busca por time ou competição
- indicadores de status (ao vivo, próximo, encerrado)
- eventos e últimas atualizações

## Requisitos

Antes de rodar o projeto, você precisa ter instalado:

- Node.js 20+
- pnpm

## Configuração

1. Clone o repositório
2. Instale as dependências:

```bash
pnpm install
```

3. Crie um arquivo `.env.local` na raiz do projeto com a sua chave da API:

```bash
API_KEY=sua_chave_aqui
```

> O projeto usa a API-Sports para buscar as partidas. Para que o app funcione corretamente, você precisa de uma chave válida.

4. Inicie o projeto em modo de desenvolvimento:

```bash
pnpm dev
```

A aplicação ficará disponível em `http://localhost:3000`.

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
```

## Observações

- O projeto foi criado como uma base para explorar ideias de interface e dados esportivos em tempo real.
- Ele foi pensado para ser facilmente adaptado para outros cenários, como painel de futebol, comunidade de torcedores ou plataforma esportiva similar.
- O código foi estruturado para servir como referência de estudo e extensão.

## Licença

Este projeto ainda não possui uma licença definida.

## Contribuição

Contribuições são bem-vindas. Se você quiser melhorar a interface, adicionar novos filtros, criar novas páginas ou aprimorar a integração com dados esportivos, sinta-se à vontade para abrir uma PR.

## Aviso

Este projeto não é oficial, nem está vinculado a nenhuma liga, federação ou organização esportiva.
