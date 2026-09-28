export const APPEARANCE_OPTIONS = {
  skinTone: [
    { value: 'porcelain', label: 'Porcelain', color: '#f4cfb7' },
    { value: 'light', label: 'Light', color: '#e7b896' },
    { value: 'warm', label: 'Warm', color: '#cf946d' },
    { value: 'tan', label: 'Tan', color: '#ad704e' },
    { value: 'brown', label: 'Brown', color: '#7f4d36' },
    { value: 'deep', label: 'Deep', color: '#4e2f27' },
  ],
  face: [
    { value: 'oval', label: 'Oval' },
    { value: 'round', label: 'Round' },
    { value: 'square', label: 'Square' },
    { value: 'long', label: 'Long' },
  ],
  hair: [
    { value: 'crop', label: 'Crop' },
    { value: 'fade', label: 'Fade' },
    { value: 'sidepart', label: 'Side Part' },
    { value: 'waves', label: 'Waves' },
    { value: 'curls', label: 'Curls' },
    { value: 'bun', label: 'Bun' },
    { value: 'long', label: 'Long' },
    { value: 'buzz', label: 'Buzz' },
  ],
  hairColor: [
    { value: 'black', label: 'Black', color: '#17191e' },
    { value: 'espresso', label: 'Espresso', color: '#35251f' },
    { value: 'brown', label: 'Brown', color: '#624333' },
    { value: 'auburn', label: 'Auburn', color: '#7a3e2b' },
    { value: 'blonde', label: 'Blonde', color: '#c7a565' },
    { value: 'silver', label: 'Silver', color: '#aab0b6' },
  ],
  eyes: [
    { value: 'standard', label: 'Standard' },
    { value: 'soft', label: 'Soft' },
    { value: 'narrow', label: 'Narrow' },
    { value: 'round', label: 'Round' },
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
  ],
  mouth: [
    { value: 'neutral', label: 'Neutral' },
    { value: 'soft', label: 'Soft Smile' },
    { value: 'full', label: 'Full' },
    { value: 'smile', label: 'Smile' },
  ],
  facialHair: [
    { value: 'none', label: 'None' },
    { value: 'stubble', label: 'Stubble' },
    { value: 'mustache', label: 'Mustache' },
    { value: 'beard', label: 'Short Beard' },
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
  ],
}

export const APPEARANCE_CATEGORIES = [
  { key: 'skinTone', label: 'Skin' },
  { key: 'face', label: 'Face' },
  { key: 'hair', label: 'Hair' },
  { key: 'hairColor', label: 'Hair Color' },
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
  eyes: 'standard',
  eyeColor: 'brown',
  nose: 'straight',
  mouth: 'soft',
  facialHair: 'none',
  glasses: 'none',
  outfit: 'polo',
}

const SKIN = Object.fromEntries(APPEARANCE_OPTIONS.skinTone.map(({ value, color }) => [value, color]))
const HAIR = Object.fromEntries(APPEARANCE_OPTIONS.hairColor.map(({ value, color }) => [value, color]))
const EYES = Object.fromEntries(APPEARANCE_OPTIONS.eyeColor.map(({ value, color }) => [value, color]))

const facePath = {
  oval: 'M78 91 C78 47 182 47 182 91 L178 157 C175 205 151 231 130 235 C109 231 85 205 82 157 Z',
  round: 'M77 96 C77 52 183 52 183 96 L180 158 C177 201 153 224 130 226 C107 224 83 201 80 158 Z',
  square: 'M78 90 C78 55 182 55 182 90 L181 166 C178 208 155 230 130 232 C105 230 82 208 79 166 Z',
  long: 'M82 82 C82 43 178 43 178 82 L176 164 C173 216 151 244 130 247 C109 244 87 216 84 164 Z',
}

