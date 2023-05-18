import * as fabric from 'fabric';
import * as FontFaceObserver from 'fontfaceobserver';

const NOT_CONTROLLABLE_OPTIONS = {
    hasControls: false,
    hasBorders: false,
    visible: true,
    selectable: false,
    evented: false,
    transparentCorners: false,
    centeredScaling: false,
    centeredRotation: false,
};

const BORDER_SIZE = 400;

class DFonts {
    loaded = false;

    constructor() {
        const styleEl = document.createElement('style');
        styleEl.appendChild(document.createTextNode(''));
        document.head.appendChild(styleEl);
        this.styleSheet = styleEl.sheet;
    }

    async loadLocalFonts() {
        if (this.loaded) return;

        try {
            const availableFonts = await window.queryLocalFonts();
            const list = document.querySelector('.text .text-font-selector');
            for (const fontData of availableFonts) {
                const option = document.createElement('option');
                option.text = fontData.fullName;
                option.value = fontData.postscriptName;
                if (fontData.fullName === 'Times New Roman') {
                    option.selected = true;
                }
                list?.appendChild(option);
            }
        } catch (err) {
            console.error(err.name, err.message);
            this.loadFallback();
        }

        this.loaded = true;
    }

    loadFallback() {
        const list = document.querySelector('.text .text-font-selector');
        const fallbackFonts = ['Arial', 'Tahoma'];
        for (let font of fallbackFonts) {
            const option = document.createElement('option');
            option.text = font;
            option.value = font;
            if (font === 'Arial') {
                option.selected = true;
            }
            list?.appendChild(option);
        }
    }

    async loadFont(fontFamily, fontScript) {
        this.styleSheet?.insertRule(
            `@font-face {
    font-family: '${fontFamily}';
    src: local('${fontFamily}'),
        local('${fontScript}');
}`
        );

        const font = new FontFaceObserver(fontFamily);
        return font.load().then(
            function () {
                console.log(`Font ${fontFamily} is available`);
            },
            function () {
                console.log(`Font ${fontFamily} is not available`);
            }
        );
    }
}

class DTextbox {
    textbox = null;
    canvas = null;
    maskRadius = 160;

    constructor(canvas, text) {
        this.canvas = canvas;
        this.textbox = new fabric.Textbox(text, {
            left: 50,
            top: 50,
            width: 150,
            fontSize: 20,
            textAlign: 'center',
            originY: 'center',
            originX: 'center',
        });
        this.canvas.add(this.textbox);
        this.canvas.centerObject(this.textbox);
        this.canvas.renderAll();
    }

    applyMask() {
        this.borderClipPath = new fabric.Circle({
            radius: this.maskRadius,
            originY: 'center',
            originX: 'center',
            absolutePositioned: true,
            ...NOT_CONTROLLABLE_OPTIONS,
        });
        this.canvas.centerObject(this.borderClipPath);
        this.textbox.clipPath = this.borderClipPath;
        this.textbox.hasControls = false;
        this.textbox.hasBorders = false;
    }

    removeMask() {
        this.textbox.clipPath = undefined;
        this.textbox.hasControls = true;
        this.textbox.hasBorders = true;
        this.textbox.dirty = true;
        this.canvas.remove(this.borderClipPath);
    }

    setRadius(radius) {
        this.maskRadius = radius;
    }

    remove() {
        this.canvas.remove(this.textbox);
        this.canvas.renderAll();
    }

    setOptions(options) {
        this.textbox.setOptions({
            fill: options.color,
            fontFamily: options.fontFamily,
            fontSize: options.size,
        });
        this.canvas.renderAll();
    }

    setColor(color) {
        this.textbox.setOptions({
            fill: color,
        });
        this.canvas.renderAll();
    }

    setFont(fontFamily) {
        this.textbox.setOptions({
            fontFamily: fontFamily,
        });
        this.canvas.renderAll();
    }

    setSize(size) {
        this.textbox.setOptions({
            fontSize: size,
        });
        this.canvas.renderAll();
    }
}

class DTextSetting {
    textbox = null;
    canvas = null;
    maskRadius = 160;

    constructor(canvas, border) {
        this.canvas = canvas;
        this.border = border;

        this.fontSelector = document.querySelector('.text-font-selector');
        this.fontFamily = this.fontSelector.value;

        this.colorInput = document.querySelector('.text-color-input');
        this.color = this.colorInput.value;

        this.sizeInput = document.querySelector('.text-size-input');
        this.size = this.sizeInput.value;

        this.addTextButton = document.querySelector('.add-text-button');
        this.removeTextButton = document.querySelector('.remove-text-button');

        this.textSettingsEl = document.querySelector('.text__settings');

        this.listen();
    }

