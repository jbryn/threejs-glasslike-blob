import * as THREE from 'three'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import noiseShader from './shaders/simplexNoise3d.glsl?raw'
import blobShader from './shaders/blob.glsl?raw'
import environmentUrl from './assets/empty_warehouse_01_1k.hdr?url'

const CAMERA_FOV = 40
const CAMERA_DISTANCE = 5
const BACKDROP_Z = -2
const MAX_PIXEL_RATIO = 2

export const DEFAULTS = {
    strength: 0.35,
    frequency: 0.55,
    speed: 0.15,
    seed: 0,
    size: 1,
    roughness: 0,
    thickness: 0.7,
    dispersion: 0,
    color: '#ffffff'
}

// The environment map is shared by every <glass-blob> on the page
let environmentPromise
const loadEnvironment = () => {
    environmentPromise ??= new HDRLoader().loadAsync(environmentUrl).then((texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping
        return texture
    })
    return environmentPromise
}

const template = document.createElement('template')
template.innerHTML = `
    <style>
        :host { display: block; position: relative; width: 100%; height: 400px; overflow: hidden; }
        canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    </style>
`

export class GlassBlob extends HTMLElement {
    static observedAttributes = ['image', ...Object.keys(DEFAULTS)]

    #renderer = null
    #scene
    #camera
    #blob
    #backdrop
    #uniforms
    #timer
    #resizeObserver
    #intersectionObserver
    #reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    #speed = DEFAULTS.speed
    #pointer = new THREE.Vector2()
    #imageRequest = 0

