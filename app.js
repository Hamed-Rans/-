/* ============================================================
   ویژار - منطق اصلی اپلیکیشن
   ============================================================ */

/* ---------- State ---------- */
const STORAGE_KEYS = {
    role: 'vizhar_role',
    docs: 'vizhar_docs',
    folders: 'vizhar_folders',
    theme: 'vizhar_theme',
    defaultFontSize: 'vizhar_default_fs',
};

let state = {
    role: null,
    folders: [],
    docs: [],
    activeFolder: 'all',
    activeDoc: null,
    selectionRange: null,
    selectedWord: '',
};

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

/* ============================================================
   ذخیره‌سازی
   ============================================================ */
function saveState() {
    localStorage.setItem(STORAGE_KEYS.role, state.role || '');
    localStorage.setItem(STORAGE_KEYS.docs, JSON.stringify(state.docs));
    localStorage.setItem(STORAGE_KEYS.folders, JSON.stringify(state.folders));
}
function loadState() {
    state.role = localStorage.getItem(STORAGE_KEYS.role) || null;
    try {
        state.folders = JSON.parse(localStorage.getItem(STORAGE_KEYS.folders) || '[]');
        state.docs = JSON.parse(localStorage.getItem(STORAGE_KEYS.docs) || '[]');
    } catch(e) { state.folders = []; state.docs = []; }
}

/* ============================================================
   تم
   ============================================================ */
const DARK_SWATCHES = ['#F8FAFC', '#EF4444', '#3B82F6', '#10B981', '#F59E0B'];
const LIGHT_SWATCHES = ['#0F172A', '#DC2626', '#2563EB', '#059669', '#D97706'];

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.theme, theme);
    $$('#themeToggle button').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
    updateSwatches(theme);
}
function updateSwatches(theme) {
    const colors = theme === 'light' ? LIGHT_SWATCHES : DARK_SWATCHES;
    $$('.color-swatch').forEach((el, i) => {
        el.style.background = colors[i];
        el.dataset.color = colors[i];
    });
}
function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.theme) || 'dark';
    applyTheme(saved);
    $$('#themeToggle button').forEach(b => {
        b.addEventListener('click', () => applyTheme(b.dataset.theme));
    });
}

/* ============================================================
   انتخاب نقش
   ============================================================ */
function showRoleView() {
    $('role-view').classList.remove('hidden');
    $('dashboard-view').classList.add('hidden');
    $('editor-view').classList.add('hidden');
    $('backToDashBtn').classList.add('hidden');
    $('importBtn').classList.add('hidden');
    $('exportBtn').classList.add('hidden');
}
function showDashboard() {
    $('role-view').classList.add('hidden');
    $('dashboard-view').classList.remove('hidden');
    $('editor-view').classList.add('hidden');
    $('backToDashBtn').classList.add('hidden');
    $('importBtn').classList.add('hidden');
    $('exportBtn').classList.add('hidden');
    renderFolders();
    renderDocs();
    $('userRoleBadge').textContent = state.role === 'teacher' ? 'استاد' : 'دانشجو';
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

/* ============================================================
   داشبورد
   ============================================================ */
function renderFolders() {
    const list = $('folderList');
    list.innerHTML = '';
    const allItem = document.createElement('li');
    allItem.className = 'folder-list-item' + (state.activeFolder === 'all' ? ' active-folder' : '');
    allItem.dataset.id = 'all';
    allItem.innerHTML = '<i class="fa-solid fa-inbox"></i> همه';
    allItem.addEventListener('click', () => { state.activeFolder = 'all'; renderFolders(); renderDocs(); });
    list.appendChild(allItem);

    state.folders.forEach(f => {
        const li = document.createElement('li');
        li.className = 'folder-list-item' + (state.activeFolder === f.id ? ' active-folder' : '');
        li.dataset.id = f.id;
        li.innerHTML = `<i class="fa-solid fa-folder"></i> ${escapeHtml(f.name)}`;
        li.addEventListener('click', () => {
            state.activeFolder = f.id; renderFolders(); renderDocs();
        });
        list.appendChild(li);
    });
}

function renderDocs() {
    const grid = $('documentsGrid');
    grid.innerHTML = '';
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
        card.innerHTML = `
            <h3>${escapeHtml(d.title || 'بدون عنوان')}</h3>
            <p>${new Date(d.updatedAt).toLocaleDateString('fa-IR')}</p>
        `;
        card.addEventListener('click', () => openDoc(d.id));
        grid.appendChild(card);
    });
}

