import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const container = document.getElementById('viewer');
const hasViewer = Boolean(container);
const path = window.location.pathname;
const filename = path.split('/').pop();
const isProductListing = filename === 'products.html';
const isProductDetail = filename === 'product.html';
const selectedProduct = ['table', 'chair', 'bench'].includes(new URLSearchParams(window.location.search).get('product'))
    ? new URLSearchParams(window.location.search).get('product')
    : 'table';
const modelTitle = document.getElementById('modelTitle');
const modelDescription = document.getElementById('modelDescription');
const modelInfoDescription = document.getElementById('modelInfoDescription');
const toggleWireframe = document.getElementById('toggleWireframe');
const textureButton = document.getElementById('textureButton');
const lightSlider = document.getElementById('lightIntensity');
const colorButtons = document.querySelectorAll('.color-swatch');
const modelButtons = document.querySelectorAll('[data-model]');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-content');
const textureModal = document.getElementById('textureModal');
const modalClose = document.getElementById('modalClose');
const modalBackdrop = document.getElementById('modalBackdrop');
const textureGrid = document.getElementById('textureGrid');
const textureOptions = document.getElementById('textureOptions');
const activeTextureImage = document.getElementById('activeTextureImage');
const activeTextureName = document.getElementById('activeTextureName');
const productCards = document.querySelectorAll('.product-card');
const productModal = document.getElementById('productModal');
const productModalClose = document.getElementById('productModalClose');
const productModalBackdrop = document.getElementById('productModalBackdrop');
const productModalTitle = document.getElementById('productModalTitle');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(4.5, 2.2, 6.0);
camera.lookAt(0, 0.7, 0);
let renderer;
let orbitControls;

if (hasViewer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.09;
    orbitControls.screenSpacePanning = false;
    orbitControls.enablePan = false;
    orbitControls.rotateSpeed = 0.9;
    orbitControls.minDistance = 1.2;
    orbitControls.maxDistance = 25;
    orbitControls.autoRotate = true;
    orbitControls.autoRotateSpeed = 0.7;
    orbitControls.target.set(0, 0.6, 0);
    orbitControls.update();

    const hemiLight = new THREE.HemisphereLight(0xffe7ff, 0x202030, 0.35);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff2d0, 1.3);
    sunLight.position.set(4, 6, 4);
    sunLight.castShadow = true;
    sunLight.shadow.camera.left = -4;
    sunLight.shadow.camera.right = 4;
    sunLight.shadow.camera.top = 4;
    sunLight.shadow.camera.bottom = -4;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);
    scene.add(sunLight.target);
    sunLight.target.position.set(0, 0.5, 0);

    const fillLight = new THREE.PointLight(0xaaccff, 0.45, 12);
    fillLight.position.set(-3.5, 2.2, -2.5);
    scene.add(fillLight);
}

const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const assetRoot = window.location.pathname.includes('/pages/') ? '../assets/resources' : 'assets/resources';
const textureDefinitions = {
    oak: {
        key: 'oak',
        name: 'Oak Wood',
        preview: `${assetRoot}/models/oak-wood-bare-bl/oak-wood-bare_preview.jpg`,
        base: `${assetRoot}/models/oak-wood-bare-bl/oak-wood-bare_albedo.png`,
        normal: `${assetRoot}/models/oak-wood-bare-bl/oak-wood-bare_normal-ogl.png`,
        roughness: `${assetRoot}/models/oak-wood-bare-bl/oak-wood-bare_roughness.png`,
        metalness: `${assetRoot}/models/oak-wood-bare-bl/oak-wood-bare_metallic.png`,
        ao: `${assetRoot}/models/oak-wood-bare-bl/oak-wood-bare_ao.png`,
        displacement: `${assetRoot}/models/oak-wood-bare-bl/oak-wood-bare_height.png`,
    },
    aluminum: {
        key: 'aluminum',
        name: 'Worn Aluminum',
        preview: `${assetRoot}/models/worn-aluminum-bl/worn-aluminum_preview.jpg`,
        base: `${assetRoot}/models/worn-aluminum-bl/worn-aluminum_albedo.png`,
        normal: `${assetRoot}/models/worn-aluminum-bl/worn-aluminum_normal-ogl.png`,
        roughness: `${assetRoot}/models/worn-aluminum-bl/worn-aluminum_roughness.png`,
        metalness: `${assetRoot}/models/worn-aluminum-bl/worn-aluminum_metallic.png`,
        ao: `${assetRoot}/models/worn-aluminum-bl/worn-aluminum_ao.png`,
        displacement: `${assetRoot}/models/worn-aluminum-bl/worn-aluminum_height.png`,
    },
    yoga: {
        key: 'yoga',
        name: 'Yoga Mat',
        preview: `${assetRoot}/models/yoga-mat-wavy-pattern1-bl/yoga-mat-wavy-pattern1-preview.jpg`,
        base: `${assetRoot}/models/yoga-mat-wavy-pattern1-bl/yoga-mat-wavy-pattern1-albedo.png`,
        normal: `${assetRoot}/models/yoga-mat-wavy-pattern1-bl/yoga-mat-wavy-pattern1-Normal-ogl.png`,
        roughness: `${assetRoot}/models/yoga-mat-wavy-pattern1-bl/yoga-mat-wavy-pattern1-Roughness.png`,
        metalness: `${assetRoot}/models/yoga-mat-wavy-pattern1-bl/yoga-mat-wavy-pattern1-Metallic.png`,
        ao: `${assetRoot}/models/yoga-mat-wavy-pattern1-bl/yoga-mat-wavy-pattern1-ao.png`,
        displacement: `${assetRoot}/models/yoga-mat-wavy-pattern1-bl/yoga-mat-wavy-pattern1-Height.png`,
    },
};
const loadedTextureSets = {};
let currentTextureKey = 'oak';
const loadedModels = {};
const defaultModelScale = 0.5;

