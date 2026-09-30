import { useEffect, useState } from 'react'
import { AVATAAARS_HAIR_VARIANTS, AVATAAARS_LAYERED_HAIR } from '../data/avataaarsHair'

// P2.4.4.3B.6.6G — final targeted Avataaars seam cleanup
// Clean the six approved audition candidates without reopening the whole hair
// library: rear hair keeps its exterior outline, while the front copy drops the
// donor face-cutout stroke and masks the Toon Head crown seam beneath it.
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
    { value: 'avaBun', label: 'Ava · Bun' },

    { value: 'avaBob', label: 'Ava · Bob' },
    { value: 'avaCurly', label: 'Ava · Curly' },
    { value: 'avaFro', label: 'Ava · Fro' },
    { value: 'avaMiaWallace', label: 'Ava · Straight Bob' },
    { value: 'avaShaggyMullet', label: 'Ava · Shaggy Mullet' },


    { value: 'bun', label: 'Bun' },
    { value: 'longStraight', label: 'Long Straight' },
    { value: 'longWavy', label: 'Long Wavy' },
    { value: 'neckHigh', label: 'Neck Length' },
    { value: 'shoulderHigh', label: 'Shoulder Length' },
    { value: 'bald', label: 'Bald' },
  ],
  hairColor: [
    { value: 'jetBlack', label: 'Jet Black', color: '#121316' },
    { value: 'black', label: 'Soft Black', color: '#252126' },
    { value: 'espresso', label: 'Espresso', color: '#35251f' },
    { value: 'darkBrown', label: 'Dark Brown', color: '#4a3027' },
    { value: 'chocolate', label: 'Chocolate', color: '#5b3a2d' },
    { value: 'chestnut', label: 'Chestnut', color: '#704833' },
    { value: 'auburn', label: 'Auburn', color: '#7a3e2b' },
    { value: 'copper', label: 'Copper', color: '#a85b38' },
    { value: 'ginger', label: 'Ginger', color: '#c97948' },
    { value: 'brightRed', label: 'Bright Red', color: '#d63b32' },
    { value: 'goldenBlonde', label: 'Golden Blonde', color: '#d0ad62' },
    { value: 'ashBlonde', label: 'Ash Blonde', color: '#b7aa91' },
    { value: 'platinum', label: 'Platinum', color: '#e0d2b7' },
    { value: 'silver', label: 'Silver', color: '#aab0b6' },
    { value: 'white', label: 'White', color: '#e6e1d8' },
    { value: 'burgundy', label: 'Burgundy', color: '#6c3040' },
    { value: 'deepBlue', label: 'Deep Blue', color: '#283653' },
    { value: 'plum', label: 'Plum', color: '#5a3a5f' },
  ],
  brows: [
    { value: 'neutral', label: 'Natural' },
    { value: 'happy', label: 'Soft Arch' },
    { value: 'raised', label: 'Raised' },
    { value: 'sad', label: 'Downturned' },
    { value: 'angry', label: 'Strong' },
    { value: 'notionBrow2', label: 'Full' },
    { value: 'notionBrow3', label: 'Long Arch' },
    { value: 'notionBrow5', label: 'Sharp' },
    { value: 'notionBrow6', label: 'Sculpted' },
    { value: 'notionBrow10', label: 'Flat' },
    { value: 'notionBrow12', label: 'Tapered' },
    { value: 'notionBrow14', label: 'Bold' },
    { value: 'notionBrow15', label: 'Relaxed' },
  ],
  eyes: [
    { value: 'humble', label: 'Toon · Natural' },
    { value: 'happy', label: 'Toon · Friendly' },
    { value: 'wide', label: 'Toon · Wide' },
    { value: 'bow', label: 'Toon · Bow' },
    { value: 'wink', label: 'Toon · Wink' },
    { value: 'avaEyeDefault', label: 'Ava · Natural' },
    { value: 'avaEyeHappy', label: 'Ava · Happy' },
    { value: 'avaEyeSurprised', label: 'Ava · Surprised' },
    { value: 'avaEyeSquint', label: 'Ava · Squint' },
    { value: 'adventureEyeRound', label: 'Adventure · Round' },
    { value: 'adventureEyeSoft', label: 'Adventure · Soft' },
    { value: 'adventureEyeFocused', label: 'Adventure · Focused' },
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

const NOTION_BROWS = {
  notionBrow2: '2',
  notionBrow3: '3',
  notionBrow5: '5',
  notionBrow6: '6',
  notionBrow10: '10',
  notionBrow12: '12',
  notionBrow14: '14',
  notionBrow15: '15',
}

const NOTION_EYES = {}

const DONOR_EYES = {
  avaEyeDefault: { family: 'avataaars', variant: 'default' },
  avaEyeHappy: { family: 'avataaars', variant: 'happy' },
  avaEyeSurprised: { family: 'avataaars', variant: 'surprised' },
  avaEyeSquint: { family: 'avataaars', variant: 'squint' },
  adventureEyeRound: { family: 'adventurer', variant: 'round' },
  adventureEyeSoft: { family: 'adventurer', variant: 'soft' },
  adventureEyeFocused: { family: 'adventurer', variant: 'focused' },
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
  // Brows/eyes/glasses share the same Notion face coordinate system.
  brows: 'translate(-260 -130) scale(1.007)',
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

  // Straight 01 is intentionally asymmetric, but its rear tail was sitting too
  // far to the right of Toon Head. Shift only the rear silhouette left; keep the
  // already-good front sweep registered to the face.
  straight01: { rearTransform: 'translate(-10 39) scale(2.9 3.2)' },

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

const AVATAAARS_FRONT_SEAM_CLEANUP = new Set([
  'bob',
  'miaWallace',
])

const TOON_HEAD_OUTLINE =
  'M5 313c-20-77.5 33.5-50 33.5-50C2.7 147.2 30.5.5 197.5.5s194.8 146.7 159 262.5c0 0 53.5-27.5 33.5 50-11.1 43-51 43-51 43-6 50.4-91.5 95.5-141.5 95.5S61.9 406.4 56 356c0 0-40 0-51-43Z'
const AVATAAARS_FRONT_CLIP_X = 150
const AVATAAARS_FRONT_CLIP_WIDTH = 468
const AVATAAARS_FRONT_CLIP_BOTTOM = 365

function AvataaarsHairElement({
  node,
  color,
  keyPath,
  hideDecorative = false,
  hideLightDecorative = false,
  suppressOutline = false,
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
    if (suppressOutline) {
      delete attributes.stroke
      delete attributes.strokeWidth
      delete attributes.strokeLinejoin
      delete attributes.strokeLinecap
    } else {
      attributes.stroke = '#241b19'
      attributes.strokeWidth = '2'
      attributes.strokeLinejoin = 'round'
      attributes.strokeLinecap = 'round'
    }
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
            suppressOutline={suppressOutline}
          />
        ))}
      </g>
    )
  }

  return <path key={keyPath} {...attributes} />
}

