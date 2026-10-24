/* ============================================================
   ویژار - منطق اصلی (نسخه کامل و اصلاح شده)
   ============================================================ */
const STORAGE_KEYS = {
    role: 'vizhar_role', docs: 'vizhar_docs', folders: 'vizhar_folders',
    theme: 'vizhar_theme', defaultFontSize: 'vizhar_default_fs',
};

let state = {
    role: null, folders: [], docs: [], activeFolder: 'all',
    activeDoc: null, selectionRange: null, selectedWord: '',
    importMode: 'text' // برای تشخیص اینکه کاربر می‌خواهد متن آپلود کند یا عکس
};

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

/* ---------------- ذخیره‌سازی ---------------- */
function saveState() {
    try {
        localStorage.setItem(STORAGE_KEYS.role, state.role || '');
        localStorage.setItem(STORAGE_KEYS.docs, JSON.stringify(state.docs));
        localStorage.setItem(STORAGE_KEYS.folders, JSON.stringify(state.folders));
    } catch (e) {
        console.error('خطا در ذخیره‌سازی (احتمالا حافظه پر شده است)', e);
    }
}

function loadState() {
    state.role = localStorage.getItem(STORAGE_KEYS.role) || null;
    try {
        state.folders = JSON.parse(localStorage.getItem(STORAGE_KEYS.folders) || '[]');
        state.docs = JSON.parse(localStorage.getItem(STORAGE_KEYS.docs) || '[]');
    } catch(e) { 
        state.folders = []; state.docs = []; 
    }
}

/* ---------------- تم ---------------- */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.theme, theme);
    $$('#themeToggle button').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
}

function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.theme) || 'dark';
    applyTheme(saved);
    $$('#themeToggle button').forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.theme)));
}

/* ---------------- ناوبری ---------------- */
function showRoleView() {
    $('role-view').classList.remove('hidden');
    $('dashboard-view').classList.add('hidden');
    $('editor-view').classList.add('hidden');
    $('backToDashBtn').classList.add('hidden');
    $('importBtn').classList.add('hidden');
    $('exportBtn').classList.add('hidden');
    $('userRoleBadge').classList.add('hidden');
}

function showDashboard() {
    $('role-view').classList.add('hidden');
    $('dashboard-view').classList.remove('hidden');
    $('editor-view').classList.add('hidden');
    $('backToDashBtn').classList.add('hidden');
    $('importBtn').classList.add('hidden');
    $('exportBtn').classList.add('hidden');
    
    $('userRoleBadge').classList.remove('hidden');
    $('userRoleBadge').textContent = state.role === 'teacher' ? 'استاد' : 'دانشجو';
    renderFolders(); 
    renderDocs();
}

function showEditor() {
    $('role-view').classList.add('hidden');
    $('dashboard-view').classList.add('hidden');
    $('editor-view').classList.remove('hidden');
    $('backToDashBtn').classList.remove('hidden');
    $('importBtn').classList.remove('hidden');
    $('exportBtn').classList.remove('hidden');
}

function initRoleSelection() {
    $$('.role-card').forEach(card => {
        card.addEventListener('click', () => {
            state.role = card.dataset.role;
            saveState(); 
            showDashboard();
        });
    });
}

/* ---------------- داشبورد ---------------- */
function renderFolders() {
    const list = $('folderList'); list.innerHTML = '';
    const allItem = document.createElement('li');
    allItem.className = 'folder-list-item' + (state.activeFolder === 'all' ? ' active-folder' : '');
    allItem.innerHTML = '<i class="fa-solid fa-inbox"></i> همه';
    allItem.onclick = () => { state.activeFolder = 'all'; renderFolders(); renderDocs(); };
    list.appendChild(allItem);

    state.folders.forEach(f => {
        const li = document.createElement('li');
        li.className = 'folder-list-item' + (state.activeFolder === f.id ? ' active-folder' : '');
        li.innerHTML = `<i class="fa-solid fa-folder"></i> ${escapeHtml(f.name)}`;
        li.onclick = () => { state.activeFolder = f.id; renderFolders(); renderDocs(); };
        list.appendChild(li);
    });
}