    syncOptions() {
        this.fontFamily = this.fontSelector.value;
        this.color = this.colorInput.value;
        this.size = this.sizeInput.value;
    }

    async addText() {
        if (this.textbox) return;

        this.textSettingsEl.classList.remove('hidden');

        await fonts.loadLocalFonts();

        this.syncOptions();

        this.textbox = new DTextbox(this.canvas, 'D&D!');
        this.updateTextbox();

        this.border.up();
    }

    removeText() {
        if (!this.textbox) return;

        this.textSettingsEl.classList.add('hidden');

        this.textbox.remove();
        this.textbox = null;
    }

    updateTextbox() {
        if (!this.textbox) return;

        this.textbox.setRadius(this.maskRadius);

        this.textbox.setOptions({
            size: this.size,
            color: this.color,
            fontFamily: this.fontFamily,
        });
    }

    setRadius(radius) {
        this.maskRadius = radius;
        this.updateTextbox();
    }

    applyMask() {
        if (!this.textbox) return;
        this.textbox.applyMask();
    }

    removeMask() {
        if (!this.textbox) return;
        this.textbox.removeMask();
    }

    listen() {
        this.addTextButton.addEventListener('click', () => {
            this.addText();
        });

        this.removeTextButton.addEventListener('click', () => {
            this.removeText();
        });

        this.sizeInput?.addEventListener('change', () => {
            this.size = this.sizeInput.value;
            this.updateTextbox();
        });

        this.fontSelector.addEventListener('change', async () => {
            const fontScript = this.fontSelector?.value;
            this.fontFamily =
                this.fontSelector.options[
                    this.fontSelector.selectedIndex
                ].textContent;

            fonts.loadFont(this.fontFamily, fontScript).then(() => {
                this.updateTextbox();
            });
        });

        this.colorInput.addEventListener('input', () => {
            this.color = this.colorInput.value;
            this.updateTextbox();
        });
    }
}

class DCanvas {
    constructor(container) {
        this.container = container;

        const canvasElement = document.getElementById('canvas');
        this.canvas = new fabric.Canvas(canvasElement, {
            preserveObjectStacking: true,
        });

        this.listen();
        this.resize();
    }

    listen() {
        window.addEventListener('resize', () => {
            this.resize();
        });
    }

    resize() {
        this.canvas.setDimensions({
            width: this.container.getWidth(),
            height: this.container.getHeight(),
        });
    }

    getCanvas() {
        return this.canvas;
    }

    getContainer() {
        return this.container;
    }
}

class DContainer {
    constructor() {
        this.canvasContainer = document.querySelector('.editor');
        this.resize();
        this.listen();
    }

    resize() {
        this.width = this.canvasContainer?.clientWidth || 1000;
        this.height = this.canvasContainer?.clientHeight || 1000;
    }

    listen() {
        window.addEventListener('resize', () => {
            this.resize();
        });
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }
}

class DBorder {
    borderInstance = null;
    maskRadius = 160;

    constructor(canvas) {
        this.canvas = canvas;

        this.initFilters();
        this.listen();
        this.initMask();
    }

    getBorderInstance() {
        return this.borderInstance;
    }

    initFilters() {
        this.hueFilter = new fabric.filters.HueRotation({
            rotation: 0,
        });
    }

    setRadius(radius) {
        this.maskRadius = radius;
        this.syncMask();
    }

    syncMask() {
        this.removeMask();
        this.initMask();
        this.setMask();
    }

    initMask() {
        this.mask = new fabric.Circle({
            radius: this.maskRadius,
            originY: 'center',
            originX: 'center',
            absolutePositioned: true,
            inverted: true,
            ...NOT_CONTROLLABLE_OPTIONS,
        });

        this.maskPlaceholder = new fabric.Circle({
            radius: Math.max(this.canvas.getWidth(), this.canvas.getHeight()),
            originY: 'center',
            originX: 'center',
            absolutePositioned: true,
            fill: '#000',
            opacity: 0.5,
            clipPath: this.mask,
            ...NOT_CONTROLLABLE_OPTIONS,
        });
    }

    getMask() {
        return this.mask;
    }

