let sb=null;
let state={flats:[],tenants:[],payments:[],bills:[],stats:{}};
let appEntered=false,loadingApp=false,currentSection="dashboard";

const $=id=>document.getElementById(id);
const money=v=>"₹"+Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:2});
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const today=()=>new Date().toISOString().slice(0,10);
const month=()=>new Date().toISOString().slice(0,7);

function toast(msg,ok=true){const t=$("toast");t.className="fixed bottom-5 right-5 z-[60] bg-white border shadow-xl rounded-xl px-4 py-3 "+(ok?"text-green-700":"text-red-700");t.textContent=msg;setTimeout(()=>t.classList.add("hidden"),3000)}
function closeModal(){$("modal").classList.add("hidden");$("modal").classList.remove("flex")}
function openModal(title,html,submit){$("modalTitle").textContent=title;$("modalForm").innerHTML=html;$("modal").classList.remove("hidden");$("modal").classList.add("flex");$("modalForm").onsubmit=e=>{e.preventDefault();submit(new FormData(e.target))}}

async function init(){
 try{
  const r=await fetch("/api/config",{cache:"no-store"});const c=await r.json();
  if(!c.supabaseUrl||!c.supabaseAnonKey)throw Error("Supabase configuration is missing.");
  sb=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey);
  const {data}=await sb.auth.getSession();
  if(data.session) await enterApplication(data.session); else showLogin();
  sb.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_IN"&&session)setTimeout(()=>enterApplication(session),0);if(event==="SIGNED_OUT"){appEntered=false;showLogin()}});
 }catch(e){console.error(e);showLogin();$("lm").textContent=e.message}
}
function showLogin(){$("login").classList.remove("hidden");$("app").classList.add("hidden")}
async function enterApplication(session){
 if(!session||loadingApp||(appEntered&&$("app").classList.contains("hidden")===false))return;
 loadingApp=true;
 try{$("login").classList.add("hidden");$("app").classList.remove("hidden");await load();appEntered=true}
 catch(e){console.error(e);$("app").classList.add("hidden");$("login").classList.remove("hidden");$("lm").textContent=e.message}
 finally{loadingApp=false}
}
async function api(url,options={}){
 const {data,error}=await sb.auth.getSession();if(error||!data.session)throw Error("Your login session has expired. Please sign in again.");
 const headers={...(options.headers||{}),"Authorization":"Bearer "+data.session.access_token,"Content-Type":"application/json"};
 const r=await fetch(url,{...options,headers});
 const ct=r.headers.get("content-type")||"";
 if(!ct.includes("application/json")){const txt=await r.text();throw Error(txt||`Request failed (${r.status})`)}
 const out=await r.json();if(!r.ok)throw Error(out.error||`Request failed (${r.status})`);return out;
}
async function load(){
 const d=await api("/api/dashboard");state=d||{};
 state.flats=Array.isArray(state.flats)?state.flats:[];state.tenants=Array.isArray(state.tenants)?state.tenants:[];
 state.payments=Array.isArray(state.payments)?state.payments:[];state.bills=Array.isArray(state.bills)?state.bills:[];state.stats=state.stats||{};
 renderDashboard();renderFlats();renderTenants();renderPayments();renderBills();
}
function show(section){
 currentSection=section;["dashboard","flats","tenants","payments","bills"].forEach(n=>$(n).classList.toggle("hidden",n!==section));
 $("title").textContent=section[0].toUpperCase()+section.slice(1);
 $("quickAdd").classList.toggle("hidden",section==="dashboard");
}
function quickAction(){if(currentSection==="flats")openFlat();else if(currentSection==="tenants")openTenant();else if(currentSection==="payments")openPayment();else if(currentSection==="bills")openBill()}

