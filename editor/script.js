// 1. CODEMIRROR INITIALISIEREN
const editorConfig = {
    theme: "monokai",
    lineNumbers: true,
    lineWrapping: true
};

const htmlEditor = CodeMirror.fromTextArea(document.getElementById('html-code'), { ...editorConfig, mode: "xml" });
const cssEditor = CodeMirror.fromTextArea(document.getElementById('css-code'), { ...editorConfig, mode: "css" });
const jsEditor = CodeMirror.fromTextArea(document.getElementById('js-code'), { ...editorConfig, mode: "javascript" });

// Startwerte setzen
htmlEditor.setValue("<h1>Hallo Programmierer!</h1>\n<p>Dieser Editor nutzt jetzt CodeMirror.</p>");
cssEditor.setValue("h1 {\n  color: red;\n}");
jsEditor.setValue("console.log('Editor geladen!');");

// 2. VORSCHAU AKTUALISIEREN
const preview = document.getElementById('preview');

function updatePreview() {
    const html = htmlEditor.getValue();
    const css = `<style>${cssEditor.getValue()}<\/style>`;
    const js = `<script>${jsEditor.getValue()}<\/script>`;
            
    preview.srcdoc = html + css + js;
}

// Sobald in einem Editor getippt wird -> Vorschau updaten
htmlEditor.on("change", updatePreview);
cssEditor.on("change", updatePreview);
jsEditor.on("change", updatePreview);

// Einmal am Anfang ausführen
updatePreview();

// 3. HERUNTERLADEN-FUNKTION
function downloadCode() {
    // Wir bauen eine saubere HTML-Struktur auf
    const fullCode = `<!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <title>Mein Exportiertes Projekt</title>
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
    //
    // Verwandle den Text in eine Datei ("Blob")
    const blob = new Blob([fullCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    //
    // Erstelle einen unsichtbaren Link und klicke ihn an
    const a = document.createElement('a');
    a.href = url;
    a.download = "mein_projekt.html";
    a.click();
    //
    // Aufräumen
    URL.revokeObjectURL(url);
}
//
// 4. HOCHLADEN-FUNKTION
document.getElementById('file-upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;
    //
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        //
        // Wir tun so, als wäre der geladene Text eine unsichtbare Website im Browser
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        //
        // 1. CSS herausfiltern
        let cssText = "";
        doc.querySelectorAll("style").forEach(styleTag => {
            cssText += styleTag.innerHTML + "\n";
            styleTag.remove(); // Danach aus dem Dokument löschen
        });
        //
        // 2. JavaScript herausfiltern
        let jsText = "";
        doc.querySelectorAll("script").forEach(scriptTag => {
            jsText += scriptTag.innerHTML + "\n";
            scriptTag.remove(); // Danach aus dem Dokument löschen
        });
        //
        // 3. HTML ist das, was im <body> übrig bleibt
        let htmlText = doc.body.innerHTML.trim();
        //
        // 4. Den Code in die Editoren einfügen
        htmlEditor.setValue(htmlText);
        cssEditor.setValue(cssText.trim());
        jsEditor.setValue(jsText.trim());
    };
    //
    // Datei als Text lesen
    reader.readAsText(file);
    //
    // Input zurücksetzen (damit man die gleiche Datei nochmal laden kann)
    event.target.value = "";
});