function createDoc() {
    const doc = {
        id: 'doc_' + Date.now(),
        title: '',
        content: '',
        folderId: state.activeFolder !== 'all' ? state.activeFolder : null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    state.docs.unshift(doc);
    saveState();
    openDoc(doc.id);
}

function openDoc(id) {
    state.activeDoc = state.docs.find(d => d.id === id);
    if (!state.activeDoc) return;
    $('documentTitle').value = state.activeDoc.title || '';
    $('documentTitle').classList.toggle('locked', !!state.activeDoc.title);
    if (state.activeDoc.title) $('documentTitle').setAttribute('readonly', 'readonly');
    else $('documentTitle').removeAttribute('readonly');
    $('editor').innerHTML = state.activeDoc.content || '';
    $('textScratchpad').value = state.activeDoc.scratchpad || '';
    showEditor();
    renderPinnedNotes();
}

/* ============================================================
   ادیتور — نوار ابزار
   ============================================================ */
function initEditor() {
    const editor = $('editor');
    const titleInput = $('documentTitle');

    // فرمت‌دهی
    $$('.tool-btn[data-command]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => e.preventDefault());
        btn.addEventListener('click', () => {
            editor.focus();
            document.execCommand(btn.dataset.command, false, null);
            updateToolbarState();
        });
    });

    // بلاک‌ها (H1/H2/H3/P)
    $$('.tool-btn[data-block]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => e.preventDefault());
        btn.addEventListener('click', () => {
            editor.focus();
            document.execCommand('formatBlock', false, btn.dataset.block);
        });
    });

    // قفل عنوان
    titleInput.addEventListener('blur', () => {
        if (titleInput.value.trim()) {
            titleInput.setAttribute('readonly', 'readonly');
            titleInput.classList.add('locked');
            if (state.activeDoc) {
                state.activeDoc.title = titleInput.value.trim();
                state.activeDoc.updatedAt = Date.now();
                saveState();
            }
        }
    });
    titleInput.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        titleInput.removeAttribute('readonly');
        titleInput.classList.remove('locked');
        titleInput.focus();
        titleInput.select();
    });

    // ذخیره متن ادیتور
    editor.addEventListener('input', () => {
        if (state.activeDoc) {
            state.activeDoc.content = editor.innerHTML;
            state.activeDoc.updatedAt = Date.now();
        }
    });

    // چرک‌نویس
    $('textScratchpad').addEventListener('input', () => {
        if (state.activeDoc) {
            state.activeDoc.scratchpad = $('textScratchpad').value;
        }
    });

    // دکمه‌های ذخیره
    $('saveDocBtn').addEventListener('click', () => {
        if (state.activeDoc) {
            state.activeDoc.title = $('documentTitle').value.trim();
            state.activeDoc.content = editor.innerHTML;
            state.activeDoc.scratchpad = $('textScratchpad').value;
            state.activeDoc.updatedAt = Date.now();
            saveState();
            showToast('ذخیره شد');
        }
    });

    // دکمه هایلایت متن
    $('highlightBtn').addEventListener('click', () => {
        editor.focus();
        document.execCommand('hiliteColor', false, 'rgba(234, 179, 8, 0.4)');
    });

    // دکمه لینک
    $('linkBtn').addEventListener('click', () => {
        editor.focus();
        const url = prompt('آدرس لینک:');
        if (url) document.execCommand('createLink', false, url);
    });

    // تولتیپ انتخاب متن
    initSelectionTooltip();
    // راست‌کلیک
    initContextMenu();
}

function updateToolbarState() {
    ['bold', 'italic', 'underline', 'strikeThrough'].forEach(cmd => {
        const btn = document.querySelector(`.toggle-tool[data-command="${cmd}"]`);
        if (btn) btn.classList.toggle('active-tool', document.queryCommandState(cmd));
    });
}

/* ============================================================
   تولتیپ انتخاب متن (افزودن توضیح)
   ============================================================ */
