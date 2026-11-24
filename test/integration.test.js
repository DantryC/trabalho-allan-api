process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.FRONT_URL = 'http://localhost:5173';
process.env.JWT_SECRET = 'test-access-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-different-and-longer';
process.env.ACCESS_TOKEN_TTL = '15m';
process.env.ADMIN_NAME = 'Admin de Teste';
process.env.ADMIN_USERNAME = 'admin-teste';
process.env.ADMIN_EMAIL = 'admin@teste.local';
process.env.ADMIN_PASSWORD = 'SenhaForte123';
process.env.DATABASE_FILE = ':memory:';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../src/app');
const { db } = require('../src/database/connection');
const { ensureFirstAdministrator } = require('../src/seed/first-administrator');
const { dateIsoInTimeZone, todayIso } = require('../src/shared/date');
require('../src/database/models');

let server;
let baseUrl;
let adminToken;
let adminRefresh;
let attendantToken;
let attendantRefresh;
let attendantId;
let categoryId;
let authorId;
let bookId;
let readerId;

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

before(async () => {
  await db.sync({ force: true });
  await ensureFirstAdministrator();
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await db.close();
});

test('API entrega login, CRUDs, regras de acesso e fluxo de empréstimo', async () => {
  const health = await request('/health');
  assert.equal(health.response.status, 200);

  const invalid = await request('/v1/auth/login', { method: 'POST', body: { email: 'nao-existe@teste.local', password: 'qualquer' } });
  assert.equal(invalid.response.status, 401);

  const login = await request('/v1/auth/login', { method: 'POST', body: { email: 'admin@teste.local', password: 'SenhaForte123' } });
  assert.equal(login.response.status, 200);
  assert.ok(login.data.accessToken);
  assert.ok(login.data.refreshToken);
  adminToken = login.data.accessToken;
  adminRefresh = login.data.refreshToken;

  const me = await request('/v1/auth/me', { token: adminToken });
  assert.equal(me.response.status, 200);
  assert.equal(me.data.user.isAdmin, true);

  const category = await request('/v1/categories', { method: 'POST', token: adminToken, body: { name: 'Tecnologia', description: 'Computação e inovação' } });
  assert.equal(category.response.status, 201);
  categoryId = category.data.data.id;

  const author = await request('/v1/authors', { method: 'POST', token: adminToken, body: { name: 'Ada Lovelace', nationality: 'Britânica' } });
  assert.equal(author.response.status, 201);
  authorId = author.data.data.id;

  const book = await request('/v1/books', { method: 'POST', token: adminToken, body: { title: 'Introdução à Computação', isbn: '9780000000001', year: 2020, totalCopies: 2, categoryId, authorIds: [authorId] } });
  assert.equal(book.response.status, 201);
  bookId = book.data.data.id;

  const foundBooks = await request('/v1/books?available=true&authorId=' + authorId, { token: adminToken });
  assert.equal(foundBooks.response.status, 200);
  assert.equal(foundBooks.data.data.length, 1);

  const reader = await request('/v1/readers', { method: 'POST', token: adminToken, body: { name: 'Leitor de Teste', cpf: '12345678901', email: 'leitor@teste.local', phone: '44999999999' } });
  assert.equal(reader.response.status, 201);
  readerId = reader.data.data.id;

  const attendant = await request('/v1/user', { method: 'POST', token: adminToken, body: { name: 'Atendente', username: 'atendente', email: 'atendente@teste.local', password: 'SenhaAtendente123' } });
  assert.equal(attendant.response.status, 201);
  attendantId = attendant.data.data.id;
  const attendantLogin = await request('/v1/auth/login', { method: 'POST', body: { email: 'atendente@teste.local', password: 'SenhaAtendente123' } });
  assert.equal(attendantLogin.response.status, 200);
  attendantToken = attendantLogin.data.accessToken;
  attendantRefresh = attendantLogin.data.refreshToken;

  const forbidden = await request('/v1/categories', { method: 'POST', token: attendantToken, body: { name: 'Bloqueada' } });
  assert.equal(forbidden.response.status, 403);
  const reportsForbidden = await request('/v1/reports/dashboard', { token: attendantToken });
  assert.equal(reportsForbidden.response.status, 403);

  const loan = await request('/v1/loans', { method: 'POST', token: attendantToken, body: { bookId, readerId } });
  assert.equal(loan.response.status, 201);
  assert.equal(loan.data.data.status, 'ATIVO');
  const afterLoan = await request(`/v1/books?title=Introdução`, { token: adminToken });
  assert.equal(afterLoan.data.data[0].availableCopies, 1);

  // Atendentes podem ajustar o vencimento de um empréstimo ainda em aberto.
  const nextDueDate = new Date(`${loan.data.data.loanDate}T00:00:00.000Z`);
  nextDueDate.setUTCDate(nextDueDate.getUTCDate() + 5);
  const adjustedDueDate = nextDueDate.toISOString().slice(0, 10);
  const dueDateUpdate = await request(`/v1/loans/${loan.data.data.id}/due-date`, { method: 'PATCH', token: attendantToken, body: { dueDate: adjustedDueDate } });
  assert.equal(dueDateUpdate.response.status, 200);
  assert.equal(dueDateUpdate.data.data.dueDate, adjustedDueDate);
  const invalidDueDate = await request(`/v1/loans/${loan.data.data.id}/due-date`, { method: 'PATCH', token: attendantToken, body: { dueDate: '2026-02-30' } });
  assert.equal(invalidDueDate.response.status, 400);
  const beforeLoanDate = new Date(`${loan.data.data.loanDate}T00:00:00.000Z`);
  beforeLoanDate.setUTCDate(beforeLoanDate.getUTCDate() - 1);
  const impossibleDueDate = await request(`/v1/loans/${loan.data.data.id}/due-date`, { method: 'PATCH', token: attendantToken, body: { dueDate: beforeLoanDate.toISOString().slice(0, 10) } });
  assert.equal(impossibleDueDate.response.status, 400);

  const { Loan } = require('../src/database/models');
  const overdueDate = new Date(`${todayIso()}T00:00:00.000Z`);
  overdueDate.setUTCDate(overdueDate.getUTCDate() - 2);
  await Loan.update({ dueDate: overdueDate.toISOString().slice(0, 10) }, { where: { id: loan.data.data.id } });
  const overdueLoans = await request('/v1/loans?status=ATRASADO', { token: attendantToken });
  assert.equal(overdueLoans.data.data.length, 1);
  const blockedBorrow = await request('/v1/loans', { method: 'POST', token: attendantToken, body: { bookId, readerId } });
  assert.equal(blockedBorrow.response.status, 409);

  const returnResult = await request(`/v1/loans/${loan.data.data.id}/return`, { method: 'PATCH', token: attendantToken });
  assert.equal(returnResult.response.status, 200);
  assert.equal(returnResult.data.data.status, 'DEVOLVIDO');
  assert.equal(returnResult.data.data.fine, 2);
  const dueDateAfterReturn = await request(`/v1/loans/${loan.data.data.id}/due-date`, { method: 'PATCH', token: attendantToken, body: { dueDate: adjustedDueDate } });
  assert.equal(dueDateAfterReturn.response.status, 409);

  const history = await request(`/v1/readers/${readerId}/loans`, { token: attendantToken });
  assert.equal(history.response.status, 200);
  assert.equal(history.data.data.length, 1);
  const afterReturn = await request(`/v1/books?title=Introdução`, { token: adminToken });
  assert.equal(afterReturn.data.data[0].availableCopies, 2);

  const readerWithHistoryDelete = await request(`/v1/readers/${readerId}`, { method: 'DELETE', token: adminToken });
  assert.equal(readerWithHistoryDelete.response.status, 409);
  const disposableReader = await request('/v1/readers', { method: 'POST', token: adminToken, body: { name: 'Leitor descartável', cpf: '98765432100' } });
  assert.equal(disposableReader.response.status, 201);
  const readerDeleteForbidden = await request(`/v1/readers/${disposableReader.data.data.id}`, { method: 'DELETE', token: attendantToken });
  assert.equal(readerDeleteForbidden.response.status, 403);
  const readerDelete = await request(`/v1/readers/${disposableReader.data.data.id}`, { method: 'DELETE', token: adminToken });
  assert.equal(readerDelete.response.status, 200);

  const staffUpdate = await request(`/v1/user/${attendantId}`, { method: 'PUT', token: adminToken, body: { name: 'Atendente Atualizado' } });
  assert.equal(staffUpdate.response.status, 200);
  assert.equal(staffUpdate.data.data.name, 'Atendente Atualizado');
  const staffWithLoansDelete = await request(`/v1/user/${attendantId}`, { method: 'DELETE', token: adminToken });
  assert.equal(staffWithLoansDelete.response.status, 409);
  const disposableStaff = await request('/v1/user', { method: 'POST', token: adminToken, body: { name: 'Atendente descartável', username: 'atendente-descartavel', email: 'atendente-descartavel@teste.local', password: 'SenhaAtendente123' } });
  assert.equal(disposableStaff.response.status, 201);
  const staffDeleteForbidden = await request(`/v1/user/${disposableStaff.data.data.id}`, { method: 'DELETE', token: attendantToken });
  assert.equal(staffDeleteForbidden.response.status, 403);
  const staffDelete = await request(`/v1/user/${disposableStaff.data.data.id}`, { method: 'DELETE', token: adminToken });
  assert.equal(staffDelete.response.status, 200);

  const categoryConflict = await request(`/v1/categories/${categoryId}`, { method: 'DELETE', token: adminToken });
  assert.equal(categoryConflict.response.status, 409);

  const disabled = await request(`/v1/user/${attendantId}/active`, { method: 'PATCH', token: adminToken, body: { active: false } });
  assert.equal(disabled.response.status, 200);
  const disabledLogin = await request('/v1/auth/login', { method: 'POST', body: { email: 'atendente@teste.local', password: 'SenhaAtendente123' } });
  assert.equal(disabledLogin.response.status, 401);
});

