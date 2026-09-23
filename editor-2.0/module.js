import * as Y from 'https://esm.sh/yjs';
import { WebrtcProvider } from 'https://esm.sh/y-webrtc';
import { CodemirrorBinding } from 'https://esm.sh/y-codemirror';

// Initialize CodeMirror Editors
const cmConfig = {
    theme: 'monokai',
    lineNumbers: true,
    lineWrapping: true
};

let preset = "none";

const presets = {

};

const htmlEditor = CodeMirror.fromTextArea(document.getElementById('code-html'), { ...cmConfig, mode: 'htmlmixed' });
const cssEditor = CodeMirror.fromTextArea(document.getElementById('code-css'), { ...cmConfig, mode: 'css' });
const jsEditor = CodeMirror.fromTextArea(document.getElementById('code-js'), { ...cmConfig, mode: 'javascript' });

// Default content
htmlEditor.setValue(`<h1>Hallo Programmierer!</h1>
<p>Dieser Editor ist besser als der Windows Editor</p>
<p>
    Weil wir in Informatik sind darf ich hier leider keine schlimmen
    oder andersweitig lustigen sachen reintun weil ich sonst
    ein paar Probleme kriege.
</p>`);

cssEditor.setValue(`body { 
    margin: 0; 
    display: flex; 
    flex-direction: column; 
    height: 100vh; 
    font-family: sans-serif; 
    background: #1e1e1e; 
    color: white;
}`);

jsEditor.setValue("console.log('Hallo');");

// --- Preview Updating Logic ---
let updateTimeout;
const iframe = document.getElementById('preview-frame');

function updatePreview() {
    const html = htmlEditor.getValue();
    const css = cssEditor.getValue();
    const js = jsEditor.getValue();

    // Script that intercepts console.log inside the iframe
    const interceptor = `
    <script>
        const p = window.parent;
        const _log = console.log, _err = console.error, _warn = console.warn;
        console.log = (...args) => { p.postMessage({type:'console', level:'log', content: args.join(' ')}, '*'); _log(...args); };
        console.error = (...args) => { p.postMessage({type:'console', level:'error', content: args.join(' ')}, '*'); _err(...args); };
        console.warn = (...args) => { p.postMessage({type:'console', level:'warn', content: args.join(' ')}, '*'); _warn(...args); };
        window.onerror = (msg, url, line) => { p.postMessage({type:'console', level:'error', content: msg + ' (Zeile: ' + line + ')'}, '*'); };
    <\/script>
    `;

    const fullHtml = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <style>${css}</style>
    ${interceptor}
</head>
<body>
${html}
    <script>${js}<\/script>
</body>
</html>`;
    
    iframe.srcdoc = fullHtml;
}

// Trigger on change
const onChange = () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(updatePreview, 500);
};

htmlEditor.on('change', onChange);
cssEditor.on('change', onChange);
jsEditor.on('change', onChange);

// Initial preview
updatePreview();

// --- File Upload Logic ---
document.getElementById('file-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        const content = evt.target.result;
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');

        let cssContent = '';
        doc.querySelectorAll('style').forEach(s => { cssContent += s.innerHTML + '\n'; s.remove(); });

        let jsContent = '';
        doc.querySelectorAll('script').forEach(s => { jsContent += s.innerHTML + '\n'; s.remove(); });

        let htmlContent = doc.body ? doc.body.innerHTML.trim() : content;

        htmlEditor.setValue(htmlContent);
        cssEditor.setValue(cssContent.trim());
        jsEditor.setValue(jsContent.trim());
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
});

// --- File Download Logic ---
function downloadBundle(extension, mimeType) {
    const fullCode = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Beste Website der Welt</title>
    <style>
${cssEditor.getValue()}
    </style>
</head>
<body>
${htmlEditor.getValue()}
    <script>
${jsEditor.getValue()}
    <\/script>
</body>
</html>`;
    const blob = new Blob([fullCode], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Website.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

document.getElementById('btn-download-html').onclick = () => downloadBundle('html', 'text/html');
document.getElementById('btn-download-txt').onclick = () => downloadBundle('txt', 'text/plain');

// --- Yjs Collaboration Setup ---
let provider = null;
        
document.getElementById('btn-join').onclick = () => {
    const roomName = document.getElementById('room-name').value.trim();
    const password = document.getElementById('room-password').value.trim();
    
    if (!roomName) {
        alert('Bitte einen Raumnamen eingeben!');
        return;
    }

    // Disable inputs
    document.getElementById('btn-join').disabled = true;
    document.getElementById('room-name').disabled = true;
    document.getElementById('room-password').disabled = true;
    document.getElementById('collab-status').style.display = 'inline-block';

    // Setup Yjs Document
    const ydoc = new Y.Doc();
            
    // Setup WebRTC Provider
    provider = new WebrtcProvider(roomName, ydoc, { password: password || undefined });

    // Define shared text types
    const yHtml = ydoc.getText('html');
    const yCss = ydoc.getText('css');
    const yJs = ydoc.getText('js');

    // Bind CodeMirror instances
    new CodemirrorBinding(yHtml, htmlEditor, provider.awareness);
    new CodemirrorBinding(yCss, cssEditor, provider.awareness);
    new CodemirrorBinding(yJs, jsEditor, provider.awareness);
};