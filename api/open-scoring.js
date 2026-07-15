const OFFICIAL_FEED = 'https://scoring.theopen.com/scoring?feedType=traditional';
const OFFICIAL_LEADERBOARD = 'https://www.theopen.com/leaderboard';

function numeric(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') {
    if (value.displayValue !== null && value.displayValue !== undefined) return numeric(value.displayValue);
    if (value.value !== null && value.value !== undefined) return numeric(value.value);
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function displayToPar(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'object' && value.displayValue !== undefined) {
    return value.displayValue || '';
  }
  const number = numeric(value);
  if (number === null) return String(value);
  if (number === 0) return 'E';
  return number > 0 ? `+${number}` : String(number);
}

function normalizeOfficialTime(value) {
  if (!value) return null;
  const text = String(value);
  if (/Z$|[+-]\d\d:\d\d$/.test(text)) return text;
  // The Championship feed publishes its clock in Royal Birkdale local time.
  return `${text}+01:00`;
}

function findDavid(players) {
  return players.find((player) =>
    String(player.firstName || '').trim().toLowerCase() === 'david' &&
    String(player.lastName || '').trim().toLowerCase() === 'howard'
  );
}

function normalizeFeed(feed) {
  const players = Array.isArray(feed && feed.players) ? feed.players : [];
  const david = findDavid(players);
  if (!david) throw new Error('David Howard not found in official scoring feed');

  const currentRound = numeric(david.currentRound) || numeric(feed.currentRound) || 1;
  const currentRoundScore = numeric(david[`r${currentRound}`]);
  const toParNumber = numeric(david.toPar);
  const todayNumber = numeric(david.today);
  const holeNumber = numeric(david.hole);
  const hasStarted = toParNumber !== null || todayNumber !== null || holeNumber !== null || currentRoundScore !== null;
  const roundComplete = hasStarted && currentRoundScore !== null;
  const state = !hasStarted ? 'upcoming' : (roundComplete ? 'round_complete' : 'on_course');

  const positionValue = david.position && typeof david.position === 'object'
    ? david.position.displayValue
    : david.position;
  const leader = players
    .filter((player) => numeric(player.toPar) !== null)
    .sort((a, b) => {
      const ap = numeric(a.position && a.position.sortValue);
      const bp = numeric(b.position && b.position.sortValue);
      return (ap === null ? 9999 : ap) - (bp === null ? 9999 : bp);
    })[0];
  const leaderToPar = leader ? numeric(leader.toPar) : null;

  const roundData = Array.isArray(david.rounds)
    ? david.rounds.find((round) => numeric(round.id) === currentRound)
    : null;
  const scorecard = roundData && Array.isArray(roundData.info)
    ? roundData.info
        .filter((hole) => numeric(hole.playerStrokes) > 0)
        .map((hole) => ({
          number: numeric(hole.holeId),
          par: numeric(hole.holePar),
          score: numeric(hole.playerStrokes)
        }))
    : [];

  const rounds = [david.r1, david.r2, david.r3, david.r4]
    .filter((value) => numeric(value) !== null)
    .map((value) => numeric(value));

  const insights = [];
  if (state === 'on_course' && holeNumber !== null) {
    insights.push({
      label: 'Round progress',
      value: `${holeNumber} of 18`,
      detail: `Round ${currentRound}`
    });
  }
  if (toParNumber !== null && leaderToPar !== null) {
    const gap = toParNumber - leaderToPar;
    insights.push({
      label: 'Gap to lead',
      value: gap === 0 ? 'Tied' : `${gap} ${gap === 1 ? 'shot' : 'shots'}`,
      detail: `Leader ${displayToPar(leaderToPar)}`
    });
  }
  if (positionValue) {
    insights.push({
      label: 'Official position',
      value: String(positionValue),
      detail: 'The Open leaderboard'
    });
  }

  return {
    schemaVersion: 2,
    active: state !== 'upcoming',
    state,
    round: currentRound,
    score: displayToPar(david.toPar),
    position: positionValue || '',
    thru: roundComplete ? 'F' : (holeNumber === null ? '' : String(holeNumber)),
    today: displayToPar(david.today),
    rounds,
    leader: leaderToPar === null ? '' : displayToPar(leaderToPar),
    note: '',
    whatItMeans: '',
    insights: insights.slice(0, 3),
    scorecard,
    updates: [],
    nextTeeTime: roundData && roundData.teeTime ? roundData.teeTime : null,
    sourceName: 'The Open official scoring',
    sourceUrl: OFFICIAL_LEADERBOARD,
    sourceUpdatedAt: normalizeOfficialTime(feed.lastUpdated || feed.smtTimeStamp),
    checkedAt: new Date().toISOString()
  };
}

async function handler(request, response) {
  if (request.method && request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const upstream = await fetch(OFFICIAL_FEED, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DavidHowardGolf/1.0 (+https://www.davidhowardgolf.ie)'
      },
      signal: controller.signal
    });
    if (!upstream.ok) throw new Error(`Official scoring returned ${upstream.status}`);
    const data = normalizeFeed(await upstream.json());
    response.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    return response.status(200).json(data);
  } catch (error) {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(502).json({
      active: false,
      state: 'unavailable',
      error: 'Official scoring is temporarily unavailable',
      sourceUrl: OFFICIAL_LEADERBOARD
    });
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = handler;
module.exports.normalizeFeed = normalizeFeed;
