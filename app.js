// المان‌های پایه‌ای
const editor = document.getElementById('editor');
const fontSelect = document.getElementById('fontSelect');
const docModeSelect = document.getElementById('docModeSelect');
const modals = document.querySelectorAll('.modal');

// --- 1. تنظیمات ظاهری (تم و فونت کل اپلیکیشن) ---
document.getElementById('appFontSelect').addEventListener('change', (e) => {
    document.body.style.fontFamily = `'${e.target.value}', sans-serif`;
});

document.querySelectorAll('.theme-circle').forEach(circle => {
    circle.addEventListener('click', (e) => {
        document.body.setAttribute('data-theme', e.target.dataset.setTheme);
    });
});

// فونت اختصاصی داخل جزوه
fontSelect.addEventListener('change', (e) => {
    editor.style.fontFamily = `'${e.target.value}', sans-serif`;
});

// حالت‌های جزوه (خطی، پیشرفته، آزاد)
docModeSelect.addEventListener('change', (e) => {
    editor.className = 'editor-box ' + e.target.value;
});

// ابزارهای نگارشی
document.querySelectorAll('.tool-btn[data-command]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        document.execCommand(btn.dataset.command, false, null);
    });
});

// --- 2. مدیریت پاپ‌آپ‌ها ---
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModals() { modals.forEach(m => m.classList.remove('show')); }

document.getElementById('importBtn').onclick = () => openModal('importModal');
document.getElementById('exportBtn').onclick = () => openModal('exportModal');
document.getElementById('settingsBtn').onclick = () => openModal('settingsModal');
document.querySelectorAll('.btn-close-modal').forEach(btn => btn.onclick = closeModals);

// --- 3. وارد کردن فایل (Import) ---
const fileInput = document.getElementById('fileInput');

document.getElementById('importAsTextBtn').onclick = () => fileInput.click();
document.getElementById('importAsMediaBtn').onclick = () => fileInput.click();

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    
    // خواندن فایل به عنوان تصویر برای پیوست
    if(file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            document.execCommand('insertImage', false, event.target.result);
            closeModals();
        };
        reader.readAsDataURL(file);
    } else {
        // خواندن به عنوان متن (شبیه‌سازی استخراج)
        const reader = new FileReader();
        reader.onload = (event) => {
            const textNode = document.createTextNode(event.target.result);
            editor.appendChild(textNode);
            closeModals();
        };
        reader.readAsText(file);
    }
    fileInput.value = ''; // ریست
});

// --- 4. خروجی گرفتن (Export) ---
function exportDoc(format) {
    const title = document.getElementById('documentTitle').value || 'جزوه_ویژار';
    const content = editor.innerHTML;

    if (format === 'word') {
        // خروجی استاندارد و ساده برای ورد
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + content + footer;
        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = title + '.doc';
        fileDownload.click();
        document.body.removeChild(fileDownload);
    } 
    else if (format === 'pdf') {
        const opt = { margin: 1, filename: title + '.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } };
        html2pdf().set(opt).from(editor).save();
    } 
    else if (format === 'image') {
        html2canvas(editor).then(canvas => {
            const link = document.createElement('a');
            link.download = title + '.png';
            link.href = canvas.toDataURL();
            link.click();
        });
    }
    closeModals();
}

// --- 5. چکنویس تصویری (بدون پس‌زمینه) ---
const canvas = document.getElementById('scratchpadCanvas');
const ctx = canvas.getContext('2d');
let drawing = false;
let currentTool = 'pencil'; // pencil, marker, highlighter, eraser

// تنظیم سایز واقعی بوم
canvas.width = canvas.parentElement.clientWidth - 40;
canvas.height = 250;

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

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // تنظیمات ابزارها
    if(currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 20;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = document.getElementById('boardColor').value;
        
        if(currentTool === 'pencil') {
            ctx.lineWidth = 2;
            ctx.globalAlpha = 1.0;
        } else if(currentTool === 'marker') {
            ctx.lineWidth = 6;
            ctx.globalAlpha = 1.0;
        } else if(currentTool === 'highlighter') {
            ctx.lineWidth = 15;
            ctx.globalAlpha = 0.3; // حالت شفاف برای هایلایت
        }
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // ریست آلفا برای جلوگیری از باگ
    ctx.globalAlpha = 1.0;
}

document.getElementById('clearBoardBtn').onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

// انتقال چکنویس به عنوان تصویر بدون بکگراند به جزوه
document.getElementById('exportBoardToDocBtn').onclick = () => {
    const dataUrl = canvas.toDataURL("image/png");
    // فوکوس روی ادیتور و جایگذاری عکس
    editor.focus();
    const imgHtml = `<img src="${dataUrl}" style="background:transparent; max-width:100%; border:none;">`;
    document.execCommand('insertHTML', false, imgHtml);
    // پاک کردن بوم بعد از انتقال
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};