function AvataaarsRearBackfill({ variant, color }) {
  if (!AVATAAARS_REAR_BACKFILL.has(variant)) return null

  // Avataaars long/medium hair contains a face cutout sized for its own head.
  // Toon Head is wider through the jaw, so a hair-colored copy of Toon Head's
  // silhouette sits between the donor rear hair and the face. The wide rounded
  // stroke bridges the mismatch, while the real face and front hair render over
  // it. Do not rectangular-clip this bridge: those clip edges were the blocks
  // visible beside Shaved Sides and Long Straight 01.
  return (
    <path
      d={TOON_HEAD_OUTLINE}
      transform="translate(186.5 139.5)"
      fill={color}
      stroke={color}
      strokeWidth="130"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  )
}

function AvataaarsFrontSeamCleanup({ variant, color }) {
  if (!AVATAAARS_FRONT_SEAM_CLEANUP.has(variant)) return null

  // The Toon Head image owns a dark skull outline. These six donor hairstyles
  // leave part of that outline exposed inside the hair mass. Paint only that
  // crown segment back to hair color; the donor hair renders over this next.
  const clipId = `docos-avataaars-${variant}-crown-seam-cleanup`
  return (
    <>
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <rect x="165" y="120" width="438" height="245" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <path
          d={TOON_HEAD_OUTLINE}
          transform="translate(186.5 139.5)"
          fill="none"
          stroke={color}
          strokeWidth="18"
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
  const suppressOutline =
    layer === 'front' && AVATAAARS_FRONT_SEAM_CLEANUP.has(variant)

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
              suppressOutline={suppressOutline}
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
          <rect
            x={AVATAAARS_FRONT_CLIP_X}
            y="0"
            width={AVATAAARS_FRONT_CLIP_WIDTH}
            height={frontClipBottom}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>{content}</g>
    </>
  )
}