function renderDashboard(){
 const s=state.stats;$("s1").textContent=s.totalFlats||0;$("s2").textContent=s.occupied||0;$("s3").textContent=money(s.monthlyCollection);$("s4").textContent=money(s.pendingDues);
 $("cards").innerHTML=state.flats.map(f=>{const t=state.tenants.find(x=>x.flat_id===f.id),b=state.bills.find(x=>x.flat_id===f.id);return `<div class="border rounded-2xl p-4"><div class="flex justify-between"><b class="text-lg">Flat ${esc(f.flat_number)}</b><span class="text-xs px-2 py-1 rounded-lg bg-slate-100">${esc(f.status)}</span></div><p class="text-sm text-slate-500 mt-3">${t?esc(t.name):"No active tenant"}</p><div class="flex justify-between mt-4"><span>Rent</span><b>${money(f.monthly_rent)}</b></div><div class="flex justify-between mt-1"><span>Due</span><b>${money(b?.total_due)}</b></div></div>`}).join("")||`<p class="text-slate-500">No flats found. Add your first flat.</p>`;
}
function actions(type,id){return `<div class="flex gap-2"><button class="text-indigo-600" onclick="edit${type}('${id}')">Edit</button><button class="text-red-600" onclick="delete${type}('${id}')">Delete</button></div>`}
function table(headers,rows){if(!rows.length)return `<p class="text-slate-500 mt-3">No records found.</p>`;return `<div class="overflow-auto"><table class="min-w-full text-sm"><thead><tr class="border-b">${headers.map(h=>`<th class="p-3 text-left whitespace-nowrap">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr class="border-b hover:bg-slate-50">${r.map(v=>`<td class="p-3 whitespace-nowrap">${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`}
function renderFlats(){$("fl").innerHTML=table(["Flat","Rent","Rate","Meter","Status","Actions"],state.flats.map(f=>[esc(f.flat_number),money(f.monthly_rent),money(f.electricity_rate),esc(f.meter_number||"-"),esc(f.status),actions("Flat",f.id)]))}
function renderTenants(){$("tn").innerHTML=table(["Name","Mobile","Flat","Move in","Actions"],state.tenants.map(t=>{const f=state.flats.find(x=>x.id===t.flat_id);return [esc(t.name),esc(t.mobile),esc(f?.flat_number||"-"),esc(t.move_in||"-"),actions("Tenant",t.id)]}))}
function renderPayments(){$("py").innerHTML=table(["Date","Amount","Mode","Reference"],state.payments.map(p=>[esc(p.payment_date),money(p.amount),esc(p.mode),esc(p.reference||"-")]))}
function renderBills(){$("bi").innerHTML=table(["Month","Flat","Total","Due","Status"],state.bills.map(b=>{const f=state.flats.find(x=>x.id===b.flat_id);return [esc(b.month),esc(f?.flat_number||"-"),money(b.total_amount),money(b.total_due),esc(b.status)]}))}

function flatOptions(selected=""){return state.flats.map(f=>`<option value="${f.id}" ${f.id===selected?"selected":""}>${esc(f.flat_number)} — ${money(f.monthly_rent)}</option>`).join("")}
function tenantOptions(flatId="",selected=""){return state.tenants.filter(t=>!flatId||t.flat_id===flatId).map(t=>`<option value="${t.id}" ${t.id===selected?"selected":""}>${esc(t.name)}</option>`).join("")}
function openFlat(f=null){
 const x=f||{};openModal(f?"Edit Flat":"Add Flat",`
 <input class="input" name="flat_number" required placeholder="Flat number" value="${esc(x.flat_number)}">
 <input class="input" name="monthly_rent" type="number" min="0" required placeholder="Monthly rent" value="${x.monthly_rent??""}">
 <input class="input" name="electricity_rate" type="number" min="0" step="0.01" required placeholder="Electricity rate / unit" value="${x.electricity_rate??""}">
 <input class="input" name="meter_number" placeholder="Meter number" value="${esc(x.meter_number)}">
 <select class="input" name="status"><option value="vacant" ${x.status==="vacant"?"selected":""}>Vacant</option><option value="occupied" ${x.status==="occupied"?"selected":""}>Occupied</option></select>
 <button class="btn primary w-full">${f?"Update Flat":"Save Flat"}</button>`,async fd=>{
  try{const body=Object.fromEntries(fd);await api("/api/flats",{method:f?"PUT":"POST",body:JSON.stringify(f?{...body,id:f.id}:body)});closeModal();toast(f?"Flat updated":"Flat added");await load()}catch(e){toast(e.message,false)}
 })
}
function editFlat(id){const f=state.flats.find(x=>x.id===id);if(f)openFlat(f)}
async function deleteFlat(id){if(!confirm("Delete this flat?"))return;try{await api("/api/flats",{method:"DELETE",body:JSON.stringify({id})});toast("Flat deleted");await load()}catch(e){toast(e.message,false)}}

function openTenant(t=null){
 const x=t||{};openModal(t?"Edit Tenant":"Add Tenant",`
 <input class="input" name="name" required placeholder="Full name" value="${esc(x.name)}">
 <input class="input" name="mobile" required placeholder="Mobile number" value="${esc(x.mobile)}">
 <input class="input" name="email" type="email" placeholder="Email" value="${esc(x.email)}">
 <select class="input" name="flat_id" required><option value="">Select flat</option>${flatOptions(x.flat_id)}</select>
 <input class="input" name="move_in" type="date" value="${esc(x.move_in)}">
 <label class="flex gap-2 items-center"><input type="checkbox" name="whatsapp_opt_in" ${x.whatsapp_opt_in?"checked":""}> WhatsApp opt-in</label>
 <button class="btn primary w-full">${t?"Update Tenant":"Save Tenant"}</button>`,async fd=>{
  try{const body=Object.fromEntries(fd);body.whatsapp_opt_in=fd.has("whatsapp_opt_in");await api("/api/tenants",{method:t?"PUT":"POST",body:JSON.stringify(t?{...body,id:t.id}:body)});closeModal();toast(t?"Tenant updated":"Tenant added");await load()}catch(e){toast(e.message,false)}
 })
}
function editTenant(id){const t=state.tenants.find(x=>x.id===id);if(t)openTenant(t)}
async function deleteTenant(id){if(!confirm("Delete this tenant?"))return;try{await api("/api/tenants",{method:"DELETE",body:JSON.stringify({id})});toast("Tenant deleted");await load()}catch(e){toast(e.message,false)}}

function openPayment(){
 openModal("Record Payment",`
 <select class="input" name="flat_id" id="payFlat" required><option value="">Select flat</option>${flatOptions()}</select>
 <select class="input" name="tenant_id" id="payTenant"><option value="">Select tenant</option>${tenantOptions()}</select>
 <select class="input" name="bill_id"><option value="">No bill selected</option>${state.bills.map(b=>`<option value="${b.id}">${esc(b.month)} — ${money(b.total_due)}</option>`).join("")}</select>
 <input class="input" name="amount" type="number" min="0" step="0.01" required placeholder="Amount">
 <input class="input" name="payment_date" type="date" value="${today()}" required>
 <select class="input" name="mode"><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank">Bank Transfer</option><option value="cheque">Cheque</option></select>
 <input class="input" name="reference" placeholder="Reference / transaction ID">
 <textarea class="input" name="notes" placeholder="Notes"></textarea>
 <button class="btn primary w-full">Record Payment</button>`,async fd=>{
  try{await api("/api/payments",{method:"POST",body:JSON.stringify(Object.fromEntries(fd))});closeModal();toast("Payment recorded");await load()}catch(e){toast(e.message,false)}
 });
 setTimeout(()=>{$("payFlat")?.addEventListener("change",e=>{const tid=$("payTenant");tid.innerHTML=`<option value="">Select tenant</option>${tenantOptions(e.target.value)}`})},0)
}
function openBill(){
 openModal("Generate Monthly Bill",`
 <select class="input" name="flat_id" required><option value="">Select flat</option>${flatOptions()}</select>
 <input class="input" name="month" type="month" value="${month()}" required>
 <input class="input" name="current_reading" type="number" min="0" step="0.01" required placeholder="Current meter reading">
 <button class="btn primary w-full">Generate Bill</button>`,async fd=>{
  try{await api("/api/bills",{method:"POST",body:JSON.stringify(Object.fromEntries(fd))});closeModal();toast("Bill generated");await load()}catch(e){toast(e.message,false)}
 })
}
async function exportExcel(){
 try{const {data,error}=await sb.auth.getSession();if(error||!data.session)throw Error("Session expired.");const r=await fetch("/api/export/payments",{headers:{Authorization:"Bearer "+data.session.access_token}});if(!r.ok)throw Error(await r.text()||"Export failed");const blob=await r.blob();const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="rentpilot-payments.xlsx";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(a.href);toast("Excel downloaded")}catch(e){toast(e.message,false)}
}
$("lf").addEventListener("submit",async e=>{e.preventDefault();$("lm").textContent="";const b=$("loginBtn");b.disabled=true;b.textContent="Signing in...";try{const {data,error}=await sb.auth.signInWithPassword({email:$("email").value.trim(),password:$("pw").value});if(error)throw error;if(data.session)await enterApplication(data.session)}catch(e){$("lm").textContent=e.message}finally{b.disabled=false;b.textContent="Sign in"}});
$("logoutBtn").addEventListener("click",()=>sb.auth.signOut());
init();
