/* LIVE MODULE · davidhowardgolf.ie · Championship week only */
(function(){
  if(!window.fetch) return;

  var LIVE_VISIBLE_POLL_MS = 15000;
  var LIVE_BACKGROUND_POLL_MS = 60000;
  var WEEK_POLL_MS = 60000;
  var STALE_AFTER_MS = 120000;
  var grid = document.querySelector('.clock-grid');
  var strip = null;
  var weekList = null;

  function esc(value){
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatTime(value){
    if(!value) return 'Time unavailable';
    var date = new Date(value);
    if(isNaN(date.getTime())) return 'Time unavailable';
    return date.toLocaleTimeString('en-IE', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Dublin'
    }) + ' Irish time';
  }

  function isStale(data){
    if(data.state !== 'on_course' || !data.sourceUpdatedAt) return false;
    var sourceTime = new Date(data.sourceUpdatedAt).getTime();
    return isNaN(sourceTime) || Date.now() - sourceTime > STALE_AFTER_MS;
  }

  function fetchJson(path){
    return fetch(path + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function(response){
        if(!response.ok) throw new Error('Unable to load ' + path);
        return response.json();
      });
  }

  function createLiveStrip(){
    if(!grid || strip) return;
    strip = document.createElement('section');
    strip.id = 'live-strip';
    strip.hidden = true;
    strip.setAttribute('aria-live', 'polite');
    strip.innerHTML =
      '<p class="live-tag" id="lv-status"><span class="live-dot" aria-hidden="true"></span>Live · The 154th Open · Royal Birkdale</p>' +
      '<div class="live-main"><div class="live-score" id="lv-score">E</div>' +
      '<div class="live-meta">' +
      '<div class="lv-cell"><span class="lv-k">Pos</span><span class="lv-v" id="lv-pos">--</span></div>' +
      '<div class="lv-cell"><span class="lv-k">Thru</span><span class="lv-v" id="lv-thru">--</span></div>' +
      '<div class="lv-cell"><span class="lv-k">Today</span><span class="lv-v" id="lv-today">--</span></div>' +
      '</div></div>' +
      '<p class="live-rounds" id="lv-rounds"></p>' +
      '<p class="live-note" id="lv-note"></p>' +
      '<p class="live-verified" id="lv-verified"></p>' +
      '<ol class="live-timeline" id="lv-timeline"></ol>';
    grid.parentNode.insertBefore(strip, grid);
  }

  function renderTimeline(updates){
    var timeline = document.getElementById('lv-timeline');
    if(!timeline) return;
    var safeUpdates = Array.isArray(updates) ? updates.slice(0, 5) : [];
    timeline.innerHTML = safeUpdates.map(function(update){
      var label = update && update.label ? update.label : '';
      var at = update && update.at ? formatTime(update.at).replace(' Irish time', '') : '';
      return '<li><time>' + esc(at) + '</time><span>' + esc(label) + '</span></li>';
    }).join('');
  }

  function renderLive(data){
    if(!data || !data.active || !strip) return;
    var stale = isStale(data);
    var complete = data.state === 'round_complete';
    document.getElementById('lv-score').textContent = data.score || 'E';
    document.getElementById('lv-pos').textContent = data.position || data.pos || '--';
    document.getElementById('lv-thru').textContent = complete ? 'Final' : (data.thru || '--');
    document.getElementById('lv-today').textContent = data.today || '--';

    var status = document.getElementById('lv-status');
    status.className = 'live-tag' + (stale ? ' is-stale' : '');
    status.innerHTML = '<span class="live-dot" aria-hidden="true"></span>' +
      (complete ? 'Round ' + esc(data.round || '') + ' complete' : (stale ? 'Latest verified score' : 'Live')) +
      ' · The 154th Open · Royal Birkdale';

    var rounds = document.getElementById('lv-rounds');
    var parts = [];
    if(Array.isArray(data.rounds)) {
      for(var i = 0; i < data.rounds.length; i++) parts.push('R' + (i + 1) + ' <b>' + esc(data.rounds[i]) + '</b>');
    }
    if(data.leader) parts.push('Leader <b>' + esc(data.leader) + '</b>');
    rounds.innerHTML = parts.join(' · ');
    document.getElementById('lv-note').textContent = data.note || '';

    var verified = document.getElementById('lv-verified');
    var sourceLink = data.sourceUrl && /^https:\/\//.test(data.sourceUrl)
      ? '<a href="' + esc(data.sourceUrl) + '" target="_blank" rel="noopener">Official leaderboard ↗</a>'
      : '';
    verified.innerHTML = (stale ? 'Last verified ' : 'Verified ') + esc(formatTime(data.sourceUpdatedAt || data.checkedAt)) +
      (sourceLink ? ' · ' + sourceLink : '');
    renderTimeline(data.updates);

    strip.hidden = false;
    grid.style.display = 'none';
    var nextUp = document.querySelector('.next-up'); if(nextUp) nextUp.style.display = 'none';
    var clockHead = document.querySelector('.clock-head'); if(clockHead) clockHead.style.display = 'none';
  }

  function refreshLive(){
    return fetchJson('/live.json')
      .then(renderLive)
      .catch(function(){
        var status = document.getElementById('lv-status');
        if(status) status.textContent = 'Latest verified score unavailable — see official leaderboard';
      });
  }

  function renderWeek(data){
    if(!weekList || !data || !Array.isArray(data.days)) return;
    var html = '';
    for(var i = 0; i < data.days.length; i++){
      var day = data.days[i];
      var statusClass = day.status === 'live' ? ' live' : '';
      var statusText = day.status === 'live' ? 'Live now' : day.status === 'done' ? 'Complete' : 'Ahead';
      html += '<article class="wk"><div class="wk-when">' +
        '<span class="wk-date">' + esc(day.label) + '</span>' +
        '<span class="wk-title">' + esc(day.title) + '</span>' +
        '<span class="wk-status' + statusClass + '">' + statusText + '</span>' +
        '</div><div class="wk-body"><div class="wk-facts">' +
        '<span>Tee ' + (day.tee ? '<b>' + esc(day.tee) + '</b>' : '<span class="tba">TBA</span>') + '</span>' +
        '<span>Playing with ' + (Array.isArray(day.partners) && day.partners.length ? '<b>' + esc(day.partners.join(' and ')) + '</b>' : '<span class="tba">draw to come</span>') + '</span>' +
        (day.score ? '<span class="wk-score"><b>' + esc(day.score) + '</b></span>' : '') +
        '</div>' + (day.note ? '<p class="wk-note">' + esc(day.note) + '</p>' : '') + '</div></article>';
    }
    weekList.innerHTML = html;
    var weekStamp = document.getElementById('week-updated');
    if(weekStamp) weekStamp.textContent = data.updatedAt ? 'Week updated ' + formatTime(data.updatedAt) : '';
  }

  function refreshWeek(){
    return fetchJson('/week.json').then(renderWeek).catch(function(){});
  }

  function buildWeek(){
    var media = document.querySelector('.media');
    if(!media) return;
    var week = document.createElement('section');
    week.className = 'week';
    week.setAttribute('aria-labelledby', 'week-title');
    week.innerHTML =
      '<div class="container"><div class="week-head">' +
      '<h2 class="display" id="week-title">The week at Birkdale</h2>' +
      '<p>Tee times, pairings and the road diary, updated through the Championship.</p>' +
      '<p class="week-updated" id="week-updated" aria-live="polite"></p>' +
      '</div><div class="follow" id="follow"></div><div id="week-list" class="week-list"></div></div>';
    media.parentNode.insertBefore(week, media);
    weekList = document.getElementById('week-list');
    var ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//davidhowardgolf//EN\r\nBEGIN:VEVENT\r\n'
      + 'UID:dhg-r1@davidhowardgolf.ie\r\nDTSTAMP:20260713T200000Z\r\n'
      + 'DTSTART:20260716T094200Z\r\nDTEND:20260716T150000Z\r\n'
      + 'SUMMARY:David Howard tees off - The 154th Open\r\n'
      + 'LOCATION:Royal Birkdale\\, Southport\r\n'
      + 'DESCRIPTION:Round 1 with Kazuma Kobori and Tom Sloman. Follow live at davidhowardgolf.ie\r\n'
      + 'URL:https://www.davidhowardgolf.ie\r\nEND:VEVENT\r\nEND:VCALENDAR';
    document.getElementById('follow').innerHTML =
      '<p class="fw-title">How to follow</p><div class="fw-grid">' +
      '<span class="fw-item"><b>His group</b>10:42 Irish and UK time · 5:42am US Eastern</span>' +
      '<span class="fw-item"><b>TV · Ireland and UK</b>Sky Sports Golf from 6:30am</span>' +
      '<span class="fw-item"><b>TV · US</b>Peacock from 1:30am ET, then USA Network</span>' +
      '<span class="fw-item"><b>Every shot</b><a href="https://www.theopen.com/leaderboard" target="_blank" rel="noopener">Official Open leaderboard</a></span>' +
      '<span class="fw-item"><b>His profile</b><a href="https://www.theopen.com/players/david-howard" target="_blank" rel="noopener">Official Open player page</a></span>' +
      '</div><a class="fw-cal" download="david-howard-open.ics" href="data:text/calendar;charset=utf-8,' + encodeURIComponent(ics) + '">Add his tee time to your calendar</a>';
  }

  var liveTimer = null;
  function scheduleLiveRefresh(){
    if(liveTimer) clearTimeout(liveTimer);
    refreshLive().then(function(){
      liveTimer = setTimeout(scheduleLiveRefresh, document.hidden ? LIVE_BACKGROUND_POLL_MS : LIVE_VISIBLE_POLL_MS);
    });
  }

  createLiveStrip();
  buildWeek();
  scheduleLiveRefresh();
  refreshWeek();
  setInterval(refreshWeek, WEEK_POLL_MS);
  document.addEventListener('visibilitychange', function(){
    scheduleLiveRefresh();
    if(!document.hidden) refreshWeek();
  });
})();
