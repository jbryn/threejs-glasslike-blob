# Glass Blob

A morphing glass blob you can drop into any web page as a single HTML tag, plus a playground for tuning it.

The blob is a `<glass-blob>` custom element built on [Three.js](https://threejs.org/). The sphere is deformed in a vertex shader with simplex noise, and its normals are recomputed so reflections and refraction follow the shape.

## Playground

The playground (`index.html`) lets you:

- Shape the blob with sliders, presets and a random seed
- Change the glass: frost, thickness, dispersion and tint
- Put it over an image, or on a transparent background
- Copy the embed code, copy a link that reproduces your settings, or download a PNG

## Using the element

Load the script once, then use the tag wherever you want a blob. Give it a height (it is `400px` tall and full width by default).

```html
<script type="module" src="https://YOUR-SITE/glass-blob.js"></script>

<glass-blob
  image="https://example.com/photo.jpg"
  strength="0.5"
  color="#ffb38a"
  style="height: 480px"
></glass-blob>
```

| Attribute    | Default   | What it does                                              |
| ------------ | --------- | --------------------------------------------------------- |
| `image`      | none      | Backdrop image the glass refracts. Omit for a transparent background |
| `strength`   | `0.35`    | How far the surface is pushed in and out                  |
| `frequency`  | `0.55`    | Amount of detail: low is a few big lobes, high is lumpy   |
| `speed`      | `0.15`    | Animation speed, `0` to freeze                            |
| `seed`       | `0`       | Picks a different shape                                   |
| `size`       | `1`       | Scale of the blob inside the element                      |
| `roughness`  | `0`       | Frosted glass                                             |
| `thickness`  | `0.7`     | How strongly the backdrop is refracted                    |
| `dispersion` | `0`       | Chromatic aberration at the edges                         |
| `color`      | `#ffffff` | Tint                                                      |

Things to know:

- A web page can't be refracted, only the `image`. Without one the blob shows reflections and tint over whatever is behind the element, and `thickness` and `dispersion` have no effect.
- The `image` must be served with CORS headers if it lives on another domain.
- The blob leans towards the pointer, pauses while it is off screen, and stops morphing for visitors who prefer reduced motion.
- `element.toBlob()` returns a promise for a PNG of the current frame.

## Development

```bash
# Install dependencies
npm install

# Run the playground locally
npm run dev

# Build for production (output in dist/)
npm run build

# Preview the production build
npm run preview
```

The build produces the playground and a standalone `dist/glass-blob.js`. The embed code shown in the playground points at `glass-blob.js` next to the page, so it is only valid for a built and deployed copy, not for `npm run dev`.

Built with [Three.js](https://threejs.org/) and [Vite](https://vite.dev/).
