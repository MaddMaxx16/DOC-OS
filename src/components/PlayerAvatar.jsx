import { useEffect, useId, useState } from 'react'
import { AVATAAARS_HAIR_VARIANTS, AVATAAARS_LAYERED_HAIR } from '../data/avataaarsHair'
import { MOUTH_LAB_CANDIDATES, MOUTH_LAB_OPTIONS } from '../data/mouthStyleAudition'
import {
  FACIAL_HAIR_LAB_CANDIDATES,
  FACIAL_HAIR_LAB_OPTIONS,
} from '../data/facialHairStyleAudition'
import {
  GLASSES_LAB_CANDIDATES,
  GLASSES_LAB_OPTIONS,
} from '../data/glassesStyleAudition'
import { DOC_OS_ACCESSORY_OPTIONS } from '../data/accessoryStyleAudition'
import { HEADWEAR_LAB_OPTIONS, HEADWEAR_LAB_VARIANTS } from '../data/headwearStyleAudition'
import {
  AVATAAARS_OUTFIT_OPTIONS,
  AVATAAARS_OUTFIT_VARIANTS,
} from '../data/outfitStyleAudition'

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
  clothingColor: [
    { value: 'black', label: 'Black', color: '#17191d' },
    { value: 'charcoal', label: 'Charcoal', color: '#343941' },
    { value: 'navy', label: 'Navy', color: '#18324a' },
    { value: 'blue', label: 'Blue', color: '#315f86' },
    { value: 'brown', label: 'Brown', color: '#654536' },
    { value: 'tan', label: 'Tan', color: '#a77d54' },
    { value: 'olive', label: 'Olive', color: '#68704a' },
    { value: 'forest', label: 'Forest', color: '#315744' },
    { value: 'burgundy', label: 'Burgundy', color: '#6b3443' },
    { value: 'red', label: 'Red', color: '#9a3f3f' },
    { value: 'cream', label: 'Cream', color: '#d9d1bd' },
    { value: 'white', label: 'White', color: '#e8e9e6' },
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
  mouth: MOUTH_LAB_OPTIONS,
  facialHair: FACIAL_HAIR_LAB_OPTIONS,
  glasses: GLASSES_LAB_OPTIONS,
  accessories: DOC_OS_ACCESSORY_OPTIONS,
  headwear: HEADWEAR_LAB_OPTIONS,
  outfit: [
    { value: 'shirt', label: 'Work Shirt' },
    { value: 'openJacket', label: 'Open Jacket' },
    { value: 'tShirt', label: 'Crew Tee' },
    { value: 'turtleNeck', label: 'Turtleneck' },
    { value: 'dress', label: 'Tailored Dress' },
    ...AVATAAARS_OUTFIT_OPTIONS,
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
  { key: 'headwear', label: 'Headwear' },
  { key: 'outfit', label: 'Outfit' },
  { key: 'clothingColor', label: 'Outfit Color' },
]

export const DEFAULT_APPEARANCE = {
  skinTone: 'warm',
  hair: 'sidepart',
  hairColor: 'espresso',
  brows: 'neutral',
  eyes: 'docRound',
  eyeColor: 'brown',
  mouth: 'lab-avataaars-smile',
  facialHair: 'none',
  glasses: 'none',
  accessories: 'none',
  accessorySide: 'both',
  headwear: 'none',
  outfit: 'shirt',
  clothingColor: 'navy',
}

const DICEBEAR_TOON_HEAD = 'https://api.dicebear.com/10.x/toon-head/svg'
const NOTION_ASSET_BASE =
  'https://raw.githubusercontent.com/Mayandev/notion-avatar/main/public/avatar/preview'
const NOTION_ASSET_CACHE = new Map()
const METROLINE_PORTRAIT_BACKGROUND = '0b2a45'

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

const NOTION_GLASSES_TUNING = {
  // 02 returns to the base Notion size.
  // 06 only needs a slight lift; 09 needs less overall visual mass.
  '5': { dy: -8 },
  '8': { scale: 0.9 },
}

const NOTION_ACCESSORIES = {
  notionAccessory1: '1',
  notionAccessory2: '2',
  notionAccessory3: '3',
  notionAccessory4: '4',
  notionAccessory5: '5',
  notionAccessory6: '6',
  notionAccessory7: '7',
  notionAccessory8: '8',
  notionAccessory9: '9',
  notionAccessory10: '10',
  notionAccessory11: '11',
  notionAccessory12: '12',
  notionAccessory13: '13',
  notionAccessory14: '14',
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

function normalizeMouthAttributes(attributes = {}) {
  const normalized = {}

  Object.entries(attributes).forEach(([key, rawValue]) => {
    if (key === 'style') return

    const mappedKey = {
      'fill-opacity': 'fillOpacity',
      'fill-rule': 'fillRule',
      'clip-rule': 'clipRule',
      'stroke-width': 'strokeWidth',
      'stroke-linecap': 'strokeLinecap',
      'stroke-linejoin': 'strokeLinejoin',
    }[key] || key

    let value = rawValue
    if (typeof value === 'string') {
      const lower = value.toLowerCase()
      if (
        ['#000', '#000000', 'black'].includes(lower) &&
        (mappedKey === 'fill' || mappedKey === 'stroke')
      ) {
        value = EYE_INK
      }
      if (
        ['#fff', '#ffffff', 'white'].includes(lower) &&
        mappedKey === 'fill'
      ) {
        value = '#f6f1e4'
      }
    }

    normalized[mappedKey] = value
  })

  return normalized
}

function MouthLabElement({ node, keyPath }) {
  const attributes = normalizeMouthAttributes(node.attributes)

  if (node.name === 'path') return <path key={keyPath} {...attributes} />
  if (node.name === 'circle') return <circle key={keyPath} {...attributes} />
  if (node.name === 'ellipse') return <ellipse key={keyPath} {...attributes} />
  if (node.name === 'rect') return <rect key={keyPath} {...attributes} />

  return null
}

const MOUTH_LAB_TUNING = {
  // The first audition normalized each donor's full component box. These
  // finalists need visible-art normalization instead: some source drawings use
  // only a small or off-center portion of their native box.
  'avataaars-smile': { viewBox: '18 -2 56 36' },
  'avataaars-serious': { viewBox: '20 -2 52 34' },
  // 9.7 finalist tuning from iPhone QA:
  // Persona Lips needs more horizontal presence without getting taller.
  // ADV 03/06 need less overall visual mass; ADV 09 only needs less width.
  'personas-lips': { viewBox: '-2 -1 14 10', scaleX: 1.16 },
  'adventurer-variant03': { viewBox: '42 76 96 66', scale: 0.88 },
  'adventurer-variant06': { viewBox: '16 6 130 72', scale: 0.88 },
  'adventurer-variant09': { viewBox: '-10 20 135 45', scaleX: 0.86 },
}

function MouthLabPart({ candidate }) {
  if (!candidate) return null

  const candidateKey = `${candidate.style}-${candidate.variant}`
  const tuning = MOUTH_LAB_TUNING[candidateKey] || {}
  const viewBox = tuning.viewBox || `0 0 ${candidate.width} ${candidate.height}`

  // Keep the mouth zone itself fixed on Toon Head. Candidate-specific viewBoxes
  // scale/center the visible donor artwork without stretching its proportions.
  return (
    <svg
      x="306"
      y="466"
      width="156"
      height="98"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      overflow="visible"
    >
      <g
        transform={
          tuning.scale || tuning.scaleX
            ? `translate(${candidate.width / 2} ${candidate.height / 2}) scale(${tuning.scaleX || tuning.scale || 1} ${tuning.scale || 1}) translate(${-candidate.width / 2} ${-candidate.height / 2})`
            : undefined
        }
      >
        {candidate.elements.map((node, index) => (
          <MouthLabElement
            key={`${candidate.style}-${candidate.variant}-${index}`}
            keyPath={`${candidate.style}-${candidate.variant}-${index}`}
            node={node}
          />
        ))}
      </g>
    </svg>
  )
}

const DOC_OS_ACCESSORY_COLOR = '#d0ad62'
const DOC_OS_ACCESSORY_INK = '#4b2422'
const DOC_OS_ACCESSORY_HIGHLIGHT = '#f6e7bd'

// Toon Head's eyes already map 1:1 into this 768×768 overlay. Reading the
// head's own inner-ear geometry through that same coordinate space puts the
// earlobe anchors here. All native accessories share these anchors.
const DOC_OS_EAR_ANCHORS = {
  // iPhone QA 12.7: use the lower-inner earlobe where the lobe meets the face.
  // Stud is the calibration piece; all native earrings share this piercing point.
  left: { x: 221, y: 480 },
  right: { x: 547, y: 480 },
}

function DocOsAccessoryPiece({ variant }) {
  const gold = DOC_OS_ACCESSORY_COLOR
  const ink = DOC_OS_ACCESSORY_INK
  const shine = DOC_OS_ACCESSORY_HIGHLIGHT

  switch (variant) {
    case 'docAccessoryStud':
      return (
        <>
          <circle cx="0" cy="0" r="10" fill={ink} />
          <circle cx="0" cy="0" r="7" fill={gold} />
          <circle cx="-2.5" cy="-2.5" r="2" fill={shine} />
        </>
      )

    case 'docAccessoryDiamond':
      return (
        <>
          <path d="M 0 -12 L 12 0 L 0 12 L -12 0 Z" fill={ink} />
          <path d="M 0 -8 L 8 0 L 0 8 L -8 0 Z" fill={gold} />
          <path d="M -2 -5 L 3 -1 L -1 2 Z" fill={shine} />
        </>
      )

    case 'docAccessoryBar':
      return (
        <g transform="rotate(-34)">
          <rect x="-8" y="-20" width="16" height="40" rx="8" fill={ink} />
          <rect x="-4.5" y="-16" width="9" height="32" rx="4.5" fill={gold} />
          <path d="M -2 -13 L -2 7" stroke={shine} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )

    case 'docAccessorySmallHoop':
      return (
        <g transform="translate(0 7)">
          {/* 12.10: keep the approved side-profile C, but put its entry point
              lower on the fleshy lobe. The tiny cap suggests the hoop entering
              the piercing instead of reading as a separate stud/hinge. */}
          <path
            d="M 1 -2 C -12 -5 -21 4 -22 16 C -23 29 -15 38 -5 38 C 3 38 9 29 8 18"
            fill="none"
            stroke={ink}
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 1 -2 C -12 -5 -21 4 -22 16 C -23 29 -15 38 -5 38 C 3 38 9 29 8 18"
            fill="none"
            stroke={gold}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="1" cy="-2" r="4.5" fill={ink} />
          <circle cx="1" cy="-2" r="2.25" fill={gold} />
          <path
            d="M -10 1 C -16 5 -18 11 -18 17"
            fill="none"
            stroke={shine}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )

    case 'docAccessoryMediumHoop':
      return (
        <g transform="translate(0 7)">
          {/* Built from the locked Small Hoop language: same piercing point,
              tight opening and side-profile wrap, with a larger hanging arc. */}
          <path
            d="M 1 -2 C -16 -6 -28 5 -29 21 C -30 38 -20 50 -7 50 C 5 50 12 38 11 24"
            fill="none"
            stroke={ink}
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 1 -2 C -16 -6 -28 5 -29 21 C -30 38 -20 50 -7 50 C 5 50 12 38 11 24"
            fill="none"
            stroke={gold}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="1" cy="-2" r="4.5" fill={ink} />
          <circle cx="1" cy="-2" r="2.25" fill={gold} />
          <path
            d="M -13 1 C -21 6 -24 13 -24 21"
            fill="none"
            stroke={shine}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )

    case 'docAccessoryHuggie':
      return (
        <g transform="translate(0 7)">
          {/* Huggie uses the locked side-profile piercing language, but keeps
              the arc compact and snug against the underside of the earlobe. */}
          <path
            d="M 1 -2 C -9 -4 -16 3 -17 12 C -18 22 -12 29 -4 29 C 3 29 7 23 7 15"
            fill="none"
            stroke={ink}
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 1 -2 C -9 -4 -16 3 -17 12 C -18 22 -12 29 -4 29 C 3 29 7 23 7 15"
            fill="none"
            stroke={gold}
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="1" cy="-2" r="4.25" fill={ink} />
          <circle cx="1" cy="-2" r="2.1" fill={gold} />
          <path
            d="M -8 1 C -13 5 -14 9 -14 13"
            fill="none"
            stroke={shine}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>
      )

    case 'docAccessoryDoubleHoop':
      return (
        <>
          {/* 12.18: the secondary piercing sits slightly higher and is drawn
              first, so the lower/main hoop overlaps it and reads in front. */}
          <g transform="translate(-20 -10) scale(.9)">
            <path
              d="M 1 -2 C -9 -4 -16 3 -17 12 C -18 22 -12 29 -4 29 C 3 29 7 23 7 15"
              fill="none"
              stroke={ink}
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 1 -2 C -9 -4 -16 3 -17 12 C -18 22 -12 29 -4 29 C 3 29 7 23 7 15"
              fill="none"
              stroke={gold}
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="1" cy="-2" r="4.25" fill={ink} />
            <circle cx="1" cy="-2" r="2.1" fill={gold} />
          </g>
          <g transform="translate(0 7)">
            <path
              d="M 1 -2 C -9 -4 -16 3 -17 12 C -18 22 -12 29 -4 29 C 3 29 7 23 7 15"
              fill="none"
              stroke={ink}
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 1 -2 C -9 -4 -16 3 -17 12 C -18 22 -12 29 -4 29 C 3 29 7 23 7 15"
              fill="none"
              stroke={gold}
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="1" cy="-2" r="4.25" fill={ink} />
            <circle cx="1" cy="-2" r="2.1" fill={gold} />
          </g>
        </>
      )

    case 'docAccessoryDrop':
      return (
        <>
          <circle cx="0" cy="-1" r="9" fill={ink} />
          <circle cx="0" cy="-1" r="6" fill={gold} />
          <path d="M 0 7 L 0 31" stroke={ink} strokeWidth="8" strokeLinecap="round" />
          <path d="M 0 7 L 0 31" stroke={gold} strokeWidth="4" strokeLinecap="round" />
          <circle cx="0" cy="43" r="15" fill={ink} />
          <circle cx="0" cy="43" r="10" fill={gold} />
          <circle cx="-3" cy="39" r="2.5" fill={shine} />
        </>
      )

    case 'docAccessoryChain':
      return (
        <>
          <circle cx="0" cy="-2" r="9" fill={ink} />
          <circle cx="0" cy="-2" r="5.5" fill={gold} />
          <path
            d="M 0 7 L -4 18 L 4 29 L -3 40 L 3 51"
            fill="none"
            stroke={ink}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 0 7 L -4 18 L 4 29 L -3 40 L 3 51"
            fill="none"
            stroke={gold}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M 3 49 L 16 64 L 3 79 L -10 64 Z" fill={ink} />
          <path d="M 3 55 L 10 64 L 3 73 L -4 64 Z" fill={gold} />
          <path d="M 0 58 L 4 62" stroke={shine} strokeWidth="2.5" strokeLinecap="round" />
        </>
      )

    case 'docAccessoryCuff':
      return (
        <g transform="translate(-21 -48) rotate(22) scale(.9)">
          {/* Use the exact approved 12.27 C geometry on the front layer.
              Only the final return is withheld so it can disappear behind
              the Toon Head ear; this preserves the original size/silhouette
              and overlaps the ear edge cleanly instead of creating a seam. */}
          <path
            d="M -5 -14 C -19 -13 -23 -3 -22 6 C -21 15 -15 20 -7 17"
            pathLength="100"
            strokeDasharray="82 100"
            fill="none"
            stroke={ink}
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M -5 -14 C -19 -13 -23 -3 -22 6 C -21 15 -15 20 -7 17"
            pathLength="100"
            strokeDasharray="82 100"
            fill="none"
            stroke={gold}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M -8 -10 C -15 -8 -17 -2 -17 4"
            fill="none"
            stroke={shine}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      )

    case 'docAccessoryTeardrop':
      return (
        <>
          <circle cx="0" cy="-2" r="9" fill={ink} />
          <circle cx="0" cy="-2" r="5.5" fill={gold} />
          <path d="M 0 7 L 0 22" stroke={ink} strokeWidth="8" strokeLinecap="round" />
          <path d="M 0 7 L 0 22" stroke={gold} strokeWidth="4" strokeLinecap="round" />
          <path
            d="M 0 20 C -22 42 -19 63 0 68 C 19 63 22 42 0 20 Z"
            fill={ink}
          />
          <path
            d="M 0 29 C -14 44 -12 57 0 60 C 12 57 14 44 0 29 Z"
            fill={gold}
          />
          <path d="M -3 35 C -7 42 -7 48 -3 51" fill="none" stroke={shine} strokeWidth="3" strokeLinecap="round" />
        </>
      )

    default:
      return null
  }
}

function DocOsAccessoryCuffRearPiece() {
  const gold = DOC_OS_ACCESSORY_COLOR
  const ink = DOC_OS_ACCESSORY_INK

  return (
    <g transform="translate(-21 -48) rotate(22) scale(.9)">
      <path
        d="M -5 -14 C -19 -13 -23 -3 -22 6 C -21 15 -15 20 -7 17"
        fill="none"
        stroke={ink}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M -5 -14 C -19 -13 -23 -3 -22 6 C -21 15 -15 20 -7 17"
        fill="none"
        stroke={gold}
        strokeWidth="8"
        strokeLinecap="round"
      />
    </g>
  )
}

function DocOsAccessoryCuffRearPair({ side = 'both' }) {
  const showLeft = side === 'left' || side === 'both'
  const showRight = side === 'right' || side === 'both'

  return (
    <>
      {showLeft && (
        <g transform={`translate(${DOC_OS_EAR_ANCHORS.left.x} ${DOC_OS_EAR_ANCHORS.left.y})`}>
          <DocOsAccessoryCuffRearPiece />
        </g>
      )}
      {showRight && (
        <g transform={`translate(${DOC_OS_EAR_ANCHORS.right.x} ${DOC_OS_EAR_ANCHORS.right.y}) scale(-1 1)`}>
          <DocOsAccessoryCuffRearPiece />
        </g>
      )}
    </>
  )
}

function DocOsAccessoryPair({ variant, side = 'both' }) {
  if (!variant || variant === 'none') return null

  const showLeft = side === 'left' || side === 'both'
  const showRight = side === 'right' || side === 'both'

  return (
    <>
      {showLeft && (
        <g transform={`translate(${DOC_OS_EAR_ANCHORS.left.x} ${DOC_OS_EAR_ANCHORS.left.y})`}>
          <DocOsAccessoryPiece variant={variant} />
        </g>
      )}
      {showRight && (
        <g transform={`translate(${DOC_OS_EAR_ANCHORS.right.x} ${DOC_OS_EAR_ANCHORS.right.y}) scale(-1 1)`}>
          <DocOsAccessoryPiece variant={variant} />
        </g>
      )}
    </>
  )
}

function normalizeGlassesAttributes(attributes = {}) {
  const normalized = {}

  Object.entries(attributes).forEach(([key, rawValue]) => {
    if (key === 'style') return

    const mappedKey = {
      'fill-opacity': 'fillOpacity',
      'fill-rule': 'fillRule',
      'clip-rule': 'clipRule',
      'stroke-width': 'strokeWidth',
      'stroke-linecap': 'strokeLinecap',
      'stroke-linejoin': 'strokeLinejoin',
    }[key] || key

    if (rawValue === '__FRAME_COLOR__' || rawValue === '#000000') {
      normalized[mappedKey] = EYE_INK
    } else if (rawValue === '__LENS_COLOR__') {
      normalized[mappedKey] = '#f6f1e4'
    } else {
      normalized[mappedKey] = rawValue
    }
  })

  return normalized
}

function GlassesLabElement({ node, keyPath }) {
  const attributes = normalizeGlassesAttributes(node.attributes)

  if (node.name === 'path') return <path key={keyPath} {...attributes} />
  if (node.name === 'circle') return <circle key={keyPath} {...attributes} />
  if (node.name === 'ellipse') return <ellipse key={keyPath} {...attributes} />
  if (node.name === 'rect') return <rect key={keyPath} {...attributes} />

  return null
}

const GLASSES_LAB_ZONES = {
  avataaars: { x: 232, y: 257, width: 304, height: 217 },
  lorelei: { x: 240, y: 365, width: 288, height: 132 },
  adventurer: { x: 240, y: 365, width: 288, height: 131 },
}

const GLASSES_LAB_TUNING = {
  // Physical-iPhone QA: shared Ava placement is locked. Only individual scale
  // differences live here; Kurt returns to the shared/base size.
  'avataaars-prescription01': { scale: 1.14 },
  'avataaars-prescription02': { scale: 1.08 },
}

function GlassesLabPart({ candidate, clothingColor }) {
  if (!candidate) return null

  const candidateKey = `${candidate.style}-${candidate.variant}`
  const tuning = GLASSES_LAB_TUNING[candidateKey] || {}
  const baseZone = GLASSES_LAB_ZONES[candidate.style] || {
    x: 240,
    y: 360,
    width: 288,
    height: 140,
  }
  const scale = tuning.scale || 1
  const zone = {
    x: baseZone.x + (baseZone.width * (1 - scale)) / 2,
    y: baseZone.y + (baseZone.height * (1 - scale)) / 2,
    width: baseZone.width * scale,
    height: baseZone.height * scale,
  }

  return (
    <svg
      x={zone.x}
      y={zone.y}
      width={zone.width}
      height={zone.height}
      viewBox={`0 0 ${candidate.width} ${candidate.height}`}
      preserveAspectRatio="xMidYMid meet"
      overflow="visible"
    >
      {candidate.elements.map((node, index) => (
        <GlassesLabElement
          key={`${candidate.style}-${candidate.variant}-${index}`}
          keyPath={`${candidate.style}-${candidate.variant}-${index}`}
          node={node}
          clothingColor={clothingColor}
        />
      ))}
    </svg>
  )
}

function normalizeFacialHairAttributes(attributes = {}, color) {
  const normalized = {}

  Object.entries(attributes).forEach(([key, rawValue]) => {
    if (key === 'style') return

    const mappedKey = {
      'fill-opacity': 'fillOpacity',
      'fill-rule': 'fillRule',
      'clip-rule': 'clipRule',
      'stroke-width': 'strokeWidth',
      'stroke-linecap': 'strokeLinecap',
      'stroke-linejoin': 'strokeLinejoin',
    }[key] || key

    normalized[mappedKey] = rawValue === '__HAIR_COLOR__' ? color : rawValue
  })

  return normalized
}

function FacialHairLabElement({ node, color, keyPath }) {
  const attributes = normalizeFacialHairAttributes(node.attributes, color)

  if (node.name === 'path') return <path key={keyPath} {...attributes} />
  if (node.name === 'circle') return <circle key={keyPath} {...attributes} />
  if (node.name === 'ellipse') return <ellipse key={keyPath} {...attributes} />
  if (node.name === 'rect') return <rect key={keyPath} {...attributes} />

  return null
}

const FACIAL_HAIR_LAB_ZONES = {
  avataaars: { x: 270, y: 406, width: 228, height: 226 },
  notionists: { x: 250, y: 410, width: 268, height: 205 },
}

const FACIAL_HAIR_LAB_TUNING = {
  // P2.4.4.3B.10.3 — normalize donor artwork to Toon Head's face scale.
  // Keep each style's intended silhouette (long stays long, light stays light),
  // while bringing its overall visual weight and mouth/jaw placement into the
  // same family as the native Toon facial hair.
  'avataaars-beardLight': { scaleX: 1.74, scaleY: 0.95, dy: -2 },
  'avataaars-beardMajestic': { scaleX: 1.7, scaleY: 0.93, dy: -2 },
  'avataaars-beardMedium': { scaleX: 1.74, scaleY: 0.92, dy: 2 },
  'avataaars-moustacheFancy': { scaleX: 1.06 },
  'avataaars-moustacheMagnum': { scaleX: 1.18 },
  // Notion 11/12 are authored for a three-quarter face. They remain rebuilt
  // from a mirrored half for frontal symmetry, then receive a small size lift
  // so they do not read undersized beside the Toon/Ava options.
  'notionists-variant11': {
    symmetryCenter: 293,
    centerOffsetX: -68.5,
    scale: 1.1,
    dy: -4,
    seamOverlap: 2.5,
  },
  'notionists-variant12': {
    symmetryCenter: 293,
    centerOffsetX: -68.5,
    scale: 1.15,
    dy: -4,
    seamOverlap: 2.5,
  },
}

function FacialHairLabPart({ candidate, color }) {
  const clipSeed = useId().replace(/:/g, '')
  if (!candidate) return null

  const candidateKey = `${candidate.style}-${candidate.variant}`
  const tuning = FACIAL_HAIR_LAB_TUNING[candidateKey] || {}
  const zone = FACIAL_HAIR_LAB_ZONES[candidate.style] || {
    x: 255,
    y: 410,
    width: 258,
    height: 215,
  }
  const symmetryCenter = tuning.symmetryCenter || null
  const symmetryClipId = `facial-hair-symmetry-${clipSeed}`
  const seamOverlap = tuning.seamOverlap || 0
  const centerX = candidate.width / 2
  const centerY = candidate.height / 2
  const scaleX = tuning.scaleX || tuning.scale || 1
  const scaleY = tuning.scaleY || tuning.scale || 1
  const dx = tuning.dx || 0
  const dy = tuning.dy || 0
  const contentTransform =
    dx || dy || scaleX !== 1 || scaleY !== 1
      ? `translate(${dx} ${dy}) translate(${centerX} ${centerY}) scale(${scaleX} ${scaleY}) translate(${-centerX} ${-centerY})`
      : undefined

  const renderElements = (side) => candidate.elements.map((node, index) => (
    <FacialHairLabElement
      key={`${candidate.style}-${candidate.variant}-${side}-${index}`}
      keyPath={`${candidate.style}-${candidate.variant}-${side}-${index}`}
      node={node}
      color={color}
    />
  ))

  const renderedCandidate = symmetryCenter ? (
    <>
      <defs>
        <clipPath id={symmetryClipId}>
          <rect
            x="0"
            y="0"
            width={symmetryCenter + seamOverlap}
            height={candidate.height}
          />
        </clipPath>
      </defs>
      <g transform={`translate(${tuning.centerOffsetX || 0} 0)`}>
        <g clipPath={`url(#${symmetryClipId})`}>
          {renderElements('left')}
        </g>
        <g
          transform={`translate(${symmetryCenter * 2} 0) scale(-1 1)`}
          clipPath={`url(#${symmetryClipId})`}
        >
          {renderElements('right')}
        </g>
      </g>
    </>
  ) : (
    renderElements('native')
  )

  return (
    <svg
      x={zone.x}
      y={zone.y}
      width={zone.width}
      height={zone.height}
      viewBox={`0 0 ${candidate.width} ${candidate.height}`}
      preserveAspectRatio="xMidYMid meet"
      overflow="visible"
    >
      <g transform={contentTransform}>
        {renderedCandidate}
      </g>
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

  if (kind === 'glasses') {
    next = next
      // Notion 02/04/09: long one-sided temple arm.
      .replace(/<line\b[^>]*rotate\(1\.361411\)[^>]*><\/line>/gi, '')
      // Notion 06: the same 3/4 temple arm is authored as a filled polygon.
      .replace(/<polygon\b[^>]*points="199 9 4 41 0 50 199 30"[^>]*><\/polygon>/gi, '')
  }

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

const HEADWEAR_LAB_TUNING = {
  // P2.4.4.3B.15.6 — final keeper-set fitting.
  // The fancy Brimmed Hat needs a lower seat than the winter hats.
  'hat': { transform: 'translate(8 90) scale(2.85 2.90)' },
  'winterHat1': { transform: 'translate(8 65) scale(2.85 2.90)' },
  'winterHat02': { transform: 'translate(8 65) scale(2.85 2.90)' },
  'winterHat03': { transform: 'translate(8 65) scale(2.85 2.90)' },
  'winterHat04': { transform: 'translate(8 65) scale(2.85 2.90)' },
  'notionists-hat': { transform: 'translate(128 95) scale(.56)' },
  'open-peeps-hatHip': { transform: 'translate(89 90) scale(.60)' },
}

function HeadwearLabElement({ node, keyPath }) {
  const normalized = {}

  Object.entries(node.attributes || {}).forEach(([key, rawValue]) => {
    if (key === 'style') return

    const mappedKey = {
      'fill-opacity': 'fillOpacity',
      'fill-rule': 'fillRule',
      'clip-rule': 'clipRule',
      'stroke-width': 'strokeWidth',
      'stroke-linecap': 'strokeLinecap',
      'stroke-linejoin': 'strokeLinejoin',
    }[key] || key

    if (rawValue && typeof rawValue === 'object' && rawValue.type === 'color') {
      normalized[mappedKey] = {
        hat: '#315f86',
        clothing: '#315f86',
        paper: '#315f86',
        ink: '#241b19',
        skin: '#dfaa86',
      }[rawValue.name] || '#315f86'
    } else {
      normalized[mappedKey] = rawValue
    }
  })

  const children = (node.children || []).map((child, index) => (
    <HeadwearLabElement
      key={`${keyPath}-${index}`}
      keyPath={`${keyPath}-${index}`}
      node={child}
    />
  ))

  if (node.name === 'path') return <path key={keyPath} {...normalized}>{children}</path>
  if (node.name === 'circle') return <circle key={keyPath} {...normalized}>{children}</circle>
  if (node.name === 'ellipse') return <ellipse key={keyPath} {...normalized}>{children}</ellipse>
  if (node.name === 'rect') return <rect key={keyPath} {...normalized}>{children}</rect>
  if (node.name === 'g') return <g key={keyPath} {...normalized}>{children}</g>
  return null
}

function HeadwearLabPart({ variant }) {
  const candidate = HEADWEAR_LAB_VARIANTS[variant]
  if (!candidate) return null

  const transform = HEADWEAR_LAB_TUNING[variant]?.transform || AVATAAARS_HAIR_TRANSFORM

  return (
    <g transform={transform}>
      {candidate.elements.map((node, index) => (
        <HeadwearLabElement
          key={`headwear-${variant}-${index}`}
          keyPath={`headwear-${variant}-${index}`}
          node={node}
        />
      ))}
    </g>
  )
}

function normalizeOutfitLabAttributes(attributes = {}, clothingColor) {
  const normalized = {}

  Object.entries(attributes).forEach(([key, rawValue]) => {
    if (key === 'style') return

    const mappedKey = {
      'fill-opacity': 'fillOpacity',
      'fill-rule': 'fillRule',
      'clip-rule': 'clipRule',
      'stroke-width': 'strokeWidth',
      'stroke-linecap': 'strokeLinecap',
      'stroke-linejoin': 'strokeLinejoin',
    }[key] || key

    if (
      rawValue &&
      typeof rawValue === 'object' &&
      rawValue.type === 'color' &&
      rawValue.name === 'clothes'
    ) {
      normalized[mappedKey] = clothingColor
    } else {
      normalized[mappedKey] = rawValue
    }
  })

  return normalized
}

function OutfitLabElement({ node, keyPath, clothingColor }) {
  const attributes = normalizeOutfitLabAttributes(node.attributes, clothingColor)

  if (node.name === 'path') return <path key={keyPath} {...attributes} />
  if (node.name === 'circle') return <circle key={keyPath} {...attributes} />
  if (node.name === 'ellipse') return <ellipse key={keyPath} {...attributes} />
  if (node.name === 'rect') return <rect key={keyPath} {...attributes} />
  if (node.name === 'g') {
    return (
      <g key={keyPath} {...attributes}>
        {(node.children || []).map((child, index) => (
          <OutfitLabElement
            key={`${keyPath}-${index}`}
            keyPath={`${keyPath}-${index}`}
            node={child}
            clothingColor={clothingColor}
          />
        ))}
      </g>
    )
  }

  return null
}

function OutfitLabPart({ variant, clothingColor }) {
  const candidate = AVATAAARS_OUTFIT_VARIANTS[variant]
  if (!candidate) return null

  return (
    <svg
      // P2.4.4.3B.13.8 — lock the approved shared donor fit from 13.5.
      // Variant-specific neckline cleanup now lives with the donor geometry.
      x="149"
      y="600"
      width="470"
      height="181"
      viewBox="0 0 200 95.31"
      preserveAspectRatio="none"
      overflow="visible"
    >
      {candidate.elements.map((node, index) => (
        <OutfitLabElement
          key={`outfitlab-${variant}-${index}`}
          keyPath={`outfitlab-${variant}-${index}`}
          node={node}
          clothingColor={clothingColor}
        />
      ))}
    </svg>
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
  const accessorySide = ['left', 'both', 'right'].includes(appearance.accessorySide)
    ? appearance.accessorySide
    : DEFAULT_APPEARANCE.accessorySide
  const headwear = validOption('headwear', appearance.headwear, DEFAULT_APPEARANCE.headwear)
  const outfit = validOption('outfit', appearance.outfit, DEFAULT_APPEARANCE.outfit)
  const clothingColorChoice = validOption(
    'clothingColor',
    appearance.clothingColor,
    DEFAULT_APPEARANCE.clothingColor,
  )
  const clothingColor = optionColor('clothingColor', clothingColorChoice, '#18324a')
  const outfitLab = outfit.startsWith('outfitlab-avataaars-')
    ? outfit.slice('outfitlab-avataaars-'.length)
    : null
  const nativeOutfit = outfitLab ? DEFAULT_APPEARANCE.outfit : outfit

  const hair = HAIR_CONFIG[hairChoice] || HAIR_CONFIG[DEFAULT_APPEARANCE.hair]
  const hairColor = optionColor('hairColor', hairColorChoice, '#35251f')
  const skinColor = optionColor('skinTone', skinTone, '#c98962')
  const facialHairLab = facialHair.startsWith('faciallab-')
    ? FACIAL_HAIR_LAB_CANDIDATES[facialHair.slice('faciallab-'.length)] || null
    : null
  const glassesLab = glasses.startsWith('glasseslab-')
    ? GLASSES_LAB_CANDIDATES[glasses.slice('glasseslab-'.length)] || null
    : null
  const docOsAccessory = accessories.startsWith('docAccessory')
    ? accessories
    : null
  const hasNativeFacialHair = facialHair !== 'none' && !facialHairLab
  const notionBrows = NOTION_BROWS[brows] || null
  const notionEyes = NOTION_EYES[eyes] || null
  const docOsEyes = eyes?.startsWith('doc') ? eyes : 'docRound'
  const eyeColor = optionColor('eyeColor', appearance.eyeColor, '#6f4b32')
  const mouthLab = mouth.startsWith('lab-')
    ? MOUTH_LAB_CANDIDATES[mouth.slice(4)] || null
    : null

  const params = new URLSearchParams({
    seed: 'doc-os-metroline-player',
    skinColor,
    hairColor,
    clothesColor: clothingColor,
    mouthVariant: 'smile',
    mouthProbability: mouthLab ? '0' : '100',
    clothesVariant: nativeOutfit,
    clothesProbability: outfitLab ? '0' : '100',
    beardProbability: hasNativeFacialHair ? '100' : '0',
    eyebrowsProbability: notionBrows ? '0' : '100',
    eyesProbability: notionEyes || docOsEyes ? '0' : '100',
    hairProbability: hair.avataaars ? '0' : (hair.front ? '100' : '0'),
    rearHairProbability: hair.avataaars ? '0' : (hair.rear ? '100' : '0'),
  })

  if (!notionBrows) params.set('eyebrowsVariant', brows)
  if (!notionEyes && !docOsEyes) params.set('eyesVariant', eyes)
  if (!hair.avataaars && hair.front) params.set('hairVariant', hair.front)
  if (!hair.avataaars && hair.rear) params.set('rearHairVariant', hair.rear)
  if (hasNativeFacialHair) params.set('beardVariant', facialHair)

  return {
    src: `${DICEBEAR_TOON_HEAD}?${params.toString()}`,
    skinTone,
    avataaarsHair: hair.avataaars || null,
    notionBrows,
    notionEyes,
    docOsEyes,
    eyeColor: `#${eyeColor}`,
    mouthLab,
    facialHairLab,
    glassesLab,
    docOsAccessory,
    accessorySide,
    headwearLab: headwear.startsWith('headwearlab-') ? headwear.slice('headwearlab-'.length) : null,
    outfitLab,
    clothingColor: `#${clothingColor}`,
    notionGlasses: glassesLab ? null : NOTION_GLASSES[glasses] || null,
    notionAccessories: docOsAccessory ? null : NOTION_ACCESSORIES[accessories] || null,
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
    portrait.mouthLab ||
    portrait.facialHairLab ||
    portrait.glassesLab ||
    portrait.outfitLab ||
    portrait.headwearLab ||
    portrait.docOsAccessory ||
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

      {portrait.docOsAccessory === 'docAccessoryCuff' && (
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
          <DocOsAccessoryCuffRearPair side={portrait.accessorySide} />
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
          {portrait.headwearLab && <HeadwearLabPart variant={portrait.headwearLab} />}
          {portrait.outfitLab && (
            <OutfitLabPart
              variant={portrait.outfitLab}
              clothingColor={portrait.clothingColor}
            />
          )}
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
          {portrait.mouthLab && <MouthLabPart candidate={portrait.mouthLab} />}
          {portrait.facialHairLab && (
            <FacialHairLabPart
              candidate={portrait.facialHairLab}
              color={portrait.hairColor}
            />
          )}
          {portrait.glassesLab && (
            <GlassesLabPart candidate={portrait.glassesLab} clothingColor={portrait.clothingColor} />
          )}
          {portrait.notionGlasses && (() => {
            const tuning = NOTION_GLASSES_TUNING[portrait.notionGlasses]
            const part = (
              <NotionPart
                assetKey="glasses"
                index={portrait.notionGlasses}
                kind="glasses"
                transform={NOTION_TRANSFORMS.glasses}
              />
            )

            if (!tuning) return part

            const scale = tuning.scale || 1
            const dy = tuning.dy || 0
            const transform = [
              dy ? `translate(0 ${dy})` : '',
              scale !== 1
                ? `translate(384 420) scale(${scale}) translate(-384 -420)`
                : '',
            ].filter(Boolean).join(' ')

            return transform ? <g transform={transform}>{part}</g> : part
          })()}
          {portrait.docOsAccessory && (
            <DocOsAccessoryPair
              variant={portrait.docOsAccessory}
              side={portrait.accessorySide}
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
