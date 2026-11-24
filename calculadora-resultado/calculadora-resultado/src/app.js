import { FUNNELS, KPI, SCENARIOS, compute, investmentForGoal, deriveScenario } from './funnels.js';
import { format, toField, fromField } from './format.js';

const STORAGE_KEY = 'calculadora-resultado:v1';

const MODES = [
  {
    id: 'investimento',
    label: 'Quanto vou faturar?',
    sub: 'Já sei quanto vou investir',
    ask: 'Quanto você vai investir?',
    unit: 'brl',
  },
  {
    id: 'faturamento',
    label: 'Quanto investir para faturar uma meta?',
    sub: 'Tenho uma meta de faturamento',
    ask: 'Quanto você quer faturar?',
    unit: 'brl',
  },
  {
    id: 'vendas',
    label: 'Quanto investir para vender uma meta?',
    sub: 'Tenho uma meta de vendas',
    ask: 'Quantas vendas você quer fazer?',
    unit: 'qty',
  },
];

// Como cada etapa aparece na frase "Gera ..." embaixo de uma taxa.
const YIELD = {
  impressoes: (v) => `${format(v, 'int')} impressões`,
  cliques: (v) => `${format(v, 'int')} cliques`,
  pageViews: (v) => `${format(v, 'int')} visitas na página`,
  leads: (v) => `${format(v, 'int')} leads`,
  mql: (v) => `${format(v, 'int')} MQLs`,
  vendas: (v) => `${format(v, 'qty')} ${v === 1 ? 'venda' : 'vendas'}`,
  checkouts: (v) => `${format(v, 'int')} checkouts`,
  vendasUp1: (v) => `${format(v, 'qty')} vendas do upsell 1`,
  vendasUp2: (v) => `${format(v, 'qty')} vendas do upsell 2`,
  vendasDown: (v) => `${format(v, 'qty')} vendas do downsell`,
  faturamento: (v) => `${format(v, 'brl')} de faturamento`,
};

// ---------- Estado ----------

function defaultState() {
  const base = {};
  const goals = {};
  const overrides = {};
  for (const f of Object.values(FUNNELS)) {
    base[f.id] = { ...f.defaults };
    const r = compute(f.id, f.defaults, f.defaultInvestment);
    goals[f.id] = {
      investimento: f.defaultInvestment,
      faturamento: Math.round(r.faturamento),
      vendas: Math.max(1, Math.round(r.vendas)),
    };
    overrides[f.id] = { pessimista: {}, otimista: {} };
  }
  return {
    v: 1,
    funnel: 'leads',
    mode: 'investimento',
    goals,
    taxas: 0,
    variation: { pessimista: -0.1, otimista: 0.1 },
    manual: false,
    base,
    overrides,
  };
}

const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

function valid(input, value) {
  if (!Number.isFinite(value) || value < 0) return false;
  if (input.unit === 'pct' && value > 1) return false;
  return true;
}

// Junta um estado salvo com o padrão, aceitando só números válidos.
function sanitize(raw) {
  const d = defaultState();
  if (!raw || typeof raw !== 'object') return d;
  if (FUNNELS[raw.funnel]) d.funnel = raw.funnel;
  if (MODES.some((m) => m.id === raw.mode)) d.mode = raw.mode;
  d.manual = raw.manual === true;
  d.taxas = Math.min(0.99, Math.max(0, num(raw.taxas, 0)));
  d.variation.pessimista = Math.min(0, Math.max(-1, num(raw.variation?.pessimista, d.variation.pessimista)));
  d.variation.otimista = Math.max(0, Math.min(5, num(raw.variation?.otimista, d.variation.otimista)));
  for (const f of Object.values(FUNNELS)) {
    for (const m of MODES) d.goals[f.id][m.id] = Math.max(0, num(raw.goals?.[f.id]?.[m.id], d.goals[f.id][m.id]));
    for (const input of f.inputs) {
      const b = raw.base?.[f.id]?.[input.key];
      if (typeof b === 'number' && valid(input, b)) d.base[f.id][input.key] = b;
      for (const s of ['pessimista', 'otimista']) {
        const o = raw.overrides?.[f.id]?.[s]?.[input.key];
        if (typeof o === 'number' && valid(input, o)) d.overrides[f.id][s][input.key] = o;
      }
    }
  }
  return d;
}

