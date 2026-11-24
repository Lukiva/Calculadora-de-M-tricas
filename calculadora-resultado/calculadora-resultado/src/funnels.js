// Definição dos funis e motor de cálculo.
// Todas as taxas são guardadas como fração (0.01 = 1%).
// `dir` diz como a variação de cenário age na premissa:
//   +1 → quanto maior, melhor (taxas)   -1 → quanto menor, melhor (CPM)   0 → não varia (tickets)

export const SCENARIOS = [
  { id: 'pessimista', label: 'Pessimista' },
  { id: 'conservador', label: 'Conservador' },
  { id: 'otimista', label: 'Otimista' },
];

export const FUNNELS = {
  leads: {
    id: 'leads',
    label: 'Captura de leads',
    description: 'Capta o lead e vende depois. Lançamentos e high ticket.',
    inputs: [
      { key: 'cpm', label: 'CPM', unit: 'brl', dir: -1, min: 5, max: 150, step: 0.5, yields: 'impressoes',
        hint: 'Quanto custa mostrar o anúncio mil vezes' },
      { key: 'ctr', label: 'CTR', unit: 'pct', dir: 1, min: 0.001, max: 0.05, step: 0.0005, yields: 'cliques',
        hint: 'De cada 100 pessoas que veem o anúncio, quantas clicam' },
      { key: 'connect', label: 'Connect rate', unit: 'pct', dir: 1, min: 0.3, max: 1, step: 0.01, yields: 'pageViews',
        hint: 'Dos cliques, quantos chegam a carregar a página' },
      { key: 'cadastro', label: 'Taxa de cadastro', unit: 'pct', dir: 1, min: 0.01, max: 0.8, step: 0.005, yields: 'leads',
        hint: 'Dos visitantes da página, quantos deixam o contato' },
      { key: 'qualificacao', label: 'Taxa de qualificação', unit: 'pct', dir: 1, min: 0.05, max: 1, step: 0.01, yields: 'mql',
        hint: 'Dos leads, quantos têm o perfil certo para comprar (MQL)' },
      { key: 'conversao', label: 'Taxa de conversão', unit: 'pct', dir: 1, min: 0.001, max: 0.2, step: 0.001, yields: 'vendas',
        hint: 'Dos MQLs, quantos compram' },
      { key: 'ticket', label: 'Ticket', unit: 'brl', dir: 0, yields: 'faturamento',
        hint: 'Preço do produto' },
    ],
    groups: [
      { label: 'Anúncio', keys: ['cpm', 'ctr'] },
      { label: 'Página e cadastro', keys: ['connect', 'cadastro'] },
      { label: 'Venda', keys: ['qualificacao', 'conversao', 'ticket'] },
    ],
    defaults: {
      cpm: 30, ctr: 0.01, connect: 0.8, cadastro: 0.3, qualificacao: 1, conversao: 0.01, ticket: 4000,
    },
    defaultInvestment: 1500,
    // Resultado na ordem em que o funil acontece.
    // meta: linha de apoio embaixo do número.
    //   perSale → quantos são precisos por venda   share → custo ÷ ticket   revenue → faturamento da oferta
    results: [
      { label: 'Mídia', rows: [
        { key: 'investimento' },
        { key: 'impressoes', meta: 'perSale' },
        { key: 'cliques', meta: 'perSale' },
        { key: 'cpc', meta: 'share' },
      ] },
      { label: 'Página', rows: [
        { key: 'pageViews', meta: 'perSale' },
        { key: 'custoPageView', meta: 'share' },
      ] },
      { label: 'Captação', rows: [
        { key: 'leads', meta: 'perSale' },
        { key: 'cpl', meta: 'share' },
        { key: 'mql', meta: 'perSale' },
        { key: 'cpmql', meta: 'share' },
      ] },
      { label: 'Vendas', rows: [
        { key: 'vendas' },
        { key: 'cac', meta: 'share' },
      ] },
      { label: 'Retorno', rows: [
        { key: 'faturamento' },
        { key: 'faturamentoLiquido', onlyWithTaxes: true },
        { key: 'roas' },
        { key: 'lucro' },
        { key: 'roi' },
      ] },
    ],
  },
  vendas: {
    id: 'vendas',
    label: 'Venda direta',
    description: 'Vende direto na página, com upsell. Low ticket.',
    inputs: [
      { key: 'cpm', label: 'CPM', unit: 'brl', dir: -1, min: 5, max: 150, step: 0.5, yields: 'impressoes',
        hint: 'Quanto custa mostrar o anúncio mil vezes' },
      { key: 'ctr', label: 'CTR', unit: 'pct', dir: 1, min: 0.001, max: 0.05, step: 0.0005, yields: 'cliques',
        hint: 'De cada 100 pessoas que veem o anúncio, quantas clicam' },
      { key: 'connect', label: 'Connect rate', unit: 'pct', dir: 1, min: 0.3, max: 1, step: 0.01, yields: 'pageViews',
        hint: 'Dos cliques, quantos chegam a carregar a página' },
      { key: 'checkout', label: 'Avanço para o checkout', unit: 'pct', dir: 1, min: 0.02, max: 0.8, step: 0.005, yields: 'checkouts',
        hint: 'Dos visitantes da página, quantos clicam em comprar' },
      { key: 'conversao', label: 'Conversão do checkout', unit: 'pct', dir: 1, min: 0.05, max: 1, step: 0.01, yields: 'vendas',
        hint: 'Dos que chegam ao checkout, quantos pagam' },
      { key: 'ticketFront', label: 'Ticket do produto principal', unit: 'brl', dir: 0,
        hint: 'Preço do produto front' },
      { key: 'up1', label: 'Conversão do upsell 1', unit: 'pct', dir: 1, min: 0, max: 0.5, step: 0.005, yields: 'vendasUp1',
        hint: 'Dos compradores, quantos levam o upsell 1' },
      { key: 'ticketUp1', label: 'Ticket do upsell 1', unit: 'brl', dir: 0 },
      { key: 'up2', label: 'Conversão do upsell 2', unit: 'pct', dir: 1, min: 0, max: 0.5, step: 0.005, yields: 'vendasUp2',
        hint: 'Dos compradores, quantos levam o upsell 2' },
      { key: 'ticketUp2', label: 'Ticket do upsell 2', unit: 'brl', dir: 0 },
      { key: 'down', label: 'Conversão do downsell', unit: 'pct', dir: 1, min: 0, max: 0.5, step: 0.005, yields: 'vendasDown',
        hint: 'Dos compradores, quantos levam o downsell' },
      { key: 'ticketDown', label: 'Ticket do downsell', unit: 'brl', dir: 0 },
    ],
    groups: [
      { label: 'Anúncio', keys: ['cpm', 'ctr'] },
      { label: 'Página e checkout', keys: ['connect', 'checkout', 'conversao', 'ticketFront'] },
      { label: 'Ofertas depois da compra', keys: ['up1', 'ticketUp1', 'up2', 'ticketUp2', 'down', 'ticketDown'], optional: true },
    ],
    defaults: {
      cpm: 30, ctr: 0.01, connect: 0.8, checkout: 0.35, conversao: 0.5, ticketFront: 37,
      up1: 0.05, ticketUp1: 497, up2: 0, ticketUp2: 0, down: 0, ticketDown: 0,
    },
    defaultInvestment: 700,
    results: [
      { label: 'Mídia', rows: [
        { key: 'investimento' },
        { key: 'impressoes', meta: 'perSale' },
        { key: 'cliques', meta: 'perSale' },
        { key: 'cpc', meta: 'share' },
      ] },
      { label: 'Página', rows: [
        { key: 'pageViews', meta: 'perSale' },
        { key: 'custoPageView', meta: 'share' },
      ] },
      { label: 'Checkout', rows: [
        { key: 'checkouts', meta: 'perSale' },
        { key: 'custoCheckout', meta: 'share' },
      ] },
      { label: 'Vendas', rows: [
        { key: 'vendas', label: 'Vendas front', meta: 'revenue', offer: 'front' },
        { key: 'cac', meta: 'share' },
        { key: 'convPagina' },
        { key: 'vendasUp1', meta: 'revenue', offer: 'up1' },
        { key: 'vendasUp2', meta: 'revenue', offer: 'up2' },
        { key: 'vendasDown', meta: 'revenue', offer: 'down' },
        { key: 'pedidos' },
        { key: 'cpaGlobal', meta: 'shareAvg' },
        { key: 'ticketMedio' },
      ] },
      { label: 'Retorno', rows: [
        { key: 'faturamento' },
        { key: 'faturamentoLiquido', onlyWithTaxes: true },
        { key: 'roas' },
        { key: 'lucro' },
        { key: 'roi' },
      ] },
    ],
  },
};

