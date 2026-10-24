// دیتابیس نسخه جدید و تمیز
let db = JSON.parse(localStorage.getItem('vijarAppV7')) || { 
    docs: [], folders: [], notes: {}, role: null, scratch: '', theme: 'dark' 
};
let currentDocId = null;
let currentFolderId = 'all';

// مدیریت صفحات
const views = { role: document.getElementById('role-view'), dash: document.getElementById('dashboard-view'), edit: document.getElementById('editor-view') };
const editor = document.getElementById('editor');

// اعمال تم ذخیره شده
document.body.setAttribute('data-theme', db.theme);
document.getElementById('themeSelect').value = db.theme;

if(db.role) {
    initApp();
} else {
    showView('role-view');
}

document.querySelectorAll('.role-card').forEach(card => card.onclick = () => { 
    db.role = card.dataset.role; saveDB(); initApp(); 
});

function initApp() {
    showView('dashboard-view');
    document.getElementById('userRoleBadge').textContent = db.role === 'teacher' ? 'استاد' : 'دانشجو';
    document.getElementById('textScratchpad').value = db.scratch || '';
    renderFolders();
    renderDashboard();
}

function showView(viewId) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    
    // مدیریت دکمه‌های هدر
    document.getElementById('backToDashBtn').classList.toggle('hidden', viewId !== 'editor-view');
    document.getElementById('importBtn').classList.toggle('hidden', viewId !== 'editor-view');
    document.getElementById('exportBtn').classList.toggle('hidden', viewId !== 'editor-view');
}
function saveDB() { localStorage.setItem('vijarAppV7', JSON.stringify(db)); }

// --- داشبورد و پوشه‌ها ---
function renderFolders() {
    const list = document.getElementById('folderList');
    list.innerHTML = `<li data-id="all" class="${currentFolderId === 'all' ? 'active-folder' : ''}"><i class="fa-solid fa-folder-open"></i> همه جزوه‌ها</li>`;
    db.folders.forEach(f => {
        list.innerHTML += `<li data-id="${f.id}" class="${currentFolderId === f.id ? 'active-folder' : ''}"><i class="fa-solid fa-folder"></i> ${f.name}</li>`;
    });
    document.querySelectorAll('#folderList li').forEach(li => li.onclick = (e) => {
        currentFolderId = e.currentTarget.dataset.id; renderFolders(); renderDashboard();
    });
}
document.getElementById('addFolderBtn').onclick = () => document.getElementById('addFolderModal').classList.add('show');
document.getElementById('confirmAddFolderBtn').onclick = () => {
    const name = document.getElementById('newFolderName').value.trim();
    if(name) { db.folders.push({id: 'folder_'+Date.now(), name}); saveDB(); renderFolders(); document.getElementById('newFolderName').value=''; document.getElementById('addFolderModal').classList.remove('show'); }
};

function renderDashboard() {
    const grid = document.getElementById('documentsGrid');
    const emptyState = document.getElementById('emptyState');
    grid.innerHTML = '';
    let filtered = currentFolderId === 'all' ? db.docs : db.docs.filter(d => d.folderId === currentFolderId);
    if(filtered.length === 0) {
        emptyState.classList.remove('hidden'); grid.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden'); grid.classList.remove('hidden');
        filtered.forEach(doc => {
            const card = document.createElement('div'); card.className = 'doc-card';
            card.innerHTML = `<h3><i class="fa-solid fa-file-lines" style="color:var(--accent-persian); margin-left:8px;"></i> ${doc.title || 'بدون عنوان'}</h3><p><i class="fa-regular fa-clock"></i> ویرایش: ${new Date(doc.id*1).toLocaleDateString('fa-IR')}</p>`;
            card.onclick = () => loadDoc(doc.id);
            grid.appendChild(card);
        });
    }
}

document.getElementById('createNewDocBtn').onclick = () => {
    currentDocId = Date.now().toString();
    document.getElementById('documentTitle').value = ''; 
    document.getElementById('documentTitle').disabled = false;
    document.getElementById('lockTitleBtn').innerHTML = '<i class="fa-solid fa-lock-open"></i>';
    editor.innerHTML = ''; 
    editor.style.fontFamily = "'YekanBakh', sans-serif";
    document.querySelector('.dropdown-selected').innerHTML = 'یکان‌بخ (مدرن) <i class="fa-solid fa-chevron-down"></i>';
    showView('editor-view'); 
};
document.getElementById('backToDashBtn').onclick = () => { showView('dashboard-view'); renderDashboard(); };

