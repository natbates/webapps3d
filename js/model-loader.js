import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { scene, camera, fitCameraToObject } from './scene.js';
import { modelDefs, defaultModelScale } from './resources.js';
import { applyTextureSetToModel } from './texture-loader.js';

const modelButtons = document.querySelectorAll('[data-model]');
const loader = new GLTFLoader();
const modelGroup = new THREE.Group();
scene.add(modelGroup);

export const loadedModels = {};
export const controls = {
    currentModel: 'table',
    wireframe: false,
    animationActive: false,
};

export function makePlaceholderModel(key) {
    let geometry;
    const material = new THREE.MeshStandardMaterial({ color: 0x7d7d7d, roughness: 0.45, metalness: 0.15 });

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

export function showModel(key, onUpdate) {
    modelGroup.clear();
    controls.currentModel = key;
    updateButtonState(key);

    const def = modelDefs[key];
    if (!def) return;

    if (loadedModels[key]) {
        modelGroup.add(loadedModels[key]);
        applyTextureSetToModel(loadedModels[key], currentTextureKey);
        onUpdate?.(loadedModels[key]);
        return;
    }

    const placeholder = makePlaceholderModel(key);
    placeholder.rotation.set(0, 0, 0);
    placeholder.position.set(0, 0, 0);
    modelGroup.add(placeholder);
    onUpdate?.(placeholder);
    loadModel(key, onUpdate);
}

export function loadModel(key, onUpdate) {
    const def = modelDefs[key];
    if (!def) return;

    loader.load(
        def.file,
        (gltf) => {
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
                setWireframe(controls.wireframe);
                onUpdate?.(model);
            }
        },
        undefined,
        (error) => {
            console.error('Failed to load', def.file, error);
        }
    );
}

export function setWireframe(enabled) {
    scene.traverse((child) => {
        if (!child.isMesh) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
            if (material) {
                material.wireframe = enabled;
                material.needsUpdate = true;
            }
        });
    });
    controls.wireframe = enabled;
}

export function updateButtonState(key) {
    modelButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.model === key);
    });
}

let currentTextureKey = 'oak';
export function setCurrentTextureKey(key) {
    currentTextureKey = key;
}
export function getCurrentTextureKey() {
    return currentTextureKey;
}
