export const assetRoot = window.location.pathname.includes('/pages/') ? '../assets/resources' : 'assets/resources';
export const productKeys = ['table', 'chair', 'bench'];

export const textureDefinitions = {};

const textureJsonUrl = `${assetRoot}/textures.json`;

function makeAssetPath(folder, filename) {
    return `${assetRoot}/textures/${folder}/${filename}`;
}

export async function loadTextureDefinitions() {
    try {
        const response = await fetch(textureJsonUrl);
        if (!response.ok) {
            throw new Error(`Failed to load texture manifest: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!Array.isArray(data.textures)) {
            throw new Error('textures.json must contain a top-level "textures" array.');
        }

        data.textures.forEach((item) => {
            const folder = item.folder || item.key;
            textureDefinitions[item.key] = {
                key: item.key,
                name: item.name || item.key,
                preview: makeAssetPath(folder, item.preview || item.base),
                base: item.base ? makeAssetPath(folder, item.base) : null,
                normal: item.normal ? makeAssetPath(folder, item.normal) : null,
                roughness: item.roughness ? makeAssetPath(folder, item.roughness) : null,
                metalness: item.metalness ? makeAssetPath(folder, item.metalness) : null,
                ao: item.ao ? makeAssetPath(folder, item.ao) : null,
                displacement: item.displacement ? makeAssetPath(folder, item.displacement) : null,
            };
        });
    } catch (error) {
        console.error(error);
    }
}

export const modelDefs = {
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

export const defaultModelScale = 0.5;
