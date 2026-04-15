import { textureDefinitions } from './resources.js';
import { applyTextureSetToModel } from './texture-loader.js';
import { setCurrentTextureKey, getCurrentTextureKey, setWireframe, showModel, controls, loadedModels } from './model-loader.js';
import { sunLight, zoomIn, zoomOut, getZoomState, orbitControls } from './scene.js';

const toggleWireframeOverlay = document.getElementById('toggleWireframeOverlay');
const zoomInButton = document.getElementById('zoomIn');
const zoomOutButton = document.getElementById('zoomOut');
const textureButton = document.getElementById('textureButton');
const lightSlider = document.getElementById('lightIntensityOverlay');
const colorButtons = document.querySelectorAll('.color-swatch, .viewer-overlay-swatch');
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
const modelTitle = document.getElementById('modelTitle');
const modelDescription = document.getElementById('modelDescription');
const modelInfoDescription = document.getElementById('modelInfoDescription');

export function updateInfo(object) {
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

function getTexturePreviewUrl(def) {
    return def.base || def.preview || '';
}

export function updateTexturePreview(key) {
    const def = textureDefinitions[key];
    if (!def) return;

    setCurrentTextureKey(key);

    if (activeTextureImage) {
        activeTextureImage.src = getTexturePreviewUrl(def);
    }
    if (activeTextureName) {
        activeTextureName.textContent = def.name;
    }
}

export function buildTextureGrid() {
    if (!textureGrid) return;
    textureGrid.innerHTML = '';

    Object.values(textureDefinitions).forEach((def) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'texture-card';
        if (def.key === getCurrentTextureKey()) {
            card.classList.add('active');
        }
        card.innerHTML = `
      <img class="texture-swatch" src="${getTexturePreviewUrl(def)}" alt="${def.name} finish preview" />
      <div class="texture-card-body">
        <h3>${def.name}</h3>
        <p>${def.description || 'A premium finish for versatile furniture styling.'}</p>
      </div>
    `;
        card.addEventListener('click', () => {
            updateTexturePreview(def.key);
            if (controls.currentModel && loadedModels[controls.currentModel]) {
                applyTextureSetToModel(loadedModels[controls.currentModel], def.key);
            }
            document.querySelectorAll('.texture-card').forEach((item) => item.classList.remove('active'));
            card.classList.add('active');
            closeTextureModal();
        });
        textureGrid.appendChild(card);
    });
}

export function buildTextureDotList() {
    let container = document.getElementById('textureDotList');
    if (!container) {
        const viewer = document.getElementById('viewer');
        if (!viewer) return;
        container = document.createElement('div');
        container.id = 'textureDotList';
        container.className = 'texture-dot-list';
        viewer.parentNode.insertBefore(container, viewer.nextElementSibling);
    }
    container.innerHTML = '';

    Object.values(textureDefinitions).forEach((def) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'texture-dot';
        dot.title = def.name;
        dot.style.backgroundImage = `url(${getTexturePreviewUrl(def)})`;
        if (def.key === getCurrentTextureKey()) {
            dot.classList.add('active');
        }
        dot.addEventListener('click', () => {
            updateTexturePreview(def.key);
            if (controls.currentModel && loadedModels[controls.currentModel]) {
                applyTextureSetToModel(loadedModels[controls.currentModel], def.key);
            }
            document.querySelectorAll('.texture-dot').forEach((item) => item.classList.remove('active'));
            dot.classList.add('active');
        });
        container.appendChild(dot);
    });
}

export function buildTextureOptions() {
    if (!textureOptions) return;
    textureOptions.innerHTML = '';

    Object.values(textureDefinitions).forEach((def) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'texture-card';
        if (def.key === getCurrentTextureKey()) {
            card.classList.add('active');
        }
        card.innerHTML = `
      <img class="texture-swatch" src="${getTexturePreviewUrl(def)}" alt="${def.name} finish preview" />
      <div class="texture-card-body">
        <h3>${def.name}</h3>
        <p>${def.description || 'A premium finish for versatile furniture styling.'}</p>
      </div>
    `;
        card.addEventListener('click', () => {
            updateTexturePreview(def.key);
            if (controls.currentModel && loadedModels[controls.currentModel]) {
                applyTextureSetToModel(loadedModels[controls.currentModel], def.key);
            }
            document.querySelectorAll('.texture-card').forEach((item) => item.classList.remove('active'));
            card.classList.add('active');
        });
        textureOptions.appendChild(card);
    });
}

export function openTextureModal() {
    if (!textureModal) return;
    textureModal.classList.add('open');
    textureModal.setAttribute('aria-hidden', 'false');
}

export function closeTextureModal() {
    if (!textureModal) return;
    textureModal.classList.remove('open');
    textureModal.setAttribute('aria-hidden', 'true');
}

export function setupUI() {
    lightSlider?.addEventListener('input', (event) => {
        const value = parseFloat(event.target.value);
        if (sunLight) {
            sunLight.intensity = value;
        }
    });

    toggleWireframeOverlay?.addEventListener('click', () => {
        setWireframe(!controls.wireframe);
    });

    const updateZoomButtons = () => {
        const { atMin, atMax } = getZoomState();
        if (zoomInButton) zoomInButton.disabled = atMin;
        if (zoomOutButton) zoomOutButton.disabled = atMax;
    };

    zoomInButton?.addEventListener('click', () => {
        zoomIn();
        updateZoomButtons();
    });

    zoomOutButton?.addEventListener('click', () => {
        zoomOut();
        updateZoomButtons();
    });

    if (orbitControls) {
        orbitControls.addEventListener('change', updateZoomButtons);
    }

    updateZoomButtons();

    textureButton?.addEventListener('click', () => {
        openTextureModal();
    });

    modalClose?.addEventListener('click', closeTextureModal);
    modalBackdrop?.addEventListener('click', closeTextureModal);

    colorButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const color = button.dataset.color;
            if (sunLight && color) {
                sunLight.color.set(color);
            }
        });
    });

    modelButtons.forEach((button) => {
        button.addEventListener('click', () => showModel(button.dataset.model, updateInfo));
    });
}
