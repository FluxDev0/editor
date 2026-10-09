import { Synth } from './js/synth.js';
import { FXChain } from './js/fx.js';
import { Sequencer } from './js/sequencer.js';
import { Splitter } from './js/splitter.js';
import { $ } from './js/types.js';

/** @type {AudioContext} */
let audioCtx;
/** @type {Synth} */
let synth;
/** @type {FXChain} */
let fxChain;
/** @type {Sequencer} */
let sequencer;

/** @type {HTMLCanvasElement} */
const canvas = $(HTMLCanvasElement ,'canvas#gridCanvas');

const sequencerOptions = {
    totalSteps: 128, 
    numRows: 64, 
    cellWidth: 20, 
    cellHeight: 20
}

sequencer = new Sequencer(canvas, sequencerOptions);

sequencer.setInputs("#sequencer-inputs.sidebar-section");

// 1. Links <-> Rechts Splitter (Sidebar vs. Hauptbereich)
new Splitter({
    gutter: $(HTMLElement, '#gutterSidebar'),
    paneA: $(HTMLElement, '#sidebarPane'),
    paneB: $(HTMLElement, '#mainPane'),
    direction: 'horizontal',
    minA: 160,
    minB: 400,
    onResize: () => sequencer.draw()
});

// 2. Oben <-> Unten Splitter (Sequencer vs. Bottom FX/Synth Panel)
new Splitter({
    gutter: $(HTMLElement, '#gutterMain'),
    paneA: $(HTMLElement, '#sequencerPane'),
    paneB: $(HTMLElement, '#bottomPane'),
    direction: 'vertical',
    minA: 200,
    minB: 100,
    onResize: () => sequencer.draw()
});

/** @type {boolean} */
let isPlaying = false;
/** @type {number} */
let currentStep = 0;
/** @type {number} */
let nextStepTime = 0.0;
/** @type {number} */
let schedulerTimer;

/** @type {HTMLSelectElement} */
const trackSelect = $(HTMLSelectElement, '#trackSelect');

// UI Dropdown für Tracks aktualisieren
function updateTrackDropdown() {
    trackSelect.innerHTML = '';
    sequencer.tracks.forEach(track => {
        const opt = document.createElement('option');
        opt.value = track.id;
        opt.textContent = track.name;
        opt.selected = (track.id === sequencer.activeTrackId);
        trackSelect.appendChild(opt);
    });
}

updateTrackDropdown();

// Event Listener
trackSelect.addEventListener('change', (e) => {
    sequencer.setActiveTrack(/** @type {HTMLSelectElement} */ (e.target).value);
});

$(HTMLElement, '#addTrackBtn').addEventListener('click', () => {
    const name = prompt('Name für die neue Spur:', 'Track ' + (sequencer.tracks.length + 1));
    if (name) {
        const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
        sequencer.addTrack(name, randomColor);
        updateTrackDropdown();
    }
});

function initAudio() {
    if (!audioCtx) {
        audioCtx = new window.AudioContext();
        fxChain = new FXChain(audioCtx);
        fxChain.outputNode.connect(audioCtx.destination);
        synth = new Synth(audioCtx, fxChain.inputNode);

        synth.setInputs("#synth-inputs");
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function schedulePlayback() {
    if (!isPlaying) return;

    const lookahead = 0.1; // 100 Millisekunden in die Zukunft schauen

    // Solange der nächste Step innerhalb unseres kleinen Zeitfensters liegt...
    while (nextStepTime < audioCtx.currentTime + lookahead) {

        // 1. Finde alle Noten, die GENAU in diesem Step STARTEN
        sequencer.tracks.forEach(track => {
            if (track.muted) return;

            track.notes.forEach(note => {
                // Nur Töne auslösen, die exakt an der aktuellen Playhead-Position beginnen
                if (note.step === currentStep) {
                    const freq = sequencer.getFreqForRow(note.row);
                    const duration = sequencer.stepsToSeconds(note.durationSteps);
                    // Ton für den exakten Zeitpunkt in der nahen Zukunft planen
                    synth.playNote(freq, nextStepTime, duration);
                }
            });
        });

        // 2. Playhead-Grafik exakt zur berechneten Zeit zeichnen
        const stepToDraw = currentStep;
        const timeUntilPlay = Math.max(0, (nextStepTime - audioCtx.currentTime) * 1000);

        setTimeout(() => {
            if (isPlaying) {
                sequencer.playheadStep = stepToDraw;
                sequencer.draw();
            }
        }, timeUntilPlay);

        // 3. Zeit und Step für den nächsten Schleifendurchlauf erhöhen
        nextStepTime += sequencer.stepsToSeconds(1);
        currentStep++;

        // 4. Stoppen, wenn das Ende des Grids erreicht ist
        if (currentStep >= sequencer.totalSteps) {
            isPlaying = false;
            setTimeout(() => {
                sequencer.playheadStep = -1;
                sequencer.draw();
            }, timeUntilPlay + (sequencer.stepsToSeconds(1) * 1000));
            break;
        }
    }

    // Funktion kurz darauf erneut aufrufen, um den nächsten Puffer zu füllen
    if (isPlaying) {
        schedulerTimer = setTimeout(schedulePlayback, 25);
    }
}

$(HTMLElement, '#playBtn').addEventListener('click', () => {
    if (isPlaying) return;

    initAudio(); // AudioContext ggf. starten
    isPlaying = true;

    currentStep = 0;
    // Kurze Start-Verzögerung von 50ms, damit die Engine ruckelfrei startet
    nextStepTime = audioCtx.currentTime + 0.05;

    // Scheduling-Loop starten
    schedulePlayback();
});

$(HTMLElement, '#stopBtn').addEventListener('click', () => {
    if (!isPlaying) return;

    isPlaying = false;
    clearTimeout(schedulerTimer); // Vorausschauendes Planen abbrechen

    // Visuellen Playhead zurücksetzen
    sequencer.playheadStep = -1;
    sequencer.draw();

    // Alle aktuell laufenden und geplanten Web-Audio-Nodes stummschalten
    if (synth) {
        synth.stopAll();
    }
});

function test1() {
    console.log("Original Sequencer Object: ", sequencer);

    const stringified = sequencer.toJSON();

    console.log("Sequencer Object before parsing: ", stringified);

    const seq2 = new Sequencer(canvas);
    seq2.fromJSON(stringified)

    console.log("Sequencer Object after parsing: ", seq2);
}