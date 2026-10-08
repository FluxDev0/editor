/**
 * @typedef {Object} FXChainParameters
 * @property {number} distortionAmount
 * @property {number} delayTime
 * @property {number} delayFeedback
 * @property {number} delayMix
 * @property {number} reverbMix
 * @property {number} lfoFreq
 * @property {number} lfoDepth
 */

/**
 * @typedef {Object} SequencerOptions
 * @property {number} bpm
 * @property {number} totalSteps
 * @property {number} numRows
 * @property {number} baseFreq
 * @property {number} cellWidth
 * @property {number} cellHeight
 * @property {string} bgWhiteKey
 * @property {string} bgBlackKey
 * @property {string} border1
 * @property {string} border2
 * @property {string} border3
 * @property {string} border4
 * @property {number} pianoKeysWidth
 * @property {string} pianoKeysFontSize
 */

/**
 * @typedef {Object} SequencerAsJSON
 * @property {number} [bpm]
 * @property {number} [totalSteps]
 * @property {number} [numRows]
 * @property {number} [baseFreq]
 * @property {number} [cellWidth]
 * @property {number} [cellHeight]
 * @property {Track[]} [tracks]
 */

/**
 * @typedef {Object} SequencerNote
 * @property {number} id
 * @property {number} step
 * @property {number} row
 * @property {number} midi
 * @property {number} durationSteps
 */

/**
 * @typedef {Object} SynthParameters
 * @property {OscillatorType} type
 * @property {number} octaveShift
 * @property {number} detune
 * @property {number} attack
 * @property {number} decay
 * @property {number} sustain
 * @property {number} release
 * @property {BiquadFilterType} filterType
 * @property {number} filterCutoff
 * @property {number} filterResonance
 */

/**
 * @typedef {Object} DefaultValues
 * @property {FXChainParameters} FXChainParameters
 * @property {SynthParameters} SynthParameters
 * @property {SequencerOptions} SequencerOptions
 */

/** @type {DefaultValues} */
export const DEFAULT_VALUES = {
    FXChainParameters: {
        distortionAmount: 0,
        delayTime: 0.3,
        delayFeedback: 0.4,
        delayMix: 0,
        reverbMix: 0,
        lfoFreq: 2,
        lfoDepth: 0
    },
    SynthParameters: {
        type: "sawtooth",
        octaveShift: 0,
        detune: 0,
        attack: 0.1,
        decay: 0.2,
        sustain: 0.5,
        release: 0.3,
        filterType: "lowpass",
        filterCutoff: 2000,
        filterResonance: 1
    },
    SequencerOptions: {
        bpm: 120,
        totalSteps: 64,
        numRows: 24,
        baseFreq: 130.81,
        cellWidth: 20,
        cellHeight: 30,
        bgWhiteKey: "#22222e",
        bgBlackKey: "#1a1a24",
        border1: "#64748b",
        border2: "#334155",
        border3: "#1e293b",
        border4: "#2d2d3d",
        pianoKeysWidth: 30,
        pianoKeysFontSize: "12px"
    }
}

export class Track {
    /**
     * Constructor of the Track Class
     * @param {string} id
     * @param {string} [name]
     * @param {string} [color]
     */
    constructor(id, name = 'Track 1', color = '#6366f1') {
        /** @type {string} */
        this.id = id;
        /** @type {string} */
        this.name = name;
        /** @type {string} */
        this.color = color;
        /** @type {boolean} */
        this.muted = false;
        /** @type {boolean} */
        this.solo = false;
        /** @type {boolean} */
        this.hide = false;
        /** @type {number} */
        this.volume = 1.0;
        /** @type {SequencerNote[]} */
        this.notes = []; // Noten für diese spezifische Spur: { id, step, row, durationSteps }
        /** @type {FXChainParameters} */
        this.fxParams = DEFAULT_VALUES.FXChainParameters;
        /** @type {SynthParameters} */
        this.synthParams = DEFAULT_VALUES.SynthParameters;
    }
}

/**
 * Wählt ein Element aus und stellt per instanceof sicher, dass es den gewünschten Typ hat.
 *
 * @template {Element} T
 * @param {new (...args: any[]) => T} ElementClass - Die HTML-Klasse (z. B. HTMLCanvasElement)
 * @param {string} selector - Der CSS-Selektor (z. B. '#myCanvas')
 * @returns {T}
 */
export function $(ElementClass, selector) {
    const el = document.querySelector(selector);
    if (!(el instanceof ElementClass)) {
        throw new Error(`Element "${selector}" wurde nicht gefunden oder ist kein ${ElementClass.name}.`);
    }
    return el;
}

/**
 * @template T
 * @param {new (...args: any[]) => T} VariableClass
 * @param {any} Variable
 * @returns {T}
 */
export function typecast(VariableClass, Variable) {
    if (!(Variable instanceof VariableClass)) {
        throw new Error(`Element wurde nicht gefunden oder ist kein ${VariableClass.name}.`);
    }
    return Variable;
}