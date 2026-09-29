import { useEffect, useState } from 'react'

// P2.4.4.3B.6.5A — Avataaars front-facing hair audition on Toon Head
// Toon Head remains the DOC OS player base. Avataaars supplies only a curated
// front-facing hair set; Notion remains available for eyes / glasses / accessories.
export const APPEARANCE_OPTIONS = {
  skinTone: [
    { value: 'porcelain', label: 'Porcelain', color: '#f2c7aa' },
    { value: 'light', label: 'Light', color: '#dfaa86' },
    { value: 'warm', label: 'Warm', color: '#c98962' },
    { value: 'tan', label: 'Tan', color: '#a96545' },
    { value: 'brown', label: 'Brown', color: '#774630' },
    { value: 'deep', label: 'Deep', color: '#4b2b23' },
  ],
  hair: [
    { value: 'sidepart', label: 'Side Part' },
    { value: 'undercut', label: 'Undercut' },
    { value: 'spiky', label: 'Spiky' },
    { value: 'avaShortFlat', label: 'Ava · Short Flat' },
    { value: 'avaShortRound', label: 'Ava · Short Round' },
    { value: 'avaShortWaved', label: 'Ava · Short Waved' },
    { value: 'avaShortCurly', label: 'Ava · Short Curly' },
    { value: 'avaShaggy', label: 'Ava · Shaggy' },
    { value: 'avaCaesarSide', label: 'Ava · Caesar + Side Part' },
    { value: 'bun', label: 'Bun' },
    { value: 'longStraight', label: 'Long Straight' },
    { value: 'longWavy', label: 'Long Wavy' },
    { value: 'neckHigh', label: 'Neck Length' },
    { value: 'shoulderHigh', label: 'Shoulder Length' },
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
    { value: 'neutral', label: 'Natural' },
    { value: 'happy', label: 'Soft Arch' },
    { value: 'raised', label: 'Raised' },
    { value: 'sad', label: 'Downturned' },
    { value: 'angry', label: 'Strong' },
  ],
  eyes: [
    { value: 'humble', label: 'Natural' },
    { value: 'happy', label: 'Friendly' },
    { value: 'wide', label: 'Wide' },
    { value: 'notionEye0', label: 'Notion · 01' },
    { value: 'notionEye2', label: 'Notion · 03' },
    { value: 'notionEye4', label: 'Notion · 05' },
    { value: 'notionEye5', label: 'Notion · 06' },
    { value: 'notionEye7', label: 'Notion · 08' },
    { value: 'notionEye9', label: 'Notion · 10' },
    { value: 'notionEye12', label: 'Notion · 13' },
    { value: 'bow', label: 'Bow' },
    { value: 'wink', label: 'Wink' },
  ],
  mouth: [
    { value: 'smile', label: 'Soft Smile' },
    { value: 'laugh', label: 'Laugh' },
    { value: 'agape', label: 'Open' },
    { value: 'sad', label: 'Downturned' },
    { value: 'angry', label: 'Firm' },
  ],
  facialHair: [
    { value: 'none', label: 'Clean Shaven' },
    { value: 'chin', label: 'Chin Beard' },
    { value: 'chinMoustache', label: 'Goatee + Mustache' },
    { value: 'moustacheTwirl', label: 'Mustache' },
    { value: 'fullBeard', label: 'Full Beard' },
    { value: 'longBeard', label: 'Long Beard' },
  ],
  glasses: [
    { value: 'none', label: 'None' },
    { value: 'notionGlasses1', label: 'Notion · 02' },
    { value: 'notionGlasses3', label: 'Notion · 04' },
    { value: 'notionGlasses5', label: 'Notion · 06' },
    { value: 'notionGlasses8', label: 'Notion · 09' },
    { value: 'notionGlasses12', label: 'Notion · 13' },
  ],
  accessories: [
    { value: 'none', label: 'None' },
    { value: 'notionAccessory1', label: 'Notion · 02' },
    { value: 'notionAccessory3', label: 'Notion · 04' },
    { value: 'notionAccessory5', label: 'Notion · 06' },
    { value: 'notionAccessory8', label: 'Notion · 09' },
    { value: 'notionAccessory10', label: 'Notion · 11' },
  ],
  outfit: [
    { value: 'shirt', label: 'Work Shirt' },
    { value: 'openJacket', label: 'Open Jacket' },
    { value: 'tShirt', label: 'Crew Tee' },
    { value: 'turtleNeck', label: 'Turtleneck' },
    { value: 'dress', label: 'Tailored Dress' },
  ],
}