function renderDocs() {
    const grid = $('documentsGrid'); grid.innerHTML = '';
    let docs = state.docs;
    if (state.activeFolder !== 'all') docs = docs.filter(d => d.folderId === state.activeFolder);

    if (docs.length === 0) { 
        $('emptyState').classList.remove('hidden'); 
        return; 
    }
    $('emptyState').classList.add('hidden');

    docs.forEach(d => {
        const card = document.createElement('div');
        card.className = 'doc-card';
        // پیدا کردن اولین عکس داخل متن برای پیش‌نمایش، در غیر این صورت آیکون پیش‌فرض
        let imgHtml = `<i class="fa-regular fa-file-lines"></i>`;
        if (d.content && d.content.includes('<img')) {
            const match = d.content.match(/<img[^>]+src="([^">]+)"/);
            if (match && match[1]) {
                imgHtml = `<img src="${match[1]}" alt="preview" style="object-fit:cover; width:100%; height:100%;">`;
            }
        }
        
        const previewText = d.content ? d.content.replace(/<[^>]+>/g, '').substring(0, 40) + '...' : 'بدون متن';
        card.innerHTML = `
            <div class="doc-card-img">
                ${imgHtml}
            </div>
            <div class="doc-card-body">
                <h3>${escapeHtml(d.title || 'بدون عنوان')}</h3>
                <p>${previewText}</p>
            </div>
        `;
        card.onclick = () => openDoc(d.id);
        grid.appendChild(card);
    });
}

function createDoc() {
    const doc = {
        id: 'doc_' + Date.now(), title: '', content: '',
        folderId: state.activeFolder !== 'all' ? state.activeFolder : null,
        createdAt: Date.now(), updatedAt: Date.now(),
    };
    state.docs.unshift(doc);
    saveState(); openDoc(doc.id);
}

function openDoc(id) {
    state.activeDoc = state.docs.find(d => d.id === id);
    if (!state.activeDoc) return;
    const titleInput = $('documentTitle');
    titleInput.value = state.activeDoc.title || '';
    titleInput.classList.toggle('locked', !!state.activeDoc.title);
    if (state.activeDoc.title) titleInput.setAttribute('readonly', 'readonly');
    else titleInput.removeAttribute('readonly');
    
    $('editor').innerHTML = state.activeDoc.content || '';
    $('textScratchpad').value = state.activeDoc.scratchpad || '';
    
    showEditor(); 
    renderPinnedNotes();
}

/* ---------------- ادیتور ---------------- */
function initEditor() {
    const editor = $('editor');
    const titleInput = $('documentTitle');

    // فرمت‌بندی
    $$('.tool-btn[data-command]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => e.preventDefault());
        btn.addEventListener('click', () => {
            editor.focus(); document.execCommand(btn.dataset.command, false, null);
        });
    });

    // بلاک‌ها (تیترها)
    $$('.tool-btn[data-block]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => e.preventDefault());
        btn.addEventListener('click', () => {
            editor.focus(); document.execCommand('formatBlock', false, btn.dataset.block);
        });
    });

    // قفل عنوان بعد از تایپ
    titleInput.addEventListener('blur', () => {
        if (titleInput.value.trim()) {
            titleInput.setAttribute('readonly', 'readonly');
            if (state.activeDoc) {
                state.activeDoc.title = titleInput.value.trim();
                saveState();
            }
        }
    });
    
    // باز کردن قفل با کلیک راست
    titleInput.addEventListener('contextmenu', (e) => {
        e.preventDefault(); titleInput.removeAttribute('readonly');
        titleInput.focus(); titleInput.select();
    });

    editor.addEventListener('input', () => {
        if (state.activeDoc) { 
            state.activeDoc.content = editor.innerHTML; 
            state.activeDoc.updatedAt = Date.now(); 
        }
    });
    
    $('textScratchpad').addEventListener('input', () => {
        if (state.activeDoc) state.activeDoc.scratchpad = $('textScratchpad').value;
    });

    $('saveDocBtn').addEventListener('click', () => {
        if (state.activeDoc) {
            state.activeDoc.title = titleInput.value.trim();
            state.activeDoc.content = editor.innerHTML;
            state.activeDoc.scratchpad = $('textScratchpad').value;
            saveState(); 
            showToast('ذخیره شد');
        }
    });

    initSelectionTooltip();
    initContextMenu();
}

