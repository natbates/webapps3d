import * as THREE from 'three';
import { textureDefinitions } from './resources.js';

const textureLoader = new THREE.TextureLoader();
export const loadedTextureSets = {};

export function loadTextureSet(key) {
    if (loadedTextureSets[key]) {
        return loadedTextureSets[key];
    }

    const def = textureDefinitions[key];
    if (!def) return null;

    const textures = {};

    function loadTexture(url) {
        return url ? textureLoader.load(url) : null;
    }

    textures.map = loadTexture(def.base);
    textures.normalMap = loadTexture(def.normal);
    textures.roughnessMap = loadTexture(def.roughness);
    textures.metalnessMap = loadTexture(def.metalness);
    textures.aoMap = loadTexture(def.ao);
    textures.displacementMap = loadTexture(def.displacement);

    if (textures.map) {
        textures.map.encoding = THREE.sRGBEncoding;
        textures.map.wrapS = textures.map.wrapT = THREE.RepeatWrapping;
        textures.map.repeat.set(1, 1);
    }

    ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'displacementMap'].forEach((key) => {
        if (textures[key]) {
            textures[key].wrapS = textures[key].wrapT = THREE.RepeatWrapping;
        }
    });

    loadedTextureSets[key] = textures;
    return textures;
}

export function applyTextureSetToModel(model, key) {
    const textures = loadTextureSet(key);
    if (!textures || !model) return;

    model.traverse((child) => {
        if (child.isMesh) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((material) => {
                if (material.isMeshStandardMaterial) {
                    material.map = textures.map;
                    material.normalMap = textures.normalMap;
                    material.roughnessMap = textures.roughnessMap;
                    material.metalnessMap = textures.metalnessMap;
                    material.aoMap = textures.aoMap;
                    material.displacementMap = textures.displacementMap;
                    material.envMapIntensity = 1.0;
                    material.displacementScale = 0.05;
                    material.needsUpdate = true;
                }
            });
        }
    });
}
