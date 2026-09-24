import * as Y from 'https://esm.sh/yjs';
import { WebrtcProvider } from 'https://esm.sh/y-webrtc';
    
// CodeMirror 6 Core & Extensions
import { EditorView, basicSetup } from 'https://esm.sh/codemirror';
import { html } from 'https://esm.sh/@codemirror/lang-html';
import { closeBrackets } from 'https://esm.sh/@codemirror/autocomplete';
import { monokai } from 'https://esm.sh/@uiw/codemirror-theme-monokai';
import { Compartment, EditorState } from 'https://esm.sh/@codemirror/state';
import { keymap } from 'https://esm.sh/@codemirror/view';
import { indentWithTab } from 'https://esm.sh/@codemirror/commands';
import { indentUnit } from 'https://esm.sh/@codemirror/language';

// Yjs Binding für CodeMirror 6
import { yCollab } from 'https://esm.sh/y-codemirror.next';

let preset = "none";
let provider = null;
let ydoc = null;

// Dynamisches Fach (Compartment) für die Yjs-Erweiterung
const collabCompartment = new Compartment();

// --- Preview Updating Logic ---
let updateTimeout;
const iframe = document.getElementById('preview-frame');

function updatePreview() {
    const presetSelect = document.querySelector("select#preset");
    if (presetSelect) preset = presetSelect.value;
    
    // CM6: Text auslesen über state.doc.toString()
    const htmlContent = htmlEditor.state.doc.toString();
    
    if (iframe) iframe.srcdoc = htmlContent;
}

// Trigger bei Textänderungen
const onChange = () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(updatePreview, 500);
};

// --- Editor Initialisierung ---
const htmlEditor = new EditorView({
    doc: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            margin: 0; 
            display: flex; 
            flex-direction: column; 
            height: 100vh; 
            font-family: sans-serif; 
            background: #1e1e1e; 
            color: white;
        }
    </style>
    <title>Das ist der Titel der Website</title>
</head>
<body>
<h1>Hallo Programmierer!</h1>
<p>Dieser Editor ist besser als der Windows Editor</p>
<p>
    Weil wir in Informatik sind darf ich hier leider keine schlimmen
    oder andersweitig lustigen sachen reintun weil ich sonst
    ein paar Probleme kriege.
</p>
</body>
</html>`,
  extensions: [
    basicSetup,                          // Standard-Features (inkl. closeBrackets)
    html(),                              // HTML + CSS + JS Syntax Highlighting
    monokai,
    closeBrackets(),
    keymap.of([indentWithTab]),
    indentUnit.of("    "),
    EditorState.tabSize.of(2),
    collabCompartment.of([]),            // Platzhalter für Yjs (wird beim Joinen befüllt)
    EditorView.updateListener.of((update) => {
        if (update.docChanged) onChange(); // Event-Listener für Änderungen
    }),
    EditorView.lineWrapping
  ],
  // Korrekter Selektor-Aufruf
  parent: document.querySelector('#box-html .cm-wrapper')
});

// Erstes Preview-Update durchführen
updatePreview();

// --- File Upload Logic ---
const fileInput = document.getElementById('file-upload');
if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const content = evt.target.result;
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');

            let htmlContent = doc.body ? doc.body.innerHTML.trim() : content;

            // CM6: Inhalt austauschen über dispatch
            htmlEditor.dispatch({
                changes: { from: 0, to: htmlEditor.state.doc.length, insert: htmlContent }
            });
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset
    });
}

// --- File Download Logic ---
function downloadBundle(extension, mimeType) {
    const currentCode = htmlEditor.state.doc.toString();
    const blob = new Blob([currentCode], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Website.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

const btnDownloadHtml = document.getElementById('btn-download-html');
if (btnDownloadHtml) btnDownloadHtml.onclick = () => downloadBundle('html', 'text/html');

const btnDownloadTxt = document.getElementById('btn-download-txt');
if (btnDownloadTxt) btnDownloadTxt.onclick = () => downloadBundle('txt', 'text/plain');

// --- Yjs Collaboration Setup ---
const btnJoin = document.getElementById('btn-join');
if (btnJoin) {
    btnJoin.onclick = () => {
        const roomNameInput = document.getElementById('room-name');
        const passwordInput = document.getElementById('room-password');

        const roomName = roomNameInput ? roomNameInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value.trim() : '';
        
        if (!roomName) {
            alert('Bitte einen Raumnamen eingeben!');
            return;
        }

        // Inputs deaktivieren
        btnJoin.disabled = true;
        if (roomNameInput) roomNameInput.disabled = true;
        if (passwordInput) passwordInput.disabled = true;

        const statusEl = document.getElementById('collab-status');
        if (statusEl) statusEl.style.display = 'inline-block';

        // 1. Yjs Dokument & Text-Objekt anlegen
        ydoc = new Y.Doc();
        const yText = ydoc.getText('codemirror');
                
        // 2. WebRTC Provider verbinden
        provider = new WebrtcProvider(roomName, ydoc, { 
            password: password || undefined 
        });

        // 3. Yjs-Erweiterung nachträglich in den Editor injizieren
        htmlEditor.dispatch({
            effects: collabCompartment.reconfigure(yCollab(yText, provider.awareness))
        });
    };
}