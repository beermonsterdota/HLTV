import type { HLTVConfig } from '../config.js'
import { type HLTVPage, type HLTVPageElement, HLTVScraper } from '../scraper.js'
import { fromMapName, GameMap } from '../shared/GameMap.js'
import type { Team } from '../shared/Team.js'
import type { Event } from '../shared/Event.js'
import {
  fetchPage,
  generateRandomSuffix,
  getIdAt,
  notNull,
  parseNumber
} from '../utils.js'
import type { Player } from '../shared/Player.js'

export interface PlayerStatsNoPerformance {
  player: Player
  kills: number
  hsKills: number
  assists: number
  flashAssists: number
  deaths: number
  KAST?: number
  killDeathsDifference: number
  ADR?: number
  firstKillsDifference: number
  firstKills: number
  firstDeaths: number
  rating1?: number
  rating2?: number
}

export interface PlayerStatsFull {
  player: Player
  killsPerRound?: number
  deathsPerRound?: number
  impact?: number
  kills: number
  hsKills: number
  assists: number
  flashAssists: number
  deaths: number
  KAST?: number
  killDeathsDifference: number
  ADR?: number
  firstKillsDifference: number
  firstKills: number
  firstDeaths: number
  rating1?: number
  rating2?: number
}

export type PlayerStats = PlayerStatsFull | PlayerStatsNoPerformance

export interface TeamPerformance {
  kills: number
  deaths: number
  assists: number
}

export interface TeamsPerformanceOverview {
  team1: TeamPerformance
  team2: TeamPerformance
}

export enum Outcome {
  CTWin = 'ct_win',
  TWin = 't_win',
  BombDefused = 'bomb_defused',
  BombExploded = 'bomb_exploded',
  TimeRanOut = 'stopwatch'
}

export interface RoundOutcome {
  outcome: Outcome
  score: string
  tTeam: number
  ctTeam: number
}

interface MapHalfResult {
  team1Rounds: number
  team2Rounds: number
}

export interface PlayerStat extends Player {
  readonly value: number
}

export interface TeamStatComparison {
  team1: number
  team2: number
}

export interface MapStatsOverview {
  rating: TeamStatComparison
  firstKills: TeamStatComparison
  clutchesWon: TeamStatComparison
  mostKills: PlayerStat
  mostDamage?: PlayerStat
  mostAssists: PlayerStat
  mostAWPKills: PlayerStat
  mostFirstKills: PlayerStat
  bestRating1?: PlayerStat
  bestRating2?: PlayerStat
}

export interface MatchMapStats {
  id: number
  matchId: number
  result: {
    team1TotalRounds: number
    team2TotalRounds: number
    halfResults: MapHalfResult[]
  }
  map: GameMap
  date: number
  team1: Team
  team2: Team
  event: Event
  overview: MapStatsOverview
  roundHistory: RoundOutcome[]
  playerStats: {
    team1: PlayerStatsFull[]
    team2: PlayerStatsFull[]
  }
  performanceOverview: TeamsPerformanceOverview
}

export interface MatchMapStatsNoPerformance {
  id: number
  matchId: number
  result: {
    team1TotalRounds: number
    team2TotalRounds: number
    halfResults: MapHalfResult[]
  }
  map: GameMap
  date: number
  team1: Team
  team2: Team
  event: Event
  overview: MapStatsOverview
  roundHistory: RoundOutcome[]
  playerStats: {
    team1: PlayerStatsNoPerformance[]
    team2: PlayerStatsNoPerformance[]
  }
  performanceOverview: null
}

export type FullMatchMapStats = MatchMapStats | MatchMapStatsNoPerformance

