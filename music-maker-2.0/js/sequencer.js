/**
 * Sequencer.js - Multi-Track Piano Roll / Grid Manager
 */

import { Track } from "./types.js";

export class Sequencer {
    /**
     * Constructor of the Sequencer Class
     * @param {HTMLCanvasElement} canvas canvas element of the Sequencer
     * @param {import("./types").SequencerOptions} [options]
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
        this.bpm = options.bpm ?? 120;
        /** @type {number} */
        this.totalSteps = options.totalSteps ?? 64; // Standardmäßig z.B. 64 Steps (4 Takte)
        /** @type {number} */
        this.numRows = options.numRows ?? 24;       // Tonhöhen-Umfang (Reihen)
        /** @type {number} */
        this.baseFreq = options.baseFreq ?? 130.81;  // C3 als Basis-Frequenz

        /** @type {number} */
        this.cellWidth = options.cellWidth ?? 20;
        /** @type {number} */
        this.cellHeight = options.cellHeight ?? 20;

        /** @type {string} */
        this.bgWhiteKey = options.bgWhiteKey ?? "#22222e";
        /** @type {string} */
        this.bgBlackKey = options.bgBlackKey ?? "#1a1a24";
        /** @type {string} */
        this.border1 = options.border1 ?? '#64748b';
        /** @type {string} */
        this.border2 = options.border2 ?? '#334155';
        /** @type {string} */
        this.border3 = options.border3 ?? '#1e293b';
        /** @type {string} */
        this.border4 = options.border4 ?? '#2d2d3d';

        /** @type {number} */
        this.pianoKeysWidth = options.pianoKeysWidth ?? 30;
        /** @type {string} */
        this.pianoKeysFontSize = options.pianoKeysFontSize ?? "12px";

        this.setOptions(options);

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

        /** @type {number} */
        this.playheadStep = -1;