    getMaskPlaceholder() {
        return this.maskPlaceholder;
    }

    setMask() {
        if (!this.canvas.contains(this.maskPlaceholder)) {
            this.canvas.add(this.maskPlaceholder);
            this.canvas.centerObject(this.maskPlaceholder);
            this.canvas.centerObject(this.mask);
        }

        this.up();
    }

    removeMask() {
        this.canvas.remove(this.maskPlaceholder);
    }

    setBorder(img) {
        this.img = img;

        if (this.borderInstance) {
            this.canvas.remove(this.borderInstance);
        }

        this.borderInstance = new fabric.Image(img, {
            ...NOT_CONTROLLABLE_OPTIONS,
        });

        this.canvas.add(this.borderInstance);
        this.canvas.centerObject(this.borderInstance);

        this.up();

        this.setMask();
        this.applyFilters();

        this.canvas.renderAll();

        this.emit();
    }

    applyFilters() {
        this.borderInstance.filters = [this.hueFilter];
        this.borderInstance.applyFilters();
    }

    listen() {
        document.addEventListener('click', (e) => {
            const target = e?.target?.closest('.border__selector');
            if (target) {
                const imgElement = target.querySelector('img');
                this.setBorder(imgElement);
            }
        });

        window.addEventListener('resize', () => {
            if (this.borderInstance) {
                this.setBorder(this.img);
                this.removeMask();
                this.setMask();
            }
        });
    }

    subscribe(listener) {
        this.listener = listener;
    }

    emit() {
        if (this.listener) this.listener();
    }

    up() {
        this.canvas.bringObjectToFront(this.borderInstance);
    }
}

class DToken {
    tokenInstance = null;
    canvas = null;
    maskRadius = 160;

    constructor(editor) {
        this.editor = editor;
        this.canvas = this.editor.getCanvas();

        this.listenInputs();
    }

    listenInputs() {
        if ('launchQueue' in window) {
            launchQueue.setConsumer((launchParams) => {
                this.handleFiles(launchParams.files);
            });
        } else {
            console.error('File Handling API is not supported!');
        }
    }

    async handleFiles(files) {
        for (const file of files) {
            const blob = await file.getFile();
            blob.handle = file;
            this.appendTokenImage(blob);
            // process only first file
            break;
        }
    }

    appendTokenImage(blob) {
        const imgElement = document.createElement('img');
        imgElement.src = URL.createObjectURL(blob);
        imgElement.onload = () => {
            if (this.tokenInstance) {
                this.canvas.remove(this.tokenInstance);
            }
            this.tokenInstance = new fabric.Image(imgElement, {});
            this.canvas.add(this.tokenInstance);
            const container = this.editor.getContainer();
            const scale = Math.min(
                Math.min(container.getWidth() - 20, this.tokenInstance.width) /
                    this.tokenInstance.width,
                Math.min(
                    container.getHeight() - 20,
                    this.tokenInstance.height
                ) / this.tokenInstance.height
            );
            this.tokenInstance.scale(scale);
            this.updateToken();
        };
    }

    updateToken() {
        this.canvas.centerObject(this.tokenInstance);
        this.canvas.sendObjectToBack(this.tokenInstance);

        this.canvas.renderAll();
    }

    setRadius(radius) {
        this.maskRadius = radius;
    }

    applyMask() {
        if (!this.tokenInstance) return;

        this.borderClipPath = new fabric.Circle({
            radius: this.maskRadius,
            originY: 'center',
            originX: 'center',
            absolutePositioned: true,
            ...NOT_CONTROLLABLE_OPTIONS,
        });
        this.canvas.centerObject(this.borderClipPath);
        this.tokenInstance.clipPath = this.borderClipPath;
        this.tokenInstance.hasControls = false;
        this.tokenInstance.hasBorders = false;
    }

    removeMask() {
        if (!this.tokenInstance) return;

        this.tokenInstance.clipPath = undefined;
        this.tokenInstance.hasControls = true;
        this.tokenInstance.hasBorders = true;
        this.canvas.remove(this.borderClipPath);
    }
}

class DBackground {
    enabled = false;

    constructor(canvas) {
        this.canvas = canvas;

        this.colorInput = document.querySelector('.bg-color-input');
        this.toggler = document.querySelector('.bg-color-input-toggler');

        this.listen();
        this.syncBgColor();
    }

    enable() {
        this.toggler.checked = true;
        this.enabled = true;
    }