const encodeState = (s) => btoa(unescape(encodeURIComponent(JSON.stringify(s))));
function decodeState(str) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(str))));
  } catch {
    return null;
  }
}

function loadState() {
  const m = location.hash.match(/s=([^&]+)/);
  if (m) {
    const fromLink = decodeState(m[1]);
    if (fromLink) return sanitize(fromLink);
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return sanitize(JSON.parse(saved));
  } catch {
    /* navegador sem storage: segue com o padrão */
  }
  return defaultState();
}

let state = loadState();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* sem storage disponível */
  }
}

// ---------- Cálculo ----------

const funnel = () => FUNNELS[state.funnel];
const mode = () => MODES.find((m) => m.id === state.mode);
const inputDef = (key) => funnel().inputs.find((i) => i.key === key);

function paramsFor(scenarioId) {
  const f = state.funnel;
  const base = state.base[f];
  if (scenarioId === 'conservador') return { ...base };
  const derived = deriveScenario(f, base, state.variation[scenarioId]);
  return state.manual ? { ...derived, ...state.overrides[f][scenarioId] } : derived;
}

function results() {
  const f = state.funnel;
  const goal = state.goals[f][state.mode];
  const out = {};
  for (const s of SCENARIOS) {
    const p = paramsFor(s.id);
    const inv = investmentForGoal(f, p, state.mode, goal, state.taxas);
    const unreachable = !Number.isFinite(inv);
    out[s.id] = { params: p, unreachable, ...compute(f, p, unreachable ? 0 : inv, state.taxas) };
  }
  return out;
}

// ---------- Utilidades de DOM ----------

const $ = (sel) => document.querySelector(sel);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) node.append(c);
  return node;
};

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function setIfIdle(input, value) {
  if (document.activeElement !== input) input.value = value;
}

const affixes = (unit) => ({
  prefix: unit === 'brl' ? 'R$' : '',
  suffix: unit === 'pct' ? '%' : unit === 'qty' ? 'vendas' : '',
});

const variationText = (s) => {
  if (s === 'conservador') return 'Suas taxas';
  const v = state.variation[s];
  const base = `${format(Math.abs(v), 'pct').replace(',00', '')} ${v < 0 ? 'pior' : 'melhor'}`;
  const edited = state.manual && Object.keys(state.overrides[state.funnel][s]).length > 0;
  return edited ? `${base}, com ajustes` : base;
};

/**
 * Liga um campo numérico: recalcula a cada tecla, formata ao sair do campo
 * e mostra o erro sem perder o que a pessoa digitou.
 */
function bindNumber(input, { read, check, write, display, errorEl }) {
  const showError = (msg) => {
    input.closest('.inp')?.classList.toggle('invalid', !!msg);
    input.setAttribute('aria-invalid', String(!!msg));
    if (errorEl) errorEl.textContent = msg;
  };
  input.addEventListener('input', () => {
    const n = read(input.value);
    const msg = input.value.trim() === '' ? 'Preencha este campo.' : Number.isNaN(n) ? 'Digite só números, ex.: 1.500,00' : check(n);
    showError(msg);
    if (msg) return;
    write(n);
    commit();
  });
  input.addEventListener('blur', () => {
    showError('');
    input.value = display();
  });
  input.addEventListener('focus', () => input.select());
}

function checkFor(input) {
  return (n) => {
    if (n < 0) return 'Use um número maior ou igual a zero.';
    if (input.unit === 'pct' && n > 1) return 'Use um valor entre 0% e 100%.';
    return '';
  };
}

// ---------- Passos 1 e 2: funil e pergunta ----------

function radioCards(container, name, options, current, onPick, { list = false } = {}) {
  container.replaceChildren(
    ...options.map((o) => {
      const id = `${name}-${o.id}`;
      return el('label', { class: `choice${o.id === current ? ' is-on' : ''}`, for: id },
        el('input', {
          type: 'radio', name, id, value: o.id, checked: o.id === current,
          onchange: () => onPick(o.id),
        }),
        el('span', { class: 'choice-text' },
          el('span', { class: 'choice-title' }, o.label),
          el('span', { class: 'choice-sub' }, list ? o.sub : o.description),
        ),
      );
    }),
  );
}

