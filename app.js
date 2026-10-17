// --- متغیرهای سیستم ---
let db = JSON.parse(localStorage.getItem('vijarDB')) || { docs: [], notes: {} };
let currentDocId = null;

// المان‌های DOM
const views = {
    dash: document.getElementById('dashboard-view'),
    edit: document.getElementById('editor-view')
};
const editor = document.getElementById('editor');
const titleInput = document.getElementById('documentTitle');
const backBtn = document.getElementById('backToDashBtn');
const documentsGrid = document.getElementById('documentsGrid');
const toolBtns = document.querySelectorAll('.tool-btn[data-command]');

// --- مدیریت تم (شب و روز) ---
const themeToggle = document.getElementById('themeToggle');
const isDarkMode = localStorage.getItem('dark-mode') === 'true';
if(isDarkMode) {
    document.body.classList.add('dark-mode');
    themeToggle.checked = true;
}
themeToggle.addEventListener('change', (e) => {
    document.body.classList.toggle('dark-mode', e.target.checked);
    localStorage.setItem('dark-mode', e.target.checked);
});

// --- ابزارهای نگارشی و تشخیص وضعیت (Active State) ---
toolBtns.forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault(); // جلوگیری از پریدن انتخاب متن
        const command = btn.dataset.command;
        document.execCommand(command, false, null);
        editor.focus();
        checkActiveTools();
    });
});

// تشخیص اینکه کلمه‌ای که کاربر انتخاب کرده چه افکتی دارد (روشن شدن دکمه ابزار)
editor.addEventListener('keyup', checkActiveTools);
editor.addEventListener('mouseup', () => {
    checkActiveTools();
    handleWordSelection();
});

function checkActiveTools() {
    toolBtns.forEach(btn => {
        const command = btn.dataset.command;
        // اگر ابزار روی متن فعال باشد، کلاس active می‌گیرد
        if (document.queryCommandState(command)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// --- مسیریابی و داشبورد ---
function showView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
    backBtn.classList.toggle('hidden', viewName === 'dash');
    if(viewName === 'dash') renderDashboard();
}

document.getElementById('createNewDocBtn').addEventListener('click', () => {
    currentDocId = Date.now().toString();
    titleInput.value = '';
    editor.innerHTML = '';
    showView('edit');
});

backBtn.addEventListener('click', () => showView('dash'));

function renderDashboard() {
    documentsGrid.innerHTML = '';
    db.docs.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'doc-card';
        card.innerHTML = `
            <h3><i class="fa-solid fa-file-lines" style="color: var(--accent)"></i> ${doc.title || 'بدون عنوان'}</h3>
            <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:10px;">آخرین ویرایش: ${new Date(doc.id * 1).toLocaleDateString('fa-IR')}</p>
        `;
        card.onclick = () => loadDocument(doc.id);
        documentsGrid.appendChild(card);
    });
}

// --- ذخیره و مدیریت جزوه ---
document.getElementById('saveDocBtn').addEventListener('click', () => {
    if(!currentDocId) return;
    
    const docIndex = db.docs.findIndex(d => d.id === currentDocId);
    const docData = {
        id: currentDocId,
        title: DOMPurify.sanitize(titleInput.value),
        content: DOMPurify.sanitize(editor.innerHTML)
    };

    if(docIndex > -1) {
        db.docs[docIndex] = docData;
    } else {
        db.docs.push(docData);
    }
    
    localStorage.setItem('vijarDB', JSON.stringify(db));
    
    // افکت ذخیره شدن روی دکمه
    const btn = document.getElementById('saveDocBtn');
    btn.innerHTML = '<i class="fa-solid fa-check"></i>';
    setTimeout(() => btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i>', 2000);
});

function loadDocument(id) {
    const doc = db.docs.find(d => d.id === id);
    if(doc) {
        currentDocId = doc.id;
        titleInput.value = doc.title;
        editor.innerHTML = doc.content;
        showView('edit');
        renderPinnedNotes();
    }
}

// --- مدیریت هایلایت و یادداشت‌ها ---
let currentTargetWord = null;
const modal = document.getElementById('noteModal');

function handleWordSelection() {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    // اگر متنی طولانی‌تر از 1 حرف انتخاب شد، آن را تبدیل به span می‌کند
    if (text.length > 1 && !selection.anchorNode.parentNode.classList.contains('hl-word')) {
        const wordId = 'word_' + Date.now();
        const span = document.createElement('span');
        span.className = 'hl-word';
        span.id = wordId;
        span.textContent = text;
        
        document.execCommand('insertHTML', false, span.outerHTML);
        attachClickEvents();
    }
}

function attachClickEvents() {
    document.querySelectorAll('.hl-word').forEach(word => {
        word.onclick = (e) => {
            currentTargetWord = e.target;
            document.getElementById('selectedWordDisplay').textContent = currentTargetWord.textContent;
            
            const noteData = db.notes[currentTargetWord.id] || {};
            document.getElementById('noteInput').value = noteData.text || '';
            document.getElementById('pinNoteCheck').checked = noteData.isPinned || false;
            
            modal.classList.add('show');
        };
    });
}

document.getElementById('saveNoteBtn').addEventListener('click', () => {
    if(!currentTargetWord) return;
    const noteText = document.getElementById('noteInput').value.trim();
    
    db.notes[currentTargetWord.id] = {
        text: DOMPurify.sanitize(noteText),
        word: currentTargetWord.textContent,
        isPinned: document.getElementById('pinNoteCheck').checked
    };
    
    localStorage.setItem('vijarDB', JSON.stringify(db));
    renderPinnedNotes();
    modal.classList.remove('show');
});

function renderPinnedNotes() {
    const area = document.getElementById('pinnedNotesArea');
    area.innerHTML = '';
    Object.values(db.notes).forEach(note => {
        if(note.isPinned) {
            area.innerHTML += `<div class="note-card"><strong>${note.word}:</strong><p>${note.text}</p></div>`;
        }
    });
}

// بستن مودال‌ها
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.onclick = () => {
        modal.classList.remove('show');
        document.getElementById('settingsModal').classList.remove('show');
    };
});
document.getElementById('settingsBtn').onclick = () => {
    document.getElementById('settingsModal').classList.add('show');
};

// تغییر اندازه فونت
document.getElementById('fontSizeSlider').addEventListener('input', (e) => {
    editor.style.fontSize = e.target.value + 'px';
});

// راه‌اندازی اولیه
renderDashboard();
