/**
 * Zakat Calculator — Standalone App
 * Client-side Islamic wealth tax calculator with localStorage + GitHub Gist sync.
 */

const App = (() => {
  'use strict';

  const STORAGE_KEY = 'zakat-calculator-data';
  const GIST_FILENAME = 'zakat-data.json';

  let data = {};
  let currentYear = new Date().getFullYear();
  let dirty = false;

  // ── Helpers ──────────────────────────────────────────────────────

  const currency = n => {
    const v = parseFloat(n) || 0;
    return v.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });
  };

  const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

  function markDirty() {
    dirty = true;
    showSyncStatus('Unsaved changes', '');
  }

  function showSyncStatus(text, cls) {
    const el = document.getElementById('sync-status');
    if (el) { el.textContent = text; el.className = 'sync-status ' + (cls || ''); }
  }

  // ── Data Structure ──────────────────────────────────────────────

  function ensureYear(year) {
    if (!data[year]) {
      data[year] = {
        hawlDate: '',
        nisabMethod: 'silver',
        goldPricePerGram: 120,
        silverPricePerGram: 1.40,
        usdToCAD: 1.40,
        personalBaseIncome: 0,
        bankAccounts: [],
        corpIncomeAdjustments: [],
        investments: [],
        preciousMetals: [],
        receivables: [],
        liabilities: [],
        zakatPayments: [],
      };
    }
    return data[year];
  }

  function yd() { return ensureYear(currentYear); }

  // ── Persistence ─────────────────────────────────────────────────

  function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    dirty = false;
    showSyncStatus('Saved locally', 'synced');
  }

  function loadLocal() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { data = JSON.parse(raw); } catch { data = {}; }
    }
    ensureYear(currentYear);
  }

  // ── GitHub Gist Sync ───────────────────────────────────────────

  function getGistToken() { return document.getElementById('gist-token')?.value?.trim() || localStorage.getItem('zakat-gist-token') || ''; }
  function getGistId() { return document.getElementById('gist-id')?.value?.trim() || localStorage.getItem('zakat-gist-id') || ''; }

  function saveGistCredentials() {
    const token = document.getElementById('gist-token')?.value?.trim();
    const id = document.getElementById('gist-id')?.value?.trim();
    if (token) localStorage.setItem('zakat-gist-token', token);
    if (id) localStorage.setItem('zakat-gist-id', id);
  }

  async function syncPush() {
    const token = getGistToken();
    const gistId = getGistId();
    if (!token || !gistId) { showSyncStatus('Set token & Gist ID first', 'error'); return; }
    saveGistCredentials();
    showSyncStatus('Pushing...', '');
    try {
      const resp = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: { [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) } } }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      saveLocal();
      showSyncStatus('Pushed to Gist', 'synced');
    } catch (e) {
      showSyncStatus(`Push failed: ${e.message}`, 'error');
    }
  }

  async function syncPull() {
    const token = getGistToken();
    const gistId = getGistId();
    if (!token || !gistId) { showSyncStatus('Set token & Gist ID first', 'error'); return; }
    saveGistCredentials();
    showSyncStatus('Pulling...', '');
    try {
      const resp = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: { Authorization: `token ${token}` },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const gist = await resp.json();
      const content = gist.files?.[GIST_FILENAME]?.content;
      if (!content) throw new Error('File not found in Gist');
      data = JSON.parse(content);
      ensureYear(currentYear);
      saveLocal();
      renderAll();
      showSyncStatus('Pulled from Gist', 'synced');
    } catch (e) {
      showSyncStatus(`Pull failed: ${e.message}`, 'error');
    }
  }

  async function createGist() {
    const token = getGistToken();
    if (!token) { showSyncStatus('Set token first', 'error'); return; }
    saveGistCredentials();
    showSyncStatus('Creating Gist...', '');
    try {
      const resp = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Zakat Calculator Data (private)',
          public: false,
          files: { [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) } },
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const gist = await resp.json();
      document.getElementById('gist-id').value = gist.id;
      localStorage.setItem('zakat-gist-id', gist.id);
      saveLocal();
      showSyncStatus('Gist created!', 'synced');
    } catch (e) {
      showSyncStatus(`Create failed: ${e.message}`, 'error');
    }
  }

  // ── Import / Export ─────────────────────────────────────────────

  function exportJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zakat-data-${currentYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const imported = JSON.parse(e.target.result);
        data = imported;
        ensureYear(currentYear);
        saveLocal();
        renderAll();
        showSyncStatus('Imported successfully', 'synced');
      } catch { showSyncStatus('Invalid JSON file', 'error'); }
    };
    reader.readAsText(file);
  }

  function importFromTaxApp(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const taxExport = JSON.parse(e.target.result);
        const year = taxExport.year || currentYear;
        const zk = ensureYear(year);

        if (taxExport.corpIncome) {
          const ci = taxExport.corpIncome;
          const net = round2((parseFloat(ci.grossIncome) || 0) - (parseFloat(ci.estimatedExpenses) || 0) - (parseFloat(ci.estimatedCorpTax) || 0));
          const existing = zk.corpIncomeAdjustments.find(c => c.name === ci.name);
          const entry = {
            id: existing?.id || 'tax-import-' + Date.now().toString(36),
            name: ci.name || 'Imported Corp',
            grossIncome: parseFloat(ci.grossIncome) || 0,
            estimatedExpenses: parseFloat(ci.estimatedExpenses) || 0,
            estimatedCorpTax: parseFloat(ci.estimatedCorpTax) || 0,
            netAfterTax: net,
            yourSharePercent: parseFloat(ci.yourSharePercent) || 100,
            yourZakatableAmount: round2(net * ((parseFloat(ci.yourSharePercent) || 100) / 100)),
            notes: 'Imported from Corp Tax Manager',
          };
          if (existing) {
            Object.assign(existing, entry);
          } else {
            zk.corpIncomeAdjustments.push(entry);
          }
        }

        saveLocal();
        renderAll();
        showSyncStatus(`Imported tax data for ${year}`, 'synced');
      } catch (err) {
        showSyncStatus('Invalid tax export file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  // ── Tab Navigation ──────────────────────────────────────────────

  function switchTab(tab) {
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    const section = document.getElementById('tab-' + tab);
    const btn = document.querySelector(`nav button[data-tab="${tab}"]`);
    if (section) section.classList.add('active');
    if (btn) btn.classList.add('active');

    if (tab === 'dashboard') renderDashboard();
    if (tab === 'assets') renderAssets();
    if (tab === 'deductions') renderDeductions();
    if (tab === 'payments') renderPayments();
  }

  // ── Year Selection ──────────────────────────────────────────────

  function populateYearSelectors() {
    const years = Object.keys(data).filter(k => /^\d{4}$/.test(k)).sort().reverse();
    if (!years.includes(String(currentYear))) years.unshift(String(currentYear));
    const options = years.map(y => `<option value="${y}" ${y == currentYear ? 'selected' : ''}>${y}</option>`).join('');

    const main = document.getElementById('year-select');
    if (main) main.innerHTML = options;
    document.querySelectorAll('.year-select-mirror').forEach(sel => { sel.innerHTML = options; });
  }

  function onYearChange(year) {
    currentYear = parseInt(year);
    ensureYear(currentYear);
    populateYearSelectors();
    renderAll();
  }

  // ── Add Functions ───────────────────────────────────────────────

  function addBank() {
    const form = document.getElementById('zakat-bank-form');
    const item = {
      id: Date.now().toString(36),
      name: form.querySelector('[name="zk-bank-name"]').value.trim(),
      currency: form.querySelector('[name="zk-bank-currency"]').value,
      minBalance: parseFloat(form.querySelector('[name="zk-bank-balance"]').value) || 0,
    };
    if (!item.name) return;
    yd().bankAccounts.push(item);
    markDirty(); renderAssets();
    form.querySelectorAll('input').forEach(i => i.value = '');
  }

  function addCorp() {
    const form = document.getElementById('zakat-corp-form');
    const gross = parseFloat(form.querySelector('[name="zk-corp-gross"]').value) || 0;
    const expenses = parseFloat(form.querySelector('[name="zk-corp-expenses"]').value) || 0;
    const tax = parseFloat(form.querySelector('[name="zk-corp-tax"]').value) || 0;
    const net = gross - expenses - tax;
    const share = parseFloat(form.querySelector('[name="zk-corp-share"]').value) || 100;
    const item = {
      id: Date.now().toString(36),
      name: form.querySelector('[name="zk-corp-name"]').value.trim(),
      grossIncome: gross, estimatedExpenses: expenses, estimatedCorpTax: tax,
      netAfterTax: round2(net),
      yourSharePercent: share,
      yourZakatableAmount: round2(net * share / 100),
    };
    if (!item.name) return;
    yd().corpIncomeAdjustments.push(item);
    markDirty(); renderAssets();
    form.querySelectorAll('input:not([name="zk-corp-share"])').forEach(i => i.value = '');
  }

  function addInvestment() {
    const form = document.getElementById('zakat-inv-form');
    const item = {
      id: Date.now().toString(36),
      account: form.querySelector('[name="zk-inv-account"]').value.trim(),
      accountType: form.querySelector('[name="zk-inv-type"]').value,
      currency: form.querySelector('[name="zk-inv-currency"]').value,
      marketValue: parseFloat(form.querySelector('[name="zk-inv-value"]').value) || 0,
      debtRatioPercent: parseFloat(form.querySelector('[name="zk-inv-debt"]').value) || 0,
    };
    if (!item.account) return;
    yd().investments.push(item);
    markDirty(); renderAssets();
    form.querySelectorAll('input').forEach(i => i.value = '');
    form.querySelector('[name="zk-inv-debt"]').value = '0';
  }

  function addMetal() {
    const form = document.getElementById('zakat-metals-form');
    const item = {
      id: Date.now().toString(36),
      type: form.querySelector('[name="zk-metal-type"]').value,
      description: form.querySelector('[name="zk-metal-desc"]').value.trim(),
      weightGrams: parseFloat(form.querySelector('[name="zk-metal-weight"]').value) || 0,
      purity: parseFloat(form.querySelector('[name="zk-metal-purity"]').value) || 1,
    };
    if (!item.description) return;
    yd().preciousMetals.push(item);
    markDirty(); renderAssets();
    form.querySelectorAll('input').forEach(i => i.value = '');
    form.querySelector('[name="zk-metal-purity"]').value = '1.00';
  }

  function addReceivable() {
    const form = document.getElementById('zakat-recv-form');
    const item = {
      id: Date.now().toString(36),
      description: form.querySelector('[name="zk-recv-desc"]').value.trim(),
      amount: parseFloat(form.querySelector('[name="zk-recv-amount"]').value) || 0,
      currency: form.querySelector('[name="zk-recv-currency"]').value,
      likelihood: form.querySelector('[name="zk-recv-likelihood"]').value,
    };
    if (!item.description) return;
    yd().receivables.push(item);
    markDirty(); renderAssets();
    form.querySelectorAll('input').forEach(i => i.value = '');
  }

  function addLiability() {
    const form = document.getElementById('zakat-liab-form');
    const item = {
      id: Date.now().toString(36),
      description: form.querySelector('[name="zk-liab-desc"]').value.trim(),
      amount: parseFloat(form.querySelector('[name="zk-liab-amount"]').value) || 0,
    };
    if (!item.description) return;
    yd().liabilities.push(item);
    markDirty(); renderDeductions();
    form.querySelectorAll('input').forEach(i => i.value = '');
  }

  function addPayment() {
    const form = document.getElementById('zakat-payment-form');
    const item = {
      id: Date.now().toString(36),
      date: form.querySelector('[name="zk-pay-date"]').value,
      recipient: form.querySelector('[name="zk-pay-recipient"]').value.trim(),
      amount: parseFloat(form.querySelector('[name="zk-pay-amount"]').value) || 0,
    };
    if (!item.date || !item.recipient) return;
    yd().zakatPayments.push(item);
    markDirty(); renderPayments();
    form.querySelectorAll('input').forEach(i => i.value = '');
  }

  function removeItem(collection, id) {
    const zk = yd();
    if (zk[collection]) {
      zk[collection] = zk[collection].filter(i => i.id !== id);
      markDirty();
      renderAll();
    }
  }

  // ── Render Helpers ──────────────────────────────────────────────

  function renderList(containerId, items, collection, formatFn) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!items || items.length === 0) {
      el.innerHTML = '<div class="empty-state"><p>None added yet.</p></div>';
      return;
    }
    el.innerHTML = items.map(i => `
      <div class="list-item">
        <span style="font-size:0.85rem">${formatFn(i)}</span>
        <button class="btn btn-sm btn-danger" onclick="App.removeItem('${collection}','${i.id}')">X</button>
      </div>
    `).join('');
  }

  // ── Render: Dashboard ──────────────────────────────────────────

  function renderDashboard() {
    const zk = yd();
    const result = ZakatEngine.calcFullZakat(zk);
    if (!result) return;

    const statsEl = document.getElementById('dashboard-stats');
    if (statsEl) {
      const statusClass = result.exceedsNisab ? (result.zakatRemaining > 0 ? 'owing' : 'refund') : 'neutral';
      statsEl.innerHTML = `
        <div class="stat-card neutral">
          <div class="label">Total Assets</div>
          <div class="value">${currency(result.assets.totalAssets)}</div>
        </div>
        <div class="stat-card neutral">
          <div class="label">Liabilities</div>
          <div class="value">${currency(result.liabilities.total)}</div>
        </div>
        <div class="stat-card neutral">
          <div class="label">Net Zakatable</div>
          <div class="value">${currency(result.netZakatable)}</div>
          <div class="sub">Nisab: ${currency(result.nisab.activeNisab)} (${result.nisab.method})</div>
        </div>
        <div class="stat-card ${result.exceedsNisab ? 'owing' : 'neutral'}">
          <div class="label">Zakat Owing (2.5%)</div>
          <div class="value">${currency(result.zakatOwing)}</div>
        </div>
        <div class="stat-card neutral">
          <div class="label">Payments Made</div>
          <div class="value">${currency(result.payments.total)}</div>
        </div>
        <div class="stat-card ${statusClass}">
          <div class="label">${result.zakatRemaining > 0 ? 'Remaining to Pay' : 'Fully Paid'}</div>
          <div class="value">${currency(Math.abs(result.zakatRemaining))}</div>
        </div>
      `;
    }

    renderNisab(result, zk);
    renderFullSummary(result);
  }

  function renderNisab(result, zk) {
    const el = document.getElementById('nisab-display');
    if (!el) return;
    el.innerHTML = `
      <div class="summary-line"><span class="label">Gold Nisab (85g × ${currency(zk.goldPricePerGram || 0)}/g)</span><span class="value">${currency(result.nisab.goldNisab)}</span></div>
      <div class="summary-line"><span class="label">Silver Nisab (595g × ${currency(zk.silverPricePerGram || 0)}/g)</span><span class="value">${currency(result.nisab.silverNisab)}</span></div>
      <div class="summary-line" style="font-weight:600"><span class="label">Active Nisab (${result.nisab.method})</span><span class="value">${currency(result.nisab.activeNisab)}</span></div>
    `;
  }

  function renderFullSummary(result) {
    const el = document.getElementById('zakat-summary');
    if (!el) return;

    const statusClass = result.exceedsNisab ? (result.zakatRemaining > 0 ? 'owing' : 'refund') : 'refund';

    el.innerHTML = `
      <div class="summary-grid" style="grid-template-columns:1fr 1fr">
        <div>
          <h3 style="margin:0 0 0.5rem;color:var(--primary)">Assets</h3>
          <div class="summary-line"><span class="label">Bank Accounts</span><span class="value">${currency(result.assets.banks.total)}</span></div>
          <div class="summary-line"><span class="label">Corp Income (after tax, your share)</span><span class="value">${currency(result.assets.corpIncome.total)}</span></div>
          <div class="summary-line"><span class="label">Investments (debt-adjusted)</span><span class="value">${currency(result.assets.investments.total)}</span></div>
          <div class="summary-line"><span class="label">Precious Metals</span><span class="value">${currency(result.assets.preciousMetals.total)}</span></div>
          <div class="summary-line"><span class="label">Receivables</span><span class="value">${currency(result.assets.receivables.total)}</span></div>
          <div class="summary-line" style="font-weight:600;border-top:2px solid var(--border);padding-top:0.4rem;margin-top:0.4rem">
            <span class="label">Total Assets</span><span class="value">${currency(result.assets.totalAssets)}</span>
          </div>
        </div>
        <div>
          <h3 style="margin:0 0 0.5rem;color:var(--danger)">Deductions & Result</h3>
          <div class="summary-line"><span class="label">Liabilities</span><span class="value" style="color:var(--danger)">-${currency(result.liabilities.total)}</span></div>
          <div class="summary-line" style="font-weight:600;border-top:2px solid var(--border);padding-top:0.4rem;margin-top:0.4rem">
            <span class="label">Net Zakatable Wealth</span><span class="value">${currency(result.netZakatable)}</span>
          </div>
          <div class="summary-line"><span class="label">Nisab Threshold</span><span class="value">${currency(result.nisab.activeNisab)}</span></div>
          <div class="summary-line"><span class="label">Exceeds Nisab?</span><span class="value" style="color:${result.exceedsNisab ? 'var(--success)' : 'var(--text-secondary)'}">${result.exceedsNisab ? 'YES — Zakat is due' : 'NO — Below nisab'}</span></div>
          ${result.exceedsNisab ? `
            <div class="summary-line" style="font-weight:600;font-size:1.1rem;margin-top:0.5rem">
              <span class="label">Zakat Owing (2.5%)</span><span class="value" style="color:var(--primary)">${currency(result.zakatOwing)}</span>
            </div>
            <div class="summary-line"><span class="label">Payments Made</span><span class="value" style="color:var(--success)">${currency(result.payments.total)}</span></div>
            <div class="summary-line total ${statusClass}">
              <span class="label">${result.zakatRemaining > 0 ? 'Remaining to Pay' : 'Fully Paid'}</span>
              <span class="value">${currency(Math.abs(result.zakatRemaining))}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // ── Render: Assets ─────────────────────────────────────────────

  function renderAssets() {
    populateSettings();
    const zk = yd();
    const fx = parseFloat(zk.usdToCAD) || 1.40;
    const goldP = parseFloat(zk.goldPricePerGram) || 120;
    const silverP = parseFloat(zk.silverPricePerGram) || 1.40;

    renderList('bank-list', zk.bankAccounts, 'bankAccounts',
      i => `${i.name} — ${i.currency} ${currency(i.minBalance)}${i.currency === 'USD' ? ` (≈ ${currency(i.minBalance * fx)} CAD)` : ''}`);

    renderList('corp-list', zk.corpIncomeAdjustments, 'corpIncomeAdjustments',
      i => {
        const net = (parseFloat(i.grossIncome)||0) - (parseFloat(i.estimatedExpenses)||0) - (parseFloat(i.estimatedCorpTax)||0);
        const share = (parseFloat(i.yourSharePercent)||100)/100;
        return `${i.name} — Gross: ${currency(i.grossIncome)}, Net after tax: ${currency(net)}, Your ${i.yourSharePercent}%: <strong>${currency(net * share)}</strong>`;
      });

    renderList('inv-list', zk.investments, 'investments',
      i => {
        const mv = parseFloat(i.marketValue) || 0;
        const fxR = i.currency === 'USD' ? fx : 1;
        const mvCAD = mv * fxR;
        const debt = (parseFloat(i.debtRatioPercent)||0)/100;
        const zakatable = mvCAD * (1 - debt);
        return `${i.account} (${i.accountType}) — ${i.currency} ${currency(mv)}${i.currency === 'USD' ? ` → ${currency(mvCAD)} CAD` : ''}, Debt: ${i.debtRatioPercent||0}%, Zakatable: <strong>${currency(zakatable)}</strong>`;
      });

    renderList('metals-list', zk.preciousMetals, 'preciousMetals',
      i => {
        const pure = (parseFloat(i.weightGrams)||0) * (parseFloat(i.purity)||1);
        const price = i.type === 'gold' ? goldP : silverP;
        return `${i.description} — ${i.weightGrams}g × ${i.purity} purity = ${pure.toFixed(1)}g pure ${i.type}, Value: <strong>${currency(pure * price)}</strong>`;
      });

    renderList('recv-list', zk.receivables, 'receivables',
      i => {
        const fxR = i.currency === 'USD' ? fx : 1;
        return `${i.description} — ${i.currency || 'CAD'} ${currency(i.amount)}${i.currency === 'USD' ? ` (≈ ${currency(i.amount * fxR)} CAD)` : ''} (${i.likelihood})`;
      });
  }

  // ── Render: Deductions ─────────────────────────────────────────

  function renderDeductions() {
    const zk = yd();

    renderList('liab-list', zk.liabilities, 'liabilities',
      i => `${i.description} — ${currency(i.amount)}`);

    const result = ZakatEngine.calcFullZakat(zk);
    const previewEl = document.getElementById('deductions-preview');
    if (previewEl && result) {
      previewEl.innerHTML = `
        <div class="summary-line"><span class="label">Total Assets</span><span class="value">${currency(result.assets.totalAssets)}</span></div>
        <div class="summary-line"><span class="label">Total Liabilities</span><span class="value" style="color:var(--danger)">-${currency(result.liabilities.total)}</span></div>
        <div class="summary-line total"><span class="label">Net Zakatable Wealth</span><span class="value">${currency(result.netZakatable)}</span></div>
        <div class="summary-line"><span class="label">Exceeds Nisab (${currency(result.nisab.activeNisab)})?</span><span class="value" style="color:${result.exceedsNisab ? 'var(--success)' : 'var(--text-secondary)'}">${result.exceedsNisab ? 'YES' : 'NO'}</span></div>
        ${result.exceedsNisab ? `<div class="summary-line" style="font-weight:600"><span class="label">Zakat Owing (2.5%)</span><span class="value" style="color:var(--primary)">${currency(result.zakatOwing)}</span></div>` : ''}
      `;
    }
  }

  // ── Render: Payments ───────────────────────────────────────────

  function renderPayments() {
    const zk = yd();

    renderList('payments-list', zk.zakatPayments, 'zakatPayments',
      i => `${i.date} — ${i.recipient}: ${currency(i.amount)}`);

    const result = ZakatEngine.calcFullZakat(zk);
    const summaryEl = document.getElementById('payment-summary');
    if (summaryEl && result) {
      const statusClass = result.zakatRemaining > 0 ? 'owing' : 'refund';
      summaryEl.innerHTML = `
        <div class="summary-line"><span class="label">Zakat Owing</span><span class="value">${currency(result.zakatOwing)}</span></div>
        <div class="summary-line"><span class="label">Total Payments</span><span class="value" style="color:var(--success)">${currency(result.payments.total)}</span></div>
        <div class="summary-line total ${statusClass}">
          <span class="label">${result.zakatRemaining > 0 ? 'Remaining to Pay' : 'Overpaid / Fully Paid'}</span>
          <span class="value">${currency(Math.abs(result.zakatRemaining))}</span>
        </div>
      `;
    }
  }

  // ── Settings Population ────────────────────────────────────────

  function populateSettings() {
    const zk = yd();
    const form = document.getElementById('zakat-settings-form');
    if (!form) return;
    form.querySelector('[name="zk-hawl-date"]').value = zk.hawlDate || '';
    form.querySelector('[name="zk-nisab-method"]').value = zk.nisabMethod || 'silver';
    form.querySelector('[name="zk-gold-price"]').value = zk.goldPricePerGram || '';
    form.querySelector('[name="zk-silver-price"]').value = zk.silverPricePerGram || '';
    form.querySelector('[name="zk-usd-rate"]').value = zk.usdToCAD || '1.40';
    form.querySelector('[name="zk-base-income"]').value = zk.personalBaseIncome || '';

    const tokenEl = document.getElementById('gist-token');
    const idEl = document.getElementById('gist-id');
    if (tokenEl && !tokenEl.value) tokenEl.value = localStorage.getItem('zakat-gist-token') || '';
    if (idEl && !idEl.value) idEl.value = localStorage.getItem('zakat-gist-id') || '';
  }

  // ── Render All ─────────────────────────────────────────────────

  function renderAll() {
    populateYearSelectors();
    populateSettings();
    renderDashboard();
    renderAssets();
    renderDeductions();
    renderPayments();
  }

  // ── Init ───────────────────────────────────────────────────────

  function init() {
    loadLocal();
    populateYearSelectors();

    // Tab navigation
    document.querySelectorAll('nav button[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Year selectors
    document.getElementById('year-select').addEventListener('change', e => onYearChange(e.target.value));
    document.querySelectorAll('.year-select-mirror').forEach(sel => {
      sel.addEventListener('change', e => onYearChange(e.target.value));
    });

    // Settings form auto-save
    const settingsForm = document.getElementById('zakat-settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('input', () => {
        const zk = yd();
        zk.hawlDate = settingsForm.querySelector('[name="zk-hawl-date"]').value;
        zk.nisabMethod = settingsForm.querySelector('[name="zk-nisab-method"]').value;
        zk.goldPricePerGram = parseFloat(settingsForm.querySelector('[name="zk-gold-price"]').value) || 0;
        zk.silverPricePerGram = parseFloat(settingsForm.querySelector('[name="zk-silver-price"]').value) || 0;
        zk.usdToCAD = parseFloat(settingsForm.querySelector('[name="zk-usd-rate"]').value) || 1.40;
        zk.personalBaseIncome = parseFloat(settingsForm.querySelector('[name="zk-base-income"]').value) || 0;
        markDirty();
        renderDashboard();
      });
    }

    // Add buttons
    document.getElementById('btn-add-bank').addEventListener('click', addBank);
    document.getElementById('btn-add-corp').addEventListener('click', addCorp);
    document.getElementById('btn-add-inv').addEventListener('click', addInvestment);
    document.getElementById('btn-add-metal').addEventListener('click', addMetal);
    document.getElementById('btn-add-recv').addEventListener('click', addReceivable);
    document.getElementById('btn-add-liab').addEventListener('click', addLiability);
    document.getElementById('btn-add-payment').addEventListener('click', addPayment);

    // Persistence buttons
    document.getElementById('btn-save-local').addEventListener('click', saveLocal);
    document.getElementById('btn-export').addEventListener('click', exportJSON);
    document.getElementById('btn-import').addEventListener('click', () => document.getElementById('file-import').click());
    document.getElementById('file-import').addEventListener('change', e => { if (e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ''; });
    document.getElementById('btn-import-tax').addEventListener('click', () => document.getElementById('file-import-tax').click());
    document.getElementById('file-import-tax').addEventListener('change', e => { if (e.target.files[0]) importFromTaxApp(e.target.files[0]); e.target.value = ''; });

    // Gist sync
    document.getElementById('btn-sync-push').addEventListener('click', syncPush);
    document.getElementById('btn-sync-pull').addEventListener('click', syncPull);
    document.getElementById('btn-create-gist').addEventListener('click', createGist);

    // Token toggle
    document.getElementById('btn-toggle-token').addEventListener('click', () => {
      const inp = document.getElementById('gist-token');
      const btn = document.getElementById('btn-toggle-token');
      if (inp.type === 'password') { inp.type = 'text'; btn.textContent = 'Hide'; }
      else { inp.type = 'password'; btn.textContent = 'Show'; }
    });

    // Clear all
    document.getElementById('btn-clear-all').addEventListener('click', () => {
      if (confirm('This will permanently delete ALL zakat data. Are you sure?')) {
        data = {};
        ensureYear(currentYear);
        localStorage.removeItem(STORAGE_KEY);
        renderAll();
        showSyncStatus('All data cleared', '');
      }
    });

    // Auto-save reminder on leave
    window.addEventListener('beforeunload', e => {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    });

    renderAll();
    showSyncStatus('Loaded', 'synced');
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    removeItem,
    data: () => data,
  };

})();
