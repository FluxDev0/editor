/**
 * Sequencer.js - Multi-Track Piano Roll / Grid Manager
 */

import { DEFAULT_VALUES, Track, $ } from "./types.js";

/**
 * 
 * @template {keyof import("./types.js").SequencerOptions} K
 * @param {K} name
 * @param {Partial<import("./types.js").SequencerOptions>} options
 * @returns {import("./types.js").SequencerOptions[K]}
 */
function optional(name, options) {
    return options[name] ?? DEFAULT_VALUES.SequencerOptions[name];
}

export class Sequencer {
    /**
     * Constructor of the Sequencer Class
     * @param {HTMLCanvasElement} canvas canvas element of the Sequencer
     * @param {Partial<import("./types").SequencerOptions>} [options]
     */
    constructor(canvas, options = {}) {
        /** @type {HTMLCanvasElement} */
        this.canvas = canvas;
        
        const typeSave = canvas.getContext('2d');
        if (typeSave !== null) {
            /** @type {CanvasRenderingContext2D} */
            this.ctx = typeSave;
        }

        /** @type {number} */
        this.bpm = optional("bpm", options);
        /** @type {number} */
        this.totalSteps = optional("totalSteps", options); // Standardmäßig z.B. 64 Steps (4 Takte)
        /** @type {number} */
        this.numRows = optional("numRows", options);       // Tonhöhen-Umfang (Reihen)
        /** @type {number} */
        this.baseFreq = optional("baseFreq", options);     // C3 als Basis-Frequenz

        /** @type {number} */
        this.cellWidth = optional("cellWidth", options);
        /** @type {number} */
        this.cellHeight = optional("cellHeight", options);

        /** @type {string} */
        this.bgWhiteKey = optional("bgWhiteKey", options);
        /** @type {string} */
        this.bgBlackKey = optional("bgBlackKey", options);
        /** @type {string} */
        this.border1 = optional("border1", options);
        /** @type {string} */
        this.border2 = optional("border2", options);
        /** @type {string} */
        this.border3 = optional("border3", options);
        /** @type {string} */
        this.border4 = optional("border4", options);

        /** @type {number} */
        this.pianoKeysWidth = optional("pianoKeysWidth", options);
        /** @type {string} */
        this.pianoKeysFontSize = optional("pianoKeysFontSize", options);

        // Spuren-Verwaltung (Multi-Track)
        /** @type {Track[]} */
        this.tracks = [];
        /** @type {string | null} */
        this.activeTrackId = null;

        /** @type {string[]} */
        this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        // Erstelle mindestens eine Standard-Spur
        this.addTrack('Synth Lead', '#6366f1');
        this.addTrack('Bass', '#10b981');

        // Interaktions-Status (Drag, Resize, Selection)
        this.shiftOn = false;
        /** @type {import("./types").SequencerNote[]} */
        this.draggedNotes = [];
        /** @type {string | null} */
        this.dragMode = null; // 'move' oder 'resize'
        /** @type {number} */
        this.dragOffsetX = 0;
        /** @type {number} */
        this.dragOffsetY = 0;

        /** @type {boolean} */
        this.isPanning = false;
        /** @type {number} */
        this.panStartX = 0;
        /** @type {number} */
        this.panStartY = 0;

        /** @type {number} */
        this.scrollX = 0;
        /** @type {number} */
        this.scrollY = 0;

        /** @type {number} */
        this.playheadStep = -1;

        this._initEvents();
        this.resize();
    }

