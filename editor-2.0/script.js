// --- Collapsible Editors & Console ---
function toggleEditor(boxId) {
    const box = document.getElementById(boxId);
    box.classList.toggle('collapsed');
    // Notify CM to refresh its size after transition (though we use none, good practice)
    setTimeout(() => window.dispatchEvent(new Event('resize')), 10);
}

function toggleConsole(e) {
    if(e.target.tagName.toLowerCase() === 'button' || e.target.closest('button')) return; // Ignore clear button
    const panel = document.getElementById('console-panel');
    panel.classList.toggle('collapsed');
}

function clearConsole(e) {
    e.stopPropagation(); // Don't toggle the console
    document.getElementById('console-output').innerHTML = '';
}

// --- Layout Controls ---
const workspace = document.getElementById('workspace');
const editorPanel = document.getElementById('editor-panel');
let currentLayout = 'left';

function setLayout(layout) {
    currentLayout = layout;
    workspace.className = `workspace layout-${layout}`;
    // Reset flex basis so it doesn't break when switching orientation
    editorPanel.style.flex = '0 0 30%';
    // Trigger resize for CodeMirror
    setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
}

document.getElementById('layout-left').onclick = () => setLayout('left');
document.getElementById('layout-right').onclick = () => setLayout('right');
document.getElementById('layout-top').onclick = () => setLayout('top');
document.getElementById('layout-bottom').onclick = () => setLayout('bottom');

// --- Splitter Logic ---
const splitter = document.getElementById('splitter');
const previewPanel = document.getElementById('preview-panel');
let isDragging = false;
let startX, startY, startFlexBasis;

splitter.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    splitter.classList.add('active');
    
    const rect = editorPanel.getBoundingClientRect();
    if (currentLayout === 'left' || currentLayout === 'right') {
        startFlexBasis = rect.width;
    } else {
        startFlexBasis = rect.height;
    }
    
    // Prevent iframe from eating mouse events during drag
    previewPanel.style.pointerEvents = 'none';
    document.body.style.cursor = (currentLayout === 'left' || currentLayout === 'right') ? 'ew-resize' : 'ns-resize';
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    let newSize;
    
    if (currentLayout === 'left') {
        newSize = startFlexBasis + (e.clientX - startX);
    } else if (currentLayout === 'right') {
        newSize = startFlexBasis - (e.clientX - startX);
    } else if (currentLayout === 'top') {
        newSize = startFlexBasis + (e.clientY - startY);
    } else if (currentLayout === 'bottom') {
        newSize = startFlexBasis - (e.clientY - startY);
    }

    // Apply constraints
    if (newSize > 100 && newSize < (currentLayout === 'left' || currentLayout === 'right' ? window.innerWidth - 100 : window.innerHeight - 150)) {
        editorPanel.style.flex = `0 0 ${newSize}px`;
    }
});

window.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        splitter.classList.remove('active');
        previewPanel.style.pointerEvents = 'all';
        document.body.style.cursor = 'default';
        window.dispatchEvent(new Event('resize')); // Refresh CM
    }
});

// --- Console Message Listener ---
window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'console') {
        const output = document.getElementById('console-output');
        const div = document.createElement('div');
        div.className = `log-msg ${e.data.level}`;
        
        let icon = '';
        if(e.data.level === 'error') icon = '<i class="fa-solid fa-circle-xmark"></i> ';
        if(e.data.level === 'warn') icon = '<i class="fa-solid fa-triangle-exclamation"></i> ';
        if(e.data.level === 'log') icon = '<i class="fa-solid fa-angle-right" style="color:var(--accent)"></i> ';
        
        div.innerHTML = icon + e.data.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        output.appendChild(div);
        output.scrollTop = output.scrollHeight; // Auto scroll
        
        // Optional: Auto open console on error
        if(e.data.level === 'error') {
            document.getElementById('console-panel').classList.remove('collapsed');
        }
    }
});

setLayout("top");