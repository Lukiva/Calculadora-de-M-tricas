# Calculadora de resultado

Calculadora de metas do funil de vendas para o time de tráfego. Você define as premissas do funil (CPM, CTR, connect rate, taxas de cada etapa e tickets) e vê o resultado em três cenários lado a lado: **Pessimista**, **Conservador** e **Otimista**.

Baseada na planilha "[VR] Calculadora de Resultado", com as abas **Captura Lead** e **Vendas**.

## Como usar

O app guia em quatro passos, e a resposta aparece ao lado (no celular, numa barra no rodapé):

1. **Qual é o funil?** Captura de leads ou venda direta (com upsell 1, upsell 2 e downsell).
2. **O que você quer descobrir?** Quanto vai faturar com um investimento, quanto investir para bater uma meta de faturamento ou quanto investir para bater uma meta de vendas.
3. **Quais taxas você espera?** Cada taxa tem uma explicação simples, uma barra para arrastar e mostra o que ela gera ("Gera 500 cliques"). Esses números são o cenário conservador.
4. **Quanto pode variar?** Define quanto o pessimista piora e o otimista melhora cada taxa. Dá também para digitar as taxas de cada cenário à mão e incluir taxas da plataforma e impostos.

Na resposta:
- Uma frase com o número principal, a faixa do pessimista ao otimista e avisos de lucro ou prejuízo.
- Um card por cenário com os indicadores principais.
- O funil completo, etapa por etapa, com quanto de cada etapa é preciso por venda (o "Qtd. p/ venda" da planilha), quanto cada custo pesa no ticket (o "Represen.") e a diferença para o conservador.

Também dá para **exportar CSV** (abre no Excel/Google Sheets) e **copiar link** com a projeção inteira. Os valores ficam salvos no navegador.

## Fórmulas

| Indicador | Cálculo |
|---|---|
| Impressões | investimento ÷ CPM × 1.000 |
| Cliques | impressões × CTR |
| Visualizações de página | cliques × connect rate |
| Leads | visualizações × taxa de cadastro |
| MQLs | leads × taxa de qualificação |
| Vendas (leads) | MQLs × taxa de conversão |
| Checkouts | visualizações × avanço para checkout |
| Vendas front | checkouts × conversão do checkout |
| Upsells e downsell | vendas front × conversão da oferta |
| Faturamento bruto | soma de vendas × ticket de cada oferta |
| ROAS | faturamento bruto ÷ investimento |
| Lucro do projeto | faturamento bruto × (1 − taxas) − investimento |
| ROI | lucro ÷ investimento |
| CAC | investimento ÷ vendas (front) |
| CPA global | investimento ÷ pedidos totais |

Nas metas, o app divide a meta pelo que R$ 1 rende no funil (o funil é linear no investimento).

## Rodar no computador

Não tem build nem dependências. Basta servir a pasta:

```bash
npx serve .
# ou
python3 -m http.server 8000
```

Testes das fórmulas (conferem os números da planilha):

```bash
npm test
```

## Subir no GitHub e publicar na Vercel

1. Crie um repositório no GitHub e envie esta pasta:
   ```bash
   git init
   git add .
   git commit -m "Calculadora de resultado"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/calculadora-resultado.git
   git push -u origin main
   ```
2. Na Vercel, clique em **Add New → Project** e importe o repositório.
3. Em **Framework Preset** escolha **Other**. Deixe Build Command e Output Directory vazios.
4. Clique em **Deploy**. Cada push na `main` publica de novo.

## Estrutura

```
index.html        página
styles.css        visual (claro e escuro automático)
src/funnels.js    funis, fórmulas e cenários
src/format.js     formatação em pt-BR
src/app.js        interface e estado
tests/            testes das fórmulas
```

Para mudar premissas padrão, rótulos ou incluir uma etapa nova, edite `src/funnels.js`.
