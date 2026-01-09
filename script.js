 // استيراد أدوات فايربيس من الإنترنت مباشرة (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- إعدادات مشروعك الخاصة (تم دمجها هنا) ---
const firebaseConfig = {
  apiKey: "AIzaSyDZ81FaYxuKmhLPw139xUX_-jlA5tv3ad8",
  authDomain: "salary-system-cloud.firebaseapp.com",
  projectId: "salary-system-cloud",
  storageBucket: "salary-system-cloud.firebasestorage.app",
  messagingSenderId: "692875443470",
  appId: "1:692875443470:web:016ed8c03d9c9f5c0deb5f",
  measurementId: "G-N76ZJNEPEV"
};

// --- تهيئة الاتصال بالسحابة ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const DATA_DOC_ID = "salary_system_v1"; // اسم الملف الموحد في السحابة

// --- المتغيرات العامة ---
let appData = { emps: [], att: {}, pin: "0000", adminPin: "1234", advances: {}, debts: { in: [], out: [] }, logo: null, companyName: "نظام الرواتب", companyNameFr: "" };
let currDate = new Date();
let sel = null;
let currentUser = null; 

// --- عند تشغيل التطبيق ---
window.onload = () => {
    // مراقبة حالة تسجيل الدخول
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('pinModal').style.display = 'none';
            document.getElementById('contentArea').style.display = 'block';
            startLiveSync(); // بدء جلب البيانات الحية
        } else {
            currentUser = null;
            showLoginScreen(); // إظهار شاشة الدخول
        }
    });
    
    setupUI();
};

// --- المزامنة الحية (قلب النظام الجديد) ---
function startLiveSync() {
    // الاستماع لأي تغيير في قاعدة البيانات فوراً
    onSnapshot(doc(db, "company_data", DATA_DOC_ID), (docSnap) => {
        if (docSnap.exists()) {
            // جاءت بيانات جديدة! تحديث التطبيق فوراً
            appData = { ...appData, ...docSnap.data() };
            renderCalendar(); 
            applyCompanyIdentity();
            console.log("تم تحديث البيانات من السحابة ☁️");
        } else {
            // لا توجد بيانات بعد (أول مرة)، نقوم بإنشائها
            saveToCloud(); 
        }
    });
}

// --- الحفظ في السحابة ---
async function saveToCloud() {
    try {
        await setDoc(doc(db, "company_data", DATA_DOC_ID), appData);
    } catch (e) {
        alert("خطأ في الحفظ: " + e.message);
    }
}
// استبدال دالة الحفظ القديمة
window.save = saveToCloud; 

// --- شاشة تسجيل الدخول ---
function showLoginScreen() {
    document.getElementById('contentArea').style.display = 'none';
    document.getElementById('pinModal').style.display = 'flex';
    const content = document.querySelector('#pinModal .modal-content');
    content.innerHTML = `
        <h3 style="color:#0D47A1">تسجيل الدخول السحابي ☁️</h3>
        <input type="email" id="emailInput" placeholder="البريد الإلكتروني" style="width:100%; padding:12px; margin:10px 0; border:1px solid #ccc; border-radius:8px">
        <input type="password" id="passInput" placeholder="كلمة المرور" style="width:100%; padding:12px; margin:10px 0; border:1px solid #ccc; border-radius:8px">
        <button onclick="loginCloud()" class="btn-main" style="margin-top:10px">دخول</button>
        <p id="loginError" style="color:red; font-size:0.9rem; margin-top:10px"></p>
    `;
}

// دالة الدخول
window.loginCloud = () => {
    const email = document.getElementById('emailInput').value;
    const pass = document.getElementById('passInput').value;
    const errBox = document.getElementById('loginError');
    
    errBox.innerText = "جاري الاتصال...";
    
    signInWithEmailAndPassword(auth, email, pass)
        .then(() => {
            errBox.innerText = "";
        })
        .catch((error) => {
            let msg = "خطأ في الدخول";
            if(error.code === 'auth/invalid-email') msg = "البريد غير صحيح";
            if(error.code === 'auth/invalid-credential') msg = "البيانات خاطئة";
            errBox.innerText = msg;
        });
};

// --- دوال الواجهة والمنطق (تحديث الدوال لتكون عامة) ---

function setupUI() {
    applyCompanyIdentity();
    renderCalendar();
}