function HairLayer({ style, color }) {
  if (style === 'buzz') {
    return <path d="M82 101 C82 56 178 56 178 101 C163 78 99 78 82 101Z" fill={color} opacity=".92" />
  }

  if (style === 'fade') {
    return (
      <>
        <path d="M78 111 C78 58 180 51 182 105 C164 84 148 76 119 78 C100 80 88 91 78 111Z" fill={color} />
        <path d="M82 91 C96 58 152 49 177 80 C145 70 112 73 82 91Z" fill={color} opacity=".72" />
      </>
    )
  }

  if (style === 'sidepart') {
    return (
      <>
        <path d="M77 112 C76 64 109 47 142 52 C169 56 183 74 183 105 C159 88 135 78 91 94Z" fill={color} />
        <path d="M119 57 C139 54 165 61 179 79 C151 68 131 69 108 76Z" fill={color} opacity=".72" />
      </>
    )
  }

  if (style === 'waves') {
    return (
      <path
        d="M77 108 C73 78 88 57 111 55 C120 42 139 43 147 54 C167 52 184 72 183 102 C168 90 158 88 147 91 C137 80 121 80 112 91 C100 84 87 91 77 108Z"
        fill={color}
      />
    )
  }

  if (style === 'curls') {
    return (
      <g fill={color}>
        <circle cx="92" cy="82" r="22" /><circle cx="113" cy="66" r="24" />
        <circle cx="139" cy="65" r="25" /><circle cx="165" cy="82" r="22" />
        <circle cx="84" cy="105" r="18" /><circle cx="176" cy="105" r="18" />
      </g>
    )
  }

  if (style === 'bun') {
    return (
      <>
        <circle cx="130" cy="42" r="25" fill={color} />
        <path d="M78 112 C76 68 98 53 130 55 C162 53 184 68 182 112 C164 87 96 87 78 112Z" fill={color} />
      </>
    )
  }

  if (style === 'long') {
    return (
      <>
        <path d="M75 106 C72 58 101 45 130 47 C159 45 188 58 185 106 L191 217 L164 217 L164 104 C149 85 111 85 96 104 L96 217 L69 217Z" fill={color} />
        <path d="M78 104 C80 64 104 52 132 53 C158 53 178 67 182 101 C154 84 108 83 78 104Z" fill={color} opacity=".8" />
      </>
    )
  }

  return <path d="M79 107 C78 63 103 51 131 52 C160 51 181 66 182 105 C159 88 105 87 79 107Z" fill={color} />
}

function EyeLayer({ style, color }) {
  const ry = style === 'narrow' ? 2.6 : style === 'round' ? 5.4 : 4
  const rx = style === 'soft' ? 7.5 : style === 'round' ? 5.4 : 6.4

  return (
    <>
      <ellipse cx="108" cy="139" rx={rx} ry={ry} fill="#f3f1ec" opacity=".92" />
      <ellipse cx="152" cy="139" rx={rx} ry={ry} fill="#f3f1ec" opacity=".92" />
      <circle cx="108" cy="139" r="3.2" fill={color} />
      <circle cx="152" cy="139" r="3.2" fill={color} />
      <circle cx="108" cy="139" r="1.35" fill="#111820" />
      <circle cx="152" cy="139" r="1.35" fill="#111820" />
      {style === 'soft' && (
        <>
          <path d="M98 136 Q108 131 118 136" fill="none" stroke="#3b2a24" strokeWidth="2" strokeLinecap="round" opacity=".6" />
          <path d="M142 136 Q152 131 162 136" fill="none" stroke="#3b2a24" strokeWidth="2" strokeLinecap="round" opacity=".6" />
        </>
      )}
    </>
  )
}

function NoseLayer({ style, skin }) {
  const stroke = '#6d4435'

  if (style === 'wide') {
    return <path d="M124 146 L120 170 Q130 177 140 170" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" opacity=".45" />
  }

  if (style === 'button') {
    return <path d="M128 148 L125 166 Q130 171 136 166" fill={skin} stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity=".55" />
  }

  if (style === 'soft') {
    return <path d="M129 147 Q126 160 126 167 Q130 172 136 168" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" opacity=".38" />
  }

  return <path d="M130 145 L126 169 Q130 173 136 169" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity=".48" />
}

function MouthLayer({ style }) {
  const stroke = '#7f4a48'

  if (style === 'smile') {
    return <path d="M113 188 Q130 201 147 188" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
  }

  if (style === 'full') {
    return (
      <>
        <path d="M113 188 Q130 180 147 188 Q130 199 113 188Z" fill="#9d5d5f" opacity=".88" />
        <path d="M115 188 H145" stroke="#6f3e41" strokeWidth="1.4" opacity=".7" />
      </>
    )
  }

  if (style === 'soft') {
    return <path d="M115 188 Q130 194 145 187" fill="none" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
  }

  return <path d="M116 189 Q130 187 144 189" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
}

function FacialHairLayer({ style, color }) {
  if (style === 'none') return null

  if (style === 'mustache') {
    return <path d="M111 180 Q121 172 130 179 Q139 172 149 180 Q141 186 130 183 Q119 186 111 180Z" fill={color} opacity=".9" />
  }

  if (style === 'beard') {
    return (
      <path
        d="M91 171 C96 213 112 229 130 234 C148 229 164 213 169 171 C161 184 154 197 147 205 C138 214 122 214 113 205 C106 197 99 184 91 171Z"
        fill={color}
        opacity=".82"
      />
    )
  }

  return (
    <g fill={color} opacity=".38">
      {Array.from({ length: 18 }, (_, index) => {
        const row = Math.floor(index / 6)
        const col = index % 6
        return <circle key={index} cx={105 + col * 10 + (row % 2) * 4} cy={188 + row * 9} r="1.4" />
      })}
    </g>
  )
}

