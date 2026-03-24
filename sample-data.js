const SAMPLE_DATA = {
  "2025": {
    "hawlDate": "2025-03-15",
    "nisabMethod": "silver",
    "goldPricePerGram": 120.00,
    "silverPricePerGram": 1.40,
    "usdToCAD": 1.40,
    "personalBaseIncome": 28000,

    "bankAccounts": [
      { "id": "bank-simplii", "name": "Simplii Chequing", "currency": "CAD", "minBalance": 5200, "notes": "Minimum held balance during hawl year." },
      { "id": "bank-td-joint", "name": "TD Joint Chequing", "currency": "CAD", "minBalance": 3100, "notes": "Joint account — include your portion." },
      { "id": "bank-paypal", "name": "PayPal", "currency": "USD", "minBalance": 150, "notes": "USD balance — converted to CAD automatically." },
      { "id": "bank-cash", "name": "Cash on Hand", "currency": "CAD", "minBalance": 500, "notes": "Estimated physical cash held." },
      { "id": "bank-td-corp", "name": "TD Corp Chequing", "currency": "CAD", "minBalance": 18000, "notes": "Corp account — zakatable portion after estimated tax." },
      { "id": "bank-nano-corp", "name": "Nano Corp Chequing", "currency": "CAD", "minBalance": 5000, "notes": "Second corporate account." }
    ],

    "corpIncomeAdjustments": [
      { "id": "corp-main", "name": "Main Corp (Ontario CCPC)", "grossIncome": 181120.45, "estimatedExpenses": 77374, "estimatedCorpTax": 36152, "netAfterTax": 67594.45, "yourSharePercent": 100, "yourZakatableAmount": 67594.45, "notes": "Use 'Import from Tax App' to auto-populate." },
      { "id": "corp-nano", "name": "Nano Corp", "grossIncome": 12000, "estimatedExpenses": 2000, "estimatedCorpTax": 1220, "netAfterTax": 8780, "yourSharePercent": 100, "yourZakatableAmount": 8780, "notes": "Second corporation." }
    ],

    "investments": [
      { "id": "inv-corp-td-cad", "account": "Corp TD WebBroker (CAD)", "accountType": "corporate", "currency": "CAD", "marketValue": 150000, "debtRatioPercent": 0, "notes": "Corp investment — CAD holdings." },
      { "id": "inv-corp-td-usd", "account": "Corp TD WebBroker (USD)", "accountType": "corporate", "currency": "USD", "marketValue": 50000, "debtRatioPercent": 0, "notes": "Corp investment — USD holdings." },
      { "id": "inv-rrsp", "account": "Personal RRSP", "accountType": "rrsp", "currency": "CAD", "marketValue": 25000, "debtRatioPercent": 0, "notes": "Conservative: pay on full value yearly." },
      { "id": "inv-tfsa", "account": "Personal TFSA", "accountType": "tfsa", "currency": "CAD", "marketValue": 8500, "debtRatioPercent": 0, "notes": "Most scholars say zakatable." },
      { "id": "inv-wealthsimple", "account": "Wealthsimple (Personal)", "accountType": "non-registered", "currency": "CAD", "marketValue": 4200, "debtRatioPercent": 25, "notes": "Debt ratio 25% → 75% zakatable." },
      { "id": "inv-corp-etf", "account": "Corp S&P 500 ETF (USD)", "accountType": "corporate", "currency": "USD", "marketValue": 30000, "debtRatioPercent": 30, "notes": "Index fund ~30% debt ratio → 70% zakatable." }
    ],

    "preciousMetals": [
      { "id": "gold-jewelry", "type": "gold", "description": "Gold jewelry (combined household)", "weightGrams": 50, "purity": 0.75, "notes": "18K = 75% purity." },
      { "id": "gold-coins", "type": "gold", "description": "Gold coins / bars", "weightGrams": 10, "purity": 1.0, "notes": "24K = 100% purity." },
      { "id": "silver-items", "type": "silver", "description": "Silver items (jewelry + utensils)", "weightGrams": 200, "purity": 0.925, "notes": "Sterling silver = 92.5% purity." }
    ],

    "receivables": [
      { "id": "recv-loan-friend", "description": "Loan to friend (Khalid)", "amount": 2000, "currency": "CAD", "likelihood": "certain", "notes": "Certain — included." },
      { "id": "recv-invoice-client", "description": "Outstanding client invoice", "amount": 5000, "currency": "CAD", "likelihood": "likely", "notes": "Likely — included." },
      { "id": "recv-old-debt", "description": "Old debt from acquaintance", "amount": 1500, "currency": "CAD", "likelihood": "doubtful", "notes": "Doubtful — excluded." }
    ],

    "liabilities": [
      { "id": "liab-cc-balance", "description": "Credit card balances due", "amount": 2800, "notes": "Outstanding CC balance at hawl date." },
      { "id": "liab-bills", "description": "Unpaid bills / short-term debts", "amount": 500, "notes": "Bills due within the month." },
      { "id": "liab-mortgage", "description": "Mortgage (next 12 months payments only)", "amount": 24000, "notes": "$2,000/mo × 12. Not total balance." },
      { "id": "liab-car-loan", "description": "Car loan (next 12 months payments)", "amount": 6000, "notes": "$500/mo × 12." }
    ],

    "recipients": [
      { "id": "rc-islamic-relief", "name": "Islamic Relief Canada", "category": "international-charity", "url": "https://www.islamicreliefcanada.org/zakat/", "method": "credit-card", "notes": "Visa/MC/Amex online. Tax receipt issued. CRA #: 821896875RR0001" },
      { "id": "rc-human-concern", "name": "Human Concern International", "category": "international-charity", "url": "https://www.humanconcern.org/zakat/", "method": "credit-card", "notes": "Ottawa-based. Tax receipt issued." },
      { "id": "rc-nzf", "name": "National Zakat Foundation Canada", "category": "local-charity", "url": "https://www.nzfcanada.com/", "method": "credit-card", "notes": "Distributes locally within Canada. Tax receipt issued." },
      { "id": "rc-local-masjid", "name": "Local Masjid Zakat Fund", "category": "local-masjid", "url": "", "method": "e-transfer", "notes": "E-transfer to zakat@masjid.com" },
      { "id": "rc-launchgood", "name": "LaunchGood Campaigns", "category": "online-platform", "url": "https://www.launchgood.com/discover#!explore/zakat", "method": "launchgood", "notes": "Filter by 'Zakat-eligible' campaigns." },
      { "id": "rc-family-member", "name": "Family Member (Eligible)", "category": "individual", "url": "", "method": "e-transfer", "notes": "Must be one of 8 categories. Not parents/children/spouse." },
      { "id": "rc-penny-appeal", "name": "Penny Appeal Canada", "category": "international-charity", "url": "https://pennyappeal.ca/zakat", "method": "credit-card", "notes": "Orphan care, water, food. Tax receipt issued." }
    ],

    "distributionPlan": null,

    "zakatPayments": [
      { "id": "zp-islamic-relief", "date": "2025-01-15", "recipient": "Islamic Relief Canada", "amount": 1000, "method": "credit-card", "notes": "Quarterly zakat payment." },
      { "id": "zp-local-masjid", "date": "2025-03-01", "recipient": "Local Masjid Zakat Fund", "amount": 500, "method": "e-transfer", "notes": "E-transfer during Ramadan." },
      { "id": "zp-family", "date": "2025-03-10", "recipient": "Family Member (Eligible)", "amount": 750, "method": "e-transfer", "notes": "Zakat to eligible family member." }
    ]
  }
};
