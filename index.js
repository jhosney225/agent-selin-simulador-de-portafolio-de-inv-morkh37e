
```javascript
const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const readline = require("readline");

const client = new Anthropic();

// Portfolio data structure
let portfolio = {
  cash: 100000,
  assets: {
    AAPL: { shares: 10, costBasis: 150 },
    GOOGL: { shares: 5, costBasis: 2800 },
    MSFT: { shares: 8, costBasis: 300 },
  },
  transactions: [],
};

// Mock market data (in a real app, this would come from an API)
const marketPrices = {
  AAPL: 195.5,
  GOOGL: 2850.25,
  MSFT: 415.75,
  TSLA: 242.3,
  AMZN: 180.5,
};

// Tool implementations
function getPortfolioSummary() {
  const summary = {
    cash: portfolio.cash.toFixed(2),
    assets: {},
    totalValue: portfolio.cash,
  };

  for (const [symbol, holding] of Object.entries(portfolio.assets)) {
    const currentPrice = marketPrices[symbol] || 100;
    const value = holding.shares * currentPrice;
    const costValue = holding.shares * holding.costBasis;
    const gain = value - costValue;
    const gainPercent = ((gain / costValue) * 100).toFixed(2);

    summary.assets[symbol] = {
      shares: holding.shares,
      currentPrice: currentPrice.toFixed(2),
      currentValue: value.toFixed(2),
      costValue: costValue.toFixed(2),
      gain: gain.toFixed(2),
      gainPercent: gainPercent,
    };

    summary.totalValue += value;
  }

  summary.totalValue = summary.totalValue.toFixed(2);
  return summary;
}

function addTransaction(type, symbol, shares, price) {
  const transaction = {
    date: new Date().toISOString(),
    type,
    symbol,
    shares,
    price: parseFloat(price),
    total: shares * parseFloat(price),
  };

  portfolio.transactions.push(transaction);

  if (type === "BUY") {
    const cost = shares * parseFloat(price);
    if (portfolio.cash < cost) {
      return {
        success: false,
        message: "Insufficient cash for this purchase",
      };
    }

    portfolio.cash -= cost;
    if (!portfolio.assets[symbol]) {
      portfolio.assets[symbol] = { shares: 0, costBasis: 0 };
    }

    const oldValue = portfolio.assets[symbol].shares * portfolio.assets[symbol].costBasis;
    const newShares = portfolio.assets[symbol].shares + shares;
    portfolio.assets[symbol].costBasis = (oldValue + cost) / newShares;
    portfolio.assets[symbol].shares = newShares;

    return {
      success: true,
      message: `Bought ${shares} shares of ${symbol} at $${price} each`,
    };
  } else if (type === "SELL") {
    if (
      !portfolio.assets[symbol] ||
      portfolio.assets[symbol].shares < shares
    ) {
      return { success: false, message: "Insufficient shares to sell" };
    }

    const proceeds = shares * parseFloat(price);
    portfolio.cash += proceeds;
    portfolio.assets[symbol].shares -= shares;

    if (portfolio.assets[symbol].shares === 0) {
      delete portfolio.assets[symbol];
    }

    return {
      success: true,
      message: `Sold ${shares} shares of ${symbol} at $${price} each`,
    };
  }

  return { success: false, message: "Invalid transaction type" };
}

function generateChart(type = "portfolio") {
  if (type === "portfolio") {
    const summary = getPortfolioSummary();
    let chart = "\n📊 PORTFOLIO COMPOSITION\n";
    chart += "═".repeat(40) + "\n";

    const assets = Object.entries(summary.assets);
    const totalValue = parseFloat(summary.totalValue);
    const cashPercent = ((portfolio.cash / totalValue) * 100).toFixed(1);

    // Cash bar
    const cashBarLength = Math.round((parseFloat(cashPercent) / 100) * 30);
    chart += `💵 Cash: ${cashPercent}%\n`;
    chart += "▓".repeat(cashBarLength) + "░".repeat(30 - cashBarLength) + "\n";

    // Asset bars
    for (const [symbol, data] of assets) {
      const percent = ((parseFloat(data.currentValue) / totalValue) * 100).toFixed(1);
      const barLength = Math.round((parseFloat(percent) / 100) * 30);
      chart += `\n${symbol}: ${percent}%\n`;
      chart += "▓".repeat(barLength) + "░".repeat(30 - barLength) + "\n";
    }

    chart += "\n" + "═".repeat(40) + "\n";
    chart += `Total Portfolio Value: $${summary.totalValue}\n`;

    return chart;
  } else if (type === "performance") {
    const summary = getPortfolioSummary();
    let chart = "\n📈 ASSET PERFORMANCE\n";
    chart += "═".repeat(50) + "\n";
    chart += "Symbol | Current | Cost | Gain/Loss | Return %\n";
    chart += "─".repeat(50) + "\n";

    for (const [symbol, data] of Object.entries(summary.assets)) {
      const gain = parseFloat(data.gain);
      const arrow = gain >= 0 ? "📈" : "📉";
      chart += `${symbol.padEnd(6)} | $${parseFloat(data.currentPrice).toFixed(2).pad