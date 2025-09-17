const workerURL = '/workers/serialization.js';
function validateImportData(data) {
    if (!Array.isArray(data)) {
        throw new Error('Invalid file format: Expected an array of layers');
    }
    const validatedData = data;
    for (const layer of validatedData) {
        if (typeof layer !== 'object' || layer === null) {
            throw new Error('Invalid file format: Layer must be an object');
        }
        if (typeof layer.id !== 'string' || layer.id.trim() === '') {
            throw new Error('Invalid file format: Layer ID must be a non-empty string');
        }
        if (typeof layer.name !== 'string' || layer.name.trim() === '') {
            throw new Error('Invalid file format: Layer name must be a non-empty string');
        }
        if (typeof layer.visible !== 'boolean') {
            throw new Error('Invalid file format: Layer visible must be a boolean');
        }
        if (typeof layer.pixels !== 'string') {
            throw new Error('Invalid file format: Layer pixels must be a string');
        }
    }
    return validatedData;
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
                worker.postMessage({
                    action: 'encode',
                    data: layer.pixels,
                    layerId: layer.id,
                });
            });
        });
        await Promise.all(promises);
        const exportData = layers.map((layer) => ({
            id: layer.id,
            name: layer.name,
            visible: layer.visible,
            pixels: results[layer.id] || '',
        }));
        return JSON.stringify(exportData);
    }
    finally {
        workers.forEach((worker) => worker.terminate());
    }
}
export async function importLayers(jsonData, onProgress) {
    const workers = [];
    const results = {};
    try {
        let importData;
        try {
            importData = validateImportData(JSON.parse(jsonData));
        }
        catch (error) {
            throw new Error(`Failed to parse or validate JSON: ${error.message}`);
        }
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
                            for (const [key, value] of pixelArray) {
                                if (typeof key !== 'string' || typeof value !== 'number') {
                                    reject(new Error(`Invalid pixel entry for layer ${layerId}: ${key}:${value}`));
                                    return;
                                }
                                pixels.set(key, value);
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