    constructor() {
        super()
        this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true))
    }

    connectedCallback() {
        this.#renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.shadowRoot.append(this.#renderer.domElement)

        this.#scene = new THREE.Scene()
        this.#camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100)
        this.#timer = new THREE.Timer()
        this.#timer.connect(document)

        this.#createBlob()
        this.#createBackdrop()
        for (const name of GlassBlob.observedAttributes) this.#apply(name)

        this.#resizeObserver = new ResizeObserver(() => this.#resize())
        this.#resizeObserver.observe(this)

        // Only animate while the element is on screen
        this.#intersectionObserver = new IntersectionObserver(([entry]) => {
            this.#renderer.setAnimationLoop(entry.isIntersecting ? this.#tick : null)
        })
        this.#intersectionObserver.observe(this)

        this.addEventListener('pointermove', this.#onPointerMove)
        this.addEventListener('pointerleave', this.#onPointerLeave)

        this.#resize()
        this.#renderer.setAnimationLoop(this.#tick)
    }

    disconnectedCallback() {
        this.removeEventListener('pointermove', this.#onPointerMove)
        this.removeEventListener('pointerleave', this.#onPointerLeave)
        this.#resizeObserver.disconnect()
        this.#intersectionObserver.disconnect()
        this.#timer.dispose()
        this.#imageRequest++

        this.#blob.geometry.dispose()
        this.#blob.material.dispose()
        this.#backdrop.geometry.dispose()
        this.#backdrop.material.map?.dispose()
        this.#backdrop.material.dispose()

        this.#renderer.setAnimationLoop(null)
        this.#renderer.dispose()
        this.#renderer.forceContextLoss()
        this.#renderer.domElement.remove()
        this.#renderer = null
    }

    attributeChangedCallback(name) {
        if (this.#renderer) this.#apply(name)
    }

    /**
     * Snapshot of the current frame, e.g. to save the blob as a PNG.
     */
    toBlob(type = 'image/png', quality) {
        this.#renderer.render(this.#scene, this.#camera)
        return new Promise((resolve) => this.#renderer.domElement.toBlob(resolve, type, quality))
    }

    #createBlob() {
        const material = new THREE.MeshPhysicalMaterial({ transmission: 1 })

        this.#uniforms = {
            uPhase: { value: 0 },
            uSeed: { value: 0 },
            uStrength: { value: 0 },
            uFrequency: { value: 0 },
            uBackdrop: { value: 0 }
        }

        // Deform the sphere in the vertex shader, on top of the built-in physical material
        material.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, this.#uniforms)

            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', `#include <common>\n${noiseShader}\n${blobShader}`)
                .replace('#include <beginnormal_vertex>', `
                    vec3 blobPosition;
                    vec3 objectNormal;
                    blob(normalize(position), blobPosition, objectNormal);
                `)
                .replace('#include <begin_vertex>', 'vec3 transformed = blobPosition;')

            // Without a backdrop there is nothing to refract and the canvas is transparent:
            // output the reflections over a tinted veil that thickens towards the rim.
            // Written after the colour space conversion, as premultiplied display values.
            shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', '#include <common>\nuniform float uBackdrop;')
                .replace('#include <colorspace_fragment>', `
                    #include <colorspace_fragment>
                    if (uBackdrop < 0.5) {
                        vec3 reflection = totalSpecular / (1.0 + totalSpecular);
                        vec3 tint = linearToOutputTexel(vec4(diffuseColor.rgb, 1.0)).rgb;
                        float rim = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0);
                        float veil = saturate(0.06 + 0.5 * roughnessFactor + 0.5 * rim);
                        gl_FragColor = vec4(reflection + tint * veil, saturate(veil + luminance(reflection)));
                    }
                `)
        }

        // Assigned once loaded, the shader can't compile against an empty texture
        loadEnvironment().then((environment) => {
            material.envMap = environment
        })

        this.#blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 64), material)
        // The shader moves vertices outside the geometry's bounding sphere
        this.#blob.frustumCulled = false
        this.#scene.add(this.#blob)
    }

    #createBackdrop() {
        this.#backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial())
        this.#backdrop.position.z = BACKDROP_Z
        this.#backdrop.visible = false
        this.#scene.add(this.#backdrop)
    }

    #number(name) {
        const value = parseFloat(this.getAttribute(name))
        return Number.isFinite(value) ? value : DEFAULTS[name]
    }

    #apply(name) {
        const material = this.#blob.material

        switch (name) {
            case 'image':
                this.#loadImage(this.getAttribute('image'))
                break
            case 'color':
                material.color.set(this.getAttribute('color') || DEFAULTS.color)
                break
            case 'strength':
                this.#uniforms.uStrength.value = this.#number(name)
                break
            case 'frequency':
                this.#uniforms.uFrequency.value = this.#number(name)
                break
            case 'seed':
                this.#uniforms.uSeed.value = this.#number(name)
                break
            case 'speed':
                this.#speed = this.#number(name)
                break
            case 'size':
                this.#blob.scale.setScalar(this.#number(name))
                break
            default:
                // roughness, thickness, dispersion
                material[name] = this.#number(name)
        }
    }

    #loadImage(url) {
        const request = ++this.#imageRequest
        const material = this.#backdrop.material

        if (!url) {
            this.#setBackdropVisible(false)
            return
        }

        new THREE.TextureLoader().load(
            url,
            (texture) => {
                if (request !== this.#imageRequest) return texture.dispose()

                texture.colorSpace = THREE.SRGBColorSpace
                material.map?.dispose()
                material.map = texture
                material.needsUpdate = true
                this.#setBackdropVisible(true)
                this.#fitBackdrop()
                this.dispatchEvent(new CustomEvent('imageload'))
            },
            undefined,
            () => {
                if (request !== this.#imageRequest) return

                this.#setBackdropVisible(false)
                this.dispatchEvent(new CustomEvent('imageerror'))
            }
        )
    }

    #setBackdropVisible(visible) {
        this.#backdrop.visible = visible
        this.#uniforms.uBackdrop.value = visible ? 1 : 0
    }

    #resize() {
        const width = this.clientWidth
        const height = this.clientHeight
        if (!width || !height) return

        this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO))
        this.#renderer.setSize(width, height, false)

        // Pull the camera back on narrow elements so the blob always fits
        this.#camera.aspect = width / height
        this.#camera.position.z = CAMERA_DISTANCE / Math.min(1, this.#camera.aspect)
        this.#camera.updateProjectionMatrix()

        this.#fitBackdrop()
    }

    // Size the backdrop to fill the view and crop its image like `object-fit: cover`
    #fitBackdrop() {
        const distance = this.#camera.position.z - BACKDROP_Z
        const height = 2 * distance * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2))
        const width = height * this.#camera.aspect
        this.#backdrop.scale.set(width, height, 1)

        const texture = this.#backdrop.material.map
        if (!texture) return

        const imageAspect = texture.image.width / texture.image.height
        const viewAspect = this.#camera.aspect
        if (imageAspect > viewAspect) texture.repeat.set(viewAspect / imageAspect, 1)
        else texture.repeat.set(1, imageAspect / viewAspect)
        texture.offset.set((1 - texture.repeat.x) / 2, (1 - texture.repeat.y) / 2)
    }

    #onPointerMove = (event) => {
        const bounds = this.getBoundingClientRect()
        this.#pointer.set(
            ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
            ((event.clientY - bounds.top) / bounds.height) * 2 - 1
        )
    }

    #onPointerLeave = () => {
        this.#pointer.set(0, 0)
    }

    #tick = (time) => {
        this.#timer.update(time)
        const delta = Math.min(this.#timer.getDelta(), 0.1)

        if (!this.#reducedMotion.matches) this.#uniforms.uPhase.value += delta * this.#speed

        // Lean towards the pointer
        const rotation = this.#blob.rotation
        const damping = 1 - Math.exp(-delta * 4)
        rotation.y += (this.#pointer.x * 0.5 - rotation.y) * damping
        rotation.x += (this.#pointer.y * 0.35 - rotation.x) * damping

        this.#renderer.render(this.#scene, this.#camera)
    }
}

if (!customElements.get('glass-blob')) customElements.define('glass-blob', GlassBlob)
