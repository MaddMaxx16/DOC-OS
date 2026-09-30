// P2.4.4.3B.12.1 — cross-library accessory audition.
// Notion accessories were removed because their one-ear/three-quarter geometry
// does not translate cleanly to DOC OS's front-facing Toon Head.
// Donor components below are auditioned directly on the Toon Head before cuts.

export const ACCESSORY_LAB_OPTIONS = [
  {
    "value": "none",
    "label": "None"
  },
  {
    "value": "accessorylab-micah-earrings-hoop",
    "label": "Micah · Hoop"
  },
  {
    "value": "accessorylab-micah-earrings-stud",
    "label": "Micah · Stud"
  },
  {
    "value": "accessorylab-adventurer-earrings-variant01",
    "label": "Adv · Earring 01"
  },
  {
    "value": "accessorylab-adventurer-earrings-variant02",
    "label": "Adv · Earring 02"
  },
  {
    "value": "accessorylab-adventurer-earrings-variant03",
    "label": "Adv · Earring 03"
  },
  {
    "value": "accessorylab-adventurer-earrings-variant04",
    "label": "Adv · Earring 04"
  },
  {
    "value": "accessorylab-adventurer-earrings-variant05",
    "label": "Adv · Earring 05"
  },
  {
    "value": "accessorylab-adventurer-earrings-variant06",
    "label": "Adv · Earring 06"
  },
  {
    "value": "accessorylab-lorelei-earrings-variant01",
    "label": "Lore · Earring 01"
  },
  {
    "value": "accessorylab-lorelei-earrings-variant02",
    "label": "Lore · Earring 02"
  },
  {
    "value": "accessorylab-lorelei-earrings-variant03",
    "label": "Lore · Earring 03"
  },
  {
    "value": "accessorylab-lorelei-hairAccessories-flowers",
    "label": "Lore · Flowers"
  }
]

