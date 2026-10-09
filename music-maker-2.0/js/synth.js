/**
 * Synth.js - Synthesizer Modul mit ADSR, Pitch/Detune und Filter
 */

import { DEFAULT_VALUES } from "./types.js";

export class Synth {
    /**
     * Constructor of the Synth Class
     * @param {AudioContext} audioCtx AudioContext object
     * @param {AudioNode} destination
     */
    constructor(audioCtx, destination) {
        this.ctx = audioCtx;
        this.destination = destination; // Wohin der Ton geroutet wird (Master oder FX)

        // Standard-Parameter
        /** @type {import("./types").SynthParameters} */
        this.params = { ...DEFAULT_VALUES.SynthParameters };

        /** @type {import("./types").SynthActiveNode[]} */
        this.activeNodes = [];
    }

    // Parameter dynamisch anpassen
    /**
     * 
     * @param {keyof import("./types").SynthParameters} name 
     * @param {any} value 
     */
    setParam(name, value) {
        if (name in this.params) {
            /** @type {any} */ (this.params[name]) = value;
        }
    }

    /**
     * Set the parameters for playing notes 
     * @param {import("./types").SynthParameters} params the parameters
     */
    setParams(params) {
        this.params = params;
    }

    /**
 * Spielt eine Note ab
 * @param {number} freq - Grundfrequenz der Note in Hz
 * @param {number} [startTime] - Startzeit im AudioContext (0 für sofort)
 * @param {number} [duration] - Dauer der gehaltenen Note in Sekunden
 * @param {import("./types.js").SynthParameters} [params] - Die Synth-Parameter dieser Spur
 */
    playNote(freq, startTime = this.ctx.currentTime, duration = 0.5, params = this.params) {
        if (!freq || freq <= 0) return;

        // Verwende die spurspezifischen params
        const finalFreq = freq * Math.pow(2, params.octaveShift);

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // Oszillator mit spurspezifischen Parametern konfigurieren
        osc.type = params.type;
        osc.frequency.setValueAtTime(finalFreq, startTime);
        osc.detune.setValueAtTime(params.detune, startTime);

        // Filter konfigurieren
        filter.type = params.filterType;
        filter.frequency.setValueAtTime(params.filterCutoff, startTime);
        filter.Q.setValueAtTime(params.filterResonance, startTime);

        // ADSR Hüllkurve
        const now = startTime;
        const { attack, decay, sustain, release } = params;
        const noteEndTime = now + duration;

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(1.0, now + Math.max(attack, 0.001));
        
        // Decay: Von 1 auf Sustain-Level
        gainNode.gain.exponentialRampToValueAtTime(
            Math.max(sustain, 0.0001),
            now + attack + Math.max(decay, 0.001)
        );

        // Release: Ab Note-Ende auf 0 abfallen
        gainNode.gain.setValueAtTime(Math.max(sustain, 0.0001), noteEndTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + Math.max(release, 0.001));

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.destination);

        osc.start(now);
        osc.stop(noteEndTime + release + 0.1);

        this.activeNodes.push({ osc, gainNode });

        osc.onended = () => {
            this.activeNodes = this.activeNodes.filter(n => n.osc !== osc);
        };
    }

    // NEU: Methode zum sofortigen Stoppen aller Töne
    stopAll() {
        const now = this.ctx.currentTime;
        this.activeNodes.forEach(({ osc, gainNode }) => {
            try {
                // Geplante Lautstärke-Änderungen abbrechen
                gainNode.gain.cancelScheduledValues(now);
                // Sofort stumm schalten (verhindert Knacksen)
                gainNode.gain.setValueAtTime(0, now);
                // Oszillator stoppen
                osc.stop(now);
            } catch (e) {
                // Ignorieren, falls der Oszillator bereits gestoppt war
            }
        });
        this.activeNodes = [];
    }
}