    /**
     * 
     * @param {string} inputParentSelector 
     */
    setInputs(inputParentSelector) {
        /** @type {HTMLInputElement | null} */
        let input;
        /** @type {HTMLInputElement[]} */
        let inputs = [];

        input = document.querySelector(inputParentSelector + " input#bpm");
        if (input) inputs.push(input);
        if (input) input.addEventListener("change", (e) => {
            this.bpm = parseInt(
                /**@type {HTMLInputElement}*/(e.target).value
            );
        });

        input = document.querySelector(inputParentSelector + " input#totalSteps");
        if (input) inputs.push(input);
        if (input) input.addEventListener("change", (e) => {
            this.setTotalSteps(parseInt(
                /**@type {HTMLInputElement}*/(e.target).value
            ));
        });

        input = document.querySelector(inputParentSelector + " input#numRows");
        if (input) inputs.push(input);
        if (input) input.addEventListener("change", (e) => {
            this.setNumRows(parseInt(
                /**@type {HTMLInputElement}*/(e.target).value
            ));
        });

        input = document.querySelector(inputParentSelector + " input#baseFreq");
        if (input) inputs.push(input);
        if (input) input.addEventListener("change", (e) => {
            this.baseFreq = parseFloat(
                /**@type {HTMLInputElement}*/(e.target).value
            );
        });

        input = document.querySelector(inputParentSelector + " input#cellWidth");
        if (input) inputs.push(input);
        if (input) input.addEventListener("change", (e) => {
            this.cellWidth = parseInt(
                /**@type {HTMLInputElement}*/(e.target).value
            );
            this.resize();
        });

        input = document.querySelector(inputParentSelector + " input#cellHeight");
        if (input) inputs.push(input);
        if (input) input.addEventListener("change", (e) => {
            this.cellHeight = parseInt(
                /**@type {HTMLInputElement}*/(e.target).value
            );
            this.resize();
        });

        input = document.querySelector(inputParentSelector + " input#pianoKeysWidth");
        if (input) inputs.push(input);
        if (input) input.addEventListener("change", (e) => {
            this.pianoKeysWidth = parseInt(
                /**@type {HTMLInputElement}*/(e.target).value
            );
            this.resize();
        });

        input = document.querySelector(inputParentSelector + " input#pianoKeysFontSize");
        if (input) inputs.push(input);
        if (input) input.addEventListener("change", (e) => {
            this.pianoKeysFontSize = parseInt(
                /**@type {HTMLInputElement}*/(e.target).value
            ) + "px";
            this.resize();
        });

        document.addEventListener("DOMContentLoaded", (e) => {
            inputs.forEach((i) => {
                i.value = /**@type {number}*/(this[/**@type {keyof Sequencer}*/(i.id)]).toString();
            });
        });
    }

    /**
     * Add a new Track to the Sequencer
     * @param {string} name name of the Track
     * @param {string} [color] color of the notes of the Track
     */
    addTrack(name, color = '#3b82f6') {
        const trackId = 'track_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        const newTrack = new Track(trackId, name, color);
        this.tracks.push(newTrack);

        // Falls noch kein aktiver Track existiert, setze diesen
        if (!this.activeTrackId) {
            this.activeTrackId = trackId;
        }

        this.draw();
        return newTrack;
    }

    /**
     * Remove a Track out from the Sequencer
     * @param {string} trackId Track-ID
     */
    removeTrack(trackId) {
        if (this.tracks.length <= 1) return; // Mindestens 1 Track muss erhalten bleiben
        this.tracks = this.tracks.filter(t => t.id !== trackId);
        if (this.activeTrackId === trackId) {
            this.activeTrackId = this.tracks[0].id;
        }
        this.draw();
    }

    /**
     * Returns the active Track.
     * @returns {Track}
     */
    getActiveTrack() {
        return this.tracks.find(t => t.id === this.activeTrackId) || this.tracks[0];
    }

    /**
     * Set the active Track based on the Track-ID
     * @param {string} trackId Track-ID
     */
    setActiveTrack(trackId) {
        if (this.tracks.some(t => t.id === trackId)) {
            this.activeTrackId = trackId;
            this.draw();
        }
    }

    // --- Musik-Länge & Raster-Anpassung ---

    /**
     * Ändert die Gesamtlänge des Lagers / Musikstücks in Steps
     * @param {number} newTotalSteps Z. B. 16, 32, 64, 128 Steps
     */
    setTotalSteps(newTotalSteps) {
        if (newTotalSteps < 4) return;
        this.totalSteps = Math.floor(newTotalSteps);
        this.resize();
    }

    /**
     * 
     * @param {number} newNumRows
     */
    setNumRows(newNumRows) {
        if (newNumRows < 4) return;
        this.numRows = Math.floor(newNumRows);

        // Alle Noten aller Spuren an die neue Reihen-Anzahl anpassen
        this.tracks.forEach(track => {
            track.notes.forEach(note => {
                // Falls alte Noten noch kein midi-Feld hatten:
                if (note.midi === undefined) {
                    note.midi = 48 + ((this.numRows - 1) - note.row);
                }

                // Neue Zeile (row) anhand der absoluten MIDI-Note berechnen
                const noteIndexFromBottom = note.midi - 48; // Base MIDI C3 = 48
                note.row = (this.numRows - 1) - noteIndexFromBottom;
            });
        });

        this.resize();
    }

    resize() {
        const parent = this.canvas.parentElement;
        if (parent) {
            this.canvas.width = parent.clientWidth;
            this.canvas.height = parent.clientHeight;
        } else {
            this.canvas.width = (this.cellWidth * this.totalSteps) + this.pianoKeysWidth;
            this.canvas.height = this.cellHeight * this.numRows;
        }
        this.clampScroll();
        this.draw();
    }


