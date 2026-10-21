let db = JSON.parse(localStorage.getItem('vijarAppV4')) || { docs: [], folders: [], notes: {}, role: null, scratch: '' };
let currentDocId = null;

const views = { role: document.getElementById('role-view'), dash: document.getElementById('dashboard-view'), edit: document.getElementById('editor-view') };
const editor = document.getElementById('editor');

// مسیریابی و نقش
if (db.role) initApp();
document.querySelectorAll('.role-card').forEach(card => card.onclick = () => { db.role = card.dataset.role; saveDB(); initApp(); });

function initApp() {
    showView('dash');
    document.getElementById('userRoleBadge').textContent = db.role === 'teacher' ? 'استاد' : 'دانشجو';
    document.getElementById('textScratchpad').value = db.scratch || '';
    renderDashboard();
}

function showView(viewId) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewId].classList.remove('hidden');
    document.getElementById('backToDashBtn').classList.toggle('hidden', viewId !== 'dash' && viewId !== 'role');
    document.getElementById('importBtn').classList.toggle('hidden', viewId !== 'edit');
    document.getElementById('exportBtn').classList.toggle('hidden', viewId !== 'edit');
}
function saveDB() { localStorage.setItem('vijarAppV4', JSON.stringify(db)); }

// داشبورد
function renderDashboard() {
    const grid = document.getElementById('documentsGrid');
    grid.innerHTML = '';
    if(db.docs.length === 0) {
        document.getElementById('emptyState').classList.remove('hidden');
    } else {
        document.getElementById('emptyState').classList.add('hidden');
        db.docs.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'doc-card';
            card.innerHTML = `<h3>${doc.title || 'بدون عنوان'}</h3><p>آخرین ویرایش: ${new Date(doc.id*1).toLocaleDateString('fa-IR')}</p>`;
            card.onclick = () => loadDoc(doc.id);
            grid.appendChild(card);
        });
    }
}
document.getElementById('createNewDocBtn').onclick = () => { currentDocId = Date.now().toString(); document.getElementById('documentTitle').value = ''; editor.innerHTML = ''; showView('edit'); };
document.getElementById('backToDashBtn').onclick = () => showView('dash');

// چکنویس تایپی
document.getElementById('textScratchpad').oninput = (e) => { db.scratch = e.target.value; saveDB(); };

// ابزارهای ادیتور (Active State)
const formatBtns = document.querySelectorAll('.toggle-tool');
formatBtns.forEach(btn => {
    btn.onmousedown = (e) => {
        e.preventDefault();
        document.execCommand(btn.dataset.command, false, null);
        checkActiveTools();
    };
});
editor.addEventListener('keyup', checkActiveTools);
editor.addEventListener('mouseup', checkActiveTools);

function checkActiveTools() {
    formatBtns.forEach(btn => {
        if(document.queryCommandState(btn.dataset.command)) btn.classList.add('active-tool');
        else btn.classList.remove('active-tool');
    });
}

// پاپ‌آپ رنگ سفارشی
const colorBtn = document.getElementById('textColorBtn');
const colorPopup = document.getElementById('colorPopup');
colorBtn.onclick = () => colorPopup.classList.toggle('hidden');
document.addEventListener('click', (e) => { if(!e.target.closest('.color-menu-wrapper')) colorPopup.classList.add('hidden'); });

function applyColor(color) { document.execCommand('foreColor', false, color); colorPopup.classList.add('hidden'); }
document.querySelectorAll('.color-swatch').forEach(sw => sw.onclick = () => applyColor(sw.dataset.color));
document.getElementById('nativeColorPicker').oninput = (e) => applyColor(e.target.value);

// دراپ‌داون فونت
const fontDrop = document.getElementById('fontDropdown');
fontDrop.onclick = () => fontDrop.classList.toggle('active');
document.querySelectorAll('.dropdown-item').forEach(item => {
    item.onclick = (e) => {
        editor.style.fontFamily = `'${e.target.dataset.value}', sans-serif`;
        document.querySelector('.dropdown-selected').innerHTML = `${e.target.textContent} <i class="fa-solid fa-chevron-down"></i>`;
    };
});

