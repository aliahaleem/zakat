# Zakat Calculator — Developer Guide

> Concise reference for modifying and extending this app without AI assistance.

---

## Architecture Overview

```
zakat/
├── index.html        ← HTML structure (tabs, forms, containers)
├── styles.css        ← All styling (CSS variables at top)
├── zakat-engine.js   ← Pure calculation logic (no DOM, no state)
├── app.js            ← UI logic, state, persistence, rendering
├── sample-data.js    ← Embedded sample data (loaded via button)
├── DEV-GUIDE.md      ← This file
├── USAGE-GUIDE.md    ← End-user documentation
└── data/
    └── zakat-data-2025-starter.json  ← Importable sample JSON
```

### Key Design Decisions

- **No build tools** — plain HTML/CSS/JS, open `index.html` directly
- **No frameworks** — vanilla JS with IIFE module pattern
- **Engine separated from UI** — `zakat-engine.js` is pure functions, `app.js` handles DOM
- **Data keyed by year** — `data["2025"]` holds all zakat data for that year
- **localStorage + GitHub Gist** — dual persistence (local + cloud sync)

---

## Data Flow

```
User Input → app.js add*() → data[year].collection.push(item)
                            → markDirty() → auto-save (3s debounce)
                            → render*() → ZakatEngine.calcFullZakat(data[year])
                                        → DOM update
```

---

## How to Add a New Asset Category

Example: adding "Business Inventory" as a new zakatable asset.

### Step 1: Engine (`zakat-engine.js`)

Add a calculation function:

```javascript
function calcInventoryTotal(items = []) {
  const total = items.reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
  return { items, total: round2(total) };
}
```

Include it in `calcFullZakat()`:

```javascript
const inventory = calcInventoryTotal(zakatData.businessInventory);
// Add to totalAssets:
const totalAssets = round2(banks.total + corps.total + ... + inventory.total);
// Add to return object under assets:
assets: { banks, ..., inventory, totalAssets }
```

Export it in the `return { ... }` block.

### Step 2: Data Structure (`app.js`)

Add to `ensureYear()`:

```javascript
businessInventory: [],
```

### Step 3: HTML (`index.html`)

Add a form + list container inside the Assets section:

```html
<div class="card">
  <h2>Business Inventory</h2>
  <div id="inventory-form" class="form-row" style="...">
    <div class="form-group">
      <label>Description</label>
      <input type="text" name="zk-inv-desc">
    </div>
    <div class="form-group">
      <label>Value ($)</label>
      <input type="number" name="zk-inv-value" step="0.01">
    </div>
    <div class="form-group">
      <label>&nbsp;</label>
      <button class="btn btn-primary btn-sm" id="btn-add-inventory">Add</button>
    </div>
  </div>
  <div id="inventory-list"></div>
</div>
```

### Step 4: App Logic (`app.js`)

Add function:

```javascript
function addInventory() {
  const form = document.getElementById('inventory-form');
  const item = {
    id: Date.now().toString(36),
    description: form.querySelector('[name="zk-inv-desc"]').value.trim(),
    value: parseFloat(form.querySelector('[name="zk-inv-value"]').value) || 0,
  };
  if (!item.description || item.value <= 0) return;
  yd().businessInventory.push(item);
  markDirty(); renderAssets();
  form.querySelectorAll('input').forEach(i => i.value = '');
}
```

Add rendering in `renderAssets()`:

```javascript
renderList('inventory-list', zk.businessInventory, 'businessInventory',
  i => `${esc(i.description)} — ${currency(i.value)}`);
```

Wire in `init()`:

```javascript
document.getElementById('btn-add-inventory').addEventListener('click', addInventory);
```

### Step 5: Summary Display

Update `renderFullSummary()` to show the new line:

```javascript
<div class="summary-line"><span class="label">Business Inventory</span>
  <span class="value">${currency(result.assets.inventory.total)}</span></div>
```

### Step 6: Sample Data

Add to `sample-data.js` and `data/zakat-data-2025-starter.json`.

---

## How to Add a New Payment Method

### HTML (`index.html`)

Add an `<option>` to both the recipient form and payment form `<select>` elements:

```html
<option value="wise">Wise (TransferWise)</option>
```

### JS (`app.js`)

Add to `METHOD_LABELS`:

```javascript
'wise': 'Wise',
```

No other changes needed — methods are stored as strings.

---

## How to Add a New Recipient Category

### JS (`app.js`)

Add to `CAT_LABELS`:

```javascript
'dawah-org': 'Dawah Organization',
```

### HTML (`index.html`)

Add to the category `<select>` in the recipient form:

```html
<option value="dawah-org">Dawah Organization</option>
```

---

## How to Modify the Distribution Planner

The planner lives entirely in `app.js`:

| Function | Purpose |
|----------|---------|
| `generatePlan()` | Reads UI inputs, builds allocation form |
| `saveAllocationsAndGenerate()` | Reads allocations, generates the 10-day grid |
| `getNightWeights()` | Returns array of 10 weights based on strategy |
| `renderPlanGrid()` | Renders the HTML table with paid/pending status |

