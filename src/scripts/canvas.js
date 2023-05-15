import * as fabric from 'fabric';
import * as FontFaceObserver from 'fontfaceobserver';

if ('launchQueue' in window) {
    launchQueue.setConsumer((launchParams) => {
        handleFiles(launchParams.files);
    });
} else {
    console.error('File Handling API is not supported!');
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            await navigator.serviceWorker.register(
                new URL('../share-target/sharetargetsw.js', import.meta.url),
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
                appendTokenImage(blob);
            }
        }
    });
}

async function handleFiles(files) {
    for (const file of files) {
        const blob = await file.getFile();
        blob.handle = file;
        appendTokenImage(blob);
        // process only first file
        break;
    }
}

class DFonts {
    constructor() {
        const styleEl = document.createElement('style');
        styleEl.appendChild(document.createTextNode(''));
        document.head.appendChild(styleEl);
        this.styleSheet = styleEl.sheet;
    }

    async loadLocalFonts() {
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

const fonts = new DFonts();

const canvasContainer = document.querySelector('.editor');
const w = canvasContainer?.clientWidth || 1000;
const h = canvasContainer?.clientHeight || 1000;

const canvasElement = document.getElementById('canvas');
const canvas = new fabric.Canvas(canvasElement, {
    preserveObjectStacking: true,
});

canvas.setDimensions({
    width: w,
    height: h,
});

const borderImageFilter = new fabric.filters.HueRotation({
    rotation: 0,
});

const notControllableOptions = {
    hasControls: false,
    hasBorders: false,
    visible: true,
    selectable: false,
    evented: false,
    transparentCorners: false,
    centeredScaling: false,
    centeredRotation: false,
};

const tokenClipPath = new fabric.Circle({
    radius: 160,
    originY: 'center',
    originX: 'center',
    absolutePositioned: true,
    inverted: true,
    ...notControllableOptions,
});

const tokenClipPathPlaceholder = new fabric.Circle({
    radius: 1600,
    originY: 'center',
    originX: 'center',
    absolutePositioned: true,
    fill: '#000',
    opacity: 0.5,
    clipPath: tokenClipPath,
    ...notControllableOptions,
});

let borderImageInstance;
document.addEventListener('click', function (e) {
    // process border selection
    const target = e?.target?.closest('.border__selector');

    if (target) {
        const imgElement = target.querySelector('img');

        if (borderImageInstance) {
            canvas.remove(borderImageInstance);
        }

        if (!canvas.contains(tokenClipPathPlaceholder)) {
            canvas.add(tokenClipPathPlaceholder);
            canvas.centerObject(tokenClipPathPlaceholder);
            canvas.centerObject(tokenClipPath);
        }

        borderImageInstance = new fabric.Image(imgElement, {
            hasControls: false,
            hasBorders: false,
            visible: true,
            selectable: false,
            evented: false,
            transparentCorners: false,
            centeredScaling: false,
            centeredRotation: false,
        });
        borderImageInstance.filters.push(borderImageFilter);
        borderImageInstance.applyFilters();
        canvas.add(borderImageInstance);
        canvas.centerObject(borderImageInstance);

        canvas.bringObjectToFront(borderImageInstance);
    }
});

// process image adding
let tokenImageInstance;
let fileName = 'avatar.png';
const loadImageButton = document.querySelector('.load-image-button');
loadImageButton?.addEventListener('click', async function (e) {
    const fileHandle = await openFileOrFiles();
    if (!fileHandle) {
        return;
    }

    const file = await fileHandle.getFile();
    fileName = file.name;
    appendTokenImage(await fileToBlob(file));
});

const fileToBlob = async (file) =>
    new Blob([new Uint8Array(await file.arrayBuffer())], { type: file.type });

const openFileOrFiles = async (multiple = false) => {
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
        let fileOrFiles = undefined;
        try {
            // Show the file picker, optionally allowing multiple files.
            fileOrFiles = await showOpenFilePicker({ multiple });
            if (!multiple) {
                // Only one file is requested.
                fileOrFiles = fileOrFiles[0];
            }
        } catch (err) {
            // Fail silently if the user has simply canceled the dialog.
            if (err.name !== 'AbortError') {
                console.error(err.name, err.message);
            }
        }
        return fileOrFiles;
    }
    // Fallback if the File System Access API is not supported.
    return new Promise((resolve) => {
        // Append a new `<input type="file" multiple? />` and hide it.
        const input = document.createElement('input');
        input.style.display = 'none';
        input.type = 'file';
        document.body.append(input);
        if (multiple) {
            input.multiple = true;
        }
        // The `change` event fires when the user interacts with the dialog.
        input.addEventListener('change', () => {
            // Remove the `<input type="file" multiple? />` again from the DOM.
            input.remove();
            // If no files were selected, return.
            if (!input.files) {
                return;
            }
            // Return all files or just one file.
            resolve(multiple ? input.files : input.files[0]);
        });
        // Show the picker.
        if ('showPicker' in HTMLInputElement.prototype) {
            input.showPicker();
        } else {
            input.click();
        }
    });
};

const appendTokenImage = (blob) => {
    const imgElement = document.createElement('img');
    imgElement.src = URL.createObjectURL(blob);
    imgElement.onload = function () {
        if (tokenImageInstance) {
            canvas.remove(tokenImageInstance);
        }
        tokenImageInstance = new fabric.Image(imgElement, {});
        canvas.add(tokenImageInstance);
        const scale = Math.min(
            Math.min(w - 20, tokenImageInstance.width) /
                tokenImageInstance.width,
            Math.min(h - 20, tokenImageInstance.height) /
                tokenImageInstance.height
        );
        tokenImageInstance.scale(scale);

        canvas.centerObject(tokenImageInstance);
        canvas.sendObjectToBack(tokenImageInstance);

        canvas.renderAll();
    };
};

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
            appendTokenImage(blob);
        } else {
            // For files from `navigator.clipboard.read()`.
            const imageTypes = clipboardItem.types?.filter((type) =>
                type.startsWith('image/')
            );
            for (const imageType of imageTypes) {
                blob = await clipboardItem.getType(imageType);
                appendTokenImage(blob);
            }
        }
    }
});