function applyCompanyIdentity() {
    if(appData.companyName) document.getElementById('dispNameAr').innerText = appData.companyName;
    document.getElementById('dispNameFr').innerText = appData.companyNameFr || "";
    if(appData.logo) document.getElementById('displayLogo').src = appData.logo;
    if(appData.logo) document.getElementById('displayLogo').style.display = 'block';
}

window.changeMonth = (n) => { currDate.setMonth(currDate.getMonth() + n); renderCalendar(); };
window.setNow = (id) => { let n = new Date(); document.getElementById(id).value = n.getHours().toString().padStart(2,'0') + ":" + n.getMinutes().toString().padStart(2,'0'); };

window.renderCalendar = () => {
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
};

window.clickCell = (eid, d, key) => {
    sel = { e: appData.emps.find(x=>x.id==eid), key: key };
    if(appData.att[key]) openAdminEdit(appData.att[key]); 
    else {
        document.getElementById('attEmpName').innerText = sel.e.name;
        document.getElementById('currentRateInput').value = sel.e.rate;
        document.getElementById('boxIn').style.display='block'; document.getElementById('boxOut').style.display='none';
        document.getElementById('attModal').style.display='flex';
    }
};

window.saveAtt = (type) => {
    if(type === 'in') { appData.att[sel.key] = { tIn: document.getElementById('tIn').value, rate: sel.e.rate }; }
    else if(type === 'out') { let d = appData.att[sel.key], o = document.getElementById('tOut').value; d.tOut = o; d.mTotal = calculateMinutes(d.tIn, o); }
    else if(type === 'absent') { appData.att[sel.key] = { abs: true }; }
    else if(type === 'deleteAdmin') { delete appData.att[sel.key]; }
    document.getElementById('attModal').style.display='none';
    document.getElementById('adminEditModal').style.display='none';
    saveToCloud(); 
};

window.addE = () => { let n=document.getElementById('newE').value, r=document.getElementById('newR').value; if(n&&r){appData.emps.push({id:Date.now(), name:n, rate:parseFloat(r)}); saveToCloud(); openSettings();} };

function calculateMinutes(tIn, tOut) {
    let [h1, m1] = tIn.split(':').map(Number);
    let [h2, m2] = tOut.split(':').map(Number);
    let sMin = h1*60 + m1, eMin = h2*60 + m2;
    return (eMin < sMin) ? (1440 - sMin) + eMin : eMin - sMin;
}

window.closeM = (id) => document.getElementById(id).style.display = 'none';
window.openSettings = () => {
    document.getElementById('eList').innerHTML = appData.emps.map(e => `<div style="display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #eee"><span>${e.name} (${e.rate})</span><button onclick="if(confirm('حذف؟')){appData.emps=appData.emps.filter(x=>x.id!=${e.id});save();openSettings()}" style="background:red;width:auto;padding:2px 8px;color:white;font-size:0.7rem">حذف</button></div>`).join('');
    document.getElementById('settingsModal').style.display='flex';
};
window.requestAdminAccess = (t) => { if(t==='settings') window.openSettings(); };

// دوال مساعدة لضمان عمل الديون والتسبيقات (إعادة تعريفها لتكون Global)
window.openAdvances = () => {
    const area = document.getElementById('advListArea'), mk = `${currDate.getFullYear()}-${currDate.getMonth()}`;
    if(!appData.advances[mk]) appData.advances[mk] = {};
    area.innerHTML = appData.emps.map(e => {
        let list = appData.advances[mk][e.id] || [];
        return `<div style="border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:8px"><b>${e.name}</b>
            <div class="row-now"><input type="number" id="adv_${e.id}" placeholder="المبلغ"><button onclick="addAdv('${e.id}')" style="width:auto; background:var(--success); color:white">+</button></div>
            ${list.map((x,i) => `<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #eee;padding:4px"><span>${x.val} دج</span><span onclick="delAdv('${e.id}',${i})" style="color:red;cursor:pointer">✖</span></div>`).join('')}</div>`;
    }).join('');
    document.getElementById('advancesModal').style.display='flex';
};
window.addAdv = (id) => { let v = parseFloat(document.getElementById('adv_'+id).value), mk = `${currDate.getFullYear()}-${currDate.getMonth()}`; if(v) { if(!appData.advances[mk][id]) appData.advances[mk][id] = []; appData.advances[mk][id].push({ val: v, date: getFormattedDate() }); saveToCloud(); window.openAdvances(); } };
window.delAdv = (id, idx) => { appData.advances[`${currDate.getFullYear()}-${currDate.getMonth()}`][id].splice(idx,1); saveToCloud(); window.openAdvances(); };

