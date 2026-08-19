// Bundled offline snapshot of Tarkov quest data.
//
// This is NOT fetched live — it exists so RAIDPLAN has real, working quest
// content the moment you run `npm run dev`, even if api.tarkov.dev is
// unreachable (it was down with a backend outage at the time this app was
// built). The app always tries the live GraphQL API first; this snapshot is
// only the fallback. Names/traders/objectives are drawn from well-known,
// long-running Tarkov quests, but exact wording, item counts and levels
// drift with wipes — treat this as a starting skeleton, not gospel, and
// prefer the live API refresh whenever it's reachable.
//
// `objectiveMapNodeHints` links an objective to a landmark node id in our
// hand-built map graphs (src/data/maps/*) purely so the route planner can
// place a waypoint marker for it — it is our own mapping, not from the API.

export const QUESTS_FALLBACK = [
  {
    id: 'fallback-debut',
    name: 'Debut',
    trader: 'Prapor',
    minPlayerLevel: 1,
    maps: ['customs'],
    wikiLink: 'https://escapefromtarkov.fandom.com/wiki/Debut',
    objectives: [
      {
        id: 'debut-1',
        description: 'Eliminate 5 Scavs on Customs',
        type: 'kill',
        mapNodeHint: 'cust_gasstation',
        requiredItems: [],
      },
    ],
  },
  {
    id: 'fallback-shortage',
    name: 'Shortage',
    trader: 'Therapist',
    minPlayerLevel: 2,
    maps: ['customs'],
    wikiLink: 'https://escapefromtarkov.fandom.com/wiki/Shortage',
    objectives: [
      {
        id: 'shortage-1',
        description: 'Hand over medical supplies to Therapist',
        type: 'handover',
        mapNodeHint: null,
        requiredItems: [{ name: 'Salewa first aid kit', count: 3, foundInRaid: false }],
      },
    ],
  },
  {
    id: 'fallback-gunsmith1',
    name: 'Gunsmith - Part 1',
    trader: 'Mechanic',
    minPlayerLevel: 1,
    maps: [],
    wikiLink: 'https://escapefromtarkov.fandom.com/wiki/Gunsmith_-_Part_1',
    objectives: [
      {
        id: 'gunsmith1-1',
        description: 'Assemble a specific AKS-74U configuration and hand it over',
        type: 'build',
        mapNodeHint: null,
        requiredItems: [
          { name: 'AKS-74U 5.45x39 assault rifle', count: 1, foundInRaid: false },
          { name: 'AKS-74U Dust Cover', count: 1, foundInRaid: false },
        ],
      },
    ],
  },
  {
    id: 'fallback-wetjob1',
    name: 'Wet Job - Part 1',
    trader: 'Prapor',
    minPlayerLevel: 15,
    maps: ['woods'],
    wikiLink: 'https://escapefromtarkov.fandom.com/wiki/Wet_Jobs_-_Part_1',
    objectives: [
      {
        id: 'wetjob1-1',
        description: 'Eliminate the target near the Scav Blockpost on Woods',
        type: 'kill',
        mapNodeHint: 'woo_blockpost',
        requiredItems: [],
      },
    ],
  },
  {
    id: 'fallback-safecracking',
    name: 'Safecracking',
    trader: 'Ragman',
    minPlayerLevel: 10,
    maps: ['interchange'],
    wikiLink: 'https://escapefromtarkov.fandom.com/wiki/Safecracking',
    objectives: [
      {
        id: 'safecracking-1',
        description: 'Open the Interchange saferoom and collect its contents',
        type: 'find',
        mapNodeHint: 'int_ext_saferoom',
        requiredItems: [{ name: 'Interchange Saferoom key', count: 1, foundInRaid: false }],
      },
    ],
  },
  {
    id: 'fallback-postman1',
    name: 'Postman Pete - Part 1',
    trader: 'Peacekeeper',
    minPlayerLevel: 17,
    maps: ['interchange'],
    wikiLink: 'https://escapefromtarkov.fandom.com/wiki/Postman_Pete_-_Part_1',
    objectives: [
      {
        id: 'postman1-1',
        description: 'Retrieve a package from OLI Shopping Mall',
        type: 'find',
        mapNodeHint: 'int_oli',
        requiredItems: [],
      },
    ],
  },
  {
    id: 'fallback-trustverify',
    name: 'Trust, But Verify',
    trader: 'Jaeger',
    minPlayerLevel: 20,
    maps: ['reserve'],
    wikiLink: 'https://escapefromtarkov.fandom.com/wiki/Trust,_But_Verify',
    objectives: [
      {
        id: 'trustverify-1',
        description: 'Retrieve intel from the Reserve D-2 bunker',
        type: 'find',
        mapNodeHint: 'res_ext_d2',
        requiredItems: [{ name: 'Reserve D-2 marked key', count: 1, foundInRaid: false }],
      },
    ],
  },
  {
    id: 'fallback-chemistry1',
    name: 'Chemistry - Part 1',
    trader: 'Skier',
    minPlayerLevel: 5,
    maps: ['shoreline'],
    wikiLink: 'https://escapefromtarkov.fandom.com/wiki/Chemistry_-_Part_1',
    objectives: [
      {
        id: 'chemistry1-1',
        description: 'Collect chemical supplies from the Health Resort',
        type: 'find',
        mapNodeHint: 'sho_resort',
        requiredItems: [{ name: "Grizzly medical kit", count: 2, foundInRaid: true }],
      },
    ],
  },
  {
    id: 'fallback-wayout',
    name: 'The Way Out',
    trader: 'Skier',
    minPlayerLevel: 22,
    maps: ['shoreline'],
    wikiLink: 'https://escapefromtarkov.fandom.com/wiki/The_Way_Out',
    objectives: [
      {
        id: 'wayout-1',
        description: 'Extract via the Pier Boat extract on Shoreline',
        type: 'extract',
        mapNodeHint: 'sho_ext_pierboat',
        requiredItems: [],
      },
    ],
  },
  {
    id: 'fallback-lighthouse-access',
    name: 'Access Point',
    trader: 'Mechanic',
    minPlayerLevel: 22,
    maps: ['lighthouse'],
    wikiLink: 'https://escapefromtarkov.fandom.com/wiki/Lighthouse',
    objectives: [
      {
        id: 'lighthouse-access-1',
        description: 'Reach the Water Treatment Plant on Lighthouse',
        type: 'visit',
        mapNodeHint: 'lig_watertreat',
        requiredItems: [],
      },
    ],
  },
  {
    id: 'fallback-bloodfeud',
    name: 'Bad Rep Evidence',
    trader: 'Prapor',
    minPlayerLevel: 26,
    maps: ['streets'],
    wikiLink: 'https://escapefromtarkov.fandom.com/wiki/Bad_Rep_Evidence',
    objectives: [
      {
        id: 'bloodfeud-1',
        description: 'Plant evidence near Concordia Mall on Streets of Tarkov',
        type: 'plant',
        mapNodeHint: 'str_concordia',
        requiredItems: [{ name: 'WD-40 Anti-corrosive lubricant', count: 1, foundInRaid: true }],
      },
    ],
  },
  {
    id: 'fallback-lab-access',
    name: 'Access Denied',
    trader: 'Mechanic',
    minPlayerLevel: 20,
    maps: ['lab'],
    wikiLink: 'https://escapefromtarkov.fandom.com/wiki/The_Lab',
    objectives: [
      {
        id: 'lab-access-1',
        description: 'Enter TerraGroup Labs and reach the Test Chamber',
        type: 'visit',
        mapNodeHint: 'lab_testchamber',
        requiredItems: [{ name: 'TerraGroup Labs keycard', count: 1, foundInRaid: false }],
      },
    ],
  },
  {
    id: 'fallback-zb013',
    name: 'Big Customs Deal',
    trader: 'Skier',
    minPlayerLevel: 22,
    maps: ['customs'],
    wikiLink: 'https://escapefromtarkov.fandom.com/wiki/Skier',
    objectives: [
      {
        id: 'zb013-1',
        description: 'Retrieve documents from the ZB-013 bunker on Customs',
        type: 'find',
        mapNodeHint: 'cust_ext_zb013',
        requiredItems: [{ name: 'ZB-013 key', count: 1, foundInRaid: false }],
      },
    ],
  },
  {
    id: 'fallback-factory-recon',
    name: 'Factory Recon',
    trader: 'Prapor',
    minPlayerLevel: 4,
    maps: ['factory'],
    wikiLink: 'https://escapefromtarkov.fandom.com/wiki/Factory',
    objectives: [
      {
        id: 'factory-recon-1',
        description: 'Photograph the Office Building interior on Factory',
        type: 'find',
        mapNodeHint: 'fac_office',
        requiredItems: [],
      },
    ],
  },
  {
    id: 'fallback-groundzero-intro',
    name: 'Checking - Part 1',
    trader: 'Prapor',
    minPlayerLevel: 1,
    maps: ['groundzero'],
    wikiLink: 'https://escapefromtarkov.fandom.com/wiki/Checking_-_Part_1',
    objectives: [
      {
        id: 'groundzero-intro-1',
        description: 'Investigate the School on Ground Zero',
        type: 'visit',
        mapNodeHint: 'gz_school',
        requiredItems: [],
      },
    ],
  },
]
