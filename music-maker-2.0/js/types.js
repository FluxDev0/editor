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
 * @property {number} [bpm]
 * @property {number} [totalSteps]
 * @property {number} [numRows]
 * @property {number} [baseFreq]
 * @property {number} [cellWidth]
 * @property {number} [cellHeight]
 * @property {string} [bgWhiteKey]
 * @property {string} [bgBlackKey]
 * @property {string} [border1]
 * @property {string} [border2]
 * @property {string} [border3]
 * @property {string} [border4]
 * @property {number} [pianoKeysWidth]
 * @property {string} [pianoKeysFontSize]
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