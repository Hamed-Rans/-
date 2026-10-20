// پایگاه داده لوکال
let db = JSON.parse(localStorage.getItem('vijarDataV2')) || { docs: [], notes: {}, role: null, settings: { fontSize: 16 } };
let currentDocId = null;
let currentFolder = 'all';

// المان‌ها
const views = { role: document.getElementById('role-view'), dash: document.getElementById('dashboard-view'), edit: document.getElementById('editor-view') };
const editor = document.getElementById('editor');
const contextMenu = document.getElementById('customContextMenu');
const emptyState = document.getElementById('emptyState');
const documentsGrid = document.getElementById('documentsGrid');
let selectedTextRange = null;

// --- 1. مدیریت نقش و رندر اولیه ---
if (db.role) { initApp(); } 

document.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => {
        db.role = card.dataset.role;
        localStorage.setItem('vijarDataV2', JSON.stringify(db));
        initApp();
    });
});

function initApp() {
    showView('dash');
    document.getElementById('userRoleBadge').textContent = db.role === 'teacher' ? 'استاد' : 'دانشجو';
    document.body.style.fontSize = db.settings.fontSize + 'px';
    document.getElementById('fontSizeSlider').value = db.settings.fontSize;
    renderDashboard();
}

function showView(viewId) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewId].classList.remove('hidden');
    document.getElementById('backToDashBtn').classList.toggle('hidden', viewId !== 'edit');
}

// --- 2. مدیریت فولدرها و داشبورد ---
// کلیک روی فولدرها در سمت راست
document.querySelectorAll('#folderList li').forEach(li => {
    li.addEventListener('click', (e) => {
        document.querySelectorAll('#folderList li').forEach(el => el.classList.remove('active-folder'));
        e.currentTarget.classList.add('active-folder');
        currentFolder = e.currentTarget.dataset.folder;
        renderDashboard(); // فیلتر کردن جزوه‌ها بر اساس فولدر
    });
});

document.getElementById('createNewDocBtn').addEventListener('click', createNewDoc);
document.getElementById('emptyCreateBtn').addEventListener('click', createNewDoc);

function createNewDoc() {
    currentDocId = Date.now().toString();
    document.getElementById('documentTitle').value = '';
    editor.innerHTML = '';
    editor.style.fontFamily = "'Vazirmatn', sans-serif"; // فونت پیش‌فرض
    document.getElementById('docFontSelect').value = "'Vazirmatn', sans-serif";
    showView('edit');
    renderPinnedNotes();
}

document.getElementById('backToDashBtn').addEventListener('click', () => { showView('dash'); renderDashboard(); });

function renderDashboard() {
    documentsGrid.innerHTML = '';
    
    // در این نسخه ساده، فعلاً همه رو نشون میدیم مگر اینکه فیلتر خاصی ذخیره کرده باشیم
    const docsToShow = db.docs; // اگر خواستی قابلیت فیلتر رو اضافه کنی اینجا مینویسی
    
    if(docsToShow.length === 0) {
        emptyState.classList.remove('hidden');
        documentsGrid.style.display = 'none';
    } else {
        emptyState.classList.add('hidden');
        documentsGrid.style.display = 'grid';
        
        docsToShow.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'doc-card';
            card.innerHTML = `
                <h3><i class="fa-solid fa-file-lines" style="color: var(--neon-purple); margin-left:8px;"></i> ${doc.title || 'جزوه بدون نام'}</h3>
                <p><i class="fa-regular fa-clock"></i> ویرایش: ${new Date(doc.id * 1).toLocaleDateString('fa-IR')}</p>
            `;
            card.onclick = () => loadDocument(doc.id);
            documentsGrid.appendChild(card);
        });
    }
}

function loadDocument(id) {
    const doc = db.docs.find(d => d.id === id);
    if(doc) {
        currentDocId = doc.id;
        document.getElementById('documentTitle').value = doc.title;
        editor.innerHTML = doc.content;
        editor.style.fontFamily = doc.font || "'Vazirmatn', sans-serif";
        document.getElementById('docFontSelect').value = doc.font || "'Vazirmatn', sans-serif";
        showView('edit');
        renderPinnedNotes();
    }
}

document.getElementById('saveDocBtn').addEventListener('click', () => {
    if(!currentDocId) return;
    const docData = { 
        id: currentDocId, 
        title: document.getElementById('documentTitle').value, 
        content: editor.innerHTML,
        font: document.getElementById('docFontSelect').value
    };
    const idx = db.docs.findIndex(d => d.id === currentDocId);
    idx > -1 ? db.docs[idx] = docData : db.docs.push(docData);
    localStorage.setItem('vijarDataV2', JSON.stringify(db));
    
    const icon = document.querySelector('#saveDocBtn i');
    icon.className = 'fa-solid fa-check';
    setTimeout(() => icon.className = 'fa-solid fa-floppy-disk', 1000);
});