export const APPEARANCE_CATEGORIES = [
  { key: 'skinTone', label: 'Skin' },
  { key: 'hair', label: 'Hair' },
  { key: 'hairColor', label: 'Hair Color' },
  { key: 'brows', label: 'Brows' },
  { key: 'eyes', label: 'Eyes' },
  { key: 'mouth', label: 'Mouth' },
  { key: 'facialHair', label: 'Facial Hair' },
  { key: 'glasses', label: 'Glasses' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'outfit', label: 'Outfit' },
]

export const DEFAULT_APPEARANCE = {
  skinTone: 'warm',
  hair: 'sidepart',
  hairColor: 'espresso',
  brows: 'neutral',
  eyes: 'humble',
  mouth: 'smile',
  facialHair: 'none',
  glasses: 'none',
  accessories: 'none',
  outfit: 'shirt',
}

const DICEBEAR_TOON_HEAD = 'https://api.dicebear.com/10.x/toon-head/svg'
const NOTION_ASSET_BASE =
  'https://raw.githubusercontent.com/Mayandev/notion-avatar/main/public/avatar/preview'
const NOTION_ASSET_CACHE = new Map()
const METROLINE_PORTRAIT_BACKGROUND = '0b2a45'
const METROLINE_OUTFIT_COLOR = '101f31'

const HAIR_CONFIG = {
  sidepart: { front: 'sideComed', rear: null },
  undercut: { front: 'undercut', rear: null },
  spiky: { front: 'spiky', rear: null },
  avaShortFlat: { avataaars: 'shortFlat' },
  avaShortRound: { avataaars: 'shortRound' },
  avaShortWaved: { avataaars: 'shortWaved' },
  avaShortCurly: { avataaars: 'shortCurly' },
  avaShaggy: { avataaars: 'shaggy' },
  avaCaesarSide: { avataaars: 'theCaesarAndSidePart' },
  bun: { front: 'bun', rear: null },
  longStraight: { front: 'sideComed', rear: 'longStraight' },
  longWavy: { front: 'sideComed', rear: 'longWavy' },
  neckHigh: { front: 'sideComed', rear: 'neckHigh' },
  shoulderHigh: { front: 'sideComed', rear: 'shoulderHigh' },
  bald: { front: null, rear: null },
}

const NOTION_EYES = {
  notionEye0: '0',
  notionEye2: '2',
  notionEye4: '4',
  notionEye5: '5',
  notionEye7: '7',
  notionEye9: '9',
  notionEye12: '12',
}

const NOTION_GLASSES = {
  notionGlasses1: '1',
  notionGlasses3: '3',
  notionGlasses5: '5',
  notionGlasses8: '8',
  notionGlasses12: '12',
}

const NOTION_ACCESSORIES = {
  notionAccessory1: '1',
  notionAccessory3: '3',
  notionAccessory5: '5',
  notionAccessory8: '8',
  notionAccessory10: '10',
}

const NOTION_TRANSFORMS = {
  // Eyes/glasses: map Notion eye anchors directly to Toon Head eye anchors.
  eyes: 'translate(-260 -130) scale(1.007)',
  glasses: 'translate(-260 -130) scale(1.007)',
  // Ear/temple accessories need a separate anchor from the face-centered parts.
  accessories: 'translate(-20 -80) scale(.75)',
}