// --- ادیتور و نوار ابزار ---
document.getElementById('textScratchpad').oninput = (e) => { db.scratch = e.target.value; saveDB(); };

// قفل کردن عنوان جزوه
const titleInput = document.getElementById('documentTitle');
const lockBtn = document.getElementById('lockTitleBtn');
lockBtn.onclick = () => {
    if(titleInput.disabled) { titleInput.disabled = false; lockBtn.innerHTML = '<i class="fa-solid fa-lock-open"></i>'; } 
    else { titleInput.disabled = true; lockBtn.innerHTML = '<i class="fa-solid fa-lock"></i>'; }
};

// تغییر سایز فونت (نوار بالا)
let currentFontSize = 18;
document.getElementById('increaseFontBtn').onclick = () => { currentFontSize += 2; editor.style.fontSize = currentFontSize + 'px'; };
document.getElementById('decreaseFontBtn').onclick = () => { if(currentFontSize > 12) { currentFontSize -= 2; editor.style.fontSize = currentFontSize + 'px'; } };

// دراپ‌داون فونت (شناور در بالا)
const fontDrop = document.getElementById('fontDropdown');
fontDrop.onclick = (e) => fontDrop.classList.toggle('active');
document.addEventListener('click', (e) => { if(!fontDrop.contains(e.target)) fontDrop.classList.remove('active'); });

document.querySelectorAll('.dropdown-item').forEach(item => item.onclick = (e) => {
    editor.style.fontFamily = `'${e.target.dataset.value}', sans-serif`;
    document.querySelector('.dropdown-selected').innerHTML = `${e.target.textContent} <i class="fa-solid fa-chevron-down"></i>`;
});

const formatBtns = document.querySelectorAll('.toggle-tool');
formatBtns.forEach(btn => btn.onmousedown = (e) => { e.preventDefault(); document.execCommand(btn.dataset.command, false, null); checkActiveTools(); });
editor.addEventListener('keyup', checkActiveTools); editor.addEventListener('mouseup', checkActiveTools);
function checkActiveTools() { formatBtns.forEach(btn => { if (document.queryCommandState(btn.dataset.command)) btn.classList.add('active-tool'); else btn.classList.remove('active-tool'); }); }
document.querySelectorAll('.tool-btn[data-command]:not(.toggle-tool)').forEach(btn => btn.onmousedown = (e) => { e.preventDefault(); document.execCommand(btn.dataset.command, false, null); });
document.getElementById('nativeColorPicker').oninput = (e) => document.execCommand('foreColor', false, e.target.value);

document.getElementById('saveDocBtn').onclick = () => {
    if(!currentDocId) return;
    const docData = { id: currentDocId, title: titleInput.value, content: editor.innerHTML, folderId: currentFolderId === 'all' ? (db.folders[0]?.id || 'all') : currentFolderId, font: editor.style.fontFamily };
    const idx = db.docs.findIndex(d => d.id === currentDocId);
    idx > -1 ? db.docs[idx] = docData : db.docs.push(docData);
    saveDB();
    const icon = document.querySelector('#saveDocBtn i'); icon.className = 'fa-solid fa-check'; setTimeout(() => icon.className = 'fa-solid fa-floppy-disk', 1000);
};

function loadDoc(id) {
    const doc = db.docs.find(d => d.id === id);
    if(doc) {
        currentDocId = doc.id; titleInput.value = doc.title; editor.innerHTML = doc.content;
        if(doc.font) { editor.style.fontFamily = doc.font; document.querySelector('.dropdown-selected').innerHTML = `فونت اعمال شد <i class="fa-solid fa-chevron-down"></i>`; }
        showView('editor-view'); bindNoteHover(); renderPinnedNotes();
    }
}

// --- بوم (تخته رسم + نشانه‌گر) ---
const canvas = document.getElementById('scratchpadCanvas'); 
const ctx = canvas.getContext('2d');
const cursor = document.getElementById('cursorPointer');
let drawing = false; let cTool = 'pencil'; let startX, startY; let snapshot;

