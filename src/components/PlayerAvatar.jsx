import { useEffect, useState } from 'react'
import { AVATAAARS_HAIR_VARIANTS, AVATAAARS_LAYERED_HAIR } from '../data/avataaarsHair'

// P2.4.4.3B.6.6D — repair Avataaars rear-hair transparency on Toon Head
// Keep the approved front-hair fit, but bridge the donor head-shape cutouts
// behind Toon Head so long/medium styles read as solid hair instead of blue gaps.
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
    { value: 'avaFrizzle', label: 'Ava · Frizzle' },
    { value: 'avaShaggy', label: 'Ava · Shaggy' },
    { value: 'avaCaesar', label: 'Ava · Caesar' },
    { value: 'avaCaesarSide', label: 'Ava · Caesar + Side Part' },
    { value: 'avaDreadsShort', label: 'Ava · Short Dreads' },
    { value: 'avaSides', label: 'Ava · Sides' },
    { value: 'avaBun', label: 'Ava · Bun' },

    { value: 'avaBob', label: 'Ava · Bob' },
    { value: 'avaCurly', label: 'Ava · Curly' },
    { value: 'avaDreadsMedium', label: 'Ava · Medium Dreads' },
    { value: 'avaFro', label: 'Ava · Fro' },
    { value: 'avaFroBand', label: 'Ava · Fro + Band' },
    { value: 'avaLongNotTooLong', label: 'Ava · Medium Long' },
    { value: 'avaMiaWallace', label: 'Ava · Straight Bob' },
    { value: 'avaShaggyMullet', label: 'Ava · Shaggy Mullet' },

    { value: 'avaBigHair', label: 'Ava · Big Hair' },
    { value: 'avaCurvy', label: 'Ava · Curvy Long' },
    { value: 'avaDreadsLong', label: 'Ava · Long Dreads' },
    { value: 'avaShavedSides', label: 'Ava · Shaved Sides' },
    { value: 'avaStraight1', label: 'Ava · Long Straight 01' },
    { value: 'avaStraight2', label: 'Ava · Long Straight 02' },
    { value: 'avaStraightStrand', label: 'Ava · Straight + Strand' },

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
  avaFrizzle: { avataaars: 'frizzle' },
  avaShaggy: { avataaars: 'shaggy' },
  avaCaesar: { avataaars: 'theCaesar' },
  avaCaesarSide: { avataaars: 'theCaesarAndSidePart' },
  avaDreadsShort: { avataaars: 'dreads01' },
  avaSides: { avataaars: 'sides' },
  avaBun: { avataaars: 'bun' },

  avaBob: { avataaars: 'bob' },
  avaCurly: { avataaars: 'curly' },
  avaDreadsMedium: { avataaars: 'dreads02' },
  avaFro: { avataaars: 'fro' },
  avaFroBand: { avataaars: 'froBand' },
  avaLongNotTooLong: { avataaars: 'longButNotTooLong' },
  avaMiaWallace: { avataaars: 'miaWallace' },
  avaShaggyMullet: { avataaars: 'shaggyMullet' },

  avaBigHair: { avataaars: 'bigHair' },
  avaCurvy: { avataaars: 'curvy' },
  avaDreadsLong: { avataaars: 'dreads' },
  avaShavedSides: { avataaars: 'shavedSides' },
  avaStraight1: { avataaars: 'straight01' },
  avaStraight2: { avataaars: 'straight02' },
  avaStraightStrand: { avataaars: 'straightAndStrand' },

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

// Avataaars and Toon Head share a frontal centerline, but Toon Head's skull is
// slightly wider. Keep the original vertical registration (head top ≈ 140)
// while widening hair around the same x=384 center instead of shifting it.
const AVATAAARS_HAIR_TRANSFORM = 'translate(-25 39) scale(3.1 3.2)'

const AVATAAARS_HAIR_TUNING = {
  // Caesar starts lower in the source artwork than the other short cuts.
  // Lift only these two variants so the Toon Head crown cannot peek through.
  theCaesar: { transform: 'translate(-25 20) scale(3.1 3.2)' },
  theCaesarAndSidePart: { transform: 'translate(-25 20) scale(3.1 3.2)' },

  // Fro was the one otherwise-good style that still read a little too wide.
  fro: { transform: 'translate(-12 39) scale(3 3.2)' },

  // Fro + Band keeps its narrower fro silhouette. The headband gets its own
  // registration: thicker than the previous pass while keeping the lower edge
  // at the hairline instead of turning into a cap across the scalp.
  froBand: {
    transform: 'translate(14 20) scale(2.8 3.2)',
    elementTransforms: { 1: 'translate(14 170) scale(2.8 1.4)' },
    frontOnlyElements: [1],
  },

  // Mia's fringe was lifted too far in the last pass. Seat it back down while
  // retaining the cleanup of the source highlight plate.
  miaWallace: {
    transform: 'translate(-25 15) scale(3.1 3.2)',
    hideDecorative: true,
  },
  bigHair: {
    transform: 'translate(-25 20) scale(3.1 3.2)',
    hideDecorative: true,
  },

  // Curvy's white source highlight paths become bright streaks when transplanted.
  // Keep the darker shading, but suppress only the white decorative geometry.
  curvy: { hideLightDecorative: true },
  shavedSides: { hideLightDecorative: true },

  // The mullet passed device review. Preserve its front/rear calibration.
  shaggyMullet: {
    transform: 'translate(-25 10) scale(3.1 3.2)',
    rearTransform: 'translate(28 5) scale(2.7 3.2)',
  },
}