function GlassesLayer({ style }) {
  if (style === 'none') return null

  if (style === 'round') {
    return (
      <g fill="none" stroke="#233544" strokeWidth="3">
        <circle cx="108" cy="139" r="14" /><circle cx="152" cy="139" r="14" />
        <path d="M122 139 H138 M94 136 L82 132 M166 136 L178 132" />
      </g>
    )
  }

  if (style === 'aviator') {
    return (
      <g fill="rgba(42,65,80,.12)" stroke="#293b48" strokeWidth="2.6">
        <path d="M92 131 Q108 126 123 133 L119 150 Q108 158 98 150Z" />
        <path d="M137 133 Q152 126 168 131 L162 150 Q152 158 141 150Z" />
        <path d="M121 135 Q130 130 139 135" fill="none" />
      </g>
    )
  }

  return (
    <g fill="none" stroke="#243744" strokeWidth="3">
      <rect x="93" y="127" width="31" height="24" rx="6" />
      <rect x="136" y="127" width="31" height="24" rx="6" />
      <path d="M124 136 H136 M93 133 L81 130 M167 133 L179 130" />
    </g>
  )
}

function OutfitLayer({ style }) {
  if (style === 'buttondown') {
    return (
      <>
        <path d="M48 320 C53 268 82 238 111 234 L130 254 L149 234 C178 238 207 268 212 320Z" fill="#d9e1e7" />
        <path d="M111 234 L130 254 L118 269 L101 241Z" fill="#f3f6f8" />
        <path d="M149 234 L130 254 L142 269 L159 241Z" fill="#f3f6f8" />
        <path d="M130 254 V320" stroke="#a6b4be" strokeWidth="2" />
      </>
    )
  }

  if (style === 'sweater') {
    return (
      <>
        <path d="M46 320 C52 267 84 239 111 235 Q130 248 149 235 C176 239 208 267 214 320Z" fill="#263f52" />
        <path d="M111 235 Q130 257 149 235" fill="none" stroke="#66859b" strokeWidth="5" />
      </>
    )
  }

  return (
    <>
      <path d="M46 320 C52 267 84 239 111 235 Q130 247 149 235 C176 239 208 267 214 320Z" fill="#173c57" />
      <path d="M112 235 L130 252 L148 235 L154 246 L130 269 L106 246Z" fill="#d7e0e7" opacity=".9" />
      <path d="M130 269 V320" stroke="#2b5674" strokeWidth="2" opacity=".7" />
      <text x="176" y="291" fill="#d8a13b" fontSize="12" fontWeight="800" textAnchor="middle">M</text>
    </>
  )
}

function PlayerAvatar({ appearance = DEFAULT_APPEARANCE, className = '' }) {
  const skin = SKIN[appearance.skinTone] || SKIN[DEFAULT_APPEARANCE.skinTone]
  const hair = HAIR[appearance.hairColor] || HAIR[DEFAULT_APPEARANCE.hairColor]
  const eye = EYES[appearance.eyeColor] || EYES[DEFAULT_APPEARANCE.eyeColor]
  const face = facePath[appearance.face] || facePath.oval

  return (
    <svg
      className={className}
      viewBox="0 0 260 320"
      role="img"
      aria-label="Customized dispatcher portrait"
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <linearGradient id="doc-avatar-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#15344a" />
          <stop offset="100%" stopColor="#07131e" />
        </linearGradient>
        <radialGradient id="doc-avatar-glow" cx="50%" cy="28%" r="68%">
          <stop offset="0%" stopColor="#4f7894" stopOpacity=".24" />
          <stop offset="100%" stopColor="#06111b" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="260" height="320" fill="url(#doc-avatar-bg)" />
      <rect width="260" height="320" fill="url(#doc-avatar-glow)" />
      <path d="M0 238 C62 219 198 219 260 238" fill="none" stroke="#d59a2f" strokeOpacity=".16" strokeWidth="2" />

      <OutfitLayer style={appearance.outfit} />

      <path d="M112 210 L110 247 Q130 262 150 247 L148 210Z" fill={skin} />
      <ellipse cx="80" cy="143" rx="11" ry="19" fill={skin} />
      <ellipse cx="180" cy="143" rx="11" ry="19" fill={skin} />
      <path d={face} fill={skin} />

      <HairLayer style={appearance.hair} color={hair} />

      <path d="M96 123 Q108 118 119 123" fill="none" stroke={hair} strokeWidth="4" strokeLinecap="round" opacity=".85" />
      <path d="M141 123 Q152 118 164 123" fill="none" stroke={hair} strokeWidth="4" strokeLinecap="round" opacity=".85" />

      <EyeLayer style={appearance.eyes} color={eye} />
      <NoseLayer style={appearance.nose} skin={skin} />
      <MouthLayer style={appearance.mouth} />
      <FacialHairLayer style={appearance.facialHair} color={hair} />
      <GlassesLayer style={appearance.glasses} />

      <path d="M89 215 Q130 243 171 215" fill="none" stroke="#4a2f28" strokeOpacity=".12" strokeWidth="2" />
    </svg>
  )
}

export default PlayerAvatar