export const getMatchMapStats =
  (config: HLTVConfig) =>
  async ({ id }: { id: number }): Promise<FullMatchMapStats> => {
    const m$ = await fetchPage(
      `https://www.hltv.org/stats/matches/mapstatsid/${id}/${generateRandomSuffix()}`,
      config.loadMatchStatsPage
    ).then(HLTVScraper)
    const p$ = await fetchPage(
      `https://www.hltv.org/stats/matches/performance/mapstatsid/${id}/${generateRandomSuffix()}`,
      config.loadMatchStatsPage
    )
      .then(HLTVScraper)
      .catch((e) => {
        console.error(
          `Error in load page https://www.hltv.org/stats/matches/performance/mapstatsid/${id}/${generateRandomSuffix()} - ${e.message}`
        )
        return null
      })
    // const [m$, p$] = await Promise.all([
    //   fetchPage(
    //     `https://www.hltv.org/stats/matches/mapstatsid/${id}/${generateRandomSuffix()}`,
    //     config.loadMatchStatsPage
    //   ).then(HLTVScraper),
    //   fetchPage(
    //     `https://www.hltv.org/stats/matches/performance/mapstatsid/${id}/${generateRandomSuffix()}`,
    //     config.loadMatchStatsPage
    //   ).then(HLTVScraper)
    // ])

    const matchId = m$('.match-page-link').attrThen('href', getIdAt(2))!
    const halfsString = m$('.match-info-row .right').eq(0).text()

    const result = {
      team1TotalRounds: m$('.team-left .bold').numFromText()!,
      team2TotalRounds: m$('.team-right .bold').numFromText()!,
      halfResults: halfsString
        .match(/(?!\() \d+ : \d+ (?=\))/g)!
        ?.map((x) => x.trim().split(' : '))
        ?.map(([t1, t2]) => ({
          team1Rounds: Number(t1),
          team2Rounds: Number(t2)
        }))
    }

    const map = fromMapName(m$('.match-info-box').contents().eq(3).trimText()!)
    const date = m$('.match-info-box span[data-time-format]').numFromAttr(
      'data-unix'
    )!

    const team1 = {
      id: m$('.team-left a').attrThen('href', getIdAt(3)),
      name: m$('.team-left .team-logo').attr('title')
    }

    const team2 = {
      id: m$('.team-right a').attrThen('href', getIdAt(3)),
      name: m$('.team-right .team-logo').attr('title')
    }

    const event = {
      id: Number(
        m$('.match-info-box .text-ellipsis')
          .first()
          .attr('href')
          ?.split('event=')
          ?.pop()
      ),
      name: m$('.match-info-box .text-ellipsis').first().text()
    }

    const roundHistory = getRoundHistory(m$, team1, team2)
    const overview = getStatsOverview(m$)
    const playerStats = getPlayerStats(m$, p$)
    const performanceOverview = p$
      ? getPerformanceOverview(p$)
      : getPerformanceOverview(p$)

    // TODO: kill matrix
    // TODO: equipment value

    return {
      id,
      matchId,
      result,
      map,
      date,
      team1,
      team2,
      event,
      overview,
      roundHistory,
      playerStats,
      performanceOverview
    }
  }

export function getOverviewPropertyFromLabel(
  label: string
): keyof MapStatsOverview | undefined {
  switch (label) {
    case 'Team rating':
      return 'rating'
    case 'First kills':
      return 'firstKills'
    case 'Clutches won':
      return 'clutchesWon'
    case 'Most kills':
      return 'mostKills'
    case 'Most damage':
      return 'mostDamage'
    case 'Most assists':
      return 'mostAssists'
    case 'Most AWP kills':
      return 'mostAWPKills'
    case 'Most first kills':
      return 'mostFirstKills'
    case 'Best rating 1.0':
      return 'bestRating1'
    case 'Best rating 2.0':
      return 'bestRating2'
  }
}

function getRoundHistory(
  $: HLTVPage,
  team1: Team,
  team2: Team
): RoundOutcome[] {
  const getOutcome = (el: HLTVPageElement) => ({
    outcome: el.attr('src').split('/').pop()?.split('.')[0]!,
    score: el.attr('title')
  })

  const team1Outcomes = $('.round-history-team-row')
    .first()
    .find('.round-history-outcome')
    .toArray()
    .map(getOutcome)
  const team2Outcomes = $('.round-history-team-row')
    .last()
    .find('.round-history-outcome')
    .toArray()
    .map(getOutcome)

  const doesTeam1StartAsCt = team1Outcomes[0]?.outcome.includes('ct')

  const separatorIndex =
    $('.round-history-team-row .round-history-bar').last().index() - 2

  return Array.from(Array(team1Outcomes.length))
    .map((_, i) => {
      if (
        team1Outcomes[i]?.outcome === 'emptyHistory' &&
        team2Outcomes[i]?.outcome === 'emptyHistory'
      ) {
        return null
      }

      const outcome =
        team1Outcomes[i].outcome === 'emptyHistory'
          ? (team2Outcomes[i]?.outcome as Outcome)
          : (team1Outcomes[i]?.outcome as Outcome)

      const score =
        team1Outcomes[i].outcome === 'emptyHistory'
          ? team2Outcomes[i]?.score
          : team1Outcomes[i]?.score

      let tTeam
      let ctTeam

      if (i < separatorIndex) {
        if (doesTeam1StartAsCt) {
          tTeam = team2.id!
          ctTeam = team1.id!
        } else {
          tTeam = team1.id!
          ctTeam = team2.id!
        }
      } else {
        if (doesTeam1StartAsCt) {
          tTeam = team1.id!
          ctTeam = team2.id!
        } else {
          tTeam = team2.id!
          ctTeam = team1.id!
        }
      }

      return {
        outcome,
        score,
        tTeam,
        ctTeam
      }
    })
    .filter(notNull)
}