    clampScroll() {
        const maxScrollX = Math.max(0, (this.cellWidth * this.totalSteps) - (this.canvas.width - this.pianoKeysWidth));
        const maxScrollY = Math.max(0, (this.cellHeight * this.numRows) - this.canvas.height);

        this.scrollX = Math.max(0, Math.min(this.scrollX, maxScrollX));
        this.scrollY = Math.max(0, Math.min(this.scrollY, maxScrollY));
    }

    /**
     * 
     * @param {number} row
     */
    getFreqForRow(row) {
        const noteIndex = (this.numRows - 1) - row;
        return this.baseFreq * Math.pow(2, noteIndex / 12);
    }

    /**
     * Converts n amount of steps to seconds
     * @param {number} steps
     */
    stepsToSeconds(steps) {
        const secondsPerBeat = 60 / this.bpm;
        const secondsPerStep = secondsPerBeat / 4; // 16tel Noten
        return steps * secondsPerStep;
    }

    /**
    * Add a note to the active Track.
    * @param {number} row row of the note
    * @param {number} step rtep of the note
    */
    addNote(row, step) {
        const activeTrack = this.getActiveTrack();
        if (!activeTrack) return;

        const midi = this.getMidiForRow(row); // Absolute MIDI-Note berechnen

        const newNote = {
            id: Date.now() + Math.random(),
            step: step,
            row: row,
            midi: midi, // Absolute Tonhöhe speichern!
            durationSteps: 1
        };
        activeTrack.notes.push(newNote);
        this.draggedNotes = [newNote];
        this.dragMode = 'resize';
        this.draw();
    }

    /**
     * 
     * @param {MouseEvent} e 
     */
    _getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;