const EYE_INK = '#4b2422'

function AvataaarsEyes({ variant }) {
  const transform = 'translate(271 377) scale(2.67)'

  if (variant === 'default') {
    return (
      <g transform={transform} fill={EYE_INK}>
        <circle cx="16" cy="14" r="6" />
        <circle cx="68" cy="14" r="6" />
      </g>
    )
  }

  if (variant === 'happy') {
    return (
      <g transform={transform}>
        <path
          d="M2.16 14.45C4.01 10.65 8.16 8 13 8c4.81 0 8.96 2.63 10.82 6.4.55 1.13-.24 2.05-1.03 1.37A15 15 0 0 0 13 12.34c-3.73 0-7.12 1.24-9.55 3.23-.9.73-1.82-.01-1.28-1.12m57.99 0C62.01 10.65 66.16 8 71 8c4.81 0 8.96 2.63 10.82 6.4.55 1.13-.24 2.05-1.03 1.37A15 15 0 0 0 71 12.34c-3.73 0-7.12 1.24-9.55 3.23-.9.73-1.82-.01-1.28-1.12"
          fill={EYE_INK}
        />
      </g>
    )
  }

  if (variant === 'surprised') {
    return (
      <g transform={transform}>
        <circle cx="16" cy="14" r="14" fill="#ffffff" />
        <circle cx="68" cy="14" r="14" fill="#ffffff" />
        <circle cx="16" cy="14" r="6" fill={EYE_INK} />
        <circle cx="68" cy="14" r="6" fill={EYE_INK} />
      </g>
    )
  }

  if (variant === 'squint') {
    return (
      <g transform={transform}>
        <ellipse cx="16" cy="12.72" rx="14" ry="7.72" fill="#ffffff" />
        <ellipse cx="68" cy="12.72" rx="14" ry="7.72" fill="#ffffff" />
        <path
          d="M18.82 20.3a25 25 0 0 1-5.64 0 6 6 0 1 1 5.64 0m52 0a25 25 0 0 1-5.64 0 6 6 0 1 1 5.64 0"
          fill={EYE_INK}
        />
      </g>
    )
  }

  return null
}