// --- 3. فونت جزوه و ابزارهای نگارشی ---
document.getElementById('docFontSelect').addEventListener('change', (e) => {
    editor.style.fontFamily = e.target.value;
});

document.querySelectorAll('.tool-btn[data-command]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        document.execCommand(btn.dataset.command, false, null);
    });
});

document.getElementById('textColorPicker').addEventListener('input', (e) => {
    document.execCommand('foreColor', false, e.target.value);
});

// --- 4. منوی راست‌کلیک ---
editor.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const selection = window.getSelection();
    if(selection.toString().trim().length > 0) {
        selectedTextRange = selection.getRangeAt(0);
        contextMenu.style.left = e.clientX + 'px';
        contextMenu.style.top = e.clientY + 'px';
        contextMenu.classList.remove('hidden');
    }
});
document.addEventListener('click', () => contextMenu.classList.add('hidden'));

document.getElementById('menuBold').addEventListener('click', () => {
    if(selectedTextRange) { window.getSelection().removeAllRanges(); window.getSelection().addRange(selectedTextRange); }
    document.execCommand('bold');
});

// --- 5. برچسب‌گذاری (یادداشت‌ها) ---
const noteModal = document.getElementById('noteModal');
let currentWordId = null;
let selectedLabelColor = 'blue';

document.getElementById('menuHighlight').addEventListener('click', () => {
    if(selectedTextRange) { window.getSelection().removeAllRanges(); window.getSelection().addRange(selectedTextRange); }
    const text = window.getSelection().toString().trim();
    
    currentWordId = 'word_' + Date.now();
    const span = document.createElement('span');
    span.id = currentWordId;
    span.className = `hl-word hl-${selectedLabelColor}`;
    span.textContent = text;
    document.execCommand('insertHTML', false, span.outerHTML);
    
    document.getElementById('selectedWordDisplay').textContent = text;
    document.getElementById('noteInput').value = '';
    noteModal.classList.add('show');
});

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
        wordEl.className = `hl-word hl-${selectedLabelColor}`;
        db.notes[currentWordId] = { word: wordEl.textContent, text: text, color: selectedLabelColor, isPinned: document.getElementById('pinNoteCheck').checked };
        localStorage.setItem('vijarDataV2', JSON.stringify(db));
        renderPinnedNotes();
    }
    noteModal.classList.remove('show');
});

function renderPinnedNotes() {
    const area = document.getElementById('pinnedNotesArea');
    area.innerHTML = '';
    Object.values(db.notes).forEach(note => {
        if(note.isPinned) {
            let colorHex = note.color === 'blue' ? '#00ffff' : note.color === 'purple' ? '#8A2BE2' : '#ffd700';
            area.innerHTML += `
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; margin-bottom: 12px; border-right: 3px solid ${colorHex};">
                    <strong style="color:${colorHex}; font-size:0.9rem">${note.word}:</strong>
                    <p style="margin-top:5px; font-size:0.9rem; color: #ddd;">${note.text}</p>
                </div>`;
        }
    });
}

// --- 6. وایت‌برد ---
const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
let drawing = false;

canvas.addEventListener('mousedown', () => drawing = true);
canvas.addEventListener('mouseup', () => { drawing = false; ctx.beginPath(); });
canvas.addEventListener('mousemove', (e) => {
    if(!drawing) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.strokeStyle = document.getElementById('boardColor').value;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
});
document.getElementById('clearBoardBtn').addEventListener('click', () => ctx.clearRect(0, 0, canvas.width, canvas.height));

// --- 7. تنظیمات ---
document.getElementById('settingsBtn').onclick = () => document.getElementById('settingsModal').classList.add('show');
document.querySelectorAll('.close-modal').forEach(btn => btn.onclick = () => { document.getElementById('settingsModal').classList.remove('show'); noteModal.classList.remove('show'); });

document.getElementById('fontSizeSlider').addEventListener('input', (e) => {
    document.body.style.fontSize = e.target.value + 'px';
    db.settings.fontSize = e.target.value;
    localStorage.setItem('vijarDataV2', JSON.stringify(db));
});

document.getElementById('resetRoleBtn').onclick = () => {
    db.role = null; localStorage.setItem('vijarDataV2', JSON.stringify(db)); 
    document.getElementById('settingsModal').classList.remove('show'); showView('role');
};