        this._initEvents();
        this.resize();
    }

    /**
     * Set the options of the Sequencer.
     * @param {import("./types").SequencerOptions} options the optional options
     */
    setOptions(options) {
        this.bpm = options.bpm ?? 120;
        this.totalSteps = options.totalSteps || 64; // Standardmäßig z.B. 64 Steps (4 Takte)
        this.numRows = options.numRows || 24;       // Tonhöhen-Umfang (Reihen)
        this.baseFreq = options.baseFreq || 130.81;  // C3 als Basis-Frequenz

        this.cellWidth = options.cellWidth || 20;
        this.cellHeight = options.cellHeight || 20;

        this.bgWhiteKey = options.bgWhiteKey || "#22222e";
        this.bgBlackKey = options.bgBlackKey || "#1a1a24";
        this.border1 = options.border1 || '#64748b';
        this.border2 = options.border2 || '#334155';
        this.border3 = options.border3 || '#1e293b';
        this.border4 = options.border4 || '#2d2d3d';

        this.pianoKeysWidth = options.pianoKeysWidth || 30;
        this.pianoKeysFontSize = options.pianoKeysFontSize || "12px";

        if(this.tracks) this.resize();
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
        this.canvas.width = (this.cellWidth * this.totalSteps) + this.pianoKeysWidth;
        this.canvas.height = this.cellHeight * this.numRows;
        this.draw();
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
    * Initialize all events.
    */
    _initEvents() {
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        window.addEventListener('mouseup', () => this._onMouseUp());
        window.addEventListener('keydown', (e) => { if(e.key == "Shift") this.shiftOn = true; });
        window.addEventListener('keyup', (e) => { if(e.key == "Shift") this.shiftOn = false; });
    }

    /**
     * 
     * @param {MouseEvent} e 
     */
    _getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left - this.pianoKeysWidth,
            y: e.clientY - rect.top
        };
    }

    /**
     * 
     * @param {MouseEvent} e 
     */
    _onMouseDown(e) {
        if(this.shiftOn == true) return;

        const activeTrack = this.getActiveTrack();
        if (!activeTrack) return;

        const { x, y } = this._getCanvasCoords(e);
        if(x < 0) return;
        
        const step = Math.floor(x / this.cellWidth);
        const row = Math.floor(y / this.cellHeight);

        // Klick auf eine Note des AKTIVEN Tracks prüfen
        const clickedNote = activeTrack.notes.find(n => 
            n.row === row && x >= n.step * this.cellWidth && x <= (n.step + n.durationSteps) * this.cellWidth
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
                
                if (Math.abs(x - noteRightEdge) < 12) {
                    this.dragMode = 'resize';
                } else {
                    this.dragMode = 'move';
                    this.dragOffsetX = step - clickedNote.step;
                    this.dragOffsetY = row - clickedNote.row;
                }
            } else {
                // Neue Note auf dem aktuellen Track erzeugen
                this.addNote(row, step)
            }
        }
    }

    /**
     * 
     * @param {MouseEvent} e 
     */
    _onMouseMove(e) {
        if (!this.draggedNotes) return;

        const { x, y } = this._getCanvasCoords(e);
        const currentStep = Math.floor(x / this.cellWidth);
        const currentRow = Math.floor(y / this.cellHeight);

        if (this.dragMode === 'move') {
            this.draggedNotes.forEach((note) => {
                let newStep = Math.max(0, Math.min(this.totalSteps - note.durationSteps, currentStep - this.dragOffsetX));
                let newRow = Math.max(0, Math.min(this.numRows - 1, currentRow - this.dragOffsetY));

                note.step = newStep;
                note.row = newRow;
                note.midi = this.getMidiForRow(newRow); // MIDI-Wert an neue Position anpassen!
            });
        } else if (this.dragMode === 'resize') {
            this.draggedNotes.forEach((note) => {
                let newDuration = Math.max(1, (currentStep - note.step) + 1);
                if (note.step + newDuration <= this.totalSteps) {
                    note.durationSteps = newDuration;
                }
            });
        } else if (this.dragMode === "select") {
            
        }

        this.draw();
    }

    _onMouseUp() {
        this.draggedNotes = [];
        this.dragMode = null;

        this.draw();
    }

    // --- Rendering ---

    draw() {
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);

        // 1. Hintergrund-Gitter
        for (let r = 0; r < this.numRows; r++) {
            const midi = this.getMidiForRow(r);

            const noteIndex = Math.abs(midi) % 12;
            const noteName = this.noteNames[noteIndex];
            const isBlackKey = noteName.includes('#');

            this.ctx.fillStyle = isBlackKey ? this.bgBlackKey : this.bgWhiteKey;
            this.ctx.fillRect(0, r * this.cellHeight, width, this.cellHeight);

            this.ctx.strokeStyle = this.border4;
            this.ctx.beginPath();
            this.ctx.moveTo(this.pianoKeysWidth, r * this.cellHeight);
            this.ctx.lineTo(width, r * this.cellHeight);
            this.ctx.stroke();
        }

        // Vertikale Taktstrich-Linien
        for (let s = 0; s < this.totalSteps; s++) {
            const isBar = s % 16 === 0; // Ganzer Takt
            const isBeat = s % 4 === 0; // Viertel-Takt

            this.ctx.strokeStyle = isBar ? this.border1 : (isBeat ? this.border2 : this.border3);
            this.ctx.lineWidth = isBar ? 2 : (isBeat ? 1 : 0.5);
            this.ctx.beginPath();
            const xAxis = (s * this.cellWidth)  + this.pianoKeysWidth;
            this.ctx.moveTo(xAxis, 0);
            this.ctx.lineTo(xAxis, height);
            this.ctx.stroke();
        }

        // 2. Noten zeichnen (Zuerst inaktive Spuren leicht transparent, dann aktive Spur)
        this.tracks.forEach(track => {
            if (track.hide) return;
            const isActive = (track.id === this.activeTrackId);
            this.ctx.globalAlpha = isActive ? 1.0 : 0.35; // Inaktive Spuren werden leicht ausgeblendet

            track.notes.forEach(note => {
                let x = (note.step * this.cellWidth + 1) + this.pianoKeysWidth;
                let y = note.row * this.cellHeight + 1;
                let w = note.durationSteps * this.cellWidth - 2;
                let h = this.cellHeight - 2;

                // Selected Notes border
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
                    // Rechter Rand als Resizer
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    this.ctx.fillRect(x + w - 3, y, 2, h);
                }
            });
        });

        this.ctx.globalAlpha = 1.0; // Alpha zurücksetzen

        // 3. Playhead (Abspiel-Linie)
        if (this.playheadStep >= 0) {
            this.ctx.fillStyle = '#ef4444';
            this.ctx.fillRect(this.pianoKeysWidth + (this.playheadStep * this.cellWidth), 0, 2, height);
        }

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
        for (let r = 0; r < this.numRows; r++) {
            const y = r * this.cellHeight;
            const midi = this.getMidiForRow(r);

            const noteIndex = Math.abs(midi) % 12;
            const noteName = this.noteNames[noteIndex];
            const octave = Math.floor(midi / 12) - 1;
            const isBlack = noteName.includes('#');

            // 2. Notenname (z. B. C3, F#3) zentriert in der Zelle zeichnen
            // Zeige schwarze Tasten nur an, wenn die Zellenhöhe groß genug ist
            if (!isBlack || this.cellHeight >= 14) {
                this.ctx.fillStyle = isBlack ? '#8a94b8' : '#ffffff';
                this.ctx.font = `${Math.min(11, this.cellHeight - 2)}px monospace`;
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(`${noteName}${octave}`, 4, y + (this.cellHeight / 2));
            }
        }
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