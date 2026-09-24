import * as Y from 'https://esm.sh/yjs';
import { WebrtcProvider } from 'https://esm.sh/y-webrtc';
    
// CodeMirror 6 Core & HTML Language Extension
import { EditorView, basicSetup } from 'https://esm.sh/codemirror';
import { closeBrackets } from 'https://esm.sh/@codemirror/autocomplete';
import { html } from 'https://esm.sh/@codemirror/lang-html';
import { monokai } from 'https://esm.sh/@uiw/codemirror-theme-monokai';

// Yjs Binding für CodeMirror 6
import { yCollab } from 'https://esm.sh/y-codemirror.next';

let preset = "none";

const htmlEditor = new EditorView({
    doc: `<!DOCTYPE html>
<html>
<head>
    <style>
        h1 { color: #2b6cb0; }
    </style>
</head>
<body>
    <h1>Hallo CodeMirror 6</h1>
    <script>
        console.log("JS wird automatisch hervorgehoben!");
    <\/script>
</body>
</html>`,
  extensions: [
    basicSetup,                         // Standard-Features (Zeilennummern, Undo/Redo, etc.)
    html(),                             // HTML + CSS + JS Syntax Highlighting
    yCollab(yText, provider.awareness),  // Echtzeit-Synchronisation via Yjs
    closeBrackets(),
    monokai
  ],
  parent: document.querySelector('#box-html .cm-wrapper')
});

// --- Preview Updating Logic ---
let updateTimeout;
const iframe = document.getElementById('preview-frame');

function updatePreview() {
    preset = document.querySelector("select#preset").value;
    const html = htmlEditor.getValue();
    
    iframe.srcdoc = html;
    console.log(preset)
}

// Trigger on change
const onChange = () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(updatePreview, 500);
};

htmlEditor.on('change', onChange);

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

        let htmlContent = doc.body ? doc.body.innerHTML.trim() : content;

        htmlEditor.setValue(htmlContent);
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
});

// --- File Download Logic ---
function downloadBundle(extension, mimeType) {
    const blob = new Blob([htmlEditor.getValue()], { type: mimeType });
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
    const yHtml = ydoc.getText('codemirror');
};