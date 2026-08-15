/* Palo Alto Security — Customer Portal
 * Hand-rolled SPA: global state object `S`, full innerHTML re-render on
 * navigation, targeted re-render of #page-body for filters/tabs, and a
 * standalone modal system that only touches #modal-root. No framework,
 * no build step — data is supplied by data/loader.js via window.*_DATA
 * and wired up through window.__portalRender().
 */

// ===== Data (assigned once loader.js resolves) =====
let PRODUCTS = [], PURCHASES = [], ENTITLEMENTS = [], DOWNLOADS = [], INVOICES = [];
let USERS = [], ROLES = [], INVITES = [], ACTIVITY = [];
let TICKETS = [], TICKET_ACTIVITY = [];
let USAGE_HISTORY = [];
let RESELLERS = [];
let CURRENT_USER = null;

const ACCOUNT = { name: 'Ridgeline Financial Group', tier: 'Platinum Account', industry: 'Financial Services', hq: 'Boston, MA' };

const CURRENCIES = {
  USD: { symbol: '$', rate: 1, decimals: 2 },
  EUR: { symbol: '€', rate: 0.92, decimals: 2 },
  GBP: { symbol: '£', rate: 0.79, decimals: 2 },
  CAD: { symbol: 'C$', rate: 1.36, decimals: 2 },
  AUD: { symbol: 'A$', rate: 1.52, decimals: 2 },
  JPY: { symbol: '¥', rate: 149, decimals: 0 },
};

const CATEGORY_COLORS = {
  'Firewall': '#4F6BFF',
  'Endpoint & XDR': '#7C5CFF',
  'SASE': '#0EA5E9',
  'SIEM': '#12B76A',
  'Email Security': '#F59E0B',
  'Cloud Security': '#2DD4BF',
  'VPN': '#667085',
  'Threat Intelligence': '#F04438',
};

const PERMISSIONS_CATALOG = [
  { key: 'products.view', label: 'View Products', desc: 'See owned products and detail pages' },
  { key: 'purchases.view', label: 'View Orders', desc: 'See order history and billing amounts' },
  { key: 'downloads.download', label: 'Download Software', desc: 'Download installers, firmware, and clients' },
  { key: 'entitlements.view', label: 'View Entitlements', desc: 'See license keys, seats, and expiry' },
  { key: 'team.view', label: 'View Team', desc: 'See team members and roles' },
  { key: 'team.manage', label: 'Manage Team', desc: 'Invite, remove, or change teammate roles' },
];

const NAV_ITEMS = [
  { page: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
  { page: 'products', label: 'My Products', icon: 'bi-box-seam-fill' },
  { page: 'configurator', label: 'Configurator', icon: 'bi-cart-plus-fill' },
  { page: 'orders', label: 'Orders', icon: 'bi-receipt' },
  { page: 'downloads', label: 'Downloads', icon: 'bi-cloud-arrow-down-fill' },
  { page: 'entitlements', label: 'Entitlements & Licenses', icon: 'bi-key-fill' },
  { page: 'support', label: 'Support', icon: 'bi-headset' },
  { page: 'ask-ai', label: 'Ask AI', icon: 'bi-stars' },
  { page: 'team', label: 'Team & Access', icon: 'bi-people-fill' },
  { page: 'account', label: 'Account', icon: 'bi-building' },
];

const PAGE_TITLES = {
  products: { title: 'My Products', sub: 'Everything your organization has purchased from Palo Alto Security' },
  configurator: { title: 'Product Configurator', sub: 'Configure, price, and order new products or add-ons' },
  orders: { title: 'Orders', sub: 'Every order — status, provisioning, and invoices in one place' },
  downloads: { title: 'Downloads', sub: 'Software installers, firmware, and clients for your products' },
  entitlements: { title: 'Entitlements & Licenses', sub: 'License keys, seat usage, and renewal status' },
  support: { title: 'Support', sub: 'Submit and track support tickets' },
  'ask-ai': { title: 'Ask AI', sub: 'Natural-language answers from your products, orders, and account data' },
  team: { title: 'Team & Access', sub: 'Manage teammates, roles, and pending invitations' },
  account: { title: 'Account', sub: 'Currency, payment methods, and preferred reseller' },
};

const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const SUPPORT_TYPES = ['Technical Issue', 'Billing Question', 'Licensing & Entitlements', 'Feature Request', 'Other'];

const SUPPORT_TIERS = [
  { key: 'Standard', mult: 1 },
  { key: 'Premium', mult: 1.15 },
  { key: 'Platinum', mult: 1.3 },
];

const SUPPORT_TIER_DETAILS = {
  Standard: {
    sla: 'Next business day',
    hours: 'Business hours (Mon–Fri)',
    channels: 'Email',
    includes: ['Email support', 'Knowledge base & documentation access', 'Standard release updates'],
  },
  Premium: {
    sla: '4 hour response',
    hours: '24/7',
    channels: 'Email + Phone',
    includes: ['24/7 phone & email support', 'Dedicated Customer Success Manager', 'Priority patch releases', 'Quarterly account health checks'],
  },
  Platinum: {
    sla: '1 hour response',
    hours: '24/7',
    channels: 'Email + Phone + dedicated Slack channel',
    includes: ['24/7 priority support', 'Dedicated Technical Account Manager', 'Same-day patch releases', 'Quarterly business reviews', 'Architecture review sessions'],
  },
};

// capacity: 'seats' (resolved live from the product's active entitlement),
// a fixed number (hardware/spec limit), or null (trend-only, no utilization bar).
const USAGE_METRIC_CONFIG = {
  'sentrywall-3200': { label: 'Inspected Throughput', unit: 'Gbps', capacity: 4.5 },
  'sentrywall-7400': { label: 'Inspected Throughput', unit: 'Gbps', capacity: 40 },
  'sentrywall-virtual': { label: 'Inspected Throughput', unit: 'Gbps', capacity: 2 },
  'sentrywall-manager': { label: 'Managed Devices', unit: 'devices', capacity: null },
  'aegis-endpoint': { label: 'Active Seats', unit: 'seats', capacity: 'seats' },
  'aegis-mobile': { label: 'Active Devices', unit: 'devices', capacity: 'seats' },
  'argus-xdr': { label: 'Events Correlated', unit: 'events/day (thousands)', capacity: null },
  'argus-forensics': { label: 'Forensic Queries Run', unit: 'queries/week', capacity: null },
  'meridian-sase': { label: 'Active Users', unit: 'users', capacity: 'seats' },
  'meridian-client': { label: 'Active Connections', unit: 'connections', capacity: null },
  'bastion-siem': { label: 'Log Volume Ingested', unit: 'GB/day', capacity: null },
  'sentinel-mail': { label: 'Emails Scanned', unit: 'emails/day', capacity: null },
  'sentinel-archive': { label: 'Messages Archived', unit: 'messages/day', capacity: null },
  'cloudwarden-cspm': { label: 'Cloud Resources Scanned', unit: 'resources', capacity: null },
  'irongate-vpn500': { label: 'Concurrent Tunnels', unit: 'tunnels', capacity: 10000 },
  'vantage-feed': { label: 'IOCs Ingested', unit: 'IOCs/day', capacity: null },
};

const CONFIG_STEP_LABELS = ['Choose Product', 'Configure', 'Add-ons', 'Review', 'Done'];
const ORDER_STEPS = ['submitted', 'processing', 'provisioning', 'fulfilled'];

// ===== App state =====
const S = {
  page: 'login',
  selectedProductKey: null,
  selectedOrderId: null,
  selectedTicketId: null,
  selectedSubscriptionKey: null,
  productsFilter: { search: '', category: 'all', type: 'all' },
  ordersFilter: { search: '', type: 'all', orderStatus: 'all' },
  ordersTab: 'orders',
  downloadsFilter: { search: '', platform: 'all' },
  entitlementsFilter: { search: '', status: 'all' },
  ticketsFilter: { search: '', status: 'all', severity: 'all' },
  teamTab: 'users',
  modal: null,
  askAi: { messages: [], typing: false },
  accountSettings: {
    currency: 'USD',
    preferredResellerId: null,
    paymentMethods: [
      { id: 'pm-1', type: 'invoice', label: 'Invoice — Net 30', details: 'Billed to accounts.payable@ridgelinefg.com', isDefault: true },
    ],
  },
  configurator: { step: 1, productKey: null, qty: 1, supportTier: 'Standard', term: 'annual', addons: [], poNumber: '', catalogFilter: { search: '', category: 'all' }, lastOrderId: null },
};

function resetConfigurator() {
  S.configurator = { step: 1, productKey: null, qty: 1, supportTier: 'Standard', term: 'annual', addons: [], poNumber: '', catalogFilter: { search: '', category: 'all' }, lastOrderId: null };
}

// ===== Utilities =====
function $id(id) { return document.getElementById(id); }
function qs(sel, root) { return (root || document).querySelector(sel); }
function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

function fmt$(n) {
  const cur = CURRENCIES[S.accountSettings.currency] || CURRENCIES.USD;
  const converted = Number(n) * cur.rate;
  return cur.symbol + converted.toLocaleString('en-US', { minimumFractionDigits: cur.decimals, maximumFractionDigits: cur.decimals });
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}
function isoToday() { return new Date().toISOString().slice(0, 10); }
function isoPlusDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

let toastTimer = null;
function showToast(msg, type) {
  const t = $id('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 3000);
}

// ===== Computed data helpers =====
function getProductByKey(key) { return PRODUCTS.find((p) => p.key === key); }
function getOwnedProductKeys() { return [...new Set(PURCHASES.map((p) => p.productKey))]; }
function getPurchasesForProduct(key) { return PURCHASES.filter((p) => p.productKey === key); }
function getEntitlementsForProduct(key) { return ENTITLEMENTS.filter((e) => e.productKey === key); }
function getDownloadsForProduct(key) { return DOWNLOADS.filter((d) => d.productKey === key); }
function getUsageHistoryForProduct(key) { return USAGE_HISTORY.filter((u) => u.productKey === key).sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart)); }
function getUsageCapacity(key) {
  const cfg = USAGE_METRIC_CONFIG[key];
  if (!cfg || cfg.capacity === null) return null;
  if (cfg.capacity === 'seats') {
    const ents = getEntitlementsForProduct(key).filter((e) => e.status === 'active' || e.status === 'expiring');
    return ents.length ? ents.reduce((s, e) => s + e.seatsTotal, 0) : null;
  }
  return cfg.capacity;
}
function getRoleById(id) { return ROLES.find((r) => r.id === id); }
function getUserRoleName(u) { const r = getRoleById(u.roleId); return r ? r.name : 'Unknown Role'; }
function getCategoryColor(cat) { return CATEGORY_COLORS[cat] || '#667085'; }
function permissionLabel(key) { const p = PERMISSIONS_CATALOG.find((x) => x.key === key); return p ? p.label : key; }
function getRecentActivity(n) { return [...ACTIVITY].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, n); }
function getExpiringEntitlements(days) {
  return ENTITLEMENTS
    .filter((e) => (e.status === 'active' || e.status === 'expiring'))
    .filter((e) => { const d = daysUntil(e.expiryDate); return d !== null && d >= 0 && d <= days; })
    .sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate));
}
function getInvoiceForPurchase(purchaseId) { return INVOICES.find((i) => i.purchaseId === purchaseId); }
function getOrdersInGroup(groupId) { return PURCHASES.filter((p) => p.orderGroupId === groupId); }

function getMonthlySpend(monthsBack) {
  const today = new Date();
  const months = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    months.push(new Date(today.getFullYear(), today.getMonth() - i, 1));
  }
  return months.map((m) => {
    const total = PURCHASES.filter((p) => {
      if (p.status === 'cancelled') return false;
      const d = new Date(p.purchaseDate + 'T00:00:00');
      return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
    }).reduce((s, p) => s + p.totalPrice, 0);
    return { month: m, total };
  });
}

function getYTDSpend(yearOffset) {
  const today = new Date();
  const year = today.getFullYear() - yearOffset;
  const cutoff = new Date(year, today.getMonth(), today.getDate());
  const yearStart = new Date(year, 0, 1);
  return PURCHASES.filter((p) => {
    if (p.status === 'cancelled') return false;
    const d = new Date(p.purchaseDate + 'T00:00:00');
    return d >= yearStart && d <= cutoff;
  }).reduce((s, p) => s + p.totalPrice, 0);
}

function getCategorySpend() {
  const totals = {};
  PURCHASES.filter((p) => p.status !== 'cancelled').forEach((p) => {
    const prod = getProductByKey(p.productKey);
    if (!prod) return;
    totals[prod.category] = (totals[prod.category] || 0) + p.totalPrice;
  });
  return Object.entries(totals)
    .map(([category, total]) => ({ category, total, color: getCategoryColor(category) }))
    .sort((a, b) => b.total - a.total);
}

function getOpenTickets() {
  return TICKETS.filter((t) => t.status !== 'closed' && t.status !== 'resolved');
}

function getUnpaidInvoices() {
  return INVOICES.filter((i) => i.status !== 'paid');
}
function getAddonsForProduct(key) { return PRODUCTS.filter((p) => p.addonForKey === key); }
function getOrdersMidPipeline() { return PURCHASES.filter((p) => p.orderStatus === 'processing' || p.orderStatus === 'provisioning'); }

function getSubscriptions() {
  const groups = {};
  PURCHASES.filter((p) => p.orderType === 'subscription').forEach((p) => {
    if (!groups[p.productKey]) groups[p.productKey] = [];
    groups[p.productKey].push(p);
  });
  return Object.entries(groups).map(([productKey, orders]) => {
    const sorted = [...orders].sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
    const startDate = sorted[0].purchaseDate;
    const liveOrders = sorted.filter((o) => o.status === 'active' || o.status === 'pending-renewal');
    const upcomingRenewals = liveOrders.filter((o) => o.renewalDate).map((o) => o.renewalDate).sort();
    const nextRenewalDate = upcomingRenewals[0] || null;
    const latest = sorted[sorted.length - 1];
    const status = liveOrders.some((o) => o.status === 'pending-renewal') ? 'pending-renewal' : (liveOrders.length ? 'active' : latest.status);
    const totalSpend = sorted.reduce((s, o) => s + o.totalPrice, 0);
    const totalSeats = liveOrders.reduce((s, o) => s + o.qty, 0);
    return { productKey, orders: sorted, startDate, nextRenewalDate, status, totalSpend, totalSeats, orderCount: sorted.length };
  }).sort((a, b) => new Date(b.orders[b.orders.length - 1].purchaseDate) - new Date(a.orders[a.orders.length - 1].purchaseDate));
}
function getSubscriptionByKey(key) { return getSubscriptions().find((s) => s.productKey === key) || null; }
function getSupportMultiplier(tier) { const t = SUPPORT_TIERS.find((x) => x.key === tier); return t ? t.mult : 1; }
function refreshIfMounted() { if (S.page !== 'login') render(); }

function getTicketById(id) { return TICKETS.find((t) => t.id === id); }
function getActivityForTicket(id) { return TICKET_ACTIVITY.filter((a) => a.ticketId === id).sort((a, b) => new Date(a.date) - new Date(b.date)); }
function getOpenTicketsCount() { return TICKETS.filter((t) => t.status === 'open' || t.status === 'in-progress' || t.status === 'waiting-on-you').length; }
function generateTicketId() { return 'TCK-' + Math.floor(2000 + Math.random() * 7999); }

function getLineUnitPrice(product, supportTier, term) {
  let price = product.listPrice * getSupportMultiplier(supportTier);
  if (product.type === 'subscription' && term === '3yr') price = price * 3 * 0.9;
  return Math.round(price * 100) / 100;
}

function calcConfiguratorLineItems() {
  const product = getProductByKey(S.configurator.productKey);
  if (!product) return { lines: [], total: 0 };
  const lines = [];
  const baseUnit = getLineUnitPrice(product, S.configurator.supportTier, S.configurator.term);
  lines.push({ key: product.key, name: product.name, qty: S.configurator.qty, unitPrice: baseUnit, lineTotal: Math.round(baseUnit * S.configurator.qty * 100) / 100, isAddon: false });
  getAddonsForProduct(product.key).filter((a) => S.configurator.addons.includes(a.key)).forEach((a) => {
    const perSeat = a.priceUnit.includes('per seat');
    const qty = perSeat ? S.configurator.qty : 1;
    const unit = getLineUnitPrice(a, S.configurator.supportTier, S.configurator.term);
    lines.push({ key: a.key, name: a.name, qty, unitPrice: unit, lineTotal: Math.round(unit * qty * 100) / 100, isAddon: true });
  });
  const total = lines.reduce((s, l) => s + l.lineTotal, 0);
  return { lines, total };
}

function generateOrderId() { return 'ORD-2026-' + Math.floor(1000 + Math.random() * 9000); }
function generateLicenseKey(productKey) {
  const prefix = productKey.split('-')[0].toUpperCase().slice(0, 4);
  const group = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${group()}-${group()}-${group()}`;
}

// ===== Render pipeline =====
function render() {
  const app = $id('app');
  if (S.page === 'login') { app.innerHTML = renderLogin(); attachLoginEvents(); return; }
  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar()}
      <div class="main-area">
        ${renderHeader()}
        <div class="page-body" id="page-body">${renderPage()}</div>
      </div>
      <div id="modal-root">${renderModalMarkup()}</div>
    </div>`;
  attachGlobalEvents();
  attachModalEvents();
}

