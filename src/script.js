import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import PerlinNoise3D from 'perlin-noise-3d'
import { MeshBasicMaterial } from 'three'
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

//initialize noise function
const noise = new PerlinNoise3D()

//load texture
const image = new Image()
const texture = new THREE.Texture(image)
image.addEventListener('load', () => {
    texture.needsUpdate = true
})
image.src = '/textures/intro-setup.png'

//load env map
const hdrEquirect = new RGBELoader().load(
  '/textures/empty_warehouse_01_1k.hdr',  
  () => { 
    hdrEquirect.mapping = THREE.EquirectangularReflectionMapping; 
  }
);

//Materials
const normalMaterial = new THREE.MeshNormalMaterial()
const basicMaterial = new MeshBasicMaterial({ map: texture })
const glassMaterial = new THREE.MeshPhysicalMaterial({
    roughness: 0,
    transmission: 1,
    thickness: 0.7,
    envMap: hdrEquirect
})

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

//light
const light = new THREE.DirectionalLight('red', 2);
light.position.set(0, 5, 10);
// scene.add(light);

//plane

const planeGeometry = new THREE.PlaneGeometry(9,6)
const plane = new THREE.Mesh(planeGeometry, basicMaterial)
plane.position.set(-1,0,-1.5)
scene.add(plane)

//Sphere
const sphereGeometry = new THREE.SphereGeometry(1,128,128)
sphereGeometry.setAttribute('basePosition', new THREE.BufferAttribute().copy(sphereGeometry.attributes.position));

const sphere = new THREE.Mesh(sphereGeometry, glassMaterial)
// sphere.position.set(0,0,0)
scene.add(sphere)

const verticesCount = sphereGeometry.attributes.position.count;

const updateSphere = (elapsedTime) => {
    const basePosition = sphere.geometry.getAttribute('basePosition')
    const position = sphere.geometry.getAttribute('position')

    const vertex = new THREE.Vector3()

    const k = 0.35

    for (let i = 0; i < verticesCount; i++) {
        vertex.fromBufferAttribute(basePosition, i)

        let perlin = noise.get(
            vertex.x * k + elapsedTime * 0.15,
            vertex.y * k + 1,
            vertex.z * k
        )
        vertex.normalize().multiplyScalar( 2.3 * perlin )
        position.setXYZ(i, vertex.x, vertex.y, vertex.z)

    }

    sphere.geometry.attributes.position.needsUpdate = true
    sphere.geometry.computeBoundingSphere()
    sphere.geometry.update
}

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
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    updateSphere(elapsedTime)

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()