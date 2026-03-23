# Zakat Calculator — Usage Guide

> Standalone Islamic wealth tax calculator.
> Runs entirely in your browser — no internet needed, no data leaves your computer.

---

## Table of Contents

1. [Opening the App](#1-opening-the-app)
2. [First-Time Setup](#2-first-time-setup)
3. [Dashboard](#3-dashboard)
4. [Zakat Settings](#4-zakat-settings)
5. [Bank Accounts](#5-bank-accounts)
6. [Corporate Income](#6-corporate-income)
7. [Investment Accounts](#7-investment-accounts)
8. [Precious Metals](#8-precious-metals)
9. [Receivables](#9-receivables)
10. [Liabilities (Deductions)](#10-liabilities-deductions)
11. [Zakat Payments](#11-zakat-payments)
12. [Saving Your Data](#12-saving-your-data)
13. [Multi-Computer Access (GitHub Gist)](#13-multi-computer-access-github-gist)
14. [Importing from Corp Tax Manager](#14-importing-from-corp-tax-manager)
15. [Annual Zakat Workflow](#15-annual-zakat-workflow)

---

## 1. Opening the App

**Option A — Double-click:**
Navigate to the `zakat` folder and double-click `index.html`.

**Option B — Terminal:**
```
open /Users/haleema1/IdeaProjects/rahman/zakat/index.html
```

---

## 2. First-Time Setup

### Load sample data

1. Click the **Settings** tab
2. Click **Import JSON**
3. Select `zakat/data/zakat-data-2025-starter.json`
4. All sample data loads — edit the values to match your actual balances

### Or import from the Corp Tax Manager

1. In the **Corp Tax Manager** app, go to Settings > **Export for Zakat App**
2. In this Zakat app, go to Settings > **Import from Tax App**
3. Select the exported file — corporate income data auto-populates

---

## 3. Dashboard

The dashboard shows 6 key numbers:

| Card | What it shows |
|------|--------------|
| **Total Assets** | Sum of all zakatable assets |
| **Liabilities** | Total debts |
| **Net Zakatable** | Assets minus liabilities |
| **Zakat Owing (2.5%)** | Amount owed (if above nisab) |
| **Payments Made** | Total zakat payments this year |
| **Remaining to Pay** | Balance still owed |

Below the cards:
- **Nisab Threshold** — shows gold and silver nisab values and which is active
- **Zakat Calculation Summary** — full breakdown of assets, deductions, and result

---

## 4. Zakat Settings

Located at the top of the **Assets** tab.

| Field | What to enter | Where to find it |
|-------|--------------|-----------------|
| Hawl Date | Your zakat anniversary date | When your wealth first exceeded nisab |
| Nisab Method | Silver (conservative, lower) or Gold (higher) | Silver is recommended |
| Gold $/gram | Current gold price per gram in CAD | kitco.com or goldprice.org |
| Silver $/gram | Current silver price per gram in CAD | Same sources |
| USD→CAD Rate | Exchange rate | Bank of Canada |
| Personal Base Income | Your pre-tax personal income | Management fee, salary, etc. |

---

## 5. Bank Accounts

**Tab:** Assets > Bank Accounts

Enter the **minimum balance** held in each account during the hawl year.

| Field | What to enter |
|-------|--------------|
| Account Name | e.g. "TD Joint Chequing" |
| Currency | CAD or USD |
| Min Balance | Lowest balance during the hawl year |

Use minimum balance (not current) for the most conservative calculation.

---

## 6. Corporate Income

**Tab:** Assets > Corporate Income

For each corporation you own or receive income from:

| Field | What to enter |
|-------|--------------|
| Corp Name | e.g. "Main Corp" |
| Gross Income | Total revenue for the year |
| Est. Expenses | Total deductible expenses |
| Est. Corp Tax | Estimated corporate tax |
| Your Share % | Your ownership percentage |

The app calculates: (Gross - Expenses - Tax) × Your Share % = your zakatable portion.

You can also auto-populate this by importing from the Corp Tax Manager (see section 14).

---

## 7. Investment Accounts

**Tab:** Assets > Investment Accounts

Enter each investment account's **market value at the hawl date**:

| Field | What to enter |
|-------|--------------|
| Account/Company | e.g. "Corp TD WebBroker" |
| Account Type | Corporate, Non-Registered, RRSP, or TFSA |
| Currency | CAD or USD (auto-converted) |
| Market Value | Current market value |
| Debt Ratio % | Company/fund debt-to-asset ratio |

**Debt ratio explained:** You only pay zakat on the portion backed by real assets (not debt). If a company has 30% debt ratio, only 70% is zakatable. For cash/GICs, use 0%. For index funds, ~25-35% is typical.

**RRSP note:** Scholars differ — conservative approach is to pay on full value yearly.

---

## 8. Precious Metals

**Tab:** Assets > Precious Metals

| Field | What to enter |
|-------|--------------|
| Type | Gold or Silver |
| Description | e.g. "18K jewelry", "Sterling silver set" |
| Weight (grams) | Total weight |
| Purity | 0 to 1 (24K=1.0, 18K=0.75, 14K=0.583, sterling silver=0.925) |

The app calculates: pure weight × price per gram = value.

---

## 9. Receivables

**Tab:** Assets > Receivables

Money owed to you (loans you gave, expected payments).

| Likelihood | Included? |
|------------|-----------|
| Certain | Yes |
| Likely | Yes |
| Doubtful | No (excluded) |

---

## 10. Liabilities (Deductions)

**Tab:** Deductions

Debts that reduce your zakatable wealth:

- Credit card balances at hawl date
- Unpaid bills and short-term debts
- Mortgage: only next 12 months of payments (not full balance; some scholars say no deduction)

---

## 11. Zakat Payments

**Tab:** Payments

Record each zakat payment you make:

| Field | What to enter |
|-------|--------------|
| Date | When you paid |
| Recipient | e.g. "Islamic Relief", "Local masjid" |
| Amount | Dollar amount |

The Payment Summary shows zakat owing minus payments = remaining balance.

---

## 12. Saving Your Data

### Save locally
Click **Save Local** (top-right). Data stored in browser localStorage.

### Export as file
Settings > **Export JSON** — downloads a backup file.

### Import from file
Settings > **Import JSON** — restores from a backup.

---

## 13. Multi-Computer Access (GitHub Gist)

### One-time setup

1. Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new?scopes=gist&description=Zakat+Calculator)
2. Check ONLY **gist** scope
3. Generate and copy the token
4. In the app, go to **Settings**
5. Paste the token
6. Click **Create New Gist**
7. Save the Gist ID somewhere safe

### On a new computer

1. Open the zakat app
2. Settings > enter token and Gist ID
3. Click **Pull from Gist**

### Daily workflow

| Action | When |
|--------|------|
| **Pull from Gist** | Opening on a different computer |
| **Save Local** | After entering data |
| **Push to Gist** | When done for the session |

---

## 14. Importing from Corp Tax Manager

The Corp Tax Manager app (`/rahman/tax/`) can export corporate income data for the Zakat app.

### How to import

1. Open the **Corp Tax Manager** app
2. Go to **Settings** tab
3. Click the green **Export for Zakat App** button
4. A JSON file downloads (e.g. `zakat-import-from-tax-2025.json`)
5. Open **this Zakat app**
6. Go to **Settings** tab
7. Click the blue **Import from Tax App** button
8. Select the exported file
9. The corporate income entry is created or updated

### What gets imported

- Corporation name
- Gross income, expenses, and estimated corporate tax
- Net after-tax amount and your ownership share
- If a corp with the same name already exists, it gets updated (not duplicated)

---

## 15. Annual Zakat Workflow

1. On or near your **hawl date**, gather all account balances
2. Check current **gold/silver prices** online
3. Open the Zakat app
4. Configure settings (prices, FX rate, nisab method)
5. Enter all **bank account minimum balances**
6. Import or enter **corporate income**
7. Enter **investment account market values** with debt ratios
8. Enter **precious metals** weights and purities
9. Enter **receivables** (money owed to you)
10. Enter **liabilities** (debts you owe)
11. Review the **Dashboard** for your zakat calculation
12. Pay zakat to eligible recipients
13. Record each **payment** in the Payments tab
14. **Save** and **Push to Gist**

---

## Quick Reference Card

```
OPEN:     Double-click zakat/index.html
IMPORT:   Settings > Import JSON > zakat-data-2025-starter.json
TAX DATA: Settings > Import from Tax App > select exported file
SAVE:     Save Local (top-right)
SYNC:     Push to Gist / Pull from Gist (Settings tab)
EXPORT:   Settings > Export JSON

ASSETS:   Assets tab > bank accounts, corp income, investments, metals, receivables
DEDUCT:   Deductions tab > liabilities
PAYMENTS: Payments tab > record zakat payments
VIEW:     Dashboard (summary + nisab + full breakdown)
```