    listen() {
        this.colorInput.addEventListener('input', () => {
            this.enable();
            this.syncBgColor();
        });

        this.toggler.addEventListener('input', (e) => {
            this.enabled = e.target.checked;

            if (!this.enabled) {
                this.canvas.backgroundColor = 'rgba(0,0,0, 0)';
                this.canvas.renderAll();
            }

            this.syncBgColor();
        });
    }

    syncBgColor() {
        if (!this.enabled) return;

        this.canvas.backgroundColor = this.colorInput.value;
        this.canvas.renderAll();
    }

    setRadius(radius) {
        this.radius = radius;
    }

    applyMask() {
        if (!this.enabled) return;

        this.bgBorderClipPath = new fabric.Circle({
            radius: this.radius,
            originY: 'center',
            originX: 'center',
            absolutePositioned: true,
        });
        this.bgCircle = new fabric.Circle({
            radius: BORDER_SIZE,
            fill: this.colorInput?.value,
        });
        this.canvas.add(this.bgCircle);
        this.canvas.centerObject(this.bgBorderClipPath);
        this.canvas.centerObject(this.bgCircle);
        this.canvas.sendObjectToBack(this.bgCircle);
        this.bgCircle.clipPath = this.bgBorderClipPath;
        this.canvas.backgroundColor = 'rgba(0,0,0, 0)';
    }

    removeMask() {
        if (!this.enabled) return;

        this.canvas.remove(this.bgBorderClipPath);
        this.canvas.remove(this.bgCircle);
        this.canvas.backgroundColor = this.colorInput?.value;

        this.syncBgColor();
    }
}

class DSaveSontroller {
    fileName = 'avatar.png';

    constructor(canvas, border, token, background, textSettings) {
        this.canvas = canvas;
        this.border = border;
        this.token = token;
        this.background = background;
        this.textSettings = textSettings;

        this.saveButton = document.querySelector('.save-image-button');
        this.listen();
        this.syncButton();
    }

    syncButton() {
        this.saveButton.disabled = !this.border.getBorderInstance();
    }

    listen() {
        this.border.subscribe(() => {
            this.syncButton();
        });

        this.saveButton.addEventListener('click', async () => {
            this.save();
        });
    }

    save() {
        const borderImageInstance = this.border.getBorderInstance();

        if (!borderImageInstance) return;

        this.border.removeMask();
        this.token.applyMask();
        this.background.applyMask();
        this.textSettings.applyMask();

        this.canvas.renderAll();

        this.saveFile(borderImageInstance);

        this.textSettings.removeMask();
        this.background.removeMask();
        this.border.setMask();
        this.token.removeMask();

        this.canvas.renderAll();
    }

    saveFile(borderImageInstance) {
        var dataURL = this.canvas.toDataURL({
            format: 'png',
            left: borderImageInstance.left,
            top: borderImageInstance.top,
            width: borderImageInstance.width,
            height: borderImageInstance.height,
            enableRetinaScaling: true,
        });
        this.saveDataURLAsFile(dataURL);
    }

    setFileName(fileName) {
        this.fileName = fileName.replace(/\.[^/.]+$/, '') + '.png';
    }

    saveDataURLAsFile(dataURL) {
        var a = document.createElement('a');
        a.href = dataURL;
        a.download = 'tokenized_' + this.fileName;
        a.hidden = true;
        this.saveButton?.parentNode?.appendChild(a);
        a.click();
        a.remove();
    }
}

class DLoadController {
    constructor(token, saveController) {
        this.token = token;
        this.saveController = saveController;
        this.loadButton = document.querySelector('.load-image-button');
        this.listen();
    }

    listen() {
        this.listenLoadButton();
        this.listenBuffer();
    }

    listenLoadButton() {
        this.loadButton.addEventListener('click', async (e) => {
            const file = await this.openFile();
            if (!file) {
                return;
            }

            this.saveController.setFileName(file.name);
            this.token.appendTokenImage(await this.fileToBlob(file));
        });
    }

