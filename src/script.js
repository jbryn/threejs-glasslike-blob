import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import noiseShader from './shaders/simplexNoise3d.glsl?raw'
import blobShader from './shaders/blob.glsl?raw'

// Resolve assets against the base URL so the build works from a sub-path
const texturesPath = `${import.meta.env.BASE_URL}textures/`

//load texture
const texture = new THREE.TextureLoader().load(`${texturesPath}intro-setup.png`)
texture.colorSpace = THREE.SRGBColorSpace

//Materials
const basicMaterial = new THREE.MeshBasicMaterial({ map: texture })
const glassMaterial = new THREE.MeshPhysicalMaterial({
    roughness: 0,
    transmission: 1,
    thickness: 0.7
})

//deform the sphere in the vertex shader, on top of the built-in physical material
const blobUniforms = {
    uTime: { value: 0 },
    uRadius: { value: 1.15 },
    uStrength: { value: 0.35 },
    uFrequency: { value: 0.55 },
    uSpeed: { value: 0.15 }
}

glassMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, blobUniforms)

    shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${noiseShader}\n${blobShader}`)
        .replace('#include <beginnormal_vertex>', `
            vec3 blobPosition;
            vec3 objectNormal;
            blob(normalize(position), blobPosition, objectNormal);
        `)
        .replace('#include <begin_vertex>', 'vec3 transformed = blobPosition;')
}

//load env map (assigned once loaded, the shader can't compile against an empty texture)
new HDRLoader().load(`${texturesPath}empty_warehouse_01_1k.hdr`, (hdrEquirect) => {
    hdrEquirect.mapping = THREE.EquirectangularReflectionMapping
    glassMaterial.envMap = hdrEquirect
})

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

//plane
const planeGeometry = new THREE.PlaneGeometry(9,6)
const plane = new THREE.Mesh(planeGeometry, basicMaterial)
plane.position.set(-1,0,-1.5)
scene.add(plane)

//Sphere
const sphereGeometry = new THREE.IcosahedronGeometry(1, 64)
const sphere = new THREE.Mesh(sphereGeometry, glassMaterial)
// the shader moves vertices outside the geometry's bounding sphere
sphere.frustumCulled = false
scene.add(sphere)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(1,1,4)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const timer = new THREE.Timer()
timer.connect(document)

const tick = (timestamp) =>
{
    timer.update(timestamp)
    const elapsedTime = timer.getElapsed()

    blobUniforms.uTime.value = elapsedTime

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()