const AVATAAARS_HAIR_TRANSFORM = 'translate(-64 25) scale(3.2)'
const AVATAAARS_HAIR_PATHS = {
  shortFlat: 'M179.15 39.92c-2.76-2.82-5.96-5.21-9.08-7.61q-1.04-.79-2.06-1.6c-.15-.12-1.72-1.24-1.9-1.66-.46-.99-.2-.22-.13-1.4.08-1.5 3.13-5.73.85-6.7-1-.43-2.79.7-3.75 1.08a60 60 0 0 1-5.73 1.9c.93-1.85 2.7-5.57-.63-4.58-2.6.78-5.03 2.77-7.64 3.7.86-1.4 4.32-5.8 1.2-6.05-.98-.07-3.8 1.75-4.86 2.14a56 56 0 0 1-9.63 2.51c-11.2 2.02-24.3 1.45-34.65 6.54-7.99 3.93-15.88 10.03-20.5 17.8-4.44 7.48-6.1 15.67-7.03 24.25-.69 6.3-.74 12.8-.42 19.12.1 2.07.34 11.61 3.34 8.72 1.5-1.44 1.49-7.25 1.87-9.22.75-3.91 1.47-7.85 2.72-11.64 2.2-6.68 4.81-13.79 10.3-18.39 3.53-2.95 6.01-6.94 9.39-9.92 1.51-1.34.36-1.2 2.8-1.02q2.45.16 4.92.2c3.8.1 7.6.08 11.4.1 7.64.02 15.25.13 22.89-.27 3.4-.18 6.8-.28 10.18-.6 1.9-.17 5.25-1.38 6.8-.45 1.43.84 2.91 3.61 3.94 4.75 2.41 2.67 5.3 4.72 8.12 6.92 5.9 4.57 8.87 10.33 10.66 17.48 1.79 7.13 1.29 13.75 3.5 20.76.38 1.24 1.4 3.36 2.67 1.46.24-.36.18-2.3.18-3.42 0-4.52 1.14-7.91 1.13-12.46-.06-13.83-.5-31.87-10.85-42.44',
  shortRound: 'M166.3 35c-20.18-11.7-40.17-9.78-55.26-5.97-15.1 3.8-24.02 14.62-31.68 30.62a68 68 0 0 0-6.34 25.83 34 34 0 0 0 1.25 10.22c.33 1.2 2.15 5.39 2.65 2 .17-1.12-.44-2.67-.5-3.86-.08-1.57 0-3.16.11-4.73q.28-4.4 1.65-8.59c1.33-3.98 3.02-8.3 5.6-11.67 6.4-8.33 17.49-8.8 26.29-13.39-.77 1.4-3.71 3.68-2.7 5.27.71 1.1 3.38.76 4.65.72 3.35-.09 6.72-.67 10.02-1.14a72 72 0 0 0 15-4.1c4.02-1.5 8.61-2.88 11.63-6.07a69 69 0 0 0 17.4 13c5.62 2.88 14.68 4.32 18.11 10.16 4.07 6.91 2.2 15.4 3.44 22.9.47 2.85 1.54 2.79 2.13.24 1-4.33 1.47-8.83 1.15-13.28-.72-10.05-4.4-36.45-24.6-48.15',
  shortWaved: 'M182.68 38.95c5.4-4.95 6.7-14.99 3.64-21.5-3.77-8-11.42-9-18.75-5.48-6.9 3.31-13.05 4.42-20.62 2.81-7.26-1.54-14.14-4.26-21.65-4.7-12.32-.74-24.3 3.83-32.7 13.05a36 36 0 0 0-4.11 5.8c-.98 1.63-2.08 3.38-2.5 5.26-.2.9.18 3.1-.27 3.83-.48.8-2.3 1.52-3.07 2.1a25 25 0 0 0-4.18 4.05c-2.66 3.22-4.13 6.59-5.37 10.57-4.1 13.25-4.45 29 .86 42 .7 1.74 2.9 5.36 4.18 1.64.26-.73-.33-3.19-.33-3.93 0-2.72 1.5-20.73 8.05-30.82 2.13-3.28 11.97-15.58 13.98-15.68 1.07 1.7 11.88 12.51 39.94 11.24 12.67-.57 22.4-6.26 24.74-8.72 1.03 5.53 13 13.81 14.82 17.22 5.26 9.85 6.43 30.3 8.44 30.27s3.45-5.24 3.87-6.23c3.07-7.38 3.6-16.64 3.27-24.56-.43-10.2-4.64-21.23-12.24-28.22',
  shortCurly: 'M192.77 70.77a63 63 0 0 0-1.52-9.86 52 52 0 0 0-2.49-7.49c-.6-1.48-2.03-3.52-2.2-5.13-.17-1.57 1.07-3.32 1.33-5.16.25-1.79.21-3.66-.16-5.44-.83-4.02-3.59-7.76-7.85-8.8-.95-.24-2.97.05-3.64-.5-.77-.64-1.3-2.8-2-3.68-2-2.47-5.1-4.07-8.37-3.51-2.42.4-1.03.9-2.84-.51-1-.8-1.75-2-2.73-2.85a25 25 0 0 0-4.9-3.28 51 51 0 0 0-14.84-4.91c-9.28-1.52-19.2-.2-28.2 2.22a75 75 0 0 0-13.14 4.74c-1.78.87-2.81 1.58-4.67 1.81-2.93.36-5.4.34-8.18 1.58-8.54 3.82-12.39 12.69-9.06 21.17a15 15 0 0 0 2.82 4.59c1.52 1.68 2.07 1.35.76 3.28a53 53 0 0 0-4.96 9.17c-3.53 8.4-4.12 17.87-3.89 26.83.08 3.13.22 6.31.71 9.42.22 1.34.28 3.87 1.29 4.87.5.5 1.24.79 1.96.58 1.71-.47 1.13-1.73 1.17-2.9.2-5.89-.07-11.1 1.32-16.9a44 44 0 0 1 5-12.04 72 72 0 0 1 9.8-13.35c.92-.99 1.12-1.4 2.35-1.48.93-.05 2.3.59 3.2.8 2 .5 4 .98 6.03 1.3 3.74.6 7.45.65 11.22.53 7.43-.23 14.88-.75 22.09-2.62 4.78-1.24 9.02-3.47 13.6-5.1.08-.04 1.23-.85 1.43-.82.28.04 1.97 1.82 2.26 2.05 2.23 1.74 4.67 2.48 7.07 3.83 2.96 1.66.1-.72 1.73 1.36.48.6.72 1.72 1.1 2.4 1.22 2.2 2.9 4.11 4.93 5.63 1.96 1.47 4.9 2.18 5.9 4.1.76 1.47 1.02 3.48 1.64 5.06 1.63 4.13 3.78 7.99 5.93 11.88 1.73 3.14 3.62 5.89 3.81 9.47.07 1.25-1.12 8.74 1.78 6.46.43-.34 1.35-4.15 1.54-4.8.77-2.63 1.05-5.38 1.4-8.09.69-5.38.92-10.5.46-15.91',
  shaggy: 'M87.18 37.86c5.14-3.84 11.22-7.12 17.56-8.38 6.45-1.28 10.36-1.6 16.7-.07 1.64.39 2.2.78 3.63-.15 1.2-.79 9.66-9.5 35.42-4.66 26.03 4.88 33.77 44.08 43.42 45.57 3.49.53 7.79-.39 7.92-2.53 3.96 6.03 5 14 3.33 21.07-1.45 6.09-4.5 11.8-9.99 15.14-4.73 2.87-11.26 4.12-16.72 3.59a22 22 0 0 1-7.03-1.77c-2.76-1.2-4.96-3.39-7.67-4.54q4.25 3.68 9.18 6.42c1.64.9 3.3 1.53 5.11 2.02 1.24.34 3.76 1.48 4.96 1.18-7.81 1.4-15.16.18-22.32-3.16a52 52 0 0 1-9.2-5.48c-2.83-2.13-6.09-4.3-8.3-7.1.93 1.2-.7-.6-.92-.81q-.9-.93-1.78-1.9a74 74 0 0 1-8.44-11.2c-1.68-2.75-8.36-13.86-10.38-16.48 1.9 5.7 3.98 11.42 6.41 16.92-4.71-1.47-9.28-5.54-12.3-9.34a29.5 29.5 0 0 1-6.1-14.66c-3.83 10.41-12.79 18.63-22.03 24.3 2-3.74 5.05-6.9 7.05-10.69-9.2 9.33-24.57 13.9-28.6 27.58-1.03-4.76-4.35-8.58-5.34-13.43-1.1-5.4-1.9-11.11-1.73-16.62.4-12.24 8.64-23.72 18.16-30.82',
  theCaesarAndSidePart: 'M77 98c-.33 1.22-1.65 1.49-2 0-.72-10.3 0-62.27 57-63s57.72 52.7 57 63c-.35 1.49-1.67 1.22-2 0 .46-1.55-3.3-28.75-13-36-1.76-1.22-7.25-2.39-14.64-3.26L163 50l-6.98 8.38c-7.03-.7-15.36-1.13-23.7-1.13C113 57.23 93.61 59.48 90 62c-9.7 7.25-13.46 34.45-13 36',
}

