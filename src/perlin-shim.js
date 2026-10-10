// perlin-noise-3d assigns to an undeclared global, which throws in ES modules
// (strict mode). Declaring it up front lets the package load unmodified.
globalThis.perlinNoise3d = undefined