const controls = {
    currentModel: 'table',
    wireframe: false,
    animationActive: false,
};

let modelGroup = new THREE.Group();
scene.add(modelGroup);

const modelDefs = {
    table: {
        name: 'Table',
        file: `${assetRoot}/models/Table.glb`,
        description: 'A table model loaded from a GLB file. Replace this with your exported table asset.',
        scale: 1.2,
    },
    chair: {
        name: 'Chair',
        file: `${assetRoot}/models/Chair.glb`,
        description: 'A chair model loaded from a GLB file. Replace this with your exported chair asset.',
        scale: 1.1,
    },
    bench: {
        name: 'Bench',
        file: `${assetRoot}/models/Bench.glb`,
        description: 'A bench model loaded from a GLB file. Replace this with your exported bench asset.',
        scale: 1.05,
    },
};

function createLabelTexture(text, background, fill) {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = fill;
    ctx.textAlign = 'center';
    ctx.font = '120px Arial';
    ctx.fillText(text, size / 2, size / 2 + 40);

    return new THREE.CanvasTexture(canvas);
}

function makePlaceholderModel(key) {
    let geometry;
    let material = new THREE.MeshStandardMaterial({ color: 0x7d7d7d, roughness: 0.45, metalness: 0.15 });

    if (key === 'table') {
        geometry = new THREE.BoxGeometry(2.4, 0.2, 1.2);
        const top = new THREE.Mesh(geometry, material);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.0, 0.15), material);
        const table = new THREE.Group();
        top.position.y = 0.5;
        table.add(top);
        leg.position.set(-1.05, 0, -0.5);
        table.add(leg.clone());
        leg.position.set(1.05, 0, -0.5);
        table.add(leg.clone());
        leg.position.set(-1.05, 0, 0.5);
        table.add(leg.clone());
        leg.position.set(1.05, 0, 0.5);
        table.name = 'Table (Placeholder)';
        table.userData = { description: 'Placeholder table used until the GLB model is loaded.' };
        return table;
    }

    if (key === 'chair') {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.15, 1), material);
        const back = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.15), material);
        const chair = new THREE.Group();
        seat.position.y = 0.45;
        back.position.set(0, 1.05, -0.425);
        chair.add(seat, back);
        chair.name = 'Chair (Placeholder)';
        chair.userData = { description: 'Placeholder chair used until the GLB model is loaded.' };
        return chair;
    }

    if (key === 'bench') {
        const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 0.6), material);
        const bench = new THREE.Group();
        top.position.y = 0.45;
        bench.add(top);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), material);
        leg.position.set(-1.0, 0, -0.2);
        bench.add(leg.clone());
        leg.position.set(1.0, 0, -0.2);
        bench.add(leg.clone());
        bench.name = 'Bench (Placeholder)';
        bench.userData = { description: 'Placeholder bench used until the GLB model is loaded.' };
        bench.scale.setScalar(defaultModelScale);
        return bench;
    }

    const group = new THREE.Group();
    group.scale.setScalar(defaultModelScale);
    return group;
}

