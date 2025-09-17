const encodeRLE = (pixels) => {
    const sorted = pixels.sort((a, b) => {
        const [x1, y1] = a;
        const [x2, y2] = b;
        return x1 === x2 ? y1 - y2 : x1 - x2;
    });
    const result = [];
    let count = 1;
    let [prevX, prevY, prevColor] = sorted[0] || [0, 0, 0];
    const total = sorted.length;
    let processed = 0;
    for (let i = 1; i <= sorted.length; i++) {
        const [x, y, color] = sorted[i] || [0, 0, 0];
        if (x === prevX && y === prevY && color === prevColor && i < sorted.length) {
            count++;
        }
        else {
            if (prevX !== undefined && prevY !== undefined && prevColor !== undefined) {
                result.push(`${prevX},${prevY},${prevColor}:${count}`);
            }
            prevX = x;
            prevY = y;
            prevColor = color;
            count = 1;
            processed++;
            if (processed % 100 === 0 || processed === total) {
                self.postMessage({ type: 'progress', progress: processed / total });
            }
        }
    }
    return result.join('|');
};
const decodeRLE = (rleString) => {
    if (!rleString) {
        self.postMessage({ type: 'progress', progress: 1 });
        return [];
    }
    const entries = rleString.split('|').filter((entry) => entry);
    const pixels = [];
    let processed = 0;
    const total = entries.length;
    for (const entry of entries) {
        const [coords, count] = entry.split(':');
        const [x, y, color] = coords.split(',').map(Number);
        if (isNaN(x) || isNaN(y) || isNaN(color) || isNaN(parseInt(count))) {
            self.postMessage({ type: 'error', layerId: '', error: `Invalid RLE entry: ${entry}` });
            return pixels;
        }
        for (let i = 0; i < parseInt(count); i++) {
            pixels.push([x, y, color]);
        }
        processed++;
        if (processed % 100 === 0 || processed === total) {
            self.postMessage({ type: 'progress', progress: processed / total });
        }
    }
    return pixels;
};
self.onmessage = function (e) {
    try {
        const { action, data, layerId } = e.data;
        if (action === 'encode') {
            const encoded = encodeRLE(data);
            self.postMessage({ type: 'result', layerId, result: encoded });
        }
        else if (action === 'decode') {
            const decoded = decodeRLE(data);
            self.postMessage({ type: 'result', layerId, result: decoded });
        }
    }
    catch (error) {
        self.postMessage({ type: 'error', layerId: e.data.layerId, error: error.message });
    }
};
const workerURL = '/workers/serialization.js';
function validateImportData(data) {
    const lines = data.trim().split('\n');
    if (lines.length < 1 || !lines[0].startsWith('#')) {
        throw new Error('Invalid .layr format: Expected layer count header (e.g., #2)');
    }
    const layerCount = parseInt(lines[0].slice(1));
    if (isNaN(layerCount) || layerCount !== lines.length - 1) {
        throw new Error('Invalid .layr format: Layer count mismatch');
    }
    const layers = [];
    for (let i = 1; i < lines.length; i++) {
        const [id, name, visibleStr, pixels] = lines[i].split(';', 4);
        if (!id || !name || !visibleStr || pixels === undefined) {
            throw new Error(`Invalid .layr format: Malformed layer at line ${i + 1}`);
        }
        if (id.trim() === '') {
            throw new Error(`Invalid .layr format: Layer ID must be non-empty at line ${i + 1}`);
        }
        if (name.trim() === '') {
            throw new Error(`Invalid .layr format: Layer name must be non-empty at line ${i + 1}`);
        }
        if (visibleStr !== '0' && visibleStr !== '1') {
            throw new Error(`Invalid .layr format: Layer visible must be 0 or 1 at line ${i + 1}`);
        }
        layers.push({
            id,
            name,
            visible: visibleStr === '1',
            pixels,
        });
    }
    return layers;
}
export async function exportLayers(layers, onProgress) {
    const workers = [];
    const results = {};
    try {
        const promises = layers.map((layer) => {
            return new Promise((resolve, reject) => {
                const worker = new Worker(workerURL);
                workers.push(worker);
                worker.onmessage = (e) => {
                    const { type, layerId, progress, result, error } = e.data;
                    if (type === 'progress') {
                        onProgress({ layerId, progress });
                    }
                    else if (type === 'result') {
                        results[layerId] = result;
                        resolve();
                    }
                    else if (type === 'error') {
                        reject(new Error(`Worker error for layer ${layerId}: ${error}`));
                    }
                };
                worker.onerror = (error) => {
                    reject(new Error(`Worker error for layer ${layer.id}: ${error.message}`));
                };
                const pixelArray = [...layer.pixels.entries()].map(([key, color]) => {
                    const [x, y] = key.split(',').map(Number);
                    return [x, y, color];
                });
                worker.postMessage({
                    action: 'encode',
                    data: pixelArray,
                    layerId: layer.id,
                });
            });
        });
        await Promise.all(promises);
        const lines = [`#${layers.length}`];
        layers.forEach((layer) => {
            const visible = layer.visible ? '1' : '0';
            lines.push(`${layer.id};${layer.name};${visible};${results[layer.id] || ''}`);
        });
        return lines.join('\n');
    }
    finally {
        workers.forEach((worker) => worker.terminate());
    }
}
export async function importLayers(data, onProgress) {
    const workers = [];
    const results = {};
    try {
        const importData = validateImportData(data);
        const promises = importData.map((layerData) => {
            return new Promise((resolve, reject) => {
                const worker = new Worker(workerURL);
                workers.push(worker);
                worker.onmessage = (e) => {
                    const { type, layerId, progress, result, error } = e.data;
                    if (type === 'progress') {
                        onProgress({ layerId, progress });
                    }
                    else if (type === 'result') {
                        try {
                            const pixelArray = result;
                            if (!Array.isArray(pixelArray)) {
                                reject(new Error(`Invalid pixel data format for layer ${layerId}`));
                                return;
                            }
                            const pixels = new Map();
                            for (const [x, y, color] of pixelArray) {
                                if (typeof x !== 'number' || typeof y !== 'number' || typeof color !== 'number') {
                                    reject(new Error(`Invalid pixel entry for layer ${layerId}: ${x},${y}:${color}`));
                                    return;
                                }
                                pixels.set(`${x},${y}`, color);
                            }
                            results[layerId] = pixels;
                            resolve();
                        }
                        catch (err) {
                            reject(new Error(`Failed to process pixel data for layer ${layerId}: ${err.message}`));
                        }
                    }
                    else if (type === 'error') {
                        reject(new Error(`Worker error for layer ${layerId}: ${error}`));
                    }
                };
                worker.onerror = (error) => {
                    reject(new Error(`Worker error for layer ${layerData.id}: ${error.message}`));
                };
                worker.postMessage({
                    action: 'decode',
                    data: layerData.pixels,
                    layerId: layerData.id,
                });
            });
        });
        await Promise.all(promises);
        return importData.map((layerData) => {
            const pixels = results[layerData.id];
            if (!pixels) {
                throw new Error(`No pixel data for layer ${layerData.id}`);
            }
            return {
                id: layerData.id,
                name: layerData.name,
                visible: layerData.visible,
                pixels,
            };
        });
    }
    finally {
        workers.forEach((worker) => worker.terminate());
    }
}
