export { ColorPicker };

const colorPickerStyles = `
.color-picker-wrapper {
    position: relative;
    display: inline-block;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    box-sizing: border-box;
}

.color-picker-wrapper *,
.color-picker-wrapper *::before,
.color-picker-wrapper *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

/* Swatch / Trigger Button */
.color-picker-wrapper .color-picker-trigger {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    transition: all 0.2s ease;
    user-select: none;
}

.color-picker-wrapper .color-picker-trigger:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 5px rgba(0,0,0,0.08);
}

.color-picker-wrapper .color-swatch-preview {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    border: 1px solid rgba(0,0,0,0.1);
}

.color-picker-wrapper .color-hex-text {
    font-size: 14px;
    font-weight: 600;
    color: #334155;
    font-family: monospace;
}

/* Popover Modal */
.color-picker-wrapper .color-picker-popover {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    width: 350px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
    display: none;
    flex-direction: column;
    gap: 12px;
    z-index: 9999;
}

.color-picker-wrapper .color-picker-popover.active {
    display: flex;
}

/* 2D Saturation / Value Canvas */
.color-picker-wrapper .sat-val-area {
    position: relative;
    width: 100%;
    height: 150px;
    border-radius: 8px;
    background-color: red;
    cursor: crosshair;
    overflow: hidden;
}

.color-picker-wrapper .sat-white {
    position: absolute;
    inset: 0;
    background: linear-gradient(to right, #fff, rgba(255,255,255,0));
}

.color-picker-wrapper .val-black {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, #000, rgba(0,0,0,0));
}

.color-picker-wrapper .sat-val-picker {
    position: absolute;
    width: 14px;
    height: 14px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 4px rgba(0,0,0,0.5);
    transform: translate(-50%, -50%);
    pointer-events: none;
}

/* Hue Slider */
.color-picker-wrapper .hue-slider {
    position: relative;
    width: 100%;
    height: 12px;
    border-radius: 6px;
    background: linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);
    cursor: pointer;
}

.color-picker-wrapper .hue-picker {
    position: absolute;
    top: 50%;
    width: 16px;
    height: 16px;
    background: #ffffff;
    border: 2px solid #334155;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    transform: translate(-50%, -50%);
    pointer-events: none;
}

/* Inputs */
.color-picker-wrapper .color-inputs {
    display: flex;
    gap: 8px;
}

.color-picker-wrapper .input-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
}

.color-picker-wrapper .input-group label {
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
}

.color-picker-wrapper .input-group input {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 12px;
    font-family: monospace;
    color: #1e293b;
    outline: none;
    background: #f8fafc;
}

.color-picker-wrapper .input-group input:focus {
    border-color: #3b82f6;
    background: #ffffff;
}

/* Presets */
.color-picker-wrapper .presets-title {
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
}

.color-picker-wrapper .presets-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
}

.color-picker-wrapper .preset-btn {
    height: 22px;
    border-radius: 4px;
    border: 1px solid rgba(0,0,0,0.1);
    cursor: pointer;
    transition: transform 0.1s ease;
}

.color-picker-wrapper .preset-btn:hover {
    transform: scale(1.08);
}`;

