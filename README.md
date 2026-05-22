# FinancePerson

Painel React + Vite para controle financeiro pessoal ou familiar. O app organiza pessoas, rendas, contas, capital, lazer e investimentos em um dashboard mensal.

## Como rodar com Docker

```powershell
docker compose up --build -d
```

Depois acesse:

```text
http://localhost:8080
```

Para ver logs:

```powershell
docker compose logs --tail 120
```

Imagem direta:

```powershell
docker build -t app-finance-person .
docker run --rm -p 8080:8080 app-finance-person
```

## Como rodar localmente

```powershell
npm install
npm test
npm run build
npm run dev
```

## Variaveis de ambiente

Crie um `.env` a partir do `.env.example`.

```env
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
APP_STATE_PREFIX=financeperson:state:v1:
APP_AUTH_USERS=[{"username":"wellington","password":"troque-esta-senha"}]
```

`APP_AUTH_USERS` substitui as senhas antigas que ficavam no front-end. Em desenvolvimento, troque a senha padrao antes de usar.

## Persistencia

O app sempre salva um snapshot no `localStorage`, separado por usuario. Quando `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` existem, o front-end tambem sincroniza com `/api/state`.

Sem Turso configurado, `/api/state` responde `503` com `REMOTE_PERSISTENCE_DISABLED`. O dashboard continua funcionando com `localStorage` e exibe status de sincronizacao remota indisponivel.

## Primeiro acesso

No dashboard, o bloco "Setup inicial" permite cadastrar:

- pessoa principal;
- outras pessoas da familia/casal;
- salario fixo;
- renda extra inicial;
- capital inicial;
- primeira conta recorrente;
- mes inicial do painel.

Ao concluir, o app troca os dados demonstrativos por uma base real para uso diario.

## Zerar para testes

Em `Configuracoes`, use o botao `Zerar dados financeiros` para limpar entradas, contas, capital, lazer, investimentos, contas recorrentes, salarios e rendas extras. Pessoas, usuario, mes e preferencias continuam salvos para validar o fluxo adicionando dados por pessoa.

## Contas recorrentes

Na tela `Contas`, o bloco "Contas recorrentes" permite cadastrar despesas mensais como aluguel, internet, cartao, escola, assinaturas e financiamento.

Cada recorrencia tem pessoa, categoria, valor, dia de vencimento e status ativo/pausado. O botao "Gerar mes" cria as contas abertas do mes selecionado, evitando duplicar recorrencias ja geradas para o mesmo mes.

## Regras financeiras

- Contas pagas continuam pagas.
- Contas em aberto viram atrasadas automaticamente quando a data de vencimento passou.
- O dashboard mostra renda total, saidas pagas, contas abertas, atrasadas, saldo previsto, capital, investimentos e lazer.

## Estrutura principal

- `src/dashboard/App.jsx`: composicao principal do dashboard.
- `src/dashboard/state-utils.mjs`: modelo de dados e regras financeiras.
- `src/dashboard/persistence.mjs`: localStorage e chamadas para `/api/state`.
- `src/dashboard/components`: componentes do dashboard, setup, contas e recorrencias.
- `src/settings/SettingsApp.jsx`: preferencias do usuario.
- `api/state.js`: persistencia remota com Turso.
- `api/auth.js`: autenticacao simples via backend.
- `server.cjs`: servidor HTTP usado no Docker.
