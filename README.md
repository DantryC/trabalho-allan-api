# Acervo Campus API

API REST do sistema de gestão de biblioteca. Requisitos: Node.js 20+ e npm.

## Instalação

```bash
npm install
cp .envex .env
npm start
```

No Windows PowerShell:

```powershell
Copy-Item .envex .env
```

Antes de iniciar, edite o `.env`. Gere dois segredos diferentes com pelo menos 32 caracteres e defina uma senha inicial com pelo menos oito caracteres. Não compartilhe nem versione o `.env`.

| Variável | Descrição |
|---|---|
| `PORT` | Porta HTTP, padrão 3000 |
| `FRONT_URL` | Origem liberada pelo CORS, padrão `http://localhost:5173` |
| `APP_TIME_ZONE` | Fuso das datas civis de empréstimos/relatórios, padrão `America/Sao_Paulo` |
| `JWT_SECRET` | Segredo de assinatura do access token |
| `JWT_REFRESH_SECRET` | Segredo separado para refresh token |
| `ACCESS_TOKEN_TTL` | Validade do access token, padrão `15m` |
| `ADMIN_NAME` | Nome do primeiro administrador |
| `ADMIN_USERNAME` | Usuário do primeiro administrador |
| `ADMIN_EMAIL` | E-mail do primeiro administrador |
| `ADMIN_PASSWORD` | Senha do primeiro administrador |
| `DATABASE_FILE` | Local do SQLite, padrão `./storage/acervo-campus.sqlite` |

A API cria as tabelas e o primeiro administrador automaticamente no primeiro início. O usuário criado pelo seed não é criado por rota pública.

## Desenvolvimento e testes

```bash
npm run dev
npm test
```

O teste automatizado utiliza SQLite em memória e não altera o banco de desenvolvimento.
O teste de atraso simula um vencimento passado diretamente no banco SQLite em memória; assim, a multa de R$ 1,00 por dia pode ser verificada sem aguardar o prazo de sete dias na interface.

## Endpoints

Base: `http://localhost:3000/v1`. Todas as rotas, exceto login e refresh, exigem `Authorization: Bearer <accessToken>`.

| Método | Endpoint | Acesso |
|---|---|---|
| POST | `/auth/login` | Público |
| POST | `/auth/refresh` | Público |
| POST | `/auth/logout` | Usuário autenticado |
| GET | `/auth/me` | Usuário autenticado |
| GET / POST | `/user` | Admin |
| PUT / PATCH | `/user/:id` | Admin |
| DELETE | `/user/:id` | Admin; bloqueado se o atendente tiver empréstimos registrados |
| PUT / PATCH | `/user/:id/active` | Admin |
| GET / POST / PUT / PATCH / DELETE | `/categories` e `/categories/:id` | Leitura autenticada; escrita admin |
| GET / POST / PUT / PATCH / DELETE | `/authors` e `/authors/:id` | Leitura autenticada; escrita admin |
| GET / POST / PUT / PATCH / DELETE | `/books` e `/books/:id` | Leitura autenticada; escrita admin |
| GET | `/books?title=&categoryId=&authorId=&available=true` | Usuário autenticado |
| GET / POST / PUT / PATCH | `/readers` e `/readers/:id` | Usuário autenticado |
| DELETE | `/readers/:id` | Admin; bloqueado se o leitor tiver histórico de empréstimos |
| GET | `/readers/:id/loans` | Usuário autenticado |
| POST | `/loans` | Usuário autenticado |
| PATCH | `/loans/:id/due-date` | Usuário autenticado; somente empréstimo em aberto |
| PATCH | `/loans/:id/return` | Usuário autenticado |
| GET | `/loans?status=ATIVO\|ATRASADO\|DEVOLVIDO` | Usuário autenticado |
| GET | `/reports/dashboard` | Admin |

### Payloads principais

Login:

```json
{ "email": "admin@acervocampus.local", "password": "senha-configurada-no-env" }
```

A resposta inclui `accessToken`, `refreshToken` e `user`. O refresh recebe `{ "refreshToken": "..." }`, revoga o token anterior e devolve um novo par. Se um token já revogado for reutilizado, todas as sessões persistidas daquele usuário são revogadas.

Criar livro:

```json
{
  "title": "Introdução à Computação",
  "isbn": "9780000000001",
  "year": 2024,
  "totalCopies": 4,
  "categoryId": 1,
  "authorIds": [1, 2]
}
```

Criar empréstimo: `{ "bookId": 1, "readerId": 1 }`.

Atualizar a data prevista de devolução de um empréstimo em aberto: `{ "dueDate": "2026-12-01" }` em `PATCH /v1/loans/:id/due-date`. A data deve estar no formato `AAAA-MM-DD` e não pode ser anterior à data do empréstimo. Empréstimos já devolvidos não podem ser alterados.

## Regras de negócio

- Só há empréstimo com `availableCopies > 0`.
- O prazo inicial é de sete dias a partir da data do empréstimo; atendentes e administradores podem ajustar a data prevista enquanto o empréstimo estiver em aberto.
- Um leitor não pode ultrapassar três empréstimos em aberto nem possuir empréstimo atrasado ao solicitar outro.
- A multa é de R$ 1,00 por dia de atraso.
- O estoque é decrementado na retirada e incrementado na devolução.
- Criação de empréstimo e devolução utilizam transação Sequelize.
- Exclusão de categoria ou autor vinculado retorna 409. A exclusão de livro com histórico de empréstimo ou exemplar emprestado também retorna 409 para preservar o histórico.
- Usuário desativado não autentica; a desativação também revoga seus refresh tokens.
- 401 indica ausência/invalidez/expiração de autenticação; 403 indica usuário autenticado sem permissão administrativa.

## Decisão sobre `logout_list`

A blacklist da versão de exemplo foi substituída pela tabela `refresh_tokens`. O access token é stateless e curto (15 minutos); o refresh token dura sete dias e pode ser revogado individualmente. Na tabela, o campo `token` contém o SHA-256 do refresh recebido, nunca o valor original em texto puro. Logout revoga o registro do refresh token enviado.

## Coleção de testes

Importe `acervo-campus.postman_collection.json` no Postman. Configure `baseUrl` se a API usar outra porta e preencha `adminEmail`/`adminPassword` com os mesmos valores de `ADMIN_EMAIL`/`ADMIN_PASSWORD` do `.env`. Faça login; a coleção salva automaticamente `accessToken` e `refreshToken` da resposta nas variáveis para as próximas requisições.

## Datas e fuso horário

As datas civis de empréstimos, devoluções, atrasos, histórico e dashboard usam `APP_TIME_ZONE` (padrão `America/Sao_Paulo`). Isso evita que a data UTC do servidor antecipe ou atrase o dia operacional da biblioteca. O cálculo da diferença entre datas (`dueDate` e `returnDate`) continua sendo feito sobre datas ISO `YYYY-MM-DD`, sem conversão de horário.