function renderPage() {
  switch (S.page) {
    case 'dashboard': return renderDashboard();
    case 'products': return renderProducts();
    case 'product-detail': return renderProductDetail(S.selectedProductKey);
    case 'configurator': return renderConfigurator();
    case 'orders': return renderOrders();
    case 'order-detail': return renderOrderDetail(S.selectedOrderId);
    case 'subscription-detail': return renderSubscriptionDetail(S.selectedSubscriptionKey);
    case 'downloads': return renderDownloads();
    case 'entitlements': return renderEntitlements();
    case 'support': return renderSupport();
    case 'ticket-detail': return renderTicketDetail(S.selectedTicketId);
    case 'ask-ai': return renderAskAI();
    case 'team': return renderTeamAccess();
    case 'account': return renderAccount();
    default: return renderDashboard();
  }
}

function navigate(page, params) {
  S.page = page;
  S.modal = null;
  if (params && params.key) S.selectedProductKey = params.key;
  if (params && params.orderId) S.selectedOrderId = params.orderId;
  if (params && params.ticketId) S.selectedTicketId = params.ticketId;
  if (params && params.subscriptionKey) S.selectedSubscriptionKey = params.subscriptionKey;
  if (page === 'configurator' && S.configurator.step === 5) resetConfigurator();
  render();
  const pb = $id('page-body');
  if (pb) pb.scrollTop = 0;
}

function updatePageBody() {
  const pb = $id('page-body');
  if (pb) pb.innerHTML = renderPage();
  attachGlobalEvents();
}

// ===== Login =====
function renderLogin() {
  return `
    <div class="login-page">
      <div class="login-card">
        <div class="login-brand">
          <div class="login-mark"><i class="bi bi-shield-lock-fill"></i></div>
          <div class="login-title">Palo Alto <span class="accent">Security</span></div>
          <div class="login-sub">Customer Portal — sign in to manage your account</div>
        </div>
        <div class="demo-hint"><strong>Demo credentials</strong>dana.whitfield@ridgelinefg.com &nbsp;·&nbsp; Password: demo1234</div>
        <div class="form-group">
          <label class="form-label">Email address</label>
          <input class="form-control" id="login-email" type="email" value="dana.whitfield@ridgelinefg.com" />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input class="form-control" id="login-pass" type="password" value="demo1234" />
        </div>
        <button class="btn btn-primary btn-block" id="login-btn"><i class="bi bi-box-arrow-in-right"></i> Sign In to Portal</button>
        <div class="login-footer">Palo Alto Security Customer Portal &middot; Confidential &amp; Authorized Use Only</div>
      </div>
    </div>`;
}

function attachLoginEvents() {
  const btn = $id('login-btn');
  if (btn) btn.addEventListener('click', doLogin);
  const pass = $id('login-pass');
  if (pass) pass.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
}

function doLogin() {
  const email = $id('login-email').value.trim();
  const pass = $id('login-pass').value;
  if (!email || !pass) { showToast('Please enter your credentials.', 'error'); return; }
  navigate('dashboard');
}

function doLogout() {
  S.page = 'login';
  S.selectedProductKey = null;
  S.modal = null;
  render();
}

// ===== Sidebar / Header =====
function renderSidebar() {
  const navHtml = NAV_ITEMS.map((item) => {
    const active = S.page === item.page
      || (item.page === 'products' && S.page === 'product-detail')
      || (item.page === 'orders' && (S.page === 'order-detail' || S.page === 'subscription-detail'))
      || (item.page === 'support' && S.page === 'ticket-detail')
      ? 'active' : '';
    let count = '';
    if (item.page === 'team') {
      const p = INVITES.filter((i) => i.status === 'pending').length;
      if (p > 0) count = `<span class="nav-count warn">${p}</span>`;
    }
    if (item.page === 'entitlements') {
      const exp = getExpiringEntitlements(30).length;
      if (exp > 0) count = `<span class="nav-count">${exp}</span>`;
    }
    if (item.page === 'orders') {
      const mid = getOrdersMidPipeline().length;
      if (mid > 0) count = `<span class="nav-count warn">${mid}</span>`;
    }
    if (item.page === 'support') {
      const open = getOpenTicketsCount();
      if (open > 0) count = `<span class="nav-count warn">${open}</span>`;
    }
    return `<button class="nav-item ${active}" data-nav="${item.page}"><i class="bi ${item.icon}"></i><span>${item.label}</span>${count}</button>`;
  }).join('');

  return `
    <div class="sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-mark"><i class="bi bi-shield-lock-fill"></i></div>
        <div class="sidebar-brand-text">Palo Alto <span class="accent">Security</span></div>
      </div>
      <div class="sidebar-account">
        <div class="sidebar-account-label">Customer Account</div>
        <div class="sidebar-account-name">${ACCOUNT.name}</div>
        <div class="sidebar-account-tier"><i class="bi bi-award-fill"></i> ${ACCOUNT.tier}</div>
      </div>
      <div class="sidebar-nav">
        <div class="sidebar-section-label">Portal</div>
        ${navHtml}
      </div>
      <div class="sidebar-footer">
        <div class="user-chip">
          <div class="user-avatar">${CURRENT_USER.initials}</div>
          <div class="user-chip-info">
            <div class="user-chip-name">${CURRENT_USER.name}</div>
            <div class="user-chip-role">${getUserRoleName(CURRENT_USER)}</div>
          </div>
          <button class="logout-btn" data-logout title="Log out"><i class="bi bi-box-arrow-right"></i></button>
        </div>
      </div>
    </div>`;
}

function renderHeader() {
  let title, sub;
  if (S.page === 'product-detail') {
    const p = getProductByKey(S.selectedProductKey);
    title = p ? p.name : 'Product';
    sub = 'Product details, entitlements, and downloads';
  } else if (S.page === 'order-detail') {
    title = S.selectedOrderId || 'Order';
    sub = 'Order status, provisioning, and invoice';
  } else if (S.page === 'ticket-detail') {
    const t = getTicketById(S.selectedTicketId);
    title = t ? t.ticketNumber : 'Ticket';
    sub = t ? t.subject : 'Support ticket';
  } else if (S.page === 'subscription-detail') {
    const p = getProductByKey(S.selectedSubscriptionKey);
    title = p ? p.name : 'Subscription';
    sub = 'Subscription history, renewals, and orders';
  } else if (S.page === 'dashboard') {
    title = 'Dashboard';
    sub = `Welcome back, ${CURRENT_USER.name.split(' ')[0]}`;
  } else {
    const pt = PAGE_TITLES[S.page] || PAGE_TITLES.products;
    title = pt.title; sub = pt.sub;
  }
  const pendingInvites = INVITES.filter((i) => i.status === 'pending').length;
  return `
    <div class="header">
      <div><div class="header-title">${title}</div><div class="header-sub">${sub}</div></div>
      <div class="header-actions">
        <button class="icon-btn" title="Notifications"><i class="bi bi-bell"></i>${pendingInvites > 0 ? '<span class="notif-dot"></span>' : ''}</button>
        <button class="icon-btn" title="Help"><i class="bi bi-question-circle"></i></button>
      </div>
    </div>`;
}

