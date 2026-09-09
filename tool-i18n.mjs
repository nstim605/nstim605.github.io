const node = document.querySelector('#tool-i18n');

let messages = {};
if (node?.textContent) {
  try {
    messages = JSON.parse(node.textContent);
  } catch {
    messages = {};
  }
}

export function t(source, values = {}) {
  const template = messages[source] ?? source;
  return Object.entries(values).reduce(
    (value, [name, replacement]) => value.replaceAll(`{${name}}`, String(replacement)),
    template
  );
}

export function formatRateDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
  }).format(date);
}
