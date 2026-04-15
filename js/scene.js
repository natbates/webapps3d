import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

export const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(4.5, 2.2, 6.0);
camera.lookAt(0, 0.7, 0);

export let renderer = null;
export let orbitControls = null;
export let sunLight = null;
export let hasViewer = false;

export function initScene(container) {
    hasViewer = Boolean(container);
    if (!hasViewer) {
        return;
    }

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const envCanvas = document.createElement('canvas');
    envCanvas.width = 512;
    envCanvas.height = 256;
    const envCtx = envCanvas.getContext('2d');
    const envGradient = envCtx.createLinearGradient(0, 0, 0, 256);
    envGradient.addColorStop(0, '#fdf7f0');
    envGradient.addColorStop(0.5, '#dde3ed');
    envGradient.addColorStop(1, '#8a94a8');
    envCtx.fillStyle = envGradient;
    envCtx.fillRect(0, 0, 512, 256);
    const envTexture = new THREE.CanvasTexture(envCanvas);
    envTexture.mapping = THREE.EquirectangularReflectionMapping;
    envTexture.encoding = THREE.sRGBEncoding;
    scene.environment = envTexture;

    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.09;
    orbitControls.screenSpacePanning = false;
    orbitControls.enablePan = false;
    orbitControls.rotateSpeed = 0.9;
    orbitControls.enableZoom = false;
    orbitControls.minDistance = 1.2;
    orbitControls.maxDistance = 25;
    orbitControls.autoRotate = true;
    orbitControls.autoRotateSpeed = 0.7;
    orbitControls.target.set(0, 0.6, 0);
    orbitControls.update();

    const wheelZoomScale = 0.00035;
    const viewerElement = renderer.domElement;
    viewerElement.addEventListener('wheel', (event) => {
        event.preventDefault();
        if (!orbitControls) return;
        const delta = event.deltaY * wheelZoomScale;
        if (delta === 0) return;
        const factor = delta > 0 ? 1 + delta : 1 / (1 - delta);
        adjustZoom(factor);
    }, { passive: false });

    const hemiLight = new THREE.HemisphereLight(0xffe7ff, 0x202030, 0.35);
    scene.add(hemiLight);

    sunLight = new THREE.DirectionalLight(0xfff2d0, 1.3);
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

export function fitCameraToObject(object, offset = 1.4) {
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

export function resize() {
    if (!renderer) {
        return;
    }

    const width = document.getElementById('viewer')?.clientWidth || Math.min(window.innerWidth * 0.9, 800);
    const height = document.getElementById('viewer')?.clientHeight || Math.min(window.innerHeight * 0.7, 560);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

export function animate() {
    if (!renderer) {
        return;
    }

    requestAnimationFrame(animate);
    orbitControls.update();
    renderer.render(scene, camera);
}

function adjustZoom(factor) {
    if (!orbitControls) return;
    const direction = new THREE.Vector3();
    direction.subVectors(camera.position, orbitControls.target).normalize();
    let distance = camera.position.distanceTo(orbitControls.target) * factor;
    distance = Math.max(orbitControls.minDistance, Math.min(orbitControls.maxDistance, distance));
    camera.position.copy(orbitControls.target).add(direction.multiplyScalar(distance));
    camera.updateProjectionMatrix();
    orbitControls.update();
}

export function zoomIn() {
    adjustZoom(0.92);
}

export function zoomOut() {
    adjustZoom(1.08);
}

export function getZoomState() {
    if (!orbitControls) {
        return { atMin: false, atMax: false };
    }

    const distance = camera.position.distanceTo(orbitControls.target);
    return {
        atMin: distance <= orbitControls.minDistance + 0.005,
        atMax: distance >= orbitControls.maxDistance - 0.005,
    };
}
