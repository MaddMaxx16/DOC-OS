import { useEffect, useRef } from 'react'

export const APPEARANCE_OPTIONS = {
  skinTone: [
    { value: 'porcelain', label: 'Porcelain', color: '#f2c7aa' },
    { value: 'light', label: 'Light', color: '#dfaa86' },
    { value: 'warm', label: 'Warm', color: '#c98962' },
    { value: 'tan', label: 'Tan', color: '#a96545' },
    { value: 'brown', label: 'Brown', color: '#774630' },
    { value: 'deep', label: 'Deep', color: '#4b2b23' },
  ],
  face: [
    { value: 'oval', label: 'Oval' },
    { value: 'round', label: 'Round' },
    { value: 'square', label: 'Square' },
    { value: 'long', label: 'Long' },
    { value: 'soft', label: 'Soft Angular' },
    { value: 'heart', label: 'Heart' },
  ],
  hair: [
    { value: 'crop', label: 'Textured Crop' },
    { value: 'fade', label: 'Fade' },
    { value: 'sidepart', label: 'Side Part' },
    { value: 'waves', label: 'Waves' },
    { value: 'curls', label: 'Curls' },
    { value: 'bun', label: 'Top Bun' },
    { value: 'long', label: 'Long' },
    { value: 'buzz', label: 'Buzz' },
    { value: 'bald', label: 'Bald' },
  ],
  hairColor: [
    { value: 'black', label: 'Black', color: '#17191e' },
    { value: 'espresso', label: 'Espresso', color: '#35251f' },
    { value: 'brown', label: 'Brown', color: '#624333' },
    { value: 'auburn', label: 'Auburn', color: '#7a3e2b' },
    { value: 'blonde', label: 'Blonde', color: '#c7a565' },
    { value: 'silver', label: 'Silver', color: '#aab0b6' },
  ],
  brows: [
    { value: 'natural', label: 'Natural' },
    { value: 'soft', label: 'Soft' },
    { value: 'defined', label: 'Defined' },
    { value: 'straight', label: 'Straight' },
    { value: 'full', label: 'Full' },
  ],
  eyes: [
    { value: 'standard', label: 'Almond' },
    { value: 'soft', label: 'Soft' },
    { value: 'narrow', label: 'Narrow' },
    { value: 'round', label: 'Round' },
    { value: 'upturned', label: 'Upturned' },
  ],
  eyeColor: [
    { value: 'brown', label: 'Brown', color: '#6b4b35' },
    { value: 'hazel', label: 'Hazel', color: '#8b7542' },
    { value: 'green', label: 'Green', color: '#5d7862' },
    { value: 'blue', label: 'Blue', color: '#5d819e' },
    { value: 'gray', label: 'Gray', color: '#7f8d96' },
  ],
  nose: [
    { value: 'soft', label: 'Soft' },
    { value: 'straight', label: 'Straight' },
    { value: 'wide', label: 'Wide' },
    { value: 'button', label: 'Button' },
    { value: 'defined', label: 'Defined' },
  ],
  mouth: [
    { value: 'neutral', label: 'Neutral' },
    { value: 'soft', label: 'Soft Smile' },
    { value: 'full', label: 'Full' },
    { value: 'smile', label: 'Smile' },
    { value: 'wide', label: 'Wide' },
  ],
  facialHair: [
    { value: 'none', label: 'Clean Shaven' },
    { value: 'stubble', label: 'Stubble' },
    { value: 'mustache', label: 'Mustache' },
    { value: 'goatee', label: 'Goatee' },
    { value: 'beard', label: 'Short Beard' },
    { value: 'fullbeard', label: 'Full Beard' },
  ],
  glasses: [
    { value: 'none', label: 'None' },
    { value: 'square', label: 'Square' },
    { value: 'round', label: 'Round' },
    { value: 'aviator', label: 'Aviator' },
  ],
  outfit: [
    { value: 'polo', label: 'Metroline Polo' },
    { value: 'buttondown', label: 'Button Down' },
    { value: 'sweater', label: 'Crew Sweater' },
    { value: 'hoodie', label: 'Metroline Hoodie' },
  ],
}

export const APPEARANCE_CATEGORIES = [
  { key: 'skinTone', label: 'Skin' },
  { key: 'face', label: 'Face' },
  { key: 'hair', label: 'Hair' },
  { key: 'hairColor', label: 'Hair Color' },
  { key: 'brows', label: 'Brows' },
  { key: 'eyes', label: 'Eyes' },
  { key: 'eyeColor', label: 'Eye Color' },
  { key: 'nose', label: 'Nose' },
  { key: 'mouth', label: 'Mouth' },
  { key: 'facialHair', label: 'Facial Hair' },
  { key: 'glasses', label: 'Glasses' },
  { key: 'outfit', label: 'Outfit' },
]

export const DEFAULT_APPEARANCE = {
  skinTone: 'warm',
  face: 'oval',
  hair: 'sidepart',
  hairColor: 'espresso',
  brows: 'natural',
  eyes: 'standard',
  eyeColor: 'brown',
  nose: 'straight',
  mouth: 'soft',
  facialHair: 'none',
  glasses: 'none',
  outfit: 'polo',
}

