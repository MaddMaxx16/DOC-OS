import { useId } from 'react'

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

const SKIN = Object.fromEntries(APPEARANCE_OPTIONS.skinTone.map(({ value, color }) => [value, color]))
const HAIR = Object.fromEntries(APPEARANCE_OPTIONS.hairColor.map(({ value, color }) => [value, color]))
const EYES = Object.fromEntries(APPEARANCE_OPTIONS.eyeColor.map(({ value, color }) => [value, color]))

const FACE_PATHS = {
  oval: 'M78 92 C78 58 99 43 130 43 C161 43 182 58 182 92 L179 154 C177 194 158 222 130 231 C102 222 83 194 81 154Z',
  round: 'M76 96 C76 60 98 46 130 46 C162 46 184 60 184 96 L181 155 C179 191 158 216 130 222 C102 216 81 191 79 155Z',
  square: 'M77 90 C77 58 98 45 130 45 C162 45 183 58 183 90 L182 158 C180 198 157 222 130 228 C103 222 80 198 78 158Z',
  long: 'M82 84 C82 51 102 39 130 39 C158 39 178 51 178 84 L176 160 C174 205 156 235 130 243 C104 235 86 205 84 160Z',
  soft: 'M78 91 C78 56 99 43 130 43 C161 43 182 56 182 91 L179 155 C177 188 163 211 147 222 L130 232 L113 222 C97 211 83 188 81 155Z',
  heart: 'M76 92 C76 55 100 42 130 45 C160 42 184 55 184 92 L179 154 C176 190 157 219 130 235 C103 219 84 190 81 154Z',
}

const FACE_SHADE_PATHS = {
  oval: 'M82 151 C91 191 106 215 130 226 C113 224 94 209 86 184 C82 172 80 160 82 151Z',
  round: 'M80 151 C88 185 104 208 130 218 C108 216 90 203 83 182 C79 169 78 158 80 151Z',
  square: 'M79 153 C87 188 103 214 130 224 C106 221 89 208 82 185 C79 173 78 162 79 153Z',
  long: 'M85 156 C91 200 106 227 130 239 C109 234 94 218 88 193 C84 177 83 165 85 156Z',
  soft: 'M82 153 C89 185 104 211 130 228 C108 221 92 206 85 183 C82 172 80 161 82 153Z',
  heart: 'M82 151 C90 189 106 218 130 231 C108 225 92 207 85 183 C82 171 80 159 82 151Z',
}