// ===== Dashboard =====
function renderDashboard() {
  const ownedKeys = getOwnedProductKeys();
  const activeEnts = ENTITLEMENTS.filter((e) => e.status !== 'expired' && e.status !== 'suspended');
  const seatsUsed = activeEnts.reduce((s, e) => s + e.seatsUsed, 0);
  const seatsTotal = activeEnts.reduce((s, e) => s + e.seatsTotal, 0);
  const expiring30 = getExpiringEntitlements(30);
  const expiring60 = getExpiringEntitlements(60);

  const ytdSpend = getYTDSpend(0);
  const ytdSpendPrior = getYTDSpend(1);
  const ytdDeltaPct = ytdSpendPrior > 0 ? Math.round(((ytdSpend - ytdSpendPrior) / ytdSpendPrior) * 100) : null;

  const openTickets = getOpenTickets();
  const criticalOrHigh = openTickets.filter((t) => t.severity === 'critical' || t.severity === 'high').length;

  const statsHtml = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-top"><div class="stat-icon blue"><i class="bi bi-box-seam-fill"></i></div></div>
        <div class="stat-label">Active Products</div>
        <div class="stat-value">${ownedKeys.length}</div>
        <div class="stat-delta">Across ${PURCHASES.length} orders</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><div class="stat-icon green"><i class="bi bi-graph-up-arrow"></i></div></div>
        <div class="stat-label">YTD Spend</div>
        <div class="stat-value">${fmt$(ytdSpend).replace(/\.00$/, '')}</div>
        <div class="stat-delta ${ytdDeltaPct === null ? '' : ytdDeltaPct >= 0 ? 'up' : 'warn'}">${ytdDeltaPct === null ? 'No prior-year data' : `${ytdDeltaPct >= 0 ? '+' : ''}${ytdDeltaPct}% vs last year`}</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><div class="stat-icon purple"><i class="bi bi-people-fill"></i></div></div>
        <div class="stat-label">Seats In Use</div>
        <div class="stat-value">${seatsUsed.toLocaleString()} <span style="font-size:14px;color:var(--text-light);font-weight:600;">/ ${seatsTotal.toLocaleString()}</span></div>
        <div class="stat-delta up">${seatsTotal ? Math.round((seatsUsed / seatsTotal) * 100) : 0}% utilized</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><div class="stat-icon amber"><i class="bi bi-hourglass-split"></i></div></div>
        <div class="stat-label">Expiring in 30 Days</div>
        <div class="stat-value">${expiring30.length}</div>
        <div class="stat-delta warn">${expiring30.filter((e) => daysUntil(e.expiryDate) <= 14).length} urgent (&lt;14d)</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><div class="stat-icon red"><i class="bi bi-headset"></i></div></div>
        <div class="stat-label">Open Support Tickets</div>
        <div class="stat-value">${openTickets.length}</div>
        <div class="stat-delta ${criticalOrHigh ? 'warn' : ''}">${criticalOrHigh ? `${criticalOrHigh} critical/high` : 'None urgent'}</div>
      </div>
    </div>`;

  const monthlySpend = getMonthlySpend(12);
  const maxSpend = Math.max(1, ...monthlySpend.map((m) => m.total));
  const spendBarsHtml = monthlySpend.map((m) => {
    const h = Math.max(Math.round((m.total / maxSpend) * 100), m.total > 0 ? 6 : 3);
    return `<div class="bar-col"><div class="bar-fill" style="height:${h}%" title="${m.month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}: ${fmt$(m.total)}"></div><div class="bar-label">${m.month.toLocaleDateString('en-US', { month: 'short' })}</div></div>`;
  }).join('');
  const spend12moTotal = monthlySpend.reduce((s, m) => s + m.total, 0);
  const peakMonth = monthlySpend.reduce((best, m) => (m.total > best.total ? m : best), monthlySpend[0]);

  const donutData = [
    { type: 'hardware', label: 'Hardware', color: '#7C5CFF' },
    { type: 'perpetual', label: 'Perpetual Software', color: '#98A2B3' },
    { type: 'subscription', label: 'Subscription', color: '#4F6BFF' },
  ].map((d) => ({ ...d, total: PURCHASES.filter((p) => p.orderType === d.type && p.status !== 'cancelled').reduce((s, p) => s + p.totalPrice, 0) }));
  const donutTotal = donutData.reduce((s, d) => s + d.total, 0) || 1;
  let cumulative = 0;
  const gradientParts = donutData.map((d) => {
    const start = (cumulative / donutTotal) * 360;
    cumulative += d.total;
    const end = (cumulative / donutTotal) * 360;
    return `${d.color} ${start}deg ${end}deg`;
  }).join(', ');

  const dashGrid = `
    <div class="dash-grid">
      <div class="card">
        <div class="card-header"><div><div class="card-title"><i class="bi bi-graph-up"></i> Spend Trend</div><div class="card-sub">Last 12 months</div></div></div>
        <div class="card-body">
          <div class="mini-bars">${spendBarsHtml}</div>
          <div class="bar-legend"><span>12-month total: <strong>${fmt$(spend12moTotal)}</strong></span><span>Peak: <strong>${peakMonth.month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} (${fmt$(peakMonth.total)})</strong></span></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div><div class="card-title"><i class="bi bi-pie-chart-fill"></i> Purchase Mix</div><div class="card-sub">By order type</div></div></div>
        <div class="card-body">
          <div class="donut-wrap">
            <div class="donut" style="background: conic-gradient(${gradientParts});"><div class="donut-hole"><b>${fmt$(donutTotal).replace('.00', '')}</b><span>Total</span></div></div>
            <div class="donut-legend">
              ${donutData.map((d) => `<div class="legend-row"><span class="legend-dot" style="background:${d.color}"></span>${d.label}<span class="legend-val">${fmt$(d.total)}</span></div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const renewalMonths = [];
  const renewalBase = new Date(); renewalBase.setDate(1);
  for (let i = 0; i < 6; i++) renewalMonths.push(new Date(renewalBase.getFullYear(), renewalBase.getMonth() + i, 1));
  const renewalCounts = renewalMonths.map((m) => PURCHASES.filter((p) => {
    if (!p.renewalDate || p.status === 'expired' || p.status === 'cancelled') return false;
    const d = new Date(p.renewalDate + 'T00:00:00');
    return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
  }).length);
  const maxRenewalCount = Math.max(1, ...renewalCounts);
  const renewalBarsHtml = renewalMonths.map((m, i) => {
    const h = Math.max(Math.round((renewalCounts[i] / maxRenewalCount) * 100), renewalCounts[i] > 0 ? 10 : 3);
    return `<div class="bar-col"><div class="bar-fill ${renewalCounts[i] >= 3 ? 'warn' : ''}" style="height:${h}%" title="${renewalCounts[i]} renewals"></div><div class="bar-label">${m.toLocaleDateString('en-US', { month: 'short' })}</div></div>`;
  }).join('');

  const categorySpend = getCategorySpend();
  const maxCategorySpend = Math.max(1, ...categorySpend.map((c) => c.total));
  const categoryRowsHtml = categorySpend.map((c) => `
    <div style="margin-bottom:10px;">
      <div class="entitlement-meta-row" style="margin-bottom:4px;"><span><span class="legend-dot" style="background:${c.color};display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;"></span>${c.category}</span><span class="td-strong">${fmt$(c.total)}</span></div>
      <div class="progress-wrap"><div class="progress-fill" style="width:${Math.max(Math.round((c.total / maxCategorySpend) * 100), 4)}%;background:${c.color};"></div></div>
    </div>`).join('');

  const unpaidInvoices = getUnpaidInvoices();
  const unpaidTotal = unpaidInvoices.reduce((s, i) => s + i.amount, 0);
  const overdueCount = unpaidInvoices.filter((i) => i.status === 'overdue').length;
  const severityOrder = ['critical', 'high', 'medium', 'low'];
  const severityCounts = severityOrder.map((sev) => ({ sev, count: openTickets.filter((t) => t.severity === sev).length })).filter((s) => s.count > 0);

  const threeColGrid = `
    <div class="three-col">
      <div class="card">
        <div class="card-header"><div><div class="card-title"><i class="bi bi-arrow-repeat"></i> Renewals Due</div><div class="card-sub">Next 6 months</div></div></div>
        <div class="card-body">
          <div class="mini-bars">${renewalBarsHtml}</div>
          <div class="bar-legend"><span>Total: <strong>${renewalCounts.reduce((a, b) => a + b, 0)}</strong></span><span>Peak: <strong>${Math.max(...renewalCounts)}</strong></span></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div><div class="card-title"><i class="bi bi-bar-chart-fill"></i> Spend by Category</div><div class="card-sub">All-time, by product line</div></div></div>
        <div class="card-body">${categoryRowsHtml}</div>
      </div>
      <div class="card">
        <div class="card-header"><div><div class="card-title"><i class="bi bi-shield-check"></i> Support &amp; Billing Health</div></div></div>
        <div class="card-body">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px;">Open Tickets by Severity</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px;">
            ${severityCounts.length ? severityCounts.map((s) => `<span class="badge badge-${s.sev}">${s.count} ${s.sev}</span>`).join('') : '<span style="color:var(--text-muted);font-size:13px;">No open tickets</span>'}
          </div>
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px;">Outstanding Balance</div>
          <div style="font-size:24px;font-weight:800;${unpaidTotal > 0 ? 'color:var(--warning);' : ''}">${fmt$(unpaidTotal)}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${unpaidInvoices.length} unpaid invoice${unpaidInvoices.length === 1 ? '' : 's'}${overdueCount ? ` &middot; <span style="color:var(--danger);font-weight:600;">${overdueCount} overdue</span>` : ''}</div>
        </div>
      </div>
    </div>`;

  const activityHtml = getRecentActivity(8).map((a) => `
    <div class="activity-item">
      <div class="activity-dot ${a.category}"></div>
      <div>
        <div class="activity-text">${a.text}</div>
        <div class="activity-date">${a.actorName} &middot; ${fmtDate(a.date)}</div>
      </div>
    </div>`).join('');

  const expiringRows = expiring60.slice(0, 6).map((e) => {
    const p = getProductByKey(e.productKey);
    const d = daysUntil(e.expiryDate);
    return `<tr>
      <td><div class="user-cell"><i class="bi ${p ? p.icon : 'bi-box'}" style="color:${p ? getCategoryColor(p.category) : 'var(--text-muted)'};font-size:15px;"></i><span class="td-strong">${p ? p.name : e.productKey}</span></div></td>
      <td>${e.seatsUsed.toLocaleString()} / ${e.seatsTotal.toLocaleString()}</td>
      <td class="${d <= 14 ? 'td-strong' : ''}" style="${d <= 14 ? 'color:var(--warning)' : ''}">${d}d left</td>
      <td><span class="badge badge-${e.status}">${e.status}</span></td>
    </tr>`;
  }).join('') || `<tr><td colspan="4"><div class="empty-state" style="padding:24px;">Nothing expiring in the next 60 days.</div></td></tr>`;

  const bottomGrid = `
    <div class="two-col">
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="bi bi-activity"></i> Recent Activity</div></div>
        <div class="card-body"><div class="activity-list">${activityHtml}</div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="bi bi-hourglass-split"></i> Expiring Soon</div></div>
        <div class="table-wrap"><table><thead><tr><th>Product</th><th>Seats</th><th>Expires</th><th>Status</th></tr></thead><tbody>${expiringRows}</tbody></table></div>
      </div>
    </div>`;

  return statsHtml + dashGrid + threeColGrid + bottomGrid;
}

// ===== My Products =====
function renderProducts() {
  const f = S.productsFilter;
  const ownedKeys = getOwnedProductKeys();
  let products = PRODUCTS.filter((p) => ownedKeys.includes(p.key));
  const categories = [...new Set(products.map((p) => p.category))].sort();

  if (f.search) {
    const s = f.search.toLowerCase();
    products = products.filter((p) => p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s) || p.vendorLine.toLowerCase().includes(s));
  }
  if (f.category !== 'all') products = products.filter((p) => p.category === f.category);
  if (f.type !== 'all') products = products.filter((p) => p.type === f.type);

  const cardsHtml = products.length ? products.map((p) => {
    const ents = getEntitlementsForProduct(p.key);
    const attention = ents.some((e) => e.status === 'expiring' || e.status === 'expired' || e.status === 'suspended');
    const midPipeline = getPurchasesForProduct(p.key).some((pu) => pu.orderStatus === 'processing' || pu.orderStatus === 'provisioning');
    const firstPurchase = [...getPurchasesForProduct(p.key)].sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate))[0];
    const color = getCategoryColor(p.category);
    const statusLabel = midPipeline ? 'Provisioning' : (attention ? 'Attention' : 'Active');
    const statusColor = midPipeline || attention ? 'var(--warning)' : 'var(--success)';
    return `
      <button class="product-card" data-product-key="${p.key}">
        <div class="product-icon-tile" style="background:${color}"><i class="bi ${p.icon}"></i></div>
        <div class="product-name">${p.name}</div>
        <div class="product-vendor">${p.vendorLine}</div>
        <div class="product-desc">${p.shortDesc}</div>
        <div class="product-badges">
          <span class="badge badge-${p.type}">${p.type}</span>
          <span class="badge" style="background:${hexToRgba(color, 0.12)};color:${color}">${p.category}</span>
        </div>
        <div class="product-foot">
          <span>Owned since ${firstPurchase ? fmtDate(firstPurchase.purchaseDate) : '—'}</span>
          <span style="color:${statusColor};font-weight:700;">${statusLabel}</span>
        </div>
      </button>`;
  }).join('') : `<div class="empty-state"><i class="bi bi-inbox"></i>No products match your filters.</div>`;

  return `
    <div class="filter-bar">
      <div class="search-wrap"><i class="bi bi-search"></i><input class="form-control" id="products-search" placeholder="Search products..." value="${f.search}" /></div>
      <select class="form-control" id="products-category">
        <option value="all">All Categories</option>
        ${categories.map((c) => `<option value="${c}" ${f.category === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <select class="form-control" id="products-type">
        <option value="all" ${f.type === 'all' ? 'selected' : ''}>All Types</option>
        <option value="hardware" ${f.type === 'hardware' ? 'selected' : ''}>Hardware</option>
        <option value="software" ${f.type === 'software' ? 'selected' : ''}>Software</option>
        <option value="subscription" ${f.type === 'subscription' ? 'selected' : ''}>Subscription</option>
      </select>
      <div class="filter-spacer"></div>
      <button class="btn btn-primary" data-nav="configurator"><i class="bi bi-cart-plus-fill"></i> New Order</button>
    </div>
    <div class="product-grid">${cardsHtml}</div>`;
}

// ===== Product Detail =====
function renderUsageSection(key) {
  const cfg = USAGE_METRIC_CONFIG[key];
  const history = getUsageHistoryForProduct(key);
  if (!cfg || !history.length) return '';

  const capacity = getUsageCapacity(key);
  const current = history[history.length - 1].value;
  const earliest = history[0].value;
  const deltaPct = earliest > 0 ? Math.round(((current - earliest) / earliest) * 100) : 0;
  const pct = capacity ? Math.min(100, Math.round((current / capacity) * 100)) : null;
  const maxVal = Math.max(...history.map((h) => h.value));

  const barsHtml = history.map((h) => {
    const heightPct = maxVal > 0 ? Math.max(Math.round((h.value / maxVal) * 100), 6) : 6;
    const d = new Date(h.weekStart + 'T00:00:00');
    return `<div class="bar-col"><div class="bar-fill" style="height:${heightPct}%" title="${fmtDate(h.weekStart)}: ${h.value.toLocaleString()} ${cfg.unit}"></div><div class="bar-label">${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div></div>`;
  }).join('');

  return `
    <div class="detail-section">
      <div class="section-title"><i class="bi bi-graph-up"></i> Usage &amp; Activity</div>
      <div class="card">
        <div class="card-body">
          <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:16px;">
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">${cfg.label}</div>
              <div style="font-size:28px;font-weight:800;">${current.toLocaleString()} <span style="font-size:13px;font-weight:600;color:var(--text-light);">${cfg.unit}</span></div>
              <div class="stat-delta ${deltaPct >= 0 ? 'up' : 'warn'}" style="margin-top:4px;">${deltaPct >= 0 ? '+' : ''}${deltaPct}% vs 8 weeks ago</div>
            </div>
            ${capacity ? `
            <div style="min-width:200px;flex:1;max-width:280px;">
              <div class="entitlement-meta-row" style="margin-bottom:0;"><span>Utilization</span><span>${pct}%</span></div>
              <div class="progress-wrap"><div class="progress-fill ${pct >= 90 ? 'warn' : ''}" style="width:${pct}%"></div></div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${current.toLocaleString()} of ${capacity.toLocaleString()} ${cfg.unit}</div>
            </div>` : ''}
          </div>
          <div class="mini-bars">${barsHtml}</div>
          <div class="bar-legend"><span>8-week trend</span><span>Peak: <strong>${maxVal.toLocaleString()}</strong></span></div>
        </div>
      </div>
    </div>`;
}

function renderProductDetail(key) {
  const p = getProductByKey(key);
  if (!p) {
    return `<div class="empty-state"><i class="bi bi-question-circle"></i>Product not found.<br/><button class="btn btn-secondary" style="margin-top:14px;" data-back-products>Back to My Products</button></div>`;
  }
  const purchases = [...getPurchasesForProduct(key)].sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
  const ents = getEntitlementsForProduct(key);
  const downloads = [...getDownloadsForProduct(key)].sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
  const color = getCategoryColor(p.category);

  const purchasesRows = purchases.map((pu) => `
    <tr data-order-row="${pu.id}" style="cursor:pointer;">
      <td class="td-mono">${pu.id}</td>
      <td class="td-mono td-muted">${pu.poNumber}</td>
      <td><span class="badge badge-${pu.orderType}">${pu.orderType}</span></td>
      <td>${pu.qty.toLocaleString()}</td>
      <td>${fmtDate(pu.purchaseDate)}</td>
      <td><span class="badge badge-${pu.orderStatus}">${pu.orderStatus}</span></td>
      <td><span class="badge badge-${pu.provisioningStatus}">${pu.provisioningStatus.replace('-', ' ')}</span></td>
      <td class="td-strong">${fmt$(pu.totalPrice)}</td>
    </tr>`).join('');

  const entsHtml = ents.length
    ? `<div class="entitlement-grid">${ents.map((e) => renderEntitlementCard(e, false)).join('')}</div>`
    : `<div class="empty-state"><i class="bi bi-key"></i>No entitlements on file for this product.</div>`;

  const downloadsHtml = downloads.length
    ? downloads.map((d) => renderDownloadRow(d, false)).join('')
    : `<div class="empty-state"><i class="bi bi-cloud-slash"></i>No downloadable files for this product.</div>`;

  const usageHtml = renderUsageSection(key);

  return `
    <button class="back-link" data-back-products><i class="bi bi-arrow-left"></i> Back to My Products</button>
    <div class="card detail-hero">
      <div class="detail-icon-tile" style="background:${color}"><i class="bi ${p.icon}"></i></div>
      <div style="flex:1;">
        <div class="detail-vendor">${p.vendorLine}</div>
        <div class="detail-title-row">
          <div class="detail-title">${p.name}</div>
          <span class="badge badge-${p.type}">${p.type}</span>
          <span class="badge" style="background:${hexToRgba(color, 0.12)};color:${color}">${p.category}</span>
        </div>
        <div class="detail-desc">${p.longDesc}</div>
        <div style="margin-top:14px;"><button class="btn btn-primary btn-sm" data-configure-product="${p.key}"><i class="bi bi-cart-plus-fill"></i> Order More / Configure</button></div>
      </div>
    </div>

    ${usageHtml}

    <div class="detail-section">
      <div class="section-title"><i class="bi bi-receipt"></i> Your Orders for This Product</div>
      <div class="card"><div class="table-wrap"><table><thead><tr><th>Order ID</th><th>PO Number</th><th>Type</th><th>Qty</th><th>Purchased</th><th>Order Status</th><th>Provisioning</th><th>Amount</th></tr></thead><tbody>${purchasesRows}</tbody></table></div></div>
    </div>

    <div class="detail-section">
      <div class="section-title"><i class="bi bi-key-fill"></i> Entitlements &amp; License Keys</div>
      ${entsHtml}
    </div>

    <div class="detail-section">
      <div class="section-title"><i class="bi bi-cloud-arrow-down-fill"></i> Downloads</div>
      <div class="card">${downloadsHtml}</div>
    </div>`;
}

function renderEntitlementCard(e, showProductName) {
  const product = getProductByKey(e.productKey);
  const days = daysUntil(e.expiryDate);
  const pct = e.seatsTotal > 0 ? Math.min(100, Math.round((e.seatsUsed / e.seatsTotal) * 100)) : 0;
  const fillClass = e.status === 'expired' ? 'danger' : (e.status === 'expiring' ? 'warn' : '');
  const topLeft = showProductName
    ? `<i class="bi ${product ? product.icon : 'bi-box'}" style="color:${product ? getCategoryColor(product.category) : 'var(--text-muted)'};margin-right:6px;"></i>${product ? product.name : e.productKey}`
    : `Support Tier: ${e.supportTier}`;
  const features = (product && product.features) || [];
  const tierDetails = SUPPORT_TIER_DETAILS[e.supportTier];

  const featuresHtml = features.length ? `
      <div class="entitlement-section">
        <div class="entitlement-section-label"><i class="bi bi-check2-circle"></i> Feature Entitlements</div>
        <div class="perm-chips">${features.map((f) => `<span class="perm-chip">${f}</span>`).join('')}</div>
      </div>` : '';

  const supportHtml = tierDetails ? `
      <div class="entitlement-section">
        <div class="entitlement-section-label"><i class="bi bi-headset"></i> Support Included — ${e.supportTier}</div>
        <div class="entitlement-support-meta">${tierDetails.sla} &middot; ${tierDetails.hours} &middot; ${tierDetails.channels}</div>
        <div class="perm-chips">${tierDetails.includes.map((i) => `<span class="perm-chip">${i}</span>`).join('')}</div>
      </div>` : '';

  return `
    <div class="entitlement-card">
      <div class="entitlement-top"><div class="entitlement-product">${topLeft}</div><span class="badge badge-${e.status}">${e.status}</span></div>
      <div class="license-key-row">
        <div class="license-key">${e.licenseKey}</div>
        <button class="icon-btn copy-btn" data-copy-key="${e.licenseKey}" title="Copy license key"><i class="bi bi-clipboard"></i></button>
      </div>
      <div class="progress-wrap"><div class="progress-fill ${fillClass}" style="width:${pct}%"></div></div>
      <div class="entitlement-meta-row"><span>${e.seatsUsed.toLocaleString()} / ${e.seatsTotal.toLocaleString()} seats used</span><span>${pct}%</span></div>
      ${featuresHtml}
      ${supportHtml}
      <div class="entitlement-footer">
        <span></span>
        <span>${days !== null ? (days < 0 ? `Expired ${fmtDate(e.expiryDate)}` : `${days}d left &middot; ${fmtDate(e.expiryDate)}`) : '—'}</span>
      </div>
    </div>`;
}

function renderDownloadRow(d, showProduct) {
  const product = getProductByKey(d.productKey);
  const platformIcons = { Windows: 'bi-windows', macOS: 'bi-apple', Linux: 'bi-ubuntu', Docker: 'bi-box-fill', OVA: 'bi-hdd-stack-fill', Firmware: 'bi-cpu-fill', iOS: 'bi-apple', Android: 'bi-android2' };
  return `
    <div class="download-row">
      <div class="download-platform-icon"><i class="bi ${platformIcons[d.platform] || 'bi-file-earmark-arrow-down'}"></i></div>
      <div class="download-info">
        <div class="download-name">${showProduct ? `${product ? product.name : d.productKey} — ` : ''}v${d.version} <span class="badge" style="background:var(--slate-bg);color:var(--text-muted);">${d.platform}</span>${d.isLatest ? '<span class="badge badge-latest">Latest</span>' : ''}</div>
        <div class="download-meta">${d.fileSizeMb.toLocaleString()} MB &middot; Released ${fmtDate(d.releaseDate)}</div>
        <div class="download-notes">${d.releaseNotes}</div>
      </div>
      <button class="btn btn-secondary btn-sm" data-download-id="${d.id}"><i class="bi bi-download"></i> Download</button>
    </div>`;
}

// ===== Configurator =====
function renderConfigurator() {
  const step = S.configurator.step;
  const stepBar = renderStepBar(step);
  let body;
  if (step === 1) body = renderConfigStep1();
  else if (step === 2) body = renderConfigStep2();
  else if (step === 3) body = renderConfigStep3();
  else if (step === 4) body = renderConfigStep4();
  else body = renderConfigStep5();

  if (step === 5) return stepBar + body;
  return `${stepBar}<div class="configurator-layout"><div>${body}</div>${renderConfigSummaryPanel()}</div>`;
}

function renderStepBar(step) {
  const parts = [];
  CONFIG_STEP_LABELS.forEach((label, i) => {
    const n = i + 1;
    const state = n < step ? 'done' : n === step ? 'active' : '';
    parts.push(`<div class="step-bar-item ${state}"><div class="step-circle">${n < step ? '<i class="bi bi-check-lg"></i>' : n}</div><div class="step-label">${label}</div></div>`);
    if (i < CONFIG_STEP_LABELS.length - 1) parts.push(`<div class="step-bar-line ${n < step ? 'done' : ''}"></div>`);
  });
  return `<div class="step-bar">${parts.join('')}</div>`;
}

function renderConfigStep1() {
  const f = S.configurator.catalogFilter;
  let products = PRODUCTS.filter((p) => !p.addonForKey);
  const categories = [...new Set(PRODUCTS.map((p) => p.category))].sort();
  if (f.search) { const s = f.search.toLowerCase(); products = products.filter((p) => p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s) || p.vendorLine.toLowerCase().includes(s)); }
  if (f.category !== 'all') products = products.filter((p) => p.category === f.category);

  const cards = products.map((p) => {
    const color = getCategoryColor(p.category);
    return `<button class="catalog-pick-card" data-select-config-product="${p.key}">
      <div class="product-icon-tile" style="background:${color}"><i class="bi ${p.icon}"></i></div>
      <div class="product-name">${p.name}</div>
      <div class="product-vendor">${p.vendorLine}</div>
      <div class="product-badges"><span class="badge badge-${p.type}">${p.type}</span><span class="badge" style="background:${hexToRgba(color, 0.12)};color:${color}">${p.category}</span></div>
      <div class="catalog-price">${p.listPrice > 0 ? fmt$(p.listPrice) : 'Included'} <span>${p.priceUnit}</span></div>
    </button>`;
  }).join('');

  return `
    <div class="card-header" style="border:none;padding:0 0 14px;"><div class="card-title" style="font-size:15px;"><i class="bi bi-1-circle-fill"></i> Choose a product to configure</div></div>
    <div class="filter-bar">
      <div class="search-wrap"><i class="bi bi-search"></i><input class="form-control" id="config-search" placeholder="Search products..." value="${f.search}" /></div>
      <select class="form-control" id="config-category">
        <option value="all">All Categories</option>
        ${categories.map((c) => `<option value="${c}" ${f.category === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="product-grid">${cards || '<div class="empty-state"><i class="bi bi-inbox"></i>No products match your filters.</div>'}</div>`;
}

function renderConfigStep2() {
  const product = getProductByKey(S.configurator.productKey);
  if (!product) return `<div class="empty-state">Select a product first.<br/><button class="btn btn-secondary" style="margin-top:14px;" data-config-back>Back</button></div>`;

  const tierCards = SUPPORT_TIERS.map((t) => `
    <button class="option-card ${S.configurator.supportTier === t.key ? 'selected' : ''}" data-support-tier="${t.key}">
      <div class="option-card-title">${t.key} Support</div>
      <div class="option-card-sub">${t.mult === 1 ? 'Included' : `+${Math.round((t.mult - 1) * 100)}%`}</div>
    </button>`).join('');

  const termHtml = product.type === 'subscription' ? `
    <div class="form-group">
      <label class="form-label">Term Length</label>
      <div class="option-card-grid">
        <button class="option-card ${S.configurator.term === 'annual' ? 'selected' : ''}" data-term="annual">
          <div class="option-card-title">1-Year</div><div class="option-card-sub">Billed annually</div>
        </button>
        <button class="option-card ${S.configurator.term === '3yr' ? 'selected' : ''}" data-term="3yr">
          <div class="option-card-title">3-Year Prepay</div><div class="option-card-sub">Pay upfront for 3 years</div>
          <span class="option-card-badge">Save 10%</span>
        </button>
      </div>
    </div>` : '';

  return `
    <div class="card-header" style="border:none;padding:0 0 14px;"><div class="card-title" style="font-size:15px;"><i class="bi bi-2-circle-fill"></i> Configure ${product.name}</div></div>
    <div class="form-group">
      <label class="form-label">${product.type === 'hardware' ? 'Quantity' : 'Seats'}</label>
      <div class="qty-stepper">
        <button type="button" data-qty-decr><i class="bi bi-dash"></i></button>
        <input id="config-qty-input" type="number" min="1" value="${S.configurator.qty}" />
        <button type="button" data-qty-incr><i class="bi bi-plus"></i></button>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Support Tier</label>
      <div class="option-card-grid">${tierCards}</div>
    </div>
    ${termHtml}
    <div class="wizard-actions">
      <button class="btn btn-secondary" data-config-back><i class="bi bi-arrow-left"></i> Back</button>
      <button class="btn btn-primary" data-config-next>Next <i class="bi bi-arrow-right"></i></button>
    </div>`;
}

function renderConfigStep3() {
  const product = getProductByKey(S.configurator.productKey);
  if (!product) return `<div class="empty-state">Select a product first.<br/><button class="btn btn-secondary" style="margin-top:14px;" data-config-back>Back</button></div>`;
  const addons = getAddonsForProduct(product.key);
  const body = addons.length ? addons.map((a) => `
    <label class="checkbox-row" style="align-items:center;">
      <input type="checkbox" data-addon-checkbox value="${a.key}" ${S.configurator.addons.includes(a.key) ? 'checked' : ''} />
      <div style="flex:1;"><div class="checkbox-row-label">${a.name}</div><div class="checkbox-row-desc">${a.shortDesc}</div></div>
      <div class="td-strong">${a.listPrice > 0 ? fmt$(a.listPrice) : 'Free'} <span style="font-weight:500;color:var(--text-light);">${a.priceUnit}</span></div>
    </label>`).join('') : `<div class="empty-state"><i class="bi bi-inbox"></i>No add-ons available for this product.</div>`;

  return `
    <div class="card-header" style="border:none;padding:0 0 14px;"><div class="card-title" style="font-size:15px;"><i class="bi bi-3-circle-fill"></i> Add compatible add-ons</div></div>
    <div style="display:flex;flex-direction:column;gap:10px;">${body}</div>
    <div class="wizard-actions">
      <button class="btn btn-secondary" data-config-back><i class="bi bi-arrow-left"></i> Back</button>
      <button class="btn btn-primary" data-config-next>Next <i class="bi bi-arrow-right"></i></button>
    </div>`;
}

function renderConfigStep4() {
  const { lines, total } = calcConfiguratorLineItems();
  if (!lines.length) return `<div class="empty-state">Select a product first.<br/><button class="btn btn-secondary" style="margin-top:14px;" data-config-back>Back</button></div>`;
  const rows = lines.map((l) => `<tr><td>${l.name}${l.isAddon ? ' <span class="perm-chip">Add-on</span>' : ''}</td><td>${l.qty.toLocaleString()}</td><td>${fmt$(l.unitPrice)}</td><td class="td-strong">${fmt$(l.lineTotal)}</td></tr>`).join('');
  return `
    <div class="card-header" style="border:none;padding:0 0 14px;"><div class="card-title" style="font-size:15px;"><i class="bi bi-4-circle-fill"></i> Review your order</div></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead><tbody>${rows}</tbody></table></div></div>
    <div class="form-group" style="margin-top:18px;max-width:340px;">
      <label class="form-label">PO Number (optional)</label>
      <input class="form-control" id="config-po-number" placeholder="Auto-generated if left blank" />
    </div>
    <div class="wizard-actions">
      <button class="btn btn-secondary" data-config-back><i class="bi bi-arrow-left"></i> Back</button>
      <button class="btn btn-primary" id="place-order-btn"><i class="bi bi-check2-circle"></i> Place Order — ${fmt$(total)}</button>
    </div>`;
}

function renderConfigStep5() {
  const orderId = S.configurator.lastOrderId;
  return `
    <div class="card" style="max-width:520px;margin:20px auto;padding:36px;text-align:center;">
      <div class="confirm-success-icon"><i class="bi bi-check-lg"></i></div>
      <div style="font-size:18px;font-weight:800;margin-bottom:6px;">Order Submitted</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">Order <strong class="td-mono">${orderId}</strong> has been placed and is now processing.</div>
      <div class="order-timeline" style="max-width:420px;margin:0 auto 24px;">
        ${['Submitted', 'Processing', 'Provisioning', 'Fulfilled'].map((label, i) => `
          <div class="timeline-step ${i === 0 ? 'done' : i === 1 ? 'active' : ''}">
            ${i > 0 ? '<div class="timeline-line"></div>' : ''}
            <div class="tl-dot">${i === 0 ? '<i class="bi bi-check"></i>' : i + 1}</div>
            <div class="tl-label">${label}</div>
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="btn btn-secondary" id="config-another-btn"><i class="bi bi-plus-lg"></i> Configure Another Product</button>
        <button class="btn btn-primary" data-view-order="${orderId}"><i class="bi bi-eye"></i> View Order</button>
      </div>
    </div>`;
}

function renderConfigSummaryPanel() {
  const product = getProductByKey(S.configurator.productKey);
  if (!product) {
    return `<div class="card summary-panel"><div class="card-header"><div class="card-title"><i class="bi bi-receipt-cutoff"></i> Order Summary</div></div><div class="card-body"><div class="empty-state" style="padding:20px;">Choose a product to see pricing.</div></div></div>`;
  }
  const { lines, total } = calcConfiguratorLineItems();
  return `
    <div class="card summary-panel">
      <div class="card-header"><div class="card-title"><i class="bi bi-receipt-cutoff"></i> Order Summary</div></div>
      <div class="card-body">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <div class="product-icon-tile" style="background:${getCategoryColor(product.category)};width:34px;height:34px;font-size:15px;margin-bottom:0;"><i class="bi ${product.icon}"></i></div>
          <div><div style="font-size:13px;font-weight:700;">${product.name}</div><div style="font-size:11px;color:var(--text-light);">${S.configurator.supportTier} &middot; ${product.type === 'subscription' ? (S.configurator.term === '3yr' ? '3-Year' : '1-Year') : 'One-time'}</div></div>
        </div>
        ${lines.map((l) => `<div class="line-item-row"><span>${l.name} &times; ${l.qty}</span><span>${fmt$(l.lineTotal)}</span></div>`).join('')}
        <div class="summary-total-row"><span>Total</span><span>${fmt$(total)}</span></div>
      </div>
    </div>`;
}

function selectConfiguratorProduct(key) {
  S.configurator.productKey = key;
  S.configurator.qty = 1;
  S.configurator.supportTier = 'Standard';
  S.configurator.term = 'annual';
  S.configurator.addons = [];
  S.configurator.step = 2;
  updatePageBody();
}

function placeOrder() {
  const product = getProductByKey(S.configurator.productKey);
  if (!product) { showToast('Select a product first.', 'error'); return; }
  const poInput = $id('config-po-number');
  const groupId = generateOrderId();
  const items = [{ product, qty: S.configurator.qty, isAddon: false }]
    .concat(getAddonsForProduct(product.key)
      .filter((a) => S.configurator.addons.includes(a.key))
      .map((a) => ({ product: a, qty: a.priceUnit.includes('per seat') ? S.configurator.qty : 1, isAddon: true })));

  const invoiceDueDate = isoPlusDays(30);
  items.forEach((item, idx) => {
    const orderId = idx === 0 ? groupId : generateOrderId();
    const unitPrice = getLineUnitPrice(item.product, S.configurator.supportTier, S.configurator.term);
    const totalPrice = Math.round(unitPrice * item.qty * 100) / 100;
    const orderType = item.product.type === 'hardware' ? 'hardware' : item.product.type === 'subscription' ? 'subscription' : 'perpetual';
    const renewalDate = item.product.type === 'subscription' ? (S.configurator.term === '3yr' ? isoPlusDays(365 * 3) : isoPlusDays(365)) : '';
    const invoiceId = 'inv-' + orderId.toLowerCase();
    const purchase = {
      id: orderId,
      poNumber: (poInput && poInput.value.trim()) || ('PO-CUST-' + Math.floor(10000 + Math.random() * 89999)),
      productKey: item.product.key, orderType, qty: item.qty, unitPrice, totalPrice,
      purchaseDate: isoToday(), renewalDate,
      billingCycle: item.product.type === 'subscription' ? (S.configurator.term === '3yr' ? '3-year' : 'annual') : 'one-time',
      status: 'active', orderStatus: 'processing', provisioningStatus: 'not-started',
      invoiceId, orderGroupId: groupId,
    };
    PURCHASES.unshift(purchase);
    INVOICES.unshift({ id: invoiceId, invoiceNumber: 'INV-' + orderId.replace('ORD-', ''), purchaseId: orderId, issueDate: isoToday(), dueDate: invoiceDueDate, amount: totalPrice, status: 'pending', paidDate: '' });
    ENTITLEMENTS.push({
      id: 'ENT-' + Math.random().toString(36).slice(2, 8).toUpperCase(), purchaseId: orderId, productKey: item.product.key,
      licenseKey: generateLicenseKey(item.product.key), seatsTotal: item.qty, seatsUsed: 0, status: 'active',
      activationDate: isoToday(), expiryDate: renewalDate || isoPlusDays(365 * 5), supportTier: S.configurator.supportTier,
    });
    ACTIVITY.unshift({ id: 'act-' + Math.random().toString(36).slice(2, 8), date: isoToday(), actorName: CURRENT_USER.name, category: 'blue', text: `Placed order for <strong>${item.product.name}</strong> (${item.qty.toLocaleString()} ${item.qty === 1 ? 'unit' : 'units'})` });
    scheduleOrderProgression(orderId);
  });

  S.configurator.lastOrderId = groupId;
  S.configurator.step = 5;
  updatePageBody();
  showToast(`Order ${groupId} submitted`, 'success');
}

function scheduleOrderProgression(orderId) {
  setTimeout(() => {
    const p = PURCHASES.find((x) => x.id === orderId);
    if (!p || p.orderStatus === 'cancelled') return;
    p.orderStatus = 'provisioning';
    p.provisioningStatus = 'in-progress';
    ACTIVITY.unshift({ id: 'act-' + Math.random().toString(36).slice(2, 8), date: isoToday(), actorName: 'System', category: 'amber', text: `Order <strong>${orderId}</strong> entered provisioning` });
    showToast(`Order ${orderId} is now provisioning`, 'success');
    refreshIfMounted();
  }, 4000);

  setTimeout(() => {
    const p = PURCHASES.find((x) => x.id === orderId);
    if (!p || p.orderStatus === 'cancelled') return;
    p.orderStatus = 'fulfilled';
    p.provisioningStatus = 'complete';
    const ent = ENTITLEMENTS.find((e) => e.purchaseId === orderId);
    if (ent) ent.seatsUsed = Math.max(1, Math.round(ent.seatsTotal * (0.4 + Math.random() * 0.3)));
    const prod = getProductByKey(p.productKey);
    ACTIVITY.unshift({ id: 'act-' + Math.random().toString(36).slice(2, 8), date: isoToday(), actorName: 'System', category: 'green', text: `Order <strong>${orderId}</strong> fulfilled — entitlement issued for <strong>${prod ? prod.name : p.productKey}</strong>` });
    showToast(`Order ${orderId} fulfilled — entitlement issued`, 'success');
    refreshIfMounted();
  }, 9000);
}

// ===== Orders =====
function renderOrders() {
  const subs = getSubscriptions();
  const tab = S.ordersTab;
  return `
    <div class="tabs">
      <button class="tab-btn ${tab === 'orders' ? 'active' : ''}" data-orders-tab="orders">All Orders (${PURCHASES.length})</button>
      <button class="tab-btn ${tab === 'subscriptions' ? 'active' : ''}" data-orders-tab="subscriptions">Subscriptions (${subs.length})</button>
    </div>
    ${tab === 'subscriptions' ? renderSubscriptionsList(subs) : renderOrdersList()}`;
}

function renderSubscriptionsList(subs) {
  const rows = subs.length ? subs.map((s) => {
    const p = getProductByKey(s.productKey);
    return `
      <tr data-subscription-row="${s.productKey}" style="cursor:pointer;">
        <td><div class="user-cell"><i class="bi ${p ? p.icon : 'bi-box'}" style="color:${p ? getCategoryColor(p.category) : 'var(--text-muted)'};font-size:15px;"></i><span class="td-strong">${p ? p.name : s.productKey}</span></div></td>
        <td>${s.orderCount} order${s.orderCount === 1 ? '' : 's'}</td>
        <td>${fmtDate(s.startDate)}</td>
        <td><span class="badge badge-${s.status}">${s.status.replace('-', ' ')}</span></td>
        <td>${s.nextRenewalDate ? fmtDate(s.nextRenewalDate) : '—'}</td>
        <td class="td-strong">${fmt$(s.totalSpend)}</td>
      </tr>`;
  }).join('') : `<tr><td colspan="6"><div class="empty-state"><i class="bi bi-inbox"></i>No subscriptions on file.</div></td></tr>`;

  return `
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Product</th><th>Orders</th><th>Start Date</th><th>Status</th><th>Next Renewal</th><th>Total Spend</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

function renderSubscriptionDetail(key) {
  const sub = getSubscriptionByKey(key);
  if (!sub) return `<div class="empty-state"><i class="bi bi-question-circle"></i>Subscription not found.<br/><button class="btn btn-secondary" style="margin-top:14px;" data-back-orders>Back to Orders</button></div>`;
  const p = getProductByKey(key);
  const color = p ? getCategoryColor(p.category) : 'var(--slate)';
  const days = sub.nextRenewalDate ? daysUntil(sub.nextRenewalDate) : null;

  const historyRows = sub.orders.map((o, i) => `
    <tr data-order-row="${o.id}" style="cursor:pointer;">
      <td class="td-mono">${o.id}</td>
      <td>${i === 0 ? 'Initial Purchase' : 'Renewal'}</td>
      <td>${o.qty.toLocaleString()}</td>
      <td>${fmtDate(o.purchaseDate)}</td>
      <td>${o.renewalDate ? fmtDate(o.renewalDate) : '—'}</td>
      <td><span class="badge badge-${o.status}">${o.status.replace('-', ' ')}</span></td>
      <td><span class="badge badge-${o.orderStatus}">${o.orderStatus}</span></td>
      <td class="td-strong">${fmt$(o.totalPrice)}</td>
    </tr>`).join('');

  return `
    <button class="back-link" data-back-orders><i class="bi bi-arrow-left"></i> Back to Orders</button>
    <div class="card detail-hero">
      <div class="detail-icon-tile" style="background:${color}"><i class="bi ${p ? p.icon : 'bi-box'}"></i></div>
      <div style="flex:1;">
        <div class="detail-vendor">${p ? p.vendorLine : ''} &middot; Subscription</div>
        <div class="detail-title-row">
          <div class="detail-title">${p ? p.name : key}</div>
          <span class="badge badge-${sub.status}">${sub.status.replace('-', ' ')}</span>
        </div>
        <div class="detail-desc">Subscribed since ${fmtDate(sub.startDate)} &middot; ${sub.orderCount} order${sub.orderCount === 1 ? '' : 's'} &middot; ${fmt$(sub.totalSpend)} total spend</div>
      </div>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);">
      <div class="stat-card">
        <div class="stat-label">Start Date</div>
        <div class="stat-value" style="font-size:19px;">${fmtDate(sub.startDate)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Next Renewal</div>
        <div class="stat-value" style="font-size:19px;">${sub.nextRenewalDate ? fmtDate(sub.nextRenewalDate) : '—'}</div>
        ${days !== null ? `<div class="stat-delta ${days <= 14 ? 'warn' : ''}">${days < 0 ? 'Overdue' : `${days}d away`}</div>` : ''}
      </div>
      <div class="stat-card">
        <div class="stat-label">Active Seats</div>
        <div class="stat-value" style="font-size:19px;">${sub.totalSeats.toLocaleString()}</div>
      </div>
    </div>

    <div class="detail-section">
      <div class="section-title"><i class="bi bi-clock-history"></i> Order History</div>
      <div class="card"><div class="table-wrap"><table><thead><tr><th>Order ID</th><th>Type</th><th>Qty</th><th>Purchased</th><th>Renews</th><th>Status</th><th>Order Status</th><th>Amount</th></tr></thead><tbody>${historyRows}</tbody></table></div></div>
    </div>`;
}

function renderOrdersList() {
  const f = S.ordersFilter;
  let rows = [...PURCHASES];
  if (f.search) {
    const s = f.search.toLowerCase();
    rows = rows.filter((p) => { const prod = getProductByKey(p.productKey); return p.id.toLowerCase().includes(s) || p.poNumber.toLowerCase().includes(s) || (prod && prod.name.toLowerCase().includes(s)); });
  }
  if (f.type !== 'all') rows = rows.filter((p) => p.orderType === f.type);
  if (f.orderStatus !== 'all') rows = rows.filter((p) => p.orderStatus === f.orderStatus);
  rows.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));

  const bodyRows = rows.length ? rows.map((p) => {
    const prod = getProductByKey(p.productKey);
    const invoice = getInvoiceForPurchase(p.id);
    return `
      <tr data-order-row="${p.id}" style="cursor:pointer;">
        <td class="td-mono">${p.id}</td>
        <td><div class="user-cell"><i class="bi ${prod ? prod.icon : 'bi-box'}" style="color:${prod ? getCategoryColor(prod.category) : 'var(--text-muted)'};font-size:15px;"></i><span class="td-strong">${prod ? prod.name : p.productKey}</span></div></td>
        <td><span class="badge badge-${p.orderType}">${p.orderType}</span></td>
        <td>${p.qty.toLocaleString()}</td>
        <td>${fmtDate(p.purchaseDate)}</td>
        <td><span class="badge badge-${p.orderStatus}">${p.orderStatus}</span></td>
        <td><span class="badge badge-${p.provisioningStatus}">${p.provisioningStatus.replace('-', ' ')}</span></td>
        <td>${invoice ? `<span class="badge badge-${invoice.status}">${invoice.status}</span>` : '—'}</td>
        <td class="td-strong">${fmt$(p.totalPrice)}</td>
      </tr>`;
  }).join('') : `<tr><td colspan="9"><div class="empty-state"><i class="bi bi-inbox"></i>No orders match your filters.</div></td></tr>`;

  return `
    <div class="filter-bar">
      <div class="search-wrap"><i class="bi bi-search"></i><input class="form-control" id="orders-search" placeholder="Search by product, order ID, or PO..." value="${f.search}" /></div>
      <select class="form-control" id="orders-type">
        <option value="all" ${f.type === 'all' ? 'selected' : ''}>All Types</option>
        <option value="hardware" ${f.type === 'hardware' ? 'selected' : ''}>Hardware</option>
        <option value="perpetual" ${f.type === 'perpetual' ? 'selected' : ''}>Perpetual</option>
        <option value="subscription" ${f.type === 'subscription' ? 'selected' : ''}>Subscription</option>
      </select>
      <select class="form-control" id="orders-status">
        <option value="all" ${f.orderStatus === 'all' ? 'selected' : ''}>All Statuses</option>
        <option value="submitted" ${f.orderStatus === 'submitted' ? 'selected' : ''}>Submitted</option>
        <option value="processing" ${f.orderStatus === 'processing' ? 'selected' : ''}>Processing</option>
        <option value="provisioning" ${f.orderStatus === 'provisioning' ? 'selected' : ''}>Provisioning</option>
        <option value="fulfilled" ${f.orderStatus === 'fulfilled' ? 'selected' : ''}>Fulfilled</option>
        <option value="cancelled" ${f.orderStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
      </select>
      <div class="filter-spacer"></div>
      <div style="font-size:12px;color:var(--text-muted);">${rows.length} of ${PURCHASES.length} orders</div>
      <button class="btn btn-primary" data-nav="configurator"><i class="bi bi-cart-plus-fill"></i> New Order</button>
    </div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Order ID</th><th>Product</th><th>Type</th><th>Qty</th><th>Purchased</th><th>Order Status</th><th>Provisioning</th><th>Invoice</th><th>Amount</th></tr></thead><tbody>${bodyRows}</tbody></table></div></div>`;
}

function renderOrderDetail(orderId) {
  const order = PURCHASES.find((p) => p.id === orderId);
  if (!order) return `<div class="empty-state"><i class="bi bi-question-circle"></i>Order not found.<br/><button class="btn btn-secondary" style="margin-top:14px;" data-back-orders>Back to Orders</button></div>`;
  const product = getProductByKey(order.productKey);
  const invoice = getInvoiceForPurchase(order.id);
  const entitlement = ENTITLEMENTS.find((e) => e.purchaseId === order.id);
  const siblings = getOrdersInGroup(order.orderGroupId).filter((o) => o.id !== order.id);
  const color = product ? getCategoryColor(product.category) : '#667085';
  const currentIdx = ORDER_STEPS.indexOf(order.orderStatus);

  const isFulfilled = order.orderStatus === 'fulfilled';
  const timelineHtml = order.orderStatus === 'cancelled'
    ? `<div class="empty-state" style="padding:20px;"><i class="bi bi-x-circle"></i>This order was cancelled.</div>`
    : `<div class="order-timeline">${ORDER_STEPS.map((s, i) => `
        <div class="timeline-step ${i < currentIdx || isFulfilled ? 'done' : i === currentIdx ? 'active' : ''}">
          ${i > 0 ? `<div class="timeline-line ${i <= currentIdx ? 'done' : ''}"></div>` : ''}
          <div class="tl-dot">${i < currentIdx || isFulfilled ? '<i class="bi bi-check"></i>' : i + 1}</div>
          <div class="tl-label">${s.charAt(0).toUpperCase() + s.slice(1)}</div>
        </div>`).join('')}</div>`;

  const invoiceHtml = invoice ? `
    <div class="card invoice-card">
      <div style="display:flex;align-items:center;gap:14px;">
        <div class="invoice-icon"><i class="bi bi-file-earmark-text-fill"></i></div>
        <div>
          <div class="td-strong">${invoice.invoiceNumber}</div>
          <div class="td-muted" style="font-size:12px;">Issued ${fmtDate(invoice.issueDate)} &middot; Due ${fmtDate(invoice.dueDate)}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="text-align:right;"><div class="td-strong">${fmt$(invoice.amount)}</div><span class="badge badge-${invoice.status}">${invoice.status}</span></div>
        <button class="btn btn-secondary btn-sm" data-download-invoice="${invoice.id}"><i class="bi bi-download"></i> Download</button>
      </div>
    </div>` : `<div class="empty-state" style="padding:20px;">No invoice on file.</div>`;

  const entitlementHtml = entitlement
    ? renderEntitlementCard(entitlement, false)
    : `<div class="empty-state" style="padding:20px;"><i class="bi bi-hourglass-split"></i>Entitlement will be issued once provisioning completes.</div>`;

  const siblingsHtml = siblings.length ? `
    <div class="detail-section">
      <div class="section-title"><i class="bi bi-boxes"></i> Other Items in This Order</div>
      <div class="card"><div class="table-wrap"><table><thead><tr><th>Order ID</th><th>Product</th><th>Qty</th><th>Amount</th></tr></thead><tbody>
        ${siblings.map((o) => { const p = getProductByKey(o.productKey); return `<tr data-order-row="${o.id}" style="cursor:pointer;"><td class="td-mono">${o.id}</td><td>${p ? p.name : o.productKey}</td><td>${o.qty.toLocaleString()}</td><td class="td-strong">${fmt$(o.totalPrice)}</td></tr>`; }).join('')}
      </tbody></table></div></div>
    </div>` : '';

  return `
    <button class="back-link" data-back-orders><i class="bi bi-arrow-left"></i> Back to Orders</button>
    <div class="card detail-hero">
      <div class="detail-icon-tile" style="background:${color}"><i class="bi ${product ? product.icon : 'bi-box'}"></i></div>
      <div>
        <div class="detail-vendor">${order.id} &middot; PO ${order.poNumber}</div>
        <div class="detail-title-row">
          <div class="detail-title">${product ? product.name : order.productKey}</div>
          <span class="badge badge-${order.orderType}">${order.orderType}</span>
          <span class="badge badge-${order.orderStatus}">${order.orderStatus}</span>
        </div>
        <div class="detail-desc">Ordered ${fmtDate(order.purchaseDate)}${order.renewalDate ? ` &middot; Renews ${fmtDate(order.renewalDate)}` : ''} &middot; Qty ${order.qty.toLocaleString()} &middot; ${fmt$(order.totalPrice)}</div>
        ${order.orderType === 'subscription' ? `<button class="btn btn-secondary btn-sm" style="margin-top:12px;" data-view-subscription="${order.productKey}"><i class="bi bi-clock-history"></i> View Subscription History</button>` : ''}
      </div>
    </div>

    <div class="detail-section">
      <div class="section-title"><i class="bi bi-signpost-split"></i> Order Status</div>
      <div class="card"><div class="card-body">${timelineHtml}</div></div>
    </div>

    <div class="detail-section">
      <div class="section-title"><i class="bi bi-receipt"></i> Invoice</div>
      ${invoiceHtml}
    </div>

    <div class="detail-section">
      <div class="section-title"><i class="bi bi-key-fill"></i> Entitlement</div>
      ${entitlementHtml}
    </div>

    ${siblingsHtml}`;
}

function triggerInvoiceDownload(invoiceId) {
  const inv = INVOICES.find((i) => i.id === invoiceId);
  if (!inv) return;
  const purchase = PURCHASES.find((p) => p.id === inv.purchaseId);
  const product = purchase ? getProductByKey(purchase.productKey) : null;
  const content = [
    'Palo Alto Security -- Invoice',
    `Invoice Number: ${inv.invoiceNumber}`,
    `Order: ${inv.purchaseId}`,
    `Product: ${product ? product.name : (purchase ? purchase.productKey : '—')}`,
    `Issue Date: ${inv.issueDate}`,
    `Due Date: ${inv.dueDate}`,
    `Amount: ${fmt$(inv.amount)}`,
    `Status: ${inv.status}`,
    '',
    'Bill To:',
    ACCOUNT.name,
    '',
    'This is a synthetic demo invoice generated by the Palo Alto Security Customer Portal prototype.',
  ].join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${inv.invoiceNumber}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  showToast(`Invoice downloaded: ${a.download}`, 'success');
}

// ===== Downloads =====
function renderDownloads() {
  const f = S.downloadsFilter;
  let rows = [...DOWNLOADS];
  if (f.search) {
    const s = f.search.toLowerCase();
    rows = rows.filter((d) => { const prod = getProductByKey(d.productKey); return (prod && prod.name.toLowerCase().includes(s)) || d.downloadFileName.toLowerCase().includes(s) || d.version.toLowerCase().includes(s); });
  }
  if (f.platform !== 'all') rows = rows.filter((d) => d.platform === f.platform);
  rows.sort((a, b) => a.productKey.localeCompare(b.productKey) || (new Date(b.releaseDate) - new Date(a.releaseDate)));

  const platforms = [...new Set(DOWNLOADS.map((d) => d.platform))].sort();
  const listHtml = rows.length ? rows.map((d) => renderDownloadRow(d, true)).join('') : `<div class="empty-state"><i class="bi bi-cloud-slash"></i>No downloads match your filters.</div>`;

  return `
    <div class="filter-bar">
      <div class="search-wrap"><i class="bi bi-search"></i><input class="form-control" id="downloads-search" placeholder="Search by product, file, or version..." value="${f.search}" /></div>
      <select class="form-control" id="downloads-platform">
        <option value="all" ${f.platform === 'all' ? 'selected' : ''}>All Platforms</option>
        ${platforms.map((p) => `<option value="${p}" ${f.platform === p ? 'selected' : ''}>${p}</option>`).join('')}
      </select>
      <div class="filter-spacer"></div>
      <div style="font-size:12px;color:var(--text-muted);">${rows.length} files</div>
    </div>
    <div class="card">${listHtml}</div>`;
}

function triggerDownload(id) {
  const d = DOWNLOADS.find((x) => x.id === id);
  if (!d) return;
  const product = getProductByKey(d.productKey);
  const content = [
    'Palo Alto Security -- Download Manifest',
    `Product: ${product ? product.name : d.productKey}`,
    `Version: ${d.version}`,
    `Platform: ${d.platform}`,
    `Released: ${d.releaseDate}`,
    `File size: ${d.fileSizeMb} MB`,
    `SHA-256: ${fakeChecksum(d.id)}`,
    '',
    'Release notes:',
    d.releaseNotes,
    '',
    'This is a synthetic demo file generated by the Palo Alto Security Customer Portal',
    `prototype. It is a text placeholder, not the real ${d.downloadFileName} binary.`,
  ].join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = d.downloadFileName.replace(/\.[^.]+$/, '') + '.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  showToast(`Download started: ${a.download}`, 'success');
}

function fakeChecksum(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hex = h.toString(16).padStart(8, '0');
  return (hex + hex + hex + hex + hex + hex + hex + hex).slice(0, 64);
}

// ===== Entitlements =====
function renderEntitlements() {
  const f = S.entitlementsFilter;
  let rows = [...ENTITLEMENTS];
  if (f.search) {
    const s = f.search.toLowerCase();
    rows = rows.filter((e) => { const prod = getProductByKey(e.productKey); return (prod && prod.name.toLowerCase().includes(s)) || e.licenseKey.toLowerCase().includes(s); });
  }
  if (f.status !== 'all') rows = rows.filter((e) => e.status === f.status);
  rows.sort((a, b) => { const da = daysUntil(a.expiryDate), db = daysUntil(b.expiryDate); return (da === null ? 9999 : da) - (db === null ? 9999 : db); });

  const cardsHtml = rows.length ? `<div class="entitlement-grid">${rows.map((e) => renderEntitlementCard(e, true)).join('')}</div>` : `<div class="empty-state"><i class="bi bi-key"></i>No entitlements match your filters.</div>`;

  return `
    <div class="filter-bar">
      <div class="search-wrap"><i class="bi bi-search"></i><input class="form-control" id="entitlements-search" placeholder="Search by product or license key..." value="${f.search}" /></div>
      <select class="form-control" id="entitlements-status">
        <option value="all" ${f.status === 'all' ? 'selected' : ''}>All Statuses</option>
        <option value="active" ${f.status === 'active' ? 'selected' : ''}>Active</option>
        <option value="expiring" ${f.status === 'expiring' ? 'selected' : ''}>Expiring</option>
        <option value="expired" ${f.status === 'expired' ? 'selected' : ''}>Expired</option>
        <option value="suspended" ${f.status === 'suspended' ? 'selected' : ''}>Suspended</option>
      </select>
      <div class="filter-spacer"></div>
      <div style="font-size:12px;color:var(--text-muted);">${rows.length} of ${ENTITLEMENTS.length} entitlements</div>
    </div>
    ${cardsHtml}`;
}

// ===== Support =====
function renderSupport() {
  const f = S.ticketsFilter;
  let rows = [...TICKETS];
  if (f.search) {
    const s = f.search.toLowerCase();
    rows = rows.filter((t) => { const prod = getProductByKey(t.productKey); return t.ticketNumber.toLowerCase().includes(s) || t.subject.toLowerCase().includes(s) || (prod && prod.name.toLowerCase().includes(s)); });
  }
  if (f.status !== 'all') rows = rows.filter((t) => t.status === f.status);
  if (f.severity !== 'all') rows = rows.filter((t) => t.severity === f.severity);
  rows.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

  const bodyRows = rows.length ? rows.map((t) => {
    const prod = getProductByKey(t.productKey);
    return `
      <tr data-ticket-row="${t.id}" style="cursor:pointer;">
        <td class="td-mono">${t.ticketNumber}</td>
        <td class="td-strong">${t.subject}</td>
        <td>${prod ? `<div class="user-cell"><i class="bi ${prod.icon}" style="color:${getCategoryColor(prod.category)};font-size:15px;"></i>${prod.name}</div>` : '<span class="td-muted">General / Account</span>'}</td>
        <td class="td-muted">${t.supportType}</td>
        <td><span class="badge badge-${t.severity}">${t.severity}</span></td>
        <td><span class="badge badge-${t.status}">${t.status.replace(/-/g, ' ')}</span></td>
        <td class="td-muted">${fmtDate(t.createdDate)}</td>
        <td class="td-muted">${fmtDate(t.lastUpdated)}</td>
      </tr>`;
  }).join('') : `<tr><td colspan="8"><div class="empty-state"><i class="bi bi-inbox"></i>No tickets match your filters.</div></td></tr>`;

  return `
    <div class="filter-bar">
      <div class="search-wrap"><i class="bi bi-search"></i><input class="form-control" id="tickets-search" placeholder="Search by ticket #, subject, or product..." value="${f.search}" /></div>
      <select class="form-control" id="tickets-status">
        <option value="all" ${f.status === 'all' ? 'selected' : ''}>All Statuses</option>
        <option value="open" ${f.status === 'open' ? 'selected' : ''}>Open</option>
        <option value="in-progress" ${f.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
        <option value="waiting-on-you" ${f.status === 'waiting-on-you' ? 'selected' : ''}>Waiting on You</option>
        <option value="resolved" ${f.status === 'resolved' ? 'selected' : ''}>Resolved</option>
        <option value="closed" ${f.status === 'closed' ? 'selected' : ''}>Closed</option>
      </select>
      <select class="form-control" id="tickets-severity">
        <option value="all" ${f.severity === 'all' ? 'selected' : ''}>All Severities</option>
        <option value="critical" ${f.severity === 'critical' ? 'selected' : ''}>Critical</option>
        <option value="high" ${f.severity === 'high' ? 'selected' : ''}>High</option>
        <option value="medium" ${f.severity === 'medium' ? 'selected' : ''}>Medium</option>
        <option value="low" ${f.severity === 'low' ? 'selected' : ''}>Low</option>
      </select>
      <div class="filter-spacer"></div>
      <div style="font-size:12px;color:var(--text-muted);">${rows.length} of ${TICKETS.length} tickets</div>
      <button class="btn btn-primary" data-open-modal="new-ticket"><i class="bi bi-plus-lg"></i> New Ticket</button>
    </div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Ticket #</th><th>Subject</th><th>Product</th><th>Type</th><th>Severity</th><th>Status</th><th>Created</th><th>Updated</th></tr></thead><tbody>${bodyRows}</tbody></table></div></div>`;
}

function renderTicketDetail(id) {
  const t = getTicketById(id);
  if (!t) return `<div class="empty-state"><i class="bi bi-question-circle"></i>Ticket not found.<br/><button class="btn btn-secondary" style="margin-top:14px;" data-back-support>Back to Support</button></div>`;
  const prod = getProductByKey(t.productKey);
  const activity = getActivityForTicket(t.id);
  const isOpenish = t.status === 'open' || t.status === 'in-progress' || t.status === 'waiting-on-you';

  const activityHtml = activity.map((a) => `
    <div class="activity-item">
      <div class="activity-dot ${a.actorType === 'agent' ? 'green' : a.actorType === 'system' ? 'amber' : 'blue'}"></div>
      <div>
        <div class="activity-text"><strong>${a.actorName}</strong>${a.actorType === 'agent' ? ' <span class="perm-chip">Support</span>' : ''} — ${a.text}</div>
        <div class="activity-date">${fmtDate(a.date)}</div>
      </div>
    </div>`).join('');

  return `
    <button class="back-link" data-back-support><i class="bi bi-arrow-left"></i> Back to Support</button>
    <div class="card detail-hero">
      <div class="detail-icon-tile" style="background:${prod ? getCategoryColor(prod.category) : 'var(--slate)'}"><i class="bi ${prod ? prod.icon : 'bi-headset'}"></i></div>
      <div style="flex:1;">
        <div class="detail-vendor">${t.ticketNumber} &middot; ${prod ? prod.name : 'General / Account'}</div>
        <div class="detail-title-row">
          <div class="detail-title">${t.subject}</div>
          <span class="badge badge-${t.severity}">${t.severity}</span>
          <span class="badge badge-${t.status}">${t.status.replace(/-/g, ' ')}</span>
        </div>
        <div class="detail-desc">${t.description}</div>
        <div style="margin-top:10px;font-size:11.5px;color:var(--text-muted);">Requested by ${t.requestedBy} &middot; ${t.supportType} &middot; Opened ${fmtDate(t.createdDate)} &middot; Updated ${fmtDate(t.lastUpdated)}</div>
        <div style="margin-top:14px;">
          <button class="btn ${isOpenish ? 'btn-secondary' : 'btn-primary'} btn-sm" data-toggle-ticket="${t.id}">
            <i class="bi ${isOpenish ? 'bi-check2-circle' : 'bi-arrow-counterclockwise'}"></i> ${isOpenish ? 'Close Ticket' : 'Reopen Ticket'}
          </button>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <div class="section-title"><i class="bi bi-chat-left-text-fill"></i> Activity</div>
      <div class="card"><div class="card-body"><div class="activity-list">${activityHtml || '<div class="empty-state" style="padding:20px;">No activity yet.</div>'}</div></div></div>
    </div>

    <div class="detail-section">
      <div class="section-title"><i class="bi bi-reply-fill"></i> Add a Reply</div>
      <div class="card"><div class="card-body">
        <div class="form-group"><textarea class="form-control" id="ticket-reply-text" rows="3" placeholder="Type a message to the support team..."></textarea></div>
        <button class="btn btn-primary btn-sm" data-post-reply="${t.id}"><i class="bi bi-send-fill"></i> Post Reply</button>
      </div></div>
    </div>`;
}

function submitNewTicket() {
  const subject = $id('ticket-subject').value.trim();
  const description = $id('ticket-description').value.trim();
  const productKey = $id('ticket-product').value;
  const severity = $id('ticket-severity').value;
  const supportType = $id('ticket-type').value;
  if (!subject) { showToast('Enter a subject.', 'error'); return; }
  if (!description) { showToast('Enter a description.', 'error'); return; }
  const id = generateTicketId();
  TICKETS.unshift({
    id, ticketNumber: id, subject, description, severity, productKey, supportType,
    status: 'open', requestedBy: CURRENT_USER.name, createdDate: isoToday(), lastUpdated: isoToday(),
  });
  TICKET_ACTIVITY.push({ id: `act-${id}-1`, ticketId: id, date: isoToday(), actorName: CURRENT_USER.name, actorType: 'customer', text: description });
  S.modal = null;
  navigate('ticket-detail', { ticketId: id });
  showToast(`Ticket ${id} submitted`, 'success');
}

function postTicketReply(ticketId) {
  const el = $id('ticket-reply-text');
  const text = el ? el.value.trim() : '';
  if (!text) { showToast('Enter a message before replying.', 'error'); return; }
  const t = getTicketById(ticketId);
  if (!t) return;
  TICKET_ACTIVITY.push({ id: `act-${ticketId}-${Date.now()}`, ticketId, date: isoToday(), actorName: CURRENT_USER.name, actorType: 'customer', text });
  t.lastUpdated = isoToday();
  render();
  showToast('Reply posted', 'success');
}

function toggleTicketStatus(ticketId) {
  const t = getTicketById(ticketId);
  if (!t) return;
  const wasOpenish = t.status === 'open' || t.status === 'in-progress' || t.status === 'waiting-on-you';
  t.status = wasOpenish ? 'closed' : 'open';
  t.lastUpdated = isoToday();
  TICKET_ACTIVITY.push({ id: `act-${ticketId}-${Date.now()}`, ticketId, date: isoToday(), actorName: 'System', actorType: 'system', text: wasOpenish ? `Ticket closed by ${CURRENT_USER.name}` : `Ticket reopened by ${CURRENT_USER.name}` });
  render();
  showToast(wasOpenish ? 'Ticket closed' : 'Ticket reopened', 'success');
}

// ===== Ask AI — local natural-language query engine =====
// Not a real hosted LLM (this app has no backend or API key) — a
// deterministic intent/entity matcher over PRODUCTS/PURCHASES/
// ENTITLEMENTS/DOWNLOADS/INVOICES/TICKETS, wrapped in a chat-like UI.
// This keeps every answer grounded in real account data and lets it
// reliably say "I don't know" instead of guessing.
function normalizeQuery(str) {
  return (str || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

const QUESTION_STOPWORDS = new Set(['how', 'much', 'has', 'have', 'what', 'whats', "what's", 'who', 'tell', 'me', 'about', 'does', 'do', 'is', 'are', 'the', 'a', 'an', 'to', 'for', 'of', 'in', 'on', 'and', 'or', 'please', 'can', 'could', 'would', 'you', 'we', 'our', 'i', 'many', 'number']);

// Naive proper-noun detector: longest run of capitalized, non-stopword
// words anywhere in the raw query — flags "you named something specific
// that isn't in our data" instead of silently answering a generic question.
function extractCapitalizedPhrase(rawQuery) {
  const words = (rawQuery || '').split(/\s+/);
  let best = [], current = [];
  words.forEach((w) => {
    const clean = w.replace(/[^\w'-]/g, '');
    const isCandidate = /^[A-Z]/.test(clean) && clean.length > 1 && !QUESTION_STOPWORDS.has(clean.toLowerCase());
    if (isCandidate) current.push(clean);
    else { if (current.length > best.length) best = current; current = []; }
  });
  if (current.length > best.length) best = current;
  return best.length ? best.join(' ') : null;
}

function findProductMatches(q) {
  const byName = [...PRODUCTS].sort((a, b) => b.name.length - a.name.length);
  const nameHits = byName.filter((p) => q.includes(normalizeQuery(p.name)));
  if (nameHits.length) {
    const maxLen = Math.max(...nameHits.map((p) => p.name.length));
    return nameHits.filter((p) => p.name.length === maxLen);
  }
  const vendorLines = [...new Set(PRODUCTS.map((p) => p.vendorLine))].sort((a, b) => b.length - a.length);
  const vendorHit = vendorLines.find((v) => q.includes(normalizeQuery(v)));
  return vendorHit ? PRODUCTS.filter((p) => p.vendorLine === vendorHit) : [];
}

function findCategoryMatch(q) {
  const categories = [...new Set(PRODUCTS.map((p) => p.category))];
  return categories.find((c) => q.includes(normalizeQuery(c))) || null;
}

function findTicketNumberMatch(rawQuery) {
  const m = (rawQuery || '').match(/TCK-\d+/i);
  return m ? m[0].toUpperCase() : null;
}

function answerAskAI(rawQuery) {
  const q = normalizeQuery(rawQuery);
  if (!q) return "Please type a question — you can ask about products, orders, entitlements, downloads, invoices, or support tickets.";

  if (/^(hi|hello|hey|help|what can you do)/.test(q)) {
    return `I can answer questions about your products (pricing, details), orders, entitlements &amp; license keys, downloads, invoices, and support tickets. Try: "What's our license key for Aegis Endpoint Protection?" or "What's the status of TCK-1010?"`;
  }

  const productMatches = findProductMatches(q);
  const categoryMatch = findCategoryMatch(q);
  const ticketNumber = findTicketNumberMatch(rawQuery);

  if (ticketNumber) {
    const t = getTicketById(ticketNumber);
    if (!t) return `I couldn't find a ticket numbered ${ticketNumber}.`;
    return `${t.ticketNumber} — "${t.subject}" is currently <strong>${t.status.replace(/-/g, ' ')}</strong> (${t.severity} severity, ${t.supportType}). Requested by ${t.requestedBy} on ${fmtDate(t.createdDate)}, last updated ${fmtDate(t.lastUpdated)}.`;
  }

  if (/price|cost|how much (is|does|would)/.test(q) && productMatches.length === 1) {
    const p = productMatches[0];
    return `${p.name} is priced at <strong>${fmt$(p.listPrice)}</strong> ${p.priceUnit}.`;
  }

  if (categoryMatch && /what|which|list|show/.test(q)) {
    const prods = PRODUCTS.filter((p) => p.category === categoryMatch);
    return `Our ${categoryMatch} lineup: ${prods.map((p) => p.name).join(', ')}.`;
  }

  if (/license key|licence key|entitlement/.test(q) && productMatches.length === 1) {
    const p = productMatches[0];
    const ents = getEntitlementsForProduct(p.key);
    if (!ents.length) return `We don't have an entitlement on file for ${p.name}.`;
    return ents.map((e) => `${p.name} license key: <strong>${e.licenseKey}</strong> (${e.seatsUsed}/${e.seatsTotal} seats used, status ${e.status}, expires ${fmtDate(e.expiryDate)}).`).join(' ');
  }

  if (/seats?/.test(q) && productMatches.length === 1) {
    const p = productMatches[0];
    const ents = getEntitlementsForProduct(p.key);
    if (!ents.length) return `We don't have any seat entitlements on file for ${p.name}.`;
    const used = ents.reduce((s, e) => s + e.seatsUsed, 0);
    const total = ents.reduce((s, e) => s + e.seatsTotal, 0);
    return `We're using <strong>${used.toLocaleString()} of ${total.toLocaleString()}</strong> seats for ${p.name}.`;
  }

  if (/expir|renew/.test(q) && productMatches.length === 1) {
    const p = productMatches[0];
    const ents = getEntitlementsForProduct(p.key);
    if (!ents.length) return `We don't have an entitlement on file for ${p.name}.`;
    return ents.map((e) => {
      const d = daysUntil(e.expiryDate);
      return `${p.name} (${e.licenseKey}) ${d < 0 ? `expired ${fmtDate(e.expiryDate)}` : `expires in ${d} day${d === 1 ? '' : 's'} (${fmtDate(e.expiryDate)})`}, status ${e.status}.`;
    }).join(' ');
  }

  if (/order|purchase|bought|buy|spent|status/.test(q) && productMatches.length === 1) {
    const p = productMatches[0];
    const rows = getPurchasesForProduct(p.key);
    if (!rows.length) return `We haven't purchased ${p.name} yet.`;
    const total = rows.reduce((s, r) => s + r.totalPrice, 0);
    const latest = [...rows].sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))[0];
    return `We have ${rows.length} order${rows.length === 1 ? '' : 's'} for ${p.name}, totaling <strong>${fmt$(total)}</strong>. Most recent: ${latest.id}, ${fmtDate(latest.purchaseDate)}, status ${latest.orderStatus}.`;
  }

  if (/download|version|latest/.test(q) && productMatches.length === 1) {
    const p = productMatches[0];
    const rows = getDownloadsForProduct(p.key);
    if (!rows.length) return `There are no downloadable files for ${p.name}.`;
    const platformWord = ['windows', 'macos', 'mac', 'linux', 'docker', 'firmware', 'ios', 'android'].find((pl) => q.includes(pl));
    const filtered = platformWord ? rows.filter((r) => r.platform.toLowerCase().includes(platformWord === 'mac' ? 'macos' : platformWord)) : rows;
    if (!filtered.length) return `There's no ${platformWord} download available for ${p.name}.`;
    const latest = filtered.find((r) => r.isLatest) || filtered[0];
    return `Latest ${p.name} download: v${latest.version} for ${latest.platform}, released ${fmtDate(latest.releaseDate)} (${filtered.length} version${filtered.length === 1 ? '' : 's'} available total).`;
  }

  if (/ticket/.test(q) && productMatches.length === 1) {
    const p = productMatches[0];
    const rows = TICKETS.filter((t) => t.productKey === p.key);
    if (!rows.length) return `There are no support tickets for ${p.name}.`;
    return `${p.name} has ${rows.length} ticket${rows.length === 1 ? '' : 's'}: ${rows.map((t) => `${t.ticketNumber} (${t.status})`).join(', ')}.`;
  }

  // Generic "what is / tell me about" product description — deliberately
  // last among product-specific rules so a more specific intent (price,
  // license key, seats, expiry, orders, downloads, tickets) always wins
  // over this catch-all when the query also happens to contain "what is".
  if (/what is|what's|tell me about|describe/.test(q) && productMatches.length >= 1) {
    if (productMatches.length === 1) {
      const p = productMatches[0];
      return `${p.name} (${p.vendorLine}) is a ${p.category} ${p.type} product. ${p.shortDesc} List price: <strong>${fmt$(p.listPrice)}</strong> ${p.priceUnit}.`;
    }
    return `We offer ${productMatches.length} ${productMatches[0].vendorLine} products: ${productMatches.map((p) => p.name).join(', ')}.`;
  }

  if (/ticket/.test(q) && /how many|open|count/.test(q)) {
    const n = getOpenTicketsCount();
    return `There ${n === 1 ? 'is' : 'are'} <strong>${n}</strong> open ticket${n === 1 ? '' : 's'} (open, in progress, or waiting on you).`;
  }

  const orderStatusWord = ['submitted', 'processing', 'provisioning', 'fulfilled', 'cancelled'].find((s) => q.includes(s));
  if (orderStatusWord && /how many|count|number of/.test(q)) {
    const n = PURCHASES.filter((p) => p.orderStatus === orderStatusWord).length;
    return `There are <strong>${n}</strong> order${n === 1 ? '' : 's'} with status "${orderStatusWord}".`;
  }

  if (/expir|renew/.test(q) && /(soon|upcoming|due|next)/.test(q)) {
    const list = getExpiringEntitlements(60);
    if (!list.length) return 'Nothing is expiring in the next 60 days.';
    return `Expiring in the next 60 days: ${list.slice(0, 5).map((e) => { const p = getProductByKey(e.productKey); return `${p ? p.name : e.productKey} (${daysUntil(e.expiryDate)}d left)`; }).join('; ')}.`;
  }

  const invoiceStatusWord = ['paid', 'pending', 'overdue'].find((s) => q.includes(s));
  if (/invoice/.test(q) && invoiceStatusWord && /how many|count/.test(q)) {
    const n = INVOICES.filter((i) => i.status === invoiceStatusWord).length;
    return `There are <strong>${n}</strong> ${invoiceStatusWord} invoice${n === 1 ? '' : 's'}.`;
  }
  if (/invoice/.test(q) && /owe|outstanding|balance/.test(q)) {
    const rows = INVOICES.filter((i) => i.status === 'pending' || i.status === 'overdue');
    const total = rows.reduce((s, i) => s + i.amount, 0);
    return `You have <strong>${fmt$(total)}</strong> outstanding across ${rows.length} unpaid invoice${rows.length === 1 ? '' : 's'}.`;
  }

  if (/how many products/.test(q)) {
    return `Your organization owns <strong>${getOwnedProductKeys().length}</strong> products.`;
  }

  // A capitalized, non-question-word phrase suggests the user named a
  // specific product we couldn't match — flag that explicitly rather
  // than silently falling back to an unrelated aggregate answer.
  const capCandidate = extractCapitalizedPhrase(rawQuery);
  if (capCandidate && !productMatches.length && !categoryMatch) {
    return `I couldn't find any records for "${capCandidate}" in our product, order, or account data. Double-check the spelling, or ask about a different product.`;
  }

  if (/spent|total spend|how much (have we|has)/.test(q)) {
    const rows = PURCHASES.filter((p) => p.status !== 'cancelled');
    return `Total spend across all orders is <strong>${fmt$(rows.reduce((s, r) => s + r.totalPrice, 0))}</strong> from ${rows.length} orders.`;
  }

  if (/seats?/.test(q)) {
    const ents = ENTITLEMENTS.filter((e) => e.status !== 'expired' && e.status !== 'suspended');
    const used = ents.reduce((s, e) => s + e.seatsUsed, 0);
    const total = ents.reduce((s, e) => s + e.seatsTotal, 0);
    return `You're using <strong>${used.toLocaleString()} of ${total.toLocaleString()}</strong> total seats across all products (${total ? Math.round((used / total) * 100) : 0}% utilized).`;
  }

  return "I don't have enough information to answer that from our product, order, or account data. Try asking about a specific product's price, license key, downloads, or overall spend.";
}

function renderAskAI() {
  const hasMessages = S.askAi.messages.length > 0;
  const msgsHtml = S.askAi.messages.map((m) => `
    <div class="msg-wrap ${m.role}">
      <div class="msg-bubble">${m.text}</div>
      <div class="msg-time">${m.time}</div>
    </div>`).join('');

  const suggestions = [
    'How much does Argus XDR cost?',
    "What's our license key for Aegis Endpoint Protection?",
    'How many seats are we using for Meridian SASE?',
    'What is the latest download for SentryWall Central Manager?',
    "What's the status of TCK-1010?",
    'What invoices are overdue?',
  ];

  return `
    <div class="ama-container">
      ${!hasMessages ? `
      <div class="ama-hero">
        <div class="ama-hero-icon"><i class="bi bi-stars"></i></div>
        <h2>Ask AI</h2>
        <p>Ask about your products, pricing, orders, entitlements, downloads, invoices, or support tickets. Answers are computed directly from your account data — if something isn't in the data, I'll say so.</p>
        <div class="ama-suggestions">
          ${suggestions.map((s) => `<button class="ama-suggestion-card" data-ama-suggestion="${s.replace(/"/g, '&quot;')}">${s}</button>`).join('')}
        </div>
      </div>` : `
      <div class="ama-toolbar"><button class="btn btn-secondary btn-sm" id="ama-new-chat"><i class="bi bi-plus-lg"></i> New Chat</button></div>
      <div class="ama-messages" id="ama-messages">
        ${msgsHtml}
        ${S.askAi.typing ? `<div class="msg-wrap bot"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>` : ''}
      </div>`}
      <div class="ama-input-bar">
        <textarea class="ama-textarea" id="ama-input" placeholder="Ask a question — e.g. &quot;What's our license key for Aegis Endpoint Protection?&quot;" rows="3"></textarea>
        <button class="ama-send-btn" id="ama-send-btn"><i class="bi bi-send-fill"></i></button>
      </div>
    </div>`;
}

function scrollAskAIBottom() {
  const el = $id('ama-messages');
  if (el) el.scrollTop = el.scrollHeight;
}

function sendAskAIMessage(text) {
  if (!text.trim()) return;
  const time = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  S.askAi.messages.push({ role: 'user', text: text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), time: time() });
  S.askAi.typing = true;
  updatePageBody();
  scrollAskAIBottom();
  setTimeout(() => {
    const answer = answerAskAI(text);
    S.askAi.typing = false;
    S.askAi.messages.push({ role: 'bot', text: answer, time: time() });
    updatePageBody();
    scrollAskAIBottom();
  }, 700 + Math.random() * 700);
}

// ===== Team & Access =====
function renderTeamAccess() {
  const tab = S.teamTab;
  const body = tab === 'users' ? renderTeamUsers() : tab === 'roles' ? renderTeamRoles() : renderTeamInvites();
  return `
    <div class="tabs">
      <button class="tab-btn ${tab === 'users' ? 'active' : ''}" data-team-tab="users">Users (${USERS.length})</button>
      <button class="tab-btn ${tab === 'roles' ? 'active' : ''}" data-team-tab="roles">Roles (${ROLES.length})</button>
      <button class="tab-btn ${tab === 'invites' ? 'active' : ''}" data-team-tab="invites">Pending Invites (${INVITES.filter((i) => i.status === 'pending').length})</button>
    </div>
    ${body}`;
}

function renderTeamUsers() {
  const rows = USERS.map((u) => `
    <tr>
      <td><div class="user-cell"><div class="avatar-sm">${u.initials}</div><div><div class="user-cell-name">${u.name}</div><div class="user-cell-email">${u.email}</div></div></div></td>
      <td><select class="form-control" style="max-width:210px;" data-user-role-select="${u.id}">${ROLES.map((r) => `<option value="${r.id}" ${r.id === u.roleId ? 'selected' : ''}>${r.name}</option>`).join('')}</select></td>
      <td><span class="badge badge-${u.status}">${u.status}</span></td>
      <td class="td-muted">${fmtDate(u.lastLogin)}</td>
      <td class="td-muted">${fmtDate(u.dateAdded)}</td>
    </tr>`).join('');

  return `
    <div class="filter-bar"><div class="filter-spacer"></div><button class="btn btn-primary" data-open-modal="invite"><i class="bi bi-person-plus-fill"></i> Invite User</button></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Team Member</th><th>Role</th><th>Status</th><th>Last Login</th><th>Added</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

function renderTeamRoles() {
  const cards = ROLES.map((r) => `
    <div class="role-card">
      <div class="role-card-top"><div class="role-name">${r.name}</div>${r.isCustom ? '<span class="badge badge-custom">Custom</span>' : ''}</div>
      <div class="role-desc">${r.description}</div>
      <div class="perm-chips">${r.permissions.map((p) => `<span class="perm-chip">${permissionLabel(p)}</span>`).join('')}</div>
    </div>`).join('');

  return `
    <div class="filter-bar"><div class="filter-spacer"></div><button class="btn btn-primary" data-open-modal="create-role"><i class="bi bi-plus-lg"></i> Create Custom Role</button></div>
    <div class="role-grid">${cards}</div>`;
}

function renderTeamInvites() {
  const rows = INVITES.length ? INVITES.map((i) => {
    const role = getRoleById(i.roleId);
    const actions = i.status === 'pending'
      ? `<div class="row-actions"><button class="btn btn-secondary btn-sm" data-resend-invite="${i.id}"><i class="bi bi-arrow-repeat"></i> Resend</button><button class="btn btn-danger btn-sm" data-revoke-invite="${i.id}"><i class="bi bi-x-lg"></i> Revoke</button></div>`
      : '';
    return `
      <tr>
        <td class="td-strong">${i.email}</td>
        <td>${role ? role.name : i.roleId}</td>
        <td class="td-muted">${i.invitedBy}</td>
        <td class="td-muted">${fmtDate(i.invitedDate)}</td>
        <td class="td-muted">${fmtDate(i.expiresDate)}</td>
        <td><span class="badge badge-${i.status}">${i.status}</span></td>
        <td>${actions}</td>
      </tr>`;
  }).join('') : `<tr><td colspan="7"><div class="empty-state"><i class="bi bi-envelope"></i>No invitations yet.</div></td></tr>`;

  return `
    <div class="filter-bar"><div class="filter-spacer"></div><button class="btn btn-primary" data-open-modal="invite"><i class="bi bi-person-plus-fill"></i> Invite User</button></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Email</th><th>Role</th><th>Invited By</th><th>Invited</th><th>Expires</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

function changeUserRole(userId, roleId) {
  const u = USERS.find((x) => x.id === userId);
  if (!u) return;
  u.roleId = roleId;
  render();
  showToast(`Updated role for ${u.name}`, 'success');
}

function submitInvite() {
  const email = $id('invite-email').value.trim();
  const roleId = $id('invite-role').value;
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) { showToast('Enter a valid email address.', 'error'); return; }
  if (INVITES.some((i) => i.email.toLowerCase() === email.toLowerCase() && i.status === 'pending')) { showToast('That email already has a pending invite.', 'error'); return; }
  INVITES.unshift({ id: 'inv-' + Math.random().toString(36).slice(2, 8), email, roleId, invitedBy: CURRENT_USER.name, invitedDate: isoToday(), expiresDate: isoPlusDays(14), status: 'pending' });
  S.modal = null;
  render();
  showToast(`Invitation sent to ${email}`, 'success');
}

function submitCreateRole() {
  const name = $id('role-name').value.trim();
  const desc = $id('role-desc').value.trim();
  const checked = qsa('[data-perm-checkbox]:checked').map((el) => el.value);
  if (!name) { showToast('Enter a role name.', 'error'); return; }
  if (!checked.length) { showToast('Select at least one permission.', 'error'); return; }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  ROLES.push({ id: `role-${slug}-${Math.random().toString(36).slice(2, 5)}`, name, description: desc || 'Custom role', permissions: checked, isCustom: true });
  S.modal = null;
  render();
  showToast(`Role "${name}" created`, 'success');
}

function revokeInvite(id) {
  const inv = INVITES.find((i) => i.id === id);
  if (!inv) return;
  INVITES.splice(INVITES.indexOf(inv), 1);
  S.modal = null;
  render();
  showToast(`Invite for ${inv.email} revoked`, 'success');
}

function resendInvite(id) {
  const inv = INVITES.find((i) => i.id === id);
  if (!inv) return;
  inv.expiresDate = isoPlusDays(14);
  render();
  showToast(`Invite resent to ${inv.email}`, 'success');
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => showToast('License key copied to clipboard', 'success'),
      () => showToast('Copy failed — key: ' + text, 'error')
    );
  } else {
    showToast('Copy not supported — key: ' + text, 'error');
  }
}

// ===== Account =====
function renderAccount() {
  return `
    <div class="two-col" style="margin-bottom:16px;">
      ${renderCompanyProfileCard()}
      ${renderCurrencyCard()}
    </div>
    <div class="detail-section">${renderPaymentMethodsCard()}</div>
    <div class="detail-section">${renderPreferredResellerCard()}</div>`;
}

function renderCompanyProfileCard() {
  return `
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="bi bi-building"></i> Company Profile</div></div>
      <div class="card-body">
        <div class="entitlement-meta-row" style="margin-bottom:10px;"><span>Company Name</span><span class="td-strong">${ACCOUNT.name}</span></div>
        <div class="entitlement-meta-row" style="margin-bottom:10px;"><span>Account Tier</span><span class="td-strong">${ACCOUNT.tier}</span></div>
        <div class="entitlement-meta-row" style="margin-bottom:10px;"><span>Industry</span><span class="td-strong">${ACCOUNT.industry}</span></div>
        <div class="entitlement-meta-row" style="margin-bottom:10px;"><span>Headquarters</span><span class="td-strong">${ACCOUNT.hq}</span></div>
        <div class="entitlement-meta-row"><span>Primary Contact</span><span class="td-strong">${CURRENT_USER.name} &middot; ${CURRENT_USER.email}</span></div>
      </div>
    </div>`;
}

function renderCurrencyCard() {
  const cur = S.accountSettings.currency;
  return `
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="bi bi-cash-coin"></i> Currency &amp; Region</div></div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Operating Currency</label>
          <select class="form-control" id="account-currency">
            ${Object.keys(CURRENCIES).map((c) => `<option value="${c}" ${cur === c ? 'selected' : ''}>${c} (${CURRENCIES[c].symbol})</option>`).join('')}
          </select>
        </div>
        <div class="form-hint">All prices across the portal display in this currency. Rates shown are static and illustrative, not live exchange rates.</div>
      </div>
    </div>`;
}

const PAYMENT_TYPE_ICONS = { card: 'bi-credit-card-fill', bank: 'bi-bank', invoice: 'bi-receipt' };

function renderPaymentMethodsCard() {
  const methods = S.accountSettings.paymentMethods;
  const rows = methods.map((m) => `
    <div class="payment-method-row">
      <div class="user-cell">
        <div class="avatar-sm" style="background:var(--slate-bg);color:var(--text-muted);"><i class="bi ${PAYMENT_TYPE_ICONS[m.type] || 'bi-wallet2'}"></i></div>
        <div>
          <div class="user-cell-name">${m.label} ${m.isDefault ? '<span class="badge badge-active">Default</span>' : ''}</div>
          <div class="user-cell-email">${m.details}</div>
        </div>
      </div>
      <div class="row-actions">
        ${!m.isDefault ? `<button class="btn btn-secondary btn-sm" data-set-default-payment="${m.id}">Set Default</button>` : ''}
        <button class="btn btn-danger btn-sm" data-remove-payment="${m.id}"><i class="bi bi-trash"></i></button>
      </div>
    </div>`).join('');

  return `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="bi bi-credit-card-2-front-fill"></i> Payment Methods</div>
        <button class="btn btn-primary btn-sm" data-open-modal="add-payment"><i class="bi bi-plus-lg"></i> Add Payment Method</button>
      </div>
      <div class="card-body" style="display:flex;flex-direction:column;">${rows || '<div class="empty-state">No payment methods on file.</div>'}</div>
    </div>`;
}

function renderPreferredResellerCard() {
  const cards = RESELLERS.map((r) => {
    const isPreferred = S.accountSettings.preferredResellerId === r.id;
    return `
      <div class="role-card ${isPreferred ? 'reseller-card-preferred' : ''}">
        <div class="role-card-top">
          <div class="role-name"><i class="bi ${r.icon}" style="color:var(--primary);margin-right:6px;"></i>${r.name}</div>
          ${isPreferred ? '<span class="badge badge-active">Preferred</span>' : ''}
        </div>
        <div class="role-desc">${r.tagline}</div>
        <div class="perm-chips" style="margin-bottom:12px;">
          <span class="perm-chip">${r.specialty}</span>
          <span class="perm-chip">${r.region}</span>
          <span class="perm-chip"><i class="bi bi-star-fill" style="color:#F59E0B;"></i> ${r.rating} &middot; ${r.yearsPartnered}y partnered</span>
        </div>
        ${!isPreferred ? `<button class="btn btn-secondary btn-sm" data-set-preferred-reseller="${r.id}">Set as Preferred</button>` : ''}
      </div>`;
  }).join('');

  return `
    <div class="section-title"><i class="bi bi-people-fill"></i> Preferred Reseller / Partner</div>
    <div class="role-grid">${cards}</div>`;
}

function setDefaultPaymentMethod(id) {
  S.accountSettings.paymentMethods.forEach((m) => { m.isDefault = m.id === id; });
  render();
  showToast('Default payment method updated', 'success');
}

function removePaymentMethod(id) {
  const m = S.accountSettings.paymentMethods.find((x) => x.id === id);
  S.accountSettings.paymentMethods = S.accountSettings.paymentMethods.filter((x) => x.id !== id);
  S.modal = null;
  render();
  showToast(`${m ? m.label : 'Payment method'} removed`, 'success');
}

function setPreferredReseller(id) {
  S.accountSettings.preferredResellerId = id;
  render();
  const r = RESELLERS.find((x) => x.id === id);
  showToast(`${r ? r.name : 'Reseller'} set as preferred partner`, 'success');
}

function renderPaymentTypeFields(type) {
  if (type === 'bank') {
    return `
      <div class="form-group"><label class="form-label">Bank Name</label><input class="form-control" id="pm-bank-name" placeholder="e.g. Chase Bank" /></div>
      <div class="form-group"><label class="form-label">Account Number</label><input class="form-control" id="pm-bank-account" placeholder="Account number" /></div>
      <div class="form-group"><label class="form-label">Routing Number</label><input class="form-control" id="pm-bank-routing" placeholder="Routing number" /></div>`;
  }
  if (type === 'invoice') {
    return `
      <div class="form-group"><label class="form-label">Billing Email</label><input type="email" class="form-control" id="pm-invoice-email" placeholder="accounts.payable@company.com" /></div>
      <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text);cursor:pointer;"><input type="checkbox" id="pm-invoice-po" style="accent-color:var(--primary);" /> Require PO number on invoices</label>`;
  }
  return `
    <div class="form-group"><label class="form-label">Cardholder Name</label><input class="form-control" id="pm-card-name" placeholder="Name on card" /></div>
    <div class="form-group"><label class="form-label">Card Number</label><input class="form-control" id="pm-card-number" placeholder="4242 4242 4242 4242" maxlength="19" /></div>
    <div class="form-group"><label class="form-label">Expiry (MM/YY)</label><input class="form-control" id="pm-card-expiry" placeholder="MM/YY" maxlength="5" /></div>`;
}

function renderAddPaymentModalBody() {
  return `
    <div class="modal-card">
      <div class="modal-header">
        <div><div class="modal-title">Add a payment method</div><div class="modal-sub">This is a demo — no real payment details are processed or stored.</div></div>
        <button class="modal-close" data-modal-close><i class="bi bi-x-lg"></i></button>
      </div>
      <form id="add-payment-form">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Payment Type</label>
            <select class="form-control" id="payment-type">
              <option value="card">Credit Card</option>
              <option value="bank">Bank Transfer (ACH/Wire)</option>
              <option value="invoice">Invoice</option>
            </select>
          </div>
          <div id="payment-type-fields">${renderPaymentTypeFields('card')}</div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-modal-cancel>Cancel</button>
          <button type="submit" class="btn btn-primary"><i class="bi bi-plus-lg"></i> Add Method</button>
        </div>
      </form>
    </div>`;
}

function submitAddPaymentMethod() {
  const type = $id('payment-type').value;
  let label, details;
  if (type === 'bank') {
    const bankName = $id('pm-bank-name').value.trim();
    const account = $id('pm-bank-account').value.trim();
    if (!bankName || account.length < 4) { showToast('Enter a bank name and account number.', 'error'); return; }
    label = `Bank Transfer — ${bankName}`;
    details = `Account ending in ${account.slice(-4)}`;
  } else if (type === 'invoice') {
    const email = $id('pm-invoice-email').value.trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) { showToast('Enter a valid billing email.', 'error'); return; }
    const poRequired = $id('pm-invoice-po').checked;
    label = 'Invoice — Net 30';
    details = `Billed to ${email}${poRequired ? ' &middot; PO required' : ''}`;
  } else {
    const name = $id('pm-card-name').value.trim();
    const number = $id('pm-card-number').value.replace(/\s+/g, '');
    const expiry = $id('pm-card-expiry').value.trim();
    if (!name || number.length < 4) { showToast('Enter a cardholder name and card number.', 'error'); return; }
    const last4 = number.slice(-4);
    const brand = number.startsWith('4') ? 'Visa' : number.startsWith('5') ? 'Mastercard' : number.startsWith('3') ? 'Amex' : 'Card';
    label = `${brand} ending in ${last4}`;
    details = `${name}${expiry ? ` &middot; Expires ${expiry}` : ''}`;
  }
  S.accountSettings.paymentMethods.push({ id: 'pm-' + Math.random().toString(36).slice(2, 8), type, label, details, isDefault: false });
  S.modal = null;
  render();
  showToast('Payment method added', 'success');
}

// ===== Modal system =====
function renderModalMarkup() {
  if (!S.modal) return '';
  let inner = '';
  if (S.modal.type === 'invite') inner = renderInviteModalBody();
  else if (S.modal.type === 'create-role') inner = renderCreateRoleModalBody();
  else if (S.modal.type === 'new-ticket') inner = renderNewTicketModalBody();
  else if (S.modal.type === 'add-payment') inner = renderAddPaymentModalBody();
  else if (S.modal.type === 'confirm') inner = renderConfirmModalBody(S.modal.props || {});
  return `<div class="modal-overlay" id="modal-overlay">${inner}</div>`;
}

function openModal(type, props) { S.modal = { type, props: props || {} }; refreshModal(); }
function closeModal() { S.modal = null; refreshModal(); }
function refreshModal() {
  const root = $id('modal-root');
  if (root) root.innerHTML = renderModalMarkup();
  attachModalEvents();
}

function renderInviteModalBody() {
  return `
    <div class="modal-card">
      <div class="modal-header">
        <div><div class="modal-title">Invite a teammate</div><div class="modal-sub">They'll get portal access with the role you assign below.</div></div>
        <button class="modal-close" data-modal-close><i class="bi bi-x-lg"></i></button>
      </div>
      <form id="invite-form">
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Email address</label><input required type="email" class="form-control" id="invite-email" placeholder="name@company.com" /></div>
          <div class="form-group"><label class="form-label">Role</label><select class="form-control" id="invite-role">${ROLES.map((r) => `<option value="${r.id}">${r.name}</option>`).join('')}</select></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-modal-cancel>Cancel</button>
          <button type="submit" class="btn btn-primary"><i class="bi bi-send-fill"></i> Send Invite</button>
        </div>
      </form>
    </div>`;
}

function renderCreateRoleModalBody() {
  const checkboxes = PERMISSIONS_CATALOG.map((p) => `
    <label class="checkbox-row">
      <input type="checkbox" data-perm-checkbox value="${p.key}" />
      <div><div class="checkbox-row-label">${p.label}</div><div class="checkbox-row-desc">${p.desc}</div></div>
    </label>`).join('');
  return `
    <div class="modal-card">
      <div class="modal-header">
        <div><div class="modal-title">Create a custom role</div><div class="modal-sub">Define exactly what this role can see and do.</div></div>
        <button class="modal-close" data-modal-close><i class="bi bi-x-lg"></i></button>
      </div>
      <form id="create-role-form">
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Role name</label><input required class="form-control" id="role-name" placeholder="e.g. Renewal Manager" /></div>
          <div class="form-group"><label class="form-label">Description</label><input class="form-control" id="role-desc" placeholder="Short description of this role" /></div>
          <div class="form-group"><label class="form-label">Permissions</label><div class="checkbox-grid">${checkboxes}</div></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-modal-cancel>Cancel</button>
          <button type="submit" class="btn btn-primary"><i class="bi bi-plus-lg"></i> Create Role</button>
        </div>
      </form>
    </div>`;
}

function renderNewTicketModalBody() {
  return `
    <div class="modal-card">
      <div class="modal-header">
        <div><div class="modal-title">Submit a support ticket</div><div class="modal-sub">Our support team typically responds within 1 business day.</div></div>
        <button class="modal-close" data-modal-close><i class="bi bi-x-lg"></i></button>
      </div>
      <form id="new-ticket-form">
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Subject</label><input required class="form-control" id="ticket-subject" placeholder="Brief summary of the issue" /></div>
          <div class="form-group"><label class="form-label">Product Line</label>
            <select class="form-control" id="ticket-product">
              <option value="">General / Account (not product-specific)</option>
              ${PRODUCTS.map((p) => `<option value="${p.key}">${p.name}</option>`).join('')}
            </select>
          </div>
          <div class="checkbox-grid" style="grid-template-columns:1fr 1fr;gap:14px;">
            <div class="form-group"><label class="form-label">Severity</label>
              <select class="form-control" id="ticket-severity">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">Type of Support</label>
              <select class="form-control" id="ticket-type">
                ${SUPPORT_TYPES.map((t) => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group"><label class="form-label">Description</label><textarea required class="form-control" id="ticket-description" rows="4" placeholder="Describe the issue in detail — what happened, when, and any error messages"></textarea></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-modal-cancel>Cancel</button>
          <button type="submit" class="btn btn-primary"><i class="bi bi-send-fill"></i> Submit Ticket</button>
        </div>
      </form>
    </div>`;
}

function renderConfirmModalBody(props) {
  return `
    <div class="modal-card">
      <div class="modal-body" style="padding-top:26px;">
        <div class="confirm-icon"><i class="bi bi-exclamation-triangle-fill"></i></div>
        <div class="modal-title" style="margin-bottom:6px;">${props.title || 'Are you sure?'}</div>
        <div style="font-size:13px;color:var(--text-muted);line-height:1.55;">${props.message || ''}</div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-modal-cancel>Cancel</button>
        <button type="button" id="confirm-action-btn" class="btn ${props.danger ? 'btn-danger' : 'btn-primary'}">${props.confirmLabel || 'Confirm'}</button>
      </div>
    </div>`;
}

function attachModalEvents() {
  const overlay = $id('modal-overlay');
  if (!overlay || !S.modal) return;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  const closeBtn = qs('[data-modal-close]');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  const cancelBtn = qs('[data-modal-cancel]');
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (S.modal.type === 'invite') {
    const form = $id('invite-form');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); submitInvite(); });
  } else if (S.modal.type === 'create-role') {
    const form = $id('create-role-form');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); submitCreateRole(); });
  } else if (S.modal.type === 'new-ticket') {
    const form = $id('new-ticket-form');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); submitNewTicket(); });
  } else if (S.modal.type === 'add-payment') {
    const form = $id('add-payment-form');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); submitAddPaymentMethod(); });
    const typeSelect = $id('payment-type');
    if (typeSelect) typeSelect.addEventListener('change', (e) => {
      const fieldsEl = $id('payment-type-fields');
      if (fieldsEl) fieldsEl.innerHTML = renderPaymentTypeFields(e.target.value);
    });
  } else if (S.modal.type === 'confirm') {
    const btn = $id('confirm-action-btn');
    if (btn) btn.addEventListener('click', () => { const cb = S.modal.props.onConfirm; closeModal(); if (cb) cb(); });
  }
}

