 // استيراد أدوات فايربيس
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// إعدادات مشروعك
const firebaseConfig = {
  apiKey: "AIzaSyDZ81FaYxuKmhLPw139xUX_-jlA5tv3ad8",
  authDomain: "salary-system-cloud.firebaseapp.com",
  projectId: "salary-system-cloud",
  storageBucket: "salary-system-cloud.firebasestorage.app",
  messagingSenderId: "692875443470",
  appId: "1:692875443470:web:016ed8c03d9c9f5c0deb5f",
  measurementId: "G-N76ZJNEPEV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const DATA_DOC_ID = "salary_system_v1";

// --- المتغيرات العامة (تم إضافة متغيرات الأمان) ---
let appData = { 
    emps: [], 
    att: {}, 
    pin: "0000", 
    adminPin: "1234", 
    pinEnabled: false,      // جديد: حالة رمز الدخول
    adminEnabled: false,    // جديد: حالة رمز المسؤول
    advances: {}, 
    debts: { in: [], out: [] }, 
    logo: null, 
    companyName: "نظام الرواتب", 
    companyNameFr: "" 
};

let currDate = new Date();
let sel = null;
let currentUser = null; 

window.onload = () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('pinModal').style.display = 'none';
            document.getElementById('contentArea').style.display = 'block';
            startLiveSync(); 
        } else {
            currentUser = null;
            showLoginScreen();
        }
    });
    setupUI();
};

function startLiveSync() {
    onSnapshot(doc(db, "company_data", DATA_DOC_ID), (docSnap) => {
        if (docSnap.exists()) {
            appData = { ...appData, ...docSnap.data() };
            renderCalendar(); 
            applyCompanyIdentity();
            // تحديث حالة الأزرار إذا كانت الإعدادات مفتوحة
            if(document.getElementById('settingsModal').style.display === 'flex') {
                updateSwitchUI();
            }
        } else {
            saveToCloud(); 
        }
    });
}

async function saveToCloud() {
    try { await setDoc(doc(db, "company_data", DATA_DOC_ID), appData); } catch (e) { console.error(e); }
}
window.save = saveToCloud; 

// --- دوال الأمان الجديدة ---
window.toggleSecurity = (type) => {
    // هذه الدالة تربط الأزرار بالبيانات
    if (type === 'pin') {
        appData.pinEnabled = document.getElementById('swPin').checked;
    } else if (type === 'admin') {
        appData.adminEnabled = document.getElementById('swAdmin').checked;
    }
    saveToCloud(); // حفظ التغيير فوراً في السحابة
};

function updateSwitchUI() {
    // دالة لتحديث شكل الأزرار بناء على البيانات المحفوظة
    const swPin = document.getElementById('swPin');
    const swAdmin = document.getElementById('swAdmin');
    if(swPin) swPin.checked = appData.pinEnabled || false;
    if(swAdmin) swAdmin.checked = appData.adminEnabled || false;
}

// --- تحديث دالة فتح الإعدادات ---
window.openSettings = () => {
    document.getElementById('eList').innerHTML = appData.emps.map(e => `<div style="display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #eee"><span>${e.name} (${e.rate})</span><button onclick="if(confirm('حذف؟')){appData.emps=appData.emps.filter(x=>x.id!=${e.id});save();openSettings()}" style="background:red;width:auto;padding:2px 8px;color:white;font-size:0.7rem">حذف</button></div>`).join('');
    
    // استدعاء تحديث الأزرار لضبط حالتها عند الفتح
    updateSwitchUI();
    
    document.getElementById('settingsModal').style.display='flex';
};


// --- باقي الدوال (نفس السابق) ---
function showLoginScreen() {
    document.getElementById('contentArea').style.display = 'none';
    document.getElementById('pinModal').style.display = 'flex';
    document.querySelector('#pinModal .modal-content').innerHTML = `
        <h3 style="color:#0D47A1">تسجيل الدخول السحابي ☁️</h3>
        <input type="email" id="emailInput" placeholder="البريد الإلكتروني" style="width:100%; padding:12px; margin:10px 0; border:1px solid #ccc; border-radius:8px">
        <input type="password" id="passInput" placeholder="كلمة المرور" style="width:100%; padding:12px; margin:10px 0; border:1px solid #ccc; border-radius:8px">
        <button onclick="loginCloud()" class="btn-main" style="margin-top:10px">دخول</button>
        <p id="loginError" style="color:red; font-size:0.9rem; margin-top:10px"></p>
    `;
}

window.loginCloud = () => {
    const email = document.getElementById('emailInput').value;
    const pass = document.getElementById('passInput').value;
    signInWithEmailAndPassword(auth, email, pass).catch((error) => document.getElementById('loginError').innerText = "خطأ في البيانات");
};

function setupUI() { applyCompanyIdentity(); renderCalendar(); }
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
window.requestAdminAccess = (t) => { if(t==='settings') window.openSettings(); };

// يمكنك إضافة باقي دوال الديون هنا (نسخ لصق من الكود السابق إذا كنت تستخدمها)
function getFormattedDate() { return new Date().toLocaleDateString('ar-DZ'); }
function getFormattedTime() { return new Date().toLocaleTimeString('ar-DZ', {hour:'2-digit', minute:'2-digit'}); }
