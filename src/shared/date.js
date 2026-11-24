const { env } = require('../config/environment');

/**
 * Formata uma data civil (YYYY-MM-DD) no fuso horário operacional da biblioteca.
 * Datas de empréstimo são datas-calendário, não instantes UTC.
 */
function dateIsoInTimeZone(date = new Date(), timeZone = env.appTimeZone) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError('A data informada é inválida.');
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    calendar: 'iso8601',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function todayIso() {
  return dateIsoInTimeZone(new Date());
}

module.exports = { dateIsoInTimeZone, todayIso };