// ===== Global event wiring (re-run after every render / partial update) =====
function attachGlobalEvents() {
  qsa('[data-nav]').forEach((el) => el.addEventListener('click', () => navigate(el.dataset.nav)));
  const logoutBtn = qs('[data-logout]');
  if (logoutBtn) logoutBtn.addEventListener('click', doLogout);

  qsa('[data-product-key]').forEach((el) => el.addEventListener('click', () => navigate('product-detail', { key: el.dataset.productKey })));
  const backBtn = qs('[data-back-products]');
  if (backBtn) backBtn.addEventListener('click', () => navigate('products'));
  const backOrdersBtn = qs('[data-back-orders]');
  if (backOrdersBtn) backOrdersBtn.addEventListener('click', () => navigate('orders'));
  const backSupportBtn = qs('[data-back-support]');
  if (backSupportBtn) backSupportBtn.addEventListener('click', () => navigate('support'));

  qsa('[data-order-row]').forEach((el) => el.addEventListener('click', () => navigate('order-detail', { orderId: el.dataset.orderRow })));
  qsa('[data-orders-tab]').forEach((el) => el.addEventListener('click', () => { S.ordersTab = el.dataset.ordersTab; updatePageBody(); }));
  qsa('[data-subscription-row]').forEach((el) => el.addEventListener('click', () => navigate('subscription-detail', { subscriptionKey: el.dataset.subscriptionRow })));
  qsa('[data-view-subscription]').forEach((el) => el.addEventListener('click', () => navigate('subscription-detail', { subscriptionKey: el.dataset.viewSubscription })));
  qsa('[data-ticket-row]').forEach((el) => el.addEventListener('click', () => navigate('ticket-detail', { ticketId: el.dataset.ticketRow })));
  qsa('[data-toggle-ticket]').forEach((el) => el.addEventListener('click', () => toggleTicketStatus(el.dataset.toggleTicket)));
  qsa('[data-post-reply]').forEach((el) => el.addEventListener('click', () => postTicketReply(el.dataset.postReply)));
  qsa('[data-download-invoice]').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); triggerInvoiceDownload(el.dataset.downloadInvoice); }));
  qsa('[data-configure-product]').forEach((el) => el.addEventListener('click', () => { const key = el.dataset.configureProduct; navigate('configurator'); selectConfiguratorProduct(key); }));

  const pSearch = $id('products-search');
  if (pSearch) pSearch.addEventListener('input', (e) => { S.productsFilter.search = e.target.value; updatePageBody(); });
  const pCat = $id('products-category');
  if (pCat) pCat.addEventListener('change', (e) => { S.productsFilter.category = e.target.value; updatePageBody(); });
  const pType = $id('products-type');
  if (pType) pType.addEventListener('change', (e) => { S.productsFilter.type = e.target.value; updatePageBody(); });

  const ordSearch = $id('orders-search');
  if (ordSearch) ordSearch.addEventListener('input', (e) => { S.ordersFilter.search = e.target.value; updatePageBody(); });
  const ordType = $id('orders-type');
  if (ordType) ordType.addEventListener('change', (e) => { S.ordersFilter.type = e.target.value; updatePageBody(); });
  const ordStatus = $id('orders-status');
  if (ordStatus) ordStatus.addEventListener('change', (e) => { S.ordersFilter.orderStatus = e.target.value; updatePageBody(); });

  const dSearch = $id('downloads-search');
  if (dSearch) dSearch.addEventListener('input', (e) => { S.downloadsFilter.search = e.target.value; updatePageBody(); });
  const dPlatform = $id('downloads-platform');
  if (dPlatform) dPlatform.addEventListener('change', (e) => { S.downloadsFilter.platform = e.target.value; updatePageBody(); });
  qsa('[data-download-id]').forEach((el) => el.addEventListener('click', () => triggerDownload(el.dataset.downloadId)));

  const eSearch = $id('entitlements-search');
  if (eSearch) eSearch.addEventListener('input', (e) => { S.entitlementsFilter.search = e.target.value; updatePageBody(); });
  const eStatus = $id('entitlements-status');
  if (eStatus) eStatus.addEventListener('change', (e) => { S.entitlementsFilter.status = e.target.value; updatePageBody(); });
  qsa('[data-copy-key]').forEach((el) => el.addEventListener('click', () => copyToClipboard(el.dataset.copyKey)));

  const tSearch = $id('tickets-search');
  if (tSearch) tSearch.addEventListener('input', (e) => { S.ticketsFilter.search = e.target.value; updatePageBody(); });
  const tStatus = $id('tickets-status');
  if (tStatus) tStatus.addEventListener('change', (e) => { S.ticketsFilter.status = e.target.value; updatePageBody(); });
  const tSeverity = $id('tickets-severity');
  if (tSeverity) tSeverity.addEventListener('change', (e) => { S.ticketsFilter.severity = e.target.value; updatePageBody(); });

  qsa('[data-team-tab]').forEach((el) => el.addEventListener('click', () => { S.teamTab = el.dataset.teamTab; updatePageBody(); }));
  qsa('[data-user-role-select]').forEach((el) => el.addEventListener('change', (e) => changeUserRole(el.dataset.userRoleSelect, e.target.value)));
  qsa('[data-resend-invite]').forEach((el) => el.addEventListener('click', () => resendInvite(el.dataset.resendInvite)));
  qsa('[data-revoke-invite]').forEach((el) => el.addEventListener('click', () => {
    const id = el.dataset.revokeInvite;
    const inv = INVITES.find((i) => i.id === id);
    openModal('confirm', {
      title: 'Revoke this invitation?',
      message: `${inv ? inv.email : 'This invite'} will no longer be able to accept the invitation and join the portal.`,
      confirmLabel: 'Revoke Invite',
      danger: true,
      onConfirm: () => revokeInvite(id),
    });
  }));

  qsa('[data-open-modal]').forEach((el) => el.addEventListener('click', () => openModal(el.dataset.openModal, {})));

  // Configurator
  qsa('[data-select-config-product]').forEach((el) => el.addEventListener('click', () => selectConfiguratorProduct(el.dataset.selectConfigProduct)));
  const ccSearch = $id('config-search');
  if (ccSearch) ccSearch.addEventListener('input', (e) => { S.configurator.catalogFilter.search = e.target.value; updatePageBody(); });
  const ccCategory = $id('config-category');
  if (ccCategory) ccCategory.addEventListener('change', (e) => { S.configurator.catalogFilter.category = e.target.value; updatePageBody(); });

  qsa('[data-qty-decr]').forEach((el) => el.addEventListener('click', () => { S.configurator.qty = Math.max(1, S.configurator.qty - 1); updatePageBody(); }));
  qsa('[data-qty-incr]').forEach((el) => el.addEventListener('click', () => { S.configurator.qty = S.configurator.qty + 1; updatePageBody(); }));
  const qtyInput = $id('config-qty-input');
  if (qtyInput) qtyInput.addEventListener('change', (e) => { S.configurator.qty = Math.max(1, parseInt(e.target.value, 10) || 1); updatePageBody(); });

  qsa('[data-support-tier]').forEach((el) => el.addEventListener('click', () => { S.configurator.supportTier = el.dataset.supportTier; updatePageBody(); }));
  qsa('[data-term]').forEach((el) => el.addEventListener('click', () => { S.configurator.term = el.dataset.term; updatePageBody(); }));
  qsa('[data-addon-checkbox]').forEach((el) => el.addEventListener('change', (e) => {
    const key = el.value;
    if (e.target.checked) { if (!S.configurator.addons.includes(key)) S.configurator.addons.push(key); }
    else { S.configurator.addons = S.configurator.addons.filter((k) => k !== key); }
    updatePageBody();
  }));

  qsa('[data-config-next]').forEach((el) => el.addEventListener('click', () => { S.configurator.step = Math.min(4, S.configurator.step + 1); updatePageBody(); }));
  qsa('[data-config-back]').forEach((el) => el.addEventListener('click', () => { S.configurator.step = Math.max(1, S.configurator.step - 1); updatePageBody(); }));

  const placeOrderBtn = $id('place-order-btn');
  if (placeOrderBtn) placeOrderBtn.addEventListener('click', placeOrder);
  const configAnotherBtn = $id('config-another-btn');
  if (configAnotherBtn) configAnotherBtn.addEventListener('click', () => { resetConfigurator(); updatePageBody(); });
  qsa('[data-view-order]').forEach((el) => el.addEventListener('click', () => navigate('order-detail', { orderId: el.dataset.viewOrder })));

  // Account
  const accountCurrency = $id('account-currency');
  if (accountCurrency) accountCurrency.addEventListener('change', (e) => {
    S.accountSettings.currency = e.target.value;
    render();
    showToast(`Currency updated to ${e.target.value}`, 'success');
  });
  qsa('[data-set-default-payment]').forEach((el) => el.addEventListener('click', () => setDefaultPaymentMethod(el.dataset.setDefaultPayment)));
  qsa('[data-remove-payment]').forEach((el) => el.addEventListener('click', () => {
    const id = el.dataset.removePayment;
    const m = S.accountSettings.paymentMethods.find((x) => x.id === id);
    openModal('confirm', {
      title: 'Remove this payment method?',
      message: `${m ? m.label : 'This payment method'} will be removed from your account.`,
      confirmLabel: 'Remove',
      danger: true,
      onConfirm: () => removePaymentMethod(id),
    });
  }));
  qsa('[data-set-preferred-reseller]').forEach((el) => el.addEventListener('click', () => setPreferredReseller(el.dataset.setPreferredReseller)));

  // Ask AI
  const amaSendBtn = $id('ama-send-btn');
  const amaInput = $id('ama-input');
  if (amaSendBtn && amaInput) {
    amaSendBtn.addEventListener('click', () => {
      const v = amaInput.value.trim();
      if (v) { amaInput.value = ''; sendAskAIMessage(v); }
    });
    amaInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const v = amaInput.value.trim();
        if (v) { amaInput.value = ''; sendAskAIMessage(v); }
      }
    });
  }
  qsa('[data-ama-suggestion]').forEach((el) => el.addEventListener('click', () => sendAskAIMessage(el.dataset.amaSuggestion)));
  const amaNewChat = $id('ama-new-chat');
  if (amaNewChat) amaNewChat.addEventListener('click', () => { S.askAi = { messages: [], typing: false }; updatePageBody(); });
}

// ===== Boot =====
window.__portalRender = function () {
  PRODUCTS = window.PRODUCTS_DATA || [];
  PURCHASES = window.PURCHASES_DATA || [];
  ENTITLEMENTS = window.ENTITLEMENTS_DATA || [];
  DOWNLOADS = window.DOWNLOADS_DATA || [];
  INVOICES = window.INVOICES_DATA || [];
  USERS = window.USERS_DATA || [];
  ROLES = window.ROLES_DATA || [];
  INVITES = window.INVITES_DATA || [];
  ACTIVITY = window.ACTIVITY_DATA || [];
  TICKETS = window.TICKETS_DATA || [];
  TICKET_ACTIVITY = window.TICKET_ACTIVITY_DATA || [];
  USAGE_HISTORY = window.USAGE_HISTORY_DATA || [];
  RESELLERS = window.RESELLERS_DATA || [];
  CURRENT_USER = USERS.find((u) => u.id === 'usr-001') || USERS[0] || { name: 'User', initials: 'U', roleId: '' };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.modal) closeModal(); });
  render();
};