/* ---------------- تولتیپ و نکات ---------------- */
function initSelectionTooltip() {
    const editor = $('editor');
    const tooltip = $('quickTooltip');
    const popup = $('noteViewPopup');

    document.addEventListener('selectionchange', () => {
        const sel = window.getSelection();
        if (!sel.rangeCount || sel.isCollapsed) { tooltip.classList.add('hidden'); return; }
        const range = sel.getRangeAt(0);
        if (!editor.contains(range.commonAncestorContainer)) { tooltip.classList.add('hidden'); return; }
        const rect = range.getBoundingClientRect();
        
        tooltip.classList.remove('hidden');
        tooltip.style.left = (rect.left + rect.width / 2) + 'px';
        tooltip.style.top = (rect.top - 45) + 'px'; 
        
        state.selectionRange = range.cloneRange();
        state.selectedWord = sel.toString().trim();
    });

    $('quickAddNoteBtn').addEventListener('click', () => {
        if (!state.selectedWord) return;
        $('selectedWordDisplay').textContent = state.selectedWord;
        $('noteInput').value = '';
        $('noteModal').classList.add('show');
        tooltip.classList.add('hidden');
    });

    // هاور روی متن‌های نکته‌دار (باز شدن بالای متن)
    editor.addEventListener('mouseover', (e) => {
        const el = e.target.closest('.hl-word');
        if (el && el.dataset.note) {
            $('noteViewContent').textContent = el.dataset.note;
            const rect = el.getBoundingClientRect();
            popup.style.left = (rect.left - 20) + 'px';
            popup.style.top = (rect.top - 80) + 'px';
            popup.classList.remove('hidden');
            requestAnimationFrame(() => popup.classList.add('show'));
        }
    });
    
    editor.addEventListener('mouseout', (e) => {
        if (e.target.closest('.hl-word')) {
            popup.classList.remove('show');
            setTimeout(() => { if(!popup.classList.contains('show')) popup.classList.add('hidden'); }, 300);
        }
    });
}

function initNoteModal() {
    $$('#labelColorOptions .color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            $$('#labelColorOptions .color-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
        });
    });

    $('saveNoteBtn').addEventListener('click', () => {
        const note = $('noteInput').value.trim();
        if (!note || !state.selectionRange) return;
        const color = document.querySelector('#labelColorOptions .color-dot.active').dataset.color;
        const pinned = $('pinNoteCheck').checked;

        const span = document.createElement('span');
        span.className = `hl-word hl-${color}`;
        span.dataset.note = note;
        if (pinned) span.dataset.pinned = '1';

        try { 
            state.selectionRange.surroundContents(span); 
        } catch (e) {
            const contents = state.selectionRange.extractContents();
            span.appendChild(contents); 
            state.selectionRange.insertNode(span);
        }

        if (state.activeDoc) { 
            state.activeDoc.content = $('editor').innerHTML; 
            saveState(); 
        }
        if (pinned) renderPinnedNotes();
        $('noteModal').classList.remove('show');
        window.getSelection().removeAllRanges();
    });
}

function renderPinnedNotes() {
    const area = $('pinnedNotesArea'); area.innerHTML = '';
    if (!state.activeDoc) return;
    const temp = document.createElement('div');
    temp.innerHTML = state.activeDoc.content || '';
    temp.querySelectorAll('.hl-word[data-pinned="1"]').forEach(el => {
        const card = document.createElement('div');
        card.style.cssText = 'background:rgba(0,0,0,0.1); padding:12px; border-radius:10px; margin-bottom:8px; border-right:3px solid var(--accent-gold); font-size:.85rem;';
        card.textContent = el.dataset.note;
        area.appendChild(card);
    });
}