function AdventurerEyes({ variant }) {
  const transform = 'translate(256 350) scale(.818)'
  const ink = EYE_INK

  if (variant === 'round') {
    return (
      <g transform={transform}>
        <path d="M274.3 9.8c11.8 7 21 17.6 26.7 30 5.9-3.1 11.6-6.7 17.6-9.6 1.8-1 4.4.5 4 2.6.2 1.5-2 2.5-3 3.2l-16.4 9a65.7 65.7 0 0 1-39.4 82.3 66 66 0 0 1-78.5-27.5 64 64 0 0 1-9.3-33A65 65 0 0 1 229.3 2c15.2-3 31.6 0 45 7.8" fill={ink} />
        <circle cx="241.1" cy="66.2" r="59.6" fill="#ffffff" />
        <path d="M74.3 23.7a55 55 0 1 1-55.7 38.7L7.3 58c-2-.8-4-1.4-5.4-3q-.5-4 3.2-3.7c5.2 1.3 10 4.2 15.2 5.6 1.4-1.7 2.2-3.8 3.3-5.7a55 55 0 0 1 50.7-27.4" fill={ink} />
        <circle cx="71.2" cy="78.7" r="49.3" fill="#ffffff" />
        <path d="M262.6 42.2a25 25 0 0 1 27.9 24.6c-.3 4.8-1.8 9.7-4.6 13.6A25 25 0 0 1 267.3 91a24.5 24.5 0 0 1-21.8-38 25 25 0 0 1 17-10.8M92.7 55.3a23 23 0 0 1 19.7 7.5q6 6.8 5.7 16c0 12-10.7 22.8-22.8 22.3a23 23 0 0 1-22.9-22.3 23 23 0 0 1 20.3-23.5" fill={ink} />
      </g>
    )
  }

  if (variant === 'soft') {
    return (
      <g transform={transform}>
        <path d="M239.3.9a65 65 0 0 1 63.5 43.4c2.1 5.6 2.6 11.1 3.6 17-1.3 1.4-1.7 3.3-4 3-7-.4-14-2.1-21-2.3-8.8 0-17.4-.4-26.1 1-9.9 1.6-19.6 2.6-29.1 5.7A175 175 0 0 0 193.7 81c-3.4 1.7-6.5 3.8-9.9 5.3-2 .7-4.4.3-5.3-2a66 66 0 0 1 17.2-65.2A65 65 0 0 1 239.3 1" fill={ink} />
        <path d="M241.3 6.6a59 59 0 0 1 59 52.5q-22.4-4.4-45-2.5-9 1.2-17.9 2.9c-13.4 3-31.4 11-48.6 17.1l-5.8 3A60 60 0 0 1 203.5 20a59 59 0 0 1 37.8-13.4" fill="#ffffff" />
        <path d="M203.5 39.1a26 26 0 0 1 30.3 11.1c1.9 3 2.7 6 3.6 9.3-13.4 3-31.4 11-48.6 17.1-3.5-7-4.3-15.2-1.3-22.6 2.9-7 8.8-12.6 16-14.9" fill={ink} />
        <path d="M95.7 29.4a55 55 0 0 1 29.4 61.2l-2.9 1.5q-14.7-4.1-29.9-5.4a348 348 0 0 0-54 0c-7 .2-13.5 2-20.5 1.6-.8-2.4-1.7-4.8-1.7-7.5a55 55 0 0 1 79.6-51.5" fill={ink} />
        <path d="M81.5 30.4a49.6 49.6 0 0 1 38.6 55.3 83 83 0 0 0-12.3-3q-18.7-2.9-37.7-2.4c-15.1.9-31.1 2.2-46 3-1.8-1.2-2-1.3-2-3.4a49.4 49.4 0 0 1 59.5-49.4" fill="#ffffff" />
        <path d="M26 68.5a23.1 23.1 0 0 1 42.7.8c1.5 3.6 1.4 7.1 1.4 11l-5.7.3c-13.4 1-27.3 2-40.4 2.8.2-5.2-.3-10 2-14.9" fill={ink} />
      </g>
    )
  }

  if (variant === 'focused') {
    return (
      <g transform={transform}>
        <path d="M258.8 3.3a66 66 0 0 1 34 22.7c7.5-5.1 14.7-10.7 22.4-15.7l3 1.3c-.3 2.1-.2 3.6-2.2 4.9l-20 14.2a65 65 0 0 1 9.8 44c-.5 2.7-3 3.4-5.5 3.6q-29.6 1.7-59 5.4c-11 1.4-22.2 2-33.2 3.6L194.5 89c-5 .7-9.5 1.7-14.5.3a65.2 65.2 0 0 1 78.8-86.1" fill={ink} />
        <path d="M249.8 7.2a60 60 0 0 1 50.7 65.2q-7 .8-14.2 1.2c-18 1.2-36 3.3-53.8 5.4Q212 82 192 84.5l-7.3.8a59.3 59.3 0 0 1 35.4-74.9 61 61 0 0 1 29.7-3.2" fill="#ffffff" />
        <path d="M205.2 43.7c6-1 12.2-.5 17.5 2.7A25 25 0 0 1 235 69.8c-.3 3.2-1.5 6.3-2.5 9.2l-5.1.7q-18 2.6-35.4 4.8l-.6-.8a24 24 0 0 1-5.7-14.9c-.8-11.8 8-23 19.5-25.1" fill={ink} />
        <path d="M100.8 32.2A55 55 0 0 1 124.1 94c-5.3 1-10.4.5-15.8.5-24-.2-48-.1-72 1.5-5.9-.2-12.6 1.6-17.8-1.3-1-4.5-2.1-9.1-2.3-13.8-.3-10 2.2-20 6.8-29q-9.2-5.6-18.2-11.6C3 38.8 3.1 37.5 4 35.5c2.8-1 4.5.5 6.8 1.8L26 47a55.3 55.3 0 0 1 74.8-14.9" fill={ink} />
        <path d="M85.1 31.3a49.4 49.4 0 0 1 34.3 57.9l-5.6.1-38.4-.3q-20 0-40 1.6c-3.8.2-8 .7-11.6-.3-1.6-3-1.6-7.1-1.8-10.5a49 49 0 0 1 63.1-48.5" fill="#ffffff" />
        <path d="M89.3 56q6-1.5 11.8.1c8.3 2.6 14.7 10 15.6 18.7a26 26 0 0 1-2.9 14.5L75.4 89l-.3-.8a25 25 0 0 1-2.4-12.4 22 22 0 0 1 16.6-19.9" fill={ink} />
      </g>
    )
  }

  return null
}