function AvataaarsHair({ variant, color }) {
  const path = AVATAAARS_HAIR_PATHS[variant]
  if (!path) return null

  return (
    <g transform={AVATAAARS_HAIR_TRANSFORM}>
      <path
        d={path}
        fill={color}
        stroke="#241b19"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </g>
  )
}

function loadNotionAsset(assetKey, index) {
  const url = `${NOTION_ASSET_BASE}/${assetKey}/${index}.svg`

  if (!NOTION_ASSET_CACHE.has(url)) {
    NOTION_ASSET_CACHE.set(
      url,
      fetch(url).then((response) => {
        if (!response.ok) throw new Error(`Unable to load Notion avatar asset: ${url}`)
        return response.text()
      }),
    )
  }

  return NOTION_ASSET_CACHE.get(url)
}

function stripOuterSvg(svg) {
  return svg
    .replace(/^\s*<svg[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '')
}

function recolorNotionSvg(svg, kind, color) {
  let next = stripOuterSvg(svg)

  if (kind === 'hair') {
    next = next
      .replace(/fill="#000000"/gi, `fill="${color}"`)
      .replace(/fill="black"/gi, `fill="${color}"`)
      .replace(/stroke="#000000"/gi, 'stroke="#241b19"')
      .replace(/stroke="black"/gi, 'stroke="#241b19"')
  } else {
    next = next
      .replace(/fill="#000000"/gi, 'fill="#4b2422"')
      .replace(/fill="black"/gi, 'fill="#4b2422"')
      .replace(/stroke="#000000"/gi, 'stroke="#4b2422"')
      .replace(/stroke="black"/gi, 'stroke="#4b2422"')
  }

  return next
}

function NotionPart({ assetKey, index, kind, transform, color = '#4b2422', clipBottom = null }) {
  const [markup, setMarkup] = useState('')

  useEffect(() => {
    let cancelled = false
    setMarkup('')

    loadNotionAsset(assetKey, index)
      .then((svg) => {
        if (!cancelled) setMarkup(recolorNotionSvg(svg, kind, color))
      })
      .catch(() => {
        if (!cancelled) setMarkup('')
      })

    return () => {
      cancelled = true
    }
  }, [assetKey, index, kind, color])

  if (!markup) return null

  const clipId = `docos-notion-${assetKey}-${index}-front-clip`

  return (
    <g transform={transform}>
      {clipBottom !== null ? (
        <>
          <defs>
            <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
              <rect x="0" y="0" width="1080" height={clipBottom} />
            </clipPath>
          </defs>
          <g
            clipPath={`url(#${clipId})`}
            dangerouslySetInnerHTML={{ __html: markup }}
          />
        </>
      ) : (
        <g dangerouslySetInnerHTML={{ __html: markup }} />
      )}
    </g>
  )
}

function optionColor(group, value, fallback) {
  return (APPEARANCE_OPTIONS[group].find((option) => option.value === value)?.color || fallback)
    .replace('#', '')
}

function validOption(group, value, fallback) {
  return APPEARANCE_OPTIONS[group].some((option) => option.value === value) ? value : fallback
}

function buildToonHeadPortrait(appearance) {
  const skinTone = validOption('skinTone', appearance.skinTone, DEFAULT_APPEARANCE.skinTone)
  const hairChoice = validOption('hair', appearance.hair, DEFAULT_APPEARANCE.hair)
  const hairColorChoice = validOption('hairColor', appearance.hairColor, DEFAULT_APPEARANCE.hairColor)
  const brows = validOption('brows', appearance.brows, DEFAULT_APPEARANCE.brows)
  const eyes = validOption('eyes', appearance.eyes, DEFAULT_APPEARANCE.eyes)
  const mouth = validOption('mouth', appearance.mouth, DEFAULT_APPEARANCE.mouth)
  const facialHair = validOption('facialHair', appearance.facialHair, DEFAULT_APPEARANCE.facialHair)
  const glasses = validOption('glasses', appearance.glasses, DEFAULT_APPEARANCE.glasses)
  const accessories = validOption('accessories', appearance.accessories, DEFAULT_APPEARANCE.accessories)
  const outfit = validOption('outfit', appearance.outfit, DEFAULT_APPEARANCE.outfit)

  const hair = HAIR_CONFIG[hairChoice] || HAIR_CONFIG[DEFAULT_APPEARANCE.hair]
  const hairColor = optionColor('hairColor', hairColorChoice, '#35251f')
  const skinColor = optionColor('skinTone', skinTone, '#c98962')
  const hasFacialHair = facialHair !== 'none'
  const notionEyes = NOTION_EYES[eyes] || null

  const params = new URLSearchParams({
    seed: 'doc-os-metroline-player',
    skinColor,
    hairColor,
    clothesColor: METROLINE_OUTFIT_COLOR,
    eyebrowsVariant: brows,
    mouthVariant: mouth,
    clothesVariant: outfit,
    beardProbability: hasFacialHair ? '100' : '0',
    eyesProbability: notionEyes ? '0' : '100',
    hairProbability: hair.avataaars ? '0' : (hair.front ? '100' : '0'),
    rearHairProbability: hair.avataaars ? '0' : (hair.rear ? '100' : '0'),
  })

  if (!notionEyes) params.set('eyesVariant', eyes)
  if (!hair.avataaars && hair.front) params.set('hairVariant', hair.front)
  if (!hair.avataaars && hair.rear) params.set('rearHairVariant', hair.rear)
  if (hasFacialHair) params.set('beardVariant', facialHair)

  return {
    src: `${DICEBEAR_TOON_HEAD}?${params.toString()}`,
    skinTone,
    avataaarsHair: hair.avataaars || null,
    notionEyes,
    notionGlasses: NOTION_GLASSES[glasses] || null,
    notionAccessories: NOTION_ACCESSORIES[accessories] || null,
    hairColor: `#${hairColor}`,
  }
}

function PlayerAvatar({ appearance = DEFAULT_APPEARANCE, className = '' }) {
  const portrait = buildToonHeadPortrait(appearance)
  const hasOverlayParts = Boolean(
    portrait.avataaarsHair ||
    portrait.notionEyes ||
    portrait.notionGlasses ||
    portrait.notionAccessories,
  )

  return (
    <div
      className={className}
      role="img"
      aria-label={`Customized Metroline employee portrait — ${portrait.skinTone} skin tone`}
      data-avatar-engine="dicebear-toon-head-avataaars-hair-audition"
      data-skin-tone={portrait.skinTone}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: `#${METROLINE_PORTRAIT_BACKGROUND}`,
      }}
    >
      <img
        src={portrait.src}
        width="260"
        height="320"
        alt=""
        aria-hidden="true"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'cover',
        }}
      />

      {hasOverlayParts && (
        <svg
          viewBox="0 0 768 768"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            pointerEvents: 'none',
          }}
        >
          {portrait.avataaarsHair && (
            <AvataaarsHair
              variant={portrait.avataaarsHair}
              color={portrait.hairColor}
            />
          )}
          {portrait.notionEyes && (
            <NotionPart
              assetKey="eyes"
              index={portrait.notionEyes}
              kind="eyes"
              transform={NOTION_TRANSFORMS.eyes}
            />
          )}
          {portrait.notionGlasses && (
            <NotionPart
              assetKey="glasses"
              index={portrait.notionGlasses}
              kind="glasses"
              transform={NOTION_TRANSFORMS.glasses}
            />
          )}
          {portrait.notionAccessories && (
            <NotionPart
              assetKey="accessories"
              index={portrait.notionAccessories}
              kind="accessories"
              transform={NOTION_TRANSFORMS.accessories}
            />
          )}
        </svg>
      )}
    </div>
  )
}

export default PlayerAvatar
