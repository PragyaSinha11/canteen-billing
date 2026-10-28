const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>(Math.round(n*100)/100).toFixed(2);
const ld=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const DEF=[["Veg Sandwich",40,"Snacks",50],["Samosa",15,"Snacks",60],["Masala Dosa",60,"Meals",40],["Veg Thali",80,"Meals",30],["Lemon Juice",25,"Drinks",40],["Tea",15,"Drinks",100],["Coffee",20,"Drinks",80],["Cold Drink",30,"Drinks",60]].map((a,i)=>({id:i+1,name:a[0],price:a[1],cat:a[2],stock:a[3]}));
let S={menu:ld('cb2_menu',DEF),orders:ld('cb2_orders',[]),cfg:ld('cb2_cfg',{tax:0,name:'Canteen Management System'})};
let cart={},cat='All',viewOld=false,editId=null,dmode='';
const save=()=>{sv('cb2_menu',S.menu);sv('cb2_orders',S.orders);sv('cb2_cfg',S.cfg)};
const item=id=>S.menu.find(m=>String(m.id)===String(id));
const left=m=>m.stock==null?Infinity:m.stock-(cart[m.id]||0);

function calc(){
 const ls=Object.keys(cart).map(id=>{const m=item(id);return m&&cart[id]>0?{id:m.id,name:m.name,price:m.price,qty:cart[id],amount:m.price*cart[id]}:null}).filter(Boolean);
 const sub=ls.reduce((s,l)=>s+l.amount,0),dv=Math.max(0,parseFloat($('#disc').value)||0);
 const disc=$('#dtype').value==='%'?sub*Math.min(dv,100)/100:Math.min(dv,sub);
 const tax=(sub-disc)*(S.cfg.tax||0)/100;
 return{ls,sub,disc,tax,total:Math.round((sub-disc+tax)*100)/100};
}
function renderGrid(){
 const q=$('#q').value.trim().toLowerCase(),cats=['All',...new Set(S.menu.map(m=>m.cat||'Other'))];
 if(!cats.includes(cat))cat='All';
 $('#chips').innerHTML=cats.map(c=>`<button class="chip${c===cat?' on':''}" data-a="cat" data-id="${esc(c)}">${esc(c)}</button>`).join('');
 const v=S.menu.filter(m=>(cat==='All'||(m.cat||'Other')===cat)&&m.name.toLowerCase().includes(q));
 $('#grid').innerHTML=v.map(m=>{const l=left(m);return `<button class="item" data-a="add" data-id="${m.id}"${l<=0?' disabled':''}><b>${esc(m.name)}</b><span>₹${fmt(m.price)}</span>${m.stock==null?'':`<span class="${l<=5?'lo':''}">${l<=0?'Sold out':l+' left'}</span>`}</button>`}).join('')||'<p class="muted">No items found.</p>';
}
function renderCart(){
 const c=calc();
 $('#cart').innerHTML=c.ls.length?c.ls.map(l=>`<div class="row"><div><b>${esc(l.name)}</b><div class="muted">${fmt(l.price)} × ${l.qty} = ${fmt(l.amount)}</div></div><div class="qty"><button data-a="dec" data-id="${l.id}">−</button><span>${l.qty}</span><button data-a="inc" data-id="${l.id}">+</button><button data-a="rm" data-id="${l.id}" title="Remove">✕</button></div></div>`).join(''):'<p class="muted">Tap an item to add it.</p>';
 const cash=$('#pay').value==='Cash',rc=parseFloat($('#rcv').value);
 $('#rcv').style.display=cash?'':'none';
 const short=cash&&!isNaN(rc)&&rc<c.total;
 $('#sums').innerHTML=`<div class="sum"><span>Items</span><span>${c.ls.reduce((s,l)=>s+l.qty,0)}</span></div><div class="sum"><span>Subtotal</span><span>${fmt(c.sub)}</span></div>`+(c.disc?`<div class="sum"><span>Discount</span><span>−${fmt(c.disc)}</span></div>`:'')+(c.tax?`<div class="sum"><span>Tax (${S.cfg.tax}%)</span><span>${fmt(c.tax)}</span></div>`:'')+`<div class="sum big"><span>Total</span><span>₹${fmt(c.total)}</span></div>`+(cash&&!isNaN(rc)&&c.total?`<div class="sum" style="color:${short?'var(--bad)':'var(--ok)'}"><span>${short?'Short by':'Change due'}</span><span>${fmt(Math.abs(rc-c.total))}</span></div>`:'');
 $('#gen').disabled=!c.ls.length||short;
 $('#gen').textContent=$('#pay').value==='UPI'?'Show QR to Pay':'Generate Bill';
 renderGrid();
}
function billHtml(o){const d=new Date(o.date);return `<h3>${esc(o.shop||'CANTEEN')}</h3><div style="text-align:center">${o.void?'*** VOID ***':'CASH MEMO'}</div><hr><div class="l"><span>Bill #${o.no}</span><span>${d.toLocaleDateString()}</span></div><div>${d.toLocaleTimeString()}</div><hr>${o.items.map(i=>`<div class="l"><span>${esc(i.name)} ${i.qty}x${fmt(i.price)}</span><span>${fmt(i.amount)}</span></div>`).join('')}<hr><div class="l"><span>Subtotal</span><span>${fmt(o.sub)}</span></div>${o.disc?`<div class="l"><span>Discount</span><span>-${fmt(o.disc)}</span></div>`:''}${o.tax?`<div class="l"><span>Tax</span><span>${fmt(o.tax)}</span></div>`:''}<div class="l"><b>TOTAL</b><b>${fmt(o.total)}</b></div><div class="l"><span>Paid by</span><span>${o.pay}</span></div>${o.prepaid?'<div class="l"><span>Status</span><b>PREPAID</b></div>':''}${o.pay==='Cash'?`<div class="l"><span>Received</span><span>${fmt(o.paid)}</span></div><div class="l"><span>Change</span><span>${fmt(o.paid-o.total)}</span></div>`:''}<hr><div style="text-align:center">Thank you! Visit again.</div>`}
function openBill(o){$('#bb').innerHTML=billHtml(o);$('#rc').classList.add('show')}
function inRange(o,days){if(!days)return true;const s=new Date();s.setHours(0,0,0,0);s.setDate(s.getDate()-(days-1));return new Date(o.date)>=s}
function renderOrders(){
 const q=$('#oq').value.trim().toLowerCase(),d=$('#od').value;
 const v=S.orders.filter(o=>(!d||new Date(o.date).toLocaleDateString('en-CA')===d)&&(!q||String(o.no).includes(q)||o.items.some(i=>i.name.toLowerCase().includes(q))));
 $('#olist').innerHTML=v.map(o=>`<div class="row"><div class="${o.void?'void':''}"><b>Bill #${o.no}</b> ${o.void?'<span class="tag">VOID</span>':''}<div class="muted">${new Date(o.date).toLocaleString()} · ${o.pay}${o.prepaid?' · <b style="color:var(--ok)">PREPAID</b>':''}<br>${o.items.map(i=>esc(i.name)+' ×'+i.qty).join(', ')}</div></div><div style="text-align:right"><b class="${o.void?'void':''}">${fmt(o.total)}</b><br><button class="link" data-a="view" data-id="${o.no}">View</button>${o.void?'':`<button class="link bad" data-a="void" data-id="${o.no}">Void</button>`}</div></div>`).join('')||'<p class="muted">No orders found.</p>';
}
function renderReports(){
 const v=S.orders.filter(o=>!o.void&&inRange(o,+$('#rng').value)),rev=v.reduce((s,o)=>s+o.total,0),qty={},pm={};
 let n=0;v.forEach(o=>{pm[o.pay]=(pm[o.pay]||0)+o.total;o.items.forEach(i=>{qty[i.name]=(qty[i.name]||0)+i.qty;n+=i.qty})});
 $('#kpis').innerHTML=[['Revenue','₹'+fmt(rev)],['Bills',v.length],['Items sold',n],['Avg bill','₹'+fmt(v.length?rev/v.length:0)],['Prepaid orders',v.filter(o=>o.prepaid).length]].map(k=>`<div class="kpi"><span class="muted">${k[0]}</span><b>${k[1]}</b></div>`).join('');
 const t=Object.entries(qty).sort((a,b)=>b[1]-a[1]).slice(0,6),mx=t.length?t[0][1]:1;
 $('#top').innerHTML=t.map(e=>`<div style="margin-bottom:8px"><div class="sum"><span>${esc(e[0])}</span><b>${e[1]}</b></div><div class="bar"><i style="width:${e[1]/mx*100}%"></i></div></div>`).join('')||'<p class="muted">No sales yet.</p>';
 $('#pm').innerHTML=Object.entries(pm).map(e=>`<div class="sum"><span>${e[0]}</span><b>₹${fmt(e[1])}</b></div>`).join('')||'<p class="muted">No sales yet.</p>';
 const lo=S.menu.filter(m=>m.stock!=null&&m.stock<=5);
 $('#low').innerHTML=lo.map(m=>`<div class="sum"><span>${esc(m.name)}</span><b class="${m.stock?'':'tag'}">${m.stock?m.stock+' left':'Sold out'}</b></div>`).join('')||'<p class="muted">All items well stocked.</p>';
}
function renderMenu(){
 $('#mlist').innerHTML=S.menu.map(m=>`<div class="row"><div><b>${esc(m.name)}</b> · ₹${fmt(m.price)}<div class="muted">${esc(m.cat||'Other')} · ${m.stock==null?'Unlimited':m.stock+' in stock'}</div></div><div><button class="link" data-a="rs" data-id="${m.id}">+Stock</button><button class="link" data-a="edit" data-id="${m.id}">Edit</button><button class="link bad" data-a="del" data-id="${m.id}">Delete</button></div></div>`).join('')||'<p class="muted">No items.</p>';
 $('#cn').value=S.cfg.name;$('#tx').value=S.cfg.tax||0;$('#shop').textContent=S.cfg.name;
}
function dialog(title,text,restore){dmode=title;$('#dt').textContent=title;$('#dx').value=text;$('#ap').hidden=!restore;$('#dx').readOnly=!restore;$('#dg').classList.add('show')}
function resetOrder(){cart={};$('#disc').value='';$('#rcv').value='';renderCart()}
function show(t){['bill','orders','reports','menu'].forEach(n=>{$('#v-'+n).hidden=n!==t});$$('nav button').forEach(b=>b.classList.toggle('on',b.dataset.id===t));({orders:renderOrders,reports:renderReports,menu:renderMenu,bill:renderCart})[t]()}