function initSelectionTooltip() {
    const editor = $('editor');
    const tooltip = $('quickTooltip');

    document.addEventListener('selectionchange', () => {
        const sel = window.getSelection();
        if (!sel.rangeCount || sel.isCollapsed) { tooltip.classList.add('hidden'); return; }
        const range = sel.getRangeAt(0);
        if (!editor.contains(range.commonAncestorContainer)) { tooltip.classList.add('hidden'); return; }
        const rect = range.getBoundingClientRect();
        if (rect.width === 0) { tooltip.classList.add('hidden'); return; }
        tooltip.classList.remove('hidden');
        tooltip.style.left = (rect.left + rect.width / 2) + 'px';
        tooltip.style.top = (rect.top - 45 + window.scrollY) + 'px';
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
}

/* ============================================================
   مودال نکته
   ============================================================ */
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

    // کلیک روی هایلایت → نمایش نکته
    $('editor').addEventListener('click', (e) => {
        const el = e.target.closest('.hl-word');
        if (el && el.dataset.note) {
            const popup = $('noteViewPopup');
            $('noteViewContent').textContent = el.dataset.note;
            const rect = el.getBoundingClientRect();
            popup.style.left = rect.left + 'px';
            popup.style.top = (rect.top - 70 + window.scrollY) + 'px';
            popup.classList.remove('hidden');
            popup.classList.add('show');
            setTimeout(() => { popup.classList.remove('show'); popup.classList.add('hidden'); }, 4000);
        }
    });
}

function renderPinnedNotes() {
    const area = $('pinnedNotesArea');
    area.innerHTML = '';
    if (!state.activeDoc) return;
    const temp = document.createElement('div');
    temp.innerHTML = state.activeDoc.content || '';
    temp.querySelectorAll('.hl-word[data-pinned="1"]').forEach(el => {
        const card = document.createElement('div');
        card.className = 'note-pin-card';
        card.textContent = el.dataset.note;
        area.appendChild(card);
    });
}

/* ============================================================
   راست‌کلیک
   ============================================================ */
function initContextMenu() {
    const menu = $('customContextMenu');
    $('editor').addEventListener('contextmenu', (e) => {
        e.preventDefault();
        menu.classList.remove('hidden');
        menu.style.left = e.pageX + 'px';
        menu.style.top = e.pageY + 'px';
    });
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) menu.classList.add('hidden');
    });
    $('menuCopy').addEventListener('click', () => { document.execCommand('copy'); menu.classList.add('hidden'); });
    $('menuCut').addEventListener('click', () => { document.execCommand('cut'); menu.classList.add('hidden'); });
    $('menuPaste').addEventListener('click', () => { document.execCommand('paste'); menu.classList.add('hidden'); });
    $('menuBold').addEventListener('click', () => { document.execCommand('bold'); menu.classList.add('hidden'); });
    $('menuItalic').addEventListener('click', () => { document.execCommand('italic'); menu.classList.add('hidden'); });
}

/* ============================================================
   منوی فونت / سایز / رنگ
   ============================================================ */
function initFontDropdowns() {
    // فونت
    const fontDD = $('fontDropdown');
    fontDD.querySelector('.dropdown-selected').addEventListener('click', () => {
        fontDD.classList.toggle('active');
    });
    fontDD.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            $('editor').focus();
            document.execCommand('fontName', false, item.dataset.value);
            fontDD.querySelector('.dropdown-selected').childNodes[0].nodeValue = item.textContent + ' ';
            fontDD.classList.remove('active');
        });
    });

    // سایز
    const sizeDD = $('sizeDropdown');
    sizeDD.querySelector('.dropdown-selected').addEventListener('click', () => {
        sizeDD.classList.toggle('active');
    });
    sizeDD.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const size = item.dataset.value;
            $('editor').focus();
            // استفاده از ترفند execCommand
            document.execCommand('fontSize', false, '7');
            $('editor').querySelectorAll('font[size="7"]').forEach(el => {
                el.removeAttribute('size');
                el.style.fontSize = size + 'px';
            });
            sizeDD.querySelector('.dropdown-selected').childNodes[0].nodeValue = item.textContent + ' ';
            sizeDD.classList.remove('active');
        });
    });

    // بستن منوها با کلیک بیرون
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown')) {
            $$('.custom-dropdown').forEach(d => d.classList.remove('active'));
        }
        if (!e.target.closest('.color-menu-wrapper')) {
            $('colorPopup').classList.add('hidden');
        }
    });

    // رنگ
    $('textColorBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        $('colorPopup').classList.toggle('hidden');
    });
    $$('.color-swatch').forEach(sw => {
        sw.addEventListener('click', () => {
            $('editor').focus();
            document.execCommand('foreColor', false, sw.dataset.color);
            $('colorPopup').classList.add('hidden');
        });
    });
    $('nativeColorPicker').addEventListener('input', (e) => {
        $('editor').focus();
        document.execCommand('foreColor', false, e.target.value);
    });
}