function renderChoices() {
  radioCards($('#funnelChoice'), 'funnel', Object.values(FUNNELS), state.funnel, (id) => {
    state.funnel = id;
    commit({ rebuild: true });
    $(`#funnel-${id}`)?.focus();
  });
  radioCards($('#modeChoice'), 'mode', MODES, state.mode, (id) => {
    // Ao trocar a pergunta, a meta começa no que o conservador entrega hoje.
    const r = results().conservador;
    const g = state.goals[state.funnel];
    if (id === 'faturamento') g.faturamento = Math.round(r.faturamento);
    if (id === 'vendas') g.vendas = Math.max(1, Math.round(r.vendas));
    if (id === 'investimento') g.investimento = Math.round(r.investimento * 100) / 100;
    state.mode = id;
    commit({ rebuild: true });
    $(`#mode-${id}`)?.focus();
  }, { list: true });

  const m = mode();
  const { prefix, suffix } = affixes(m.unit);
  $('#targetLabel').textContent = m.ask;
  $('#targetPrefix').textContent = prefix;
  $('#targetPrefix').hidden = !prefix;
  $('#targetSuffix').textContent = suffix;
  $('#targetSuffix').hidden = !suffix;
}

function targetDisplay() {
  return toField(state.goals[state.funnel][state.mode], state.mode === 'vendas' ? 'num' : 'brl');
}

// ---------- Passo 3: premissas ----------

function buildPremises() {
  const f = funnel();
  const groups = f.groups.map((g) => {
    const rows = g.keys.map((k) => premiseRow(inputDef(k)));
    if (!g.optional) {
      return el('fieldset', { class: 'pgroup' }, el('legend', {}, g.label), rows);
    }
    const anyUsed = g.keys.some((k) => inputDef(k).unit === 'pct' && state.base[f.id][k] > 0);
    return el('details', { class: 'pgroup pgroup-optional', open: anyUsed },
      el('summary', {}, g.label, el('span', { class: 'optional' }, 'opcional')),
      rows,
    );
  });
  $('#premises').replaceChildren(...groups);
}

function premiseRow(input) {
  const { prefix, suffix } = affixes(input.unit);
  const id = `in-${input.key}-conservador`;
  const field = el('input', {
    id, type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-describedby': `hint-${input.key}`,
  });
  const error = el('p', { class: 'field-error', role: 'alert' });
  bindNumber(field, {
    read: (t) => fromField(t, input.unit),
    check: checkFor(input),
    write: (n) => (state.base[state.funnel][input.key] = n),
    display: () => toField(state.base[state.funnel][input.key], input.unit),
    errorEl: error,
  });

  let slider = null;
  if (input.min != null) {
    slider = el('input', {
      type: 'range', class: 'slider', id: `range-${input.key}`, min: input.min, max: input.max, step: input.step,
      'aria-label': input.label,
      oninput: () => {
        state.base[state.funnel][input.key] = Number(slider.value);
        commit();
      },
    });
  }

  const scn = el('div', { class: 'pscn', 'data-key': input.key },
    ['pessimista', 'otimista'].map((s) => scenarioField(input, s)),
  );

  return el('div', { class: 'premise', 'data-key': input.key },
    el('div', { class: 'premise-top' },
      el('label', { for: id, class: 'premise-label' }, input.label),
      el('div', { class: 'inp inp-sm' },
        prefix ? el('span', { class: 'affix' }, prefix) : null,
        field,
        suffix ? el('span', { class: 'affix' }, suffix) : null,
      ),
    ),
    input.hint ? el('p', { class: 'premise-hint', id: `hint-${input.key}` }, input.hint) : null,
    error,
    slider,
    input.yields ? el('p', { class: 'premise-yield', 'data-yield': input.key }) : null,
    scn,
  );
}

