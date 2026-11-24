// Formatação e leitura de números no padrão brasileiro.

const nf = (min, max) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max });
const brl = nf(2, 2);
const int = nf(0, 0);
const one = nf(0, 1);
const two = nf(2, 2);

const ok = (v) => typeof v === 'number' && Number.isFinite(v);

export function format(value, kind) {
  if (!ok(value)) return '—';
  switch (kind) {
    case 'brl':
      return `R$ ${brl.format(value)}`;
    case 'brlShort':
      return `R$ ${compact(value)}`;
    case 'pct':
      return `${two.format(value * 100)}%`;
    case 'int':
      return int.format(Math.round(value));
    case 'qty':
      // Vendas fracionadas (ex.: 1,2) são comuns em projeções pequenas: mostra uma casa.
      return Math.abs(value) < 100 ? one.format(value) : int.format(Math.round(value));
    case 'x':
      return `${two.format(value)}x`;
    default:
      return two.format(value);
  }
}

export function compact(value) {
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${nf(0, 1).format(value / 1e6)} mi`;
  if (abs >= 1e3) return `${nf(0, 1).format(value / 1e3)} mil`;
  return int.format(value);
}

// Valor exibido dentro de um campo editável (sem símbolo de moeda / %).
export function toField(value, unit) {
  if (!ok(value)) return '';
  if (unit === 'pct') return nf(0, 4).format(value * 100);
  if (unit === 'brl') return brl.format(value);
  return nf(0, 2).format(value);
}

/**
 * Lê o que a pessoa digitou. Aceita "1.500,00", "1500,5", "1500.5" e "1.500".
 * Devolve NaN se não for número.
 */
export function parseNumber(text) {
  let s = String(text ?? '').trim().replace(/\s|R\$|%/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function fromField(text, unit) {
  const n = parseNumber(text);
  if (Number.isNaN(n)) return NaN;
  return unit === 'pct' ? n / 100 : n;
}
