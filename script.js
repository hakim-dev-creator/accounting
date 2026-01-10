 import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

let appData = { emps: [], att: {}, debts: { in: [], out: [] }, settings: {} };
let currDate = new Date();
let sel = null;
let currentDebtTab = 'in';

// --- البدء ---
window.onload = () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('contentArea').style.display = 'flex';
            startSync();
        } else {
            // تسجيل دخول تلقائي (للتبسيط)
             signInWithEmailAndPassword(auth, "admin@salary.com", "123456").catch(e=>alert("خطأ دخول: "+e.message));
        }
    });
    renderCalendar();
};

function startSync() {
    onSnapshot(doc(db, "company_data", DATA_DOC_ID), (snap) => {
        if (snap.exists()) {
            appData = { ...appData, ...snap.data() };
            renderCalendar();
            if(document.getElementById('debtsModal').style.display === 'flex') refreshDebtUI();
            if(document.getElementById('settingsModal').style.display === 'flex') renderWorkers();
        } else saveToCloud();
    });
}

async function saveToCloud() {
    try { await setDoc(doc(db, "company_data", DATA_DOC_ID), appData); } catch(e) { console.error(e); }
}

// --- التقويم ---
window.renderCalendar = () => {
    const grid = document.getElementById('calendarGrid');
    const days = new Date(currDate.getFullYear(), currDate.getMonth()+1, 0).getDate();
    document.getElementById('monthLabel').innerText = `${currDate.getMonth()+1} - ${currDate.getFullYear()}`;
    
    grid.style.gridTemplateColumns = `120px repeat(${days}, 50px)`;
    grid.innerHTML = '<div></div>';
    for(let d=1; d<=days; d++) grid.innerHTML += `<div style="background:#f5f5f5;font-weight:bold">${d}</div>`;
    
    appData.emps.forEach(e => {
        grid.innerHTML += `<div class="emp-name">${e.name}</div>`;
        for(let d=1; d<=days; d++) {
            let key = `${currDate.getFullYear()}-${currDate.getMonth()}-${d}-${e.id}`;
            let data = appData.att[key];
            let cls = '', txt = '-';
            if(data) {
                if(data.status === 'present') { cls='st-present'; txt='P'; }
                else if(data.status === 'absent') { cls='st-absent'; txt='A'; }
            }
            grid.innerHTML += `<div class="${cls}" onclick="openAtt('${e.id}', ${d}, '${key}')">${txt}</div>`;
        }
    });
};

window.changeMonth = (n) => { currDate.setMonth(currDate.getMonth()+n); renderCalendar(); };

// --- الحضور (نافذة الصورة 25218) ---
window.openAtt = (eid, d, key) => {
    sel = { e: appData.emps.find(x=>x.id==eid), key: key };
    document.getElementById('attEmpName').innerText = sel.e.name;
    document.getElementById('currentRateInput').value = sel.e.rate;
    
    // تعيين الوقت الحالي تلقائياً
    let now = new Date();
    document.getElementById('tIn').value = now.getHours().toString().padStart(2,'0') + ":" + now.getMinutes().toString().padStart(2,'0');
    
    document.getElementById('attModal').style.display = 'flex';
};

window.setNow = () => {
    let now = new Date();
    document.getElementById('tIn').value = now.getHours().toString().padStart(2,'0') + ":" + now.getMinutes().toString().padStart(2,'0');
};

window.saveAtt = (status) => {
    let t = document.getElementById('tIn').value;
    appData.att[sel.key] = { status: status, time: t, rate: sel.e.rate };
    saveToCloud();
    closeModal('attModal');
};

// --- الديون (نافذة الصورة 25219) ---
window.openDebts = () => {
    document.getElementById('debtsModal').style.display = 'flex';
    switchDebtTab('in');
    updateNamesList();
};

window.switchDebtTab = (tab) => {
    currentDebtTab = tab;
    // تحديث الألوان
    document.getElementById('tabIn').className = tab==='in'?'tab-btn tab-active-in':'tab-btn tab-inactive';
    document.getElementById('tabOut').className = tab==='out'?'tab-btn tab-active-out':'tab-btn tab-inactive';
    document.getElementById('btnAddDebt').className = tab==='in'?'btn-action btn-green':'btn-action btn-red';
    
    // تحديث القوائم في قسم الحذف
    document.getElementById('delTypeSelect').value = tab;
    
    refreshDebtUI();
};