function scenarioField(input, scenarioId) {
  const { prefix, suffix } = affixes(input.unit);
  const label = SCENARIOS.find((s) => s.id === scenarioId).label;
  const id = `in-${input.key}-${scenarioId}`;
  const field = el('input', { id, type: 'text', inputmode: 'decimal', autocomplete: 'off' });
  bindNumber(field, {
    read: (t) => fromField(t, input.unit),
    check: checkFor(input),
    write: (n) => (state.overrides[state.funnel][scenarioId][input.key] = n),
    display: () => toField(paramsFor(scenarioId)[input.key], input.unit),
  });
  return el('div', { class: `pscn-field pscn-${scenarioId}` },
    el('label', { for: id }, el('span', { class: `swatch sw-${scenarioId}`, 'aria-hidden': 'true' }), label),
    el('div', { class: 'inp inp-xs inp-cell' },
      prefix ? el('span', { class: 'affix' }, prefix) : null,
      field,
      suffix ? el('span', { class: 'affix' }, suffix) : null,
      el('button', {
        type: 'button', class: 'unlink', title: 'Voltar ao automático',
        'aria-label': `Voltar ${input.label} do ${label} ao automático`,
        onclick: () => {
          delete state.overrides[state.funnel][scenarioId][input.key];
          commit();
        },
      }, '↺'),
    ),
  );
}

function updatePremises(res) {
  const f = funnel();
  const c = res.conservador;
  $('#premises').classList.toggle('is-manual', state.manual);
  for (const input of f.inputs) {
    const v = state.base[f.id][input.key];
    setIfIdle(document.getElementById(`in-${input.key}-conservador`), toField(v, input.unit));
    const slider = document.getElementById(`range-${input.key}`);
    if (slider) {
      // A barra cresce se a pessoa digitar um valor acima do limite.
      slider.max = Math.max(input.max, v);
      if (document.activeElement !== slider) slider.value = v;
      const pct = ((Math.min(v, slider.max) - input.min) / (slider.max - input.min)) * 100;
      slider.style.setProperty('--fill', `${Math.max(0, pct)}%`);
    }
    const y = document.querySelector(`[data-yield="${input.key}"]`);
    if (y) y.textContent = c.unreachable ? '' : `Gera ${YIELD[input.yields](c[input.yields])}`;

    for (const s of ['pessimista', 'otimista']) {
      const field = document.getElementById(`in-${input.key}-${s}`);
      if (!field) continue;
      setIfIdle(field, toField(res[s].params[input.key], input.unit));
      const manual = input.key in state.overrides[f.id][s];
      const wrap = field.closest('.inp');
      wrap.classList.toggle('is-manual', manual);
      wrap.classList.toggle('is-derived', !manual);
      field.title = manual ? 'Digitado à mão' : 'Calculado a partir das suas taxas';
    }
  }
}

// ---------- Resposta ----------

function renderAnswer(res) {
  const c = res.conservador;
  const p = res.pessimista;
  const o = res.otimista;
  const goal = state.goals[state.funnel][state.mode];
  const answer = $('#answer');

  if (c.unreachable) {
    $('#mobileBar').replaceChildren(el('span', { class: 'mb-text' }, el('strong', {}, 'Meta inalcançável')), el('span', { class: 'mb-go' }, 'Ver resultado'));
    answer.replaceChildren(
      el('p', { class: 'answer-lead' }, 'Com essas taxas não dá para chegar na meta.'),
      el('p', { class: 'answer-big is-bad' }, 'Meta inalcançável'),
      el('p', { class: 'answer-range' }, 'Alguma taxa do passo 3 está em 0%. Assim nenhum investimento chega na meta.'),
    );
    return;
  }

  let lead;
  let mainKey;
  if (state.mode === 'investimento') {
    lead = ['Investindo ', el('strong', {}, format(goal, 'brl')), ', a projeção é faturar'];
    mainKey = 'faturamento';
  } else if (state.mode === 'faturamento') {
    lead = ['Para faturar ', el('strong', {}, format(goal, 'brl')), ', você precisa investir'];
    mainKey = 'investimento';
  } else {
    lead = ['Para fazer ', el('strong', {}, `${format(goal, 'qty')} ${goal === 1 ? 'venda' : 'vendas'}`), ', você precisa investir'];
    mainKey = 'investimento';
  }

  const points = SCENARIOS.filter((s) => !res[s.id].unreachable).map((s) => ({ ...s, value: res[s.id][mainKey] }));
  const lo = points.reduce((a, b) => (b.value < a.value ? b : a));
  const hi = points.reduce((a, b) => (b.value > a.value ? b : a));
  const same = Math.abs(hi.value - lo.value) < 0.005;

  const bar = $('#mobileBar');
  bar.replaceChildren(
    el('span', { class: 'mb-text' },
      el('span', { class: 'mb-label' }, state.mode === 'investimento' ? 'Faturamento conservador' : 'Investimento conservador'),
      el('strong', {}, format(c[mainKey], 'brl')),
    ),
    el('span', { class: 'mb-go' }, 'Ver resultado'),
  );

  answer.replaceChildren(
    el('p', { class: 'answer-lead' }, lead),
    el('p', { class: 'answer-big' }, format(c[mainKey], 'brl')),
    el('p', { class: 'answer-tag' }, 'no cenário conservador'),
    same ? null : rangeBar(points, lo, hi, c[mainKey]),
    el('ul', { class: 'insights' }, insights(res)),
  );
}