// آپدیت ظاهر نشانه‌گر ماوس
const updateCursor = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    
    if(x >= 0 && y >= 0 && x <= canvas.width && y <= canvas.height) {
        cursor.classList.remove('hidden');
        cursor.style.left = `${x}px`; cursor.style.top = `${y}px`;
        
        let color = document.getElementById('boardColor').value;
        if(cTool === 'eraser') { cursor.style.width = '20px'; cursor.style.height = '20px'; cursor.style.border = '2px solid var(--text-muted)'; cursor.style.background = 'transparent'; }
        else if(cTool === 'highlighter') { cursor.style.width = '15px'; cursor.style.height = '15px'; cursor.style.background = color; cursor.style.opacity = '0.5'; cursor.style.border = 'none'; }
        else { cursor.style.width = '8px'; cursor.style.height = '8px'; cursor.style.background = color; cursor.style.border = 'none'; cursor.style.opacity = '1'; }
    } else {
        cursor.classList.add('hidden');
    }
};

canvas.addEventListener('mousemove', updateCursor);
canvas.addEventListener('mouseleave', () => cursor.classList.add('hidden'));

document.querySelectorAll('.board-tool[data-tool]').forEach(btn => btn.onclick = () => {
    document.querySelectorAll('.board-tool[data-tool]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); cTool = btn.dataset.tool; 
});

const getPos = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX || e.touches[0].clientX) - r.left, y: (e.clientY || e.touches[0].clientY) - r.top }; };
const startDraw = (e) => { e.preventDefault(); drawing = true; const pos = getPos(e); startX = pos.x; startY = pos.y; ctx.beginPath(); ctx.moveTo(startX, startY); snapshot = ctx.getImageData(0,0,canvas.width,canvas.height); };
const draw = (e) => {
    if(!drawing) return; e.preventDefault(); const pos = getPos(e);
    ctx.putImageData(snapshot, 0, 0);
    ctx.strokeStyle = document.getElementById('boardColor').value;
    ctx.lineWidth = cTool === 'highlighter' ? 15 : 2; 
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = cTool === 'eraser' ? 'destination-out' : 'source-over';
    
    if(cTool === 'eraser') { ctx.lineWidth = 20; ctx.lineTo(pos.x, pos.y); ctx.stroke(); snapshot = ctx.getImageData(0,0,canvas.width,canvas.height); }
    else if(['pencil','highlighter'].includes(cTool)) { if(cTool === 'highlighter') ctx.globalAlpha = 0.3; ctx.lineTo(pos.x, pos.y); ctx.stroke(); ctx.globalAlpha = 1.0; snapshot = ctx.getImageData(0,0,canvas.width,canvas.height); }
    else if (cTool === 'rect') ctx.strokeRect(startX, startY, pos.x - startX, pos.y - startY);
    else if (cTool === 'circle') { ctx.beginPath(); ctx.arc(startX, startY, Math.abs(pos.x - startX), 0, 2 * Math.PI); ctx.stroke(); }
    else if (cTool === 'line') { ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
};
const stopDraw = () => drawing = false;

canvas.addEventListener('mousedown', startDraw); canvas.addEventListener('mousemove', draw); canvas.addEventListener('mouseup', stopDraw);
document.getElementById('clearBoardBtn').onclick = () => ctx.clearRect(0,0,canvas.width,canvas.height);
document.getElementById('exportBoardToDocBtn').onclick = () => { editor.focus(); document.execCommand('insertHTML', false, `<img src="${canvas.toDataURL()}" style="max-width:100%; border-radius: 8px;">`); ctx.clearRect(0,0,canvas.width,canvas.height); };

// --- منوی راست‌کلیک و یادداشت‌ها ---
const ctxMenu = document.getElementById('customContextMenu');
let lastRange = null;

editor.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if(window.getSelection().toString().trim().length > 0) lastRange = window.getSelection().getRangeAt(0);
    ctxMenu.style.left = `${e.clientX}px`; ctxMenu.style.top = `${e.clientY}px`; ctxMenu.classList.remove('hidden');
});
document.addEventListener('click', (e) => { if(!e.target.closest('#customContextMenu')) ctxMenu.classList.add('hidden'); });

document.getElementById('menuCopy').onclick = () => { document.execCommand('copy'); ctxMenu.classList.add('hidden'); };
document.getElementById('menuCut').onclick = () => { document.execCommand('cut'); ctxMenu.classList.add('hidden'); };
document.getElementById('menuPaste').onclick = async () => { const text = await navigator.clipboard.readText(); document.execCommand('insertText', false, text); ctxMenu.classList.add('hidden'); };
document.getElementById('menuBold').onclick = () => { if(lastRange) { window.getSelection().addRange(lastRange); document.execCommand('bold'); ctxMenu.classList.add('hidden'); } };
document.getElementById('menuItalic').onclick = () => { if(lastRange) { window.getSelection().addRange(lastRange); document.execCommand('italic'); ctxMenu.classList.add('hidden'); } };