function shadeColor(hex, amount) {
  const value = hex.replace('#', '')
  const number = Number.parseInt(value, 16)
  const clamp = (channel) => Math.max(0, Math.min(255, channel + amount))
  const r = clamp((number >> 16) & 255)
  const g = clamp((number >> 8) & 255)
  const b = clamp(number & 255)
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function BackHairLayer({ style, color }) {
  if (style === 'long') {
    return (
      <path
        d="M68 102 C65 58 91 34 129 35 C168 33 195 59 192 105 L197 239 C185 250 171 254 158 251 L160 111 C153 91 108 91 99 111 L101 251 C87 254 74 249 63 239Z"
        fill={color}
      />
    )
  }

  if (style === 'bun') {
    return (
      <>
        <ellipse cx="130" cy="35" rx="27" ry="24" fill={color} />
        <path d="M78 109 C75 65 98 43 130 44 C163 43 186 65 182 109Z" fill={color} />
      </>
    )
  }

  return null
}

function FrontHairLayer({ style, color, highlight }) {
  if (style === 'bald') return null

  if (style === 'buzz') {
    return (
      <>
        <path d="M82 96 C83 61 103 48 130 48 C157 48 177 61 178 96 C159 78 101 78 82 96Z" fill={color} opacity=".94" />
        <path d="M91 73 Q130 52 169 73" fill="none" stroke={highlight} strokeWidth="3" strokeLinecap="round" opacity=".34" />
      </>
    )
  }

  if (style === 'fade') {
    return (
      <>
        <path d="M78 106 C78 63 98 44 132 45 C165 45 183 64 182 103 C165 84 151 78 128 78 C107 78 91 87 78 106Z" fill={color} />
        <path d="M84 82 C101 49 151 42 176 71 C153 60 115 60 84 82Z" fill={highlight} opacity=".36" />
        <path d="M84 93 C88 77 91 69 99 61" fill="none" stroke={highlight} strokeWidth="2.5" strokeLinecap="round" opacity=".45" />
      </>
    )
  }

  if (style === 'sidepart') {
    return (
      <>
        <path d="M76 108 C74 67 94 42 129 43 C162 39 184 62 184 101 C166 88 150 80 130 78 C112 77 95 87 76 108Z" fill={color} />
        <path d="M93 77 C111 48 150 44 176 68 C148 57 122 61 93 77Z" fill={highlight} opacity=".35" />
        <path d="M126 51 C118 62 111 71 107 82" fill="none" stroke={highlight} strokeWidth="3" strokeLinecap="round" opacity=".45" />
        <path d="M138 50 C132 60 128 67 126 77" fill="none" stroke={highlight} strokeWidth="2.2" strokeLinecap="round" opacity=".32" />
      </>
    )
  }

  if (style === 'waves') {
    return (
      <>
        <path d="M76 105 C73 75 86 52 108 50 C117 37 138 37 148 49 C171 47 187 70 183 102 C169 91 157 89 147 93 C137 80 121 80 111 92 C99 84 86 90 76 105Z" fill={color} />
        <path d="M87 72 Q100 58 114 67 T143 64 T174 72" fill="none" stroke={highlight} strokeWidth="3" strokeLinecap="round" opacity=".42" />
        <path d="M85 87 Q100 74 114 82 T143 79 T176 87" fill="none" stroke={highlight} strokeWidth="2.5" strokeLinecap="round" opacity=".30" />
      </>
    )
  }

  if (style === 'curls') {
    const curls = [
      [86, 83, 20], [104, 61, 21], [127, 56, 23], [151, 60, 22], [173, 82, 20],
      [80, 105, 17], [99, 91, 18], [124, 84, 20], [150, 88, 19], [180, 104, 17],
    ]
    return (
      <g>
        {curls.map(([cx, cy, r], index) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={index % 3 === 0 ? highlight : color} />
        ))}
        <path d="M90 71 Q110 50 129 58 T170 70" fill="none" stroke={highlight} strokeWidth="3" strokeLinecap="round" opacity=".38" />
      </g>
    )
  }

  if (style === 'bun') {
    return (
      <>
        <path d="M78 108 C76 67 98 47 130 48 C162 47 184 67 182 108 C164 86 96 86 78 108Z" fill={color} />
        <path d="M108 49 Q130 36 152 49" fill="none" stroke={highlight} strokeWidth="3" strokeLinecap="round" opacity=".34" />
        <path d="M112 27 Q130 18 148 31" fill="none" stroke={highlight} strokeWidth="3" strokeLinecap="round" opacity=".28" />
      </>
    )
  }

  if (style === 'long') {
    return (
      <>
        <path d="M75 105 C75 62 98 40 131 41 C163 40 185 63 185 103 C166 85 148 78 128 78 C109 78 92 87 75 105Z" fill={color} />
        <path d="M91 72 Q113 48 141 50 Q164 52 178 72" fill="none" stroke={highlight} strokeWidth="3" strokeLinecap="round" opacity=".34" />
        <path d="M82 115 Q78 170 83 221" fill="none" stroke={highlight} strokeWidth="2.5" strokeLinecap="round" opacity=".28" />
        <path d="M179 113 Q184 168 178 221" fill="none" stroke={highlight} strokeWidth="2.5" strokeLinecap="round" opacity=".28" />
      </>
    )
  }

  return (
    <>
      <path d="M78 105 C77 67 99 47 130 47 C161 47 183 67 182 104 C164 87 147 80 127 80 C108 80 92 88 78 105Z" fill={color} />
      <path d="M88 75 Q103 53 126 56 M111 76 Q128 50 151 58 M139 78 Q153 56 174 75" fill="none" stroke={highlight} strokeWidth="3" strokeLinecap="round" opacity=".38" />
    </>
  )
}

