// Confere o motor de cálculo com os números da planilha de referência.
// Rode com: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FUNNELS, compute, investmentForGoal, deriveScenario } from '../src/funnels.js';

const close = (actual, expected, tol = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= tol, `esperado ${expected}, veio ${actual}`);

test('Captura de leads bate com a aba "Captura Lead"', () => {
  const r = compute('leads', FUNNELS.leads.defaults, 1500);
  close(r.impressoes, 50000);
  close(r.cliques, 500);
  close(r.cpc, 3);
  close(r.pageViews, 400);
  close(r.custoPageView, 3.75);
  close(r.leads, 120);
  close(r.cpl, 12.5);
  close(r.mql, 120);
  close(r.cpmql, 12.5);
  close(r.vendas, 1.2);
  close(r.cac, 1250);
  close(r.roas, 3.2);
  close(r.faturamento, 4800);
  // "Qtd. p/ venda"
  close(r.stages[0].perSale, 41666.67);
  close(r.stages[1].perSale, 416.67);
  close(r.stages[2].perSale, 333.33);
  close(r.stages[3].perSale, 100);
});

test('Venda direta bate com a aba "Vendas"', () => {
  const r = compute('vendas', FUNNELS.vendas.defaults, 700);
  close(r.impressoes, 23333.33);
  close(r.cliques, 233.33);
  close(r.cpc, 3);
  close(r.pageViews, 186.67);
  close(r.custoPageView, 3.75);
  close(r.checkouts, 65.33);
  close(r.custoCheckout, 10.71);
  close(r.vendas, 32.67);
  close(r.cac, 21.43);
  close(r.convPagina, 0.175, 0.0001);
  close(r.vendasUp1, 1.63);
  close(r.faturamento, 2020.43);
  close(r.roas, 2.89);
  close(r.cpaGlobal, 20.41);
  close(r.ticketMedio, 58.9);
  close(r.lucro, 1320.43); // "Faturamento Líq. (Projeto)"
  // "Represen." = custo da etapa ÷ ticket front
  close(r.stages[1].shareOfTicket, 0.0811, 0.0001);
  close(r.stages[2].shareOfTicket, 0.1014, 0.0001);
  close(r.stages[3].shareOfTicket, 0.2896, 0.0001);
});

test('Meta de faturamento devolve o investimento que gera essa meta', () => {
  const p = FUNNELS.leads.defaults;
  const inv = investmentForGoal('leads', p, 'faturamento', 48000);
  close(inv, 15000);
  close(compute('leads', p, inv).faturamento, 48000);
});

test('Meta de vendas devolve o investimento que gera essas vendas', () => {
  const p = FUNNELS.vendas.defaults;
  const inv = investmentForGoal('vendas', p, 'vendas', 100);
  close(compute('vendas', p, inv).vendas, 100);
});

test('Meta inalcançável quando alguma taxa é zero', () => {
  const p = { ...FUNNELS.leads.defaults, conversao: 0 };
  assert.equal(investmentForGoal('leads', p, 'vendas', 10), Infinity);
});

test('Cenários: taxas sobem no otimista, CPM cai, ticket não muda, nada passa de 100%', () => {
  const base = FUNNELS.leads.defaults;
  const o = deriveScenario('leads', base, 0.1);
  close(o.ctr, 0.011, 1e-9);
  close(o.cpm, 27, 1e-9);
  assert.equal(o.ticket, 4000);
  assert.equal(o.qualificacao, 1);
  const pe = deriveScenario('leads', base, -0.1);
  close(pe.cpm, 33, 1e-9);
  close(pe.ctr, 0.009, 1e-9);
});

test('Taxas e impostos reduzem lucro e ROI', () => {
  const r = compute('vendas', FUNNELS.vendas.defaults, 700, 0.1);
  close(r.faturamentoLiquido, 1818.39);
  close(r.lucro, 1118.39);
  close(r.roasEquilibrio, 1.111, 0.001);
});