/* ============================================================
   بوم (Canvas) — با کشیدن نرم و نشانگر قلم
   ============================================================ */
function initCanvas() {
    const canvas = $('scratchpadCanvas');
    const ctx = canvas.getContext('2d');
    const cursor = document.createElement('div');
    cursor.className = 'canvas-brush-cursor';
    document.body.appendChild(cursor);

    let drawing = false;
    let tool = 'pencil';
    let currentColor = '#00A693';
    let points = [];
    let startPos = null;
    let snapshot = null;

    // اندازه‌دهی بوم
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const w = rect.width;
        const h = canvas.parentElement.getBoundingClientRect().height - 90;
        if (w <= 0 || h <= 0) return;
        const data = canvas.toDataURL();
        canvas.width = w;
        canvas.height = h;
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = data;
    }
    requestAnimationFrame(() => { resizeCanvas(); });
    window.addEventListener('resize', resizeCanvas);

    function getPos(e) {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function setupBrush() {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (tool === 'highlighter') {
            ctx.strokeStyle = currentColor;
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 18;
            ctx.globalCompositeOperation = 'source-over';
        } else if (tool === 'eraser') {
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.globalAlpha = 1;
            ctx.lineWidth = 18;
            ctx.globalCompositeOperation = 'destination-out';
        } else if (tool === 'pencil') {
            ctx.strokeStyle = currentColor;
            ctx.globalAlpha = 1;
            ctx.lineWidth = 2.5;
            ctx.globalCompositeOperation = 'source-over';
        } else {
            ctx.strokeStyle = currentColor;
            ctx.globalAlpha = 1;
            ctx.lineWidth = 2;
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    function drawSmooth() {
        if (points.length < 3) return;
        const p1 = points[points.length - 3];
        const p2 = points[points.length - 2];
        const p3 = points[points.length - 1];
        const m1 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const m2 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };
        ctx.beginPath();
        ctx.moveTo(m1.x, m1.y);
        ctx.quadraticCurveTo(p2.x, p2.y, m2.x, m2.y);
        ctx.stroke();
    }

    canvas.addEventListener('pointerenter', (e) => {
        cursor.style.display = 'block';
    });
    canvas.addEventListener('pointerleave', () => {
        cursor.style.display = 'none';
        drawing = false;
    });
    canvas.addEventListener('pointermove', (e) => {
        const brushSize = tool === 'eraser' || tool === 'highlighter' ? 18 : 6;
        cursor.style.width = brushSize + 'px';
        cursor.style.height = brushSize + 'px';
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';

        if (!drawing) return;
        const pos = getPos(e);

        if (tool === 'pencil' || tool === 'highlighter' || tool === 'eraser') {
            points.push(pos);
            drawSmooth();
        } else if (tool === 'line') {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (snapshot) ctx.drawImage(snapshot, 0, 0);
            setupBrush();
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        } else if (tool === 'rect') {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (snapshot) ctx.drawImage(snapshot, 0, 0);
            setupBrush();
            ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
        } else if (tool === 'circle') {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (snapshot) ctx.drawImage(snapshot, 0, 0);
            setupBrush();
            const rx = Math.abs(pos.x - startPos.x) / 2;
            const ry = Math.abs(pos.y - startPos.y) / 2;
            const cx = (startPos.x + pos.x) / 2;
            const cy = (startPos.y + pos.y) / 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    });

    canvas.addEventListener('pointerdown', (e) => {
        drawing = true;
        const pos = getPos(e);
        points = [pos];
        startPos = pos;
        snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setupBrush();
        if (tool === 'pencil' || tool === 'highlighter' || tool === 'eraser') {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, (tool === 'eraser' || tool === 'highlighter' ? 9 : 1.2), 0, Math.PI * 2);
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fill();
        }
    });

    canvas.addEventListener('pointerup', () => {
        drawing = false;
        points = [];
        if (state.activeDoc) {
            state.activeDoc.board = canvas.toDataURL();
        }
    });

    // ابزارها
    $$('.board-tool[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.board-tool[data-tool]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tool = btn.dataset.tool;
        });
    });
    $('boardColor').addEventListener('input', (e) => { currentColor = e.target.value; });
    $('clearBoardBtn').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    // ورود به جزوه
    $('exportBoardToDocBtn').addEventListener('click', () => {
        const dataUrl = canvas.toDataURL();
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '12px';
        img.style.margin = '10px 0';
        $('editor').appendChild(img);
        if (state.activeDoc) {
            state.activeDoc.content = $('editor').innerHTML;
            saveState();
        }
        showToast('تصویر بوم به جزوه اضافه شد');
    });
}

