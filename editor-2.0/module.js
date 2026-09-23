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
    "none": {
        "html":"",
        "css":"",
        "js":""
    },
    "special": {
        "html":`<div class="background" id="animated-background">
  <div class="blob" style="--anim1dur: 40s; --anim1del: -0s; --anim2dur: 40s; --anim2del: -15s;"></div>
  <div class="blob" style="--anim1dur: 40s; --anim1del: -5s; --anim2dur: 40s; --anim2del: -10s;"></div>
  <div class="blob" style="--anim1dur: 40s; --anim1del: -10s; --anim2dur: 40s; --anim2del: -5s;"></div>
  <div class="blob" style="--anim1dur: 40s; --anim1del: -15s; --anim2dur: 40s; --anim2del: -0s;"></div>
</div>`,
        "css":`.background {
  position: fixed;
  inset: 0;
  z-index: -1;
  filter: blur(150px);
}

.blob {
  width: 500px;
  height: 500px;
  border-radius: 50%;
  position: absolute;
  inset: 0;
  margin: auto;
  content: attr(data-test);
  animation:
   var(--anim1, move1) var(--anim1dur, 25s) infinite alternate cubic-bezier(.3, .1, .7, .9) var(--anim1del, 0s),
   var(--anim2, colors) var(--anim2dur, 20s) infinite alternate cubic-bezier(.65, 0, .35, 1) var(--anim2del, 0s);
}

@keyframes move1 {
  000% { transform: translate(-20vw, -30vh); }
  010% { transform: translate(0vw, -25vh); }
  020% { transform: translate(15vw, -30vh); }
  030% { transform: translate(20vw, -5vh); }
  040% { transform: translate(-10vw, 5vh); }
  050% { transform: translate(-20vw, 15vh); }
  060% { transform: translate(-40vw, 0vh); }
  070% { transform: translate(-15vw, 20vh); }
  080% { transform: translate(15vw, -7vh); }
  090% { transform: translate(30vw, 0vh); }
  100% { transform: translate(5vw, -20vh); }
}

@keyframes move2 {
  000% { transform: translate(-20vw, -30vh); }
  005% { transform: translate(0vw, -25vh); }
  010% { transform: translate(15vw, -30vh); }
  015% { transform: translate(20vw, -5vh); }
  020% { transform: translate(-10vw, 5vh); }
  025% { transform: translate(-20vw, 15vh); }
  030% { transform: translate(-40vw, 0vh); }
  035% { transform: translate(-15vw, 20vh); }
  040% { transform: translate(15vw, -7vh); }
  045% { transform: translate(30vw, 0vh); }
  050% { transform: translate(5vw, -20vh); }
  055% { transform: translate(-20vw, -30vh); }
  060% { transform: translate(0vw, -25vh); }
  065% { transform: translate(15vw, -30vh); }
  070% { transform: translate(20vw, -5vh); }
  075% { transform: translate(-10vw, 5vh); }
  080% { transform: translate(-20vw, 15vh); }
  085% { transform: translate(-40vw, 0vh); }
  090% { transform: translate(-15vw, 20vh); }
  095% { transform: translate(15vw, -7vh); }
  100% { transform: translate(30vw, 0vh); }
}

.rainbow {
  animation: colors var(--clength) infinite alternate linear;
  animation-delay: var(--d);
}

@keyframes colors {
  0% { background: #df380e;}
  20% { background: #df6c0e;}
  40% { background: #f0cd08; }
  60% { background: #14bd1d; }
  80% { background: #0c9dc9; }
  100% { background: #b510f7; }
}`,
        "js":""
    }
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

jsEditor.setValue("console.log('Mir fällt gerade nichts ein was ich hier hin schreiben kann.');");

// --- Preview Updating Logic ---
let updateTimeout;
const iframe = document.getElementById('preview-frame');

function updatePreview() {
    preset = document.querySelector("select#preset").value;
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
    <style>${css}${presets[preset].css}</style>
    ${interceptor}
</head>
<body>
${html}${presets[preset].html}
    <script>${js}${presets[preset].js}<\/script>
</body>
</html>`;
    
    iframe.srcdoc = fullHtml;
    console.log(preset)
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