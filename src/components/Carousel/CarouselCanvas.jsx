import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResources } from '../../context/ResourceContext';
import { useCarousel } from '../../context/CarouselContext';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import '../../styles/CarouselCanvas.css';

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
  const clockRef = useRef(new THREE.Clock());
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
  const { pauseCarousel, resumeCarousel, setIsGrabbing, isGrabbing, isPaused } = useCarousel();

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

  const playSound = useCallback((soundFile) => {
    if (!soundFile) return;

    const source = resolveResourceValue(soundFile);
    if (!source) return;

    stopAudio();

    const audio = new Audio(source);
    audioRef.current = audio;
    audio.play().catch((error) => {
      console.warn(`[CarouselCanvas] Failed to play sound for ${productKey}:`, error);
    });
  }, [productKey, resolveResourceValue, stopAudio]);

  const getModelMaterials = useCallback(() => {
    const materials = [];
    const model = modelRef.current;
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
  }, []);

  const cacheMaterialDefaults = useCallback(() => {
    const defaults = new Map();
    getModelMaterials().forEach((material) => {
      defaults.set(material.uuid, {
        map: material.map || null,
        emissiveMap: material.emissiveMap || null,
        emissiveIntensity:
          typeof material.emissiveIntensity === 'number' ? material.emissiveIntensity : 1,
      });
    });
    materialDefaultsRef.current = defaults;
  }, [getModelMaterials]);

  const getCachedTexture = useCallback((path) => {
    if (!path) return Promise.resolve(null);

    const existing = textureCacheRef.current.get(path);
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
          console.warn(`[CarouselCanvas] Texture missing: ${path}`);
          resolve(null);
        }
      );
    });

    textureCacheRef.current.set(path, texturePromise);
    return texturePromise;
  }, []);

  const playAnimationByName = useCallback((clipName) => {
    if (!clipName || !mixerRef.current) return;

    const clip = THREE.AnimationClip.findByName(clipsRef.current || [], clipName);
    if (!clip) {
      console.warn(`[CarouselCanvas] Missing animation clip "${clipName}" for ${productKey}`);
      return;
    }

    const action = mixerRef.current.clipAction(clip);
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
  }, [productKey]);

  const applyTextureDefinition = useCallback(async (textureDef) => {
    if (!textureDef) return;

    const mapPath = resolveResourceValue(textureDef.textureFile || textureDef.texture);
    const emissivePath = resolveResourceValue(textureDef.emissiveTextureFile || textureDef.emissiveTexture);

    const [mapTexture, emissiveTexture] = await Promise.all([
      getCachedTexture(mapPath),
      getCachedTexture(emissivePath),
    ]);

    getModelMaterials().forEach((material) => {
      const targetMaterial = textureDef.materialName
        ? (material.name || '').toLowerCase().includes(textureDef.materialName.toLowerCase())
        : true;

      if (!targetMaterial) return;

      if (mapTexture) {
        material.map = mapTexture;
      }

      if (emissiveTexture) {
        material.emissiveMap = emissiveTexture;
      }

      if (typeof textureDef.emissiveIntensity === 'number' && 'emissiveIntensity' in material) {
        material.emissiveIntensity = textureDef.emissiveIntensity;
      }

      material.needsUpdate = true;
    });
  }, [getCachedTexture, getModelMaterials, resolveResourceValue]);

  const restoreMaterialDefaults = useCallback((materialNameFilter) => {
    getModelMaterials().forEach((material) => {
      const shouldRestore = materialNameFilter
        ? (material.name || '').toLowerCase().includes(materialNameFilter.toLowerCase())
        : true;

      if (!shouldRestore) return;

      const defaults = materialDefaultsRef.current.get(material.uuid);
      if (!defaults) return;

      material.map = defaults.map;
      material.emissiveMap = defaults.emissiveMap;
      if ('emissiveIntensity' in material) {
        material.emissiveIntensity = defaults.emissiveIntensity;
      }
      material.needsUpdate = true;
    });
  }, [getModelMaterials]);

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

  const applyState = useCallback(async (stateDef) => {
    if (!stateDef) return;

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

    playAnimationByName(stateDef.animation);
    playSound(stateDef.soundFile);
  }, [applyTextureDefinition, getModelMaterials, playAnimationByName, playSound, restoreMaterialDefaults, textureOptions]);

  const toggleWireframe = () => {
    const nextWireframeState = !wireframeMode;
    getModelMaterials().forEach((material) => {
      material.wireframe = nextWireframeState;
      material.needsUpdate = true;
    });
    setWireframeMode(nextWireframeState);
  };

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
          applyState(defaultState);
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

    clockRef.current = new THREE.Clock();
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const model = modelRef.current;
      const mixer = mixerRef.current;

      if (mixer) {
        mixer.update(clockRef.current.getDelta());
      }

      if (model) {
        if (!isMouseDownRef.current) {
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
        SEE MORE
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

        <button
          className={`canvas-stack-button wireframe-btn ${wireframeMode ? 'active' : ''}`}
          onClick={toggleWireframe}
          title="Toggle wireframe"
        >
          {wireframeMode ? 'Hide' : 'Show'} Wireframe
        </button>

        {stateOptions.length > 0 && (
          <div className="canvas-state-row" role="group" aria-label="Model states">
            {stateOptions.map((state) => (
              <button
                key={state.key || state.label}
                className={`canvas-stack-button state-btn ${selectedStateKey === state.key ? 'active' : ''}`}
                onClick={() => applyState(state)}
                title={state.description || state.label}
              >
                {state.label || state.key}
              </button>
            ))}
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
      </div>
    </div>
  );
}

export default CarouselCanvas;