/* ---------------- منوی فونت، رنگ و راست‌کلیک ---------------- */
function initFontDropdowns() {
    const setupDD = (id, callback) => {
        const dd = $(id);
        dd.querySelector('.dropdown-selected').onclick = (e) => { e.stopPropagation(); dd.classList.toggle('active'); };
        dd.querySelectorAll('.dropdown-item').forEach(item => {
            item.onclick = () => {
                callback(item.dataset.value, item.textContent);
                dd.querySelector('.dropdown-selected').childNodes[0].nodeValue = item.textContent + ' ';
                dd.classList.remove('active');
            };
        });
    };
    setupDD('fontDropdown', (val) => { $('editor').focus(); document.execCommand('fontName', false, val); });
    setupDD('sizeDropdown', (val) => {
        $('editor').focus();
        document.execCommand('fontSize', false, '7');
        $('editor').querySelectorAll('font[size="7"]').forEach(el => { el.removeAttribute('size'); el.style.fontSize = val + 'px'; });
    });

    // پالت رنگ متن
    const colorBtn = $('textColorBtn'), colorPopup = $('colorPopup');
    colorBtn.onclick = (e) => { e.stopPropagation(); colorPopup.classList.toggle('show'); };
    colorPopup.querySelectorAll('.color-swatch').forEach(sw => {
        sw.onclick = () => { $('editor').focus(); document.execCommand('foreColor', false, sw.style.backgroundColor); colorPopup.classList.remove('show'); };
    });
    $('nativeColorPicker').oninput = (e) => { $('editor').focus(); document.execCommand('foreColor', false, e.target.value); };

    // بستن منوها
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown')) $$('.custom-dropdown').forEach(d => d.classList.remove('active'));
        if (!e.target.closest('.color-menu-wrapper')) $$('.custom-color-popup').forEach(p => p.classList.remove('show'));
    });
}

function initContextMenu() {
    const menu = $('customContextMenu');
    $('editor').addEventListener('contextmenu', (e) => {
        e.preventDefault(); menu.classList.remove('hidden');
        menu.style.left = e.pageX + 'px'; menu.style.top = e.pageY + 'px';
    });
    document.addEventListener('click', () => menu.classList.add('hidden'));
    
    $('menuCopy').onclick = () => { document.execCommand('copy'); menu.classList.add('hidden'); };
    $('menuCut').onclick = () => { document.execCommand('cut'); menu.classList.add('hidden'); };
    $('menuPaste').onclick = async () => { 
        try {
            const text = await navigator.clipboard.readText();
            document.execCommand('insertText', false, text);
        } catch(e) { showToast('مرورگر اجازه دسترسی به کلیپ‌بورد را نداد'); }
        menu.classList.add('hidden'); 
    };
    $('menuBold').onclick = () => { document.execCommand('bold'); menu.classList.add('hidden'); };
    $('menuItalic').onclick = () => { document.execCommand('italic'); menu.classList.add('hidden'); };
}

/* ---------------- آپلود/ایمپورت مدیا ---------------- */
function initImport() {
    $('importBtn').onclick = () => $('importModal').classList.add('show');
    
    $('importAsTextBtn').onclick = () => {
        state.importMode = 'text';
        $('fileInput').accept = '.txt,.md,.html';
        $('fileInput').click();
    };

    $('importAsMediaBtn').onclick = () => {
        state.importMode = 'media';
        $('fileInput').accept = 'image/*';
        $('fileInput').click();
    };

    $('fileInput').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const editor = $('editor');
            editor.focus();

            if (state.importMode === 'text') {
                const text = event.target.result;
                const paragraphs = text.split('\n').filter(p=>p.trim()).map(p => `<p>${escapeHtml(p)}</p>`).join('');
                document.execCommand('insertHTML', false, paragraphs);
            } else if (state.importMode === 'media' && file.type.startsWith('image/')) {
                const imgHtml = `<img src="${event.target.result}" style="max-width: 100%; border-radius: 12px; margin: 10px 0;">`;
                document.execCommand('insertHTML', false, imgHtml);
            }

            if (state.activeDoc) {
                state.activeDoc.content = editor.innerHTML;
                saveState();
            }

            $('fileInput').value = ''; // ریست کردن اینپوت
            $('importModal').classList.remove('show');
            showToast('با موفقیت اضافه شد');
        };

        if (state.importMode === 'text') {
            reader.readAsText(file);
        } else {
            reader.readAsDataURL(file);
        }
    };
}

