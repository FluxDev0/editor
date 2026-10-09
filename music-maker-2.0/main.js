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

let isPlaying = false;

/** @type {number} */
let playheadInterval;
/** @type {number} */
let playTimeout;

/** @type {HTMLSelectElement} */
const trackSelect = $(HTMLSelectElement, '#trackSelect');
/** @type {HTMLInputElement} */
const lengthInput = $(HTMLInputElement, '#lengthInput');
/** @type {HTMLInputElement} */
const rowsInput = $(HTMLInputElement, '#rowsInput');

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

lengthInput.addEventListener('change', (e) => {
    sequencer.setTotalSteps(parseInt(/** @type {HTMLInputElement} */ (e.target).value));
});

rowsInput.addEventListener('change', (e) => {
    sequencer.setNumRows(parseInt(/** @type {HTMLInputElement} */ (e.target).value));
});

function initAudio() {
    if (!audioCtx) {
    audioCtx = new window.AudioContext();
    fxChain = new FXChain(audioCtx);
    fxChain.outputNode.connect(audioCtx.destination);
    synth = new Synth(audioCtx, fxChain.inputNode);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

$(HTMLElement, '#playBtn').addEventListener('click', () => {
    if(isPlaying == true) return;

    isPlaying = true;

    initAudio();
    const startTime = audioCtx.currentTime + 0.1;

    // Alle Noten aus ALLEN Spuren abspielen
    sequencer.tracks.forEach(track => {
        if (track.muted) return; // Stumme Spuren überspringen

        track.notes.forEach(note => {
            const freq = sequencer.getFreqForRow(note.row);
            const noteStartTime = startTime + sequencer.stepsToSeconds(note.step);
            const duration = sequencer.stepsToSeconds(note.durationSteps);

            if (note.step < sequencer.totalSteps) synth.playNote(freq, noteStartTime, duration);
        });
    });

    let currentStep = 0;
    const stepDurationMs = sequencer.stepsToSeconds(1) * 1000;

    // ANGEPASST: Nutze die obere Variable statt "const interval"
    playheadInterval = setInterval(() => {
        sequencer.playheadStep = currentStep;
        sequencer.draw();
        currentStep++;
        if (currentStep >= sequencer.totalSteps) {
            clearInterval(playheadInterval);
            setTimeout(() => {
                sequencer.playheadStep = -1;
                sequencer.draw();
            }, stepDurationMs);
        }
    }, stepDurationMs);

    playTimeout = setTimeout(() => {
        isPlaying = false;
        clearTimeout(playTimeout)
    }, sequencer.stepsToSeconds(sequencer.totalSteps) * 1000);
});

$(HTMLElement, '#stopBtn').addEventListener('click', () => {
    if (!isPlaying) return; // Wenn nichts spielt, tue nichts

    isPlaying = false;

    // 1. Stoppe die visuelle Playhead-Animation und das End-Timeout
    clearInterval(playheadInterval);
    clearTimeout(playTimeout);

    // 2. Setze den Playhead zurück
    sequencer.playheadStep = -1;
    sequencer.draw();

    // 3. Sag dem Synthesizer, dass er alle laufenden Web-Audio-Nodes abbrechen soll
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

document.addEventListener("DOMContentLoaded", () => {
    lengthInput.value = sequencerOptions.totalSteps.toString();
    rowsInput.value = sequencerOptions.numRows.toString();
});