// ذخیره
document.getElementById('saveDocBtn').onclick = () => {
    if(!currentDocId) return;
    const docData = { id: currentDocId, title: document.getElementById('documentTitle').value, content: editor.innerHTML };
    const idx = db.docs.findIndex(d => d.id === currentDocId);
    idx > -1 ? db.docs[idx] = docData : db.docs.push(docData);
    saveDB();
};
function loadDoc(id) {
    const doc = db.docs.find(d => d.id === id);
    if(doc) { currentDocId = doc.id; document.getElementById('documentTitle').value = doc.title; editor.innerHTML = doc.content; showView('edit'); bindNoteHover(); }
}

// --- تولتیپ انتخاب متن (افزودن توضیح) ---
const quickTooltip = document.getElementById('quickTooltip');
let lastSelectionRange = null;

editor.addEventListener('mouseup', (e) => {
    const sel = window.getSelection();
    if(sel.toString().trim().length > 0) {
        lastSelectionRange = sel.getRangeAt(0);
        const rect = lastSelectionRange.getBoundingClientRect();
        quickTooltip.style.left = `${rect.left + (rect.width/2)}px`;
        quickTooltip.style.top = `${rect.top - 40}px`;
        quickTooltip.classList.remove('hidden');
    } else {
        quickTooltip.classList.add('hidden');
    }
});
document.addEventListener('mousedown', (e) => { if(!e.target.closest('#quickTooltip') && !e.target.closest('#editor')) quickTooltip.classList.add('hidden'); });

let currentWordId = null;
const noteModal = document.getElementById('noteModal');
document.getElementById('quickAddNoteBtn').onclick = () => {
    if(lastSelectionRange) {
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(lastSelectionRange);
        const text = window.getSelection().toString().trim();
        currentWordId = 'word_' + Date.now();
        const span = document.createElement('span');
        span.id = currentWordId; span.className = `hl-word hl-yellow`; span.textContent = text;
        document.execCommand('insertHTML', false, span.outerHTML);
        document.getElementById('selectedWordDisplay').textContent = text;
        noteModal.classList.add('show');
        quickTooltip.classList.add('hidden');
    }
};

let selectedLabelColor = 'yellow';
document.querySelectorAll('.color-dot').forEach(dot => {
    dot.onclick = (e) => {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        e.target.classList.add('active');
        selectedLabelColor = e.target.dataset.color;
    };
});

document.getElementById('saveNoteBtn').onclick = () => {
    const text = document.getElementById('noteInput').value.trim();
    if(text && currentWordId) {
        document.getElementById(currentWordId).className = `hl-word hl-${selectedLabelColor}`;
        db.notes[currentWordId] = { text: text, color: selectedLabelColor };
        saveDB(); bindNoteHover();
    }
    noteModal.classList.remove('show');
};
document.querySelectorAll('.btn-close-modal').forEach(b => b.onclick = () => noteModal.classList.remove('show'));

// هاور روی کلمات توضیح‌دار
const notePopup = document.getElementById('noteViewPopup');
function bindNoteHover() {
    document.querySelectorAll('.hl-word').forEach(word => {
        word.onmouseenter = (e) => {
            const noteData = db.notes[word.id];
            if(noteData) {
                document.getElementById('noteViewContent').textContent = noteData.text;
                const rect = word.getBoundingClientRect();
                notePopup.style.left = `${rect.left}px`;
                notePopup.style.top = `${rect.bottom + 10}px`;
                notePopup.classList.remove('hidden');
                setTimeout(() => notePopup.classList.add('show'), 10);
            }
        };
        word.onmouseleave = () => { notePopup.classList.remove('show'); setTimeout(() => notePopup.classList.add('hidden'), 300); };
    });
}