// دوال الديون
window.openDebts = () => { renderDebts(); updateNameSuggestions(); document.getElementById('debtsModal').style.display='flex'; showDebtTab('in'); };
window.showDebtTab = (type) => {
    ['in','out'].forEach(t => document.getElementById('debtSection'+(t==='in'?'In':'Out')).style.display = t===type?'block':'none');
    document.getElementById('btnTabIn').style.background = type === 'in' ? '#2E7D32' : '#eee'; document.getElementById('btnTabIn').style.color = type === 'in' ? '#fff' : '#333';
    document.getElementById('btnTabOut').style.background = type === 'out' ? '#C62828' : '#eee'; document.getElementById('btnTabOut').style.color = type === 'out' ? '#fff' : '#333';
    document.getElementById('delType').value = type; populateDelClients();
};
window.renderDebts = () => { renderGroupedList('in', 'debtInList', 'totalIn'); renderGroupedList('out', 'debtOutList', 'totalOut'); };
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
window.addDebt = (type) => {
    let nEl = document.getElementById(type=='in'?'debtInName':'debtOutName'), vEl = document.getElementById(type=='in'?'debtInVal':'debtOutVal'), val = parseFloat(vEl.value);
    if(nEl.value && val) { appData.debts[type].push({ name: nEl.value, originalVal: val, val: val, date: getFormattedDate(), time: getFormattedTime(), status: 'active', history: [{type:'init', val: val, date: getFormattedDate(), time: getFormattedTime()}] }); vEl.value = ""; saveToCloud(); window.renderDebts(); updateNameSuggestions(); if(document.getElementById('delType').value === type) populateDelClients(); }
};
window.settleDebt = (type, idx) => {
    let d = appData.debts[type][idx], pay = prompt(`المبلغ (المتبقي: ${d.val}):`);
    if(pay && parseFloat(pay) > 0) { let v=parseFloat(pay); d.val -= v; if(d.val <= 0) {d.val=0; d.status='paid';} d.history.push({type:'pay', val:v, date:getFormattedDate(), time:getFormattedTime()}); saveToCloud(); window.renderDebts(); }
};
window.editDebtValue = (type, idx) => {
    let d = appData.debts[type][idx], nw = prompt("تعديل الباقي:", d.val);
    if(nw !== null && !isNaN(parseFloat(nw))) { let v=parseFloat(nw); d.val = v; d.status = v===0?'paid':'active'; d.history.push({type:'edit', val:v, date:getFormattedDate(), time:getFormattedTime()}); saveToCloud(); window.renderDebts(); }
};
window.updateNameSuggestions = () => {
    let s = new Set(appData.emps.map(e=>e.name)); appData.debts.in.forEach(d=>s.add(d.name)); appData.debts.out.forEach(d=>s.add(d.name));
    document.getElementById('namesList').innerHTML = Array.from(s).map(n => `<option value="${n}">`).join('');
};
window.openHistory = (type, idx) => {
    let d = appData.debts[type][idx];
    document.getElementById('histTitle').innerText = `سجل: ${d.name}`; document.getElementById('histRemaining').innerText = d.val;
    document.getElementById('historyList').innerHTML = [...d.history].reverse().map(h => `<li style="padding:10px;border-bottom:1px solid #eee;display:flex;justify-content:space-between"><span><b>${h.type=='init'?'دين':(h.type=='pay'?'تسديد':'تعديل')}</b><br><span style="color:#888;font-size:0.8rem">${h.date} ${h.time}</span></span><b style="font-size:1.1rem">${h.type=='init'?'+':(h.type=='pay'?'-':'=')}${h.val}</b></li>`).join('');
    document.getElementById('historyModal').style.display='flex';
};
window.populateDelClients = () => {
    let type = document.getElementById('delType').value, names = [...new Set(appData.debts[type].map(d => d.name))];
    let select = document.getElementById('delClientSelect');
    select.innerHTML = '<option value="">-- اختر من القائمة --</option>';
    names.forEach(n => select.innerHTML += `<option value="${n}">${n}</option>`);
    document.getElementById('delRecordContainer').innerHTML = '';
    window.updateSelectBtnUI(false);
};
window.updateDelRecords = () => {
    let type = document.getElementById('delType').value, client = document.getElementById('delClientSelect').value;
    document.getElementById('delRecordContainer').innerHTML = appData.debts[type].map((d,i) => d.name===client ? `<div class="del-item-row"><input type="checkbox" class="del-cb" value="${i}"><span style="font-size:0.85rem;margin-right:8px">${d.val} دج (${d.date}) ${d.status=='paid'?'✅':''}</span></div>` : '').join('');
    window.updateSelectBtnUI(false);
};
window.toggleSelectAll = () => {
    let cbs = document.querySelectorAll('.del-cb');
    if(cbs.length === 0) return;
    let newState = !Array.from(cbs).every(c => c.checked);
    cbs.forEach(c => c.checked = newState);
    window.updateSelectBtnUI(newState);
};
window.updateSelectBtnUI = (isAllSelected) => {
    let btn = document.getElementById('btnSelectAll');
    if(isAllSelected) { btn.innerHTML = "إلغاء التحديد ✖"; btn.style.background = "#78909C"; }
    else { btn.innerHTML = "تحديد الكل ✔"; btn.style.background = "var(--primary-grad)"; }
};
window.executeDelete = () => {
    let type = document.getElementById('delType').value, checks = document.querySelectorAll('.del-cb:checked');
    if(checks.length && confirm(`حذف ${checks.length} سجلات؟`)) {
        let idxs = Array.from(checks).map(c=>parseInt(c.value)).sort((a,b)=>b-a);
        idxs.forEach(i => appData.debts[type].splice(i,1));
        saveToCloud(); window.renderDebts(); window.populateDelClients();
    }
};

