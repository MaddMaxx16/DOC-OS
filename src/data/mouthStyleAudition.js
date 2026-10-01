// P2.4.4.3B.9.5 — temporary cross-library mouth audition data.
// Sources: DiceBear official style definitions.
// Avataaars: Pablo Stanley, free for personal/commercial use.
// Micah: Micah Lanier, CC BY 4.0.
// Personas: Draftbit, CC BY 4.0.
// Adventurer: Lisa Wischofsky, CC BY 4.0.
// Keep source attribution/license notes if any candidates survive the audition.

export const MOUTH_LAB_OPTIONS = [
  { value: 'lab-avataaars-smile', label: 'Smile' },
  { value: 'lab-avataaars-serious', label: 'Serious' },
  { value: 'lab-avataaars-concerned', label: 'Concerned' },
  { value: 'lab-avataaars-grimace', label: 'Grimace' },
  { value: 'lab-micah-nervous', label: 'Nervous' },
  { value: 'lab-adventurer-variant03', label: 'Expression 01' },
  { value: 'lab-adventurer-variant06', label: 'Expression 02' },
  { value: 'lab-adventurer-variant09', label: 'Expression 03' },
]

export const MOUTH_LAB_CANDIDATES = {
  "avataaars-default": {
    "style": "avataaars",
    "variant": "default",
    "width": 92,
    "height": 38,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M32 9a14 14 0 0 0 28 0",
          "fill": "#000000",
          "fill-opacity": ".7",
          "fill-rule": "evenodd",
          "clip-rule": "evenodd"
        }
      }
    ]
  },
  "avataaars-smile": {
    "style": "avataaars",
    "variant": "smile",
    "width": 92,
    "height": 38,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M27.12 9.13a19 19 0 0 0 37.77-.09c.08-.77-.77-2.04-1.85-2.04H29.1C28 7 27 8.18 27.12 9.13",
          "fill": "#000000",
          "fill-opacity": ".7",
          "fill-rule": "evenodd",
          "clip-rule": "evenodd"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M62 7H31a5 5 0 0 0 5 5h21a5 5 0 0 0 5-5",
          "fill": "#ffffff"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M58.7 21.14A11 11 0 0 0 46 19.2a10.95 10.95 0 0 0-12.7 1.94A19 19 0 0 0 46 26c4.88 0 9.33-1.84 12.7-4.86",
          "fill": "#ff4f6d"
        }
      }
    ]
  },
  "avataaars-serious": {
    "style": "avataaars",
    "variant": "serious",
    "width": 92,
    "height": 38,
    "elements": [
      {
        "name": "rect",
        "attributes": {
          "width": "24",
          "height": "6",
          "rx": "3",
          "fill": "#000000",
          "fill-opacity": ".7",
          "x": "34",
          "y": "12"
        }
      }
    ]
  },
  "avataaars-concerned": {
    "style": "avataaars",
    "variant": "concerned",
    "width": 92,
    "height": 38,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M27.12 23.87a19 19 0 0 1 37.77.09c.08.77-.77 2.04-1.85 2.04H29.1c-1.1 0-2.1-1.18-1.98-2.13",
          "fill": "#000000",
          "fill-opacity": ".7",
          "fill-rule": "evenodd",
          "clip-rule": "evenodd"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M61.59 26H30.4A11 11 0 0 1 46 19.2 11 11 0 0 1 61.59 26",
          "fill": "#ff4f6d"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M58.57 11.75A5 5 0 0 1 57 12H36q-1.22-.02-2.24-.53A19 19 0 0 1 46 7c4.82 0 9.22 1.8 12.57 4.75",
          "fill": "#ffffff"
        }
      }
    ]
  },
  "avataaars-disbelief": {
    "style": "avataaars",
    "variant": "disbelief",
    "width": 92,
    "height": 38,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M32 23a14 14 0 0 1 28 0",
          "fill": "#000000",
          "fill-opacity": ".7",
          "fill-rule": "evenodd",
          "clip-rule": "evenodd"
        }
      }
    ]
  },
  "avataaars-grimace": {
    "style": "avataaars",
    "variant": "grimace",
    "width": 92,
    "height": 38,
    "elements": [
      {
        "name": "rect",
        "attributes": {
          "width": "64",
          "height": "26",
          "rx": "13",
          "fill": "#000000",
          "fill-opacity": ".6",
          "x": "14",
          "y": "1"
        }
      },
      {
        "name": "rect",
        "attributes": {
          "width": "60",
          "height": "22",
          "rx": "11",
          "fill": "#ffffff",
          "x": "16",
          "y": "3"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M16.18 12H24V3.41A11 11 0 0 1 27 3h1v9h9V3h4v9h9V3h4v9h9V3h2q1.02 0 2 .18V12h8.82l.05.28v3.44l-.05.28H67v8.82q-.98.18-2 .18h-2v-9h-9v9h-4v-9h-9v9h-4v-9h-9v9h-1a11 11 0 0 1-3-.41V16h-7.82a11 11 0 0 1 0-4",
          "fill": "#e5e5e5"
        }
      }
    ]
  },
  "avataaars-twinkle": {
    "style": "avataaars",
    "variant": "twinkle",
    "width": 92,
    "height": 38,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M32 10c0 5.37 6.16 9 14 9s14-3.63 14-9c0-1.1-.95-2-2-2-1.3 0-1.87.9-2 2-1.24 2.94-4.32 4.72-10 5-5.68-.28-8.76-2.06-10-5-.13-1.1-.7-2-2-2-1.05 0-2 .9-2 2",
          "fill": "#000000",
          "fill-opacity": ".6"
        }
      }
    ]
  },
  "avataaars-screamOpen": {
    "style": "avataaars",
    "variant": "screamOpen",
    "width": 92,
    "height": 38,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M26 32.86C27.14 18.88 30.24 7.01 46 7s18.92 11.94 20 26c.08 1.12-.83 2-1.96 2-6.69 0-9.37-2-18.05-2s-13.23 2-17.9 2c-1.14 0-2.2-.74-2.08-2.14",
          "fill": "#000000",
          "fill-opacity": ".7",
          "fill-rule": "evenodd",
          "clip-rule": "evenodd"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M59.02 11.57Q58.1 12 57 12H36c-.98 0-1.9-.28-2.67-.77C36.23 8.57 40.28 7 46 7c5.95 0 10.1 1.7 13.02 4.57",
          "fill": "#ffffff"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M61.8 34.92a43 43 0 0 1-5.54-.82c-2.73-.53-5.65-1.1-10.27-1.1-5.01 0-8.65.66-11.73 1.23-1.45.26-2.77.5-4.06.65A11 11 0 0 1 46 27.2a11 11 0 0 1 15.8 7.72",
          "fill": "#ff4f6d"
        }
      }
    ]
  },
  "micah-frown": {
    "style": "micah",
    "variant": "frown",
    "width": 84.2,
    "height": 64.54,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M7.87 41.11c3.2-7.95 15.1-24.76 37-28.34s33.12 8.45 36 14.92",
          "stroke": "#4b2422",
          "stroke-width": "4"
        }
      }
    ]
  },
  "micah-laughing": {
    "style": "micah",
    "variant": "laughing",
    "width": 84.2,
    "height": 64.54,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M77.6 25.82a36 36 0 0 0 1.18-12.54 4.98 4.98 0 0 0-6.8-4.21c-4.26 1.68-18.03 6.88-27.62 8.2-10.53 1.45-26.66-.32-31.44-.91a4.98 4.98 0 0 0-5.54 5.74 36 36 0 0 0 70.22 3.72",
          "fill": "#4b2422"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M64.7 39.67a32 32 0 0 1-37.21 4.6 21.5 21.5 0 0 1 37.2-4.6",
          "fill": "#fc909f"
        }
      }
    ]
  },
  "micah-nervous": {
    "style": "micah",
    "variant": "nervous",
    "width": 84.2,
    "height": 64.54,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "m81.28 31.68-1.02-14.57a8.06 8.06 0 0 0-9.73-7.3c-6.95 1.5-20.1 4.1-29.54 4.76s-22.82-.1-29.91-.6a8.06 8.06 0 0 0-8.63 8.58l1.02 14.57a8.06 8.06 0 0 0 9.74 7.3c6.95-1.49 20.1-4.1 29.54-4.76s22.82.1 29.9.6a8.06 8.06 0 0 0 8.63-8.58",
          "fill": "#4b2422"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "m12.62 18.08 1.6 6.07a6 6 0 0 0 6.21 4.46 6 6 0 0 0-5.54 5.29l-.73 6.23c7.28-1.53 19.34-3.84 28.3-4.47 8.98-.62 21.24-.01 28.66.49l-1.6-6.07a6 6 0 0 0-6.22-4.46 6 6 0 0 0 5.54-5.29l.74-6.23c-7.28 1.52-19.34 3.84-28.31 4.46s-21.23.02-28.65-.48",
          "fill": "#ffffff"
        }
      }
    ]
  },
  "micah-pucker": {
    "style": "micah",
    "variant": "pucker",
    "width": 84.2,
    "height": 64.54,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M38.87 16.81c4.16-2.33 21-5.3 21 1.5 0 8.5-11.5 8-11.5 8s13.04-3.16 10.5 6c-2.5 9-9.5 5.5-11.5 4.5",
          "stroke": "#4b2422",
          "stroke-width": "4"
        }
      }
    ]
  },
  "micah-sad": {
    "style": "micah",
    "variant": "sad",
    "width": 84.2,
    "height": 64.54,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M25.87 46.11c1.71-7.95 8.07-24.76 19.77-28.34s17.7 8.45 19.23 14.92",
          "stroke": "#4b2422",
          "stroke-width": "4"
        }
      }
    ]
  },
  "micah-smile": {
    "style": "micah",
    "variant": "smile",
    "width": 84.2,
    "height": 64.54,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M12.37 17.61c2.5 17 31 25 57 5.5",
          "stroke": "#4b2422",
          "stroke-width": "4"
        }
      }
    ]
  },
  "micah-smirk": {
    "style": "micah",
    "variant": "smirk",
    "width": 84.2,
    "height": 64.54,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M22.87 24.28c4.94 6.45 12.42 13.59 23.97 11.96s16.7-9.6 15.18-16.05",
          "stroke": "#4b2422",
          "stroke-width": "4"
        }
      }
    ]
  },
  "micah-surprised": {
    "style": "micah",
    "variant": "surprised",
    "width": 84.2,
    "height": 64.54,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M49.24 56.77c12.1-2.19 18.75-15.37 16.42-28.22S52.5 5.68 40.4 7.87 21.64 23.25 23.96 36.1s13.17 22.87 25.28 20.67",
          "fill": "#4b2422"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M30 42.77c2.8-5.2 8.15-9.24 14.81-10.45s13.1.7 17.52 4.6C61.25 45.2 55.96 51.9 48.6 53.24s-14.66-3.09-18.58-10.47",
          "fill": "#fc909f"
        }
      }
    ]
  },
  "personas-bigSmile": {
    "style": "personas",
    "variant": "bigSmile",
    "width": 10.25,
    "height": 8.04,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M2 1.54h6v1a3 3 0 0 1-6 0z",
          "fill": "#ffffff"
        }
      }
    ]
  },
  "personas-frown": {
    "style": "personas",
    "variant": "frown",
    "width": 10.25,
    "height": 8.04,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M1 2.67A1 1 0 1 0 2 4.4a6 6 0 0 1 3-.86 6 6 0 0 1 3 .86 1 1 0 0 0 1-1.73 8 8 0 0 0-4-1.13 8 8 0 0 0-4 1.13",
          "fill": "#1b0640"
        }
      }
    ]
  },
  "personas-lips": {
    "style": "personas",
    "variant": "lips",
    "width": 10.25,
    "height": 8.04,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M1 3.54h8s-1 2.5-4 2.5-4-2.5-4-2.5",
          "fill": "#7a3f47"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M1.39 2.76A2.1 2.1 0 0 1 5 2.54a2.1 2.1 0 0 1 3.61.22l.4.78H1z",
          "fill": "#a65d5f"
        }
      }
    ]
  },
  "personas-smile": {
    "style": "personas",
    "variant": "smile",
    "width": 10.25,
    "height": 8.04,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M1 4.4a1 1 0 1 1 1-1.73 6 6 0 0 0 3 .87 6 6 0 0 0 3-.87A1 1 0 0 1 9 4.4a8 8 0 0 1-4 1.14A8 8 0 0 1 1 4.4",
          "fill": "#1b0640"
        }
      }
    ]
  },
  "personas-smirk": {
    "style": "personas",
    "variant": "smirk",
    "width": 10.25,
    "height": 8.04,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M3.32 4.26a.75.75 0 0 1 .36-1.45c2.44.63 4.17.34 5.29-.8a.75.75 0 1 1 1.06 1.08c-1.53 1.51-3.8 1.9-6.7 1.18",
          "fill": "#1b0640"
        }
      }
    ]
  },
  "personas-surprise": {
    "style": "personas",
    "variant": "surprise",
    "width": 10.25,
    "height": 8.04,
    "elements": [
      {
        "name": "ellipse",
        "attributes": {
          "cx": "5",
          "cy": "3.54",
          "rx": "2",
          "ry": "2.5",
          "fill": "#1b0640"
        }
      }
    ]
  },
  "adventurer-variant01": {
    "style": "adventurer",
    "variant": "variant01",
    "width": 206.2,
    "height": 137.7,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M186.5 29c2.4 1 1.9 3.5 1.4 5.5a92 92 0 0 1-28.4 34 97 97 0 0 1-60 17.5c-26.8-1-53-12-73.5-29.3-.4-2.4-.4-3.7 1.5-5.4 51.8-7.1 106.8-15 159-22.2",
          "fill": "#4b2422"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M180.4 36c-8.2 15-21 27.4-36.4 34.9a89 89 0 0 1-40.5 9.2c-24.7.2-49-9-68.6-23.9 48-6.6 97.7-13.8 145.5-20.3",
          "fill": "#5a2028"
        }
      }
    ]
  },
  "adventurer-variant03": {
    "style": "adventurer",
    "variant": "variant03",
    "width": 206.2,
    "height": 137.7,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M83.5 89.3a37 37 0 0 1 27.4 11.6 53 53 0 0 1 11 18c.4 3.5 2.2 6.4-1.4 8.8-8.4.2-16.7.8-25 1-12.3 1-24.7.5-37 2-1.9-2-2.3-3.8-2.5-6.4-1-8.6 1.2-17.9 6.7-24.7a28 28 0 0 1 20.8-10.3",
          "fill": "#4b2422"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M91 95.9c12.6 3 22 14 25.5 26.2-18.3.4-36.6 1.7-54.8 2.2a28 28 0 0 1 7.6-23.1c5.8-5.7 14-7 21.7-5.3",
          "fill": "#5a2028"
        }
      }
    ]
  },
  "adventurer-variant06": {
    "style": "adventurer",
    "variant": "variant06",
    "width": 206.2,
    "height": 137.7,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M79.5 18.2a84 84 0 0 1 43.7 8.6 188 188 0 0 1-65.7 15.5c-7.2 0-14.3.2-21.5-.6a17 17 0 0 1 7.7-13 68 68 0 0 1 35.8-10.5",
          "fill": "#a65d5f"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "m131.5 24 1.2 2.4c.4 2.7-2 3.4-3.9 4.4l-12 5a184 184 0 0 1-73.8 12c-4.9-.6-10.1-.7-14.8-2-2.4-1-2.7-4-.4-5.2 2.7 0 5.5.9 8.2 1 7.2 1 14.3.7 21.5.7a189 189 0 0 0 65.7-15.5c2.8-1.2 5.2-2.6 8.3-2.7",
          "fill": "#4b2422"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M116.7 35.8c-2 10.1-10.3 17.2-19.2 21.6a56 56 0 0 1-34 4.7c-8.7-1.7-16.5-6-20.5-14.4q9.7.8 19.5 0a184 184 0 0 0 54.2-12",
          "fill": "#a65d5f"
        }
      }
    ]
  },
  "adventurer-variant09": {
    "style": "adventurer",
    "variant": "variant09",
    "width": 206.2,
    "height": 137.7,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M102.5 36.7q4.5-.2 9.2.3l1.2 2.4-1.2 2.5c-7.7.8-15.5 0-23.2.6l-84 .6c-1.7 0-4.6-.6-4.4-2.7-.6-1.7 1.8-3.3 3.3-3.2z",
          "fill": "#4b2422"
        }
      }
    ]
  },
  "adventurer-variant12": {
    "style": "adventurer",
    "variant": "variant12",
    "width": 206.2,
    "height": 137.7,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M156.5 34c1.5 0 3.5-.4 4.6.8 1.8 1.5.8 4.5-1.6 4.7-5.3.8-10.7.6-16 1.3l-14.6 2q4.5 9.7 6 20.4c1.2 9.5.6 18.9-4.4 27.2a28 28 0 0 1-19 13.2 47 47 0 0 1-27-4.2A88 88 0 0 1 51.9 72a118 118 0 0 0-18.5 16.2c-1.6 1.6-3.5 4-5.7 1.9-1.9-1.7-.3-4 1-5.5a129 129 0 0 1 34.7-26.5 225 225 0 0 1 93-24.3",
          "fill": "#4b2422"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "m123.3 43.8 4 11.6q3 10.6 1.8 21.5a25 25 0 0 1-11.1 18c-7.4 4.5-16.6 4-24.7 1.5A76 76 0 0 1 57 69q13.8-8.7 29.3-14.6c1.7 2.4 3.2 5.1 5.4 7.1 1.4 1.5 4.4.1 4-2C95.4 57 93 55 92 52.8q-.2-.6.7-.9 15.1-5.1 30.7-8.1",
          "fill": "#d96b68"
        }
      }
    ]
  },
  "adventurer-variant16": {
    "style": "adventurer",
    "variant": "variant16",
    "width": 206.2,
    "height": 137.7,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M127.7 27.7c1.5-.4 3.3-1 4.9-.8 2 .8 2 3 1 4.7-4 2.6-10 2.8-14.2 4.8a79 79 0 0 1 0 41 55 55 0 0 1-20.7 31.3c-7 5-15.6 7.4-24.2 6.5A42 42 0 0 1 45.9 98a72 72 0 0 1-11.3-60.2c-2.4-.8-5.6-1.2-7.5-2.9-.6-1.2-.2-2.8-.3-4.1 4.5 0 8.3 1.6 12.7 2.5 29.5 6 59.5 3 88.2-5.5",
          "fill": "#4b2422"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M113.4 37.5a68 68 0 0 1-6.7 54.2c-4 6.5-9.6 12-16.7 15.1a29 29 0 0 1-25.4-.5c-8-4-14.6-11.4-18.7-19.3a70 70 0 0 1-5.5-48c10.5 2.4 21 3 31.8 3.2-1 6.8-1 13.4-1.2 20.2 0 2-.2 4 .5 6 1 1.6 4.6 1.1 4.7-1.1.6-8.5-.1-16.8 1.5-25.2 12-.2 24-2.2 35.7-4.6",
          "fill": "#d96b68"
        }
      }
    ]
  },
  "adventurer-variant20": {
    "style": "adventurer",
    "variant": "variant20",
    "width": 206.2,
    "height": 137.7,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M111.5 70c4.7 1.3 9 4.7 12.2 8.2 1.4 1.7 3.6 3.9 3 6.2-.4 2.5-3.7 3-5 .8a28 28 0 0 0-9.5-8.5c-2.2-1.5-6.7-.6-6.6-4.2.5-3 3.6-2.9 6-2.5m-7.1 13.4c5 1.5 8.4 5.8 8.8 11 1.3 13.2-9.4 25.8-21.8 29.2-12.4 3.7-28.9-1-35-13.2-2.5-4.2-3.8-9.2-2-14 1.8-4 5.8-5.6 10-6 5-.6 9.5 1 13.9 3.5 3.8-4 7.7-7.6 12.9-9.8 4-1.7 9-2 13.2-.7",
          "fill": "#4b2422"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M105.4 90.5c3.2 3.4 2.3 9.5.5 13.4a25.5 25.5 0 0 1-26 15c-7.2-1.2-14.2-4.1-18.1-10.8-1.5-2.5-3.5-6.6-2-9.4 2.2-3.8 8.7-3.2 12.2-1.8 2.8.7 5.6 4 8.4 3.6 3.7-3.6 6.5-7.5 11.2-10 4.3-2.3 9.6-3.2 13.8 0",
          "fill": "#5a2028"
        }
      }
    ]
  },
  "adventurer-variant24": {
    "style": "adventurer",
    "variant": "variant24",
    "width": 206.2,
    "height": 137.7,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M140.8 23a38 38 0 0 1 21.2 9.9 39 39 0 0 1 12 29.5c.3 9.8-2.4 19.1-6.7 27.8a83 83 0 0 1-70.7 45.3 107 107 0 0 1-82.1-34A46 46 0 0 1 2.9 72.4a25 25 0 0 1 10.5-20.2 42 42 0 0 1 23-6.7 86 86 0 0 1 40.3 11 80 80 0 0 1 34-28.9c9.4-4.2 19.8-6 30-4.6",
          "fill": "#4b2422"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M140 28.7A32 32 0 0 1 162.9 43c6 9.6 6.6 21 3.8 31.8q-6-.8-12-.2c-10.8.6-21.7 3.4-32 7a43 43 0 0 0-.5-23.9c-1.7-3.8-5.4-6.2-9.6-4.3-6.6 3.1-10.3 11.9-13 18.2-4.8-1.6-11.3-3.8-16-1.2-4 2.2-3.9 6.5-2.5 10.3 2.6 6.2 7.7 11 12.6 15.4a114 114 0 0 0-31.1 29c-15-4.7-28.7-13-40-23.7A46 46 0 0 1 8.9 77c-1-6.4.7-13.2 5.4-17.8 4.4-4.6 11-6.7 17.2-7.5a69 69 0 0 1 35.2 6.5c3.8 1.5 7 3.8 10.8 5.4 2.7.3 3.7-3.4 5-5.1A70 70 0 0 1 121.3 30c6-1.8 12.6-1.9 18.8-1.4",
          "fill": "#5a2028"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M115.5 58.3c2.6 2.3 2.7 6.8 2.8 10 0 11-3.1 22-8 31.7-4-2-7.9-4.1-11.3-7.2a54 54 0 0 1-12-13c-.8-1.4-.8-3-1-4.6 5-.7 9.1 1 13.7 2.9 2.8 1 3.9-1.4 5-3.5 2.4-5.5 5.1-13.3 10.8-16.3",
          "fill": "#7a3f47"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M165.1 80.3a71 71 0 0 1-11 19.7c-3.8 4.8-8.6 8.9-13 13a77 77 0 0 1-35.1 15.6q-19 2.8-37.5-1.6c8-11.1 18.6-19.9 30.3-27.1 3.7 2.3 7.5 5.1 11.7 6.6 1.4.7 2.8-.4 3.6-1.5 3.1-4.9 4.8-10 6.8-15.4.3-1.4 1.6-1.6 2.8-2.1 13-4.7 27.5-8.1 41.4-7.2",
          "fill": "#d96b68"
        }
      }
    ]
  },
  "adventurer-variant27": {
    "style": "adventurer",
    "variant": "variant27",
    "width": 206.2,
    "height": 137.7,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M130.7 16.3c.6 7-.9 13.3-1.6 20.1-2.7 24.2-9.4 48-19.1 70.2-3.7 7.4-6.8 15.8-14 20.4-3.8 2.8-9 2-13.2.1a44 44 0 0 1-12.4-8.6 171 171 0 0 1-30-42.1c-6.7-12.6-11.6-25.8-17-38.9-1-2.1-1.2-4.1 1-5.4 4.4-.1 8.7 1.4 13 1.4 10 .4 20 .5 29.9-.9 17.7-2 35-7.1 51.5-13.9 4.3-1.5 7.2-4.3 11.9-2.4",
          "fill": "#4b2422"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M125.4 22.4a298 298 0 0 1-8.9 48A52 52 0 0 0 90.1 77a67 67 0 0 0-27.3 23.9 198 198 0 0 1-19.4-31.5c-5.4-10.1-9.3-20.7-14-31.2 9.5.8 18.6 2 28 1 23.3-.7 46.8-7.7 68-16.8",
          "fill": "#5a2028"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M114.7 76.5A184 184 0 0 1 99 115a18 18 0 0 1-6.7 7.4c-4 1.7-9.1-1.2-12.4-3.5-5.4-3.4-8.6-8.3-12.9-12.7a36 36 0 0 1 10.4-13.7c7.8-6.7 17.1-12 27-15q5-1.3 10.2-1",
          "fill": "#d96b68"
        }
      }
    ]
  },
  "adventurer-variant30": {
    "style": "adventurer",
    "variant": "variant30",
    "width": 206.2,
    "height": 137.7,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M124.4 17.7c2.3.2 3.1 2.7 2.3 4.7L122 32.9c-8.4 19.3-19.5 37-31.8 54.2-1.4 1.8-2.9 4-4.8 5.2-3 .8-6.1.8-8.7-1.1a129 129 0 0 1-24.3-22.8Q41.7 57 33.6 43.2c-1-2-2.6-4.4-1.2-6.8 1-1.5 3.2-2 4.9-2.5 11-3.1 22.1-6.5 33.3-9.3a235 235 0 0 1 35.9-5.7c5.9-.6 12-1.4 17.9-1.2",
          "fill": "#4b2422"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M120.3 23.4A317 317 0 0 1 86 82.9c-1 1.1-2.2 2.8-3.7 3-2.2.6-3.7-.8-5.4-1.9a155 155 0 0 1-22.7-22.3 137 137 0 0 1-16.6-22.3c15-4 29.9-8.6 45.1-11.4 12.5-2.5 25-3.3 37.6-4.6",
          "fill": "#5a2028"
        }
      }
    ]
  }
}
