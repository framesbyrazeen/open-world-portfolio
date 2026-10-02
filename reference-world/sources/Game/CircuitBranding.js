import * as THREE from 'three/webgpu'

// These material names also identify the circuit's animated banners and podium.
// Keep the names and UV layout while replacing the original technology branding.
const designs = {
    circuitWebgl: { width: 512, height: 256, text: 'JAVA', size: 94, ink: '#ff947d' },
    circuitWebgpu: { width: 256, height: 256, text: 'PYTHON', size: 45, ink: '#9cdee3' },
    circuitThreejs: { width: 256, height: 256, text: '</>', size: 104, ink: '#fff0ec' },
    circuitBrand: { width: 1024, height: 256, text: 'VIBE CODING', size: 98, ink: '#fff0ec', stripes: true },
}

function createTexture(design, original) {
    const canvas = document.createElement('canvas')
    canvas.width = design.width
    canvas.height = design.height
    const context = canvas.getContext('2d')
    context.fillStyle = '#484236'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = design.ink
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = `italic 900 ${design.size}px Arial, sans-serif`
    context.fillText(design.text, canvas.width / 2, canvas.height / 2 + 3, canvas.width * 0.8)

    if(design.stripes) {
        context.fillStyle = '#cd7fc2'
        for(const x of [38, 80, canvas.width - 98, canvas.width - 56]) {
            context.beginPath()
            context.moveTo(x, 38)
            context.lineTo(x + 22, 38)
            context.lineTo(x - 22, canvas.height - 38)
            context.lineTo(x - 44, canvas.height - 38)
            context.closePath()
            context.fill()
        }
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.flipY = original.flipY
    texture.wrapS = original.wrapS
    texture.wrapT = original.wrapT
    texture.offset.copy(original.offset)
    texture.repeat.copy(original.repeat)
    texture.center.copy(original.center)
    texture.rotation = original.rotation
    texture.channel = original.channel
    return texture
}

export function personalizeCircuitBranding(scene) {
    const materials = new Set()
    scene.traverse(node => {
        if(!node.isMesh) return
        for(const material of Array.isArray(node.material) ? node.material : [node.material]) {
            if(designs[material.name] && material.map) materials.add(material)
        }
    })

    const textures = new Map()
    for(const material of materials) {
        if(!textures.has(material.name)) {
            textures.set(material.name, createTexture(designs[material.name], material.map))
        }
        material.map = textures.get(material.name)
        material.needsUpdate = true
    }
}
