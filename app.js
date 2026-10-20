// پایگاه داده لوکال
let db = JSON.parse(localStorage.getItem('vijarData')) || { docs: [], notes: {}, role: null, settings: { font: 18 } };
let currentDocId = null;

// المان‌ها
const views = { role: document.getElementById('role-view'), dash: document.getElementById('dashboard-view'), edit: document.getElementById('editor-view') };
const editor = document.getElementById('editor');
const contextMenu = document.getElementById('customContextMenu');
let selectedTextRange = null;

// --- 1. مدیریت نقش‌ها ---
if (db.role) { initApp(); } 
else { showView('role'); }

document.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => {
        db.role = card.dataset.role;
        saveDB();
        initApp();
    });
});

function initApp() {
    showView('dash');
    document.getElementById('userRoleBadge').textContent = db.role === 'teacher' ? 'استاد' : 'دانشجو';
    document.getElementById('editor').style.fontSize = db.settings.font + 'px';
    document.getElementById('fontSizeSlider').value = db.settings.font;
    document.getElementById('fontSizeDisplay').textContent = db.settings.font + 'px';
    renderDashboard();
}

function showView(viewId) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewId].classList.remove('hidden');
    document.getElementById('backToDashBtn').classList.toggle('hidden', viewId !== 'edit');
}

// --- 2. داشبورد و مدیریت فایل ---
function saveDB() { localStorage.setItem('vijarData', JSON.stringify(db)); }

document.getElementById('createNewDocBtn').addEventListener('click', () => {
    currentDocId = Date.now().toString();
    document.getElementById('documentTitle').value = '';
    editor.innerHTML = '';
    showView('edit');
    renderPinnedNotes();
});

document.getElementById('backToDashBtn').addEventListener('click', () => { showView('dash'); renderDashboard(); });

function renderDashboard() {
    const grid = document.getElementById('documentsGrid');
    grid.innerHTML = '';
    db.docs.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'doc-card';
        card.innerHTML = `
            <h3><i class="fa-solid fa-file-signature" style="color: var(--accent-gold)"></i> ${doc.title || 'جزوه بدون نام'}</h3>
            <p><i class="fa-regular fa-clock"></i> آخرین تغییر: ${new Date(doc.id * 1).toLocaleDateString('fa-IR')}</p>
        `;
        card.onclick = () => loadDocument(doc.id);
        grid.appendChild(card);
    });
}

function loadDocument(id) {
    const doc = db.docs.find(d => d.id === id);
    if(doc) {
        currentDocId = doc.id;
        document.getElementById('documentTitle').value = doc.title;
        editor.innerHTML = doc.content;
        showView('edit');
        renderPinnedNotes();
    }
}

document.getElementById('saveDocBtn').addEventListener('click', () => {
    if(!currentDocId) return;
    const docData = { id: currentDocId, title: document.getElementById('documentTitle').value, content: editor.innerHTML };
    const idx = db.docs.findIndex(d => d.id === currentDocId);
    idx > -1 ? db.docs[idx] = docData : db.docs.push(docData);
    saveDB();
    
    // افکت ذخیره
    const btn = document.getElementById('saveDocBtn');
    btn.style.background = 'var(--accent-green)';
    setTimeout(() => btn.style.background = '', 1000);
});

// --- 3. منوی راست‌کلیک سفارشی روی متن انتخاب شده ---
editor.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const selection = window.getSelection();
    if(selection.toString().trim().length > 0) {
        // ذخیره محدوده متن انتخاب شده
        selectedTextRange = selection.getRangeAt(0);
        
        // نمایش منو در محل موس
        contextMenu.style.left = e.clientX + 'px';
        contextMenu.style.top = e.clientY + 'px';
        contextMenu.classList.remove('hidden');
    }
});

// مخفی کردن منو با کلیک در جای دیگر
document.addEventListener('click', () => contextMenu.classList.add('hidden'));

// عملیات راست‌کلیک
document.getElementById('menuBold').addEventListener('click', () => {
    restoreSelection();
    document.execCommand('bold');
});

document.getElementById('menuColor').addEventListener('click', () => {
    restoreSelection();
    document.getElementById('textColorPicker').click();
});