export const ACCESSORY_LAB_CANDIDATES = {
  "micah-earrings-hoop": {
    "style": "micah",
    "component": "earrings",
    "variant": "hoop",
    "width": 52,
    "height": 52,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M26 2A24 24 0 1 1 2 26c0-6.4 3.5-11.5 6.57-16.5L9.5 8",
          "stroke": "__ACCESSORY_COLOR__",
          "stroke-width": "4"
        }
      }
    ]
  },
  "micah-earrings-stud": {
    "style": "micah",
    "component": "earrings",
    "variant": "stud",
    "width": 52,
    "height": 52,
    "elements": [
      {
        "name": "circle",
        "attributes": {
          "cx": "27",
          "cy": "4",
          "r": "4",
          "fill": "__ACCESSORY_COLOR__"
        }
      },
      {
        "name": "circle",
        "attributes": {
          "cx": "28",
          "cy": "3",
          "r": "1",
          "fill": "#ffffff"
        }
      }
    ]
  },
  "adventurer-earrings-variant01": {
    "style": "adventurer",
    "component": "earrings",
    "variant": "variant01",
    "width": 77.9,
    "height": 139.6,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M12.1 104.2c3.1-.8 8.3 1 7.2 5-.8 2.7-4.5 1.2-6.4 1.2-3.8 5.9-4 13.1-1.5 19.5.7 1.7 2.3 3 3.5 4.4 2-2.9 3-6 4-9.3.8-2 3.7-2 4.8-.4 1 1.2.5 3.2.3 4.6-.8 3.5-2.5 7.4-5.6 9.3a8 8 0 0 1-9.9-1.7c-4.7-5.3-5.2-13.8-4.4-20.5.7-4.7 3.1-10.5 8-12",
          "fill": "__ACCESSORY_COLOR__"
        }
      }
    ]
  },
  "adventurer-earrings-variant02": {
    "style": "adventurer",
    "component": "earrings",
    "variant": "variant02",
    "width": 77.9,
    "height": 139.6,
    "elements": [
      {
        "name": "circle",
        "attributes": {
          "cx": "21.3",
          "cy": "113.7",
          "r": "21.1",
          "fill": "__ACCESSORY_COLOR__"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M15.6 99.8c7-2.8 15.5 0 19 6.9a15 15 0 0 1-7 20.8c-8.1 4-18.2-.8-20.8-9.3a15 15 0 0 1 8.8-18.4",
          "fill": "#ffffff"
        }
      }
    ]
  },
  "adventurer-earrings-variant03": {
    "style": "adventurer",
    "component": "earrings",
    "variant": "variant03",
    "width": 77.9,
    "height": 139.6,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M64.8 39.5c.6 4.3-4 8-8.1 6.2-2.6-1-3-3.3-4.2-5.5 1.3-2.1 1.7-4.4 4.3-5.3 3.4-1.4 7.4 1 8 4.6m-3.5 17c4.5-2.1 9.7 2.2 8.2 7-1.4 4.3-7 5.7-10 2.2a5.8 5.8 0 0 1 1.8-9.2",
          "fill": "__ACCESSORY_COLOR__"
        }
      }
    ]
  },
  "adventurer-earrings-variant04": {
    "style": "adventurer",
    "component": "earrings",
    "variant": "variant04",
    "width": 77.9,
    "height": 139.6,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M55.4.5c2-.9 4.9-.7 6 1.6 1.2 2.4 0 5.2-1 7.4-1.9 4-4.7 8-8.4 10.6-1.9 1.3-4.8 1.6-6.3-.4-2.2-2.2-.7-6 .4-8.5 2-4 5.2-8.7 9.3-10.7m16.3 14.3c2.1-.4 4.1-.3 5.6 1.4 1 2 .8 4.7-.7 6.5-3 4-7 7.5-11.5 9.6-2.1.8-5.4 1-6.8-1.2-1.7-2.3-.2-5.3 1.4-7.3 3-3.8 7.3-7.5 12-9M11.3 97.4c3.2-.7 6.5-.6 9 1.8 4 3.4 4.1 9.9.3 13.5-4.3 4-12 3-14.5-2.4-2.8-4.7.1-11.4 5.2-12.9",
          "fill": "__ACCESSORY_COLOR__"
        }
      }
    ]
  },
  "adventurer-earrings-variant05": {
    "style": "adventurer",
    "component": "earrings",
    "variant": "variant05",
    "width": 77.9,
    "height": 139.6,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M54.5.8C56.9-.3 60.2-.6 61.4 2c1.6 2.9-.5 6.8-2 9.4-2 3.6-5.3 8-9.4 9.5-3.7.8-6-2.3-5.2-5.8A27 27 0 0 1 54.5.8m17 14c2.4-.4 4.8-.4 6 2q1.2 3.2-1 5.9c-3 4.2-7.3 7.9-12.1 9.8-2.2.6-4.8.7-6.2-1.4-1.6-2.4-.1-5.3 1.4-7.3 3.1-3.8 7.3-7.5 12-9",
          "fill": "__ACCESSORY_COLOR__"
        }
      }
    ]
  },
  "adventurer-earrings-variant06": {
    "style": "adventurer",
    "component": "earrings",
    "variant": "variant06",
    "width": 77.9,
    "height": 139.6,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M11.3 97.4c3.4-.9 7-.5 9.4 2.2A9 9 0 0 1 20 113c-4.3 3.5-11.5 2.3-14-2.9-2.8-4.7.1-11.3 5.3-12.8",
          "fill": "__ACCESSORY_COLOR__"
        }
      }
    ]
  },
  "lorelei-earrings-variant01": {
    "style": "lorelei",
    "component": "earrings",
    "variant": "variant01",
    "width": 119,
    "height": 140,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M20 0q7-1 14 2 5 2 4 9-4 6-11 7H10q-7-1-10-7 0-6 5-9 7-2 15-2m13 23q6 1 7 7 0 4-4 7-8 5-17 6-8 3-14-1-6-6 0-12 5-5 13-5 7-2 15-2m72 51h7q6 2 7 9-1 8-9 10-8 1-11-6-2-9 6-13",
          "fill": "__ACCESSORY_COLOR__"
        }
      }
    ]
  },
  "lorelei-earrings-variant02": {
    "style": "lorelei",
    "component": "earrings",
    "variant": "variant02",
    "width": 119,
    "height": 140,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M97 73q5-2 9 1 4 5 3 11-4 7-12 5-5-3-5-8 1-6 5-9",
          "fill": "__ACCESSORY_COLOR__"
        }
      }
    ]
  },
  "lorelei-earrings-variant03": {
    "style": "lorelei",
    "component": "earrings",
    "variant": "variant03",
    "width": 119,
    "height": 140,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M99 89q6 3 6 9 2 13-1 25-1 11-8 17-9 2-13-6-3-13 0-26 0-9 5-16 5-6 11-3",
          "fill": "__ACCESSORY_COLOR__"
        }
      }
    ]
  },
  "lorelei-hairAccessories-flowers": {
    "style": "lorelei",
    "component": "hairAccessories",
    "variant": "flowers",
    "width": 205,
    "height": 161,
    "elements": [
      {
        "name": "path",
        "attributes": {
          "d": "M185 7c8-2 18 4 19 12q2 9-1 17-5 10-18 9c-9 0-16-9-15-18q-1-5 3-11 4-7 12-9",
          "fill": "__ACCESSORY_COLOR__"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M186 16q9-1 13 9c2 8-6 15-14 14q-11-5-7-17 2-4 8-6",
          "fill": "#ffffff"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M153 9q-3-5-9-8-7-2-14 2-5 2-9 7-18-5-30 10-3-6-10-8h-8l-5 1q-10 2-15 9-6 12-1 23 5 7 11 10-10 3-17 11h-1q-4-3-10-3-9-1-16 5T9 82q-2 9 1 19-15 14-7 32 7 9 18 11h15q4 9 12 14 9 5 20 2 8-2 14-9 3-4 3-12 8-2 14-7 7-6 10-16 2-9-3-17-5-9-14-12V73l7 2q1 9 8 15 9 7 22 7 10-2 15-10l3-10v-1q11 3 20-4c7-6 9-18 6-27q-5-11-17-14 2-11-3-22M84 60l1-10-9 6z",
          "fill": "__ACCESSORY_COLOR__",
          "fill-rule": "evenodd",
          "clip-rule": "evenodd"
        }
      },
      {
        "name": "path",
        "attributes": {
          "d": "M64 20q4-3 10-1 10 3 11 15-1 9-9 14c-9 5-22-2-22-13q1-10 10-15m72-11q9 0 13 8 4 11 0 22 10 3 13 12t-4 16-17 4q-3 11-14 16-8 3-15-4-6-6-7-16-6 0-11-4-7-8-1-17l7-6q-3-7-4-15 2-8 9-10 10-1 16 5 5-10 15-11M84 71q3 12-3 23 8 1 13 4 7 6 8 15 0 8-6 13-9 5-19 6 3 6-1 13c-4 7-14 9-21 5q-10-5-12-16-10 3-20 2-6-2-11-7-5-9 1-18l9-7q-6-12-4-25 4-8 12-8 11 1 18 7 4-12 15-16c8-3 18 0 21 9",
          "fill": "#ffffff"
        }
      }
    ]
  }
}
