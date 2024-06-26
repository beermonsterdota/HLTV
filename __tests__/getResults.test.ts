import HLTV from '../src/index.js'
import { sleep } from '../src/utils.js'
import { expect, test } from 'vitest'

test('getResults', async () => {
  await sleep(3000)
  expect(await HLTV.getResults({ eventIds: [1617] })).toMatchSnapshot()
  await sleep(3000)
  expect(
    await HLTV.getResults({
      playerIds: [7998],
      startDate: '2020-01-01',
      endDate: '2020-03-31',
      delayBetweenPageRequests: 3000
    })
  ).toMatchSnapshot()
  await sleep(3000)
}, 500000)