    listenBuffer() {
        document.addEventListener('paste', async (e) => {
            e.preventDefault();
            const clipboardItems =
                typeof navigator?.clipboard?.read === 'function'
                    ? await navigator.clipboard.read()
                    : e.clipboardData.files;

            for (const clipboardItem of clipboardItems) {
                let blob;
                if (clipboardItem.type?.startsWith('image/')) {
                    // For files from `e.clipboardData.files`.
                    blob = clipboardItem;
                    this.token.appendTokenImage(blob);
                } else {
                    // For files from `navigator.clipboard.read()`.
                    const imageTypes = clipboardItem.types?.filter((type) =>
                        type.startsWith('image/')
                    );
                    for (const imageType of imageTypes) {
                        blob = await clipboardItem.getType(imageType);
                        this.token.appendTokenImage(blob);
                    }
                }
            }
        });
    }

    openFile = async () => {
        const supportsFileSystemAccess =
            'showOpenFilePicker' in window &&
            (() => {
                try {
                    return window.self === window.top;
                } catch {
                    return false;
                }
            })();

        // If the File System Access API is supported…
        if (supportsFileSystemAccess) {
            let fileHandle = undefined;
            try {
                // Show the file picker, optionally allowing multiple files.
                [fileHandle] = await showOpenFilePicker();
            } catch (err) {
                // Fail silently if the user has simply canceled the dialog.
                if (err.name !== 'AbortError') {
                    console.error(err.name, err.message);
                }
            }
            return await fileHandle.getFile();
        }
        // Fallback if the File System Access API is not supported.
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.style.display = 'none';
            input.type = 'file';
            document.body.append(input);
            input.addEventListener('change', () => {
                input.remove();
                if (!input.files) {
                    return;
                }
                resolve(input.files[0]);
            });
            // Show the picker.
            if ('showPicker' in HTMLInputElement.prototype) {
                input.showPicker();
            } else {
                input.click();
            }
        });
    };

    fileToBlob = async (file) =>
        new Blob([new Uint8Array(await file.arrayBuffer())], {
            type: file.type,
        });
}

class DMask {
    radius = 160;

    constructor(canvas, token, border, background, textSettings) {
        this.canvas = canvas;
        this.token = token;
        this.border = border;
        this.background = background;
        this.textSettings = textSettings;

        this.sizeInput = document.querySelector('.mask-size-input');

        this.listen();
    }

    listen() {
        this.sizeInput.addEventListener('input', () => {
            this.syncRadius();
        });
    }

    syncRadius() {
        const maskSize = this.sizeInput.value;
        this.radius = maskSize / 2;
        this.token.setRadius(this.radius);
        this.border.setRadius(this.radius);
        this.background.setRadius(this.radius);
        this.textSettings.setRadius(this.radius);

        this.canvas.renderAll();
    }
}

const container = new DContainer();
const editor = new DCanvas(container);
const fonts = new DFonts();
const border = new DBorder(editor.getCanvas());
const token = new DToken(editor);
const background = new DBackground(editor.getCanvas());
const textSettings = new DTextSetting(editor.getCanvas(), border);
const saveController = new DSaveSontroller(
    editor.getCanvas(),
    border,
    token,
    background,
    textSettings
);
const loadController = new DLoadController(token, saveController);
const mask = new DMask(
    editor.getCanvas(),
    token,
    border,
    background,
    textSettings
);

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            await navigator.serviceWorker.register(
                new URL('../sharetargetsw.js', import.meta.url),
                { type: 'module' }
            );
        } catch (err) {
            console.error(err.name, err.message);
        }

        if (location.search.includes('share-target')) {
            const keys = await caches.keys();
            const sharedCache = await caches.open(
                keys.filter((key) => key.startsWith('share-target'))[0]
            );
            const image = await sharedCache.match('shared-image');
            if (image) {
                const blob = await image.blob();
                await sharedCache.delete('shared-image');
                token.appendTokenImage(blob);
            }
        }
    });
}

// Config
// let isBorderColorEnabled = false;
// const borderColorInput = document.querySelector('.border-color-input');
// const borderColorToggler = document.querySelector(
//     '.border-color-input-toggler'
// );
// borderColorInput?.addEventListener('input', function (e) {
//     borderImageFilter.setOptions({ rotation: borderColorInput.value });
//     borderImageInstance.applyFilters();
//     canvas.renderAll();
// });
// borderColorToggler?.addEventListener('input', function (e) {
//     isBorderColorEnabled = e.target.checked;
//     if (!isBorderColorEnabled) {
//         borderImageFilter.setOptions({ rotation: 0 });
//     } else {
//         borderImageFilter.setOptions({ rotation: borderColorInput.value });
//     }
//     borderImageInstance.applyFilters();
//     canvas.renderAll();
// });