function BrowLayer({ style, color }) {
  const props = { fill: 'none', stroke: color, strokeLinecap: 'round' }

  if (style === 'soft') {
    return (
      <g {...props} strokeWidth="3.4" opacity=".82">
        <path d="M94 124 Q106 118 119 122" />
        <path d="M141 122 Q154 118 166 124" />
      </g>
    )
  }

  if (style === 'defined') {
    return (
      <g {...props} strokeWidth="4.5">
        <path d="M94 124 Q106 116 120 121" />
        <path d="M140 121 Q154 116 166 124" />
      </g>
    )
  }

  if (style === 'straight') {
    return (
      <g {...props} strokeWidth="4">
        <path d="M95 122 Q107 120 119 122" />
        <path d="M141 122 Q153 120 165 122" />
      </g>
    )
  }

  if (style === 'full') {
    return (
      <g {...props} strokeWidth="5.3">
        <path d="M93 124 Q106 116 120 121" />
        <path d="M140 121 Q154 116 167 124" />
      </g>
    )
  }

  return (
    <g {...props} strokeWidth="3.8">
      <path d="M94 124 Q106 117 120 122" />
      <path d="M140 122 Q154 117 166 124" />
    </g>
  )
}

function EyeLayer({ style, color, skinShadow }) {
  const shape = {
    standard: {
      left: 'M96 139 Q107 131 119 138 Q108 148 96 139Z',
      right: 'M141 138 Q153 131 164 139 Q152 148 141 138Z',
    },
    soft: {
      left: 'M96 139 Q107 133 119 139 Q108 146 96 139Z',
      right: 'M141 139 Q153 133 164 139 Q152 146 141 139Z',
    },
    narrow: {
      left: 'M96 139 Q107 135 119 139 Q108 144 96 139Z',
      right: 'M141 139 Q153 135 164 139 Q152 144 141 139Z',
    },
    round: {
      left: 'M98 139 Q107 130 117 139 Q107 149 98 139Z',
      right: 'M143 139 Q153 130 162 139 Q153 149 143 139Z',
    },
    upturned: {
      left: 'M96 140 Q107 132 120 136 Q109 147 96 140Z',
      right: 'M140 136 Q153 132 165 140 Q151 147 140 136Z',
    },
  }[style] || null

  return (
    <g>
      <path d={shape.left} fill="#f5f1e9" />
      <path d={shape.right} fill="#f5f1e9" />
      <circle cx="108" cy="139" r={style === 'round' ? 4.7 : 4.3} fill={color} />
      <circle cx="152" cy="139" r={style === 'round' ? 4.7 : 4.3} fill={color} />
      <circle cx="108" cy="139" r="2.2" fill="#111820" />
      <circle cx="152" cy="139" r="2.2" fill="#111820" />
      <circle cx="106.6" cy="137.4" r="1" fill="#ffffff" opacity=".82" />
      <circle cx="150.6" cy="137.4" r="1" fill="#ffffff" opacity=".82" />
      <path d="M96 139 Q107 131 119 138" fill="none" stroke={skinShadow} strokeWidth="1.6" strokeLinecap="round" opacity=".72" />
      <path d="M141 138 Q153 131 164 139" fill="none" stroke={skinShadow} strokeWidth="1.6" strokeLinecap="round" opacity=".72" />
      <path d="M99 149 Q108 152 117 149 M143 149 Q152 152 161 149" fill="none" stroke={skinShadow} strokeWidth="1.1" strokeLinecap="round" opacity=".18" />
    </g>
  )
}

