// @ts-nocheck

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

const SERVER_WS_URL = "wss://if-tools-backend.onrender.com";
let ws = null;
let isTeacher = false;
let currentSelectedStudentId = null;
let isRemoteUpdate = false;

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
function onCodeChange() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(updatePreview, 500);

    // Verhindert das erneute Senden beim Empfang von Fremdcode
    if (isRemoteUpdate) return;

    const currentCode = htmlEditor.state.doc.toString();

    if (isTeacher && currentSelectedStudentId) {
        sendWS({
            type: 'TEACHER_EDIT_CODE',
            targetStudentId: currentSelectedStudentId,
            code: currentCode
        });
    } else if (!isTeacher) {
        sendWS({
            type: 'STUDENT_CODE_UPDATE',
            code: currentCode
        });
    }
}

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
    collabCompartment.of([]),
    EditorView.updateListener.of((update) => { 
        if (update.docChanged) onCodeChange(); 
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
 
            // CM6: Inhalt austauschen über dispatch
            htmlEditor.dispatch({
                changes: { from: 0, to: htmlEditor.state.doc.length, insert: content }
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

// --- WebSocket Schulungssystem ---

function initWebSocket() {
    ws = new WebSocket(SERVER_WS_URL);

    ws.onopen = () => {
        console.log("WebSocket verbunden.");

        const token = localStorage.getItem('token');
        if (token) {
            sendWS({ type: 'IDENTIFY', token: token });
        }

        const nameInput = document.getElementById('user-name-input');
        const name = nameInput ? nameInput.value.trim() : 'Anonym';
        sendWS({ type: 'REGISTER_STUDENT', name: name });
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === 'IS_TEACHER_CONFIRMED') {
                isTeacher = true;
                const panel = document.getElementById('teacher-panel');
                if (panel) panel.style.display = 'flex';
                showToast("Als Admin autorisiert!");
            }

            if (data.type === 'STUDENT_LIST') {
                updateStudentDropdown(data.list);
            }

            if (data.type === 'LIVE_CODE_FROM_STUDENT') {
                if (isTeacher && data.studentId === currentSelectedStudentId) {
                    applyCodeToEditor(data.code);
                }
            }

            if (data.type === 'APPLY_TEACHER_CODE') {
                if (!isTeacher) {
                    applyCodeToEditor(data.code);
                    showToast("Ein Admin bearbeitet gerade deinen Code.");
                }
            }

            if (data.type === 'NOTIFICATION') {
                showToast(`${data.text}`);
            }

            if (data.type === 'ERROR') {
                showToast(`Fehler: ${data.message}`);
            }

        } catch (e) {
            console.error("Fehler beim Verarbeiten der Nachricht:", e);
        }
    };

    ws.onclose = () => {
        setTimeout(initWebSocket, 3000);
    };
}

function sendWS(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

function applyCodeToEditor(newCode) {
    if (htmlEditor.state.doc.toString() === newCode) return;
    isRemoteUpdate = true;
    htmlEditor.dispatch({
        changes: { from: 0, to: htmlEditor.state.doc.length, insert: newCode }
    });
    isRemoteUpdate = false;
    updatePreview();
}

// UI Steuerungs-Events
const btnStartSession = document.getElementById('btn-start-session');
if (btnStartSession) {
    btnStartSession.onclick = () => {
        const nameInput = document.getElementById('user-name-input');
        if (!nameInput || !nameInput.value.trim()) return alert("Bitte gib deinen Namen ein.");

        const modal = document.getElementById('name-modal');
        if (modal) modal.style.display = 'none';

        initWebSocket();
    };
}

function updateStudentDropdown(list) {
    const select = document.getElementById('select-student');
    if (!select) return;

    select.innerHTML = '<option value="">Schüler wählen...</option>';
    list.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = student.name + (student.username ? ` (${student.username})` : '');
        select.appendChild(option);
    });
}

const selectStudent = document.getElementById('select-student');
if (selectStudent) {
    selectStudent.onchange = (e) => {
        currentSelectedStudentId = e.target.value;
        if (currentSelectedStudentId) {
            sendWS({
                type: 'TEACHER_SELECT_STUDENT',
                targetStudentId: currentSelectedStudentId
            });
        }
    };
}

const btnSendNotify = document.getElementById('btn-send-notify');
if (btnSendNotify) {
    btnSendNotify.onclick = () => {
        const msgInput = document.getElementById('notify-msg');
        const msg = msgInput ? msgInput.value.trim() : '';
        if (!currentSelectedStudentId) return alert("Bitte wähle zuerst einen Schüler aus.");
        if (!msg) return;

        sendWS({
            type: 'SEND_NOTIFICATION',
            targetStudentId: currentSelectedStudentId,
            message: msg
        });
        if (msgInput) msgInput.value = '';
    };
}

function showToast(text) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = text;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// --- Login-Steuerung für Lehrer ---

const btnOpenLogin = document.getElementById('btn-open-login');
const btnCloseLogin = document.getElementById('btn-close-login');
const loginModal = document.getElementById('login-modal');
const btnSubmitLogin = document.getElementById('btn-submit-login');
const loginError = document.getElementById('login-error');

if (btnOpenLogin) {
    btnOpenLogin.onclick = () => {
        if (loginModal) loginModal.style.display = 'flex';
    };
}

if (btnCloseLogin) {
    btnCloseLogin.onclick = () => {
        if (loginModal) loginModal.style.display = 'none';
    };
}

if (btnSubmitLogin) {
    btnSubmitLogin.onclick = async () => {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value.trim();

        if (!username || !password) {
            if (loginError) {
                loginError.textContent = "Bitte Benutzername und Passwort eingeben.";
                loginError.style.display = 'block';
            }
            return;
        }

        try {
            // Anfragen an dein Backend senden
            const response = await fetch('https://if-tools-backend.onrender.com/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.token) {
                // Token im Browser-Speicher ablegen
                localStorage.setItem('token', data.token);

                if (loginError) loginError.style.display = 'none';
                if (loginModal) loginModal.style.display = 'none';

                const nameModal = document.getElementById('name-modal');
                if (nameModal) nameModal.style.display = 'none';

                // Benutzernamen im Namensfeld eintragen
                const nameInput = document.getElementById('user-name-input');
                if (nameInput) nameInput.value = username;

                showToast("Login erfolgreich!");

                // WebSocket starten & JWT-Token automatisch mit 'IDENTIFY' senden
                initWebSocket();
            } else {
                if (loginError) {
                    loginError.textContent = data.message || "Anmeldung fehlgeschlagen.";
                    loginError.style.display = 'block';
                }
            }
        } catch (err) {
            if (loginError) {
                loginError.textContent = "Verbindung zum Server fehlgeschlagen.";
                loginError.style.display = 'block';
            }
        }
    };
}