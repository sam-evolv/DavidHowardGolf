import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { normalizeFeed } = require('../api/open-scoring.js');

function feed(overrides = {}) {
  return {
    currentRound: 1,
    currentRoundStatus: 2,
    lastUpdated: '2026-07-16T12:34:56',
    players: [
      {
        firstName: 'Leader', lastName: 'Golfer',
        position: { displayValue: '1', sortValue: 1 },
        hole: 10, toPar: -4, today: -4, r1: null, r2: null,
        rounds: [{ id: 1, info: [] }]
      },
      {
        firstName: 'David', lastName: 'Howard',
        position: { displayValue: 'T23', sortValue: 23 },
        hole: 8, toPar: -1, today: -1, r1: null, r2: null,
        rounds: [{
          id: 1,
          info: [
            { holeId: 1, holePar: 4, playerPar: 0, playerStrokes: 4 },
            { holeId: 2, holePar: 4, playerPar: -1, playerStrokes: 3 },
            { holeId: 3, holePar: 3, playerPar: 0, playerStrokes: 3 }
          ]
        }]
      }
    ],
    ...overrides
  };
}

test('normalizes David Howard from the official Open scoring feed', () => {
  const result = normalizeFeed(feed());
  assert.equal(result.active, true);
  assert.equal(result.state, 'on_course');
  assert.equal(result.score, '-1');
  assert.equal(result.position, 'T23');
  assert.equal(result.thru, '8');
  assert.equal(result.today, '-1');
  assert.equal(result.leader, '-4');
  assert.equal(result.sourceName, 'The Open official scoring');
  assert.equal(result.sourceUrl, 'https://www.theopen.com/leaderboard');
  assert.equal(result.sourceUpdatedAt, '2026-07-16T12:34:56+01:00');
  assert.deepEqual(result.scorecard.slice(0, 3), [
    { number: 1, par: 4, score: 4 },
    { number: 2, par: 4, score: 3 },
    { number: 3, par: 3, score: 3 }
  ]);
  assert.ok(result.insights.some(item => item.label === 'Gap to lead' && item.value === '3 shots'));
});

test('keeps the official feed inactive before David starts', () => {
  const data = feed({
    currentRoundStatus: 1,
    players: [{
      firstName: 'David', lastName: 'Howard',
      position: { displayValue: null, sortValue: 69 },
      hole: null, toPar: null, today: null, r1: null, r2: null,
      rounds: [{ id: 1, teeTime: '2026-07-16T10:42:00Z', info: [] }]
    }]
  });
  const result = normalizeFeed(data);
  assert.equal(result.active, false);
  assert.equal(result.state, 'upcoming');
  assert.equal(result.nextTeeTime, '2026-07-16T10:42:00Z');
});

test('fails closed when David is absent from the feed', () => {
  assert.throws(
    () => normalizeFeed({ players: [], lastUpdated: '2026-07-16T12:34:56' }),
    /David Howard not found/
  );
});
