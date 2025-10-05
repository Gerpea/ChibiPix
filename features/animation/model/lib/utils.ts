import { Layer } from '../types';

export function deepCloneLayers(layers: Layer[]): {
  layers: Layer[];
  idMap: Map<string, string>;
} {
  const idMap = new Map<string, string>();
  const clonedLayers = layers.map((layer) => {
    const newId =
      Date.now().toString() + Math.random().toString(36).substr(2, 9);
    idMap.set(layer.id, newId);
    return { ...layer, id: newId, pixels: new Map(layer.pixels) };
  });
  return { layers: clonedLayers, idMap };
}
