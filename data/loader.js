// Fetches and parses the synthetic CSV data set, then boots the app.
// Must be served over HTTP (e.g. `python3 -m http.server`) — fetch() on
// local files fails silently under file:// in most browsers.

(function () {
  function splitLine(line) {
    const out = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) {
        out.push(cur); cur = '';
      } else {
        cur += c;
      }
    }
    out.push(cur);
    return out;
  }

  function parseCSV(text) {
    const lines = text.replace(/\r\n/g, '\n').trim().split('\n');
    const headers = splitLine(lines[0]).map((h) => h.trim());
    return lines.slice(1).filter((l) => l.trim()).map((line) => {
      const vals = splitLine(line);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim(); });
      return obj;
    });
  }

  const num = (v) => parseFloat(v) || 0;
  const int = (v) => parseInt(v, 10) || 0;
  const bool = (v) => v === 'true';
  const pipe = (v) => (v ? v.split('|').filter(Boolean) : []);

  const FILES = [
    'data/products.csv',
    'data/purchases.csv',
    'data/entitlements.csv',
    'data/downloads.csv',
    'data/users.csv',
    'data/roles.csv',
    'data/invites.csv',
    'data/activity.csv',
    'data/invoices.csv',
    'data/tickets.csv',
    'data/ticket_activity.csv',
    'data/usage_history.csv',
    'data/resellers.csv',
  ];

  function showError(err) {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#0B1220;color:#fff;">
        <div style="max-width:520px;text-align:center;padding:32px;">
          <div style="font-size:40px;margin-bottom:12px;">&#9888;&#65039;</div>
          <h2 style="margin:0 0 8px;">Couldn't load portal data</h2>
          <p style="color:#98A2B3;line-height:1.5;">
            This app fetches its synthetic data from local CSV files, which requires a local
            web server &mdash; opening <code>index.html</code> directly (<code>file://</code>) will
            not work in most browsers.
          </p>
          <p style="color:#98A2B3;">Try: <code>python3 -m http.server</code> from the project folder, then open
            <code>http://localhost:8000</code>.</p>
          <p style="color:#F04438;margin-top:16px;font-size:13px;">${(err && err.message) || err}</p>
        </div>
      </div>`;
  }

  function showSpinner() {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#0B1220;">
        <div style="width:36px;height:36px;border-radius:50%;border:3px solid rgba(79,107,255,0.25);border-top-color:#4F6BFF;animation:spin 0.8s linear infinite;"></div>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      </div>`;
  }

  showSpinner();

  // Cache-bust on every load so edited CSVs are never served stale from
  // the browser's disk cache (python's http.server sends no-cache headers).
  const CACHE_BUST = 'cb=' + Date.now();

  Promise.all(FILES.map((f) => fetch(f + '?' + CACHE_BUST).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status} fetching ${f}`);
    return r.text();
  })))
    .then(([productsRaw, purchasesRaw, entitlementsRaw, downloadsRaw, usersRaw, rolesRaw, invitesRaw, activityRaw, invoicesRaw, ticketsRaw, ticketActivityRaw, usageHistoryRaw, resellersRaw]) => {
      window.PRODUCTS_DATA = parseCSV(productsRaw).map((r) => ({
        ...r,
        listPrice: num(r.listPrice),
        features: pipe(r.features),
      }));

      window.PURCHASES_DATA = parseCSV(purchasesRaw).map((r) => ({
        ...r,
        qty: int(r.qty),
        unitPrice: num(r.unitPrice),
        totalPrice: num(r.totalPrice),
      }));

      window.INVOICES_DATA = parseCSV(invoicesRaw).map((r) => ({
        ...r,
        amount: num(r.amount),
      }));

      window.ENTITLEMENTS_DATA = parseCSV(entitlementsRaw).map((r) => ({
        ...r,
        seatsTotal: int(r.seatsTotal),
        seatsUsed: int(r.seatsUsed),
      }));

      window.DOWNLOADS_DATA = parseCSV(downloadsRaw).map((r) => ({
        ...r,
        fileSizeMb: num(r.fileSizeMb),
        isLatest: bool(r.isLatest),
      }));

      window.USERS_DATA = parseCSV(usersRaw);

      window.ROLES_DATA = parseCSV(rolesRaw).map((r) => ({
        ...r,
        permissions: pipe(r.permissions),
        isCustom: bool(r.isCustom),
      }));

      window.INVITES_DATA = parseCSV(invitesRaw);
      window.ACTIVITY_DATA = parseCSV(activityRaw);
      window.TICKETS_DATA = parseCSV(ticketsRaw);
      window.TICKET_ACTIVITY_DATA = parseCSV(ticketActivityRaw);

      window.USAGE_HISTORY_DATA = parseCSV(usageHistoryRaw).map((r) => ({
        ...r,
        value: num(r.value),
      }));

      window.RESELLERS_DATA = parseCSV(resellersRaw).map((r) => ({
        ...r,
        rating: num(r.rating),
        yearsPartnered: int(r.yearsPartnered),
      }));

      if (typeof window.__portalRender === 'function') {
        window.__portalRender();
      }
    })
    .catch(showError);
})();
