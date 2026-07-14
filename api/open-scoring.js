// Open Week Live Desk scoring endpoint.
// Official numbers from ESPN's public leaderboard, merged with manual
// updates from live.json, which always win when marked active.
module.exports = async function handler(req, res) {
  var checkedAt = new Date().toISOString();
  var payload = { active: false, checkedAt: checkedAt };

  try {
    var upstream = await fetch('https://site.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard');
    var d = await upstream.json();
    var comps = d.events[0].competitions[0].competitors || [];
    for (var i = 0; i < comps.length; i++) {
      var c = comps[i];
      var name = (c.athlete && (c.athlete.displayName || c.athlete.fullName)) || '';
      if (/howard/i.test(name) && /david/i.test(name)) {
        var st = c.status || {};
        var rounds = [];
        if (c.linescores) {
          for (var j = 0; j < c.linescores.length; j++) {
            rounds.push(c.linescores[j].displayValue || c.linescores[j].value || '');
          }
        }
        var leader = '';
        try { leader = (comps[0].score && comps[0].score.displayValue) || comps[0].score || ''; } catch (e) {}
        var thru = st.thru || '';
        payload = {
          active: true,
          state: (String(thru) === '18' || String(thru).toUpperCase() === 'F') ? 'round_complete' : 'in_progress',
          score: (c.score && c.score.displayValue) || c.score || 'E',
          position: (st.position && (st.position.displayName || st.position.id)) || '',
          thru: thru,
          today: st.displayValue || '',
          round: rounds.length,
          rounds: rounds,
          leader: leader,
          sourceUrl: 'https://www.theopen.com/leaderboard',
          sourceUpdatedAt: checkedAt,
          checkedAt: checkedAt
        };
        break;
      }
    }
  } catch (e) { /* upstream unavailable; manual layer below still applies */ }

  try {
    var host = req.headers['x-forwarded-host'] || req.headers.host;
    var manualRes = await fetch('https://' + host + '/live.json?t=' + Date.now());
    var manual = await manualRes.json();
    if (manual) {
      ['note', 'whatItMeans', 'insights', 'updates', 'scorecard'].forEach(function (k) {
        if (manual[k] != null && manual[k] !== '') payload[k] = manual[k];
      });
      if (manual.active) {
        Object.keys(manual).forEach(function (k) {
          if (manual[k] != null && manual[k] !== '') payload[k] = manual[k];
        });
        payload.active = true;
        payload.checkedAt = checkedAt;
      }
    }
  } catch (e) { /* no manual layer */ }

  res.setHeader('Cache-Control', 's-maxage=45, stale-while-revalidate=90');
  res.status(200).json(payload);
};
