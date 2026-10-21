// پایگاه داده لوکال
let db = JSON.parse(localStorage.getItem('vijarAppV5')) || { docs: [], folders: [], notes: {}, role: null, scratch: '' };
let currentDocId = null;
let currentFolderId = 'all';

const views = { role: document.getElementById('role-view'), dash: document.getElementById('dashboard-view'), edit: document.getElementById('editor-view') };
const editor = document.getElementById('editor');

// --- 1. مدیریت ورود و نقش‌ها ---
if(db.role) initApp();
document.querySelectorAll('.role-card').forEach(card => card.onclick = () => { db.role = card.dataset.role; saveDB(); initApp(); });

function initApp() {
    showView('dash');
    document.getElementById('userRoleBadge').textContent = db.role === 'teacher' ? 'استاد' : 'دانشجو';
    document.getElementById('textScratchpad').value = db.scratch || '';
    renderFolders();
    renderDashboard();
}

function showView(viewId) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewId].classList.remove('hidden');
    
    // نمایش دکمه‌های هدر فقط در صفحه ویرایشگر
    document.getElementById('backToDashBtn').classList.toggle('hidden', viewId !== 'edit');
    document.getElementById('importBtn').classList.toggle('hidden', viewId !== 'edit');
    document.getElementById('exportBtn').classList.toggle('hidden', viewId !== 'edit');
}
function saveDB() { localStorage.setItem('vijarAppV5', JSON.stringify(db)); }

// --- 2. مدیریت دسته‌بندی‌ها ---
function renderFolders() {
    const list = document.getElementById('folderList');
    list.innerHTML = `<li data-id="all" class="${currentFolderId === 'all' ? 'active-folder' : ''}"><i class="fa-solid fa-folder-open"></i> همه جزوه‌ها</li>`;
    db.folders.forEach(f => {
        list.innerHTML += `<li data-id="${f.id}" class="${currentFolderId === f.id ? 'active-folder' : ''}"><i class="fa-solid fa-folder"></i> ${f.name}</li>`;
    });
    // اعمال رویداد کلیک برای فیلتر کردن
    document.querySelectorAll('#folderList li').forEach(li => li.onclick = (e) => {
        currentFolderId = e.currentTarget.dataset.id; 
        renderFolders(); 
        renderDashboard();
    });
}

document.getElementById('addFolderBtn').onclick = () => document.getElementById('addFolderModal').classList.add('show');
document.getElementById('confirmAddFolderBtn').onclick = () => {
    const name = document.getElementById('newFolderName').value.trim();
    if(name) { 
        db.folders.push({id: 'folder_'+Date.now(), name}); 
        saveDB(); renderFolders(); 
        document.getElementById('newFolderName').value = ''; 
        document.getElementById('addFolderModal').classList.remove('show'); 
    }
};

