/**
 * Synth.js - Synthesizer Modul mit ADSR, Pitch/Detune und Filter
 */

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
        this.params = {
            type: 'sawtooth',    // sine, square, sawtooth, triangle
            octaveShift: 0,      // -2 bis +2 Oktaven
            detune: 0,           // in Cents (-100 bis +100)
            
            // ADSR Envelope (in Sekunden)
            attack: 0.01,
            decay: 0.2,
            sustain: 0.5,        // Pegel 0.0 bis 1.0
            release: 0.3,

            // Filter
            filterType: 'lowpass', // lowpass, highpass, bandpass
            filterCutoff: 2000,    // Frequenz in Hz
            filterResonance: 1     // Q-Faktor
        };
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
     * @param {number} freq - Grundfrequenz der Note in Hz (z.B. 440 für A4)
     * @param {number} startTime - Startzeit im AudioContext (0 für sofort)
     * @param {number} duration - Dauer der gehaltenen Note in Sekunden
     */
    playNote(freq, startTime = this.ctx.currentTime, duration = 0.5) {
        if (!freq || freq <= 0) return;

        // 1. Frequenz mit Oktaven-Shift berechnen
        const finalFreq = freq * Math.pow(2, this.params.octaveShift);

        // 2. Audio-Knoten erstellen
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // 3. Oszillator konfigurieren
        osc.type = this.params.type;
        osc.frequency.setValueAtTime(finalFreq, startTime);
        osc.detune.setValueAtTime(this.params.detune, startTime);

        // 4. Filter konfigurieren
        filter.type = this.params.filterType;
        filter.frequency.setValueAtTime(this.params.filterCutoff, startTime);
        filter.Q.setValueAtTime(this.params.filterResonance, startTime);

        // 5. ADSR Hüllkurve (Gain) anwenden
        const now = startTime;
        const { attack, decay, sustain, release } = this.params;
        const noteEndTime = now + duration;

        gainNode.gain.setValueAtTime(0.0001, now);
        
        // Attack: Von 0 auf 1
        gainNode.gain.exponentialRampToValueAtTime(1.0, now + Math.max(attack, 0.001));
        
        // Decay: Von 1 auf Sustain-Level
        gainNode.gain.exponentialRampToValueAtTime(
            Math.max(sustain, 0.0001), 
            now + attack + Math.max(decay, 0.001)
        );

        // Release: Ab Note-Ende auf 0 abfallen
        gainNode.gain.setValueAtTime(Math.max(sustain, 0.0001), noteEndTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + Math.max(release, 0.001));

        // 6. Knoten miteinander verbinden: Osc -> Filter -> Gain -> Output
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.destination);

        // 7. Starten und Stoppen
        osc.start(now);
        osc.stop(noteEndTime + release + 0.1);
    }
}