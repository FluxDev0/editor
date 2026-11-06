class BitCrusherProcessor extends AudioWorkletNode {
    static get parameterDescriptors() {
        return [
            { name: 'bitDepth', defaultValue: 8, minValue: 1, maxValue: 16 },
            { name: 'frequency', defaultValue: 0.5, minValue: 0.01, maxValue: 1 }
        ];
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        const bitDepth = parameters.bitDepth;
        const frequency = parameters.frequency;

        // Einfaches Sample-and-Hold / Quantisierungs-Beispiel
        for (let channel = 0; channel < input.length; ++channel) {
            const inputChannel = input[channel];
            const outputChannel = output[channel];

            let step = Math.pow(2, bitDepth[0] - 1);
            let phase = 0;
            let lastSample = 0;

            for (let i = 0; i < inputChannel.length; ++i) {
                phase += frequency[0];
                if (phase >= 1.0) {
                    phase -= 1.0;
                    // Bittiefe reduzieren
                    let sample = inputChannel[i];
                    lastSample = Math.round(sample * step) / step;
                }
                outputChannel[i] = lastSample;
            }
        }
        return true;
    }
}

registerProcessor('bitcrusher-processor', BitCrusherProcessor);