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
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                // JSDoc-Typkonvertierung beibehalten
                const data = JSON.parse(
                    /** @type {string} */ (
                        /** @type {FileReader} */ (e.target).result
                    )
                );
                resolve(data); // Übergibt die Daten an das Promise
            } catch (error) {
                reject(new Error("Ungültiges JSON-Format: " + error.message));
            }
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsText(file); // Startet den Lesevorgang
    });
}