// Faixa do pior ao melhor cenário, com o conservador marcado no meio.
function rangeBar(points, lo, hi, cValue) {
  const pos = ((cValue - lo.value) / (hi.value - lo.value)) * 100;
  return el('div', { class: 'range', role: 'img', 'aria-label': `Vai de ${format(lo.value, 'brl')} no ${lo.label.toLowerCase()} a ${format(hi.value, 'brl')} no ${hi.label.toLowerCase()}` },
    el('div', { class: 'range-track' },
      el('span', { class: `range-dot dot-${lo.id}`, style: 'left:0%' }),
      el('span', { class: 'range-dot dot-conservador is-mid', style: `left:${pos}%` }),
      el('span', { class: `range-dot dot-${hi.id}`, style: 'left:100%' }),
    ),
    el('div', { class: 'range-labels' },
      el('span', { class: 'range-end' }, el('span', { class: 'range-name' }, lo.label), format(lo.value, 'brl')),
      el('span', { class: 'range-end is-right' }, el('span', { class: 'range-name' }, hi.label), format(hi.value, 'brl')),
    ),
  );
}

function insights(res) {
  const c = res.conservador;
  const p = res.pessimista;
  const items = [];
  const item = (kind, ...text) => el('li', { class: `insight is-${kind}` },
    el('span', { class: 'insight-icon', 'aria-hidden': 'true' }, kind === 'good' ? '✓' : '!'),
    el('span', { class: 'sr-only' }, kind === 'good' ? 'Ok: ' : 'Atenção: '),
    el('span', {}, ...text),
  );

  if (c.lucro >= 0) {
    items.push(item('good', 'No conservador, o lucro é ', el('strong', {}, format(c.lucro, 'brl')), ` com ROAS de ${format(c.roas, 'x')}.`));
  } else {
    items.push(item('bad', 'No conservador, o projeto dá prejuízo de ', el('strong', {}, format(-c.lucro, 'brl')),
      `. Ele só se paga com ROAS acima de ${format(c.roasEquilibrio, 'x')}, e está em ${format(c.roas, 'x')}.`));
  }
  if (!p.unreachable && p.lucro < 0 && c.lucro >= 0) {
    items.push(item('warn', 'No pessimista, o projeto dá prejuízo de ', el('strong', {}, format(-p.lucro, 'brl')), '.'));
  } else if (!p.unreachable && p.lucro >= 0) {
    items.push(item('good', 'O projeto se paga até no pessimista.'));
  }
  return items;
}

// ---------- Cards dos cenários ----------