let qrDone=false;
const QR_SRC='gpay-qr.jpg';
function showQR(c){
 $('#qrImg').src=QR_SRC;
 $('#qrAmt').textContent='₹'+fmt(c.total);
 $('#qrNote').textContent='Customer scans this QR and pays exactly this amount. Tap “Payment Received” only after the payment is confirmed. The order will be marked PREPAID.';
 $('#qr').classList.add('show');
}
const A={
 tab:id=>show(id),cat:id=>{cat=id;renderGrid()},
 add:id=>{const m=item(id);if(m&&left(m)>0){cart[m.id]=(cart[m.id]||0)+1;renderCart()}},
 inc:id=>{const m=item(id);if(m&&left(m)>0){cart[id]++;renderCart()}},
 dec:id=>{cart[id]--;if(cart[id]<=0)delete cart[id];renderCart()},
 rm:id=>{delete cart[id];renderCart()},clr:()=>resetOrder(),
 gen:()=>{const c=calc();if(!c.ls.length)return;
  if($('#pay').value==='UPI'&&!qrDone){showQR(c);return}
  qrDone=false;
  const rc=parseFloat($('#rcv').value),pay=$('#pay').value;
  const o={no:(S.orders.length?Math.max(...S.orders.map(x=>x.no)):1000)+1,date:new Date().toISOString(),shop:S.cfg.name,items:c.ls,sub:c.sub,disc:c.disc,tax:c.tax,total:c.total,pay,prepaid:pay==='UPI',paid:pay==='Cash'&&!isNaN(rc)?rc:c.total};
  c.ls.forEach(l=>{const m=item(l.id);if(m&&m.stock!=null)m.stock=Math.max(0,m.stock-l.qty)});
  S.orders.unshift(o);save();viewOld=false;openBill(o)},
 prt:()=>{try{window.print()}catch(e){}},
 done:()=>{$('#rc').classList.remove('show');if(!viewOld)resetOrder()},
 view:id=>{viewOld=true;openBill(S.orders.find(o=>o.no===+id))},
 void:id=>{const o=S.orders.find(x=>x.no===+id);if(!o||!confirm('Void bill #'+id+'? Stock will be restored.'))return;
  o.void=true;o.items.forEach(l=>{const m=item(l.id);if(m&&m.stock!=null)m.stock+=l.qty});save();renderOrders()},
 save:()=>{const name=$('#nn').value.trim(),price=parseFloat($('#np').value),sv_=$('#ns').value.trim(),stock=sv_===''?null:Math.max(0,parseInt(sv_,10));
  if(!name||isNaN(price)||price<0||(stock!==null&&isNaN(stock))){alert('Enter a valid name, price and stock.');return}
  const cat_=$('#nc').value.trim()||'Other';
  if(editId){Object.assign(item(editId),{name,price,cat:cat_,stock})}else S.menu.push({id:Date.now(),name,price,cat:cat_,stock});
  save();A.cancel();renderMenu()},
 edit:id=>{const m=item(id);editId=id;$('#nn').value=m.name;$('#np').value=m.price;$('#nc').value=m.cat||'';$('#ns').value=m.stock==null?'':m.stock;$('#fh').textContent='Edit Item';$('#cx').hidden=false;scrollTo(0,0)},
 cancel:()=>{editId=null;['#nn','#np','#nc','#ns'].forEach(s=>$(s).value='');$('#fh').textContent='Add Item';$('#cx').hidden=true},
 del:id=>{if(confirm('Delete this item? Past bills are kept.')){S.menu=S.menu.filter(m=>String(m.id)!==id);delete cart[id];save();renderMenu()}},
 rs:id=>{const m=item(id),n=parseInt(prompt('Add how many units to '+m.name+'?'),10);if(n>0){m.stock=(m.stock||0)+n;save();renderMenu()}},
 cfg:()=>{S.cfg.name=$('#cn').value.trim()||'Canteen Management System';S.cfg.tax=Math.max(0,parseFloat($('#tx').value)||0);save();renderMenu();renderCart()},
 csv:()=>{const q=v=>'"'+String(v).replace(/"/g,'""')+'"';
  dialog('Export CSV',['Bill,Date,Items,Subtotal,Discount,Tax,Total,Payment,Status,Prepaid'].concat(S.orders.map(o=>[o.no,new Date(o.date).toLocaleString(),q(o.items.map(i=>i.name+' x'+i.qty).join('; ')),fmt(o.sub),fmt(o.disc),fmt(o.tax),fmt(o.total),o.pay,o.void?'VOID':'OK',o.prepaid?'Yes':'No'].join(','))).join('\n'))},
 bak:()=>dialog('Backup',JSON.stringify(S,null,1)),
 rst:()=>dialog('Restore (paste backup JSON below)','',true),
 apply:()=>{try{const d=JSON.parse($('#dx').value);if(!Array.isArray(d.menu)||!Array.isArray(d.orders))throw 0;if(!confirm('Replace all current data with this backup?'))return;S={menu:d.menu,orders:d.orders,cfg:d.cfg||S.cfg};save();cart={};A.dclose();renderMenu();renderCart()}catch(e){alert('Invalid backup data.')}},
 wipe:()=>{if(confirm('Delete ALL menu, orders and settings?')&&confirm('This cannot be undone. Continue?')){S={menu:DEF,orders:[],cfg:{tax:0,name:'Canteen Management System'}};save();cart={};renderMenu();renderCart()}},
 copy:()=>{const t=$('#dx');t.select();try{navigator.clipboard.writeText(t.value)}catch(e){try{document.execCommand('copy')}catch(_){}}},
 dl:()=>{try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([$('#dx').value]));a.download=dmode.startsWith('Export')?'orders.csv':'canteen-backup.json';a.click()}catch(e){}},
 dclose:()=>$('#dg').classList.remove('show'),
 qrok:()=>{$('#qr').classList.remove('show');qrDone=true;A.gen()},
 qrcancel:()=>$('#qr').classList.remove('show')
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b&&A[b.dataset.a])A[b.dataset.a](b.dataset.id)});
['#disc','#rcv','#pay','#dtype'].forEach(s=>$(s).addEventListener('input',renderCart));
$('#q').addEventListener('input',renderGrid);
$('#q').addEventListener('keydown',e=>{if(e.key==='Enter'){const b=$('#grid .item:not(:disabled)');if(b){A.add(b.dataset.id);$('#q').value='';renderGrid()}}});
$('#oq').addEventListener('input',renderOrders);$('#od').addEventListener('input',renderOrders);$('#rng').addEventListener('input',renderReports);
document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();show('bill');$('#q').focus()}});
renderMenu();renderCart();