export function getStatsOverview($: HLTVPage) {
  const teamStats = $('.match-info-row')
    .toArray()
    .slice(1)
    .reduce(
      (res, el, i) => {
        const prop = getOverviewPropertyFromLabel(el.find('.bold').text())

        if (!prop) {
          return res
        }

        const [team1, team2] = el.find('.right').text().split(' : ').map(Number)
        res[prop] = { team1, team2 }

        return res
      },
      {} as Record<string, any>
    )

  const mostX = $('.most-x-box')
    .toArray()
    .reduce(
      (res, el, i) => {
        const prop = getOverviewPropertyFromLabel(
          el.find('.most-x-title').text()
        )

        if (!prop) {
          return res
        }

        const playerHref = el.find('.name > a').attr('href')

        res[prop] = {
          id: playerHref ? getIdAt(3, playerHref) : undefined,
          name: $('.most-x-box').eq(i).find('.name > a').text(),
          value: $('.most-x-box').eq(i).find('.valueName').numFromText()
        }

        return res
      },
      {} as Record<string, any>
    )

  return { ...teamStats, ...mostX } as any
}

export function getPlayerStats(m$: HLTVPage, p$: HLTVPage | null) {
  const playerPerformanceStats = p$?.('.highlighted-player')
    .toArray()
    .reduce(
      (map, el) => {
        const graphData = el
          .find('.graph.small')
          .attr('data-fusionchart-config')!
        const { playerId, ...data } = {
          playerId: Number(
            el.find('.headline span a').attr('href')!.split('/')[2]
          ),
          killsPerRound: Number(
            graphData.split('Kills per round: ')[1].split('"')[0]
          ),
          deathsPerRound: Number(
            graphData.split('Deaths / round: ')[1].split('"')[0]
          ),
          impact: Number(graphData.split('Impact rating: ')[1].split('"')[0])
        }

        map[playerId] = data

        return map
      },
      {} as Record<string, Partial<PlayerStats>>
    )

  const getPlayerOverviewStats = (el: HLTVPageElement) => {
    const id = el.find('.st-player a').attrThen('href', getIdAt(3))!
    const performanceStats = playerPerformanceStats?.[id]
    const rating = el.find('.st-rating').numFromText()
    const firstKillsDeathsString = el.find('.st-fkdiff').attr('title')
    const [firstKills, firstDeaths] = (
      firstKillsDeathsString.match(/[0-9]+/g) ?? []
    ).map(Number)

    return {
      player: {
        id,
        name: el.find('.st-player a').text()
      },
      kills: el.find('.st-kills').contents().first().numFromText()!,
      hsKills: Number(
        el.find('.st-kills .gtSmartphone-only').text().replace(/\(|\)/g, '')
      ),
      assists: el.find('.st-assists').contents().first().numFromText()!,
      flashAssists: Number(
        el.find('.st-assists .gtSmartphone-only').text().replace(/\(|\)/g, '')
      ),
      deaths: el.find('.st-deaths').numFromText()!,
      KAST: el
        .find('.st-kdratio')
        .textThen((x) => parseNumber(x.replace('%', ''))),
      killDeathsDifference: el.find('.st-kddiff').numFromText(),
      ADR: el.find('.st-adr').numFromText(),
      firstKillsDifference: el.find('.st-fkdiff').numFromText(),
      firstKills,
      firstDeaths,
      ...(el.find('.st-rating .ratingDesc').text() === '2.0'
        ? { rating2: rating }
        : { rating1: rating }),
      ...(performanceStats as any)
    }
  }

  return {
    team1: m$('.stats-table.totalstats')
      .first()
      .find('tbody tr')
      .toArray()
      .map(getPlayerOverviewStats),
    team2: m$('.stats-table.totalstats')
      .last()
      .find('tbody tr')
      .toArray()
      .map(getPlayerOverviewStats)
  }
}

export function getPerformanceOverview(p$: HLTVPage): TeamsPerformanceOverview
export function getPerformanceOverview(p$: null): null
export function getPerformanceOverview(
  p$: HLTVPage | null
): TeamsPerformanceOverview | null {
  return !p$
    ? null
    : p$('.overview-table tr')
        .toArray()
        .slice(1)
        .reduce(
          (res, el) => {
            const property = el
              .find('.name-column')
              .text()
              .toLowerCase() as keyof TeamPerformance

            res.team1[property] = el.find('.team1-column').numFromText()!
            res.team2[property] = el.find('.team2-column').numFromText()!

            return res
          },
          { team1: {}, team2: {} } as TeamsPerformanceOverview
        )
}