window.sendSelectedReport = () => {
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
};
window.printReport = () => {
    let mk = `${currDate.getFullYear()}-${currDate.getMonth()}`, mName = document.getElementById('monthLabel').innerText, days = new Date(currDate.getFullYear(), currDate.getMonth()+1, 0).getDate();
    let html = `<html><head><style>body{font-family:Arial,sans-serif;direction:rtl}table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:8px;text-align:center}</style></head><body><h2 style="text-align:center">${appData.companyName || "نظام الرواتب"} - ${mName}</h2><table><thead><tr><th>العامل</th><th>مستحق</th><th>تسبيقات</th><th>صافي</th></tr></thead><tbody>` + 
    appData.emps.map(e => {
        let tot = 0;
        for(let d=1; d<=days; d++) { let k=`${currDate.getFullYear()}-${currDate.getMonth()}-${d}-${e.id}`; if(appData.att[k]&&appData.att[k].mTotal) tot += (appData.att[k].mTotal/480)*(appData.att[k].rate||e.rate); }
        let adv = (appData.advances[mk]&&appData.advances[mk][e.id]) ? appData.advances[mk][e.id].reduce((s,i)=>s+i.val,0) : 0;
        return `<tr><td>${e.name}</td><td>${Math.round(tot)}</td><td>${adv}</td><td><b>${Math.round(tot-adv)}</b></td></tr>`;
    }).join('') + `</tbody></table></body></html>`;
    let w = window.open('','_blank'); w.document.write(html); w.document.close(); w.print();
};

function confirmAdminEdit() { 
    let i = document.getElementById('editIn').value, o = document.getElementById('editOut').value; 
    appData.att[sel.key] = { tIn: i, tOut: o, mTotal: calculateMinutes(i, o), rate: sel.e.rate }; 
    document.getElementById('adminEditModal').style.display='none';
    saveToCloud(); renderCalendar(); 
}
window.confirmAdminEdit = confirmAdminEdit;
window.openAdminEdit = (d) => { document.getElementById('editIn').value = d.tIn || "08:00"; document.getElementById('editOut').value = d.tOut || "16:00"; document.getElementById('adminEditModal').style.display='flex'; };

function setNow(id) { let n = new Date(); document.getElementById(id).value = n.getHours().toString().padStart(2,'0') + ":" + n.getMinutes().toString().padStart(2,'0'); }
function getFormattedDate() { return new Date().toLocaleDateString('ar-DZ'); }
function getFormattedTime() { return new Date().toLocaleTimeString('ar-DZ', {hour:'2-digit', minute:'2-digit'}); }