/* ---------------- بوم (Canvas) - کالیبره شده ---------------- */
function initCanvas() {
    const canvas = $('scratchpadCanvas');
    const ctx = canvas.getContext('2d');
    const cursor = $('brushCursor');
    const container = canvas.parentElement;

    let drawing = false, tool = 'pencil', currentColor = '#00A693', brushSize = 3;
    let points = [], startPos = null, snapshot = null;

    // کالیبراسیون دقیق بوم
    function resizeCanvas() {
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        
        // بازیابی نقاشی قبلی اگر وجود داشته باشد
        if (state.activeDoc && state.activeDoc.board) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
            img.src = state.activeDoc.board;
        }
    }
    setTimeout(resizeCanvas, 100);
    window.addEventListener('resize', resizeCanvas);

    function getPos(e) {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function setupBrush() {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (tool === 'highlighter') { ctx.strokeStyle = currentColor; ctx.globalAlpha = 0.3; ctx.lineWidth = 15; ctx.globalCompositeOperation = 'source-over'; }
        else if (tool === 'eraser') { ctx.strokeStyle = 'rgba(0,0,0,1)'; ctx.globalAlpha = 1; ctx.lineWidth = 20; ctx.globalCompositeOperation = 'destination-out'; }
        else { ctx.strokeStyle = currentColor; ctx.globalAlpha = 1; ctx.lineWidth = brushSize; ctx.globalCompositeOperation = 'source-over'; }
    }

    function drawSmooth() {
        if (points.length < 3) return;
        const p1 = points[points.length - 3], p2 = points[points.length - 2], p3 = points[points.length - 1];
        const m1 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const m2 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };
        ctx.beginPath(); ctx.moveTo(m1.x, m1.y); ctx.quadraticCurveTo(p2.x, p2.y, m2.x, m2.y); ctx.stroke();
    }

    canvas.addEventListener('pointerenter', () => cursor.style.display = 'block');
    canvas.addEventListener('pointerleave', () => { cursor.style.display = 'none'; drawing = false; });
    
    canvas.addEventListener('pointermove', (e) => {
        const size = tool === 'eraser' || tool === 'highlighter' ? (tool==='eraser'?20:15) : brushSize;
        cursor.style.width = size + 'px'; cursor.style.height = size + 'px';
        cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
        if (!drawing) return;
        
        const pos = getPos(e);
        if (['pencil', 'highlighter', 'eraser'].includes(tool)) { points.push(pos); drawSmooth(); }
        else if (tool === 'line') {
            ctx.clearRect(0, 0, canvas.width, canvas.height); 
            if (snapshot) ctx.putImageData(snapshot, 0, 0);
            setupBrush(); ctx.beginPath(); ctx.moveTo(startPos.x, startPos.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
        } else if (tool === 'rect') {
            ctx.clearRect(0, 0, canvas.width, canvas.height); 
            if (snapshot) ctx.putImageData(snapshot, 0, 0);
            setupBrush(); ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
        } else if (tool === 'circle') {
            ctx.clearRect(0, 0, canvas.width, canvas.height); 
            if (snapshot) ctx.putImageData(snapshot, 0, 0);
            setupBrush(); const rx = Math.abs(pos.x - startPos.x) / 2, ry = Math.abs(pos.y - startPos.y) / 2;
            ctx.beginPath(); ctx.ellipse((startPos.x + pos.x) / 2, (startPos.y + pos.y) / 2, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
        }
    });

    canvas.addEventListener('pointerdown', (e) => {
        drawing = true; const pos = getPos(e); points = [pos]; startPos = pos;
        snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height); setupBrush();
        if (['pencil', 'highlighter', 'eraser'].includes(tool)) {
            ctx.beginPath(); ctx.arc(pos.x, pos.y, (tool === 'eraser' || tool === 'highlighter' ? (tool==='eraser'?10:7) : brushSize/2), 0, Math.PI * 2);
            ctx.fillStyle = ctx.strokeStyle; ctx.fill();
        }
    });

    canvas.addEventListener('pointerup', () => {
        drawing = false; points = [];
        if (state.activeDoc) state.activeDoc.board = canvas.toDataURL();
    });

    // ابزارها
    $$('.board-tool[data-tool]').forEach(btn => {
        btn.onclick = () => {
            if (btn.classList.contains('active') && btn.dataset.tool === 'pencil') {
                $('pencilSettings').classList.toggle('show');
            } else {
                $('pencilSettings').classList.remove('show');
                $$('.board-tool[data-tool]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active'); tool = btn.dataset.tool;
            }
        };
    });
    
    if($('brushSize')) $('brushSize').oninput = (e) => { brushSize = e.target.value; };

    // رنگ بوم
    if($('boardColorBtn')) {
        $('boardColorBtn').onclick = (e) => { e.stopPropagation(); $('boardColorPopup').classList.toggle('show'); };
        $$('#boardColorPopup .color-swatch').forEach(sw => {
            sw.onclick = () => { currentColor = sw.style.backgroundColor; $('boardColorPopup').classList.remove('show'); };
        });
        $('boardColor').oninput = (e) => currentColor = e.target.value;
    }
    $('clearBoardBtn').onclick = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); };

    // ارسال به جزوه
    $('exportBoardToDocBtn').onclick = () => {
        const img = document.createElement('img');
        img.src = canvas.toDataURL(); 
        img.style.maxWidth = '100%'; img.style.borderRadius = '12px'; img.style.margin = '10px 0';
        $('editor').appendChild(img);
        if (state.activeDoc) { state.activeDoc.content = $('editor').innerHTML; saveState(); }
        showToast('تصویر بوم اضافه شد');
    };
}

