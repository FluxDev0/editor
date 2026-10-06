/**
 * 
 * @param {*} data 
 * @param {string} filename 
 * @param {string} [mimeType]
 */
export function downloadFile(data, filename, mimeType = 'application/json') {
    // Blob mit dem passenden MIME-Type erstellen
    const blob = new Blob([data], { type: mimeType });
  
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * 
 * @param {Blob} file 
 */
export function readJsonFile(file) {
    const reader = new FileReader();

    // Warten, bis das Lesen abgeschlossen ist
    reader.onload = (e) => {
        const data = JSON.parse(
            /** @type {string} */ (
                /** @type {FileReader} */ (e.target).result
            )
        );
        return data;
    };

    // Lesen starten (z. B. als Text)
    reader.readAsText(file);
}