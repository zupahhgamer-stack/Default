import customs from './customs.js'
import factory from './factory.js'
import interchange from './interchange.js'
import reserve from './reserve.js'
import shoreline from './shoreline.js'
import woods from './woods.js'
import lighthouse from './lighthouse.js'
import streets from './streets.js'
import lab from './lab.js'
import groundzero from './groundzero.js'

export const MAPS = {
  customs,
  factory,
  interchange,
  reserve,
  shoreline,
  woods,
  lighthouse,
  streets,
  lab,
  groundzero,
}

export const MAP_LIST = Object.values(MAPS)

export function getMap(id) {
  return MAPS[id] ?? null
}