function showModel(key) {
    Object.values(loadedModels).forEach((object) => modelGroup.remove(object));
    modelGroup.clear();
    controls.currentModel = key;
    updateButtonState(key);

    const def = modelDefs[key];
    if (!def) return;

    if (loadedModels[key]) {
        modelGroup.add(loadedModels[key]);
        applyTextureSetToModel(loadedModels[key], currentTextureKey);
        updateInfo(loadedModels[key]);
        return;
    }

    const placeholder = makePlaceholderModel(key);
    placeholder.rotation.set(0, 0, 0);
    placeholder.position.set(0, 0, 0);
    modelGroup.add(placeholder);
    updateInfo(placeholder);
    loadModel(key);
}

function loadModel(key) {
    const def = modelDefs[key];
    if (!def) return;

    loader.load(
        def.file,
        (gltf) => {
            console.log('GLTF loaded:', key, def.file);
            const model = gltf.scene;
            model.name = def.name;
            model.userData = { description: def.description };
            model.scale.setScalar((def.scale || 1) * defaultModelScale);
            model.updateMatrixWorld(true);
            const bbox = new THREE.Box3().setFromObject(model);
            const center = bbox.getCenter(new THREE.Vector3());
            model.position.sub(center);
            model.position.y -= bbox.min.y * model.scale.x;
            loadedModels[key] = model;

            if (controls.currentModel === key) {
                modelGroup.clear();
                modelGroup.add(model);
                fitCameraToObject(model);
                updateInfo(model);
                setWireframe(controls.wireframe);
            }
        },
        (xhr) => {
            if (xhr.lengthComputable) {
                const progress = (xhr.loaded / xhr.total) * 100;
                console.log(`Loading ${key}: ${progress.toFixed(0)}%`);
            }
        },
        (error) => {
            console.error('Failed to load', def.file, error);
            modelDescription.textContent = `Failed to load ${def.file}. Check console/network.`;
        }
    );
}

function updateInfo(object) {
    if (modelTitle) {
        modelTitle.textContent = object.name;
    }
    if (modelDescription) {
        modelDescription.textContent = object.userData?.description ?? 'A 3D model displayed in the scene.';
    }
    if (modelInfoDescription) {
        modelInfoDescription.textContent = object.userData?.description ?? 'A 3D model displayed in the scene.';
    }
}

function loadTextureSet(key) {
    if (loadedTextureSets[key]) {
        return loadedTextureSets[key];
    }

    const def = textureDefinitions[key];
    if (!def) return null;

    const textures = {
        map: textureLoader.load(def.base),
        normalMap: textureLoader.load(def.normal),
        roughnessMap: textureLoader.load(def.roughness),
        metalnessMap: textureLoader.load(def.metalness),
        aoMap: textureLoader.load(def.ao),
        displacementMap: textureLoader.load(def.displacement),
    };

    textures.map.encoding = THREE.sRGBEncoding;
    textures.map.wrapS = textures.map.wrapT = THREE.RepeatWrapping;
    textures.map.repeat.set(1, 1);

    textures.normalMap.wrapS = textures.normalMap.wrapT = THREE.RepeatWrapping;
    textures.roughnessMap.wrapS = textures.roughnessMap.wrapT = THREE.RepeatWrapping;
    textures.metalnessMap.wrapS = textures.metalnessMap.wrapT = THREE.RepeatWrapping;
    textures.aoMap.wrapS = textures.aoMap.wrapT = THREE.RepeatWrapping;
    textures.displacementMap.wrapS = textures.displacementMap.wrapT = THREE.RepeatWrapping;

    loadedTextureSets[key] = textures;
    return textures;
}

function applyTextureSetToModel(model, key) {
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
                    material.displacementScale = 0.05;
                    material.needsUpdate = true;
                }
            });
        }
    });
}

function updateButtonState(key) {
    modelButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.model === key);
    });
}

function fitCameraToObject(object, offset = 1.4) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxSize = Math.max(size.x, size.y, size.z);
    const distance = offset * maxSize / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));

    const direction = new THREE.Vector3(1, 0.75, 1).normalize();
    camera.position.copy(center).add(direction.multiplyScalar(distance));
    camera.near = Math.max(0.1, distance / 100);
    camera.far = distance * 100;
    camera.updateProjectionMatrix();

    orbitControls.target.copy(center);
    orbitControls.update();
}

function openProductModal(key) {
    const def = modelDefs[key];
    if (def) {
        productModalTitle.textContent = def.name;
    }
    showModel(key);
    productModal.classList.add('open');
    productModal.setAttribute('aria-hidden', 'false');
    resize();
}

function closeProductModal() {
    productModal.classList.remove('open');
    productModal.setAttribute('aria-hidden', 'true');
}