// P2.4.4.3B.4B.2 — direct canvas skin rendering.
// B.4B.1 still converted the recolored bitmap back into a WebP data URL before
// putting it inside SVG. On physical iPhone that output stayed visually static.
// This pass removes that extra conversion entirely: the visible portrait IS the
// canvas we recolor, so a skin-tone state change directly redraws its pixels.
const MASTER_PORTRAIT = 'data:image/webp;base64,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'
const SKIN_MASK = 'data:image/webp;base64,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'

const SKIN_TONE_FILTERS = {
  porcelain: { r: [0.7404, 0.3545], g: [1.0141, 0.3104], b: [1.1923, 0.3112] },
  light: { r: [0.8233, 0.2437], g: [0.9875, 0.2125], b: [1.1696, 0.1812] },
  warm: { r: [0.8128, 0.1666], g: [0.9395, 0.1078], b: [1.1028, 0.0588] },
  tan: { r: [0.7768, 0.0706], g: [0.8824, -0.0045], b: [1.0459, -0.0359] },
  brown: { r: [0.6796, -0.046], g: [0.8009, -0.089], b: [0.9336, -0.0822] },
  deep: { r: [0.4833, -0.0595], g: [0.597, -0.0929], b: [0.7825, -0.0833] },
}

const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(value)))

function drawSkinTone(canvas, skinTone, onDebug) {
  const tone = SKIN_TONE_FILTERS[skinTone] || SKIN_TONE_FILTERS[DEFAULT_APPEARANCE.skinTone]
  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    onDebug?.({ stage: 'context-error', skinTone, maskedPixels: 0, changedPixels: 0 })
    return () => {}
  }

  onDebug?.({ stage: 'loading-assets', skinTone, maskedPixels: 0, changedPixels: 0 })

  const portrait = new Image()
  const mask = new Image()
  let portraitReady = false
  let maskReady = false
  let cancelled = false

  const draw = () => {
    if (cancelled || !portraitReady || !maskReady) return

    try {
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(portrait, 0, 0, canvas.width, canvas.height)
      const portraitPixels = context.getImageData(0, 0, canvas.width, canvas.height)

      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(mask, 0, 0, canvas.width, canvas.height)
      const maskPixels = context.getImageData(0, 0, canvas.width, canvas.height)

      const pixels = portraitPixels.data
      const maskData = maskPixels.data
      let maskedPixels = 0
      let changedPixels = 0
      let totalDelta = 0

      for (let index = 0; index < pixels.length; index += 4) {
        const weight = (maskData[index] + maskData[index + 1] + maskData[index + 2]) / (255 * 3)
        if (weight <= 0.01) continue

        maskedPixels += 1

        const originalR = pixels[index]
        const originalG = pixels[index + 1]
        const originalB = pixels[index + 2]

        const recoloredR = clampChannel(originalR * tone.r[0] + tone.r[1] * 255)
        const recoloredG = clampChannel(originalG * tone.g[0] + tone.g[1] * 255)
        const recoloredB = clampChannel(originalB * tone.b[0] + tone.b[1] * 255)

        const nextR = clampChannel(originalR + (recoloredR - originalR) * weight)
        const nextG = clampChannel(originalG + (recoloredG - originalG) * weight)
        const nextB = clampChannel(originalB + (recoloredB - originalB) * weight)
        const delta = Math.abs(nextR - originalR) + Math.abs(nextG - originalG) + Math.abs(nextB - originalB)

        if (delta > 0) {
          changedPixels += 1
          totalDelta += delta
        }

        pixels[index] = nextR
        pixels[index + 1] = nextG
        pixels[index + 2] = nextB
      }

      if (cancelled) return

      context.clearRect(0, 0, canvas.width, canvas.height)
      context.putImageData(portraitPixels, 0, 0)

      onDebug?.({
        stage: 'applied',
        skinTone,
        maskedPixels,
        changedPixels,
        averageDelta: changedPixels ? Math.round(totalDelta / changedPixels) : 0,
        canvas: `${canvas.width}x${canvas.height}`,
      })
    } catch (error) {
      onDebug?.({
        stage: 'draw-error',
        skinTone,
        maskedPixels: 0,
        changedPixels: 0,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  portrait.onload = () => {
    portraitReady = true
    onDebug?.({ stage: maskReady ? 'assets-ready' : 'portrait-ready', skinTone })
    draw()
  }
  mask.onload = () => {
    maskReady = true
    onDebug?.({ stage: portraitReady ? 'assets-ready' : 'mask-ready', skinTone })
    draw()
  }
  portrait.onerror = () => onDebug?.({ stage: 'portrait-error', skinTone })
  mask.onerror = () => onDebug?.({ stage: 'mask-error', skinTone })

  portrait.src = MASTER_PORTRAIT
  mask.src = SKIN_MASK

  return () => {
    cancelled = true
  }
}

function PlayerAvatar({ appearance = DEFAULT_APPEARANCE, className = '', onDebug }) {
  const canvasRef = useRef(null)
  const skinTone = SKIN_TONE_FILTERS[appearance.skinTone]
    ? appearance.skinTone
    : DEFAULT_APPEARANCE.skinTone

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    return drawSkinTone(canvas, skinTone, onDebug)
  }, [skinTone, onDebug])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width="260"
      height="320"
      role="img"
      aria-label={`Customized Metroline employee portrait — ${skinTone} skin tone`}
      data-skin-tone={skinTone}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}

export default PlayerAvatar
