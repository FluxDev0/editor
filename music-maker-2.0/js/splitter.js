/**
 * splitter.js - Modul für resizable Layout-Panels
 */

export class Splitter {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.gutter - Das Handle-Element zum Ziehen
     * @param {HTMLElement} options.paneA - Das linke / obere Panel
     * @param {HTMLElement} options.paneB - Das rechte / untere Panel
     * @param {'horizontal' | 'vertical'} [options.direction='horizontal'] - 'horizontal' (nebeneinander) oder 'vertical' (übereinander)
     * @param {number} [options.minA = 100] - Mindestgröße für Panel A in Pixeln
     * @param {number} [options.minB = 100] - Mindestgröße für Panel B in Pixeln
     * @param {Function} [options.onResize] - Optionaler Callback bei Größenänderung (z.B. für Redraw/Canvas-Resize)
     */
    constructor(options) {
        /** @type {HTMLElement} */
        this.gutter = options.gutter;
        /** @type {HTMLElement} */
        this.paneA = options.paneA;
        /** @type {HTMLElement} */
        this.paneB = options.paneB;
        /** @type {'horizontal' | 'vertical'} */
        this.direction = options.direction || 'horizontal';
        /** @type {number} */
        this.minA = options.minA ?? 100;
        /** @type {number} */
        this.minB = options.minB ?? 100;
        /** @type {Function | null} */
        this.onResize = options.onResize || null;

        /** @type {boolean} */
        this.isDragging = false;
        /** @type {number} */
        this.startCoord = 0;
        /** @type {number} */
        this.startSizeA = 0;
        /** @type {number} */
        this.startSizeB = 0;

        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);

        this._init();
    }

    _init() {
        this.gutter.addEventListener('mousedown', (e) => this._onMouseDown(e));
    }

    /**
     * @param {MouseEvent} e
     */
    _onMouseDown(e) {
        if (e.button !== 0) return; // Nur Linksklick
        e.preventDefault();

        this.isDragging = true;
        this.gutter.classList.add('active');
        document.body.classList.add(this.direction === 'horizontal' ? 'resizing-col' : 'resizing-row');

        const isHoriz = this.direction === 'horizontal';
        this.startCoord = isHoriz ? e.clientX : e.clientY;

        const rectA = this.paneA.getBoundingClientRect();
        const rectB = this.paneB.getBoundingClientRect();

        this.startSizeA = isHoriz ? rectA.width : rectA.height;
        this.startSizeB = isHoriz ? rectB.width : rectB.height;

        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('mouseup', this._onMouseUp);
    }

    /**
     * @param {MouseEvent} e
     */
    _onMouseMove(e) {
        if (!this.isDragging) return;

        const isHoriz = this.direction === 'horizontal';
        const currentCoord = isHoriz ? e.clientX : e.clientY;
        const delta = currentCoord - this.startCoord;

        let newSizeA = this.startSizeA + delta;
        let newSizeB = this.startSizeB - delta;

        // Min-Limits einhalten
        if (newSizeA < this.minA) {
            newSizeA = this.minA;
            newSizeB = (this.startSizeA + this.startSizeB) - this.minA;
        } else if (newSizeB < this.minB) {
            newSizeB = this.minB;
            newSizeA = (this.startSizeA + this.startSizeB) - this.minB;
        }

        // Größen zuweisen via flex-basis
        if (isHoriz) {
            this.paneA.style.flex = `0 0 ${newSizeA}px`;
            this.paneB.style.flex = '1 1 0px';
        } else {
            this.paneA.style.flex = `0 0 ${newSizeA}px`;
            this.paneB.style.flex = '1 1 0px';
        }

        if (typeof this.onResize === 'function') {
            this.onResize();
        }
    }

    _onMouseUp() {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.gutter.classList.remove('active');
        document.body.classList.remove('resizing-col', 'resizing-row');

        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('mouseup', this._onMouseUp);

        if (typeof this.onResize === 'function') {
            this.onResize();
        }
    }
}