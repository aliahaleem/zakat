/**
 * Zakat Engine — Islamic Wealth Tax Calculations
 * Based on Hanafi fiqh as the most commonly followed methodology.
 * Nisab: 85g gold OR 595g silver (silver is more conservative / lower threshold).
 * Rate: 2.5% of net zakatable wealth above nisab.
 */

const ZakatEngine = (() => {

  const NISAB_GOLD_GRAMS = 85;
  const NISAB_SILVER_GRAMS = 595;
  const ZAKAT_RATE = 0.025;

  function calcNisab(goldPricePerGram, silverPricePerGram, method = 'silver') {
    const goldNisab = NISAB_GOLD_GRAMS * goldPricePerGram;
    const silverNisab = NISAB_SILVER_GRAMS * silverPricePerGram;
    return {
      goldNisab: round2(goldNisab),
      silverNisab: round2(silverNisab),
      activeNisab: round2(method === 'gold' ? goldNisab : silverNisab),
      method,
    };
  }

  function calcBankAccountsTotal(accounts = [], usdToCAD = 1.40) {
    let total = 0;
    const details = accounts.map(a => {
      const bal = parseFloat(a.minBalance) || 0;
      const fx = (a.currency === 'USD') ? usdToCAD : 1;
      const cadValue = round2(bal * fx);
      total += cadValue;
      return { ...a, cadValue };
    });
    return { items: details, total: round2(total) };
  }

  function calcCorpIncomeTotal(corps = []) {
    let total = 0;
    const details = corps.map(c => {
      const net = parseFloat(c.netAfterTax) || 0;
      const share = (parseFloat(c.yourSharePercent) || 0) / 100;
      const zakatable = round2(net * share);
      total += zakatable;
      return { ...c, yourZakatableAmount: zakatable };
    });
    return { items: details, total: round2(total) };
  }

  function calcInvestmentsTotal(investments = [], usdToCAD = 1.40) {
    let total = 0;
    const details = investments.map(inv => {
      const mv = parseFloat(inv.marketValue) || 0;
      const fx = (inv.currency === 'USD') ? usdToCAD : 1;
      const mvCAD = round2(mv * fx);
      const debtRatio = (parseFloat(inv.debtRatioPercent) || 0) / 100;
      const zakatablePercent = 1 - debtRatio;
      const zakatable = round2(mvCAD * zakatablePercent);
      total += zakatable;
      return {
        ...inv,
        marketValueCAD: mvCAD,
        zakatablePercent: round2(zakatablePercent * 100),
        zakatableValue: zakatable,
      };
    });
    return { items: details, total: round2(total) };
  }

  function calcPreciousMetalsTotal(metals = [], goldPrice, silverPrice) {
    let total = 0;
    const details = metals.map(m => {
      const weight = parseFloat(m.weightGrams) || 0;
      const purity = parseFloat(m.purity) || 1;
      const pureWeight = round2(weight * purity);
      const pricePerGram = m.type === 'gold' ? goldPrice : silverPrice;
      const value = round2(pureWeight * pricePerGram);
      total += value;
      return { ...m, pureWeightGrams: pureWeight, value };
    });
    return { items: details, total: round2(total) };
  }

  function calcReceivablesTotal(receivables = [], usdToCAD = 1.40) {
    let total = 0;
    const details = receivables.map(r => {
      const amt = parseFloat(r.amount) || 0;
      const fx = (r.currency === 'USD') ? usdToCAD : 1;
      const cadValue = round2(amt * fx);
      if (r.likelihood === 'certain' || r.likelihood === 'likely') {
        total += cadValue;
      }
      return { ...r, cadValue };
    });
    return { items: details, total: round2(total) };
  }

  function calcLiabilitiesTotal(liabilities = []) {
    const total = liabilities.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
    return { items: liabilities, total: round2(total) };
  }

  function calcPaymentsTotal(payments = []) {
    const total = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    return { items: payments, total: round2(total) };
  }

  function calcFullZakat(zakatData) {
    if (!zakatData) return null;

    const goldPrice = parseFloat(zakatData.goldPricePerGram) || 120;
    const silverPrice = parseFloat(zakatData.silverPricePerGram) || 1.40;
    const usdToCAD = parseFloat(zakatData.usdToCAD) || 1.40;
    const method = zakatData.nisabMethod || 'silver';

    const nisab = calcNisab(goldPrice, silverPrice, method);
    const banks = calcBankAccountsTotal(zakatData.bankAccounts, usdToCAD);
    const corps = calcCorpIncomeTotal(zakatData.corpIncomeAdjustments);
    const investments = calcInvestmentsTotal(zakatData.investments, usdToCAD);
    const metals = calcPreciousMetalsTotal(zakatData.preciousMetals, goldPrice, silverPrice);
    const receivables = calcReceivablesTotal(zakatData.receivables, usdToCAD);
    const liabilities = calcLiabilitiesTotal(zakatData.liabilities);
    const payments = calcPaymentsTotal(zakatData.zakatPayments);

    const totalAssets = round2(
      banks.total + corps.total + investments.total + metals.total + receivables.total
    );
    const netZakatable = round2(totalAssets - liabilities.total);
    const exceedsNisab = netZakatable >= nisab.activeNisab;
    const zakatOwing = exceedsNisab ? round2(netZakatable * ZAKAT_RATE) : 0;
    const zakatRemaining = round2(zakatOwing - payments.total);

    return {
      hawlDate: zakatData.hawlDate,
      nisab,
      assets: {
        banks,
        corpIncome: corps,
        investments,
        preciousMetals: metals,
        receivables,
        totalAssets,
      },
      liabilities,
      netZakatable,
      exceedsNisab,
      zakatRate: ZAKAT_RATE,
      zakatOwing,
      payments,
      zakatRemaining,
    };
  }

  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

  return {
    calcNisab,
    calcFullZakat,
    calcBankAccountsTotal,
    calcCorpIncomeTotal,
    calcInvestmentsTotal,
    calcPreciousMetalsTotal,
    calcReceivablesTotal,
    calcLiabilitiesTotal,
    calcPaymentsTotal,
    NISAB_GOLD_GRAMS,
    NISAB_SILVER_GRAMS,
    ZAKAT_RATE,
  };

})();
