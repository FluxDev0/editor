/**
 * Fx.js - Effekt-Kette (Distortion, Delay, Reverb, LFO)
 */

import { DEFAULT_VALUES } from "./types.js";

export class FXChain {
    /**
     * Constructor of the FXChiain Class
     * @param {AudioContext} audioCtx AudioContext object
     */
    constructor(audioCtx) {
        this.ctx = audioCtx;

        // --- Node-Erstellung ---
        this.inputNode = this.ctx.createGain();
        this.outputNode = this.ctx.createGain();

        // 1. Distortion
        this.distortionNode = this.ctx.createWaveShaper();

        // 2. Delay
        this.delayNode = this.ctx.createDelay(5.0); // max 5 Sek
        this.delayFeedbackNode = this.ctx.createGain();
        this.delayDryNode = this.ctx.createGain();
        this.delayWetNode = this.ctx.createGain();

        // 3. Reverb
        this.convolverNode = this.ctx.createConvolver();
        this.reverbDryNode = this.ctx.createGain();
        this.reverbWetNode = this.ctx.createGain();

        // 4. LFO (z.B. für Pitch oder Filter)
        this.lfo = this.ctx.createOscillator();
        this.lfoGain = this.ctx.createGain();
        this.lfo.frequency.value = 2; // Default 2 Hz
        this.lfoGain.gain.value = 0;  // Default aus
        this.lfo.start();

        // Initialisiere Standardwerte
        /** @type {import("./types.js").FXChainParameters} */
        this.params = DEFAULT_VALUES.FXChainParameters;

        this._buildGraph();
        this._generateReverbImpulse(2.0); // 2 Sekunden Nachhall-Impuls generieren
        this.updateParams();
    }

    /**
     * Verkabelung der Audio-Nodes
     */
    _buildGraph() {
        // Input -> Distortion
        this.inputNode.connect(this.distortionNode);

        // --- Delay Bus ---
        // Distortion -> Delay Split (Dry + Wet)
        this.distortionNode.connect(this.delayDryNode);
        this.distortionNode.connect(this.delayNode);

        // Delay Feedback Loop: Delay -> Feedback -> Delay
        this.delayNode.connect(this.delayFeedbackNode);
        this.delayFeedbackNode.connect(this.delayNode);
        this.delayNode.connect(this.delayWetNode);

        // Delay Merge Node
        const delayMerge = this.ctx.createGain();
        this.delayDryNode.connect(delayMerge);
        this.delayWetNode.connect(delayMerge);

        // --- Reverb Bus ---
        delayMerge.connect(this.reverbDryNode);
        delayMerge.connect(this.convolverNode);
        this.convolverNode.connect(this.reverbWetNode);

        // Reverb Merge -> Master Output
        this.reverbDryNode.connect(this.outputNode);
        this.reverbWetNode.connect(this.outputNode);

        // LFO -> Routing-Verbindung für Modulation
        this.lfo.connect(this.lfoGain);
    }

    /**
     * Generiert einen künstlichen Reverb-Impuls (Offline Synthese)
     * @param {number} duration
     */
    _generateReverbImpulse(duration) {
        /** @type {number} */
        const sampleRate = this.ctx.sampleRate;
        /** @type {number} */
        const length = sampleRate * duration;
        /** @type {AudioBuffer} */
        const impulse = this.ctx.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                // Rauschen erzeugen + exponentieller Abfall
                const decay = Math.exp(-i / (sampleRate * 0.4));
                data[i] = (Math.random() * 2 - 1) * decay;
            }
        }

        this.convolverNode.buffer = impulse;
    }

    /**
     * Aktualisiert alle Effekt-Parameter
     */
    updateParams() {
        const now = this.ctx.currentTime;

        // 1. Distortion
        this.distortionNode.curve = this._makeDistortionCurve(this.params.distortionAmount);

        // 2. Delay
        this.delayNode.delayTime.setValueAtTime(this.params.delayTime, now);
        this.delayFeedbackNode.gain.setValueAtTime(this.params.delayFeedback, now);
        this.delayDryNode.gain.setValueAtTime(1 - this.params.delayMix, now);
        this.delayWetNode.gain.setValueAtTime(this.params.delayMix, now);

        // 3. Reverb
        this.reverbDryNode.gain.setValueAtTime(1 - this.params.reverbMix, now);
        this.reverbWetNode.gain.setValueAtTime(this.params.reverbMix, now);

        // 4. LFO
        this.lfo.frequency.setValueAtTime(this.params.lfoFreq, now);
        this.lfoGain.gain.setValueAtTime(this.params.lfoDepth, now);
    }

    /**
     * 
     * @param {keyof import("./types.js").FXChainParameters} name 
     * @param {number} value 
     */
    setParam(name, value) {
        if (name in this.params) {
            this.params[name] = value;
            this.updateParams();
        }
    }

    /**
     * 
     * @param {import("./types.js").FXChainParameters} params 
     */
    setParams(params) {
        this.params = params;
        this.updateParams();
    }

    /**
     * Mathematische Kurve für Distortion/Overdrive
     * @param {any} amount
     */
    _makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 0;
        if (k === 0) return null;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;

        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    // Verbindet das LFO-Signal mit einem Ziel-Parameter (z.B. Synth-Filter oder Pitch)
    /**
     * 
     * @param {AudioNode} targetAudioParam 
     */
    connectLFOTo(targetAudioParam) {
        this.lfoGain.connect(targetAudioParam);
    }
}