import { useEffect, useId, useState } from 'react'
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
    { value: 'docRound', label: 'Round' },
    { value: 'docHooded', label: 'Hooded' },
    { value: 'docSharp', label: 'Sharp' },
    { value: 'docHeavy', label: 'Heavy Lid' },
    { value: 'docAngular', label: 'Angular' },
    { value: 'docNarrow', label: 'Narrow' },
    { value: 'docArched', label: 'Arched' },
    { value: 'docLash', label: 'Lash' },
  ],
  eyeColor: [
    { value: 'darkBrown', label: 'Dark Brown', color: '#3b281f' },
    { value: 'brown', label: 'Brown', color: '#6f4b32' },
    { value: 'hazel', label: 'Hazel', color: '#8b713f' },
    { value: 'amber', label: 'Amber', color: '#b57932' },
    { value: 'green', label: 'Green', color: '#5f7d63' },
    { value: 'blue', label: 'Blue', color: '#557f9c' },
    { value: 'gray', label: 'Gray', color: '#7d898d' },
  ],
  mouth: [
    { value: 'docNeutral', label: 'Neutral' },
    { value: 'docLightSmile', label: 'Soft Smile' },
    { value: 'docSmirk', label: 'Side Smirk' },
    { value: 'docSmile', label: 'Full Smile' },
    { value: 'docOpenSmile', label: 'Open Smile' },
    { value: 'docPout', label: 'Pout' },
    { value: 'docConcerned', label: 'Concerned' },
    { value: 'docDownturned', label: 'Downturned' },
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
  { key: 'eyeColor', label: 'Eye Color' },
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
  eyes: 'docRound',
  eyeColor: 'brown',
  mouth: 'docLightSmile',
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

const DOC_OS_MOUTHS = new Set([
  'docNeutral',
  'docLightSmile',
  'docSmirk',
  'docSmile',
  'docOpenSmile',
  'docPout',
  'docConcerned',
  'docDownturned',
])

function DocOsMouth({ variant }) {
  const ink = '#4b2422'
  const interior = '#5a2028'
  const tongue = '#d96b68'
  const teeth = '#f6f1e4'
  const lip = '#7a343d'

  const common = {
    fill: 'none',
    stroke: ink,
    strokeWidth: 3.2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  let art = null

  if (variant === 'docNeutral') {
    art = (
      <>
        <path
          d="M15 31 C25 27 33 28 40 30 C47 28 56 27 66 31 C56 36 49 38 40 38 C31 38 23 36 15 31 Z"
          fill={lip}
          fillOpacity=".5"
          stroke={ink}
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        <path d="M20 32 C31 34 50 34 61 32" {...common} strokeWidth="2.2" />
      </>
    )
  } else if (variant === 'docLightSmile') {
    art = (
      <>
        <path d="M14 27 C27 39 53 40 67 25" {...common} />
        <path d="M28 38 C37 43 48 42 55 36" {...common} strokeWidth="2.2" opacity=".6" />
      </>
    )
  } else if (variant === 'docSmirk') {
    art = (
      <>
        <path
          d="M14 32 C29 35 49 32 67 20 C59 34 49 40 36 40 C27 40 20 37 14 32 Z"
          fill={interior}
          stroke={ink}
          strokeWidth="3.2"
        />
        <path d="M22 31 C37 33 51 28 63 22 C54 31 35 35 22 31 Z" fill={teeth} />
        <path d="M56 18 C61 17 65 15 69 12" {...common} strokeWidth="2.4" />
      </>
    )
  } else if (variant === 'docSmile') {
    art = (
      <>
        <path
          d="M10 24 C25 31 54 31 71 21 C66 42 54 51 40 51 C26 51 15 41 10 24 Z"
          fill={interior}
          stroke={ink}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <path d="M14 26 C29 31 55 30 68 23 C61 32 22 34 14 26 Z" fill={teeth} />
        <path d="M27 46 C35 40 48 40 57 46 C50 51 34 52 27 46 Z" fill={tongue} />
      </>
    )
  } else if (variant === 'docOpenSmile') {
    art = (
      <>
        <path
          d="M16 17 C28 23 53 23 65 17 C69 29 66 50 55 59 C47 66 34 66 25 59 C14 50 12 29 16 17 Z"
          fill={interior}
          stroke={ink}
          strokeWidth="3.2"
        />
        <path d="M18 20 C31 25 50 25 63 20 C57 30 24 31 18 20 Z" fill={teeth} />
        <path d="M26 54 C34 46 48 46 56 54 C49 61 33 61 26 54 Z" fill={tongue} />
      </>
    )
  } else if (variant === 'docPout') {
    art = (
      <>
        <path
          d="M17 31 C25 25 33 24 40 29 C47 24 56 25 64 31 C57 40 49 44 40 44 C31 44 23 40 17 31 Z"
          fill={lip}
          stroke={ink}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M20 32 C29 35 51 35 61 32" {...common} strokeWidth="2.2" opacity=".8" />
      </>
    )
  } else if (variant === 'docConcerned') {
    art = (
      <>
        <path d="M13 32 C22 26 29 37 39 31 C49 25 57 35 68 29" {...common} />
        <path d="M25 39 C34 35 47 36 56 40" {...common} strokeWidth="2.1" opacity=".55" />
      </>
    )
  } else if (variant === 'docDownturned') {
    art = (
      <>
        <path d="M12 39 C27 20 54 19 69 39" {...common} />
        <path d="M27 32 C36 27 46 27 55 32" {...common} strokeWidth="2.2" opacity=".55" />
      </>
    )
  }

  if (!art) return null

  return (
    <svg
      x="312"
      y="471"
      width="144"
      height="88"
      viewBox="0 0 80 66"
      preserveAspectRatio="xMidYMid meet"
      overflow="visible"
    >
      {art}
    </svg>
  )
}

function DocOsEyePair({ variant, color }) {
  const clipSeed = useId().replace(/:/g, '')
  const iris = color || '#6f4b32'
  const pupil = '#241b19'
  const lid = EYE_INK
  const sclera = '#f6f1e4'

  const Eye = ({ side = 'left' }) => {
    const cx = side === 'left' ? 61 : 200
    const mirror = side === 'left' ? 1 : -1
    const x = (offset) => cx + (offset * mirror)
    const clipId = `doc-os-eye-${clipSeed}-${side}`

    // These are separate eye anatomies, not expressions of one shared template.
    const geometry = {
      docRound: {
        // Rounded/open rather than circular: keep this anatomy distinct without
        // making the character look permanently surprised.
        aperture: `M ${x(-39)} 43 C ${x(-35)} 22 ${x(-16)} 16 ${cx} 16 C ${x(19)} 16 ${x(36)} 25 ${x(39)} 43 C ${x(34)} 61 ${x(16)} 66 ${cx} 66 C ${x(-18)} 66 ${x(-35)} 59 ${x(-39)} 43 Z`,
        upper: `M ${x(-39)} 43 C ${x(-35)} 22 ${x(-16)} 16 ${cx} 16 C ${x(19)} 16 ${x(36)} 25 ${x(39)} 43`,
        lower: `M ${x(-39)} 43 C ${x(-35)} 59 ${x(-18)} 66 ${cx} 66 C ${x(18)} 66 ${x(35)} 59 ${x(39)} 43`,
        irisY: 43, irisRadius: 21, pupilRadius: 9,
      },
      docHooded: {
        aperture: `M ${x(-43)} 39 Q ${x(-5)} 22 ${x(43)} 34 L ${x(39)} 55 Q ${cx} 67 ${x(-39)} 55 Z`,
        upper: `M ${x(-43)} 39 Q ${x(-5)} 22 ${x(43)} 34`,
        lower: `M ${x(-36)} 53 Q ${cx} 66 ${x(36)} 53`,
        crease: `M ${x(-39)} 25 Q ${x(1)} 13 ${x(40)} 24`,
        irisY: 42, irisRadius: 20, pupilRadius: 8.5,
      },
      docSharp: {
        aperture: `M ${x(-45)} 34 Q ${x(-5)} 18 ${x(43)} 48 Q ${x(3)} 67 ${x(-45)} 34 Z`,
        upper: `M ${x(-45)} 34 Q ${x(-5)} 18 ${x(43)} 48`,
        lower: `M ${x(-38)} 38 Q ${x(3)} 65 ${x(43)} 48`,
        irisY: 43, irisRadius: 20, pupilRadius: 8.5,
      },
      docHeavy: {
        aperture: `M ${x(-43)} 38 Q ${cx} 17 ${x(43)} 38 Q ${x(31)} 64 ${cx} 67 Q ${x(-31)} 64 ${x(-43)} 38 Z`,
        upper: `M ${x(-43)} 38 Q ${cx} 17 ${x(43)} 38`,
        lower: `M ${x(-38)} 44 Q ${x(-29)} 65 ${cx} 67 Q ${x(29)} 65 ${x(38)} 44`,
        crease: `M ${x(-38)} 25 Q ${cx} 10 ${x(38)} 25`,
        irisY: 44, irisRadius: 21, pupilRadius: 9,
      },
      docAngular: {
        aperture: `M ${x(-42)} 39 L ${x(-13)} 12 L ${x(34)} 31 L ${x(42)} 52 L ${x(5)} 69 L ${x(-36)} 58 Z`,
        upper: `M ${x(-42)} 39 L ${x(-13)} 12 L ${x(34)} 31`,
        lower: `M ${x(-36)} 58 L ${x(5)} 69 L ${x(42)} 52`,
        irisY: 42, irisRadius: 20, pupilRadius: 8.5,
      },
      docNarrow: {
        aperture: `M ${x(-47)} 42 L ${x(-9)} 25 L ${x(45)} 39 L ${x(12)} 58 L ${x(-42)} 54 Z`,
        upper: `M ${x(-47)} 42 L ${x(-9)} 25 L ${x(45)} 39`,
        lower: `M ${x(-42)} 54 L ${x(12)} 58 L ${x(45)} 39`,
        irisY: 42, irisRadius: 18, pupilRadius: 8,
      },
      docArched: {
        aperture: `M ${x(-42)} 47 C ${x(-34)} 7 ${x(25)} 4 ${x(43)} 43 Q ${cx} 72 ${x(-42)} 47 Z`,
        upper: `M ${x(-42)} 47 C ${x(-34)} 7 ${x(25)} 4 ${x(43)} 43`,
        lower: `M ${x(-35)} 52 Q ${cx} 73 ${x(36)} 49`,
        irisY: 43, irisRadius: 21, pupilRadius: 9,
      },
      docLash: {
        aperture: `M ${x(-43)} 46 C ${x(-30)} 10 ${x(25)} 8 ${x(44)} 43 Q ${cx} 72 ${x(-43)} 46 Z`,
        upper: `M ${x(-43)} 46 C ${x(-30)} 10 ${x(25)} 8 ${x(44)} 43`,
        lower: `M ${x(-36)} 52 Q ${cx} 72 ${x(37)} 49`,
        lashes: true,
        irisY: 43, irisRadius: 21, pupilRadius: 9,
      },
    }[variant] || {
      aperture: `M ${x(-39)} 43 C ${x(-35)} 22 ${x(-16)} 16 ${cx} 16 C ${x(19)} 16 ${x(36)} 25 ${x(39)} 43 C ${x(34)} 61 ${x(16)} 66 ${cx} 66 C ${x(-18)} 66 ${x(-35)} 59 ${x(-39)} 43 Z`,
      upper: `M ${x(-39)} 43 C ${x(-35)} 22 ${x(-16)} 16 ${cx} 16 C ${x(19)} 16 ${x(36)} 25 ${x(39)} 43`,
      lower: `M ${x(-39)} 43 C ${x(-35)} 59 ${x(-18)} 66 ${cx} 66 C ${x(18)} 66 ${x(35)} 59 ${x(39)} 43`,
      irisY: 43, irisRadius: 21, pupilRadius: 9,
    }

    return (
      <g>
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <path d={geometry.aperture} />
          </clipPath>
        </defs>

        <path d={geometry.aperture} fill={sclera} />

        <g clipPath={`url(#${clipId})`}>
          <circle cx={cx} cy={geometry.irisY} r={geometry.irisRadius} fill={iris} stroke={lid} strokeWidth="2.5" />
          <circle cx={cx} cy={geometry.irisY + 1} r={geometry.pupilRadius} fill={pupil} />
        </g>

        <path d={geometry.upper} fill="none" stroke={lid} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <path d={geometry.lower} fill="none" stroke={lid} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity=".72" />

        {geometry.crease && (
          <path d={geometry.crease} fill="none" stroke={lid} strokeWidth="3" strokeLinecap="round" opacity=".55" />
        )}

        {geometry.lashes && (
          <g stroke={lid} strokeWidth="4" strokeLinecap="round">
            <path d={`M ${x(-35)} 24 L ${x(-45)} 13`} />
            <path d={`M ${x(-24)} 16 L ${x(-30)} 3`} />
            <path d={`M ${x(33)} 24 L ${x(44)} 13`} />
          </g>
        )}
      </g>
    )
  }

  return (
    <g transform="translate(253 367)">
      <Eye side="left" />
      <Eye side="right" />
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
  const docOsEyes = eyes?.startsWith('doc') ? eyes : 'docRound'
  const eyeColor = optionColor('eyeColor', appearance.eyeColor, '#6f4b32')
  const docOsMouth = DOC_OS_MOUTHS.has(mouth) ? mouth : null

  const params = new URLSearchParams({
    seed: 'doc-os-metroline-player',
    skinColor,
    hairColor,
    clothesColor: METROLINE_OUTFIT_COLOR,
    mouthVariant: docOsMouth ? 'smile' : mouth,
    mouthProbability: docOsMouth ? '0' : '100',
    clothesVariant: outfit,
    beardProbability: hasFacialHair ? '100' : '0',
    eyebrowsProbability: notionBrows ? '0' : '100',
    eyesProbability: notionEyes || docOsEyes ? '0' : '100',
    hairProbability: hair.avataaars ? '0' : (hair.front ? '100' : '0'),
    rearHairProbability: hair.avataaars ? '0' : (hair.rear ? '100' : '0'),
  })

  if (!notionBrows) params.set('eyebrowsVariant', brows)
  if (!notionEyes && !docOsEyes) params.set('eyesVariant', eyes)
  if (!hair.avataaars && hair.front) params.set('hairVariant', hair.front)
  if (!hair.avataaars && hair.rear) params.set('rearHairVariant', hair.rear)
  if (hasFacialHair) params.set('beardVariant', facialHair)

  return {
    src: `${DICEBEAR_TOON_HEAD}?${params.toString()}`,
    skinTone,
    avataaarsHair: hair.avataaars || null,
    notionBrows,
    notionEyes,
    docOsEyes,
    eyeColor: `#${eyeColor}`,
    docOsMouth,
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
    portrait.docOsEyes ||
    portrait.docOsMouth ||
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
          {portrait.docOsEyes && (
            <DocOsEyePair variant={portrait.docOsEyes} color={portrait.eyeColor} />
          )}
          {portrait.docOsMouth && <DocOsMouth variant={portrait.docOsMouth} />}
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