const noteModal = document.getElementById('noteModal');
let currentWordId = null;

// دکمه افزودن توضیح در منوی راست‌کلیک
document.getElementById('menuHighlight').onclick = () => {
    if(lastRange) {
        window.getSelection().removeAllRanges(); window.getSelection().addRange(lastRange);
        const text = window.getSelection().toString().trim();
        currentWordId = 'word_' + Date.now();
        const span = document.createElement('span'); span.id = currentWordId; span.className = 'hl-word hl-yellow'; span.textContent = text;
        document.execCommand('insertHTML', false, span.outerHTML);
        document.getElementById('selectedWordDisplay').textContent = text; document.getElementById('noteInput').value = '';
        noteModal.classList.add('show'); ctxMenu.classList.add('hidden');
    }
};

let selectedLabelColor = 'yellow';
document.querySelectorAll('.color-dot').forEach(dot => dot.onclick = (e) => {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active')); e.target.classList.add('active'); selectedLabelColor = e.target.dataset.color;
});

document.getElementById('saveNoteBtn').onclick = () => {
    const text = document.getElementById('noteInput').value.trim();
    if(text && currentWordId) {
        document.getElementById(currentWordId).className = `hl-word hl-${selectedLabelColor}`;
        db.notes[currentWordId] = { word: document.getElementById(currentWordId).textContent, text: text, color: selectedLabelColor, isPinned: document.getElementById('pinNoteCheck').checked };
        saveDB(); renderPinnedNotes(); bindNoteHover();
    }
    noteModal.classList.remove('show');
};

function renderPinnedNotes() {
    const area = document.getElementById('pinnedNotesArea'); area.innerHTML = '';
    Object.values(db.notes).forEach(n => {
        if(n.isPinned) {
            let col = n.color==='yellow'?'#EAB308':n.color==='blue'?'#3B82F6':n.color==='green'?'#10B981':'#EF4444';
            area.innerHTML += `<div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:12px; margin-bottom:12px; border-right:3px solid ${col};"><strong style="color:${col}; font-size:0.9rem">${n.word}:</strong><p style="margin-top:5px; font-size:0.9rem; color:var(--text-muted);">${n.text}</p></div>`;
        }
    });
}

// هاور توضیحات
const notePopup = document.getElementById('noteViewPopup');
function bindNoteHover() {
    document.querySelectorAll('.hl-word').forEach(word => {
        word.onmouseenter = (e) => {
            const noteData = db.notes[word.id];
            if(noteData) {
                document.getElementById('noteViewContent').textContent = noteData.text;
                const rect = word.getBoundingClientRect(); 
                notePopup.style.left = `${rect.right + 15}px`; notePopup.style.top = `${rect.top}px`;
                notePopup.classList.remove('hidden'); setTimeout(() => notePopup.classList.add('show'), 10);
            }
        };
        word.onmouseleave = () => { notePopup.classList.remove('show'); setTimeout(() => notePopup.classList.add('hidden'), 300); };
    });
}

// --- مودال‌ها و تنظیمات ---
document.querySelectorAll('.btn-close-modal').forEach(b => b.onclick = () => document.querySelectorAll('.modal').forEach(m => m.classList.remove('show')));
document.getElementById('importBtn').onclick = () => document.getElementById('importModal').classList.add('show');
document.getElementById('exportBtn').onclick = () => document.getElementById('exportModal').classList.add('show');
document.getElementById('settingsBtn').onclick = () => document.getElementById('settingsModal').classList.add('show');

document.getElementById('themeSelect').onchange = (e) => {
    db.theme = e.target.value; saveDB(); document.body.setAttribute('data-theme', db.theme);
};
document.getElementById('resetRoleBtn').onclick = () => { db.role = null; saveDB(); document.querySelectorAll('.modal').forEach(m => m.classList.remove('show')); showView('role-view'); };
document.getElementById('clearDataBtn').onclick = () => { if(confirm('مطمئنی می‌خوای کل جزوه‌ها رو پاک کنی؟')) { db = { docs: [], folders: [], notes: {}, role: db.role, scratch: '', theme: db.theme }; saveDB(); location.reload(); } };
