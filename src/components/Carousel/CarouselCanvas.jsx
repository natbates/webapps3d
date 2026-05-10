import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResources } from '../../context/ResourceContext';
import { useCarousel } from '../../context/CarouselContext';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import '../../styles/CarouselCanvas.css';
import { FaEye } from 'react-icons/fa6';
import {
  getModelMaterials as utilGetModelMaterials,
  cacheMaterialDefaults as utilCacheMaterialDefaults,
  loadTexture as utilLoadTexture,
  playAnimationByName as utilPlayAnimationByName,
  applyTextureDefinition as utilApplyTextureDefinition,
  restoreMaterialDefaults as utilRestoreMaterialDefaults,
} from '../../utils/canvasUtils';

const BASE_LIGHTS = {
  hemisphere: 1.15,
  ambient: 1.2,
  key: 2.25,
  fill: 1.2,
};

function CarouselCanvas({ productKey, lightStrength = 1, onModelScreenPointChange }) {
  const navigate = useNavigate();

  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const modelRef = useRef(null);
  const mixerRef = useRef(null);
  const clipsRef = useRef([]);
  const animationFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const lightRefs = useRef({});
  const materialDefaultsRef = useRef(new Map());
  const textureCacheRef = useRef(new Map());
  const isPausedRef = useRef(false);
  const wasPausedBeforeGrabRef = useRef(false);
  const audioRef = useRef(null);

  const isMouseDownRef = useRef(false);
  const lastXRef = useRef(0);
  const modelPointRef = useRef(new THREE.Vector3());

  const [wireframeMode, setWireframeMode] = useState(false);
  const [selectedStateKey, setSelectedStateKey] = useState(null);
  const [selectedTextureKey, setSelectedTextureKey] = useState(null);

  const { modelConfigs, makeModelPath, resolveResourceValue } = useResources();
  const {
    pauseCarousel,
    resumeCarousel,
    setIsGrabbing,
    isGrabbing,
    isPaused,
    autoSpinEnabled,
    playSoundsEnabled,
  } = useCarousel();

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

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!playSoundsEnabled) {
      stopAudio();
    }
  }, [playSoundsEnabled, stopAudio]);

  const playSound = useCallback((soundFile) => {
    if (!soundFile || !playSoundsEnabled) return;

    const source = resolveResourceValue(soundFile);
    if (!source) return;

    stopAudio();

    const audio = new Audio(source);
    audioRef.current = audio;
    audio.play().catch((error) => {
      console.warn(`[CarouselCanvas] Failed to play sound for ${productKey}:`, error);
    });
  }, [playSoundsEnabled, productKey, resolveResourceValue, stopAudio]);

  const getModelMaterials = useCallback(() => utilGetModelMaterials(modelRef.current), []);

  const cacheMaterialDefaults = useCallback(() => {
    materialDefaultsRef.current = utilCacheMaterialDefaults(modelRef.current);
  }, []);

  const playAnimationByName = useCallback((clipName, options = {}) => {
    utilPlayAnimationByName(mixerRef.current, clipsRef.current, clipName, options);
  }, []);

  const applyTextureDefinition = useCallback(async (textureDef) => {
    await utilApplyTextureDefinition(modelRef.current, textureDef, textureCacheRef.current, resolveResourceValue);
  }, [resolveResourceValue]);

  const restoreMaterialDefaults = useCallback((materialNameFilter) => {
    utilRestoreMaterialDefaults(modelRef.current, materialDefaultsRef.current, materialNameFilter);
  }, []);

  const handleAnimation = useCallback((animationDef) => {
    if (!animationDef) return;
    playAnimationByName(animationDef.animation);
    playSound(animationDef.soundFile);
  }, [playAnimationByName, playSound]);

  const handleTexture = useCallback(async (textureDef) => {
    if (!textureDef) return;
    setSelectedTextureKey(textureDef.key || null);
    await applyTextureDefinition(textureDef);
  }, [applyTextureDefinition]);

  const applyState = useCallback(async (stateDef, options = {}) => {
    if (!stateDef) return;

    const { playEffects = true } = options;

    setSelectedStateKey(stateDef.key || null);

    if (stateDef.resetToDefault) {
      restoreMaterialDefaults(stateDef.materialName);
    }

    if (stateDef.textureKey && textureOptions.length > 0) {
      const matchedTexture = textureOptions.find((texture) => texture.key === stateDef.textureKey);
      if (matchedTexture) {
        setSelectedTextureKey(matchedTexture.key || null);
        await applyTextureDefinition(matchedTexture);
      }
    }

    if (stateDef.textureFile || stateDef.texture || stateDef.emissiveTextureFile || stateDef.emissiveTexture) {
      await applyTextureDefinition(stateDef);
    }

    if (typeof stateDef.emissiveIntensity === 'number') {
      getModelMaterials().forEach((material) => {
        const targetMaterial = stateDef.materialName
          ? (material.name || '').toLowerCase().includes(stateDef.materialName.toLowerCase())
          : true;
        if (!targetMaterial || !(material && 'emissiveIntensity' in material)) return;
        material.emissiveIntensity = stateDef.emissiveIntensity;
        material.needsUpdate = true;
      });
    }

    if (playEffects) {
      playAnimationByName(stateDef.animation, { reverse: Boolean(stateDef.reverseAnimation) });
      playSound(stateDef.soundFile);
    }
  }, [applyTextureDefinition, getModelMaterials, playAnimationByName, playSound, restoreMaterialDefaults, textureOptions]);

  const toggleWireframe = () => {
    const nextWireframeState = !wireframeMode;
    getModelMaterials().forEach((material) => {
      material.wireframe = nextWireframeState;
      material.needsUpdate = true;
    });
    setWireframeMode(nextWireframeState);
  };

  const cycleState = useCallback(() => {
    if (!stateOptions || stateOptions.length === 0) return;

    const currentKey = selectedStateKey;
    let idx = stateOptions.findIndex((s) => s.key === currentKey);
    if (idx === -1) {
      // If no current selection, try to find the default, otherwise start at 0
      idx = stateOptions.findIndex((s) => s.default);
      if (idx === -1) idx = 0;
    }

    const nextIdx = (idx + 1) % stateOptions.length;
    const nextState = stateOptions[nextIdx];
    if (nextState) {
      applyState(nextState);
    }
  }, [applyState, selectedStateKey, stateOptions]);

  const handleSeeMore = () => {
    navigate(`/model/${productKey}`);
  };

  useEffect(() => {
    if (!canvasRef.current || !config) return;

    const canvas = canvasRef.current;

    const width = Math.max(128, canvas.parentElement?.clientWidth || 800);
    const height = Math.max(96, canvas.parentElement?.clientHeight || 600);

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

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffffff, BASE_LIGHTS.hemisphere * lightStrength);
    scene.add(hemisphereLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, BASE_LIGHTS.ambient * lightStrength);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, BASE_LIGHTS.key * lightStrength);
    keyLight.position.set(6, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, BASE_LIGHTS.fill * lightStrength);
    fillLight.position.set(-5, 3, -4);
    scene.add(fillLight);

    lightRefs.current = {
      hemisphere: hemisphereLight,
      ambient: ambientLight,
      key: keyLight,
      fill: fillLight,
    };

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

        // Frame the camera from the canonical mesh size so config scale changes
        // are visible on screen instead of being normalized away.
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

        cacheMaterialDefaults();

        const defaultTexture = textureOptions.find((texture) => texture.key === config.defaultTexture);
        if (defaultTexture) {
          setSelectedTextureKey(defaultTexture.key || null);
          applyTextureDefinition(defaultTexture);
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

    const onDown = (e) => {
      isMouseDownRef.current = true;
      wasPausedBeforeGrabRef.current = isPausedRef.current;
      setIsGrabbing(true);
      pauseCarousel();
      lastXRef.current = e.clientX;
    };

    const onUp = () => {
      isMouseDownRef.current = false;
      setIsGrabbing(false);

      if (!wasPausedBeforeGrabRef.current) {
        resumeCarousel();
      }
    };

    const onMove = (e) => {
      if (!isMouseDownRef.current || !modelRef.current) return;

      const dx = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;

      modelRef.current.rotation.y += dx * 0.005;
    };

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);

    lastFrameTimeRef.current = 0;
    const animate = (timeMs = 0) => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const model = modelRef.current;
      const mixer = mixerRef.current;
      const deltaSeconds =
        lastFrameTimeRef.current > 0
          ? Math.min((timeMs - lastFrameTimeRef.current) / 1000, 0.1)
          : 0;
      lastFrameTimeRef.current = timeMs;

      if (mixer && deltaSeconds > 0) {
        mixer.update(deltaSeconds);
      }

      if (model) {
        if (!isMouseDownRef.current && autoSpinEnabled) {
          model.rotation.y += 0.007;
          model.rotation.z = Math.PI / 4;
        }

        model.scale.setScalar(config.scale ?? 1);

        if (cameraRef.current && onModelScreenPointChange) {
          modelPointRef.current.set(0, 0, 0);
          model.localToWorld(modelPointRef.current);
          modelPointRef.current.project(cameraRef.current);

          const canvasWidth = canvas.clientWidth || width;
          const canvasHeight = canvas.clientHeight || height;
          onModelScreenPointChange({
            x: ((modelPointRef.current.x + 1) / 2) * canvasWidth,
            y: ((1 - modelPointRef.current.y) / 2) * canvasHeight,
          });
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      isMounted = false;

      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);

      cancelAnimationFrame(animationFrameRef.current);

      stopAudio();
      mixerRef.current = null;
      clipsRef.current = [];

      renderer.dispose();
      scene.clear();
    };
  }, [
    applyState,
    applyTextureDefinition,
    cacheMaterialDefaults,
    config,
    makeModelPath,
    onModelScreenPointChange,
    pauseCarousel,
    productKey,
    resumeCarousel,
    autoSpinEnabled,
    setIsGrabbing,
    stateOptions,
    stopAudio,
    textureOptions,
  ]);

  useEffect(() => {
    const { hemisphere, ambient, key, fill } = lightRefs.current;
    if (!hemisphere || !ambient || !key || !fill) return;

    hemisphere.intensity = BASE_LIGHTS.hemisphere * lightStrength;
    ambient.intensity = BASE_LIGHTS.ambient * lightStrength;
    key.intensity = BASE_LIGHTS.key * lightStrength;
    fill.intensity = BASE_LIGHTS.fill * lightStrength;
  }, [lightStrength]);

  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !rendererRef.current || !cameraRef.current) return;

      const width = Math.max(128, canvasRef.current.parentElement?.clientWidth || 800);
      const height = Math.max(96, canvasRef.current.parentElement?.clientHeight || 600);

      rendererRef.current.setSize(width, height, false);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="carousel-canvas-container">
      <canvas
        ref={canvasRef}
        className={isGrabbing ? 'carousel-canvas grabbing' : 'carousel-canvas'}
      />

      <button
        className="canvas-see-more-btn"
        onClick={handleSeeMore}
        title="See more details"
      >
        <FaEye size={16} /> <span className='see-more-text'>SEE MORE</span>
      </button>
      <div className="canvas-button-stack">

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
                onClick={() => handleAnimation(animationDef)}
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

export default CarouselCanvas;