// --- 3. داشبورد و فایل‌ها ---
function renderDashboard() {
    const grid = document.getElementById('documentsGrid');
    const emptyState = document.getElementById('emptyState');
    grid.innerHTML = '';
    
    let filtered = currentFolderId === 'all' ? db.docs : db.docs.filter(d => d.folderId === currentFolderId);
    if(filtered.length === 0) {
        emptyState.classList.remove('hidden'); 
        grid.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden'); 
        grid.classList.remove('hidden');
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
    editor.innerHTML = ''; 
    editor.style.fontFamily = "'Vazirmatn', sans-serif";
    document.querySelector('.dropdown-selected').innerHTML = 'انتخاب فونت <i class="fa-solid fa-chevron-down"></i>';
    showView('edit'); 
};
document.getElementById('backToDashBtn').onclick = () => { showView('dash'); renderDashboard(); };

// --- 4. ویرایشگر و نوار ابزار ---
// ذخیره خودکار چکنویس تایپی
document.getElementById('textScratchpad').oninput = (e) => { db.scratch = e.target.value; saveDB(); };

// دراپ‌داون فونت‌ها
const fontDrop = document.getElementById('fontDropdown');
fontDrop.onclick = (e) => fontDrop.classList.toggle('active');
document.addEventListener('click', (e) => { if(!fontDrop.contains(e.target)) fontDrop.classList.remove('active'); });

document.querySelectorAll('.dropdown-item').forEach(item => item.onclick = (e) => {
    editor.style.fontFamily = `'${e.target.dataset.value}', sans-serif`;
    document.querySelector('.dropdown-selected').innerHTML = `${e.target.textContent} <i class="fa-solid fa-chevron-down"></i>`;
});

// دکمه‌های ابزار (برجسته شدن هنگام کلیک)
const formatBtns = document.querySelectorAll('.toggle-tool');
formatBtns.forEach(btn => btn.onmousedown = (e) => { 
    e.preventDefault(); 
    document.execCommand(btn.dataset.command, false, null); 
    checkActiveTools(); 
});
editor.addEventListener('keyup', checkActiveTools); 
editor.addEventListener('mouseup', checkActiveTools);

function checkActiveTools() {
    formatBtns.forEach(btn => {
        if (document.queryCommandState(btn.dataset.command)) {
            btn.classList.add('active-tool');
        } else {
            btn.classList.remove('active-tool');
        }
    });
}
document.querySelectorAll('.tool-btn[data-command]:not(.toggle-tool)').forEach(btn => btn.onmousedown = (e) => { e.preventDefault(); document.execCommand(btn.dataset.command, false, null); });

// پاپ‌آپ پالت رنگ سفارشی
const colorBtn = document.getElementById('textColorBtn');
const colorPopup = document.getElementById('colorPopup');
colorBtn.onclick = () => colorPopup.classList.toggle('hidden');
document.addEventListener('click', (e) => { if(!e.target.closest('.color-menu-wrapper')) colorPopup.classList.add('hidden'); });

function applyColor(c) { document.execCommand('foreColor', false, c); colorPopup.classList.add('hidden'); }
document.querySelectorAll('.color-swatch').forEach(sw => sw.onclick = () => applyColor(sw.dataset.color));
document.getElementById('nativeColorPicker').oninput = (e) => applyColor(e.target.value);

// ذخیره جزوه
document.getElementById('saveDocBtn').onclick = () => {
    if(!currentDocId) return;
    const docData = { 
        id: currentDocId, 
        title: document.getElementById('documentTitle').value, 
        content: editor.innerHTML, 
        folderId: currentFolderId === 'all' ? (db.folders[0]?.id || 'all') : currentFolderId, 
        font: editor.style.fontFamily 
    };
    const idx = db.docs.findIndex(d => d.id === currentDocId);
    idx > -1 ? db.docs[idx] = docData : db.docs.push(docData);
    saveDB();
    const icon = document.querySelector('#saveDocBtn i'); 
    icon.className = 'fa-solid fa-check'; 
    setTimeout(() => icon.className = 'fa-solid fa-floppy-disk', 1000);
};

function loadDoc(id) {
    const doc = db.docs.find(d => d.id === id);
    if(doc) {
        currentDocId = doc.id; 
        document.getElementById('documentTitle').value = doc.title; 
        editor.innerHTML = doc.content;
        if(doc.font) { 
            editor.style.fontFamily = doc.font; 
            document.querySelector('.dropdown-selected').innerHTML = `فونت اعمال شد <i class="fa-solid fa-chevron-down"></i>`; 
        }
        showView('edit'); 
        bindNoteHover(); 
        renderPinnedNotes();
    }
}

// --- 5. تولتیپ و یادداشت‌گذاری ---
const quickTooltip = document.getElementById('quickTooltip');
let lastRange = null;

// نمایش تولتیپ هنگام انتخاب متن
editor.addEventListener('mouseup', (e) => {
    const sel = window.getSelection();
    if(sel.toString().trim().length > 0) {
        lastRange = sel.getRangeAt(0); 
        const rect = lastRange.getBoundingClientRect();
        quickTooltip.style.left = `${rect.left + (rect.width/2)}px`; 
        quickTooltip.style.top = `${rect.top - 40}px`;
        quickTooltip.classList.remove('hidden');
    } else { 
        quickTooltip.classList.add('hidden'); 
    }
});
document.addEventListener('mousedown', (e) => { if(!e.target.closest('#quickTooltip') && !e.target.closest('#editor')) quickTooltip.classList.add('hidden'); });

const noteModal = document.getElementById('noteModal');
let currentWordId = null;

document.getElementById('quickAddNoteBtn').onclick = () => {
    if(lastRange) {
        window.getSelection().removeAllRanges(); 
        window.getSelection().addRange(lastRange);
        const text = window.getSelection().toString().trim();
        currentWordId = 'word_' + Date.now();
        const span = document.createElement('span'); 
        span.id = currentWordId; 
        span.className = 'hl-word hl-yellow'; 
        span.textContent = text;
        document.execCommand('insertHTML', false, span.outerHTML);
        document.getElementById('selectedWordDisplay').textContent = text; 
        document.getElementById('noteInput').value = '';
        noteModal.classList.add('show'); 
        quickTooltip.classList.add('hidden');
    }
};

let selectedLabelColor = 'yellow';
document.querySelectorAll('.color-dot').forEach(dot => dot.onclick = (e) => {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    e.target.classList.add('active'); 
    selectedLabelColor = e.target.dataset.color;
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
    const area = document.getElementById('pinnedNotesArea'); 
    area.innerHTML = '';
    Object.values(db.notes).forEach(n => {
        if(n.isPinned) {
            let col = n.color==='yellow'?'#EAB308':n.color==='blue'?'#3B82F6':n.color==='green'?'#10B981':'#EF4444';
            area.innerHTML += `<div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:12px; margin-bottom:12px; border-right:3px solid ${col};"><strong style="color:${col}; font-size:0.9rem">${n.word}:</strong><p style="margin-top:5px; font-size:0.9rem; color:var(--text-muted);">${n.text}</p></div>`;
        }
    });
}

// هاور انیمیشنی روی کلمات
const notePopup = document.getElementById('noteViewPopup');
function bindNoteHover() {
    document.querySelectorAll('.hl-word').forEach(word => {
        word.onmouseenter = (e) => {
            const noteData = db.notes[word.id];
            if(noteData) {
                document.getElementById('noteViewContent').textContent = noteData.text;
                const rect = word.getBoundingClientRect(); 
                notePopup.style.left = `${rect.right + 15}px`; 
                notePopup.style.top = `${rect.top}px`;
                notePopup.classList.remove('hidden'); 
                setTimeout(() => notePopup.classList.add('show'), 10);
            }
        };
        word.onmouseleave = () => { 
            notePopup.classList.remove('show'); 
            setTimeout(() => notePopup.classList.add('hidden'), 300); 
        };
    });
}

// --- 6. منوی راست‌کلیک پیشرفته ---
const ctxMenu = document.getElementById('customContextMenu');
editor.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if(window.getSelection().toString().trim().length > 0) lastRange = window.getSelection().getRangeAt(0);
    ctxMenu.style.left = `${e.clientX}px`; 
    ctxMenu.style.top = `${e.clientY}px`; 
    ctxMenu.classList.remove('hidden');
});
document.addEventListener('click', (e) => { if(!e.target.closest('#customContextMenu')) ctxMenu.classList.add('hidden'); });

