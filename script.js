const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = n => Number(n).toFixed(2);

// Default menu (used the first time the app opens)
const DEFAULT_MENU = [
  { id: 1, name: "Veg Sandwich", price: 40 },
  { id: 2, name: "Masala Dosa", price: 60 },
  { id: 3, name: "Lemon Juice", price: 25 },
  { id: 4, name: "Tea", price: 15 }
];

// ---- Storage (browser localStorage) ----
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch (e) { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

// ---- State ----
let menu = load('cb_menu', DEFAULT_MENU);
let orders = load('cb_orders', []);
let cart = {};          // item id -> quantity
let viewingOldBill = false;

// ---- Tabs ----
function show(tab) {
  for (const n of ['bill', 'orders', 'menu']) {
    $('v-' + n).hidden = n !== tab;
    $('t-' + n).classList.toggle('on', n === tab);
  }
  if (tab === 'orders') renderOrders();
  if (tab === 'menu') renderMenuList();
}
['bill', 'orders', 'menu'].forEach(n => $('t-' + n).onclick = () => show(n));

// ---- Billing tab ----
function renderMenu() {
  $('menuGrid').innerHTML = menu.map(m =>
    `<button class="item" data-id="${m.id}"><b>${esc(m.name)}</b><span>&#8377;${fmt(m.price)}</span></button>`
  ).join('') || '<p class="muted">Menu is empty. Add items in the Menu tab.</p>';

  document.querySelectorAll('.item').forEach(b => b.onclick = () => {
    const id = b.dataset.id;
    cart[id] = (cart[id] || 0) + 1;
    renderCart();
  });
}

function lines() {
  return Object.keys(cart).map(id => {
    const m = menu.find(x => String(x.id) === id);
    return m && cart[id] > 0
      ? { id: m.id, name: m.name, price: m.price, qty: cart[id], amount: m.price * cart[id] }
      : null;
  }).filter(Boolean);
}

function renderCart() {
  const ls = lines();
  const tot = ls.reduce((s, l) => s + l.amount, 0);

  $('cart').innerHTML = ls.length
    ? ls.map(l => `
      <div class="row">
        <div><b>${esc(l.name)}</b>
          <div class="muted">${fmt(l.price)} &times; ${l.qty} = ${fmt(l.amount)}</div></div>
        <div class="qty">
          <button data-d="-1" data-id="${l.id}">&minus;</button>
          <span>${l.qty}</span>
          <button data-d="1" data-id="${l.id}">+</button>
        </div>
      </div>`).join('')
    : '<p class="muted">Tap an item to add it.</p>';

  $('cart').querySelectorAll('.qty button').forEach(b => b.onclick = () => {
    const id = b.dataset.id;
    cart[id] = Math.max(0, (cart[id] || 0) + Number(b.dataset.d));
    if (!cart[id]) delete cart[id];
    renderCart();
  });

  $('total').textContent = fmt(tot);
  $('count').textContent = 'Total items: ' + ls.reduce((s, l) => s + l.qty, 0);
  $('gen').disabled = !ls.length;
}

$('clear').onclick = () => { cart = {}; renderCart(); };

// ---- Generate bill ----
$('gen').onclick = () => {
  const ls = lines();
  if (!ls.length) return;
  const no = (orders.length ? Math.max(...orders.map(o => o.no)) : 1000) + 1;
  const order = {
    no,
    date: new Date().toISOString(),
    items: ls,
    total: ls.reduce((s, l) => s + l.amount, 0)
  };
  orders.unshift(order);
  save('cb_orders', orders);
  viewingOldBill = false;
  $('billBody').innerHTML = billHtml(order);
  $('receipt').classList.add('show');
};

function billHtml(o) {
  const d = new Date(o.date);
  return `<h3>CANTEEN BILL</h3><div style="text-align:center">GNIOT</div><hr>
    <div class="l"><span>Bill #${o.no}</span><span>${d.toLocaleDateString()}</span></div>
    <div>${d.toLocaleTimeString()}</div><hr>
    ${o.items.map(i => `<div class="l"><span>${esc(i.name)} ${i.qty}x${fmt(i.price)}</span><span>${fmt(i.amount)}</span></div>`).join('')}
    <hr>
    <div class="l"><span>Total Items</span><span>${o.items.reduce((s, i) => s + i.qty, 0)}</span></div>
    <div class="l"><b>TOTAL</b><b>${fmt(o.total)}</b></div><hr>
    <div style="text-align:center">Thank you!</div>`;
}

$('print').onclick = () => { try { window.print(); } catch (e) {} };

$('done').onclick = () => {
  $('receipt').classList.remove('show');
  if (!viewingOldBill) { cart = {}; renderCart(); }   // new bill finished -> reset order
};

// ---- Orders tab ----
function renderOrders() {
  const today = new Date().toDateString();
  const t = orders.filter(o => new Date(o.date).toDateString() === today);
  $('todayCount').textContent = t.length + (t.length === 1 ? ' bill' : ' bills');
  $('todayTotal').textContent = fmt(t.reduce((s, o) => s + o.total, 0));

  $('history').innerHTML = orders.length
    ? orders.map(o => `
      <div class="row">
        <div><b>Bill #${o.no}</b>
          <div class="muted">${new Date(o.date).toLocaleString()} &middot;
            ${o.items.map(i => esc(i.name) + ' &times;' + i.qty).join(', ')}</div></div>
        <div><b>${fmt(o.total)}</b><br>
          <button class="link" data-no="${o.no}">View</button></div>
      </div>`).join('')
    : '<p class="muted">No orders yet.</p>';

  $('history').querySelectorAll('button').forEach(b => b.onclick = () => {
    const o = orders.find(x => x.no === Number(b.dataset.no));
    viewingOldBill = true;
    $('billBody').innerHTML = billHtml(o);
    $('receipt').classList.add('show');
  });
}

$('wipe').onclick = () => {
  if (orders.length && confirm('Delete all order records?')) {
    orders = [];
    save('cb_orders', orders);
    renderOrders();
  }
};

// ---- Menu tab ----
function renderMenuList() {
  $('menuList').innerHTML = menu.map(m =>
    `<div class="row"><span>${esc(m.name)} &mdash; &#8377;${fmt(m.price)}</span>
     <button class="del" data-id="${m.id}">Remove</button></div>`
  ).join('') || '<p class="muted">No items.</p>';

  $('menuList').querySelectorAll('button').forEach(b => b.onclick = () => {
    menu = menu.filter(m => String(m.id) !== b.dataset.id);
    delete cart[b.dataset.id];
    save('cb_menu', menu);
    renderMenuList(); renderMenu(); renderCart();
  });
}

$('add').onclick = () => {
  const name = $('nName').value.trim();
  const price = parseFloat($('nPrice').value);
  if (!name || isNaN(price) || price < 0) { alert('Enter a valid name and price.'); return; }
  menu.push({ id: Date.now(), name, price });
  save('cb_menu', menu);
  $('nName').value = ''; $('nPrice').value = '';
  renderMenuList(); renderMenu();
};

// ---- Start ----
renderMenu();
renderCart();
