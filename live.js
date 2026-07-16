/* OPEN WEEK LIVE DESK · event-scoped bolt-on for davidhowardgolf.ie */
(function(){
  if(!window.fetch) return;

  var LIVE_VISIBLE_POLL_MS = 15000;
  var LIVE_BACKGROUND_POLL_MS = 60000;
  var WEEK_POLL_MS = 60000;
  var STALE_AFTER_MS = 120000;
  var grid = document.querySelector('.clock-grid');
  var strip = null;
  var desk = null;
  var weekList = null;
  var diaryList = null;
  var eventEnabled = false;
  var liveTimer = null;
  var followScheduleKey = null;

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

  function formatDateTime(value){
    if(!value) return '';
    var date = new Date(value);
    if(isNaN(date.getTime())) return '';
    return date.toLocaleString('en-IE', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Dublin'
    }) + ' Irish time';
  }

  function formatScheduleTime(value, timeZone, locale, hour12){
    if(!value) return '';
    var date = new Date(value);
    if(isNaN(date.getTime())) return '';
    return date.toLocaleTimeString(locale || 'en-IE', {
      hour: 'numeric', minute: '2-digit', timeZone: timeZone, hour12: hour12
    });
  }

  function formatIcsTime(value){
    var date = new Date(value);
    if(isNaN(date.getTime())) return '';
    function two(number){ return number < 10 ? '0' + number : String(number); }
    return date.getUTCFullYear() + two(date.getUTCMonth() + 1) + two(date.getUTCDate()) + 'T' +
      two(date.getUTCHours()) + two(date.getUTCMinutes()) + two(date.getUTCSeconds()) + 'Z';
  }

  function findRound(data, id){
    if(!data || !Array.isArray(data.days)) return null;
    for(var i = 0; i < data.days.length; i++){
      if(data.days[i] && data.days[i].id === id) return data.days[i];
    }
    return null;
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
      '</div></div><p class="live-rounds" id="lv-rounds"></p><p class="live-note" id="lv-note"></p>' +
      '<p class="live-meaning" id="lv-meaning"></p><p class="live-verified" id="lv-verified"></p>' +
      '<ol class="live-timeline" id="lv-timeline"></ol><div class="live-insights" id="live-insights"></div><div class="live-scorecard" id="lv-scorecard"></div>';
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

  function renderInsights(insights){
    var panel = document.getElementById('live-insights');
    if(!panel) return;
    var items = Array.isArray(insights) ? insights.filter(function(item){
      return item && item.label && item.value;
    }).slice(0, 3) : [];
    if(!items.length){ panel.innerHTML = ''; return; }
    panel.innerHTML = '<p class="insights-title">Round at a glance</p>' + items.map(function(item){
      return '<article><span>' + esc(item.label) + '</span><strong>' + esc(item.value) + '</strong>' +
        (item.detail ? '<p>' + esc(item.detail) + '</p>' : '') + '</article>';
    }).join('');
  }

  function renderScorecard(scorecard){
    var box = document.getElementById('lv-scorecard');
    if(!box) return;
    var holes = Array.isArray(scorecard) ? scorecard.filter(function(hole){ return hole && hole.number; }) : [];
    if(!holes.length){ box.innerHTML = ''; return; }
    var cells = holes.map(function(hole){
      return '<li><span>Hole ' + esc(hole.number) + '</span><b>' + esc(hole.score || '—') + '</b><small>Par ' + esc(hole.par || '—') + '</small></li>';
    }).join('');
    box.innerHTML = '<p class="scorecard-title">Hole-by-hole</p><ol>' + cells + '</ol>';
  }

  function deactivateLiveStrip(){
    if(strip) strip.hidden = true;
    if(grid) grid.style.display = '';
    var nextUp = document.querySelector('.next-up'); if(nextUp) nextUp.style.display = '';
    var clockHead = document.querySelector('.clock-head'); if(clockHead) clockHead.style.display = '';
  }

  function renderLive(data){
    if(!data || !data.active){ deactivateLiveStrip(); return; }
    createLiveStrip();
    if(!strip) return;
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
    document.getElementById('lv-meaning').textContent = data.whatItMeans || '';

    var verified = document.getElementById('lv-verified');
    var sourceLink = data.sourceUrl && /^https:\/\//.test(data.sourceUrl)
      ? '<a href="' + esc(data.sourceUrl) + '" target="_blank" rel="noopener">Official leaderboard ↗</a>' : '';
    verified.innerHTML = (stale ? 'Last verified ' : 'Verified ') + esc(formatTime(data.sourceUpdatedAt || data.checkedAt)) +
      (sourceLink ? ' · ' + sourceLink : '');
    renderTimeline(data.updates);
    renderInsights(data.insights);
    renderScorecard(data.scorecard);

    strip.hidden = false;
    grid.style.display = 'none';
    var nextUp = document.querySelector('.next-up'); if(nextUp) nextUp.style.display = 'none';
    var clockHead = document.querySelector('.clock-head'); if(clockHead) clockHead.style.display = 'none';
  }

  function updateOfficialFeedStatus(data, isFallback){
    var status = document.getElementById('official-feed-status');
    if(!status) return;
    if(isFallback){
      status.innerHTML = 'Official scoring connection temporarily unavailable · <a href="https://www.theopen.com/leaderboard" target="_blank" rel="noopener">Open leaderboard ↗</a>';
      status.className = 'official-feed-status is-unavailable';
      return;
    }
    var verifiedAt = data && (data.sourceUpdatedAt || data.checkedAt);
    status.textContent = 'Official scoring connected' + (verifiedAt ? ' · Feed verified ' + formatTime(verifiedAt) : '');
    status.className = 'official-feed-status is-connected';
  }

  function refreshOfficialScoring(){
    return fetchJson('/api/open-scoring').then(function(data){
      updateOfficialFeedStatus(data, false);
      renderLive(data);
      return data;
    });
  }

  function refreshLive(){
    if(!eventEnabled) return Promise.resolve();
    return refreshOfficialScoring().catch(function(){
      updateOfficialFeedStatus(null, true);
      return fetchJson('/live.json').then(renderLive).catch(function(){
        deactivateLiveStrip();
      });
    });
  }

  function buildLiveDesk(data){
    if(desk) return;
    var media = document.querySelector('.media');
    if(!media) return;
    desk = document.createElement('section');
    desk.id = 'open-week-live-desk';
    desk.className = 'week live-desk';
    desk.setAttribute('aria-labelledby', 'live-desk-title');
    desk.innerHTML =
      '<div class="container"><div class="week-head live-desk-head">' +
      '<p class="eyebrow">David Howard · Championship week</p>' +
      '<h2 class="display" id="live-desk-title">Open Week Live Desk</h2>' +
      '<p id="live-desk-intro">The score, the story and what comes next — in one place.</p>' +
      '<p class="week-updated" id="week-updated" aria-live="polite"></p></div>' +
      '<div class="live-brief"><article><span class="brief-k">Next up</span><strong id="desk-next">Schedule to follow</strong><p id="desk-next-detail"></p></article>' +
      '<article><span class="brief-k">Why it matters</span><strong id="desk-context">Follow every round</strong><p>Verified official scoring, alongside updates from David’s team at Birkdale.</p></article></div>' +
      '<div class="follow" id="follow"></div><div class="live-desk-grid">' +
      '<div><p class="fw-title">The Championship</p><div id="week-list" class="week-list"></div></div>' +
      '<aside class="road-diary"><p class="fw-title">From Birkdale</p><ol id="road-diary" class="road-diary-list"></ol></aside>' +
      '</div></div>';
    media.parentNode.insertBefore(desk, media);
    weekList = document.getElementById('week-list');
    diaryList = document.getElementById('road-diary');
  }

  function renderFollow(data){
    var follow = document.getElementById('follow');
    var day = findRound(data, 'r1');
    if(!follow || !day || !day.teeTime) return;
    if(followScheduleKey === day.teeTime && follow.innerHTML) return;
    followScheduleKey = day.teeTime;

    var start = new Date(day.teeTime);
    var end = new Date(start.getTime() + (5 * 60 * 60 * 1000));
    var localTime = formatScheduleTime(day.teeTime, 'Europe/Dublin', 'en-IE', false);
    var easternTime = formatScheduleTime(day.teeTime, 'America/New_York', 'en-US', true);
    var ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//davidhowardgolf//EN\r\nBEGIN:VEVENT\r\n'
      + 'UID:dhg-r1@davidhowardgolf.ie\r\nDTSTAMP:20260713T200000Z\r\n'
      + 'DTSTART:' + formatIcsTime(start) + '\r\nDTEND:' + formatIcsTime(end) + '\r\n'
      + 'SUMMARY:David Howard tees off - The 154th Open\r\n'
      + 'LOCATION:Royal Birkdale\\, Southport\r\n'
      + 'DESCRIPTION:Round 1 with Kazuma Kobori and Tom Sloman. Follow live at davidhowardgolf.ie\r\n'
      + 'URL:https://www.davidhowardgolf.ie\r\nEND:VEVENT\r\nEND:VCALENDAR';
    follow.innerHTML =
      '<p class="fw-title">How to follow</p><div class="fw-grid">' +
      '<span class="fw-item"><b>His group</b>' + esc(localTime) + ' Irish and UK time · ' + esc(easternTime) + ' US Eastern</span>' +
      '<span class="fw-item"><b>TV · Ireland and UK</b>Sky Sports Golf from 6:30am</span>' +
      '<span class="fw-item"><b>TV · US</b>Peacock from 1:30am ET, then USA Network</span>' +
      '<span class="fw-item"><b>Every shot</b><a href="https://www.theopen.com/leaderboard" target="_blank" rel="noopener">Official Open leaderboard</a></span>' +
      '<span class="fw-item"><b>His profile</b><a href="https://www.theopen.com/players/david-howard" target="_blank" rel="noopener">Official Open player page</a></span>' +
      '</div><p class="official-feed-status" id="official-feed-status" aria-live="polite">Checking the official scoring connection…</p>' +
      '<a class="fw-cal" download="david-howard-open.ics" href="data:text/calendar;charset=utf-8,' + encodeURIComponent(ics) + '">Add his tee time to your calendar</a>';
  }

  function renderDiary(updates){
    if(!diaryList) return;
    var items = Array.isArray(updates) ? updates.slice(0, 8) : [];
    diaryList.innerHTML = items.map(function(item){
      var label = item && item.label ? item.label : 'Team update';
      var body = item && item.body ? item.body : '';
      var at = item && item.at ? formatDateTime(item.at) : '';
      var kind = item && item.kind ? item.kind.replace(/_/g, ' ') : 'team update';
      return '<li><p class="diary-meta">' + esc(kind) + (at ? ' · ' + esc(at) : '') + '</p><strong>' + esc(label) + '</strong>' +
        (body ? '<p>' + esc(body) + '</p>' : '') + '</li>';
    }).join('') || '<li class="diary-empty">Team updates from Birkdale will appear here during the Championship.</li>';
  }

  function renderWeek(data){
    if(!data || !data.enabled){ teardownEventExperience(); return; }
    buildLiveDesk(data);
    if(!weekList) return;
    renderFollow(data);
    var html = '';
    for(var i = 0; i < data.days.length; i++){
      var day = data.days[i];
      var statusClass = day.status === 'live' ? ' live' : '';
      var statusText = day.status === 'live' ? 'Live now' : day.status === 'done' ? 'Complete' : 'Ahead';
      var teeTime = day.teeTime ? formatScheduleTime(day.teeTime, 'Europe/Dublin', 'en-IE', false) : '';
      var teeDisplay = teeTime ? teeTime + (day.tee ? ' · ' + day.tee : '') : '';
      html += '<article class="wk"><div class="wk-when"><span class="wk-date">' + esc(day.label) + '</span><span class="wk-title">' + esc(day.title) + '</span><span class="wk-status' + statusClass + '">' + statusText + '</span></div>' +
        '<div class="wk-body"><div class="wk-facts"><span>Tee ' + (teeDisplay ? '<b>' + esc(teeDisplay) + '</b>' : '<span class="tba">TBA</span>') + '</span>' +
        '<span>Playing with ' + (Array.isArray(day.partners) && day.partners.length ? '<b>' + esc(day.partners.join(' and ')) + '</b>' : '<span class="tba">draw to come</span>') + '</span>' +
        (day.score ? '<span class="wk-score"><b>' + esc(day.score) + '</b></span>' : '') + '</div>' +
        (day.note ? '<p class="wk-note">' + esc(day.note) + '</p>' : '') + '</div></article>';
    }
    weekList.innerHTML = html;
    renderDiary(data.updates);
    var stamp = document.getElementById('week-updated');
    if(stamp) stamp.textContent = data.updatedAt ? 'Desk updated ' + formatTime(data.updatedAt) : '';
    var intro = document.getElementById('live-desk-intro');
    if(intro && data.intro) intro.textContent = data.intro;
    var next = document.getElementById('desk-next');
    var nextDetail = document.getElementById('desk-next-detail');
    var nextDay = null;
    for(var j = 0; j < data.days.length; j++){
      if(data.days[j] && data.days[j].teeTime && data.days[j].status !== 'done'){ nextDay = data.days[j]; break; }
    }
    if(next) next.textContent = nextDay
      ? nextDay.title + ' · ' + nextDay.label + ', ' + formatScheduleTime(nextDay.teeTime, 'Europe/Dublin', 'en-IE', false)
      : 'Schedule to follow';
    if(nextDetail) nextDetail.textContent = data.next && data.next.detail ? data.next.detail : '';
    var context = document.getElementById('desk-context');
    if(context) context.textContent = data.context || 'Follow every round';
  }

  function teardownEventExperience(){
    eventEnabled = false;
    if(liveTimer) { clearTimeout(liveTimer); liveTimer = null; }
    if(desk) { desk.remove(); desk = null; weekList = null; diaryList = null; followScheduleKey = null; }
    if(strip) { strip.remove(); strip = null; }
    if(grid) grid.style.display = '';
    var nextUp = document.querySelector('.next-up'); if(nextUp) nextUp.style.display = '';
    var clockHead = document.querySelector('.clock-head'); if(clockHead) clockHead.style.display = '';
  }

  function refreshWeek(){
    return fetchJson('/week.json').then(function(data){
      eventEnabled = Boolean(data && data.enabled);
      renderWeek(data);
      if(eventEnabled && !liveTimer) scheduleLiveRefresh();
    }).catch(function(){});
  }

  function scheduleLiveRefresh(){
    if(!eventEnabled) return;
    if(liveTimer) clearTimeout(liveTimer);
    refreshLive().then(function(){
      liveTimer = setTimeout(scheduleLiveRefresh, document.hidden ? LIVE_BACKGROUND_POLL_MS : LIVE_VISIBLE_POLL_MS);
    });
  }

  refreshWeek();
  setInterval(refreshWeek, WEEK_POLL_MS);
  document.addEventListener('visibilitychange', function(){
    if(!document.hidden) { refreshWeek(); scheduleLiveRefresh(); }
  });
})();
