import './style.css'
import { DEFAULTS } from './glass-blob.js'

const DEFAULT_IMAGE = 'textures/intro-setup.png'
const EMBED_HEIGHT = '480px'

const CONTROLS = [
    {
        title: 'Shape',
        items: [
            { name: 'strength', label: 'Strength', min: 0, max: 0.6, step: 0.01 },
            { name: 'frequency', label: 'Detail', min: 0.2, max: 1.6, step: 0.01 },
            { name: 'speed', label: 'Speed', min: 0, max: 1, step: 0.01 },
            { name: 'size', label: 'Size', min: 0.4, max: 1.6, step: 0.01 }
        ]
    },
    {
        title: 'Glass',
        items: [
            { name: 'roughness', label: 'Frost', min: 0, max: 0.6, step: 0.01 },
            { name: 'thickness', label: 'Thickness', min: 0, max: 3, step: 0.01 },
            { name: 'dispersion', label: 'Dispersion', min: 0, max: 8, step: 0.1 }
        ]
    }
]

const PRESETS = [
    { name: 'Droplet', values: {} },
    { name: 'Molten', values: { strength: 0.5, frequency: 0.9, speed: 0.35, thickness: 1.4, color: '#ffb38a' } },
    { name: 'Frosted', values: { strength: 0.25, frequency: 0.45, roughness: 0.35, thickness: 1.2, color: '#dff3ff' } },
    { name: 'Prism', values: { strength: 0.3, frequency: 0.7, thickness: 1.8, dispersion: 6 } },
    { name: 'Pebble', values: { strength: 0.12, frequency: 0.4, speed: 0.08, size: 1.2 } }
]

const blob = document.querySelector('#blob')
const stage = document.querySelector('#stage')
const form = document.querySelector('#controls')
const presets = document.querySelector('#presets')
const embed = document.querySelector('#embed')
const caption = document.querySelector('#caption')
const imageUrl = document.querySelector('#image-url')
const imageFile = document.querySelector('#image-file')
const imageNote = document.querySelector('#image-note')
const backdropImage = document.querySelector('#backdrop-image')
const backdropNote = document.querySelector('#backdrop-note')

// `image` is a URL, or '' for a transparent backdrop. `localImage` is an object URL
// for a file picked from disk: it only exists in this tab, so it is never exported.
const state = { ...DEFAULTS, image: DEFAULT_IMAGE }
let localImage = null

const format = (value, step) => Number(value).toFixed(step < 0.1 ? 2 : 1)

/**
 * Controls
 */
const inputs = {}

for (const { title, items } of CONTROLS) {
    const group = document.createElement('fieldset')
    group.className = 'group'
    group.innerHTML = `<legend>${title}</legend>`

    for (const { name, label, min, max, step } of items) {
        const row = document.createElement('label')
        row.className = 'slider'
        row.innerHTML = `
            <span class="slider__label">${label}</span>
            <output class="slider__value"></output>
            <input type="range" name="${name}" min="${min}" max="${max}" step="${step}">
        `
        inputs[name] = { input: row.querySelector('input'), output: row.querySelector('output'), step }
        group.append(row)
    }

    if (title === 'Shape') {
        const row = document.createElement('div')
        row.className = 'seed'
        row.innerHTML = `
            <label class="field">
                <span>Seed</span>
                <input type="number" name="seed" min="0" max="999" step="0.01">
            </label>
            <button type="button" class="button" id="randomise">Randomise</button>
        `
        inputs.seed = { input: row.querySelector('input') }
        group.append(row)
    }

    if (title === 'Glass') {
        const row = document.createElement('label')
        row.className = 'tint'
        row.innerHTML = `
            <span class="slider__label">Tint</span>
            <output class="slider__value"></output>
            <input type="color" name="color">
        `
        inputs.color = { input: row.querySelector('input'), output: row.querySelector('output') }
        group.append(row)
    }

    form.append(group)
}