test('refresh faz rotação e detecta reutilização', async () => {
  const initial = await request('/v1/auth/login', { method: 'POST', body: { email: 'admin@teste.local', password: 'SenhaForte123' } });
  assert.equal(initial.response.status, 200);
  const refreshed = await request('/v1/auth/refresh', { method: 'POST', body: { refreshToken: initial.data.refreshToken } });
  assert.equal(refreshed.response.status, 200);
  assert.notEqual(refreshed.data.refreshToken, initial.data.refreshToken);
  const replay = await request('/v1/auth/refresh', { method: 'POST', body: { refreshToken: initial.data.refreshToken } });
  assert.equal(replay.response.status, 401);
  const afterReplay = await request('/v1/auth/refresh', { method: 'POST', body: { refreshToken: refreshed.data.refreshToken } });
  assert.equal(afterReplay.response.status, 401);
});


test('logout revoga o refresh token informado', async () => {
  const signed = await request('/v1/auth/login', { method: 'POST', body: { email: 'admin@teste.local', password: 'SenhaForte123' } });
  assert.equal(signed.response.status, 200);
  const ended = await request('/v1/auth/logout', { method: 'POST', token: signed.data.accessToken, body: { refreshToken: signed.data.refreshToken } });
  assert.equal(ended.response.status, 200);
  const renewal = await request('/v1/auth/refresh', { method: 'POST', body: { refreshToken: signed.data.refreshToken } });
  assert.equal(renewal.response.status, 401);
});

test('rotas privadas respondem 401 sem access token', async () => {
  const response = await request('/v1/books');
  assert.equal(response.response.status, 401);
});


test('datas civis usam o fuso operacional America/Sao_Paulo, não UTC', () => {
  // 00:30 UTC de 24/11 ainda é 21:30 de 23/11 em São Paulo.
  assert.equal(dateIsoInTimeZone(new Date('2026-11-24T00:30:00.000Z'), 'America/Sao_Paulo'), '2026-11-23');
  // A partir de 03:00 UTC já é 24/11 em São Paulo.
  assert.equal(dateIsoInTimeZone(new Date('2026-11-24T03:00:00.000Z'), 'America/Sao_Paulo'), '2026-11-24');
});
