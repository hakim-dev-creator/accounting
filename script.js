const STORAGE_KEY = 'salary_v2_4_offline'; 
const OLD_KEYS = ['salary_v2_3_offline', 'salary_v13_offline'];
const MASTER_PIN = "10031945";

// Data structure
let appData = { emps: [], att: {}, pin: "0000", adminPin: "1234", advances: {}, pinLoginEnabled: true, pinAdminEnabled: true, debts: { in: [], out: [] }, phones: {}, logo: null, companyName: "نظام الرواتب", companyNameFr: "" };
let pinIn = "", currDate = new Date(), sel = null, target = "login", fails = 0, locked = false;
let tempLogoBase64 = null;

window.onload = () => {
    let saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
        for(let key of OLD_KEYS) {
            let old = localStorage.getItem(key);
            if(old) { localStorage.setItem(STORAGE_KEY, old); saved = old; break; }
        }
    }
    if(saved) {
        try {
            let parsed = JSON.parse(saved);
            appData = { ...appData, ...parsed };
            ['in', 'out'].forEach(t => {
                if(!appData.debts[t]) appData.debts[t] = [];
                appData.debts[t].forEach(d => {
                    if(d.originalVal === undefined) d.originalVal = d.val;
                    if(!d.history) d.history = [{ type: 'init', val: d.originalVal, date: d.date || getFormattedDate(), time: d.time || "00:00" }];
                    if(!d.status) d.status = d.val <= 0 ? 'paid' : 'active';
                });
            });
        } catch(e) { console.error("Data error", e); }
    }
    
    applyCompanyIdentity();
    setupDots(4);
    renderCalendar();
    if (!appData.pinLoginEnabled) { document.getElementById('pinModal').style.display = 'none'; document.getElementById('contentArea').style.display = 'block'; }
};

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(appData)); }

// --- Logo & Identity Logic ---
function applyCompanyIdentity() {
    if(appData.companyName) document.getElementById('dispNameAr').innerText = appData.companyName;
    document.getElementById('dispNameFr').innerText = appData.companyNameFr || "";
    
    if(appData.logo) {
        let el = document.getElementById('displayLogo');
        el.src = appData.logo;
        el.style.display = 'block';
    }
}