function setWireframe(enabled) {
    modelGroup.traverse((child) => {
        if (child.isMesh) {
            child.material.wireframe = enabled;
        }
    });
    controls.wireframe = enabled;
}

function openTextureModal() {
    if (!textureModal) {
        return;
    }
    textureModal.classList.add('open');
    textureModal.setAttribute('aria-hidden', 'false');
}

function closeTextureModal() {
    if (!textureModal) {
        return;
    }
    textureModal.classList.remove('open');
    textureModal.setAttribute('aria-hidden', 'true');
}

function updateTexturePreview(key) {
    const def = textureDefinitions[key];
    if (!def) return;
    activeTextureImage.src = def.preview;
    activeTextureName.textContent = def.name;
}

function buildTextureGrid() {
    if (!textureGrid) {
        return;
    }

    Object.values(textureDefinitions).forEach((def) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'texture-card';
        if (def.key === currentTextureKey) {
            card.classList.add('active');
        }
        card.innerHTML = `
            <img src="${def.preview}" alt="${def.name} preview" />
            <div class="texture-label">${def.name}</div>
        `;
        card.addEventListener('click', () => {
            currentTextureKey = def.key;
            updateTexturePreview(def.key);
            if (loadedModels[controls.currentModel]) {
                applyTextureSetToModel(loadedModels[controls.currentModel], def.key);
            }
            document.querySelectorAll('.texture-card').forEach((item) => item.classList.remove('active'));
            card.classList.add('active');
            closeTextureModal();
        });
        textureGrid.appendChild(card);
    });
}

function buildTextureOptions() {
    if (!textureOptions) {
        return;
    }
    textureOptions.innerHTML = '';
    Object.values(textureDefinitions).forEach((def) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'texture-card';
        if (def.key === currentTextureKey) {
            card.classList.add('active');
        }
        card.innerHTML = `
            <img src="${def.preview}" alt="${def.name} preview" />
            <div class="texture-label">${def.name}</div>
        `;
        card.addEventListener('click', () => {
            currentTextureKey = def.key;
            updateTexturePreview(def.key);
            if (loadedModels[controls.currentModel]) {
                applyTextureSetToModel(loadedModels[controls.currentModel], def.key);
            }
            document.querySelectorAll('.texture-card').forEach((item) => item.classList.remove('active'));
            card.classList.add('active');
        });
        textureOptions.appendChild(card);
    });
}

function resize() {
    if (!container) {
        return;
    }

    const width = container.clientWidth || Math.min(window.innerWidth * 0.9, 800);
    const height = container.clientHeight || Math.min(window.innerHeight * 0.7, 560);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

window.addEventListener('resize', resize);

lightSlider?.addEventListener('input', (event) => {
    const value = parseFloat(event.target.value);
    sunLight.intensity = value;
    fillLight.intensity = Math.max(0.2, value * 0.5);
});

toggleWireframe?.addEventListener('click', () => {
    setWireframe(!controls.wireframe);
});

textureButton?.addEventListener('click', () => {
    openTextureModal();
});

modalClose?.addEventListener('click', closeTextureModal);
modalBackdrop?.addEventListener('click', closeTextureModal);

colorButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const color = button.dataset.color;
        sunLight.color.set(color);
    });
});

productCards.forEach((button) => {
    if (isProductListing) {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const product = button.dataset.product;
            if (product) {
                window.location.href = `product.html?product=${product}`;
            }
        });
    } else {
        button.addEventListener('click', () => openProductModal(button.dataset.product));
    }
});

productModalClose?.addEventListener('click', closeProductModal);
productModalBackdrop?.addEventListener('click', closeProductModal);

modelButtons.forEach((button) => {
    button.addEventListener('click', () => showModel(button.dataset.model));
});

function setupTabs() {
    tabButtons.forEach((button) => {
        button.addEventListener('click', () => {
            tabButtons.forEach((btn) => btn.classList.remove('active'));
            tabPanels.forEach((panel) => panel.classList.remove('active'));
            button.classList.add('active');
            const target = document.getElementById(button.dataset.tab);
            if (target) target.classList.add('active');
        });
    });
}

function animate() {
    requestAnimationFrame(animate);
    orbitControls.update();
    renderer.render(scene, camera);
}

buildTextureGrid();
buildTextureOptions();
updateTexturePreview(currentTextureKey);
if (hasViewer) {
    const activeProduct = isProductDetail ? selectedProduct : 'table';
    if (isProductDetail && modelDefs[activeProduct]) {
        document.title = `${modelDefs[activeProduct].name} · Web3D Studio`;
    }
    showModel(activeProduct);
    setupTabs();
    resize();
    animate();
} else {
    setupTabs();
}