function NoseLayer({ style, skin, shadow, highlight }) {
  if (style === 'wide') {
    return (
      <g>
        <path d="M128 147 Q126 160 123 170 Q130 177 139 171" fill="none" stroke={shadow} strokeWidth="2.1" strokeLinecap="round" opacity=".62" />
        <path d="M117 171 Q122 176 128 173 M133 173 Q140 176 145 171" fill="none" stroke={shadow} strokeWidth="1.6" strokeLinecap="round" opacity=".54" />
        <path d="M130 149 L132 166" stroke={highlight} strokeWidth="2.2" strokeLinecap="round" opacity=".28" />
      </g>
    )
  }

  if (style === 'button') {
    return (
      <g>
        <path d="M129 149 Q127 160 126 166 Q130 171 136 168" fill="none" stroke={shadow} strokeWidth="1.8" strokeLinecap="round" opacity=".52" />
        <path d="M122 168 Q130 175 139 168" fill={skin} stroke={shadow} strokeWidth="1.4" strokeLinecap="round" opacity=".72" />
        <path d="M130 151 L131 163" stroke={highlight} strokeWidth="2" strokeLinecap="round" opacity=".30" />
      </g>
    )
  }

  if (style === 'soft') {
    return (
      <g>
        <path d="M129 148 Q127 159 126 168 Q130 172 136 169" fill="none" stroke={shadow} strokeWidth="1.6" strokeLinecap="round" opacity=".43" />
        <path d="M130 151 L131 164" stroke={highlight} strokeWidth="2" strokeLinecap="round" opacity=".27" />
      </g>
    )
  }

  if (style === 'defined') {
    return (
      <g>
        <path d="M128 145 Q126 159 123 171 Q130 176 139 170" fill="none" stroke={shadow} strokeWidth="2.2" strokeLinecap="round" opacity=".64" />
        <path d="M122 172 Q130 177 140 171" fill="none" stroke={shadow} strokeWidth="1.4" strokeLinecap="round" opacity=".52" />
        <path d="M131 148 L132 166" stroke={highlight} strokeWidth="2.3" strokeLinecap="round" opacity=".34" />
      </g>
    )
  }

  return (
    <g>
      <path d="M129 146 Q127 159 125 170 Q130 174 137 170" fill="none" stroke={shadow} strokeWidth="1.9" strokeLinecap="round" opacity=".56" />
      <path d="M130 149 L131 165" stroke={highlight} strokeWidth="2.1" strokeLinecap="round" opacity=".30" />
    </g>
  )
}

function MouthLayer({ style, skinShadow }) {
  const lip = '#985b58'
  const lipDark = '#6f3e41'

  if (style === 'smile') {
    return (
      <g>
        <path d="M112 188 Q130 202 148 188 Q130 209 112 188Z" fill={lip} opacity=".9" />
        <path d="M115 189 Q130 197 145 189" fill="none" stroke="#f6e9df" strokeWidth="2.3" strokeLinecap="round" opacity=".9" />
      </g>
    )
  }

  if (style === 'full') {
    return (
      <>
        <path d="M111 188 Q122 181 130 185 Q138 181 149 188 Q139 201 130 201 Q121 201 111 188Z" fill={lip} opacity=".92" />
        <path d="M113 188 Q130 191 147 188" fill="none" stroke={lipDark} strokeWidth="1.4" opacity=".75" />
      </>
    )
  }

  if (style === 'wide') {
    return (
      <>
        <path d="M108 189 Q130 184 152 189 Q130 198 108 189Z" fill={lip} opacity=".82" />
        <path d="M111 189 Q130 191 149 189" fill="none" stroke={lipDark} strokeWidth="1.5" opacity=".68" />
      </>
    )
  }

  if (style === 'soft') {
    return (
      <>
        <path d="M114 188 Q130 183 146 188 Q130 197 114 188Z" fill={lip} opacity=".84" />
        <path d="M116 188 Q130 191 144 188" fill="none" stroke={lipDark} strokeWidth="1.3" opacity=".62" />
      </>
    )
  }

  return (
    <>
      <path d="M115 189 Q130 186 145 189" fill="none" stroke={lipDark} strokeWidth="2" strokeLinecap="round" />
      <path d="M119 194 Q130 197 141 194" fill="none" stroke={skinShadow} strokeWidth="1" strokeLinecap="round" opacity=".18" />
    </>
  )
}

