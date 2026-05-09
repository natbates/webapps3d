import React, { createContext, useState, useEffect } from 'react';

export const ResourceContext = createContext();

export function ResourceProvider({ children }) {
  const [textureDefinitions, setTextureDefinitions] = useState({});
  const [modelConfigs, setModelConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const assetRoot = '/assets';
  const productKeys = ['nes-system', 'controller', 'cartridge', 'blaster'];

  const encodeAssetPath = (path) => {
    return path
      .replace(/^\/+/, '')
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
  };

  const makeModelPath = (filename) => {
    if (!filename || typeof filename !== 'string') return null;

    const normalized = filename.replace(/^\/+/, '').replace(/^models\//i, '');
    return `${assetRoot}/models/${encodeAssetPath(normalized)}`;
  };

  const makeResourcePath = (relativePath) => {
    if (!relativePath || typeof relativePath !== 'string') return null;
    return `${assetRoot}/${encodeAssetPath(relativePath.replace(/^\/+/, ''))}`;
  };

  const resolveResourceValue = (value) => {
    if (!value || typeof value !== 'string') return value ?? null;

    if (
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('data:') ||
      value.startsWith('blob:')
    ) {
      return value;
    }

    return encodeURI(makeResourcePath(value));
  };

  useEffect(() => {
    const fetchJsonAsset = async (path) => {
      const response = await fetch(path);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`${path} failed: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn(`[ResourceContext] ${path} returned non-JSON content-type: ${contentType}`);
        return null;
      }

      return await response.json();
    };

    const loadResources = async () => {
      try {
        console.log('[ResourceContext] loading resources...');
        setLoading(true);

        const textureData = await fetchJsonAsset(`${assetRoot}/textures.json`);
        if (textureData) {
          console.log('[ResourceContext] textures loaded:', textureData);
          setTextureDefinitions(textureData);
        } else {
          console.warn('[ResourceContext] textures.json not found or invalid; continuing without textures');
          setTextureDefinitions({});
        }

        const configData = await fetchJsonAsset(`${assetRoot}/model-config.json`);
        if (!configData) {
          throw new Error('model-config.json not found or invalid');
        }

        console.log('[ResourceContext] raw model config:', configData);

        if (!configData.models || !Array.isArray(configData.models)) {
          throw new Error('model-config.json missing "models" array');
        }

        const mapped = Object.fromEntries(
          configData.models.map((model) => {
            console.log('[ResourceContext] mapping model:', model.key);
            return [model.key, model];
          })
        );

        console.log('[ResourceContext] mapped modelConfigs:', mapped);

        setModelConfigs(mapped);

        setError(null);
        console.log('[ResourceContext] load complete');
      } catch (err) {
        console.error('[ResourceContext] FAILED:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadResources();
  }, []);

  const value = {
    textureDefinitions,
    modelConfigs,
    loading,
    error,
    assetRoot,
    productKeys,
    makeModelPath,
    makeResourcePath,
    resolveResourceValue,
  };

  return (
    <ResourceContext.Provider value={value}>
      {children}
    </ResourceContext.Provider>
  );
}

export function useResources() {
  const context = React.useContext(ResourceContext);
  if (!context) {
    throw new Error('useResources must be used within a ResourceProvider');
  }
  return context;
}