function refreshDebtUI() {
    let list = appData.debts[currentDebtTab];
    let html = '', total = 0;
    
    // تجميع الديون حسب الاسم
    let groups = {};
    list.forEach(d => {
        if(!groups[d.name]) groups[d.name] = 0;
        groups[d.name] += parseFloat(d.val);
        total += parseFloat(d.val);
    });

    for(let name in groups) {
        html += `<div class="debt-list-item">
            <span style="font-weight:bold;font-size:1.1rem">👤 ${name}</span>
            <span style="background:#eee;padding:5px 10px;border-radius:20px;font-weight:bold">${groups[name]}</span>
        </div>`;
    }
    
    document.getElementById('debtListArea').innerHTML = html;
    document.getElementById('debtTotal').innerText = total + " دج";
    
    refreshDelList(); // تحديث قائمة الحذف أيضاً
}

window.addDebt = () => {
    let name = document.getElementById('debtName').value;
    let val = parseFloat(document.getElementById('debtVal').value);
    if(name && val) {
        appData.debts[currentDebtTab].push({ name: name, val: val, date: new Date().toLocaleDateString() });
        document.getElementById('debtName').value = "";
        document.getElementById('debtVal').value = "";
        saveToCloud();
        refreshDebtUI();
        updateNamesList();
    }
};

// --- مدير الحذف (الصورة 25220) ---
window.refreshDelList = () => {
    let type = document.getElementById('delTypeSelect').value;
    let client = document.getElementById('delClientSelect').value;
    let list = appData.debts[type];
    
    // ملء قائمة العملاء
    let clients = [...new Set(list.map(d=>d.name))];
    let selHtml = '<option value="">-- الكل --</option>';
    clients.forEach(c => selHtml += `<option value="${c}">${c}</option>`);
    if(document.getElementById('delClientSelect').innerHTML === "") document.getElementById('delClientSelect').innerHTML = selHtml;

    // ملء قائمة "التيك بوكس"
    let html = '';
    list.forEach((d, i) => {
        if(!client || d.name === client) {
            html += `<div style="padding:5px;border-bottom:1px solid #eee">
                <input type="checkbox" class="del-chk" value="${i}"> ${d.name} (${d.val}) - ${d.date}
            </div>`;
        }
    });
    document.getElementById('delCheckList').innerHTML = html;
};

window.deleteSelectedDebts = () => {
    let type = document.getElementById('delTypeSelect').value;
    let chks = document.querySelectorAll('.del-chk:checked');
    if(chks.length > 0 && confirm("حذف المحدد؟")) {
        let indices = Array.from(chks).map(c => parseInt(c.value)).sort((a,b)=>b-a);
        indices.forEach(i => appData.debts[type].splice(i, 1));
        saveToCloud();
        refreshDebtUI();
    }
};

window.selectAllDebts = () => {
    document.querySelectorAll('.del-chk').forEach(c => c.checked = true);
};

// --- العمال والإعدادات ---
window.openSettings = () => {
    document.getElementById('settingsModal').style.display = 'flex';
    renderWorkers();
};

window.addWorker = () => {
    let n = document.getElementById('newE').value;
    let r = document.getElementById('newR').value;
    if(n) {
        appData.emps.push({ id: Date.now(), name: n, rate: r });
        saveToCloud();
        renderWorkers();
    }
};

function renderWorkers() {
    let html = '';
    appData.emps.forEach(e => {
        html += `<div style="display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #eee">
            <b>${e.name}</b>
            <button onclick="delWorker(${e.id})" style="background:#ffcdd2;color:#d32f2f;border:none;border-radius:5px;padding:5px 10px">حذف</button>
        </div>`;
    });
    document.getElementById('workersList').innerHTML = html;
}

window.delWorker = (id) => {
    if(confirm("حذف؟")) {
        appData.emps = appData.emps.filter(e => e.id !== id);
        saveToCloud();
        renderWorkers();
    }
};

// --- أدوات ---
function updateNamesList() {
    let names = new Set(appData.emps.map(e=>e.name));
    let html = '';
    names.forEach(n => html += `<option value="${n}">`);
    document.getElementById('namesList').innerHTML = html;
}

window.closeModal = (id) => document.getElementById(id).style.display = 'none';