/* ---------------- مودال‌ها و تنظیمات ---------------- */
function initModals() {
    $$('.btn-close-modal').forEach(btn => btn.onclick = () => btn.closest('.modal').classList.remove('show'));
    $$('.modal').forEach(modal => { modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('show'); }; });
}

function initSettings() {
    $('resetRoleBtn').onclick = () => { 
        state.role = null; localStorage.removeItem(STORAGE_KEYS.role); 
        $('settingsModal').classList.remove('show'); showRoleView(); 
    };
    $('clearDataBtn').onclick = () => { 
        if (confirm('تمام اطلاعات حذف شود؟')) { localStorage.clear(); location.reload(); } 
    };
}

function exportDoc(format) {
    const doc = state.activeDoc; if (!doc) return;
    const content = `<div dir="rtl" style="font-family:'Estedad',sans-serif; padding:30px;"><h1 style="color:#00A693;">${doc.title || 'بدون عنوان'}</h1>${doc.content || ''}</div>`;
    
    if (format === 'pdf') {
        const temp = document.createElement('div'); temp.innerHTML = content;
        temp.style.cssText = 'position:fixed;left:-9999px;width:800px;background:#fff;color:#000;'; document.body.appendChild(temp);
        html2pdf().set({ margin: 10, filename: (doc.title||'vizhar') + '.pdf', html2canvas: { scale: 2 } }).from(temp).save().then(() => temp.remove());
    } else {
        const blob = new Blob([content], { type: 'application/msword' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (doc.title||'vizhar') + '.doc'; a.click();
    }
    $('exportModal').classList.remove('show');
}

function showToast(msg) {
    const t = document.createElement('div'); t.textContent = msg;
    t.style.cssText = `position:fixed; bottom:30px; left:50%; transform:translateX(-50%); background:var(--accent-persian); color:#fff; padding:10px 20px; border-radius:12px; z-index:99999; font-family:'Estedad'; box-shadow:0 4px 15px rgba(0,0,0,0.3);`;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 2000);
}

function escapeHtml(str) { return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

/* ---------------- راه‌اندازی نهایی ---------------- */
function init() {
    loadState(); 
    initTheme(); 
    initRoleSelection(); 
    initEditor();
    initFontDropdowns(); 
    initNoteModal(); 
    initCanvas(); 
    initModals(); 
    initSettings();
    initImport(); // اجرای تابع آپلود مدیا

    // دکمه‌های ناوبری
    $('backToDashBtn').onclick = () => {
        if (state.activeDoc) {
            state.activeDoc.content = $('editor').innerHTML;
            state.activeDoc.title = $('documentTitle').value.trim();
            saveState();
        }
        showDashboard();
    };
    
    $('createNewDocBtn').onclick = createDoc;
    $('settingsBtn').onclick = () => $('settingsModal').classList.add('show');
    $('addFolderBtn').onclick = () => $('addFolderModal').classList.add('show');
    
    $('confirmAddFolderBtn').onclick = () => {
        const name = $('newFolderName').value.trim(); if (!name) return;
        state.folders.push({ id: 'f_' + Date.now(), name });
        saveState(); $('newFolderName').value = ''; $('addFolderModal').classList.remove('show'); renderFolders();
    };

    $('exportBtn').onclick = () => $('exportModal').classList.add('show');
    $('exportWordBtn').onclick = () => exportDoc('word');
    $('exportPdfBtn').onclick = () => exportDoc('pdf');

    // شروع
    if (state.role) showDashboard(); else showRoleView();
}

document.addEventListener('DOMContentLoaded', init);
