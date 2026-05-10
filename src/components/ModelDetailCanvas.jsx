import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useResources } from '../context/ResourceContext';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import '../styles/ModelDetailCanvas.css';
import {
  getModelMaterials,
  cacheMaterialDefaults,
  loadTexture,
  playAnimationByName,
  applyTextureDefinition,
  restoreMaterialDefaults,
} from '../utils/canvasUtils';

function ModelDetailCanvas({ productKey }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const modelRef = useRef(null);
  const mixerRef = useRef(null);
  const clipsRef = useRef([]);
  const animationFrameRef = useRef(null);
  const materialDefaultsRef = useRef(new Map());
  const textureCacheRef = useRef(new Map());

  const [wireframeMode, setWireframeMode] = useState(false);
  const [selectedStateKey, setSelectedStateKey] = useState(null);
  const [selectedTextureKey, setSelectedTextureKey] = useState(null);

  const { modelConfigs, makeModelPath, resolveResourceValue } = useResources();
  const config = modelConfigs?.[productKey];

  const animationActions = useMemo(
    () => (Array.isArray(config?.animations) ? config.animations : []),
    [config]
  );

  const textureOptions = useMemo(
    () => (Array.isArray(config?.textures) ? config.textures : []),
    [config]
  );

  const stateOptions = useMemo(
    () => (Array.isArray(config?.states) ? config.states : []),
    [config]
  );

  const toggleWireframe = () => {
    const nextWireframeState = !wireframeMode;
    getModelMaterials(modelRef.current).forEach((material) => {
      material.wireframe = nextWireframeState;
      material.needsUpdate = true;
    });
    setWireframeMode(nextWireframeState);
  };

  const playSound = useCallback(
    (soundFile) => {
      if (!soundFile) return;
      const source = resolveResourceValue(soundFile);
      if (!source) return;
      const audio = new Audio(source);
      audio.play().catch((error) => {
        console.warn(`[ModelDetailCanvas] Failed to play sound:`, error);
      });
    },
    [resolveResourceValue]
  );

  const playAnimationHandler = useCallback(
    (animationDef) => {
      if (!animationDef) return;
      playAnimationByName(mixerRef.current, clipsRef.current, animationDef.animation);
      playSound(animationDef.soundFile);
    },
    [playSound]
  );

  const handleTexture = useCallback(
    async (textureDef) => {
      if (!textureDef) return;
      setSelectedTextureKey(textureDef.key || null);
      await applyTextureDefinition(modelRef.current, textureDef, textureCacheRef.current, resolveResourceValue);
    },
    [resolveResourceValue]
  );

  const applyState = useCallback(
    async (stateDef, options = {}) => {
      if (!stateDef) return;

      const { playEffects = true } = options;

      setSelectedStateKey(stateDef.key || null);

      if (stateDef.resetToDefault) {
        restoreMaterialDefaults(modelRef.current, materialDefaultsRef.current, stateDef.materialName);
      }

      if (stateDef.textureKey && textureOptions.length > 0) {
        const matchedTexture = textureOptions.find((texture) => texture.key === stateDef.textureKey);
        if (matchedTexture) {
          setSelectedTextureKey(matchedTexture.key || null);
          await applyTextureDefinition(modelRef.current, matchedTexture, textureCacheRef.current, resolveResourceValue);
        }
      }

      if (stateDef.textureFile || stateDef.texture || stateDef.emissiveTextureFile || stateDef.emissiveTexture) {
        await applyTextureDefinition(modelRef.current, stateDef, textureCacheRef.current, resolveResourceValue);
      }

      if (typeof stateDef.emissiveIntensity === 'number') {
        getModelMaterials(modelRef.current).forEach((material) => {
          const targetMaterial = stateDef.materialName
            ? (material.name || '').toLowerCase().includes(stateDef.materialName.toLowerCase())
            : true;
          if (!targetMaterial || !(material && 'emissiveIntensity' in material)) return;
          material.emissiveIntensity = stateDef.emissiveIntensity;
          material.needsUpdate = true;
        });
      }

      if (playEffects) {
        playAnimationByName(mixerRef.current, clipsRef.current, stateDef.animation, {
          reverse: Boolean(stateDef.reverseAnimation),
        });
        playSound(stateDef.soundFile);
      }
    },
    [playSound, textureOptions, resolveResourceValue]
  );

  const cycleState = useCallback(() => {
    if (!stateOptions || stateOptions.length === 0) return;

    const currentKey = selectedStateKey;
    let idx = stateOptions.findIndex((s) => s.key === currentKey);
    if (idx === -1) {
      idx = stateOptions.findIndex((s) => s.default);
      if (idx === -1) idx = 0;
    }

    const nextIdx = (idx + 1) % stateOptions.length;
    const nextState = stateOptions[nextIdx];
    if (nextState) {
      applyState(nextState);
    }
  }, [applyState, selectedStateKey, stateOptions]);

  useEffect(() => {
    if (!canvasRef.current || !config) return;

    const canvas = canvasRef.current;
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });

    renderer.setSize(width, height, false);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 140);
    camera.position.set(0, 3, 9);
    cameraRef.current = camera;

    // Lighting (same as carousel)
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.15);
    scene.add(hemisphereLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.25);
    keyLight.position.set(6, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.2);
    fillLight.position.set(-5, 3, -4);
    scene.add(fillLight);

    const loader = new GLTFLoader();
    let isMounted = true;

    const path = makeModelPath(config.file);

    loader.load(
      path,
      (gltf) => {
        if (!isMounted) return;

        const model = gltf.scene;
        modelRef.current = model;
        mixerRef.current = gltf.animations?.length ? new THREE.AnimationMixer(model) : null;
        clipsRef.current = gltf.animations || [];

        model.rotation.z = Math.PI / 4;
        model.scale.setScalar(1);

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        model.position.sub(center);

        const maxSize = Math.max(size.x, size.y, size.z);
        const fov = (camera.fov * Math.PI) / 180;
        const distance = maxSize / (2 * Math.tan(fov / 2));

        camera.position.set(0, maxSize * 0.35, distance * 1.4);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();

        model.scale.setScalar(config.scale ?? 1);

        scene.add(model);

        const materialDefaults = cacheMaterialDefaults(model);
        materialDefaultsRef.current = materialDefaults;

        const defaultTexture = textureOptions.find((texture) => texture.key === config.defaultTexture);
        if (defaultTexture) {
          setSelectedTextureKey(defaultTexture.key || null);
          applyTextureDefinition(model, defaultTexture, textureCacheRef.current, resolveResourceValue);
        }

        const defaultState = stateOptions.find((state) => state.default);
        if (defaultState) {
          applyState(defaultState, { playEffects: false });
        }
      },
      undefined,
      (err) => {
        console.error('GLB load error:', err);
      }
    );

    let lastFrameTimeRef = 0;
    const animate = (timeMs = 0) => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const model = modelRef.current;
      const mixer = mixerRef.current;
      const deltaSeconds =
        lastFrameTimeRef > 0 ? Math.min((timeMs - lastFrameTimeRef) / 1000, 0.1) : 0;
      lastFrameTimeRef = timeMs;

      if (mixer && deltaSeconds > 0) {
        mixer.update(deltaSeconds);
      }

      if (model) {
        model.rotation.y += 0.007;
        model.rotation.z = Math.PI / 4;
        model.scale.setScalar(config.scale ?? 1);
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!canvasRef.current || !rendererRef.current || !cameraRef.current) return;

      const newWidth = canvasRef.current.clientWidth || 800;
      const newHeight = canvasRef.current.clientHeight || 600;

      rendererRef.current.setSize(newWidth, newHeight, false);
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
      scene.clear();
    };
  }, [config, makeModelPath, applyState, stateOptions, textureOptions, resolveResourceValue]);

  return (
    <div className="model-detail-canvas-container">
      <canvas ref={canvasRef} className="model-detail-canvas" />

      <div className="model-canvas-button-stack">
        {textureOptions.length > 0 && (
          <div className="canvas-texture-row" role="group" aria-label="Texture options">
            {textureOptions.map((texture) => (
              <button
                key={texture.key || texture.label}
                className={`texture-option-chip ${selectedTextureKey === texture.key ? 'active' : ''}`}
                onClick={() => handleTexture(texture)}
                title={texture.label || texture.key}
              >
                {texture.previewImage ? (
                  <img
                    src={resolveResourceValue(texture.previewImage)}
                    alt={texture.label || texture.key}
                    className="texture-preview-image"
                  />
                ) : (
                  <span className="texture-preview-placeholder">{texture.label || texture.key}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {stateOptions.length > 0 && (
          <div className="canvas-state-row" role="group" aria-label="Model states">
            <button
              className={`canvas-stack-button state-btn cycle-btn`}
              onClick={cycleState}
              title={stateOptions.find((s) => s.key === selectedStateKey)?.description || 'Cycle state'}
            >
              {stateOptions.find((s) => s.key === selectedStateKey)?.label || 'Toggle State'}
            </button>
          </div>
        )}

        {animationActions.length > 0 && (
          <div className="canvas-animation-row" role="group" aria-label="Model animations">
            {animationActions.map((animationDef) => (
              <button
                key={animationDef.key || animationDef.label}
                className="canvas-stack-button animation-btn"
                onClick={() => playAnimationHandler(animationDef)}
                title={animationDef.animation || animationDef.label}
              >
                {animationDef.label || animationDef.key}
              </button>
            ))}
          </div>
        )}

        <button
          className={`canvas-stack-button wireframe-btn ${wireframeMode ? 'active' : ''}`}
          onClick={toggleWireframe}
          title="Toggle wireframe"
        >
          {wireframeMode ? 'Hide' : 'Show'} Wireframe
        </button>
      </div>
    </div>
  );
}

export default ModelDetailCanvas;