// Config
let isBgEnabled = false;
const bgColorInput = document.querySelector('.bg-color-input');
const bgToggler = document.querySelector('.bg-color-input-toggler');

bgColorInput?.addEventListener('input', function (e) {
    if (!isBgEnabled) return;
    canvas.backgroundColor = bgColorInput.value;
    canvas.renderAll();
});
bgToggler?.addEventListener('input', function (e) {
    isBgEnabled = e.target.checked;
    if (isBgEnabled) {
        canvas.backgroundColor = bgColorInput.value;
    } else {
        canvas.backgroundColor = 'rgba(0,0,0, 0)';
    }
    canvas.renderAll();
});

let isBorderColorEnabled = false;
const borderColorInput = document.querySelector('.border-color-input');
const borderColorToggler = document.querySelector(
    '.border-color-input-toggler'
);
borderColorInput?.addEventListener('input', function (e) {
    borderImageFilter.setOptions({ rotation: borderColorInput.value });
    borderImageInstance.applyFilters();
    canvas.renderAll();
});
borderColorToggler?.addEventListener('input', function (e) {
    isBorderColorEnabled = e.target.checked;
    if (!isBorderColorEnabled) {
        borderImageFilter.setOptions({ rotation: 0 });
    } else {
        borderImageFilter.setOptions({ rotation: borderColorInput.value });
    }
    borderImageInstance.applyFilters();
    canvas.renderAll();
});

const maskSizeInput = document.querySelector('.mask-size-input');
maskSizeInput?.addEventListener('input', function (e) {
    const maskSize = maskSizeInput.value;
    tokenClipPath.setRadius(maskSize / 2);
    canvas.renderAll();
});