// Rótulos e formato de cada indicador.
export const KPI = {
  investimento: { label: 'Investimento', fmt: 'brl' },
  impressoes: { label: 'Impressões', fmt: 'int' },
  cliques: { label: 'Cliques', fmt: 'int' },
  cpc: { label: 'CPC', fmt: 'brl' },
  pageViews: { label: 'Visualizações de página', fmt: 'int' },
  custoPageView: { label: 'Custo por visualização', fmt: 'brl' },
  leads: { label: 'Leads', fmt: 'int' },
  cpl: { label: 'CPL', fmt: 'brl', lowerIsBetter: true },
  mql: { label: 'MQLs', fmt: 'int' },
  cpmql: { label: 'Custo por MQL', fmt: 'brl', lowerIsBetter: true },
  checkouts: { label: 'Checkouts', fmt: 'int' },
  custoCheckout: { label: 'Custo por checkout', fmt: 'brl', lowerIsBetter: true },
  vendas: { label: 'Vendas', fmt: 'qty' },
  vendasUp1: { label: 'Vendas upsell 1', fmt: 'qty' },
  vendasUp2: { label: 'Vendas upsell 2', fmt: 'qty' },
  vendasDown: { label: 'Vendas downsell', fmt: 'qty' },
  pedidos: { label: 'Pedidos totais', hint: 'Front + upsells + downsell', fmt: 'qty' },
  convPagina: { label: 'Conversão da página', hint: 'Vendas front ÷ visualizações', fmt: 'pct' },
  cac: { label: 'CAC', fmt: 'brl', lowerIsBetter: true },
  cpaGlobal: { label: 'CPA global', hint: 'Investimento ÷ pedidos totais', fmt: 'brl', lowerIsBetter: true },
  ticketMedio: { label: 'Ticket médio', fmt: 'brl' },
  faturamento: { label: 'Faturamento bruto', fmt: 'brl' },
  faturamentoLiquido: { label: 'Faturamento líquido', hint: 'Depois de taxas e impostos', fmt: 'brl' },
  roas: { label: 'ROAS', fmt: 'x' },
  lucro: { label: 'Lucro do projeto', hint: 'Faturamento líquido − investimento', fmt: 'brl' },
  roi: { label: 'ROI', fmt: 'x' },
  roasEquilibrio: { label: 'ROAS de equilíbrio', fmt: 'x' },
};

