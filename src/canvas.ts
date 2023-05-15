import * as fabric from 'fabric';

const canvasContainer = document.querySelector('.editor');
const w = canvasContainer?.clientWidth || 1000;
const h = canvasContainer?.clientHeight || 1000;

const canvasElement = document.getElementById('canvas') as HTMLCanvasElement;
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
} as any;

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

// const text = new fabric.Text('fabric.js sandbox', {
//     originX: 'center',
//     top: 20,
// });
// canvas.add(text);
// canvas.centerObjectH(text);
