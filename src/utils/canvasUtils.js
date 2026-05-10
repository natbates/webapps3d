import * as THREE from 'three';

/**
 * Extract all materials from a model hierarchy
 */
export const getModelMaterials = (model) => {
  const materials = [];
  if (!model) return materials;

  model.traverse((node) => {
    if (!node.isMesh || !node.material) return;

    if (Array.isArray(node.material)) {
      node.material.forEach((material) => materials.push(material));
    } else {
      materials.push(node.material);
    }
  });

  return materials;
};

/**
 * Cache initial material properties
 */
export const cacheMaterialDefaults = (model) => {
  const defaults = new Map();
  getModelMaterials(model).forEach((material) => {
    defaults.set(material.uuid, {
      map: material.map || null,
      emissiveMap: material.emissiveMap || null,
      emissiveIntensity:
        typeof material.emissiveIntensity === 'number' ? material.emissiveIntensity : 1,
    });
  });
  return defaults;
};

/**
 * Load a texture with caching
 */
export const loadTexture = (path, textureCache) => {
  if (!path) return Promise.resolve(null);

  const existing = textureCache.get(path);
  if (existing) return existing;

  const texturePromise = new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      path,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;
        resolve(texture);
      },
      undefined,
      () => {
        console.warn(`[Canvas] Texture missing: ${path}`);
        resolve(null);
      }
    );
  });

  textureCache.set(path, texturePromise);
  return texturePromise;
};

/**
 * Play animation clip with optional reverse
 */
export const playAnimationByName = (mixer, clips, clipName, options = {}) => {
  if (!clipName || !mixer) return;

  const clip = THREE.AnimationClip.findByName(clips || [], clipName);
  if (!clip) {
    console.warn(`[Canvas] Missing animation clip "${clipName}"`);
    return;
  }

  const { reverse = false } = options;

  const action = mixer.clipAction(clip);
  action.reset();
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.timeScale = reverse ? -1 : 1;
  if (reverse) {
    action.time = clip.duration;
  }
  action.play();
};

/**
 * Apply texture to model materials
 */
export const applyTextureDefinition = async (model, textureDef, textureCache, resolveResourceValue) => {
  if (!textureDef) return;

  const mapPath = resolveResourceValue(textureDef.textureFile || textureDef.texture);
  const emissivePath = resolveResourceValue(textureDef.emissiveTextureFile || textureDef.emissiveTexture);

  const [mapTexture, emissiveTexture] = await Promise.all([
    loadTexture(mapPath, textureCache),
    loadTexture(emissivePath, textureCache),
  ]);

  getModelMaterials(model).forEach((material) => {
    const targetMaterial = textureDef.materialName
      ? (material.name || '').toLowerCase().includes(textureDef.materialName.toLowerCase())
      : true;

    if (!targetMaterial) return;

    if (mapTexture) material.map = mapTexture;
    if (emissiveTexture) material.emissiveMap = emissiveTexture;

    if (typeof textureDef.emissiveIntensity === 'number' && 'emissiveIntensity' in material) {
      material.emissiveIntensity = textureDef.emissiveIntensity;
    }

    material.needsUpdate = true;
  });
};

/**
 * Restore material defaults for a given material name filter
 */
export const restoreMaterialDefaults = (model, materialDefaultsMap, materialNameFilter) => {
  getModelMaterials(model).forEach((material) => {
    const shouldRestore = materialNameFilter
      ? (material.name || '').toLowerCase().includes(materialNameFilter.toLowerCase())
      : true;

    if (!shouldRestore) return;

    const defaults = materialDefaultsMap.get(material.uuid);
    if (!defaults) return;

    material.map = defaults.map;
    material.emissiveMap = defaults.emissiveMap;
    if ('emissiveIntensity' in material) {
      material.emissiveIntensity = defaults.emissiveIntensity;
    }
    material.needsUpdate = true;
  });
};
