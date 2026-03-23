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
        recipients: [],
        distributionPlan: null,
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
      const pullYears = Object.keys(data).filter(k => /^\d{4}$/.test(k)).sort().reverse();
      if (pullYears.length > 0 && !pullYears.includes(String(currentYear))) {
        currentYear = parseInt(pullYears[0]);
      }
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
        const dataYears = Object.keys(data).filter(k => /^\d{4}$/.test(k)).sort().reverse();
        if (dataYears.length > 0 && !dataYears.includes(String(currentYear))) {
          currentYear = parseInt(dataYears[0]);
        }
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
    const selectRecipient = form.querySelector('[name="zk-pay-recipient-select"]').value;
    const customRecipient = form.querySelector('[name="zk-pay-recipient"]').value.trim();
    const recipient = selectRecipient || customRecipient;
    const item = {
      id: Date.now().toString(36),
      date: form.querySelector('[name="zk-pay-date"]').value,
      recipient,
      amount: parseFloat(form.querySelector('[name="zk-pay-amount"]').value) || 0,
      method: form.querySelector('[name="zk-pay-method"]').value,
    };
    if (!item.date || !item.recipient) return;
    yd().zakatPayments.push(item);
    markDirty(); renderPayments();
    form.querySelectorAll('input').forEach(i => i.value = '');
    form.querySelector('[name="zk-pay-recipient-select"]').value = '';
    form.querySelector('[name="zk-pay-method"]').value = '';
  }

  // ── Recipients ──────────────────────────────────────────────────

  const METHOD_LABELS = {
    'credit-card': 'Credit Card', 'e-transfer': 'E-Transfer', 'paypal': 'PayPal',
    'bank-transfer': 'Bank Transfer', 'cash': 'Cash', 'cheque': 'Cheque',
    'launchgood': 'LaunchGood', 'gofundme': 'GoFundMe', 'other': 'Other',
  };

  const CAT_LABELS = {
    'international-charity': 'International Charity', 'local-masjid': 'Local Masjid',
    'local-charity': 'Local Charity', 'online-platform': 'Online Platform',
    'individual': 'Individual / Family', 'other': 'Other',
  };

  function addRecipient() {
    const form = document.getElementById('recipient-form');
    const item = {
      id: Date.now().toString(36),
      name: form.querySelector('[name="rc-name"]').value.trim(),
      category: form.querySelector('[name="rc-category"]').value,
      url: form.querySelector('[name="rc-url"]').value.trim(),
      method: form.querySelector('[name="rc-method"]').value,
      notes: form.querySelector('[name="rc-notes"]').value.trim(),
    };
    if (!item.name) return;
    if (!yd().recipients) yd().recipients = [];
    yd().recipients.push(item);
    markDirty(); renderPayments();
    form.querySelectorAll('input').forEach(i => i.value = '');
  }

  function populateRecipientDropdowns() {
    const recipients = yd().recipients || [];
    const options = ['<option value="">— Type custom below —</option>']
      .concat(recipients.map(r => `<option value="${r.name}">${r.name}</option>`))
      .join('');
    const sel = document.getElementById('pay-recipient-select');
    if (sel) sel.innerHTML = options;

    if (sel) {
      sel.onchange = () => {
        const chosen = recipients.find(r => r.name === sel.value);
        if (chosen) {
          const methodSel = document.getElementById('pay-method-select');
          if (methodSel && chosen.method) methodSel.value = chosen.method;
        }
      };
    }
  }

  // ── Distribution Planner ──────────────────────────────────────

  function generatePlan() {
    const zk = yd();
    const result = ZakatEngine.calcFullZakat(zk);
    if (!result || !result.exceedsNisab) {
      document.getElementById('plan-grid').innerHTML = '<div class="empty-state"><p>Calculate your zakat first (must exceed nisab).</p></div>';
      return;
    }

    const period = document.getElementById('plan-period').value;
    const startDate = document.getElementById('plan-start-date').value;
    const strategy = document.getElementById('plan-strategy').value;

    if (!startDate) {
      document.getElementById('plan-grid').innerHTML = '<div class="empty-state"><p>Please set a start date for the period.</p></div>';
      return;
    }

    const recipients = zk.recipients || [];
    if (recipients.length === 0) {
      document.getElementById('plan-grid').innerHTML = '<div class="empty-state"><p>Add at least one recipient above first.</p></div>';
      return;
    }

    const allocEl = document.getElementById('plan-allocations');
    const existingPlan = zk.distributionPlan || {};
    const recipientAllocations = existingPlan.allocations || {};

    let totalRemaining = result.zakatRemaining > 0 ? result.zakatRemaining : result.zakatOwing;

    allocEl.innerHTML = `
      <h3 style="margin:0 0 0.5rem">Allocate Zakat to Recipients</h3>
      <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.5rem">
        Total to distribute: <strong>${currency(totalRemaining)}</strong>. Enter $ amount or % for each recipient.
      </p>
      <div style="display:flex;flex-direction:column;gap:0.4rem">
        ${recipients.map(r => {
          const saved = recipientAllocations[r.id] || {};
          return `
          <div class="plan-alloc-row" style="display:flex;align-items:center;gap:0.75rem;padding:0.4rem 0.75rem;background:var(--surface-alt);border-radius:var(--radius)">
            <span style="flex:1;font-size:0.85rem;font-weight:500">${r.name} <span style="color:var(--text-secondary);font-size:0.75rem">(${CAT_LABELS[r.category] || r.category})</span></span>
            <div style="display:flex;gap:0.4rem;align-items:center">
              <label style="font-size:0.7rem;color:var(--text-secondary)">$</label>
              <input type="number" class="alloc-amount" data-rid="${r.id}" step="0.01" style="width:100px;padding:0.3rem;font-size:0.82rem" value="${saved.amount || ''}">
              <label style="font-size:0.7rem;color:var(--text-secondary)">or %</label>
              <input type="number" class="alloc-pct" data-rid="${r.id}" step="1" min="0" max="100" style="width:70px;padding:0.3rem;font-size:0.82rem" value="${saved.percent || ''}">
            </div>
          </div>`;
        }).join('')}
      </div>
      <div style="margin-top:0.5rem;text-align:right">
        <button class="btn btn-primary btn-sm" id="btn-save-allocations">Save Allocations & Generate</button>
      </div>
    `;

    document.getElementById('btn-save-allocations').addEventListener('click', () => {
      saveAllocationsAndGenerate(totalRemaining, period, startDate, strategy);
    });
  }

  function saveAllocationsAndGenerate(totalToDistribute, period, startDate, strategy) {
    const zk = yd();
    const recipients = zk.recipients || [];
    const allocations = {};
    let assignedTotal = 0;

    recipients.forEach(r => {
      const amtInput = document.querySelector(`.alloc-amount[data-rid="${r.id}"]`);
      const pctInput = document.querySelector(`.alloc-pct[data-rid="${r.id}"]`);
      const amt = parseFloat(amtInput?.value) || 0;
      const pct = parseFloat(pctInput?.value) || 0;

      let resolved = amt;
      if (!amt && pct) resolved = round2(totalToDistribute * pct / 100);

      allocations[r.id] = { amount: resolved, percent: pct, name: r.name };
      assignedTotal += resolved;
    });

    const numDays = 10;
    const start = new Date(startDate + 'T00:00:00');
    const dates = [];
    for (let d = 0; d < numDays; d++) {
      const dt = new Date(start);
      dt.setDate(dt.getDate() + d);
      dates.push(dt);
    }

    const nightWeights = getNightWeights(strategy, numDays, period);

    const grid = dates.map((dt, idx) => {
      const dateStr = dt.toISOString().slice(0, 10);
      const nightNum = period === 'ramadan-last-10' ? (21 + idx) : (idx + 1);
      const label = period === 'ramadan-last-10'
        ? `Night ${nightNum}${nightNum % 2 === 1 ? ' ★' : ''}`
        : `Day ${nightNum}`;
      const weight = nightWeights[idx];
      const nightRecipients = {};

      recipients.forEach(r => {
        const alloc = allocations[r.id]?.amount || 0;
        nightRecipients[r.id] = round2(alloc * weight);
      });

      return { date: dateStr, label, nightNum, weight, recipients: nightRecipients };
    });

    zk.distributionPlan = {
      period, startDate, strategy,
      allocations,
      grid,
      generatedAt: new Date().toISOString(),
    };

    markDirty();
    renderPlanGrid(zk, totalToDistribute);
  }

  function getNightWeights(strategy, numDays, period) {
    const weights = new Array(numDays).fill(0);
    if (strategy === 'equal-all') {
      const w = round2(1 / numDays);
      weights.fill(w);
    } else if (strategy === 'odd-nights' && period === 'ramadan-last-10') {
      const oddIndices = [0, 2, 4, 6, 8]; // nights 21,23,25,27,29
      const w = round2(1 / oddIndices.length);
      oddIndices.forEach(i => weights[i] = w);
    } else if (strategy === 'odd-nights') {
      const oddIndices = [0, 2, 4, 6, 8];
      const w = round2(1 / oddIndices.length);
      oddIndices.forEach(i => weights[i] = w);
    } else {
      weights.fill(round2(1 / numDays));
    }
    return weights;
  }

  function renderPlanGrid(zk, totalToDistribute) {
    const plan = zk.distributionPlan;
    const el = document.getElementById('plan-grid');
    if (!el || !plan || !plan.grid) { if (el) el.innerHTML = ''; return; }

    const recipients = zk.recipients || [];
    const payments = zk.zakatPayments || [];

    let html = `<div class="plan-table-wrap" style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
        <thead>
          <tr>
            <th style="text-align:left;padding:0.5rem">Night / Day</th>
            <th style="text-align:left;padding:0.5rem">Date</th>
            ${recipients.map(r => `<th style="text-align:right;padding:0.5rem">${r.name}</th>`).join('')}
            <th style="text-align:right;padding:0.5rem;font-weight:700">Total</th>
            <th style="text-align:center;padding:0.5rem">Status</th>
          </tr>
        </thead>
        <tbody>`;

    let grandTotal = 0;
    plan.grid.forEach(row => {
      let rowTotal = 0;
      const dayPayments = payments.filter(p => p.date === row.date);
      const dayPaid = dayPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

      const recipCells = recipients.map(r => {
        const amt = row.recipients[r.id] || 0;
        rowTotal += amt;
        return `<td style="text-align:right;padding:0.4rem;font-family:var(--mono)">${amt > 0 ? currency(amt) : '—'}</td>`;
      }).join('');

      grandTotal += rowTotal;
      const isOdd = row.label.includes('★');
      const paid = dayPaid >= rowTotal && rowTotal > 0;
      const partial = dayPaid > 0 && dayPaid < rowTotal;

      html += `
        <tr style="${isOdd ? 'background:var(--primary-light)' : ''}">
          <td style="padding:0.4rem;font-weight:${isOdd ? '600' : '400'}">${row.label}</td>
          <td style="padding:0.4rem;color:var(--text-secondary)">${row.date}</td>
          ${recipCells}
          <td style="text-align:right;padding:0.4rem;font-weight:600;font-family:var(--mono)">${rowTotal > 0 ? currency(rowTotal) : '—'}</td>
          <td style="text-align:center;padding:0.4rem">
            ${rowTotal === 0 ? '<span style="color:var(--text-secondary)">—</span>' : paid ? '<span style="color:var(--success);font-weight:600">Paid</span>' : partial ? '<span style="color:var(--warning);font-weight:600">Partial</span>' : '<span style="color:var(--text-secondary)">Pending</span>'}
          </td>
        </tr>`;
    });

    html += `
        </tbody>
        <tfoot>
          <tr style="border-top:2px solid var(--border)">
            <td style="padding:0.6rem;font-weight:700" colspan="2">Total Plan</td>
            ${recipients.map(r => {
              const total = plan.grid.reduce((s, row) => s + (row.recipients[r.id] || 0), 0);
              return `<td style="text-align:right;padding:0.6rem;font-weight:600;font-family:var(--mono)">${currency(total)}</td>`;
            }).join('')}
            <td style="text-align:right;padding:0.6rem;font-weight:700;font-family:var(--mono)">${currency(grandTotal)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>`;

    const unallocated = totalToDistribute - grandTotal;
    if (unallocated > 1) {
      html += `<p style="margin-top:0.5rem;font-size:0.82rem;color:var(--warning);font-weight:500">Unallocated: ${currency(unallocated)} — adjust recipient amounts above.</p>`;
    }

    el.innerHTML = html;
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

    // Recipients list
    renderList('recipients-list', zk.recipients || [], 'recipients', i => {
      const urlLink = i.url ? ` — <a href="${i.url}" target="_blank" rel="noopener" style="color:var(--primary)">${i.url}</a>` : '';
      return `<strong>${i.name}</strong> <span style="color:var(--text-secondary);font-size:0.75rem">(${CAT_LABELS[i.category] || i.category})</span>${urlLink}<br><span style="font-size:0.78rem;color:var(--text-secondary)">Method: ${METHOD_LABELS[i.method] || i.method}${i.notes ? ' — ' + i.notes : ''}</span>`;
    });

    populateRecipientDropdowns();

    // Restore plan grid if exists
    const result = ZakatEngine.calcFullZakat(zk);
    if (zk.distributionPlan?.grid && result) {
      const totalRemaining = result.zakatRemaining > 0 ? result.zakatRemaining : result.zakatOwing;
      renderPlanGrid(zk, totalRemaining);

      const planEl = document.getElementById('plan-period');
      const startEl = document.getElementById('plan-start-date');
      const stratEl = document.getElementById('plan-strategy');
      if (planEl) planEl.value = zk.distributionPlan.period || 'ramadan-last-10';
      if (startEl) startEl.value = zk.distributionPlan.startDate || '';
      if (stratEl) stratEl.value = zk.distributionPlan.strategy || 'equal-all';
    }

    // Payments list (enhanced with method)
    renderList('payments-list', zk.zakatPayments, 'zakatPayments',
      i => {
        const methodLabel = i.method ? ` via ${METHOD_LABELS[i.method] || i.method}` : '';
        return `${i.date} — <strong>${i.recipient}</strong>: ${currency(i.amount)}${methodLabel}`;
      });

    // Payment summary
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

    // Per-recipient breakdown
    renderRecipientBreakdown(zk, result);
  }

  function renderRecipientBreakdown(zk, result) {
    const el = document.getElementById('recipient-breakdown');
    if (!el) return;

    const payments = zk.zakatPayments || [];
    const recipients = zk.recipients || [];
    if (payments.length === 0) {
      el.innerHTML = '<div class="empty-state"><p>No payments recorded yet.</p></div>';
      return;
    }

    const byRecipient = {};
    payments.forEach(p => {
      if (!byRecipient[p.recipient]) byRecipient[p.recipient] = { total: 0, count: 0 };
      byRecipient[p.recipient].total += parseFloat(p.amount) || 0;
      byRecipient[p.recipient].count++;
    });

    const planned = zk.distributionPlan?.allocations || {};
    const recipientMap = {};
    recipients.forEach(r => { recipientMap[r.name] = r; });

    let html = `<div style="display:flex;flex-direction:column;gap:0.4rem">`;
    for (const [name, info] of Object.entries(byRecipient).sort((a, b) => b[1].total - a[1].total)) {
      const r = recipientMap[name];
      const plannedAmt = r && planned[r.id] ? planned[r.id].amount : 0;
      const pctOfTotal = result?.zakatOwing > 0 ? round2(info.total / result.zakatOwing * 100) : 0;
      const barWidth = Math.min(pctOfTotal, 100);

      html += `
        <div style="padding:0.5rem 0.75rem;background:var(--surface-alt);border-radius:var(--radius)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem">
            <span style="font-weight:600;font-size:0.85rem">${name}</span>
            <span style="font-family:var(--mono);font-weight:600">${currency(info.total)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem">
            <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${barWidth}%;background:var(--primary);border-radius:3px"></div>
            </div>
            <span style="font-size:0.72rem;color:var(--text-secondary);white-space:nowrap">${info.count} payment${info.count > 1 ? 's' : ''} · ${pctOfTotal}%${plannedAmt > 0 ? ` · Planned: ${currency(plannedAmt)}` : ''}</span>
          </div>
        </div>`;
    }
    html += `</div>`;
    el.innerHTML = html;
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
    document.getElementById('btn-add-recipient').addEventListener('click', addRecipient);
    document.getElementById('btn-generate-plan').addEventListener('click', generatePlan);
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