document.getElementById('menuCopy').onclick = () => { document.execCommand('copy'); ctxMenu.classList.add('hidden'); };
document.getElementById('menuCut').onclick = () => { document.execCommand('cut'); ctxMenu.classList.add('hidden'); };
document.getElementById('menuPaste').onclick = async () => { const text = await navigator.clipboard.readText(); document.execCommand('insertText', false, text); ctxMenu.classList.add('hidden'); };
document.getElementById('menuBold').onclick = () => { if(lastRange) { window.getSelection().addRange(lastRange); document.execCommand('bold'); ctxMenu.classList.add('hidden'); } };
document.getElementById('menuItalic').onclick = () => { if(lastRange) { window.getSelection().addRange(lastRange); document.execCommand('italic'); ctxMenu.classList.add('hidden'); } };

// --- 7. تخته رسم (وایت‌برد هوشمند با اشکال) ---
const canvas = document.getElementById('scratchpadCanvas'); 
const ctx = canvas.getContext('2d');
let drawing = false; 
let cTool = 'pencil'; 
let startX, startY; 
let snapshot;

const setCursor = () => {
    if(cTool==='eraser') canvas.style.cursor = 'cell';
    else if(['rect','circle','line'].includes(cTool)) canvas.style.cursor = 'crosshair';
    else canvas.style.cursor = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZdEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjbQg61aAAAADUlEQVQYV2P4//8/AwAI/AL+X6MwWAAAAABJRU5ErkJggg==) 0 0, auto';
}; 
setCursor();