function DonorEyes({ donor }) {
  if (!donor) return null
  if (donor.family === 'avataaars') return <AvataaarsEyes variant={donor.variant} />
  if (donor.family === 'adventurer') return <AdventurerEyes variant={donor.variant} />
  return null
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
  } else if (kind === 'brows') {
    // Imported brows should behave like Toon Head brows: their visible ink
    // follows Hair Color instead of falling back to the generic face-feature ink.
    // Recolor both fill-based and stroke-only Notion brow drawings so every
    // audition variant responds consistently.
    next = next
      .replace(/fill="#000000"/gi, `fill="${color}"`)
      .replace(/fill="black"/gi, `fill="${color}"`)
      .replace(/stroke="#000000"/gi, `stroke="${color}"`)
      .replace(/stroke="black"/gi, `stroke="${color}"`)
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
  const notionBrows = NOTION_BROWS[brows] || null
  const notionEyes = NOTION_EYES[eyes] || null
  const donorEyes = DONOR_EYES[eyes] || null

  const params = new URLSearchParams({
    seed: 'doc-os-metroline-player',
    skinColor,
    hairColor,
    clothesColor: METROLINE_OUTFIT_COLOR,
    mouthVariant: mouth,
    clothesVariant: outfit,
    beardProbability: hasFacialHair ? '100' : '0',
    eyebrowsProbability: notionBrows ? '0' : '100',
    eyesProbability: notionEyes || donorEyes ? '0' : '100',
    hairProbability: hair.avataaars ? '0' : (hair.front ? '100' : '0'),
    rearHairProbability: hair.avataaars ? '0' : (hair.rear ? '100' : '0'),
  })

  if (!notionBrows) params.set('eyebrowsVariant', brows)
  if (!notionEyes && !donorEyes) params.set('eyesVariant', eyes)
  if (!hair.avataaars && hair.front) params.set('hairVariant', hair.front)
  if (!hair.avataaars && hair.rear) params.set('rearHairVariant', hair.rear)
  if (hasFacialHair) params.set('beardVariant', facialHair)

  return {
    src: `${DICEBEAR_TOON_HEAD}?${params.toString()}`,
    skinTone,
    avataaarsHair: hair.avataaars || null,
    notionBrows,
    notionEyes,
    donorEyes,
    notionGlasses: NOTION_GLASSES[glasses] || null,
    notionAccessories: NOTION_ACCESSORIES[accessories] || null,
    hairColor: `#${hairColor}`,
  }
}

function PlayerAvatar({ appearance = DEFAULT_APPEARANCE, className = '' }) {
  const portrait = buildToonHeadPortrait(appearance)
  const hasOverlayParts = Boolean(
    portrait.avataaarsHair ||
    portrait.notionBrows ||
    portrait.notionEyes ||
    portrait.donorEyes ||
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
          <AvataaarsHair
            variant={portrait.avataaarsHair}
            color={portrait.hairColor}
            layer="rear"
          />
          <AvataaarsRearBackfill
            variant={portrait.avataaarsHair}
            color={portrait.hairColor}
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
            <AvataaarsFrontSeamCleanup
              variant={portrait.avataaarsHair}
              color={portrait.hairColor}
            />
          )}
          {portrait.avataaarsHair && (
            <AvataaarsHair
              variant={portrait.avataaarsHair}
              color={portrait.hairColor}
              layer="front"
            />
          )}
          {portrait.notionBrows && (
            <NotionPart
              assetKey="eyebrows"
              index={portrait.notionBrows}
              kind="brows"
              transform={NOTION_TRANSFORMS.brows}
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
          {portrait.donorEyes && <DonorEyes donor={portrait.donorEyes} />}
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
