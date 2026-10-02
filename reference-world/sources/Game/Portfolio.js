import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import fontData from '../data/helvetiker-bold.json'
import { MeshDefaultMaterial } from './Materials/MeshDefaultMaterial.js'
import { removeUnusedSocialDisplays } from './SocialDisplays.js'
import { personalizeCircuitBranding } from './CircuitBranding.js'

// Adapt licensed scenery before the engine generates the matching rigid bodies.
export function personalizeResources(game) {
    personalizeCircuitBranding(game.resources.areasModel.scene)
    const font = new FontLoader().parse(fontData)
    const material = new MeshDefaultMaterial({ colorNode: color('#fff0ec') })
    material.userData.prevent = true
    const replaceSculpture = (mesh, text, size = 1.7, ground = true) => {
        const geometry = new TextGeometry(text, { font, size, depth: 0.4, curveSegments: 5, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.025, bevelSegments: 2 })
        geometry.computeBoundingBox()
        const dimensions = geometry.boundingBox.getSize(new THREE.Vector3())
        geometry.center()
        mesh.geometry = geometry
        mesh.material = material
        mesh.clear()
        const collider = new THREE.Object3D()
        collider.name = 'cuboid'
        collider.scale.copy(dimensions)
        mesh.add(collider)
        mesh.scale.setScalar(1)
        if(ground) mesh.position.y = -mesh.parent.position.y + dimensions.y * 0.5 + 0.05
    }
    const letters = []
    game.resources.areasModel.scene.traverse(node => {
        if(/^refLettersPhysicalDynamic/i.test(node.name)) letters.push(node)
        if(/^refDistinctions|^refYear/i.test(node.name)) node.userData.preventFrustum = true
    })
    letters.sort((a, b) => a.position.x - b.position.x)
    if(letters.length >= 6) {
        const from = letters[0].position.clone()
        const to = letters.at(-1).position.clone()
        for(let i = 0; i < letters.length; i++) {
            if(i >= 6) { letters[i].removeFromParent(); continue }
            letters[i].position.lerpVectors(from, to, i / 5)
            replaceSculpture(letters[i], 'RAZEEN'[i])
        }
    }
    const social = game.resources.areasModel.scene.getObjectByName('social')
    removeUnusedSocialDisplays(social)
    const oldLogo = social?.children.find(node => /^onlyfansPhysical/i.test(node.name))
    if(oldLogo) {
        const roundedSquare = (size, radius) => {
            const s = size / 2
            const shape = new THREE.Shape()
            shape.moveTo(-s + radius, -s)
            shape.lineTo(s - radius, -s)
            shape.quadraticCurveTo(s, -s, s, -s + radius)
            shape.lineTo(s, s - radius)
            shape.quadraticCurveTo(s, s, s - radius, s)
            shape.lineTo(-s + radius, s)
            shape.quadraticCurveTo(-s, s, -s, s - radius)
            shape.lineTo(-s, -s + radius)
            shape.quadraticCurveTo(-s, -s, -s + radius, -s)
            return shape
        }
        // Match the adjacent social logos: a small, carved silhouette in the
        // same stone palette, with flat faces and lightly chamfered edges.
        oldLogo.geometry.computeBoundingBox()
        const plinthTop = oldLogo.position.y + oldLogo.geometry.boundingBox.min.y
        const outline = roundedSquare(1.6, 0.39)
        outline.holes.push(new THREE.Path(roundedSquare(1.22, 0.23).getPoints(8)))
        const lens = new THREE.Shape()
        lens.absarc(0, 0, 0.4, 0, Math.PI * 2, false)
        const aperture = new THREE.Path()
        aperture.absarc(0, 0, 0.25, 0, Math.PI * 2, true)
        lens.holes.push(aperture)
        const dot = new THREE.Shape()
        dot.absarc(0.43, 0.43, 0.1, 0, Math.PI * 2, false)
        const pieces = [outline, lens, dot].map(shape => {
            const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 1, steps: 1, curveSegments: 8 })
            geometry.translate(0, 0, -0.12)
            // The neighboring LinkedIn and GitHub carvings use this palette swatch.
            const uv = geometry.attributes.uv
            for(let i = 0; i < uv.count; i++) uv.setXY(i, 0.421, 0.5)
            return geometry
        })
        oldLogo.geometry = mergeGeometries(pieces)
        for(const piece of pieces) piece.dispose()
        oldLogo.geometry.computeBoundingBox()
        oldLogo.position.y = plinthTop - oldLogo.geometry.boundingBox.min.y
        oldLogo.clear()
        oldLogo.name = 'instagramPhysicalDynamic'
        const collider = new THREE.Object3D()
        collider.name = 'cuboid'
        oldLogo.geometry.boundingBox.getSize(collider.scale)
        oldLogo.add(collider)
    }

    const label = (lines, foreground = '#ffffff', background = '#000000') => {
        const canvas = document.createElement('canvas')
        canvas.width = 1024
        canvas.height = 256
        const context = canvas.getContext('2d')
        context.fillStyle = background
        context.fillRect(0, 0, 1024, 256)
        context.fillStyle = foreground
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        lines.forEach((line, index) => {
            context.font = `${index === 0 ? 700 : 400} ${index === 0 ? 70 : 40}px Nunito, sans-serif`
            context.fillText(line, 512, lines.length === 1 ? 128 : 95 + index * 90, 980)
        })
        const texture = new THREE.CanvasTexture(canvas)
        texture.flipY = false
        texture.colorSpace = THREE.SRGBColorSpace
        return texture
    }
    const learning = {
        careerFreelancer: ['AI-assisted coding', 'Prototype · test · improve'],
        careerHetic: ['B.E. Computer Science', 'Anna University · expected 2027'],
        careerImmersiveGarden: ['PCB design · Tathva 24', 'NIT Calicut · EasyEDA workshop'],
        careerIRLTeacher: ['Cybersecurity workshop', 'College of Engineering Vadakara'],
        careerOnlineTeacher: ['Programming in Java', 'NPTEL · Elite + Silver'],
        careerUzik: ['Photography + editing', 'CapCut · InShot · VN · Alight Motion'],
    }
    for(const [key, lines] of Object.entries(learning)) {
        game.resources[key + 'Texture']?.dispose()
        game.resources[key + 'Texture'] = label(lines)
    }
    for(const key of ['timeMachineScreenFolioTexture', 'timeMachineScreenMGSTexture']) {
        game.resources[key]?.dispose()
        game.resources[key] = label(['RAZEEN / OPEN WORLD', 'I like to vibe code.'], '#fff3cf', '#263546')
    }
}

export function setupPortfolio(game) {
    // Keyboard accessible ways to tour the resume without hunting for a 3D hotspot.
    const home = document.querySelector('.home-content .content-inner')
    const destinations = document.createElement('div')
    destinations.className = 'portfolio-destinations'
    for(const [name, area] of [['Visit workshops', 'projects'], ['Learning lab', 'lab'], ['My learning path', 'career'], ['Get in touch', 'social']]) {
        const button = document.createElement('button')
        button.textContent = name
        button.addEventListener('click', () => { game.menu.close(); game.player.respawn(area) })
        destinations.append(button)
    }
    home.append(destinations)
    const select = document.createElement('select')
    select.setAttribute('aria-label', 'Atmosphere')
    for(const [value, text] of [['0.12','Golden afternoon'], ['0.25','Sunset'], ['0.5','Lantern night']]) {
        const option = document.createElement('option')
        option.value = value
        option.textContent = text
        select.append(option)
    }
    select.addEventListener('change', () => game.dayCycles.override.start({ progress: Number(select.value) }, 2))
    destinations.append(select)
    document.body.classList.add('portfolio-ready')
}
