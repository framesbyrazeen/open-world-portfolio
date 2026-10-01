import * as THREE from 'three/webgpu'

// The licensed social-area asset combines all ten plinths in one mesh.
// Keep its visual triangles and separate fixed colliders in sync.
export function removeUnusedSocialDisplays(social) {
    if(!social) return
    const unused = social.children.filter(node => /^(x|discord|youtube|twitch|bluesky|refStatue)Physical/i.test(node.name))
    if(!unused.length) return

    // GLTFLoader strips periods from Blender object names.
    const plinths = social.children.find(node => /^Cube\.?133$/.test(node.name))
    const fixed = social.children.find(node => /^physicalFixed\.?002$/.test(node.name))
    if(!plinths?.isMesh || !fixed) throw new Error('Social display bases could not be found')

    social.updateWorldMatrix(true, true)
    const anchors = fixed.children.map(node => ({ node, position: node.getWorldPosition(new THREE.Vector3()) }))
    const nearest = point => anchors.reduce((closest, anchor) => {
        const distance = (anchor.position.x - point.x) ** 2 + (anchor.position.z - point.z) ** 2
        return !closest || distance < closest.distance ? { anchor, distance } : closest
    }, null).anchor
    const removed = new Set(unused.map(node => nearest(node.getWorldPosition(new THREE.Vector3()))))

    // Retain the small decorative figures on the ground when the central
    // statue's now-unused pedestal is removed.
    const centralBase = [...removed].find(anchor => /^hull/.test(anchor.node.name))
    if(centralBase?.node.isMesh) {
        const bounds = new THREE.Box3().setFromObject(centralBase.node)
        const height = bounds.max.y - fixed.getWorldPosition(new THREE.Vector3()).y
        for(const figure of social.children.filter(node => /^(baguira|sudo|boy)Physical/i.test(node.name)))
            figure.position.y -= height
    }

    // Each disconnected base lies closest to its own collider. Classifying
    // complete triangles preserves the other bases' bevels, UVs and normals.
    const geometry = plinths.geometry.clone()
    const positions = geometry.attributes.position
    const indices = geometry.index
    const retained = []
    const triangle = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
    const center = new THREE.Vector3()
    const count = indices ? indices.count : positions.count
    for(let i = 0; i < count; i += 3) {
        const vertices = [0, 1, 2].map(offset => indices ? indices.getX(i + offset) : i + offset)
        center.set(0, 0, 0)
        vertices.forEach((vertex, index) => center.add(triangle[index].fromBufferAttribute(positions, vertex)))
        center.multiplyScalar(1 / 3).applyMatrix4(plinths.matrixWorld)
        if(!removed.has(nearest(center))) retained.push(...vertices)
    }
    geometry.setIndex(retained)
    plinths.geometry = geometry
    for(const anchor of removed) anchor.node.removeFromParent()
    for(const node of unused) node.removeFromParent()
}
