// Wir importieren Yjs und die WebRTC-Verbindung von einem CDN (esm.sh)
import * as Y from 'https://esm.sh/yjs';
import { WebrtcProvider } from 'https://esm.sh/y-webrtc';
import { CodeMirrorBinding } from 'https://esm.sh/y-codemirror';

// 1. Erstelle ein Yjs Dokument (Das ist das "Gehirn", das den Text synchronisiert)
const ydoc = new Y.Doc();

function connectEverything() {
    const provider = new WebrtcProvider('mein-geheimer-raum-123', ydoc, {
        password: 'passwort'
    });
            
    // 3. Zeige den Verbindungsstatus an
    provider.on('synced', (state) => {
        document.getElementById('status-text').innerText = "Verbunden mit anderen!";
    });

    // 4. Erstelle ein synchronisiertes Text-Feld im Yjs Dokument
    const yText = ydoc.getText('codemirror');

    // 5. CodeMirror Editor ganz normal starten
    const htmlEditor = CodeMirror.fromTextArea(document.getElementById('html-code'), {
        theme: "monokai",
        mode: "xml",
        lineNumbers: true
    });

    // 6. Die Brücke schlagen: Verbinde CodeMirror mit dem synchronisierten yText
    const binding = new CodeMirrorBinding(yText, htmlEditor, provider.awareness);

    // --- Vorschau Update Logik ---
    const preview = document.getElementById('preview');

    function updatePreview() {
        preview.srcdoc = htmlEditor.getValue();
    }
    
    // Immer wenn sich das synchronisierte Dokument ändert, Vorschau updaten
    yText.observe(() => {
        updatePreview();
    });
}