        return {
            rawX,
            rawY,
            // x & y im echten Grid-System (inklusive Scroll-Offset)
            gridX: rawX - this.pianoKeysWidth + this.scrollX,
            gridY: rawY + this.scrollY
        };
    }

    _initEvents() {
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Verhindert das Browser-Autoscroll-Icon bei Mittelklick
        this.canvas.addEventListener('auxclick', (e) => {
            if (e.button === 1) e.preventDefault();
        });

        // Optional: Mausrad-Scrollen unterstützen
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.shiftKey) {
                this.scrollX += e.deltaY;
            } else {
                this.scrollY += e.deltaY;
            }
            this.clampScroll();
            this.draw();
        }, { passive: false });

        const observer = new ResizeObserver((entries) => {
            this.resize();
        });

        observer.observe(/** @type {HTMLElement} */(this.canvas.parentElement))

        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        window.addEventListener('mouseup', () => this._onMouseUp());
        window.addEventListener('keydown', (e) => { if (e.key === "Shift") this.shiftOn = true; });
        window.addEventListener('keyup', (e) => { if (e.key === "Shift") this.shiftOn = false; });
    }

    /**
     * 
     * @param {MouseEvent} e 
     */
    _onMouseDown(e) {
        // MITTELKLICK (Button 1): Panning starten
        if (e.button === 1) {
            e.preventDefault();
            this.isPanning = true;
            this.panStartX = e.clientX;
            this.panStartY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        if (this.shiftOn) return;

        const activeTrack = this.getActiveTrack();
        if (!activeTrack) return;

        const { rawX, gridX, gridY } = this._getCanvasCoords(e);
        if (rawX < this.pianoKeysWidth) return; // Klick war auf den Piano Keys

        const step = Math.floor(gridX / this.cellWidth);
        const row = Math.floor(gridY / this.cellHeight);

        // Klick auf eine Note des AKTIVEN Tracks prüfen
        const clickedNote = activeTrack.notes.find(n =>
            n.row === row && gridX >= n.step * this.cellWidth && gridX <= (n.step + n.durationSteps) * this.cellWidth
        );

        // RECHTSKLICK: Note löschen
        if (e.button === 2) {
            if (clickedNote) {
                activeTrack.notes = activeTrack.notes.filter(n => n.id !== clickedNote.id);
                this.draw();
            }
            return;
        }

        // LINKSKLICK: Note bewegen / erzeugen / vergrößern
        if (e.button === 0) {
            if (clickedNote) {
                this.draggedNotes = [clickedNote];
                const noteRightEdge = (clickedNote.step + clickedNote.durationSteps) * this.cellWidth;

                if (Math.abs(gridX - noteRightEdge) < 12) {
                    this.dragMode = 'resize';
                } else {
                    this.dragMode = 'move';
                    this.dragOffsetX = step - clickedNote.step;
                    this.dragOffsetY = row - clickedNote.row;
                }
            } else {
                this.addNote(row, step);
            }
        }
    }


    /**
     * 
     * @param {MouseEvent} e 
     */
    _onMouseMove(e) {
        if (this.isPanning) {
            const dx = e.clientX - this.panStartX;
            const dy = e.clientY - this.panStartY;

            this.scrollX -= dx;
            this.scrollY -= dy;
            this.clampScroll();

            this.panStartX = e.clientX;
            this.panStartY = e.clientY;
            this.draw();
            return;
        }

        if (!this.draggedNotes || this.draggedNotes.length === 0) return;

        const { gridX, gridY } = this._getCanvasCoords(e);
        const currentStep = Math.floor(gridX / this.cellWidth);
        const currentRow = Math.floor(gridY / this.cellHeight);

        if (this.dragMode === 'move') {
            this.draggedNotes.forEach((note) => {
                let newStep = Math.max(0, Math.min(this.totalSteps - note.durationSteps, currentStep - this.dragOffsetX));
                let newRow = Math.max(0, Math.min(this.numRows - 1, currentRow - this.dragOffsetY));

                note.step = newStep;
                note.row = newRow;
                note.midi = this.getMidiForRow(newRow);
            });
        } else if (this.dragMode === 'resize') {
            this.draggedNotes.forEach((note) => {
                let newDuration = Math.max(1, (currentStep - note.step) + 1);
                if (note.step + newDuration <= this.totalSteps) {
                    note.durationSteps = newDuration;
                }
            });
        }

        this.draw();
    }

    _onMouseUp() {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'default';
        }

        this.draggedNotes = [];
        this.dragMode = null;
        this.draw();
    }

    // --- Rendering ---

    draw() {
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);

        this.ctx.save();

        this.ctx.beginPath();
        this.ctx.rect(this.pianoKeysWidth, 0, width - this.pianoKeysWidth, height);
        this.ctx.clip();

        for (let r = 0; r < this.numRows; r++) {
            const y = (r * this.cellHeight) - this.scrollY;
            if (y + this.cellHeight < 0 || y > height) continue;

            const midi = this.getMidiForRow(r);

            const noteIndex = Math.abs(midi) % 12;
            const noteName = this.noteNames[noteIndex];
            const isBlackKey = noteName.includes('#');

            this.ctx.fillStyle = isBlackKey ? this.bgBlackKey : this.bgWhiteKey;
            this.ctx.fillRect(this.pianoKeysWidth, y, width - this.pianoKeysWidth, this.cellHeight);

            this.ctx.strokeStyle = this.border4;
            this.ctx.beginPath();
            this.ctx.moveTo(this.pianoKeysWidth, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }

        // Vertikale Taktstrich-Linien
        for (let s = 0; s <= this.totalSteps; s++) {
            const xAxis = (s * this.cellWidth) - this.scrollX + this.pianoKeysWidth;
            if (xAxis < this.pianoKeysWidth || xAxis > width) continue;

            const isBar = s % 16 === 0;
            const isBeat = s % 4 === 0;

            this.ctx.strokeStyle = isBar ? this.border1 : (isBeat ? this.border2 : this.border3);
            this.ctx.lineWidth = isBar ? 2 : (isBeat ? 1 : 0.5);
            this.ctx.beginPath();
            this.ctx.moveTo(xAxis, 0);
            this.ctx.lineTo(xAxis, height);
            this.ctx.stroke();
        }

        this.tracks.forEach(track => {
            
            if (track.hide) return;
            const isActive = (track.id === this.activeTrackId);
            this.ctx.globalAlpha = isActive ? 1.0 : 0.35;

            track.notes.forEach(note => {
                
                let x = (note.step * this.cellWidth - this.scrollX + 1) + this.pianoKeysWidth;
                let y = (note.row * this.cellHeight - this.scrollY + 1);
                let w = note.durationSteps * this.cellWidth - 2;
                let h = this.cellHeight - 2;

                // Sichtbarkeitsprüfung
                if (x + w < this.pianoKeysWidth || x > width || y + h < 0 || y > height) return;

                if (this.draggedNotes.includes(note)) {
                    
                    const borderWidth = 1;
                    this.ctx.fillStyle = "#d9e2e4";
                    this.ctx.beginPath();
                    this.ctx.roundRect(x, y, w, h, 3);
                    this.ctx.fill();

                    x += borderWidth;
                    y += borderWidth;
                    w -= borderWidth * 2;
                    h -= borderWidth * 2;
                }

                this.ctx.fillStyle = track.color;
                this.ctx.beginPath();
                this.ctx.roundRect(x, y, w, h, 3);
                this.ctx.fill();

                if (isActive) {
                    
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    this.ctx.fillRect(x + w - 3, y, 2, h);
                }
            });
        });

        this.ctx.globalAlpha = 1.0; // Alpha zurücksetzen

        // 3. Playhead (Abspiel-Linie)
        if (this.playheadStep >= 0) {
            const playheadX = (this.playheadStep * this.cellWidth) - this.scrollX + this.pianoKeysWidth;
            if (playheadX >= this.pianoKeysWidth && playheadX <= width) {
                this.ctx.fillStyle = '#ef4444';
                this.ctx.fillRect(playheadX, 0, 2, height);
            }
        }

        this.ctx.restore();

        this.renderPianoKeys();
    }

    /**
     * 
     * @param {number} row 
     */
    getMidiForRow(row) {
        // Unterste Zeile (numRows - 1) ist die tiefste Note
        const noteIndexFromBottom = (this.numRows - 1) - row;

        // C3 entspricht MIDI Note 48 (baseFreq = 130.81 Hz)
        const baseMidi = 48;
        return baseMidi + noteIndexFromBottom;
    }

    renderPianoKeys() {
        const { height } = this.canvas;

        // Hintergrunde der Piano Keys am linken Rand
        this.ctx.fillStyle = this.bgBlackKey;
        this.ctx.fillRect(0, 0, this.pianoKeysWidth, height);

        for (let r = 0; r < this.numRows; r++) {
            const y = (r * this.cellHeight) - this.scrollY;
            if (y + this.cellHeight < 0 || y > height) continue;

            const midi = this.getMidiForRow(r);
            const noteIndex = Math.abs(midi) % 12;
            const noteName = this.noteNames[noteIndex];
            const octave = Math.floor(midi / 12) - 1;
            const isBlack = noteName.includes('#');

            this.ctx.strokeStyle = '#2d2d3d';
            this.ctx.beginPath();
            this.ctx.moveTo(0, y + this.cellHeight);
            this.ctx.lineTo(this.pianoKeysWidth, y + this.cellHeight);
            this.ctx.stroke();

            if (!isBlack || this.cellHeight >= 14) {
                this.ctx.fillStyle = isBlack ? '#8a94b8' : '#ffffff';
                this.ctx.font = `${Math.min(11, this.cellHeight - 2)}px monospace`;
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(`${noteName}${octave}`, 4, y + (this.cellHeight / 2));
            }
        }

        // Vertikale Trennlinie rechts von den Piano Keys
        this.ctx.strokeStyle = '#475569';
        this.ctx.beginPath();
        this.ctx.moveTo(this.pianoKeysWidth, 0);
        this.ctx.lineTo(this.pianoKeysWidth, height);
        this.ctx.stroke();
    }

    toJSON() {
        return {
            bpm: this.bpm,
            totalSteps: this.totalSteps,
            numRows: this.numRows,
            baseFreq: this.baseFreq,
            cellWidth: this.cellWidth,   // <-- WICHTIG
            cellHeight: this.cellHeight, // <-- WICHTIG
            tracks: this.tracks
        };
    }

    /**
     * 
     * @param {import("./types").SequencerAsJSON | string} data 
     */
    fromJSON(data) {
        // Wenn 'data' als JSON-String übergeben wurde, zuerst parsen
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

        if (parsedData.bpm !== undefined) this.bpm = parsedData.bpm;
        if (parsedData.totalSteps !== undefined) this.totalSteps = parsedData.totalSteps;
        if (parsedData.numRows !== undefined) this.numRows = parsedData.numRows;
        if (parsedData.baseFreq !== undefined) this.baseFreq = parsedData.baseFreq;

        // Zuweisung von cellWidth und cellHeight:
        if (parsedData.cellWidth !== undefined) this.cellWidth = parsedData.cellWidth;
        if (parsedData.cellHeight !== undefined) this.cellHeight = parsedData.cellHeight;

        if (parsedData.tracks !== undefined) this.tracks = parsedData.tracks;

        if (this.tracks && this.tracks.length > 0) {
            this.activeTrackId = this.tracks[0].id;
        }

        // Canvas neu an die geänderten Abmessungen anpassen & neu zeichnen
        this.resize();
    }
}