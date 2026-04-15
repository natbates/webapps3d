import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { initScene, resize, animate } from './scene.js';
import { productKeys, modelDefs, loadTextureDefinitions, defaultModelScale } from './resources.js';
import { showModel, setWireframe, controls } from './model-loader.js';
import { loadTextureSet } from './texture-loader.js';
import { buildTextureGrid, buildTextureOptions, buildTextureDotList, updateTexturePreview, openTextureModal, closeTextureModal, setupUI } from './ui.js';

const container = document.getElementById('viewer');
const hasViewer = Boolean(container);
const path = window.location.pathname;
const filename = path.split('/').pop();
const isProductListing = filename === 'products.html';
const isProductDetail = filename.startsWith('product-') || filename === 'product.html';
const bodyProduct = document.body.dataset.product;
const queryProduct = new URLSearchParams(window.location.search).get('product');
const selectedProduct = productKeys.includes(bodyProduct)
    ? bodyProduct
    : productKeys.includes(queryProduct)
        ? queryProduct
        : 'table';

const productCards = document.querySelectorAll('.product-card');
const productModal = document.getElementById('productModal');
const productModalClose = document.getElementById('productModalClose');
const productModalBackdrop = document.getElementById('productModalBackdrop');
const productModalTitle = document.getElementById('productModalTitle');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-content');

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

function openProductModal(key) {
    const def = modelDefs[key];
    if (def && productModalTitle) {
        productModalTitle.textContent = def.name;
    }
    showModel(key);
    if (productModal) {
        productModal.classList.add('open');
        productModal.setAttribute('aria-hidden', 'false');
    }
    resize();
}

function closeProductModal() {
    if (!productModal) return;
    productModal.classList.remove('open');
    productModal.setAttribute('aria-hidden', 'true');
}

window.addEventListener('resize', resize);

async function init() {
    await loadTextureDefinitions();
    buildTextureGrid();
    buildTextureOptions();
    buildTextureDotList();
    updateTexturePreview('oak');
    initProductPreviews();
    setupUI();
    setupTabs();

    if (hasViewer) {
        initScene(container);
        const activeProduct = isProductDetail ? selectedProduct : 'table';

        if (isProductDetail && modelDefs[activeProduct]) {
            document.title = `${modelDefs[activeProduct].name} · Generic Furniture Company`;
        }

        showModel(activeProduct);
        resize();
        animate();
    } else {
        if (!isProductListing) {
            productCards.forEach((button) => {
                button.addEventListener('click', () => openProductModal(button.dataset.product));
            });
        }
    }
}

init();

function initProductPreviews() {
    const previewElements = document.querySelectorAll('.product-preview');
    if (!previewElements.length) return;
    const oakTextures = loadTextureSet('oak');
    const loader = new GLTFLoader();

    previewElements.forEach((element) => {
        const key = element.dataset.product;
        const modelDef = modelDefs[key];
        if (!modelDef) return;

        const width = element.clientWidth || 320;
        const height = 220;
        const previewScene = new THREE.Scene();
        previewScene.background = new THREE.Color(0xffffff);

        const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
        camera.position.set(6.5, 3.0, 8.2);
        camera.lookAt(0, 0.75, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputEncoding = THREE.sRGBEncoding;
        element.appendChild(renderer.domElement);

        const hemi = new THREE.HemisphereLight(0xffffff, 0x8088a3, 0.75);
        previewScene.add(hemi);
        const dir = new THREE.DirectionalLight(0xffffff, 1.1);
        dir.position.set(5, 6, 3);
        previewScene.add(dir);
        const fill = new THREE.PointLight(0xffffff, 0.35, 10);
        fill.position.set(-3, 1.8, -2.8);
        previewScene.add(fill);

        loader.load(modelDef.file, (gltf) => {
            const model = gltf.scene;
            model.name = modelDef.name;
            model.scale.setScalar((modelDef.scale || 1) * defaultModelScale);
            const bbox = new THREE.Box3().setFromObject(model);
            const center = bbox.getCenter(new THREE.Vector3());
            model.position.sub(center);
            model.position.y -= bbox.min.y * model.scale.x;
            model.updateMatrixWorld(true);

            const size = bbox.getSize(new THREE.Vector3()).multiplyScalar(model.scale.x);
            const maxSize = Math.max(size.x, size.y, size.z);
            const distance = maxSize * 2.5;
            camera.position.set(distance * 1.1, distance * 0.9, distance * 1.4);
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();

            model.traverse((child) => {
                if (child.isMesh && child.material.isMeshStandardMaterial) {
                    child.material.map = oakTextures.map;
                    child.material.normalMap = oakTextures.normalMap;
                    child.material.roughnessMap = oakTextures.roughnessMap;
                    child.material.metalnessMap = oakTextures.metalnessMap;
                    child.material.aoMap = oakTextures.aoMap;
                    child.material.displacementMap = oakTextures.displacementMap;
                    child.material.displacementScale = 0.05;
                    child.material.envMapIntensity = 0.8;
                    child.material.needsUpdate = true;
                }
            });
            previewScene.add(model);

            const clock = new THREE.Clock();
            function animatePreview() {
                requestAnimationFrame(animatePreview);
                const delta = clock.getDelta();
                model.rotation.y += delta * 0.4;
                renderer.render(previewScene, camera);
            }
            animatePreview();
        });
    });
}

productModalClose?.addEventListener('click', closeProductModal);
productModalBackdrop?.addEventListener('click', closeProductModal);