const AVATAAARS_REAR_BACKFILL = new Set([
  'bob',
  'curly',
  'dreads02',
  'fro',
  'froBand',
  'longButNotTooLong',
  'miaWallace',
  'bigHair',
  'curvy',
  'dreads',
  'shavedSides',
  'straight01',
  'straight02',
  'straightAndStrand',
])

const TOON_HEAD_OUTLINE =
  'M5 313c-20-77.5 33.5-50 33.5-50C2.7 147.2 30.5.5 197.5.5s194.8 146.7 159 262.5c0 0 53.5-27.5 33.5 50-11.1 43-51 43-51 43-6 50.4-91.5 95.5-141.5 95.5S61.9 406.4 56 356c0 0-40 0-51-43Z'
const AVATAAARS_FRONT_CLIP_BOTTOM = 365

function AvataaarsHairElement({
  node,
  color,
  keyPath,
  hideDecorative = false,
  hideLightDecorative = false,
}) {
  const attributes = { ...(node.attributes || {}) }
  const isHairFill = attributes.fill === '__HAIR__'
  const hasDecorativeFill = Boolean(attributes.fill) && !isHairFill
  const isLightDecorative =
    typeof attributes.fill === 'string' &&
    ['#fff', '#ffffff', 'white'].includes(attributes.fill.toLowerCase())

  if (node.name === 'path' && hideDecorative && hasDecorativeFill) return null
  if (node.name === 'path' && hideLightDecorative && isLightDecorative) return null

  if (isHairFill) {
    attributes.fill = color
    attributes.stroke = '#241b19'
    attributes.strokeWidth = '2'
    attributes.strokeLinejoin = 'round'
    attributes.strokeLinecap = 'round'
  }

  if (node.name === 'g') {
    return (
      <g key={keyPath} {...attributes}>
        {(node.children || []).map((child, index) => (
          <AvataaarsHairElement
            key={`${keyPath}-${index}`}
            keyPath={`${keyPath}-${index}`}
            node={child}
            color={color}
            hideDecorative={hideDecorative}
            hideLightDecorative={hideLightDecorative}
          />
        ))}
      </g>
    )
  }

  return <path key={keyPath} {...attributes} />
}

function AvataaarsRearBackfill({ variant, color }) {
  if (!AVATAAARS_REAR_BACKFILL.has(variant)) return null

  // Avataaars long/medium hair contains a cutout sized for the Avataaars face.
  // Toon Head is shaped differently, so that cutout exposes the blue portrait
  // background around the jaw. A clipped, hair-colored expansion of Toon Head's
  // own silhouette bridges only that lower rear-hair zone. The actual face is
  // rendered above it, and the donor hair remains the visible outer silhouette.
  const clipId = `docos-avataaars-${variant}-rear-backfill`
  return (
    <>
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <rect x="160" y="315" width="448" height="370" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <path
          d={TOON_HEAD_OUTLINE}
          transform="translate(186.5 139.5)"
          fill={color}
          stroke={color}
          strokeWidth="130"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>
    </>
  )
}

function AvataaarsHair({ variant, color, layer = 'front' }) {
  const elements = AVATAAARS_HAIR_VARIANTS[variant]
  if (!elements) return null

  const layered = AVATAAARS_LAYERED_HAIR.includes(variant)
  if (layer === 'rear' && !layered) return null

  const tuning = AVATAAARS_HAIR_TUNING[variant] || {}
  const transform = layer === 'rear'
    ? (tuning.rearTransform || tuning.transform || AVATAAARS_HAIR_TRANSFORM)
    : (tuning.transform || AVATAAARS_HAIR_TRANSFORM)
  const frontClipBottom = tuning.frontClipBottom || AVATAAARS_FRONT_CLIP_BOTTOM

  const content = (
    <>
      {elements.map((node, index) => {
        if (layer === 'rear' && tuning.frontOnlyElements?.includes(index)) return null

        const elementTransform = tuning.elementTransforms?.[index] || transform
        return (
          <g key={`${variant}-${index}`} transform={elementTransform}>
            <AvataaarsHairElement
              keyPath={`${variant}-${index}`}
              node={node}
              color={color}
              hideDecorative={Boolean(tuning.hideDecorative)}
              hideLightDecorative={Boolean(tuning.hideLightDecorative)}
            />
          </g>
        )
      })}
    </>
  )

  if (layer === 'rear' || !layered) return content

  const clipId = `docos-avataaars-${variant}-front-clip`
  return (
    <>
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <rect x="0" y="0" width="768" height={frontClipBottom} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>{content}</g>
    </>
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
      {portrait.avataaarsHair && AVATAAARS_LAYERED_HAIR.includes(portrait.avataaarsHair) && (
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
            zIndex: 0,
          }}
        >
          <AvataaarsRearBackfill
            variant={portrait.avataaarsHair}
            color={portrait.hairColor}
          />
          <AvataaarsHair
            variant={portrait.avataaarsHair}
            color={portrait.hairColor}
            layer="rear"
          />
        </svg>
      )}

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
          zIndex: 1,
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
            zIndex: 2,
          }}
        >
          {portrait.avataaarsHair && (
            <AvataaarsHair
              variant={portrait.avataaarsHair}
              color={portrait.hairColor}
              layer="front"
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