const div = (a, b) => (b > 0 && Number.isFinite(a) ? a / b : NaN);

/**
 * Calcula o funil para um investimento.
 * @param {string} funnelId 'leads' | 'vendas'
 * @param {object} p premissas (taxas em fração)
 * @param {number} investimento em R$
 * @param {number} taxas fração do faturamento que vai para plataforma/impostos
 */
export function compute(funnelId, p, investimento, taxas = 0) {
  const inv = Math.max(0, investimento || 0);
  const impressoes = p.cpm > 0 ? (inv / p.cpm) * 1000 : 0;
  const cliques = impressoes * p.ctr;
  const pageViews = cliques * p.connect;
  const base = {
    investimento: inv,
    impressoes,
    cliques,
    cpc: div(inv, cliques),
    pageViews,
    custoPageView: div(inv, pageViews),
  };

  let k;
  let stages;
  if (funnelId === 'leads') {
    const leads = pageViews * p.cadastro;
    const mql = leads * p.qualificacao;
    const vendas = mql * p.conversao;
    const faturamento = vendas * p.ticket;
    k = {
      ...base,
      leads,
      cpl: div(inv, leads),
      mql,
      cpmql: div(inv, mql),
      vendas,
      pedidos: vendas,
      cac: div(inv, vendas),
      ticketMedio: p.ticket,
      faturamento,
    };
    stages = [
      { key: 'impressoes', label: 'Impressões', value: impressoes, rate: null },
      { key: 'cliques', label: 'Cliques', value: cliques, rate: p.ctr, rateLabel: 'CTR' },
      { key: 'pageViews', label: 'Visualizações de página', value: pageViews, rate: p.connect, rateLabel: 'Connect rate' },
      { key: 'leads', label: 'Leads', value: leads, rate: p.cadastro, rateLabel: 'Cadastro' },
      { key: 'mql', label: 'MQLs', value: mql, rate: p.qualificacao, rateLabel: 'Qualificação' },
      { key: 'vendas', label: 'Vendas', value: vendas, rate: p.conversao, rateLabel: 'Conversão' },
    ];
    k.ticketRef = p.ticket;
    k.extras = [];
  } else {
    const checkouts = pageViews * p.checkout;
    const vendas = checkouts * p.conversao;
    const vendasUp1 = vendas * p.up1;
    const vendasUp2 = vendas * p.up2;
    const vendasDown = vendas * p.down;
    const pedidos = vendas + vendasUp1 + vendasUp2 + vendasDown;
    const fatFront = vendas * p.ticketFront;
    const fatUp1 = vendasUp1 * p.ticketUp1;
    const fatUp2 = vendasUp2 * p.ticketUp2;
    const fatDown = vendasDown * p.ticketDown;
    const faturamento = fatFront + fatUp1 + fatUp2 + fatDown;
    k = {
      ...base,
      checkouts,
      custoCheckout: div(inv, checkouts),
      vendas,
      vendasUp1,
      vendasUp2,
      vendasDown,
      pedidos,
      convPagina: div(vendas, pageViews),
      cac: div(inv, vendas),
      cpaGlobal: div(inv, pedidos),
      ticketMedio: div(faturamento, pedidos),
      faturamento,
    };
    stages = [
      { key: 'impressoes', label: 'Impressões', value: impressoes, rate: null },
      { key: 'cliques', label: 'Cliques', value: cliques, rate: p.ctr, rateLabel: 'CTR' },
      { key: 'pageViews', label: 'Visualizações de página', value: pageViews, rate: p.connect, rateLabel: 'Connect rate' },
      { key: 'checkouts', label: 'Checkouts', value: checkouts, rate: p.checkout, rateLabel: 'Avanço' },
      { key: 'vendas', label: 'Vendas front', value: vendas, rate: p.conversao, rateLabel: 'Conversão' },
    ];
    k.ticketRef = p.ticketFront;
    k.extras = [
      { key: 'front', label: 'Produto front', qty: vendas, rate: null, ticket: p.ticketFront, revenue: fatFront },
      { key: 'up1', label: 'Upsell 1', qty: vendasUp1, rate: p.up1, ticket: p.ticketUp1, revenue: fatUp1 },
      { key: 'up2', label: 'Upsell 2', qty: vendasUp2, rate: p.up2, ticket: p.ticketUp2, revenue: fatUp2 },
      { key: 'down', label: 'Downsell', qty: vendasDown, rate: p.down, ticket: p.ticketDown, revenue: fatDown },
    ];
  }

  const t = Math.min(Math.max(taxas || 0, 0), 0.99);
  k.faturamentoLiquido = k.faturamento * (1 - t);
  k.roas = div(k.faturamento, inv);
  k.lucro = k.faturamentoLiquido - inv;
  k.roi = div(k.lucro, inv);
  k.roasEquilibrio = 1 / (1 - t);

  // Custo por unidade, quantidade necessária por venda e peso do custo no ticket.
  for (const s of stages) {
    s.costPer = div(inv, s.value);
    s.perSale = div(s.value, k.vendas);
    s.shareOfTicket = div(s.costPer, k.ticketRef);
  }
  k.stages = stages;
  return k;
}

/**
 * Investimento necessário para atingir uma meta.
 * O funil é linear no investimento, então basta dividir a meta pelo rendimento de R$ 1.
 * @returns {number} investimento (Infinity se a meta for inalcançável com essas taxas)
 */
export function investmentForGoal(funnelId, p, mode, goal, taxas = 0) {
  if (mode === 'investimento') return goal;
  const unit = compute(funnelId, p, 1, taxas);
  const perReal = mode === 'faturamento' ? unit.faturamento : unit.vendas;
  if (!(perReal > 0)) return Infinity;
  return goal / perReal;
}

/**
 * Aplica a variação de um cenário sobre as premissas do Conservador.
 * @param {number} variation fração (-0.1 = 10% pior, 0.1 = 10% melhor)
 */
export function deriveScenario(funnelId, base, variation) {
  const out = {};
  for (const input of FUNNELS[funnelId].inputs) {
    const v = base[input.key];
    if (input.dir === 1) out[input.key] = Math.min(1, Math.max(0, v * (1 + variation)));
    else if (input.dir === -1) out[input.key] = Math.max(0, v * (1 - variation));
    else out[input.key] = v;
  }
  return out;
}
