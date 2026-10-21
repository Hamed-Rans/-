// دیتابیس لوکال با ساختار جدید
let db = JSON.parse(localStorage.getItem('vijarAppV3')) || { 
    docs: [], 
    folders: [{ id: 'uni', name: 'دانشگاه' }, { id: 'code', name: 'برنامه‌نویسی' }], 
    notes: {}, 
    role: null, 
    scratchpadText: '' 
};
let currentDocId = null;
let currentFolderId = 'all';

// المان‌های پایه‌ای
const views = { role: document.getElementById('role-view'), dash: document.getElementById('dashboard-view'), edit: document.getElementById('editor-view') };
const editor = document.getElementById('editor');
const textScratchpad = document.getElementById('textScratchpad');

// --- 1. مدیریت صفحات و نقش ---
if (db.role) initApp();

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
    textScratchpad.value = db.scratchpadText || '';
    renderFolders();
    renderDashboard();
}

function showView(viewId) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewId].classList.remove('hidden');
    
    // مدیریت دکمه‌های هدر
    document.getElementById('backToDashBtn').classList.toggle('hidden', viewId !== 'edit');
    document.getElementById('importBtn').classList.toggle('hidden', viewId !== 'edit');
    document.getElementById('exportBtn').classList.toggle('hidden', viewId !== 'edit');
}
function saveDB() { localStorage.setItem('vijarAppV3', JSON.stringify(db)); }

// --- 2. مدیریت فولدرها و داشبورد ---
function renderFolders() {
    const list = document.getElementById('folderList');
    list.innerHTML = `<li data-id="all" class="${currentFolderId === 'all' ? 'active-folder' : ''}"><i class="fa-solid fa-folder-open"></i> همه جزوه‌ها</li>`;
    
    db.folders.forEach(f => {
        list.innerHTML += `<li data-id="${f.id}" class="${currentFolderId === f.id ? 'active-folder' : ''}"><i class="fa-solid fa-folder"></i> ${f.name}</li>`;
    });

    document.querySelectorAll('#folderList li').forEach(li => {
        li.addEventListener('click', (e) => {
            currentFolderId = e.currentTarget.dataset.id;
            renderFolders(); // آپدیت کلاس اکتیو
            renderDashboard(); // فیلتر جزوه‌ها
        });
    });
}

// افزودن فولدر جدید
document.getElementById('addFolderBtn').onclick = () => document.getElementById('addFolderModal').classList.add('show');
document.getElementById('confirmAddFolderBtn').onclick = () => {
    const name = document.getElementById('newFolderName').value.trim();
    if(name) {
        db.folders.push({ id: 'folder_' + Date.now(), name: name });
        saveDB();
        renderFolders();
        document.getElementById('newFolderName').value = '';
        document.getElementById('addFolderModal').classList.remove('show');
    }
};

function renderDashboard() {
    const grid = document.getElementById('documentsGrid');
    const emptyState = document.getElementById('emptyState');
    grid.innerHTML = '';
    
    // فیلتر کردن
    let filteredDocs = currentFolderId === 'all' ? db.docs : db.docs.filter(d => d.folderId === currentFolderId);
    
    if(filteredDocs.length === 0) {
        emptyState.classList.remove('hidden');
        grid.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        grid.classList.remove('hidden');
        filteredDocs.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'doc-card';
            card.innerHTML = `
                <h3><i class="fa-solid fa-file-lines" style="color: var(--accent-persian); margin-left:8px;"></i> ${doc.title || 'بدون عنوان'}</h3>
                <p><i class="fa-regular fa-clock"></i> ویرایش: ${new Date(doc.id * 1).toLocaleDateString('fa-IR')}</p>
            `;
            card.onclick = () => loadDocument(doc.id);
            grid.appendChild(card);
        });
    }
}

document.getElementById('createNewDocBtn').onclick = () => {
    currentDocId = Date.now().toString();
    document.getElementById('documentTitle').value = '';
    editor.innerHTML = '';
    editor.style.fontFamily = "'Vazirmatn', sans-serif";
    document.querySelector('.dropdown-selected').innerHTML = 'انتخاب فونت <i class="fa-solid fa-chevron-down"></i>';
    showView('edit');
    renderPinnedNotes();
};

document.getElementById('backToDashBtn').onclick = () => { showView('dash'); renderDashboard(); };

// --- 3. ویرایشگر، چکنویس تایپی و منوی سفارشی فونت ---
// ذخیره خودکار چکنویس تایپی
textScratchpad.addEventListener('input', (e) => {
    db.scratchpadText = e.target.value;
    saveDB();
});

// منوی کشویی انیمیشن‌دار (Custom Dropdown)
const fontDropdown = document.getElementById('fontDropdown');
fontDropdown.addEventListener('click', (e) => {
    fontDropdown.classList.toggle('active');
});
// بستن منو با کلیک در بیرون
document.addEventListener('click', (e) => {
    if (!fontDropdown.contains(e.target)) fontDropdown.classList.remove('active');
});

document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
        const fontName = e.target.dataset.value;
        const fontTitle = e.target.textContent;
        // تغییر متن دکمه
        document.querySelector('.dropdown-selected').innerHTML = `${fontTitle} <i class="fa-solid fa-chevron-down"></i>`;
        // اعمال فونت به ادیتور
        editor.style.fontFamily = `'${fontName}', sans-serif`;
    });
});