**To add a new distribution strategy** (e.g., "27th night only"):

1. Add option in `index.html`:
   ```html
   <option value="night-27-only">Night 27 Only (Laylatul Qadr)</option>
   ```
2. Add case in `getNightWeights()`:
   ```javascript
   } else if (strategy === 'night-27-only') {
     weights[6] = 1; // index 6 = night 27
   }
   ```

---

## File Reference

### `zakat-engine.js` — Pure Calculations

| Function | Input | Output |
|----------|-------|--------|
| `calcNisab(goldPrice, silverPrice, method)` | Prices per gram, 'gold'/'silver' | `{goldNisab, silverNisab, activeNisab, method}` |
| `calcBankAccountsTotal(accounts, usdToCAD)` | Array of account objects | `{items, total}` |
| `calcCorpIncomeTotal(corps)` | Array of corp income objects | `{items, total}` |
| `calcInvestmentsTotal(investments, usdToCAD)` | Array of investment objects | `{items, total}` |
| `calcPreciousMetalsTotal(metals, goldPrice, silverPrice)` | Array of metal objects | `{items, total}` |
| `calcReceivablesTotal(receivables, usdToCAD)` | Array of receivable objects | `{items, total}` |
| `calcLiabilitiesTotal(liabilities)` | Array of liability objects | `{items, total}` |
| `calcPaymentsTotal(payments)` | Array of payment objects | `{items, total, sadaqahTotal, grandTotal}` |
| `calcFullZakat(zakatData)` | Full year data object | Complete result with all totals |

### `app.js` — UI & State (sections in order)

| Section | Lines (approx) | Purpose |
|---------|---------------|---------|
| Helpers | 18–36 | `currency()`, `round2()`, `esc()`, `escAttr()`, `markDirty()` |
| Data Structure | 40–60 | `ensureYear()`, `yd()` |
| Persistence | 64–80 | `saveLocal()`, `loadLocal()` |
| Gist Sync | 82–165 | `syncPush()`, `syncPull()`, `createGist()` |
| Import/Export | 170–255 | `loadSampleData()`, `exportJSON()`, `importJSON()`, `importFromTaxApp()` |
| Tab Navigation | 260–280 | `switchTab()` |
| Year Selection | 285–300 | `populateYearSelectors()`, `onYearChange()` |
| Add Functions | 305–440 | One per data type: `addBank()`, `addCorp()`, etc. |
| Recipients | 450–500 | `addRecipient()`, `populateRecipientDropdowns()` |
| Distribution Planner | 505–650 | `generatePlan()`, `saveAllocationsAndGenerate()`, `getNightWeights()`, `renderPlanGrid()` |
| Render Helpers | 680–700 | `renderList()` |
| Render: Dashboard | 705–780 | `renderDashboard()`, `renderNisab()`, `renderFullSummary()` |
| Render: Assets | 800–845 | `renderAssets()` |
| Render: Deductions | 850–870 | `renderDeductions()` |
| Render: Payments | 875–960 | `renderPayments()`, `renderRecipientBreakdown()` |
| Settings | 970–990 | `populateSettings()` |
| Render All | 995–1005 | `renderAll()` |
| Init | 1010–1085 | Event binding, startup |

### CSS Variables (`styles.css` `:root`)

| Variable | Purpose |
|----------|---------|
| `--primary` | Green accent (#0d7a3e) |
| `--success` | Positive values |
| `--danger` | Negative/owing values |
| `--warning` | Caution states |
| `--info` | Informational (blue) |
| `--surface` / `--surface-alt` | Card and form backgrounds |
| `--border` | All borders |
| `--font` | Inter font stack |
| `--mono` | Monospace for currency values |

---

## Known Limitations (Future Work)

| Item | Effort | Impact |
|------|--------|--------|
| **Edit items** (currently delete + re-add) | Medium | High — most common user friction |
| **Hijri date support** | Medium | High — hawl is lunar-based (~354 days) |
| **Auto-fetch gold/silver/FX rates** | Low | Medium — reduces manual input error |
| **Liabilities currency field** | Low | Low — USD debts not modeled |
| **Investment account type rules** | Medium | Medium — RRSP has scholarly debate on treatment |
| **Zakat al-Fitr calculator** | Low | Medium — separate obligation before Eid |
| **Print/PDF report** | Low | Low — print CSS exists but needs polish |
| **Unit tests for engine** | Low | High — engine is pure functions, easy to test |
| **Split `app.js` into modules** | High | High — maintainability at scale |

---

## Testing Checklist

When making changes, verify:

- [ ] Import sample data → Dashboard shows numbers
- [ ] Add/remove item in each category → totals update
- [ ] Change year → data isolates per year
- [ ] Settings changes → Dashboard recalculates live
- [ ] Save Local → reload page → data persists
- [ ] Export JSON → re-import → identical state
- [ ] Distribution planner → generates grid, shows paid status
- [ ] Payment with type "sadaqah" → does NOT reduce zakat remaining
- [ ] Payment with type "zakat" → reduces zakat remaining