/* ============================================================
   مودال‌ها
   ============================================================ */
function initModals() {
    // بستن با دکمه‌های لغو
    $$('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal')?.classList.remove('show');
        });
    });
    // بستن با کلیک بیرون
    $$('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('show');
        });
    });
}

/* ============================================================
   تنظیمات
   ============================================================ */
function initSettings() {
    $('resetRoleBtn').addEventListener('click', () => {
        state.role = null;
        localStorage.removeItem(STORAGE_KEYS.role);
        $('settingsModal').classList.remove('show');
        showRoleView();
    });
    $('clearDataBtn').addEventListener('click', () => {
        if (confirm('آیا مطمئن هستید؟ تمام اطلاعات حذف خواهد شد.')) {
            localStorage.clear();
            location.reload();
        }
    });
    $('defaultFontSizeSelect').addEventListener('change', (e) => {
        const fs = e.target.value;
        localStorage.setItem(STORAGE_KEYS.defaultFontSize, fs);
        $('editor').style.fontSize = fs + 'px';
    });
    const savedFs = localStorage.getItem(STORAGE_KEYS.defaultFontSize) || '17';
    $('editor').style.fontSize = savedFs + 'px';
    $('defaultFontSizeSelect').value = savedFs;
}

/* ============================================================
   خروجی گرفتن
   ============================================================ */
function exportDoc(format) {
    const doc = state.activeDoc;
    if (!doc) return;
    const title = doc.title || 'vizhar-document';
    const content = `
        <div dir="rtl" style="font-family:'Estedad',sans-serif; padding:30px;">
            <h1 style="color:#00A693;">${title}</h1>
            ${doc.content || ''}
        </div>`;

    if (format === 'pdf') {
        const temp = document.createElement('div');
        temp.innerHTML = content;
        temp.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;background:#fff;color:#000;';
        document.body.appendChild(temp);
        html2pdf().set({
            margin: 10,
            filename: title + '.pdf',
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(temp).save().then(() => temp.remove());
    } else {
        const blob = new Blob([content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = title + '.doc';
        a.click();
        URL.revokeObjectURL(url);
    }
    $('exportModal').classList.remove('show');
}

/* ============================================================
   Toast ساده
   ============================================================ */
function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `
        position:fixed; bottom:30px; left:50%; transform:translateX(-50%);
        background:var(--accent-persian); color:#fff; padding:10px 20px;
        border-radius:14px; z-index:99999; font-size:.88rem;
        box-shadow:0 8px 25px rgba(0,166,147,0.4);
        animation: fadeIn .3s;
    `;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 2000);
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

/* ============================================================
   راه‌اندازی
   ============================================================ */
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

    // ناوبری
    $('backToDashBtn').addEventListener('click', () => {
        if (state.activeDoc) {
            state.activeDoc.content = $('editor').innerHTML;
            state.activeDoc.title = $('documentTitle').value.trim();
            saveState();
        }
        showDashboard();
    });
    $('createNewDocBtn').addEventListener('click', createDoc);
    $('settingsBtn').addEventListener('click', () => $('settingsModal').classList.add('show'));

    // مودال دسته‌بندی
    $('addFolderBtn').addEventListener('click', () => $('addFolderModal').classList.add('show'));
    $('confirmAddFolderBtn').addEventListener('click', () => {
        const name = $('newFolderName').value.trim();
        if (!name) return;
        state.folders.push({ id: 'f_' + Date.now(), name });
        saveState();
        $('newFolderName').value = '';
        $('addFolderModal').classList.remove('show');
        renderFolders();
    });

    // ایمپورت / اکسپورت
    $('importBtn').addEventListener('click', () => $('importModal').classList.add('show'));
    $('exportBtn').addEventListener('click', () => $('exportModal').classList.add('show'));
    $('exportWordBtn').addEventListener('click', () => exportDoc('word'));
    $('exportPdfBtn').addEventListener('click', () => exportDoc('pdf'));

    // شروع
    if (state.role) showDashboard();
    else showRoleView();
}

document.addEventListener('DOMContentLoaded', init);