function FacialHairLayer({ style, color, highlight }) {
  if (style === 'none') return null

  if (style === 'mustache') {
    return <path d="M110 180 Q120 173 130 179 Q140 173 150 180 Q141 187 130 183 Q119 187 110 180Z" fill={color} opacity=".94" />
  }

  if (style === 'goatee') {
    return (
      <>
        <path d="M111 180 Q121 173 130 179 Q139 173 149 180 Q140 186 130 183 Q120 186 111 180Z" fill={color} opacity=".94" />
        <path d="M119 198 Q130 205 141 198 L138 218 Q130 224 122 218Z" fill={color} opacity=".92" />
      </>
    )
  }

  if (style === 'beard' || style === 'fullbeard') {
    const full = style === 'fullbeard'
    return (
      <g>
        <path
          d={full
            ? 'M87 166 C91 205 105 225 130 235 C155 225 169 205 173 166 C165 178 159 194 149 205 C139 216 121 216 111 205 C101 194 95 178 87 166Z'
            : 'M91 176 C97 207 111 222 130 228 C149 222 163 207 169 176 C160 190 154 202 146 209 C137 217 123 217 114 209 C106 202 100 190 91 176Z'}
          fill={color}
          opacity={full ? '.94' : '.86'}
        />
        <path d="M101 188 Q112 216 130 222 Q148 216 159 188" fill="none" stroke={highlight} strokeWidth="2" strokeLinecap="round" opacity=".25" />
      </g>
    )
  }

  const dots = [
    [103, 181], [112, 184], [121, 187], [139, 187], [148, 184], [157, 181],
    [99, 191], [109, 195], [120, 199], [140, 199], [151, 195], [161, 191],
    [105, 204], [116, 209], [130, 212], [144, 209], [155, 204],
  ]

  return (
    <g fill={color} opacity=".42">
      {dots.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.25" />)}
    </g>
  )
}

function GlassesLayer({ style }) {
  if (style === 'none') return null

  if (style === 'round') {
    return (
      <g fill="rgba(19,37,51,.06)" stroke="#172733" strokeWidth="2.7">
        <circle cx="108" cy="139" r="14.2" /><circle cx="152" cy="139" r="14.2" />
        <path d="M122 138 Q130 134 138 138 M94 136 L81 132 M166 136 L179 132" fill="none" />
      </g>
    )
  }

  if (style === 'aviator') {
    return (
      <g fill="rgba(30,53,68,.12)" stroke="#253743" strokeWidth="2.4">
        <path d="M92 130 Q108 126 123 132 L119 151 Q108 158 98 150Z" />
        <path d="M137 132 Q152 126 168 130 L162 150 Q152 158 141 151Z" />
        <path d="M121 134 Q130 130 139 134 M92 132 L80 128 M168 132 L180 128" fill="none" />
      </g>
    )
  }

  return (
    <g fill="rgba(20,39,52,.05)" stroke="#172a37" strokeWidth="2.8">
      <rect x="92" y="127" width="33" height="25" rx="7" />
      <rect x="135" y="127" width="33" height="25" rx="7" />
      <path d="M125 136 H135 M92 133 L80 130 M168 133 L180 130" fill="none" />
    </g>
  )
}

function OutfitLayer({ style }) {
  if (style === 'buttondown') {
    return (
      <>
        <path d="M38 320 C43 268 76 239 109 232 L130 251 L151 232 C184 239 217 268 222 320Z" fill="#d7e0e6" />
        <path d="M109 232 L130 251 L117 269 L98 239Z" fill="#f2f5f7" />
        <path d="M151 232 L130 251 L143 269 L162 239Z" fill="#f2f5f7" />
        <path d="M130 252 V320" stroke="#a3b2bd" strokeWidth="2" />
        <circle cx="130" cy="280" r="1.8" fill="#8497a5" /><circle cx="130" cy="299" r="1.8" fill="#8497a5" />
        <path d="M39 306 Q74 281 103 280 M221 306 Q186 281 157 280" fill="none" stroke="#b9c6ce" strokeWidth="2" opacity=".6" />
      </>
    )
  }

  if (style === 'sweater') {
    return (
      <>
        <path d="M37 320 C43 267 78 239 109 234 Q130 247 151 234 C182 239 217 267 223 320Z" fill="#263f52" />
        <path d="M108 234 Q130 255 152 234" fill="none" stroke="#69879a" strokeWidth="5" />
        <path d="M38 305 Q77 278 103 279 M222 305 Q183 278 157 279" fill="none" stroke="#3a586d" strokeWidth="3" opacity=".65" />
      </>
    )
  }

  if (style === 'hoodie') {
    return (
      <>
        <path d="M34 320 C39 271 71 242 105 234 Q130 248 155 234 C189 242 221 271 226 320Z" fill="#111f2b" />
        <path d="M105 234 Q86 244 82 270 M155 234 Q174 244 178 270" fill="none" stroke="#263b4a" strokeWidth="6" strokeLinecap="round" />
        <path d="M108 236 Q130 257 152 236" fill="none" stroke="#3d5668" strokeWidth="4" />
        <path d="M118 249 L116 282 M142 249 L144 282" stroke="#9aaab5" strokeWidth="2" strokeLinecap="round" />
        <circle cx="116" cy="284" r="3" fill="#9aaab5" /><circle cx="144" cy="284" r="3" fill="#9aaab5" />
        <text x="191" y="292" fill="#d8a13b" fontSize="12" fontWeight="850" textAnchor="middle">M</text>
      </>
    )
  }

  return (
    <>
      <path d="M36 320 C42 267 77 239 109 234 Q130 247 151 234 C183 239 218 267 224 320Z" fill="#173c57" />
      <path d="M108 234 L130 252 L152 234 L157 246 L130 270 L103 246Z" fill="#d9e2e8" opacity=".94" />
      <path d="M130 270 V320" stroke="#2c5875" strokeWidth="2" opacity=".72" />
      <path d="M37 306 Q76 280 104 281 M223 306 Q184 280 156 281" fill="none" stroke="#27516e" strokeWidth="3" opacity=".7" />
      <text x="190" y="291" fill="#d8a13b" fontSize="12" fontWeight="850" textAnchor="middle">M</text>
    </>
  )
}

function PlayerAvatar({ appearance = DEFAULT_APPEARANCE, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const skin = SKIN[appearance.skinTone] || SKIN[DEFAULT_APPEARANCE.skinTone]
  const hair = HAIR[appearance.hairColor] || HAIR[DEFAULT_APPEARANCE.hairColor]
  const eye = EYES[appearance.eyeColor] || EYES[DEFAULT_APPEARANCE.eyeColor]
  const faceKey = FACE_PATHS[appearance.face] ? appearance.face : DEFAULT_APPEARANCE.face
  const face = FACE_PATHS[faceKey]
  const faceShade = FACE_SHADE_PATHS[faceKey]
  const skinShadow = shadeColor(skin, -42)
  const skinDeepShadow = shadeColor(skin, -62)
  const skinHighlight = shadeColor(skin, 28)
  const hairHighlight = shadeColor(hair, 24)
  const faceClipId = `doc-avatar-face-${uid}`
  const bgId = `doc-avatar-bg-${uid}`
  const glowId = `doc-avatar-glow-${uid}`
  const vignetteId = `doc-avatar-vignette-${uid}`

  return (
    <svg
      className={className}
      viewBox="0 0 260 320"
      role="img"
      aria-label="Customized Metroline employee portrait"
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#173b55" />
          <stop offset="54%" stopColor="#0b2436" />
          <stop offset="100%" stopColor="#06131e" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="24%" r="66%">
          <stop offset="0%" stopColor="#7aa2bc" stopOpacity=".28" />
          <stop offset="55%" stopColor="#254b65" stopOpacity=".08" />
          <stop offset="100%" stopColor="#06111b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={vignetteId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06111b" stopOpacity="0" />
          <stop offset="100%" stopColor="#02080d" stopOpacity=".38" />
        </linearGradient>
        <clipPath id={faceClipId}>
          <path d={face} />
        </clipPath>
      </defs>

      <rect width="260" height="320" fill={`url(#${bgId})`} />
      <rect width="260" height="320" fill={`url(#${glowId})`} />
      <path d="M-12 246 C51 221 209 221 272 246" fill="none" stroke="#d59a2f" strokeOpacity=".22" strokeWidth="2" />
      <path d="M-18 261 C54 236 206 236 278 261" fill="none" stroke="#7ca1ba" strokeOpacity=".10" strokeWidth="1" />

      <BackHairLayer style={appearance.hair} color={hair} />
      <OutfitLayer style={appearance.outfit} />

      <path d="M109 205 L108 245 Q130 262 152 245 L151 205Z" fill={skin} />
      <path d="M109 224 Q130 237 151 224 L151 240 Q130 252 109 240Z" fill={skinShadow} opacity=".16" />

      <ellipse cx="79" cy="144" rx="12" ry="20" fill={skin} />
      <ellipse cx="181" cy="144" rx="12" ry="20" fill={skin} />
      <path d="M76 137 Q81 132 84 140 Q82 151 77 153" fill="none" stroke={skinShadow} strokeWidth="1.8" strokeLinecap="round" opacity=".45" />
      <path d="M184 137 Q179 132 176 140 Q178 151 183 153" fill="none" stroke={skinShadow} strokeWidth="1.8" strokeLinecap="round" opacity=".45" />

      <path d={face} fill={skin} />
      <g clipPath={`url(#${faceClipId})`}>
        <path d={faceShade} fill={skinShadow} opacity=".18" />
        <ellipse cx="153" cy="102" rx="36" ry="71" fill={skinHighlight} opacity=".08" />
        <ellipse cx="103" cy="177" rx="22" ry="11" fill="#b65c55" opacity=".06" />
        <ellipse cx="157" cy="177" rx="22" ry="11" fill="#b65c55" opacity=".06" />
        <path d="M88 112 Q130 91 172 112" fill="none" stroke={skinDeepShadow} strokeWidth="10" opacity=".035" />
      </g>

      <FrontHairLayer style={appearance.hair} color={hair} highlight={hairHighlight} />

      <BrowLayer style={appearance.brows || DEFAULT_APPEARANCE.brows} color={hair} />
      <EyeLayer style={appearance.eyes} color={eye} skinShadow={skinShadow} />
      <NoseLayer
        style={appearance.nose}
        skin={skin}
        shadow={skinShadow}
        highlight={skinHighlight}
      />
      <MouthLayer style={appearance.mouth} skinShadow={skinShadow} />
      <FacialHairLayer style={appearance.facialHair} color={hair} highlight={hairHighlight} />
      <GlassesLayer style={appearance.glasses} />

      <path d="M100 214 Q130 229 160 214" fill="none" stroke={skinDeepShadow} strokeOpacity=".10" strokeWidth="1.8" />
      <rect width="260" height="320" fill={`url(#${vignetteId})`} pointerEvents="none" />
    </svg>
  )
}

export default PlayerAvatar