// --- راست‌کلیک کامل ---
const ctxMenu = document.getElementById('customContextMenu');
editor.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if(window.getSelection().toString().trim().length > 0) lastSelectionRange = window.getSelection().getRangeAt(0);
    ctxMenu.style.left = `${e.clientX}px`; ctxMenu.style.top = `${e.clientY}px`;
    ctxMenu.classList.remove('hidden');
});
document.addEventListener('click', () => ctxMenu.classList.add('hidden'));

document.getElementById('menuCopy').onclick = () => document.execCommand('copy');
document.getElementById('menuCut').onclick = () => document.execCommand('cut');
document.getElementById('menuPaste').onclick = () => navigator.clipboard.readText().then(text => document.execCommand('insertText', false, text));
document.getElementById('menuBold').onclick = () => { if(lastSelectionRange) { window.getSelection().addRange(lastSelectionRange); document.execCommand('bold'); } };
document.getElementById('menuItalic').onclick = () => { if(lastSelectionRange) { window.getSelection().addRange(lastSelectionRange); document.execCommand('italic'); } };

// --- تخته رسم (الگوریتم نرم و اشکال) ---
const canvas = document.getElementById('scratchpadCanvas');
const ctx = canvas.getContext('2d');
let drawing = false; let currentTool = 'pencil';
let startX, startY; let snapshot; // برای رسم اشکال

const setCursor = () => {
    if(currentTool === 'eraser') canvas.style.cursor = 'cell';
    else if(['rect', 'circle', 'line'].includes(currentTool)) canvas.style.cursor = 'crosshair';
    else canvas.style.cursor = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZdEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjbQg61aAAAADUlEQVQYV2P4//8/AwAI/AL+X6MwWAAAAABJRU5ErkJggg==) 0 0, auto'; // کرسر نقطه‌ای ریز
};
setCursor();

document.querySelectorAll('.board-tool').forEach(btn => btn.onclick = () => {
    document.querySelectorAll('.board-tool').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); currentTool = btn.dataset.tool; setCursor();
});

const getPos = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX || e.touches[0].clientX) - r.left, y: (e.clientY || e.touches[0].clientY) - r.top }; };

const startDraw = (e) => {
    e.preventDefault(); drawing = true; const pos = getPos(e); startX = pos.x; startY = pos.y;
    ctx.beginPath(); ctx.moveTo(startX, startY); snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
};
const draw = (e) => {
    if(!drawing) return; e.preventDefault(); const pos = getPos(e);
    ctx.putImageData(snapshot, 0, 0); // بازگردانی تصویر قبل برای رسم اشکال
    
    ctx.strokeStyle = document.getElementById('boardColor').value;
    ctx.lineWidth = currentTool === 'highlighter' ? 15 : 2;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';
    if(currentTool === 'eraser') ctx.lineWidth = 20;

    if(currentTool === 'pencil' || currentTool === 'highlighter' || currentTool === 'eraser') {
        ctx.lineTo(pos.x, pos.y); ctx.stroke();
        snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height); // آپدیت مداوم برای خط آزاد
    } else if (currentTool === 'rect') {
        ctx.strokeRect(startX, startY, pos.x - startX, pos.y - startY);
    } else if (currentTool === 'circle') {
        ctx.beginPath(); ctx.arc(startX, startY, Math.abs(pos.x - startX), 0, 2 * Math.PI); ctx.stroke();
    } else if (currentTool === 'line') {
        ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(pos.x, pos.y); ctx.stroke();
    }
};
const stopDraw = () => { drawing = false; };

canvas.addEventListener('mousedown', startDraw); canvas.addEventListener('mousemove', draw); canvas.addEventListener('mouseup', stopDraw);
canvas.addEventListener('touchstart', startDraw); canvas.addEventListener('touchmove', draw); canvas.addEventListener('touchend', stopDraw);

document.getElementById('clearBoardBtn').onclick = () => ctx.clearRect(0,0,canvas.width,canvas.height);
document.getElementById('exportBoardToDocBtn').onclick = () => {
    editor.focus(); document.execCommand('insertHTML', false, `<img src="${canvas.toDataURL()}" style="max-width:100%;">`);
    ctx.clearRect(0,0,canvas.width,canvas.height);
};
