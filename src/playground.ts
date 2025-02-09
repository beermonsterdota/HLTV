import { GameMap, HLTV } from './index.js'

const log = (promise: Promise<any>) =>
  promise
    .then((res) => console.dir(res, { depth: null }))
    .catch((err) => console.log(err))

// log(HLTV.getMatch({ id: 2346924 }))
// log(HLTV.getMatches())
// log(HLTV.getEvent({ id: 6810 }))
// log(HLTV.getEvents())
// log(HLTV.getMatchMapStats({ id: 147749 }))
// log(
//   HLTV.getMatchStats({
//     id: 2368880
//   })
// )
// log(HLTV.getMatchesStats())
// log(HLTV.getPlayer({ id: 7998 }))
// log(HLTV.getPlayerRanking())
// log(HLTV.getPlayerStats({ id: 1122 }))
// log(HLTV.getRecentThreads())
// log(HLTV.getStreams())
// log(HLTV.getTeam({ id: 7020 }))
// log(HLTV.getTeamStats({ id: 10566 }))
// log(HLTV.getPastEvents({ startDate: '2019-3-1', endDate: '2019-3-29' }))
// log(HLTV.getTeamRanking())
// log(HLTV.getResults({ eventIds: [1617] }))
// log(HLTV.getNews())

// log(
//   HLTV.getDetailedTeamMapStats({
//     id: 9565,
//     maps: GameMap.Mirage,
//     startDate: '2023-10-27',
//     endDate: '2024-01-27',
//     csVersion: 'CS2'
//   })
// )
// for (let i = 0; i < 100; i++) {
//   log(
//     HLTV.getDetailedTeamMapStats({
//       id: 6667,
//       maps: GameMap.Anubis,
//       startDate: '2023-10-28',
//       endDate: '2024-01-28',
//       csVersion: 'CS2'
//     })
//   )
// }

async function test() {
  async function loader(url: string) {
    const res = await fetch('http://localhost:8191/v1', {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({
        cmd: 'request.get',
        url,
        maxTimeout: 30000
      })
    })
    if (!res.ok) {
      throw new Error(await res.json())
    }
    const body = await res.json()
    return body.solution.response
  }
  const betterHLTV = HLTV.createInstance({
    loadPage: loader,
    loadMatchStatsPage: loader
  })
  const data = await betterHLTV.getMatchMapStats({ id: 185989 })
  console.log('🚀 ~ test ~ data:', data)
}
test()