function cardKeys() {
  const keys = state.funnel === 'leads'
    ? ['leads', 'cpl', 'vendas', 'cac', 'roas', 'lucro']
    : ['vendas', 'cac', 'ticketMedio', 'roas', 'lucro'];
  if (state.mode === 'investimento') return keys;
  // Com meta, o investimento varia: mostra ele; o número fixado pela meta sai da lista.
  const fixed = state.mode === 'vendas' ? 'vendas' : 'faturamento';
  const extra = state.mode === 'vendas' ? 'faturamento' : null;
  return [...keys.filter((k) => k !== fixed), ...(extra ? [extra] : [])];
}

function renderCards(res) {
  const mainKey = state.mode === 'investimento' ? 'faturamento' : 'investimento';
  const mainLabel = state.mode === 'investimento' ? 'Faturamento' : 'Investimento necessário';
  const c = res.conservador;
  $('#cards').replaceChildren(
    ...SCENARIOS.map((s) => {
      const r = res[s.id];
      const v = r[mainKey];
      const delta = s.id !== 'conservador' && !r.unreachable && !c.unreachable && c[mainKey] ? (v - c[mainKey]) / Math.abs(c[mainKey]) : null;
      return el('article', { class: `card card-${s.id}` },
        el('header', { class: 'card-head' },
          el('h3', {}, s.label),
          el('span', { class: 'card-tag' }, variationText(s.id)),
        ),
        el('p', { class: 'card-main-label' }, mainLabel),
        el('p', { class: 'card-main' }, r.unreachable ? 'Inalcançável' : format(v, 'brl')),
        el('p', { class: 'card-delta' }, delta != null && Math.abs(delta) >= 0.0005 ? `${fmtDelta(delta)} que o conservador` : ' '),
        el('dl', { class: 'card-list' },
          cardKeys().map((k) =>
            el('div', { class: `card-item${(k === 'lucro') && r[k] < 0 ? ' neg' : ''}` },
              el('dt', {}, k === 'vendas' && state.funnel === 'vendas' ? 'Vendas front' : k === 'lucro' ? 'Lucro' : KPI[k].label),
              el('dd', {}, r.unreachable ? '—' : format(r[k], KPI[k].fmt)),
            ),
          ),
        ),
      );
    }),
  );
}

const deltaFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
function fmtDelta(d) {
  const pct = Math.abs(d) * 100;
  return `${d > 0 ? '+' : '−'}${pct >= 10 ? Math.round(pct) : deltaFmt.format(pct)}%`;
}

// ---------- Funil completo ----------

function resultGroups() {
  return funnel().results.map((g) => ({
    ...g,
    rows: g.rows.filter((r) => !r.onlyWithTaxes || state.taxas > 0),
  }));
}

function rowLabel(row) {
  if (row.key === 'investimento' && state.mode !== 'investimento') return 'Investimento necessário';
  return row.label ?? KPI[row.key].label;
}

// Linha de apoio embaixo do número: o que a planilha chamava de "Qtd. p/ venda" e "Represen.".
function metaText(row, r) {
  if (r.unreachable) return '';
  const v = r[row.key];
  switch (row.meta) {
    case 'perSale': {
      const n = v / r.vendas;
      return Number.isFinite(n) && r.vendas > 0 ? [`${format(n, 'int')}/venda`] : '';
    }
    case 'share': {
      const n = v / r.ticketRef;
      return Number.isFinite(n) && r.ticketRef > 0 ? [format(n, 'pct'), ' do ticket'] : '';
    }
    case 'shareAvg': {
      const n = v / r.ticketMedio;
      return Number.isFinite(n) && r.ticketMedio > 0 ? [format(n, 'pct'), ' do ticket médio'] : '';
    }
    case 'revenue': {
      const offer = r.extras.find((x) => x.key === row.offer);
      return offer ? [format(offer.revenue, 'brl')] : '';
    }
    default:
      return '';
  }
}