document.getElementById('textColorPicker').addEventListener('input', (e) => {
    document.execCommand('foreColor', false, e.target.value);
});

function restoreSelection() {
    if(selectedTextRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(selectedTextRange);
    }
}

// --- 4. برچسب‌گذاری (یادداشت‌ها) ---
const noteModal = document.getElementById('noteModal');
let currentWordId = null;
let selectedLabelColor = 'blue';

document.getElementById('menuHighlight').addEventListener('click', () => {
    restoreSelection();
    const text = window.getSelection().toString().trim();
    
    currentWordId = 'word_' + Date.now();
    const span = document.createElement('span');
    span.id = currentWordId;
    span.className = `hl-word hl-${selectedLabelColor}`;
    span.textContent = text;
    
    document.execCommand('insertHTML', false, span.outerHTML);
    
    // باز کردن مودال برای نوشتن توضیح
    document.getElementById('selectedWordDisplay').textContent = text;
    document.getElementById('noteInput').value = '';
    noteModal.classList.add('show');
});

// انتخاب رنگ برچسب در مودال
document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        e.target.classList.add('active');
        selectedLabelColor = e.target.dataset.color;
    });
});

document.getElementById('saveNoteBtn').addEventListener('click', () => {
    const text = document.getElementById('noteInput').value.trim();
    if(text && currentWordId) {
        const wordEl = document.getElementById(currentWordId);
        // آپدیت رنگ برچسب در متن
        wordEl.className = `hl-word hl-${selectedLabelColor}`;
        
        db.notes[currentWordId] = {
            word: wordEl.textContent,
            text: text,
            color: selectedLabelColor,
            isPinned: document.getElementById('pinNoteCheck').checked
        };
        saveDB();
        renderPinnedNotes();
    }
    noteModal.classList.remove('show');
});

function renderPinnedNotes() {
    const area = document.getElementById('pinnedNotesArea');
    area.innerHTML = '';
    Object.values(db.notes).forEach(note => {
        if(note.isPinned) {
            area.innerHTML += `
                <div class="note-item" style="border-right-color: var(--accent-${note.color})">
                    <strong style="color:var(--accent-gold)">${note.word}:</strong>
                    <p style="margin-top:5px; font-size:0.9rem">${note.text}</p>
                </div>`;
        }
    });
}

// --- 5. وایت‌برد ---
const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
let drawing = false;

canvas.addEventListener('mousedown', () => drawing = true);
canvas.addEventListener('mouseup', () => { drawing = false; ctx.beginPath(); });
canvas.addEventListener('mousemove', draw);

function draw(e) {
    if(!drawing) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = document.getElementById('boardColor').value;
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}
document.getElementById('clearBoardBtn').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// --- 6. تنظیمات گسترده ---
document.getElementById('settingsBtn').onclick = () => document.getElementById('settingsModal').classList.add('show');
document.querySelectorAll('.close-modal').forEach(btn => btn.onclick = () => {
    document.getElementById('settingsModal').classList.remove('show');
    noteModal.classList.remove('show');
});

// تغییر فونت
const fontSlider = document.getElementById('fontSizeSlider');
fontSlider.addEventListener('input', (e) => {
    const size = e.target.value;
    document.getElementById('fontSizeDisplay').textContent = size + 'px';
    editor.style.fontSize = size + 'px';
    db.settings.font = size;
    saveDB();
});

// ریست نقش
document.getElementById('resetRoleBtn').onclick = () => {
    db.role = null; saveDB(); document.getElementById('settingsModal').classList.remove('show'); showView('role');
};

// حذف دیتا
document.getElementById('clearDataBtn').onclick = () => {
    if(confirm('آیا مطمئن هستید؟ تمام جزوه‌ها پاک خواهند شد.')) {
        db = { docs: [], notes: {}, role: db.role, settings: db.settings };
        saveDB(); renderDashboard(); document.getElementById('settingsModal').classList.remove('show');
    }
};

// ابزارهای نوار پایین
document.querySelectorAll('.tool-btn[data-command]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        document.execCommand(btn.dataset.command, false, null);
    });
});