if (!document.getElementById('color-picker-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'color-picker-styles';
    styleEl.textContent = colorPickerStyles;
    document.head.appendChild(styleEl);
}

class ColorPicker {
    constructor(wrapperQuerySelector, initialHex = '#3b82f6') {
        // Elements
        this.wrapper = document.querySelector(wrapperQuerySelector);
        this.wrapper.innerHTML = `
        <!-- Swatch Trigger Button -->
            <div class="color-picker-trigger" id="pickerTrigger">
                <div class="color-swatch-preview" id="swatchPreview"></div>
                <span class="color-hex-text" id="hexText">#3B82F6</span>
            </div>

            <!-- Popover Farbeditor -->
            <div class="color-picker-popover" id="pickerPopover">
                <!-- 2D Saturation/Value Area -->
                <div class="sat-val-area" id="satValArea">
                    <div class="sat-white"></div>
                    <div class="val-black"></div>
                    <div class="sat-val-picker" id="satValPicker"></div>
                </div>

                <!-- Hue Slider -->
                <div class="hue-slider" id="hueSlider">
                    <div class="hue-picker" id="huePicker"></div>
                </div>

                <!-- Input Fields -->
                <div class="color-inputs">
                    <div class="input-group">
                        <label>HEX</label>
                        <input type="text" id="hexInput" value="#3B82F6" maxlength="7">
                    </div>
                    <div class="input-group">
                        <label>RGB</label>
                        <input type="text" id="rgbInput" value="59, 130, 246" readonly>
                    </div>
                    <div class="input-group">
                        <label>HSV</label>
                        <input type="text" id="hsvInput" value="217, 76, 96" readonly>
                    </div>
                </div>

                <!-- Color Presets -->
                <div class="presets-title">Presets</div>
                <div class="presets-grid">
                    <button class="preset-btn" style="background: #ef4444;" data-color="#ef4444"></button>
                    <button class="preset-btn" style="background: #f97316;" data-color="#f97316"></button>
                    <button class="preset-btn" style="background: #eab308;" data-color="#eab308"></button>
                    <button class="preset-btn" style="background: #22c55e;" data-color="#22c55e"></button>
                    <button class="preset-btn" style="background: #06b6d4;" data-color="#06b6d4"></button>
                    <button class="preset-btn" style="background: #3b82f6;" data-color="#3b82f6"></button>
                    <button class="preset-btn" style="background: #a855f7;" data-color="#a855f7"></button>
                    <button class="preset-btn" style="background: #ec4899;" data-color="#ec4899"></button>
                </div>
            </div>
        `;
        this.wrapper.classList.add("color-picker-wrapper");

        this.trigger = this.wrapper.querySelector('#pickerTrigger');
        this.popover = this.wrapper.querySelector('#pickerPopover');
        this.swatchPreview = this.wrapper.querySelector('#swatchPreview');
        this.hexText = this.wrapper.querySelector('#hexText');
        
        this.satValArea = this.wrapper.querySelector('#satValArea');
        this.satValPicker = this.wrapper.querySelector('#satValPicker');
        this.hueSlider = this.wrapper.querySelector('#hueSlider');
        this.huePicker = this.wrapper.querySelector('#huePicker');
        
        this.hexInput = this.wrapper.querySelector('#hexInput');
        this.rgbInput = this.wrapper.querySelector('#rgbInput');
        this.hsvInput = this.wrapper.querySelector('#hsvInput');
        this.presets = this.wrapper.querySelectorAll('.preset-btn');

        // State (HSV)
        this.hue = 217;
        this.sat = 76;
        this.val = 96;

        this.isSatDragging = false;
        this.isHueDragging = false;

        this.init(initialHex);
    }

    init(initialHex) {
        this.setFromHex(initialHex);
        this.bindEvents();
    }

    bindEvents() {
        // Toggle Popover
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.popover.classList.toggle('active');
        });

        // Close popover on outside click
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.popover.classList.remove('active');
            }
        });

        // Saturation/Value Dragging
        this.satValArea.addEventListener('mousedown', (e) => {
            this.isSatDragging = true;
            this.updateSatVal(e);
        });

        // Hue Dragging
        this.hueSlider.addEventListener('mousedown', (e) => {
            this.isHueDragging = true;
            this.updateHue(e);
        });

        // Mouse Move & Up
        window.addEventListener('mousemove', (e) => {
            if (this.isSatDragging) this.updateSatVal(e);
            if (this.isHueDragging) this.updateHue(e);
        });

        window.addEventListener('mouseup', () => {
            this.isSatDragging = false;
            this.isHueDragging = false;
        });

        // Hex Input change
        this.hexInput.addEventListener('input', (e) => {
            let val = e.target.value;
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                this.setFromHex(val);
            }
        });

        // Presets
        this.presets.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setFromHex(btn.dataset.color);
            });
        });
    }

    updateSatVal(e) {
        const rect = this.satValArea.getBoundingClientRect();
        let x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        let y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

        this.sat = Math.round((x / rect.width) * 100);
        this.val = Math.round((1 - y / rect.height) * 100);

        this.render();
    }

    updateHue(e) {
        const rect = this.hueSlider.getBoundingClientRect();
        let x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        this.hue = Math.round((x / rect.width) * 359);
        console.log(this.hue);

        this.render();
    }

    setFromHex(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return;
        const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
        this.hue = hsv.h;
        this.sat = hsv.s;
        this.val = hsv.v;
        this.render();
    }

    render() {
        // Update Sat/Val Background according to Hue
        this.satValArea.style.backgroundColor = `hsl(${this.hue}, 100%, 50%)`;

        // Update Pickers Positions
        this.satValPicker.style.left = `${this.sat}%`;
        this.satValPicker.style.top = `${100 - this.val}%`;
        this.huePicker.style.left = `${(this.hue / 360) * 100}%`;

        // Convert HSV to RGB & HEX
        const rgb = this.hsvToRgb(this.hue, this.sat, this.val);
        const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);

        // Update UI elements
        this.swatchPreview.style.backgroundColor = hex;
        this.hexText.textContent = hex.toUpperCase();
        this.hexInput.value = hex.toUpperCase();
        this.rgbInput.value = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
        this.hsvInput.value = `${this.hue}, ${this.sat}, ${this.val}`;
    }

    // --- Helper Math Methods ---
    hsvToRgb(h, s, v) {
        s /= 100; v /= 100;
        let c = v * s;
        let x = c * (1 - Math.abs((h / 60) % 2 - 1));
        let m = v - c;
        let r = 0, g = 0, b = 0;

        if (0 <= h && h < 60) { r = c; g = x; b = 0; }
        else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
        else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
        else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
        else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
        else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, v = max;
        let d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max === min) {
            h = 0;
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
    }

    hexToRgb(hex) {
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
}