function buildSheet() {
  const f = funnel();
  const head = el('thead', {},
    el('tr', {},
      el('th', { class: 'corner', scope: 'col' }, el('span', { class: 'sr-only' }, 'Indicador')),
      SCENARIOS.map((s) =>
        el('th', { scope: 'col', class: `scn-head scn-${s.id}` }, el('span', { class: 'scn-name' }, s.label)),
      ),
    ),
  );
  const rows = resultGroups().flatMap((group) => [
    el('tr', { class: 'stage-row' },
      el('th', { scope: 'rowgroup' }, group.label),
      SCENARIOS.map((s) => el('td', { class: `scn-${s.id}` })),
    ),
    ...group.rows.map((row) => {
      const key = row.key;
      const isKey = key === 'faturamento' || key === 'lucro' || (key === 'investimento' && state.mode !== 'investimento');
      return el('tr', { class: `row-result${isKey ? ' row-key' : ''}`, 'data-kpi': key },
        el('th', { scope: 'row' },
          el('span', { class: 'row-label' }, rowLabel(row)),
          KPI[key].hint ? el('span', { class: 'row-hint' }, KPI[key].hint) : null,
        ),
        SCENARIOS.map((s) =>
          el('td', { class: `res scn-${s.id}`, 'data-scn': s.id },
            el('span', { class: 'res-value' }),
            el('span', { class: 'res-sub' },
              el('span', { class: 'res-meta' }),
              el('span', { class: 'res-delta' }),
            ),
          ),
        ),
      );
    }),
  ]);
  $('#sheet').replaceChildren(
    el('caption', { class: 'sr-only' }, `Funil ${f.label} etapa por etapa nos três cenários`),
    head,
    el('tbody', {}, rows),
  );
}

function updateSheet(res) {
  const rowDefs = new Map(resultGroups().flatMap((g) => g.rows).map((r) => [r.key, r]));
  for (const row of document.querySelectorAll('#sheet tr[data-kpi]')) {
    const key = row.dataset.kpi;
    const def = rowDefs.get(key) ?? { key };
    const c = res.conservador[key];
    for (const s of SCENARIOS) {
      const r = res[s.id];
      const td = row.querySelector(`td[data-scn="${s.id}"]`);
      const v = r[key];
      const valueEl = td.querySelector('.res-value');
      if (r.unreachable) {
        valueEl.textContent = key === 'investimento' ? 'Inalcançável' : '—';
        td.classList.toggle('is-unreachable', key === 'investimento');
      } else {
        td.classList.remove('is-unreachable');
        valueEl.textContent = format(v, KPI[key].fmt);
      }
      td.classList.toggle('neg', (key === 'lucro' || key === 'roi') && v < 0);

      const metaEl = td.querySelector('.res-meta');
      const [main = '', suffix = ''] = [].concat(metaText(def, r) || []);
      metaEl.replaceChildren(main, suffix ? el('span', { class: 'meta-suffix' }, suffix) : '');

      const deltaEl = td.querySelector('.res-delta');
      const ok = s.id !== 'conservador' && Number.isFinite(v) && Number.isFinite(c) && c !== 0 && !r.unreachable;
      const d = ok ? (v - c) / Math.abs(c) : NaN;
      deltaEl.textContent = ok && Math.abs(d) >= 0.0005 ? fmtDelta(d) : '';
    }
  }
}

// ---------- Passo 4 ----------

function bindVariation() {
  const pairs = [
    { field: $('#varPess'), range: $('#varPessRange'), get: () => -state.variation.pessimista, set: (n) => (state.variation.pessimista = -n), max: 1 },
    { field: $('#varOtim'), range: $('#varOtimRange'), get: () => state.variation.otimista, set: (n) => (state.variation.otimista = n), max: 5 },
  ];
  for (const pr of pairs) {
    bindNumber(pr.field, {
      read: (t) => fromField(t, 'pct'),
      check: (n) => (n >= 0 && n <= pr.max ? '' : `Use de 0% a ${pr.max * 100}%.`),
      write: pr.set,
      display: () => toField(pr.get(), 'pct'),
    });
    pr.range.addEventListener('input', () => {
      pr.set(Number(pr.range.value) / 100);
      commit();
    });
  }
  bindVariation.pairs = pairs;

  $('#manualToggle').addEventListener('change', (e) => {
    state.manual = e.target.checked;
    commit();
  });

  bindNumber($('#taxas'), {
    read: (t) => fromField(t, 'pct'),
    check: (n) => (n >= 0 && n < 1 ? '' : 'Use de 0% a 99%.'),
    write: (n) => {
      if ((n > 0) !== (state.taxas > 0)) needsRebuild = true;
      state.taxas = n;
    },
    display: () => toField(state.taxas, 'pct'),
  });
}

