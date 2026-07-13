/* LIVE MODULE · davidhowardgolf.ie · Championship week only · delete after The Open */
(function(){
  if(!window.fetch) return;
  function esc(t){
    return String(t == null ? '' : t)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ---- inject the live strip into the countdown section ---- */
  var grid = document.querySelector('.clock-grid');
  var strip = null;
  if(grid){
    strip = document.createElement('div');
    strip.id = 'live-strip';
    strip.hidden = true;
    strip.innerHTML =
      '<p class="live-tag"><span class="live-dot" aria-hidden="true"></span>Live &middot; The 154th Open &middot; Royal Birkdale</p>' +
      '<div class="live-main"><div class="live-score" id="lv-score">E</div>' +
      '<div class="live-meta">' +
      '<div class="lv-cell"><span class="lv-k">Pos</span><span class="lv-v" id="lv-pos">--</span></div>' +
      '<div class="lv-cell"><span class="lv-k">Thru</span><span class="lv-v" id="lv-thru">--</span></div>' +
      '<div class="lv-cell"><span class="lv-k">Today</span><span class="lv-v" id="lv-today">--</span></div>' +
      '</div></div>' +
      '<p class="live-rounds" id="lv-rounds"></p>' +
      '<p class="live-note" id="lv-note"></p>';
    grid.parentNode.insertBefore(strip, grid);
  }

  /* ---- inject The Week at Birkdale before the media section ---- */
  var media = document.querySelector('.media');
  if(media){
    var week = document.createElement('section');
    week.className = 'week';
    week.setAttribute('aria-labelledby', 'week-title');
    week.innerHTML =
      '<div class="container"><div class="week-head">' +
      '<h2 class="display" id="week-title">The week at Birkdale</h2>' +
      '<p>Tee times, pairings and the road diary, updated through the Championship.</p>' +
      '</div><div id="week-list" class="week-list"></div></div>';
    media.parentNode.insertBefore(week, media);
  }

  /* ---- week renderer ---- */
  fetch('/week.json?t=' + Date.now())
    .then(function(r){ return r.json(); })
    .then(function(data){
      var box = document.getElementById('week-list');
      if(!box || !data || !data.days) return;
      var html = '';
      for(var i = 0; i < data.days.length; i++){
        var d = data.days[i];
        var stCls = d.status === 'live' ? ' live' : '';
        var stTxt = d.status === 'live' ? 'Live now' : d.status === 'done' ? 'Complete' : 'Ahead';
        html += '<article class="wk"><div class="wk-when">'
              + '<span class="wk-date">' + esc(d.label) + '</span>'
              + '<span class="wk-title">' + esc(d.title) + '</span>'
              + '<span class="wk-status' + stCls + '">' + stTxt + '</span>'
              + '</div><div class="wk-body">';
        html += '<div class="wk-facts">';
        html += '<span>Tee ' + (d.tee ? '<b>' + esc(d.tee) + '</b>' : '<span class="tba">TBA</span>') + '</span>';
        html += '<span>Playing with ' + (d.partners && d.partners.length
              ? '<b>' + esc(d.partners.join(' and ')) + '</b>'
              : '<span class="tba">draw to come</span>') + '</span>';
        if(d.score){ html += '<span class="wk-score"><b>' + esc(d.score) + '</b></span>'; }
        html += '</div>';
        if(d.note){ html += '<p class="wk-note">' + esc(d.note) + '</p>'; }
        var media = '';
        if(d.photos){
          for(var p = 0; p < d.photos.length; p++){
            media += '<span class="wk-ph"><img src="' + esc(d.photos[p]) + '" alt="" loading="lazy" decoding="async"></span>';
          }
        }
        if(d.videos){
          for(var v = 0; v < d.videos.length; v++){
            var vid = d.videos[v];
            if(vid && vid.url){
              media += '<a class="wk-vid" href="' + esc(vid.url) + '" target="_blank" rel="noopener">' + esc(vid.title || 'Watch') + '</a>';
            }
          }
        }
        if(media){ html += '<div class="wk-media">' + media + '</div>'; }
        html += '</div></article>';
      }
      box.innerHTML = html;
    })
    .catch(function(){});

  /* ---- live score engine: manual override first, ESPN second ---- */
  var T0 = new Date('2026-07-16T05:30:00+01:00').getTime();
  var T1 = new Date('2026-07-19T23:59:00+01:00').getTime();
  function inWindow(){ var n = Date.now(); return n >= T0 && n <= T1; }

  function show(d){
    if(!strip) return;
    document.getElementById('lv-score').textContent = d.score || 'E';
    document.getElementById('lv-pos').textContent = d.pos || '--';
    document.getElementById('lv-thru').textContent = d.thru || '--';
    document.getElementById('lv-today').textContent = d.today || '--';
    var r = document.getElementById('lv-rounds');
    if(d.rounds && d.rounds.length){
      var parts = [];
      for(var i = 0; i < d.rounds.length; i++){ parts.push('R' + (i+1) + ' <b>' + esc(d.rounds[i]) + '</b>'); }
      r.innerHTML = parts.join(' &middot; ');
    } else { r.innerHTML = ''; }
    document.getElementById('lv-note').textContent = d.note || '';
    strip.hidden = false;
    grid.style.display = 'none';
    var nu = document.querySelector('.next-up'); if(nu) nu.style.display = 'none';
    var h = document.querySelector('.clock-head'); if(h) h.style.display = 'none';
  }

  function fromESPN(d){
    try{
      var comps = d.events[0].competitions[0].competitors;
      for(var i = 0; i < comps.length; i++){
        var c = comps[i];
        var name = (c.athlete && (c.athlete.displayName || c.athlete.fullName)) || '';
        if(/howard/i.test(name) && /david/i.test(name)){
          var st = c.status || {};
          var pos = (st.position && (st.position.displayName || st.position.id)) || '';
          var rounds = [];
          if(c.linescores){
            for(var j = 0; j < c.linescores.length; j++){
              var l = c.linescores[j];
              rounds.push(l.displayValue || l.value || '');
            }
          }
          show({
            score: (c.score && c.score.displayValue) || c.score || 'E',
            pos: pos, thru: st.thru || '', today: st.displayValue || '',
            rounds: rounds, note: ''
          });
          return true;
        }
      }
    }catch(e){}
    return false;
  }

  function tick(){
    fetch('/live.json?t=' + Date.now())
      .then(function(r){ return r.json(); })
      .then(function(j){
        if(j && j.active){ show(j); return true; }
        if(!inWindow()) return false;
        return fetch('https://site.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard')
          .then(function(r){ return r.json(); })
          .then(fromESPN)
          .catch(function(){ return false; });
      })
      .catch(function(){})
      .then(function(){
        if(inWindow()){ setTimeout(tick, document.hidden ? 120000 : 60000); }
      });
  }
  tick();
})();