// ابزارهای نگارشی
document.querySelectorAll('.tool-btn[data-command]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        document.execCommand(btn.dataset.command, false, null);
    });
});
document.getElementById('textColorPicker').addEventListener('input', (e) => {
    document.execCommand('foreColor', false, e.target.value);
});

// ذخیره جزوه
document.getElementById('saveDocBtn').onclick = () => {
    if(!currentDocId) return;
    const docData = { 
        id: currentDocId, 
        title: document.getElementById('documentTitle').value, 
        content: editor.innerHTML,
        folderId: currentFolderId === 'all' ? 'uni' : currentFolderId, // پیش‌فرض اگر تو All ساخته بشه
        font: editor.style.fontFamily
    };
    const idx = db.docs.findIndex(d => d.id === currentDocId);
    idx > -1 ? db.docs[idx] = docData : db.docs.push(docData);
    saveDB();
    
    const icon = document.querySelector('#saveDocBtn i');
    icon.className = 'fa-solid fa-check';
    setTimeout(() => icon.className = 'fa-solid fa-floppy-disk', 1000);
};

function loadDocument(id) {
    const doc = db.docs.find(d => d.id === id);
    if(doc) {
        currentDocId = doc.id;
        document.getElementById('documentTitle').value = doc.title;
        editor.innerHTML = doc.content;
        if(doc.font) {
            editor.style.fontFamily = doc.font;
            document.querySelector('.dropdown-selected').innerHTML = `فونت اعمال شده <i class="fa-solid fa-chevron-down"></i>`;
        }
        showView('edit');
        renderPinnedNotes();
    }
}

// --- 4. یادداشت‌گذاری ---
const noteModal = document.getElementById('noteModal');
let currentWordId = null;

// ساده‌سازی: با دابل کلیک روی کلمه، پاپ‌آپ باز می‌شود
editor.addEventListener('dblclick', () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if(text.length > 0) {
        currentWordId = 'word_' + Date.now();
        const span = document.createElement('span');
        span.id = currentWordId;
        span.style.borderBottom = '2px solid var(--accent-persian)';
        span.style.background = 'rgba(0, 166, 147, 0.15)';
        span.textContent = text;
        document.execCommand('insertHTML', false, span.outerHTML);
        
        document.getElementById('selectedWordDisplay').textContent = text;
        document.getElementById('noteInput').value = '';
        noteModal.classList.add('show');
    }
});

document.getElementById('saveNoteBtn').onclick = () => {
    const text = document.getElementById('noteInput').value.trim();
    if(text && currentWordId) {
        const wordEl = document.getElementById(currentWordId);
        db.notes[currentWordId] = { word: wordEl.textContent, text: text, isPinned: document.getElementById('pinNoteCheck').checked };
        saveDB();
        renderPinnedNotes();
    }
    noteModal.classList.remove('show');
};

function renderPinnedNotes() {
    const area = document.getElementById('pinnedNotesArea');
    area.innerHTML = '';
    Object.values(db.notes).forEach(note => {
        if(note.isPinned) {
            area.innerHTML += `
                <div class="note-item">
                    <strong style="color:var(--accent-persian); font-size:0.9rem">${note.word}:</strong>
                    <p style="margin-top:5px; font-size:0.9rem; color: var(--text-muted);">${note.text}</p>
                </div>`;
        }
    });
}

// --- 5. چکنویس تصویری (وایت‌برد) ---
const canvas = document.getElementById('scratchpadCanvas');
const ctx = canvas.getContext('2d');
let drawing = false;
let currentTool = 'pencil';

const boardTools = document.querySelectorAll('.board-tool[data-tool]');
boardTools.forEach(btn => {
    btn.onclick = () => {
        boardTools.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTool = btn.dataset.tool;
    };
});

canvas.addEventListener('mousedown', (e) => { drawing = true; draw(e); });
canvas.addEventListener('mouseup', () => { drawing = false; ctx.beginPath(); });
canvas.addEventListener('mousemove', draw);

function draw(e) {
    if(!drawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if(currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 20;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = document.getElementById('boardColor').value;
        if(currentTool === 'pencil') { ctx.lineWidth = 2; ctx.globalAlpha = 1.0; } 
        else if(currentTool === 'marker') { ctx.lineWidth = 6; ctx.globalAlpha = 1.0; } 
        else if(currentTool === 'highlighter') { ctx.lineWidth = 15; ctx.globalAlpha = 0.3; }
    }
    ctx.lineTo(x, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.globalAlpha = 1.0;
}

document.getElementById('clearBoardBtn').onclick = () => ctx.clearRect(0, 0, canvas.width, canvas.height);

document.getElementById('exportBoardToDocBtn').onclick = () => {
    const dataUrl = canvas.toDataURL("image/png");
    editor.focus();
    document.execCommand('insertHTML', false, `<img src="${dataUrl}" style="background:transparent; max-width:100%; border:none;">`);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

// --- بستن پاپ‌آپ‌ها ---
document.querySelectorAll('.btn-close-modal').forEach(btn => btn.onclick = () => {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
});