PRESETS.forEach(({ name }, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'preset'
    button.dataset.index = index
    button.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span>${name}`
    presets.append(button)
})

/**
 * State
 */
const changed = () => Object.keys(DEFAULTS).filter((name) => String(state[name]) !== String(DEFAULTS[name]))

const readUrl = () => {
    const params = new URLSearchParams(location.search)

    for (const name of Object.keys(DEFAULTS)) {
        if (!params.has(name)) continue
        const value = params.get(name)
        if (name === 'color') state.color = /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULTS.color
        else if (Number.isFinite(parseFloat(value))) state[name] = parseFloat(value)
    }

    if (params.has('image')) state.image = params.get('image') === 'none' ? '' : params.get('image')
}

const shareUrl = () => {
    const params = new URLSearchParams()
    for (const name of changed()) params.set(name, state[name])
    if (!state.image) params.set('image', 'none')
    else if (state.image !== DEFAULT_IMAGE) params.set('image', state.image)

    const query = params.toString()
    return `${location.origin}${location.pathname}${query ? `?${query}` : ''}`
}

const embedCode = () => {
    const attributes = changed().map((name) => `${name}="${state[name]}"`)

    if (localImage) attributes.unshift('image="path/to/your-image.jpg"')
    else if (state.image) attributes.unshift(`image="${new URL(state.image, document.baseURI).href}"`)

    return [
        `<script type="module" src="${new URL('glass-blob.js', document.baseURI).href}"></script>`,
        '',
        '<glass-blob',
        ...attributes.map((attribute) => `  ${attribute}`),
        `  style="height: ${EMBED_HEIGHT}"`,
        '></glass-blob>'
    ].join('\n')
}

const render = () => {
    for (const name of Object.keys(DEFAULTS)) {
        blob.setAttribute(name, state[name])

        const { input, output, step } = inputs[name]
        if (document.activeElement !== input) input.value = state[name]
        if (output) output.textContent = name === 'color' ? state.color : format(state[name], step)
    }

    const image = localImage ?? state.image
    if (image) blob.setAttribute('image', image)
    else blob.removeAttribute('image')

    stage.dataset.backdrop = image ? 'image' : 'none'
    backdropImage.hidden = !image
    backdropNote.hidden = Boolean(image)
    document.querySelector(`input[name="backdrop"][value="${image ? 'image' : 'none'}"]`).checked = true
    if (document.activeElement !== imageUrl) imageUrl.value = !localImage && state.image !== DEFAULT_IMAGE ? state.image : ''

    caption.textContent = `fig. 1 — seed ${format(state.seed, 0.01)}`
    embed.textContent = embedCode()
    history.replaceState(null, '', shareUrl())
}

const setLocalImage = (file) => {
    if (localImage) URL.revokeObjectURL(localImage)
    localImage = file ? URL.createObjectURL(file) : null
    if (!file) imageFile.value = ''
}

const note = (message) => {
    imageNote.textContent = message
    imageNote.hidden = !message
}

/**
 * Events
 */
form.addEventListener('input', (event) => {
    const { name, value } = event.target
    state[name] = name === 'color' ? value : parseFloat(value) || 0
    render()
})

form.addEventListener('click', (event) => {
    if (event.target.id !== 'randomise') return
    state.seed = Math.round(Math.random() * 99900) / 100
    render()
})

presets.addEventListener('click', (event) => {
    const button = event.target.closest('.preset')
    if (!button) return
    Object.assign(state, DEFAULTS, PRESETS[button.dataset.index].values, { seed: state.seed })
    render()
})

document.querySelectorAll('input[name="backdrop"]').forEach((radio) => {
    radio.addEventListener('change', () => {
        setLocalImage(null)
        note('')
        state.image = radio.value === 'image' ? DEFAULT_IMAGE : ''
        render()
    })
})

imageUrl.addEventListener('change', () => {
    setLocalImage(null)
    note('')
    state.image = imageUrl.value.trim() || DEFAULT_IMAGE
    render()
})

imageFile.addEventListener('change', () => {
    const [file] = imageFile.files
    if (!file) return
    setLocalImage(file)
    note('Previewing a local file. The embed code uses a placeholder path: host the image yourself and replace it.')
    render()
})

blob.addEventListener('imageerror', () => {
    note('That image could not be loaded. It has to be reachable and allow cross-origin use (CORS).')
})

const flash = (button, message) => {
    const label = button.textContent
    button.textContent = message
    button.disabled = true
    setTimeout(() => {
        button.textContent = label
        button.disabled = false
    }, 1400)
}

const copy = async (button, text) => {
    try {
        await navigator.clipboard.writeText(text)
        flash(button, 'Copied')
    } catch {
        flash(button, 'Copy failed')
    }
}

document.querySelector('#copy-embed').addEventListener('click', (event) => copy(event.currentTarget, embedCode()))
document.querySelector('#copy-link').addEventListener('click', (event) => copy(event.currentTarget, shareUrl()))

document.querySelector('#download').addEventListener('click', async () => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(await blob.toBlob())
    link.download = 'glass-blob.png'
    link.click()
    URL.revokeObjectURL(link.href)
})

readUrl()
render()