document.querySelectorAll('.board-tool[data-tool]').forEach(btn => btn.onclick = () => {
    document.querySelectorAll('.board-tool[data-tool]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); 
    cTool = btn.dataset.tool; 
    setCursor();
});

const getPos = (e) => { 
    const r = canvas.getBoundingClientRect(); 
    return { x: (e.clientX || e.touches[0].clientX) - r.left, y: (e.clientY || e.touches[0].clientY) - r.top }; 
};

const startDraw = (e) => { 
    e.preventDefault(); 
    drawing = true; 
    const pos = getPos(e); 
    startX = pos.x; 
    startY = pos.y; 
    ctx.beginPath(); 
    ctx.moveTo(startX, startY); 
    snapshot = ctx.getImageData(0,0,canvas.width,canvas.height); 
};

const draw = (e) => {
    if(!drawing) return; 
    e.preventDefault(); 
    const pos = getPos(e);
    
    // بازگردانی اسنپ‌شات قبلی برای رسم اشکال هندسی تا روی هم نیفتند
    ctx.putImageData(snapshot, 0, 0);
    
    ctx.strokeStyle = document.getElementById('boardColor').value;
    ctx.lineWidth = cTool === 'highlighter' ? 15 : 2; 
    ctx.lineCap = 'round'; 
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = cTool === 'eraser' ? 'destination-out' : 'source-over';
    
    if(cTool === 'eraser') { 
        ctx.lineWidth = 20; 
        ctx.lineTo(pos.x, pos.y); 
        ctx.stroke(); 
        snapshot = ctx.getImageData(0,0,canvas.width,canvas.height); 
    }
    else if(['pencil','highlighter'].includes(cTool)) {
        if(cTool === 'highlighter') ctx.globalAlpha = 0.3;
        ctx.lineTo(pos.x, pos.y); 
        ctx.stroke(); 
        ctx.globalAlpha = 1.0;
        snapshot = ctx.getImageData(0,0,canvas.width,canvas.height);
    }
    else if (cTool === 'rect') ctx.strokeRect(startX, startY, pos.x - startX, pos.y - startY);
    else if (cTool === 'circle') { ctx.beginPath(); ctx.arc(startX, startY, Math.abs(pos.x - startX), 0, 2 * Math.PI); ctx.stroke(); }
    else if (cTool === 'line') { ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
};

const stopDraw = () => drawing = false;

canvas.addEventListener('mousedown', startDraw); 
canvas.addEventListener('mousemove', draw); 
canvas.addEventListener('mouseup', stopDraw);
canvas.addEventListener('touchstart', startDraw); 
canvas.addEventListener('touchmove', draw); 
canvas.addEventListener('touchend', stopDraw);

document.getElementById('clearBoardBtn').onclick = () => ctx.clearRect(0,0,canvas.width,canvas.height);
document.getElementById('exportBoardToDocBtn').onclick = () => {
    editor.focus(); 
    document.execCommand('insertHTML', false, `<img src="${canvas.toDataURL()}" style="max-width:100%; border-radius: 8px;">`);
    ctx.clearRect(0,0,canvas.width,canvas.height);
};

// --- 8. مودال‌ها و بارگذاری فایل‌ها ---
document.querySelectorAll('.btn-close-modal').forEach(b => b.onclick = () => document.querySelectorAll('.modal').forEach(m => m.classList.remove('show')));
document.getElementById('importBtn').onclick = () => document.getElementById('importModal').classList.add('show');
document.getElementById('exportBtn').onclick = () => document.getElementById('exportModal').classList.add('show');
document.getElementById('settingsBtn').onclick = () => document.getElementById('settingsModal').classList.add('show');

const fileIn = document.getElementById('fileInput');
document.getElementById('importAsTextBtn').onclick = () => fileIn.click();
document.getElementById('importAsMediaBtn').onclick = () => fileIn.click();
fileIn.onchange = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    if(file.type.startsWith('image/')) {
        reader.onload = (ev) => { editor.focus(); document.execCommand('insertImage', false, ev.target.result); document.getElementById('importModal').classList.remove('show'); };
        reader.readAsDataURL(file);
    } else {
        reader.onload = (ev) => { editor.focus(); document.execCommand('insertText', false, ev.target.result); document.getElementById('importModal').classList.remove('show'); };
        reader.readAsText(file);
    }
    fileIn.value = '';
};

// خروجی گرفتن
window.exportDoc = (type) => {
    const title = document.getElementById('documentTitle').value || 'جزوه_ویژار';
    if(type === 'word') {
        const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'></head><body style="direction:rtl; font-family:tahoma;">${editor.innerHTML}</body></html>`;
        const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
        const a = document.createElement('a'); a.href = url; a.download = title+'.doc'; a.click();
    } else if (type === 'pdf') {
        html2pdf().set({ margin: 1, filename: title+'.pdf', html2canvas: { scale: 2 } }).from(editor).save();
    } else if (type === 'image') {
        html2canvas(editor).then(canvas => { const a = document.createElement('a'); a.href = canvas.toDataURL(); a.download = title+'.png'; a.click(); });
    }
    document.getElementById('exportModal').classList.remove('show');
};