function handleLogoUpload(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function (e) {
            tempLogoBase64 = e.target.result;
            let preview = document.getElementById('previewLogo');
            preview.src = tempLogoBase64;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function saveCompanySettings() {
    let newName = document.getElementById('inputCompName').value;
    let newNameFr = document.getElementById('inputCompNameFr').value;
    
    if(newName) appData.companyName = newName;
    if(newNameFr !== undefined) appData.companyNameFr = newNameFr;
    if(tempLogoBase64) appData.logo = tempLogoBase64;
    
    save();
    applyCompanyIdentity();
    alert("تم حفظ بيانات المؤسسة بنجاح ✅");
    closeM('settingsModal');
}

function openSettings() {
    document.getElementById('chkLogin').checked = appData.pinLoginEnabled; document.getElementById('chkAdmin').checked = appData.pinAdminEnabled;
    document.getElementById('inputCompName').value = appData.companyName || "";
    document.getElementById('inputCompNameFr').value = appData.companyNameFr || "";
    
    if(appData.logo) {
        document.getElementById('previewLogo').src = appData.logo;
        document.getElementById('previewLogo').style.display = 'block';
    }
    document.getElementById('eList').innerHTML = appData.emps.map(e => `<div style="display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #eee"><span>${e.name} (${e.rate})</span><button onclick="if(confirm('حذف؟')){appData.emps=appData.emps.filter(x=>x.id!=${e.id});save();openSettings()}" style="background:red;width:auto;padding:2px 8px;color:white;font-size:0.7rem">حذف</button></div>`).join('');
    document.getElementById('settingsModal').style.display='flex';
}

// --- Standard Logic ---
function setNow(id) { let n = new Date(); document.getElementById(id).value = n.getHours().toString().padStart(2,'0') + ":" + n.getMinutes().toString().padStart(2,'0'); }
function getFormattedDate() { return new Date().toLocaleDateString('ar-DZ'); }
function getFormattedTime() { return new Date().toLocaleTimeString('ar-DZ', {hour:'2-digit', minute:'2-digit'}); }
function closeM(id) { document.getElementById(id).style.display = 'none'; }
function calculateMinutes(tIn, tOut) {
    let [h1, m1] = tIn.split(':').map(Number);
    let [h2, m2] = tOut.split(':').map(Number);
    let sMin = h1*60 + m1, eMin = h2*60 + m2;
    return (eMin < sMin) ? (1440 - sMin) + eMin : eMin - sMin;
}

function setupDots(n) { document.getElementById('dotsContainer').innerHTML = Array(n).fill('<div class="pin-dot"></div>').join(''); }
function updateDots() { document.querySelectorAll('.pin-dot').forEach((d, i) => d.className = i < pinIn.length ? 'pin-dot active' : 'pin-dot'); }
function pressPin(n) { let max = locked ? 8 : 4; if(pinIn.length < max) { pinIn += n; updateDots(); if(pinIn.length === max) checkPin(); } }
function backspacePin() { pinIn = pinIn.slice(0, -1); updateDots(); }
function clearPin() { pinIn = ""; updateDots(); }
function cancelPin() { target === "login" ? location.reload() : closeM('pinModal'); clearPin(); }
function checkPin() {
    if(pinIn === MASTER_PIN || pinIn === (target==="login" ? appData.pin : appData.adminPin)) {
        locked = false; fails = 0; document.getElementById('lockWarning').style.display='none';
        document.getElementById('pinModal').style.display = 'none';
        if(target === "login") document.getElementById('contentArea').style.display='block';
        else if(target === "settings") openSettings();
        else if(target === "edit") openAdminEdit(appData.att[sel.key]);
        clearPin(); setupDots(4);
    } else {
        fails++;
        if(fails >= 3) { locked = true; document.getElementById('lockWarning').style.display='block'; setupDots(8); }
        else { alert("رمز خطأ!"); clearPin(); }
    }
}

function changeMonth(n) { currDate.setMonth(currDate.getMonth() + n); renderCalendar(); }
function renderCalendar() {
    const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    document.getElementById('monthLabel').innerText = months[currDate.getMonth()] + " " + currDate.getFullYear();
    const grid = document.getElementById('calendarGrid');
    const days = new Date(currDate.getFullYear(), currDate.getMonth()+1, 0).getDate();
    grid.style.gridTemplateColumns = `140px repeat(${days}, 60px)`;
    grid.innerHTML = '<div></div>'; 
    for(let d=1; d<=days; d++) grid.innerHTML += `<div><b>${d}</b></div>`;
    const select = document.getElementById('empSelect');
    select.innerHTML = '<option value="">-- اختر العامل --</option>';
    appData.emps.forEach(e => {
        select.innerHTML += `<option value="${e.id}">${e.name}</option>`;
        grid.innerHTML += `<div class="employee-name-cell">${e.name}</div>`;
        for(let d=1; d<=days; d++) {
            let key = `${currDate.getFullYear()}-${currDate.getMonth()}-${d}-${e.id}`;
            let data = appData.att[key], txt = '-', cls = 'attendance-cell';
            if(data) {
                cls += ' cell-locked';
                if(data.tOut) { cls += ' status-present'; txt = `${Math.floor(data.mTotal/60)}:${(data.mTotal%60).toString().padStart(2,'0')}`; }
                else if(data.tIn) { cls += ' status-partial'; txt = 'حضور'; }
                else if(data.abs) { cls += ' status-absent'; txt = 'غياب'; }
            }
            grid.innerHTML += `<div class="${cls}" onclick="clickCell('${e.id}', ${d}, '${key}')">${txt}</div>`;
        }
    });
}

function clickCell(eid, d, key) {
    if(new Date(currDate.getFullYear(), currDate.getMonth(), d) > new Date()) { alert("لا يمكن التأشير في المستقبل!"); return; }
    sel = { e: appData.emps.find(x=>x.id==eid), key: key };
    if(appData.att[key]) { target = "edit"; appData.pinAdminEnabled ? document.getElementById('pinModal').style.display='flex' : openAdminEdit(appData.att[key]); } 
    else {
        document.getElementById('attEmpName').innerText = sel.e.name;
        document.getElementById('currentRateInput').value = sel.e.rate;
        document.getElementById('boxIn').style.display='block'; document.getElementById('boxOut').style.display='none';
        document.getElementById('attModal').style.display='flex';
    }
}
function updateEmpRateFromModal() { let v=parseFloat(document.getElementById('currentRateInput').value); if(v){ sel.e.rate=v; save(); alert("تم التحديث"); } }

function saveAtt(type) {
    if(type === 'in') { appData.att[sel.key] = { tIn: document.getElementById('tIn').value, rate: sel.e.rate }; document.getElementById('boxIn').style.display='none'; document.getElementById('boxOut').style.display='block'; }
    else if(type === 'out') { let d = appData.att[sel.key], o = document.getElementById('tOut').value; d.tOut = o; d.mTotal = calculateMinutes(d.tIn, o); closeM('attModal'); }
    else if(type === 'absent') { appData.att[sel.key] = { abs: true }; closeM('attModal'); }
    else if(type === 'deleteAdmin') { delete appData.att[sel.key]; closeM('adminEditModal'); }
    save(); renderCalendar();
}

function openAdminEdit(d) { document.getElementById('editIn').value = d.tIn || "08:00"; document.getElementById('editOut').value = d.tOut || "16:00"; document.getElementById('adminEditModal').style.display='flex'; }
function confirmAdminEdit() { let i = document.getElementById('editIn').value, o = document.getElementById('editOut').value; appData.att[sel.key] = { tIn: i, tOut: o, mTotal: calculateMinutes(i, o), rate: sel.e.rate }; save(); renderCalendar(); closeM('adminEditModal'); }
function clearAttendanceOnly() { if(confirm("مسح جميع التأشيرات؟")) { appData.att = {}; appData.advances = {}; save(); location.reload(); } }

function openAdvances() {
    const area = document.getElementById('advListArea'), mk = `${currDate.getFullYear()}-${currDate.getMonth()}`;
    if(!appData.advances[mk]) appData.advances[mk] = {};
    area.innerHTML = appData.emps.map(e => {
        let list = appData.advances[mk][e.id] || [];
        return `<div style="border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:8px"><b>${e.name}</b>
            <div class="row-now"><input type="number" id="adv_${e.id}" placeholder="المبلغ"><button onclick="addAdv('${e.id}')" style="width:auto; background:var(--success); color:white">+</button></div>
            ${list.map((x,i) => `<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #eee;padding:4px"><span>${x.val} دج</span><span onclick="delAdv('${e.id}',${i})" style="color:red;cursor:pointer">✖</span></div>`).join('')}</div>`;
    }).join('');
    document.getElementById('advancesModal').style.display='flex';
}
function addAdv(id) { let v = parseFloat(document.getElementById('adv_'+id).value), mk = `${currDate.getFullYear()}-${currDate.getMonth()}`; if(v) { if(!appData.advances[mk][id]) appData.advances[mk][id] = []; appData.advances[mk][id].push({ val: v, date: getFormattedDate() }); save(); openAdvances(); } }
function delAdv(id, idx) { appData.advances[`${currDate.getFullYear()}-${currDate.getMonth()}`][id].splice(idx,1); save(); openAdvances(); }

function openDebts() { renderDebts(); updateNameSuggestions(); document.getElementById('debtsModal').style.display='flex'; showDebtTab('in'); }
function showDebtTab(type) {
    ['in','out'].forEach(t => document.getElementById('debtSection'+(t==='in'?'In':'Out')).style.display = t===type?'block':'none');
    document.getElementById('btnTabIn').style.background = type === 'in' ? '#2E7D32' : '#eee'; document.getElementById('btnTabIn').style.color = type === 'in' ? '#fff' : '#333';
    document.getElementById('btnTabOut').style.background = type === 'out' ? '#C62828' : '#eee'; document.getElementById('btnTabOut').style.color = type === 'out' ? '#fff' : '#333';
    document.getElementById('delType').value = type; populateDelClients();
}
function renderDebts() { renderGroupedList('in', 'debtInList', 'totalIn'); renderGroupedList('out', 'debtOutList', 'totalOut'); }
function renderGroupedList(type, listId, totalId) {
    let groups = {}, grandTotal = 0;
    appData.debts[type].forEach((d, idx) => {
        if(!groups[d.name]) groups[d.name] = { total: 0, items: [] };
        if(d.status !== 'paid') { groups[d.name].total += d.val; grandTotal += d.val; }
        groups[d.name].items.push({ ...d, realIdx: idx });
    });
    let html = Object.keys(groups).map((name, i) => {
        let g = groups[name], gid = `g_${type}_${i}`;
        return `<div class="client-group-card"><div class="client-header" onclick="document.getElementById('${gid}').style.display=document.getElementById('${gid}').style.display=='block'?'none':'block'">
            <span style="font-weight:bold;color:var(--primary)">👤 ${name}</span><span style="font-weight:bold;background:#fff;padding:3px 10px;border-radius:20px">${g.total}</span></div>
            <div id="${gid}" class="details-box"><table class="sub-debt-table"><thead><tr><th>الأصل</th><th>الباقي</th><th>التاريخ</th><th>إجراء</th></tr></thead><tbody>
            ${g.items.map(it => `<tr style="${it.status==='paid'?'background:#f1f8e9':''}"><td>${it.originalVal}</td><td><div style="display:flex;justify-content:center"><button class="btn-edit-val" onclick="editDebtValue('${type}',${it.realIdx})">✎</button><b>${it.val}</b></div></td>
            <td><span style="font-size:0.7rem">${it.date}</span><br><span style="color:blue;cursor:pointer;font-size:0.7rem" onclick="openHistory('${type}',${it.realIdx})">سجل</span></td><td>${it.status==='paid'?'✔':`<button class="btn-3d" onclick="settleDebt('${type}',${it.realIdx})">تسديد</button>`}</td></tr>`).join('')}</tbody></table></div></div>`;
    }).join('');
    document.getElementById(listId).innerHTML = html || '<div style="text-align:center;padding:10px;color:#999">لا توجد سجلات</div>';
    document.getElementById(totalId).innerText = grandTotal;
}

function addDebt(type) {
    let nEl = document.getElementById(type=='in'?'debtInName':'debtOutName'), vEl = document.getElementById(type=='in'?'debtInVal':'debtOutVal'), val = parseFloat(vEl.value);
    if(nEl.value && val) { appData.debts[type].push({ name: nEl.value, originalVal: val, val: val, date: getFormattedDate(), time: getFormattedTime(), status: 'active', history: [{type:'init', val: val, date: getFormattedDate(), time: getFormattedTime()}] }); vEl.value = ""; save(); renderDebts(); updateNameSuggestions(); if(document.getElementById('delType').value === type) populateDelClients(); }
}
function settleDebt(type, idx) {
    let d = appData.debts[type][idx], pay = prompt(`المبلغ (المتبقي: ${d.val}):`);
    if(pay && parseFloat(pay) > 0) { let v=parseFloat(pay); d.val -= v; if(d.val <= 0) {d.val=0; d.status='paid';} d.history.push({type:'pay', val:v, date:getFormattedDate(), time:getFormattedTime()}); save(); renderDebts(); }
}
function editDebtValue(type, idx) {
    let d = appData.debts[type][idx], nw = prompt("تعديل الباقي:", d.val);
    if(nw !== null && !isNaN(parseFloat(nw))) { let v=parseFloat(nw); d.val = v; d.status = v===0?'paid':'active'; d.history.push({type:'edit', val:v, date:getFormattedDate(), time:getFormattedTime()}); save(); renderDebts(); }
}
function updateNameSuggestions() {
    let s = new Set(appData.emps.map(e=>e.name)); appData.debts.in.forEach(d=>s.add(d.name)); appData.debts.out.forEach(d=>s.add(d.name));
    document.getElementById('namesList').innerHTML = Array.from(s).map(n => `<option value="${n}">`).join('');
}
function openHistory(type, idx) {
    let d = appData.debts[type][idx];
    document.getElementById('histTitle').innerText = `سجل: ${d.name}`; document.getElementById('histRemaining').innerText = d.val;
    document.getElementById('historyList').innerHTML = [...d.history].reverse().map(h => `<li style="padding:10px;border-bottom:1px solid #eee;display:flex;justify-content:space-between"><span><b>${h.type=='init'?'دين':(h.type=='pay'?'تسديد':'تعديل')}</b><br><span style="color:#888;font-size:0.8rem">${h.date} ${h.time}</span></span><b style="font-size:1.1rem">${h.type=='init'?'+':(h.type=='pay'?'-':'=')}${h.val}</b></li>`).join('');
    document.getElementById('historyModal').style.display='flex';
}

function populateDelClients() {
    let type = document.getElementById('delType').value, names = [...new Set(appData.debts[type].map(d => d.name))];
    let select = document.getElementById('delClientSelect');
    select.innerHTML = '<option value="">-- اختر من القائمة --</option>';
    names.forEach(n => select.innerHTML += `<option value="${n}">${n}</option>`);
    document.getElementById('delRecordContainer').innerHTML = '';
    updateSelectBtnUI(false);
}
function updateDelRecords() {
    let type = document.getElementById('delType').value, client = document.getElementById('delClientSelect').value;
    document.getElementById('delRecordContainer').innerHTML = appData.debts[type].map((d,i) => d.name===client ? `<div class="del-item-row"><input type="checkbox" class="del-cb" value="${i}"><span style="font-size:0.85rem;margin-right:8px">${d.val} دج (${d.date}) ${d.status=='paid'?'✅':''}</span></div>` : '').join('');
    updateSelectBtnUI(false);
}
function toggleSelectAll() {
    let cbs = document.querySelectorAll('.del-cb');
    if(cbs.length === 0) return;
    let newState = !Array.from(cbs).every(c => c.checked);
    cbs.forEach(c => c.checked = newState);
    updateSelectBtnUI(newState);
}
function updateSelectBtnUI(isAllSelected) {
    let btn = document.getElementById('btnSelectAll');
    if(isAllSelected) { btn.innerHTML = "إلغاء التحديد ✖"; btn.style.background = "#78909C"; }
    else { btn.innerHTML = "تحديد الكل ✔"; btn.style.background = "var(--primary-grad)"; }
}
function executeDelete() {
    let type = document.getElementById('delType').value, checks = document.querySelectorAll('.del-cb:checked');
    if(checks.length && confirm(`حذف ${checks.length} سجلات؟`)) {
        let idxs = Array.from(checks).map(c=>parseInt(c.value)).sort((a,b)=>b-a);
        idxs.forEach(i => appData.debts[type].splice(i,1));
        save(); renderDebts(); populateDelClients();
    }
}

function sendSelectedReport() {
    let eid = document.getElementById('empSelect').value; if(!eid) return alert("اختر العامل");
    let e = appData.emps.find(x=>x.id==eid), earned=0, totalMins=0, mk = `${currDate.getFullYear()}-${currDate.getMonth()}`;
    let days = new Date(currDate.getFullYear(), currDate.getMonth()+1, 0).getDate();
    for(let d=1; d<=days; d++) {
        let k = `${currDate.getFullYear()}-${currDate.getMonth()}-${d}-${eid}`, att = appData.att[k];
        if(att && att.mTotal) { totalMins += att.mTotal; earned += (att.mTotal/480) * (att.rate || e.rate); }
    }
    let adv = (appData.advances[mk] && appData.advances[mk][eid]) ? appData.advances[mk][eid].reduce((s,i)=>s+i.val,0) : 0;
    let txt = `👤 *كشف: ${e.name}*\n📅 ${document.getElementById('monthLabel').innerText}\n⏱ عمل: ${Math.floor(totalMins/60)}س ${(totalMins%60)}د\n💵 مستحق: ${Math.round(earned)}\n💸 سحب: ${adv}\n💰 *صافي: ${Math.round(earned-adv)}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
}
function printReport() {
    let mk = `${currDate.getFullYear()}-${currDate.getMonth()}`, mName = document.getElementById('monthLabel').innerText, days = new Date(currDate.getFullYear(), currDate.getMonth()+1, 0).getDate();
    let html = `<html><head><style>body{font-family:Arial,sans-serif;direction:rtl}table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:8px;text-align:center}</style></head><body><h2 style="text-align:center">${appData.companyName || "نظام الرواتب"} - ${mName}</h2><table><thead><tr><th>العامل</th><th>مستحق</th><th>تسبيقات</th><th>صافي</th></tr></thead><tbody>` + 
    appData.emps.map(e => {
        let tot = 0;
        for(let d=1; d<=days; d++) { let k=`${currDate.getFullYear()}-${currDate.getMonth()}-${d}-${e.id}`; if(appData.att[k]&&appData.att[k].mTotal) tot += (appData.att[k].mTotal/480)*(appData.att[k].rate||e.rate); }
        let adv = (appData.advances[mk]&&appData.advances[mk][e.id]) ? appData.advances[mk][e.id].reduce((s,i)=>s+i.val,0) : 0;
        return `<tr><td>${e.name}</td><td>${Math.round(tot)}</td><td>${adv}</td><td><b>${Math.round(tot-adv)}</b></td></tr>`;
    }).join('') + `</tbody></table></body></html>`;
    let w = window.open('','_blank'); w.document.write(html); w.document.close(); w.print();
}

function requestAdminAccess(t) { target=t; appData.pinAdminEnabled ? document.getElementById('pinModal').style.display='flex' : (t==='settings'?openSettings():null); }
function addE() { let n=document.getElementById('newE').value, r=document.getElementById('newR').value; if(n&&r){appData.emps.push({id:Date.now(), name:n, rate:parseFloat(r)}); save(); openSettings();} }
function toggleSecurity(t) { t=='login'?appData.pinLoginEnabled=document.getElementById('chkLogin').checked : appData.pinAdminEnabled=document.getElementById('chkAdmin').checked; save(); }
function updatePin() { let p=document.getElementById('p1').value; if(p.length===4){appData.pin=p;alert("تم");save();}else alert("4 أرقام"); }
function downloadBackup() { let a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(appData)],{type:"application/json"})); a.download=`Salary_${getFormattedDate().replace(/\//g,'-')}.json`; a.click(); }
function restoreBackup(i) { let f=i.files[0], r=new FileReader(); r.onload=e=>{try{let d=JSON.parse(e.target.result); if(d.emps){if(confirm("استعادة؟")) {appData=d;save();location.reload();}}}catch(x){alert("خطأ");}}; if(f)r.readAsText(f); }
