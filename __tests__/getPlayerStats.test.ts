import HLTV from '../src/index.js'
import { sleep } from '../src/utils.js'
import { expect, test } from 'vitest'

const FULL = 7998
const RATING_1 = 194
const RATING_2 = 11940

test('getPlayerStats', async () => {
  await sleep(3000)
  expect(await HLTV.getPlayerStats({ id: FULL })).toMatchSnapshot()
  await sleep(3000)
  expect(await HLTV.getPlayerStats({ id: RATING_1 })).toMatchSnapshot()
  await sleep(3000)
  expect(await HLTV.getPlayerStats({ id: RATING_2 })).toMatchSnapshot()
  await sleep(3000)
}, 500000)