function updateVariation() {
  for (const pr of bindVariation.pairs) {
    const v = pr.get();
    setIfIdle(pr.field, toField(v, 'pct'));
    if (document.activeElement !== pr.range) pr.range.value = Math.min(50, v * 100);
    pr.range.style.setProperty('--fill', `${Math.min(100, (v * 100) / 50 * 100)}%`);
  }
  $('#manualToggle').checked = state.manual;
  setIfIdle($('#taxas'), toField(state.taxas, 'pct'));
  $('#taxasNote').textContent = state.taxas > 0
    ? `Com essas taxas, o projeto só se paga com ROAS acima de ${format(1 / (1 - state.taxas), 'x')}.`
    : 'Deixe em 0 para ver o lucro antes de taxas e impostos.';
}

// ---------- CSV ----------

function exportCsv() {
  const res = results();
  const f = funnel();
  const csvNum = (v, fmt) => {
    if (!Number.isFinite(v)) return '';
    const n = fmt === 'pct' ? v * 100 : v;
    return String(Math.round(n * 100) / 100).replace('.', ',');
  };
  const lines = [];
  const row = (...cells) => lines.push(cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'));
  row('Calculadora de resultado', f.label);
  row('Pergunta', mode().label, csvNum(state.goals[state.funnel][state.mode]));
  row('Taxas e impostos (%)', csvNum(state.taxas, 'pct'));
  row('');
  row('Premissa', ...SCENARIOS.map((s) => s.label));
  for (const input of f.inputs) {
    row(`${input.label}${input.unit === 'pct' ? ' (%)' : input.unit === 'brl' ? ' (R$)' : ''}`,
      ...SCENARIOS.map((s) => csvNum(res[s.id].params[input.key], input.unit)));
  }
  row('');
  row('Resultado', ...SCENARIOS.map((s) => s.label));
  for (const def of resultGroups().flatMap((g) => g.rows)) {
    const fmt = KPI[def.key].fmt;
    row(`${rowLabel(def)}${fmt === 'brl' ? ' (R$)' : fmt === 'pct' ? ' (%)' : ''}`, ...SCENARIOS.map((s) => csvNum(res[s.id][def.key], fmt)));
  }
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `calculadora-${state.funnel}-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('CSV exportado');
}

// ---------- Ciclo de atualização ----------

let needsRebuild = false;

function commit({ rebuild = false } = {}) {
  save();
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  if (rebuild || needsRebuild) {
    buildPremises();
    buildSheet();
    renderChoices();
  }
  needsRebuild = false;
  render();
}

function render() {
  const res = results();
  setIfIdle($('#target'), targetDisplay());
  updatePremises(res);
  updateVariation();
  renderAnswer(res);
  renderCards(res);
  updateSheet(res);
}

function init() {
  bindNumber($('#target'), {
    read: (t) => fromField(t, 'num'),
    check: (n) => (n > 0 ? '' : 'Digite um valor maior que zero.'),
    write: (n) => (state.goals[state.funnel][state.mode] = n),
    errorEl: $('#targetError'),
    display: targetDisplay,
  });
  bindVariation();
  $('#form').addEventListener('submit', (e) => e.preventDefault());

  $('#copyLink').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}#s=${encodeState(state)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copiado');
    } catch {
      history.replaceState(null, '', url);
      toast('Link pronto na barra de endereço');
    }
  });
  $('#exportCsv').addEventListener('click', exportCsv);
  $('#reset').addEventListener('click', () => {
    const keepFunnel = state.funnel;
    state = defaultState();
    state.funnel = keepFunnel;
    commit({ rebuild: true });
    toast('Valores padrão restaurados');
  });

  // No celular, uma barra no rodapé mostra a resposta enquanto a pessoa preenche.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => $('#mobileBar').classList.toggle('is-hidden', e.isIntersecting || e.boundingClientRect.top < 0));
    io.observe($('#answer'));
  }

  renderChoices();
  buildPremises();
  buildSheet();
  render();
}

init();