const saveImageButton = document.querySelector('.save-image-button');
saveImageButton?.addEventListener('click', async function () {
    if (!borderImageInstance || !tokenImageInstance) return;

    canvas.remove(tokenClipPathPlaceholder);

    const borderClipPath = new fabric.Circle({
        radius: 160,
        originY: 'center',
        originX: 'center',
        absolutePositioned: true,
        ...notControllableOptions,
    });
    canvas.centerObject(borderClipPath);
    tokenImageInstance.clipPath = borderClipPath;

    let bgBorderClipPath, bgCircle;

    if (isBgEnabled) {
        bgBorderClipPath = new fabric.Circle({
            radius: 160,
            originY: 'center',
            originX: 'center',
            absolutePositioned: true,
        });
        bgCircle = new fabric.Circle({
            radius: 400,
            fill: bgColorInput?.value,
        });
        canvas.add(bgCircle);
        canvas.centerObject(bgBorderClipPath);
        canvas.centerObject(bgCircle);
        canvas.sendObjectToBack(bgCircle);
        bgCircle.clipPath = bgBorderClipPath;
        canvas.backgroundColor = 'rgba(0,0,0, 0)';
    }

    canvas.renderAll();

    var dataURL = canvas.toDataURL({
        format: 'png',
        left: borderImageInstance.left,
        top: borderImageInstance.top,
        width: borderImageInstance.width,
        height: borderImageInstance.height,
    });
    saveDataURLAsFile(dataURL);

    if (isBgEnabled) {
        canvas.remove(bgBorderClipPath);
        canvas.remove(bgCircle);
        canvas.backgroundColor = bgColorInput?.value;
    }
    tokenImageInstance.clipPath = undefined;
    canvas.add(tokenClipPathPlaceholder);
    canvas.bringObjectToFront(borderImageInstance);

    canvas.renderAll();
});

function saveDataURLAsFile(dataURL) {
    var a = document.createElement('a');
    a.href = dataURL;
    a.download = 'tokenized_' + fileName;
    a.hidden = true;
    saveImageButton?.parentNode?.appendChild(a);
    a.click();
    a.remove();
}

class DTextbox {
    textbox = null;
    canvas = null;

    constructor(canvas, text) {
        this.canvas = canvas;
        this.textbox = new fabric.Textbox(text, {
            left: 50,
            top: 50,
            width: 150,
            fontSize: 20,
            textAlign: 'center',
        });
        this.canvas.add(this.textbox);
        this.canvas.centerObject(this.textbox);
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

class TextSetting {
    textbox = null;
    canvas = null;

    constructor(canvas) {
        this.canvas = canvas;

        this.fontSelector = document.querySelector('.text-font-selector');
        this.fontFamily = this.fontSelector.value;

        this.colorInput = document.querySelector('.text-color-input');
        this.color = this.colorInput.value;

        this.sizeInput = document.querySelector('.text-size-input');
        this.size = this.sizeInput.value;

        this.addTextButton = document.querySelector('.add-text-button');
        this.removeTextButton = document.querySelector('.remove-text-button');

        this.listen();
    }

    syncOptions() {
        this.fontFamily = this.fontSelector.value;
        this.color = this.colorInput.value;
        this.size = this.sizeInput.value;
    }

    async addText() {
        if (this.textbox) return;

        await fonts.loadLocalFonts();

        this.syncOptions();

        this.textbox = new DTextbox(canvas, 'D&D!');
        this.updateTextbox();
    }

    removeText() {
        if (!this.textbox) return;

        this.textbox.remove();
        this.textbox = null;
    }

    updateTextbox() {
        if (!this.textbox) return;

        this.textbox.setOptions({
            size: this.size,
            color: this.color,
            fontFamily: this.fontFamily,
        });
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

const textSettings = new TextSetting(canvas);
