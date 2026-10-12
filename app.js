(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,8);
const PASS='hotpuff';
const STORE_KEY='bltz_state_v1';
let S=JSON.parse(JSON.stringify(window.BLTZ_STATE));
try{const saved=localStorage.getItem(STORE_KEY);if(saved)S=JSON.parse(saved)}catch(e){}
let editing=false,edOpen=true,edTab='score',selMatch=null,dirty=false,hist=[],auto=false,q='',ready=false,armed=null,pubT=null,tkT=null,bbOpen={},scOpen={},view=null,homeY=0,pushed=false;
try{ if(sessionStorage.getItem('bltz_ed')==='1') editing=true; }catch(e){}

/* ---------- helpers ---------- */
const T=id=>S.teams.find(t=>t.id===id);
const M=id=>S.matches.find(m=>m.id===id);
const tn=id=>T(id)?T(id).name:'TBD';
const tc=id=>T(id)?T(id).color:'#888';
const ini=n=>String(n).split(/\s+/).map(w=>w[0]||'').join('').slice(0,3).toUpperCase();
const ov=b=>Math.floor(b/6)+'.'+(b%6);
const sc=s=>(s?s.r:0)+'/'+(s?s.w:0);
const fmt=d=>{try{const x=new Date(d);return isNaN(x)?'Date TBA':x.toLocaleString([],{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}catch(e){return ''}};
const loc=iso=>{if(!iso)return'';const d=new Date(iso);if(isNaN(d))return'';const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())};
const badge=(id,s)=>`<span class="badge${s?' s':''}" style="--c:${esc(tc(id))}">${esc(ini(tn(id)))}</span>`;
const side=id=>`<div class="side">${badge(id)}<span>${esc(tn(id))}</span></div>`;
const roleIco=r=>({'Batter':'🏏','Bowler':'🎯','All-rounder':'⚡','Keeper':'🧤'}[r]||'🏏');
const ROLES=['Batter','Bowler','All-rounder','Keeper'];
const rise=(i)=>`rise${ready?' in':''}" style="--i:${i||0}`;
function norm(){S.matches.forEach(m=>{m.s1=m.s1||{r:0,w:0,b:0};m.s2=m.s2||{r:0,w:0,b:0};m.balls=m.balls||[];m.inn=m.inn||1;m.overs=m.overs||20;m.winner=m.winner||'';m.log=m.log||[];m.part=m.part||[];m.cur=m.cur||{str:'',non:'',bwl:''};m.out=m.out||{};m.out[1]=m.out[1]||[];m.out[2]=m.out[2]||[];m.motm=m.motm||''});}
norm();

function table(){
  const t={};S.teams.forEach(x=>t[x.id]={team:x,p:0,w:0,d:0,l:0,pts:0,rf:0,bf:0,ra:0,ba:0,nrr:0});
  S.matches.filter(m=>m.status==='done').forEach(m=>{
    const a=t[m.t1],b=t[m.t2];if(!a||!b)return;a.p++;b.p++;
    const lim=(m.overs||20)*6,f1=m.s1.w>=10?lim:m.s1.b,f2=m.s2.w>=10?lim:m.s2.b;
    a.rf+=m.s1.r;a.bf+=f1;a.ra+=m.s2.r;a.ba+=f2;b.rf+=m.s2.r;b.bf+=f2;b.ra+=m.s1.r;b.ba+=f1;
    if(m.winner==='draw'){a.d++;b.d++;a.pts++;b.pts++}
    else if(m.winner===m.t1){a.w++;a.pts+=2;b.l++}
    else if(m.winner===m.t2){b.w++;b.pts+=2;a.l++}
  });
  Object.values(t).forEach(r=>{r.nrr=(r.bf?r.rf/(r.bf/6):0)-(r.ba?r.ra/(r.ba/6):0)});
  return Object.values(t).sort((x,y)=>y.pts-x.pts||y.w-x.w||y.nrr-x.nrr||x.team.name.localeCompare(y.team.name));
}
function resText(m){
  if(m.winner==='draw')return 'Match drawn · 1 pt each';
  if(!m.winner)return 'Result pending';
  const a=m.s1,b=m.s2;let extra='';
  if(a&&b&&(a.r||b.r)){
    if(m.winner===m.t1&&a.r>b.r)extra=' by '+(a.r-b.r)+' runs';
    else if(m.winner===m.t2&&b.r>a.r)extra=' by '+Math.max(1,10-b.w)+' wickets';
  }
  return tn(m.winner)+' won'+extra+' · 2 pts';
}
const upcoming=()=>S.matches.filter(m=>m.status==='upcoming').sort((a,b)=>new Date(a.date)-new Date(b.date));
const done=()=>S.matches.filter(m=>m.status==='done').sort((a,b)=>new Date(b.date)-new Date(a.date));
const lives=()=>S.matches.filter(m=>m.status==='live');

/* ---------- public view ---------- */
function ticker(){
  const it=[];
  lives().forEach(m=>it.push('🔴 LIVE · '+tn(m.t1)+' '+sc(m.s1)+' vs '+tn(m.t2)+' '+sc(m.s2)));
  done().slice(0,3).forEach(m=>it.push('✅ '+tn(m.t1)+' vs '+tn(m.t2)+' — '+resText(m)));
  upcoming().slice(0,3).forEach(m=>it.push('⏳ '+tn(m.t1)+' vs '+tn(m.t2)+' · '+fmt(m.date)));
  if(!it.length)it.push('⚡ Welcome to '+S.title+' — fixtures coming soon');
  const h=it.map(x=>'<span>'+esc(x)+'</span>').join('');const h2=h+h;
  return '<div class="ticker"><div class="tk">'+h2+h2+'</div></div>';
}
function ball(){return `<svg viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="bg1" cx="35%" cy="30%"><stop offset="0" stop-color="#ff8a8a"/><stop offset=".45" stop-color="#e11d2e"/><stop offset="1" stop-color="#6b0712"/></radialGradient></defs><g class="spin"><circle cx="100" cy="100" r="86" fill="url(#bg1)"/><path d="M30 55 C75 90 75 110 30 145" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="5 6" stroke-linecap="round" opacity=".9"/><path d="M170 55 C125 90 125 110 170 145" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="5 6" stroke-linecap="round" opacity=".9"/><path d="M92 22 C108 70 108 130 92 178" fill="none" stroke="#fff" stroke-width="2" opacity=".35"/></g><circle cx="100" cy="100" r="86" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2"/></svg>`}
function hero(){
  const n=upcoming()[0];
  const cd=lives().length?`<div class="cdl">🔴 A match is live right now — scroll down</div>`:n?`<div class="cdl">Next up · ${esc(tn(n.t1))} vs ${esc(tn(n.t2))}</div><div class="cd" id="cd" data-t="${esc(n.date)}"></div>`:`<div class="cdl">Fixtures dropping soon</div>`;
  return `<section class="wrap hero" id="home"><div><span class="kicker">⚡ Cricket tournament · Season live</span>
  <span class="glitch" data-text="${esc(S.title)}">${esc(S.title)}</span>
  <p class="tag">${esc(S.tagline)}</p>${cd}
  <div class="chips"><span class="chip">🛡 ${S.teams.length} teams</span><span class="chip">🏏 ${S.players.length} players</span><span class="chip">🏟 ${done().length} played</span></div></div>
  <div class="ballwrap"><div class="ring"></div><div class="ring two"></div>${ball()}</div></section>`;
}
function liveCard(m,i){
  const a=m.s1,b=m.s2,inn=m.inn||1,bat=inn===1?a:b,lim=(m.overs||20)*6;
  const crr=bat.b?(bat.r/(bat.b/6)).toFixed(2):'0.00';
  let chase='';
  if(inn===2){
    const need=a.r+1-b.r,left=lim-b.b;
    chase=need>0?`<div class="chase">${esc(tn(m.t2))} need <b>${need}</b> off <b>${Math.max(0,left)}</b> balls · RRR ${left>0?(need/(left/6)).toFixed(2):'—'}</div>`:`<div class="chase win">🎯 ${esc(tn(m.t2))} have reached the target!</div>`;
  }else if(a.r||a.b){chase=`<div class="chase">${esc(tn(m.t1))} are setting the target</div>`}
  const team=(id,s,on,r)=>`<div class="bteam${on?' bat':''}${r?' r':''}">${badge(id)}<div><div class="nm">${esc(tn(id))}${on?'<span class="bat-tag">BAT</span>':''}</div><div class="big">${s.r}/${s.w}</div><div class="ovs">${ov(s.b)} / ${m.overs||20} ov</div></div></div>`;
  const chips=overToks(m).map(x=>{const c=x==='4'?'f':x==='6'?'s6':x==='W'?'k':(x==='wd'||x==='nb')?'x':'';return `<i class="b ${c}">${esc(x)}</i>`}).join('');
  return `<article class="card live ${rise(i)}" data-act="open" data-id="${m.id}"><div class="livemeta"><span class="pill">LIVE</span><span>📍 ${esc(m.venue||'BLTZ Arena')} · ${m.overs||20} overs</span></div>
  <div class="board">${team(m.t1,a,inn===1)}<div class="mid">VS</div>${team(m.t2,b,inn===2,true)}</div>
  ${m.last?`<div class="last">${esc(m.last)}</div>`:''}${chase}
  ${chips?`<div class="ovl">${overLabel(m)}</div><div class="balls">${chips}</div>`:''}${crease(m)}
  <div class="crr"><span>CRR ${crr}</span><span>${esc(tn(inn===1?m.t1:m.t2))} batting</span></div><div style="text-align:center;margin-top:14px"><button class="btn hot" data-act="open" data-id="${m.id}">📋 Full scorecard & every over →</button></div></article>`;
}
function liveSec(){
  const L=lives();const n=upcoming()[0];
  const body=L.length?L.map((m,i)=>liveCard(m,i)).join(''):`<div class="card empty ${rise(0)}">😴 No match is live right now.${n?`<br>Next: <b>${esc(tn(n.t1))}</b> vs <b>${esc(tn(n.t2))}</b> · ${esc(fmt(n.date))}`:''}</div>`;
  return `<section class="wrap sec" id="live"><h2 class="sh ${rise(0)}"><i>01</i>LIVE NOW</h2>${body}</section>`;
}
function fixtures(){
  const U=upcoming();
  const body=U.length?`<div class="grid">${U.map((m,i)=>`<article class="card tilt ${rise(i)}"><div class="mhead"><span class="chip">🗓 ${esc(fmt(m.date))}</span><span>📍 ${esc(m.venue||'TBA')}</span></div><div class="vs">${side(m.t1)}<b class="vsb">VS</b>${side(m.t2)}</div></article>`).join('')}</div>`:`<div class="card empty">No upcoming matches scheduled.</div>`;
  return `<section class="wrap sec" id="fixtures"><h2 class="sh ${rise(0)}"><i>02</i>UPCOMING MATCHES</h2>${body}</section>`;
}
function results(){
  const D=done();
  const body=D.length?`<div class="grid">${D.map((m,i)=>{const w1=m.winner===m.t1,w2=m.winner===m.t2;return `<article class="card tilt res ${rise(i)}" data-act="open" data-id="${m.id}"><div class="mhead"><span>🗓 ${esc(fmt(m.date))}</span><span>📍 ${esc(m.venue||'')}</span></div>
  <div class="scoreline${w1?' w':''}"><span class="tn">${badge(m.t1,1)}${esc(tn(m.t1))}${w1?' 🏆':''}</span><span><span class="n">${sc(m.s1)}</span> <small>(${ov(m.s1.b)})</small></span></div>
  <div class="scoreline${w2?' w':''}"><span class="tn">${badge(m.t2,1)}${esc(tn(m.t2))}${w2?' 🏆':''}</span><span><span class="n">${sc(m.s2)}</span> <small>(${ov(m.s2.b)})</small></span></div>
  <div class="verdict">${esc(resText(m))}</div>${momLine(m)}<button class="btn sm" style="margin-top:10px" data-act="open" data-id="${m.id}">📋 Full scorecard →</button></article>`}).join('')}</div>`:`<div class="card empty">No completed matches yet.</div>`;
  return `<section class="wrap sec" id="results"><h2 class="sh ${rise(0)}"><i>03</i>PREVIOUS RESULTS</h2>${body}</section>`;
}
function pointsSec(){
  const t=table();
  const body=t.length?`<div class="tw ${rise(0)}"><table><thead><tr><th>#</th><th class="l">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th><th>NRR</th></tr></thead><tbody>${t.map((r,i)=>`<tr class="${i===0&&r.pts>0?'top':''}"><td class="rank">${i+1}</td><td class="l"><div class="tn">${badge(r.team.id,1)}${esc(r.team.name)}${i===0&&r.pts>0?' 👑':''}</div></td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td class="pts">${r.pts}</td><td class="nrr${r.nrr<0?' neg':''}">${fmtNrr(r.nrr)}</td></tr>`).join('')}</tbody></table></div><p class="muted">Win = 2 pts · Draw = 1 pt · Loss = 0. Updates automatically from recorded results. NRR = (runs scored ÷ overs faced) − (runs conceded ÷ overs bowled); an all-out innings counts the full overs quota. Ties on points go to wins, then NRR.</p>`:`<div class="card empty">No teams registered.</div>`;
  return `<section class="wrap sec" id="table"><h2 class="sh ${rise(0)}"><i>04</i>POINTS TABLE</h2>${body}</section>`;
}
function squads(){
  const body=S.teams.length?`<div class="grid">${S.teams.map((t,i)=>{const ps=S.players.filter(p=>p.team===t.id);return `<article class="card tilt squad ${rise(i)}"><div class="top" style="--c:${esc(t.color)}">${badge(t.id)}<div><h3>${esc(t.name)}</h3><span class="muted">${ps.length} players</span></div></div>${ps.length?ps.map(p=>`<div class="pl"><span>${roleIco(p.role)} ${esc(p.name)}</span><small>${p.runs}R · ${p.wickets}W</small></div>`).join(''):'<div class="muted">No players registered in this team.</div>'}</article>`}).join('')}</div>`:`<div class="card empty">No teams yet.</div>`;
  return `<section class="wrap sec" id="squads"><h2 class="sh ${rise(0)}"><i>05</i>TEAM SQUADS</h2>${body}</section>`;
}
function lb(title,key,unit){
  const l=[...S.players].filter(p=>p[key]>0).sort((a,b)=>b[key]-a[key]).slice(0,5);const mx=l[0]?l[0][key]:1;
  return `<div class="card lb ${rise(0)}"><h3>${title}</h3>${l.length?l.map((p,i)=>`<div class="lbr"><span class="rank">${i+1}</span><span>${esc(p.name)} <small class="muted">${esc(tn(p.team))}</small></span><span>${p[key]} ${unit}</span><div class="bar"><i style="width:${Math.round(p[key]/mx*100)}%"></i></div></div>`).join(''):'<div class="muted">No data yet.</div>'}</div>`;
}
function searchRes(){
  const s=q.trim().toLowerCase();
  if(!s)return '<p class="muted">Search a player or a team — try a name above.</p>';
  const ps=S.players.filter(p=>(p.name+' '+tn(p.team)+' '+p.role).toLowerCase().includes(s));
  const ts=S.teams.filter(t=>t.name.toLowerCase().includes(s));
  if(!ps.length&&!ts.length)return '<div class="card empty">Nothing found. Check the spelling.</div>';
  const pt=table();
  return '<div class="grid">'+ts.map(t=>{const r=pt.find(x=>x.team.id===t.id);const sq=S.players.filter(p=>p.team===t.id);return `<div class="card squad"><div class="top" style="--c:${esc(t.color)}">${badge(t.id)}<div><h3>${esc(t.name)}</h3><span class="muted">Team found · ${r?r.pts:0} pts · ${r?r.w+'W '+r.d+'D '+r.l+'L':''}</span></div></div>${sq.length?sq.map(p=>`<div class="pl"><span>${esc(p.name)}</span><small>${esc(p.role)}</small></div>`).join(''):'<div class="muted">No players registered in this team.</div>'}</div>`}).join('')
  +ps.map(p=>`<div class="card"><div class="tn">${badge(p.team)}<div>${esc(p.name)}<div class="muted" style="font-weight:600">${roleIco(p.role)} ${esc(p.role)} · ${esc(tn(p.team))}</div></div></div><div class="stats3"><div><b>${p.matches}</b><small>Matches</small></div><div><b>${p.runs}</b><small>Runs</small></div><div><b>${p.wickets}</b><small>Wickets</small></div></div></div>`).join('')+'</div>';
}
function playersSec(){
  return `<section class="wrap sec" id="players"><h2 class="sh ${rise(0)}"><i>06</i>PLAYER ZONE</h2>
  <div class="search ${rise(0)}">🔍<input id="q" type="search" autocomplete="off" placeholder="Search players or teams…" value="${esc(q)}"></div><div id="sres">${searchRes()}</div>
  <div class="two">${lb('🏏 TOP RUN SCORERS','runs','runs')}${lb('🎯 TOP WICKET TAKERS','wickets','wkts')}</div></section>`;
}
function summary(){
  const t=table()[0];const hs=[...S.players].sort((a,b)=>b.runs-a.runs)[0];const hw=[...S.players].sort((a,b)=>b.wickets-a.wickets)[0];
  const tile=(v,k,txt,i)=>`<div class="card tile ${rise(i)}">${txt?`<div class="v t">${esc(v)}</div>`:`<div class="v" data-n="${v}">${v}</div>`}<div class="k">${k}</div></div>`;
  return `<section class="wrap sec" id="summary"><h2 class="sh ${rise(0)}"><i>07</i>TOURNAMENT SUMMARY</h2><div class="tiles">
  ${tile(S.teams.length,'Total teams',0,0)}${tile(S.players.length,'Total players',0,1)}${tile(done().length,'Matches played',0,2)}${tile(S.players.reduce((a,p)=>a+p.runs,0),'Runs scored',0,3)}
  ${tile(t?t.team.name+' ('+t.pts+' pts)':'—','Leading team',1,4)}${tile(hs&&hs.runs?hs.name+' ('+hs.runs+')':'—','Highest run scorer',1,5)}${tile(hw&&hw.wickets?hw.name+' ('+hw.wickets+')':'—','Most wickets',1,6)}</div></section>`;
}
function footer(){return `<footer><b>⚡ ${esc(S.title)}</b><br>Play loud. Play fair. Play BLTZ.</footer>`}

/* ---------- ball-by-ball, scorecards, NRR, match screen ---------- */
const fmtNrr=n=>(n>0?'+':'')+n.toFixed(3);
const OUTC={'.':'no run','1':'1 run','2':'2 runs','3':'3 runs','4':'FOUR','6':'SIX','wd':'wide','nb':'no ball','W':'OUT'};
const bcls=x=>x==='4'?'f':x==='6'?'s6':x==='W'?'k':(x==='wd'||x==='nb')?'x':'';
const pn=id=>{const p=S.players.find(x=>x.id===id);return p?p.name:''};
const HOW=[['bowled','Bowled'],['caught','Caught'],['lbw','LBW'],['runout','Run out'],['stumped','Stumped'],['hitwicket','Hit wicket']];
const ovOf=e=>{if(e.v!=null)return e.v;const p=String(e.o).split('.').map(Number);return e.l&&p[1]===0?p[0]-1:p[0]};
function dismissal(e){
  const b=e.bn||'',f=e.fn||'';
  switch(e.h){
    case 'bowled':return 'b '+b;
    case 'caught':return f&&f===b?'c & b '+b:'c '+(f||'?')+' b '+b;
    case 'lbw':return 'lbw b '+b;
    case 'stumped':return 'st '+(f||'?')+' b '+b;
    case 'runout':return 'run out'+(f?' ('+f+')':'');
    case 'hitwicket':return 'hit wicket b '+b;
    default:return 'out';
  }
}
function inStats(m,inn){
  const bat={},bowl={},bo=[],wo=[],fow=[],ex={wd:0,nb:0};
  const gb=(id,n)=>{let a=bat[id];if(!a){a=bat[id]={id,n:n||pn(id),r:0,b:0,f:0,s6:0,o:false,out:''};bo.push(id)}return a};
  m.log.filter(e=>e.i===inn).forEach(e=>{
    if(e.s){const a=gb(e.s,e.sn);a.r+=e.r;if(e.l)a.b++;if(e.r===4)a.f++;if(e.r===6)a.s6++}
    if(e.w){const id=e.ob||e.s;if(id){const a=gb(id,e.obn||e.sn);a.o=true;a.out=dismissal(e)}fow.push(e)}
    if(e.b){let o=bowl[e.b];if(!o){o=bowl[e.b]={id:e.b,n:e.bn,b:0,r:0,w:0};wo.push(e.b)}
      if(e.l)o.b++;o.r+=e.r+e.x;if(e.w&&e.h!=='runout')o.w++}
    if(e.x)ex[e.t]=(ex[e.t]||0)+e.x;
  });
  if(m.status==='live'&&inn===(m.inn===2?2:1)&&m.cur){
    [m.cur.str,m.cur.non].forEach(id=>{if(id&&!bat[id])gb(id)});
    if(m.cur.bwl&&!bowl[m.cur.bwl])bowl[m.cur.bwl]={id:m.cur.bwl,n:pn(m.cur.bwl),b:0,r:0,w:0};
  }
  return {bat:bo.map(k=>bat[k]),bowl:wo.map(k=>bowl[k]),fow,ex,bm:bat,wm:bowl};
}
/* current over (main screen) */
function curOver(m){
  const inn=m.inn===2?2:1,L=m.log.filter(e=>e.i===inn);
  if(!L.length)return null;
  const v=ovOf(L[L.length-1]),es=L.filter(e=>ovOf(e)===v);
  return {n:v+1,es,runs:es.reduce((a,e)=>a+e.r+e.x,0),done:es.filter(e=>e.l).length>=6};
}
const overToks=m=>{const co=curOver(m);return co?co.es.map(e=>e.t):(m.log.length?[]:(m.balls||[]).slice(-6))};
const overLabel=m=>{const co=curOver(m);return co?`Over ${co.n} · ${co.runs} run${co.runs===1?'':'s'}${co.done?' · complete':''}`:'This over'};
function crease(m){
  const inn=m.inn===2?2:1,c=m.cur||{};
  if(!c.str&&!c.non&&!c.bwl)return '';
  const st=inStats(m,inn),a=st.bm[c.str],b=st.bm[c.non],o=st.wm[c.bwl],lw=st.fow.length?st.fow[st.fow.length-1]:null;
  const bf=x=>x?`${x.r} (${x.b})`:'';
  const card=(role,name,fig,on)=>`<div class="cr${on?' on':''}"><span class="role">${role}</span><b>${esc(name||'—')}</b><span class="fig">${esc(fig||'')}</span></div>`;
  return `<div class="crease">${card('🏏 STRIKER',c.str?pn(c.str)+'*':'',bf(a),1)}${card('🏏 NON-STRIKER',pn(c.non),bf(b))}${card('🎯 BOWLER',pn(c.bwl),o?`${ov(o.b)} ov · ${o.r}R · ${o.w}W · eco ${o.b?(o.r/(o.b/6)).toFixed(1):'0.0'}`:'',1)}</div>${lw?`<div class="lastw">☝️ Last wicket: ${esc(lw.obn||lw.sn||'')} ${esc(dismissal(lw))}</div>`:''}`;
}
/* man of the match */
function momStats(m){
  const t={},ens=(id,n)=>t[id]||(t[id]={id,n,r:0,b:0,f:0,s6:0,w:0,bb:0,rc:0,ct:0,st:0,ro:0});
  [1,2].forEach(inn=>{const st=inStats(m,inn);
    st.bat.forEach(a=>{const x=ens(a.id,a.n);x.r+=a.r;x.b+=a.b;x.f+=a.f;x.s6+=a.s6});
    st.bowl.forEach(o=>{const x=ens(o.id,o.n);x.w+=o.w;x.bb+=o.b;x.rc+=o.r})});
  m.log.forEach(e=>{if(e.w&&e.f){const x=ens(e.f,e.fn);if(e.h==='caught')x.ct++;else if(e.h==='stumped')x.st++;else if(e.h==='runout')x.ro++}});
  return Object.values(t).map(x=>{
    const p=S.players.find(q=>q.id===x.id);if(!p)return null;
    const econ=x.bb?x.rc/(x.bb/6):0,sr=x.b?x.r*100/x.b:0;
    const pts=x.r+x.f+2*x.s6+(x.b>=10?Math.max(0,(sr-100)/10):0)+25*x.w+(x.bb>=6?Math.max(0,9-econ)*(x.bb/6)*2:0)+10*x.ct+12*x.st+10*x.ro+(m.winner&&m.winner!=='draw'&&p.team===m.winner?10:0);
    const parts=[];if(x.b||x.r)parts.push(x.r+' runs ('+x.b+')');if(x.w)parts.push(x.w+(x.w===1?' wkt':' wkts'));if(x.bb)parts.push(ov(x.bb)+' ov, econ '+econ.toFixed(2));
    if(x.ct)parts.push(x.ct+(x.ct===1?' catch':' catches'));if(x.st)parts.push(x.st+' stumping');if(x.ro)parts.push(x.ro+' run-out');
    return Object.assign({},x,{team:p.team,pts:Math.round(pts*10)/10,txt:parts.join(' · ')});
  }).filter(Boolean).sort((a,b)=>b.pts-a.pts);
}
const momSuggest=m=>{const l=m.log.length?momStats(m):[];return l.length&&l[0].pts>0?l[0]:null};
const momLine=m=>m.motm&&pn(m.motm)?`<div class="mom">⭐ Man of the match: <b>${esc(pn(m.motm))}</b></div>`:'';
function momBlock(m){
  const sel=m.motm&&S.players.find(p=>p.id===m.motm),l=m.log.length?momStats(m):[],sg=momSuggest(m),mine=sel?l.find(x=>x.id===sel.id):null;
  let h='';
  if(sel)h+=`<div class="card momc"><div class="star">⭐</div><div><div class="k">MAN OF THE MATCH</div><div class="v">${esc(sel.name)}</div><div class="muted">${esc(tn(sel.team))}${mine&&mine.txt?' · '+esc(mine.txt):''}</div></div></div>`;
  if(editing&&m.status!=='upcoming'&&sg&&(!sel||sel.id!==sg.id))h+=`<div class="card momc sug"><div class="star">💡</div><div><div class="k">SUGGESTED MAN OF THE MATCH · EDITOR ONLY</div><div class="v">${esc(sg.n)}</div><div class="muted">${esc(tn(sg.team))} · ${esc(sg.txt)}</div><button class="btn sm hot" style="margin-top:8px" data-act="useMotm" data-id="${m.id}" data-p="${sg.id}">Set as Man of the match</button></div></div>`;
  return h;
}
function edMotm(m){
  const ps=S.players.filter(p=>p.team===m.t1||p.team===m.t2),sg=momSuggest(m);
  return `<h4>Man of the match</h4><select data-set="m.${m.id}.motm"><option value="">— not set —</option>${ps.map(p=>`<option value="${p.id}"${m.motm===p.id?' selected':''}>${esc(p.name)} (${esc(tn(p.team))})</option>`).join('')}</select>${sg?`<p class="note">💡 Suggested: <b>${esc(sg.n)}</b> — ${esc(sg.txt)}</p>${m.motm===sg.id?'':`<button class="btn sm hot" data-act="useMotm" data-id="${m.id}" data-p="${sg.id}">Use suggestion</button>`}`:'<p class="note">A suggestion appears once ball-by-ball scoring has started.</p>'}`;
}
/* match screen */
function inningsCard(m,inn){
  const s=inn===1?m.s1:m.s2,batT=inn===1?m.t1:m.t2,bowT=inn===1?m.t2:m.t1,has=m.log.some(e=>e.i===inn);
  if(!has&&!(s.r||s.b))return '';
  const hd=`<h3 class="sch"><span>${esc(tn(batT))} innings</span><small>${sc(s)} · ${ov(s.b)} ov</small></h3>`;
  if(!has)return `<div class="card">${hd}<p class="muted">Ball-by-ball details were not recorded for this innings.</p></div>`;
  const st=inStats(m,inn),exT=st.ex.wd+st.ex.nb,dnb=S.players.filter(p=>p.team===batT&&!st.bm[p.id]);
  const fow=st.fow.map((e,i)=>`${e.tw!=null?e.tw+'-'+e.tr:i+1} (${esc(e.obn||e.sn||'—')}, ${esc(e.o)} ov)`).join(' · ');
  const bat=`<div class="tw"><table><thead><tr><th class="l">Batting · ${esc(tn(batT))}</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>${st.bat.map(a=>`<tr><td class="l"><b>${esc(a.n)}</b><span class="dis">${a.o?esc(a.out):'not out'}</span></td><td><b>${a.r}</b></td><td>${a.b}</td><td>${a.f}</td><td>${a.s6}</td><td>${a.b?(a.r*100/a.b).toFixed(1):'—'}</td></tr>`).join('')}</tbody></table></div>`;
  const bowl=st.bowl.length?`<div class="tw" style="margin-top:12px"><table><thead><tr><th class="l">Bowling · ${esc(tn(bowT))}</th><th>O</th><th>R</th><th>W</th><th>Econ</th></tr></thead><tbody>${st.bowl.map(o=>`<tr><td class="l">${esc(o.n)}</td><td>${ov(o.b)}</td><td>${o.r}</td><td><b>${o.w}</b></td><td class="econ">${o.b?(o.r/(o.b/6)).toFixed(2):'—'}</td></tr>`).join('')}</tbody></table></div>`:'';
  return `<div class="card">${hd}${bat}<p class="note">Extras: <b>${exT}</b> (wd ${st.ex.wd}, nb ${st.ex.nb}) · Total: <b>${sc(s)}</b> (${ov(s.b)} ov)</p>${dnb.length?`<p class="note">Did not bat: ${dnb.map(p=>esc(p.name)).join(', ')}</p>`:''}${fow?`<p class="note">Fall of wickets: ${fow}</p>`:''}${bowl}</div>`;
}
function bbRow(e,lab){
  const who=(e.bn||e.sn)?`${esc(e.bn||'—')} to ${esc(e.sn||'—')}, `:'';
  const wk=e.w?` <span class="wkt">— ${esc(e.obn||e.sn||'')} ${esc(dismissal(e))}</span>`:'';
  return `<div class="bbr"><span class="rank">${esc(lab)}</span><i class="b ${bcls(e.t)}">${esc(e.t)}</i><span>${who}<b>${esc(OUTC[e.t]||e.t)}</b>${wk}</span></div>`;
}
function allOvers(m){
  return [1,2].filter(i=>m.log.some(e=>e.i===i)).map(inn=>{
    const L=m.log.filter(e=>e.i===inn),batT=inn===1?m.t1:m.t2,by={};
    L.forEach(e=>{const k=ovOf(e);(by[k]=by[k]||[]).push(e)});
    const keys=Object.keys(by).map(Number).sort((a,b)=>b-a);
    return `<h3 class="sch" style="margin-top:24px"><span>${esc(tn(batT))} · every ball</span><small>${keys.length} over${keys.length===1?'':'s'} · ${L.length} deliveries</small></h3>`+keys.map(k=>{
      const es=by[k];let c=0;const rows=es.map(e=>bbRow(e,k+'.'+(e.l?++c:c+1)));
      const runs=es.reduce((a,e)=>a+e.r+e.x,0),wk=es.filter(e=>e.w).length,bn=[...new Set(es.map(e=>e.bn).filter(Boolean))].join(' / ');
      return `<div class="card ovc"><div class="ovh"><b>OVER ${k+1}</b><span class="muted">${esc(bn)}</span><span>${runs} run${runs===1?'':'s'}${wk?` · ${wk} wkt`:''}</span></div><div class="balls" style="justify-content:flex-start;margin:0 0 8px">${es.map(e=>`<i class="b ${bcls(e.t)}">${esc(e.t)}</i>`).join('')}</div>${rows.join('')}</div>`;
    }).join('');
  }).join('');
}
function chaseTxt(m){
  const a=m.s1,b=m.s2,lim=(m.overs||20)*6;
  if(m.inn===2){const need=a.r+1-b.r,left=lim-b.b;return need>0?`${esc(tn(m.t2))} need <b>${need}</b> off <b>${Math.max(0,left)}</b> balls`:`🎯 ${esc(tn(m.t2))} have reached the target!`}
  return (a.r||a.b)?`${esc(tn(m.t1))} are setting the target`:'';
}
function matchPage(m){
  const live=m.status==='live',fin=m.status==='done',inn=m.inn===2?2:1;
  const bt=(id,s,on,r)=>`<div class="bteam${on?' bat':''}${r?' r':''}">${badge(id)}<div><div class="nm">${esc(tn(id))}${live&&on?'<span class="bat-tag">BAT</span>':''}${fin&&m.winner===id?' 🏆':''}</div><div class="big">${s.r}/${s.w}</div><div class="ovs">${ov(s.b)} / ${m.overs||20} ov</div></div></div>`;
  const on1=live?inn===1:(m.winner===m.t1||m.winner==='draw'),on2=live?inn===2:(m.winner===m.t2||m.winner==='draw');
  const ct=live?chaseTxt(m):'';
  const head=`<article class="card${live?' live':''}"><div class="livemeta">${live?'<span class="pill">LIVE</span>':fin?'<span class="chip">✅ FULL TIME</span>':'<span class="chip">⏳ UPCOMING</span>'}<span>📍 ${esc(m.venue||'BLTZ Arena')} · ${esc(fmt(m.date))} · ${m.overs||20} overs</span></div>
  <div class="board">${bt(m.t1,m.s1,on1)}<div class="mid">VS</div>${bt(m.t2,m.s2,on2,1)}</div>
  ${live&&m.last?`<div class="last">${esc(m.last)}</div>`:''}${ct?`<div class="chase">${ct}</div>`:''}${fin?`<div class="verdict" style="text-align:center">${esc(resText(m))}</div>`:''}
  ${live?`<div class="ovl">${overLabel(m)}</div><div class="balls">${overToks(m).map(x=>`<i class="b ${bcls(x)}">${esc(x)}</i>`).join('')}</div>${crease(m)}`:''}</article>`;
  const cards=[1,2].map(i=>inningsCard(m,i)).join('');
  return `<section class="wrap sec mp"><div class="mptop"><button class="btn" data-act="home">← All matches</button></div>${head}${momBlock(m)}
  ${cards?`<h2 class="sh" style="margin-top:34px"><i>01</i>SCORECARD</h2>${cards}`:`<div class="card empty" style="margin-top:16px">📋 No detailed scorecard was recorded for this match.</div>`}
  ${m.log.length?`<h2 class="sh" style="margin-top:34px"><i>02</i>EVERY OVER</h2>${allOvers(m)}`:''}</section>`;
}
/* screen switching */
function setView(nv,tgt){
  if(nv===view)return;
  view=nv;render();
  const t=!nv&&tgt?document.getElementById(tgt):null;
  if(t)t.scrollIntoView({behavior:'instant'});else window.scrollTo({top:nv?0:(homeY||0),behavior:'instant'});
}
function route(){const mm=location.hash.match(/^#match\/([^/]+)$/),id=mm?decodeURIComponent(mm[1]):null;setView(id&&M(id)?id:null,mm?'':location.hash.slice(1))}
function openMatch(id){homeY=window.scrollY;try{history.pushState(null,'','#match/'+id);pushed=true}catch(e){}setView(id)}
function goHome(){
  if(pushed){pushed=false;try{history.back();return}catch(e){}}
  try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
  setView(null);
}
/* wicket details popup */
function openWkt(){
  const m=M(selMatch);if(!m||m.status!=='live')return;
  const inn=m.inn===2?2:1,batT=inn===1?m.t1:m.t2,bowT=inn===1?m.t2:m.t1,c=m.cur;
  if(S.players.some(p=>p.team===batT)&&!c.str)return toast('Select the striker (batter) first','warn');
  if(S.players.some(p=>p.team===bowT)&&!c.bwl)return toast('Select the bowler first','warn');
  const fl=S.players.filter(p=>p.team===bowT).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  $('#modal').innerHTML=`<div class="mask"><div class="mbox wkm" id="mbox"><div style="font-size:2.2rem">☝️</div><h3>WICKET!</h3>
  <label>How out</label><select id="wh">${HOW.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select>
  <label>Caught / stumped / run out by</label><select id="wf"><option value="">— select fielder —</option>${fl}</select>
  <label>Batter out</label><select id="wo"><option value="str">${esc(pn(c.str)||'Striker')} (striker)</option><option value="non">${esc(pn(c.non)||'Non-striker')} (non-striker)</option></select>
  <div class="row" style="justify-content:center;margin-top:16px"><button class="btn" data-act="closeModal">Cancel</button><button class="btn hot" data-act="wktOk">Confirm wicket</button></div></div></div>`;
}
function edCur(m){
  const inn=m.inn===2?2:1,batT=inn===1?m.t1:m.t2,bowT=inn===1?m.t2:m.t1,out=m.out[inn]||[];
  const opts=(team,sel,skip)=>'<option value="">— select —</option>'+S.players.filter(p=>p.team===team&&!(skip&&skip.includes(p.id))).map(p=>`<option value="${p.id}"${p.id===sel?' selected':''}>${esc(p.name)}</option>`).join('');
  return `<h4>Players on field</h4><div class="g2"><div><label>Striker · ${esc(tn(batT))}</label><select data-sel="cur" data-f="str">${opts(batT,m.cur.str,out)}</select></div><div><label>Non-striker</label><select data-sel="cur" data-f="non">${opts(batT,m.cur.non,out)}</select></div></div><label>Bowler · ${esc(tn(bowT))}</label><select data-sel="cur" data-f="bwl">${opts(bowT,m.cur.bwl)}</select><div class="row" style="margin-top:8px"><button class="btn sm" data-act="swap">⇄ Swap strike</button></div><p class="note">Every ball is logged. Runs go to the striker's score; runs, balls and wickets count against the bowler. Strike swaps on odd runs and at the end of each over.</p>`;
}

/* ---------- editor ---------- */
const teamOpts=(sel,blank)=>(blank?`<option value="">${blank}</option>`:'')+S.teams.map(t=>`<option value="${t.id}"${t.id===sel?' selected':''}>${esc(t.name)}</option>`).join('');
const num=(path,v,ph)=>`<input type="number" min="0" data-set="${path}" value="${v}" placeholder="${ph||''}">`;
const del=(act,id)=>`<button class="btn sm pink" data-act="${act}" data-id="${id}">${armed===act+id?'SURE?':'🗑'}</button>`;
function edScore(){
  const ms=S.matches.filter(m=>m.status!=='done');
  if(!ms.length)return '<p class="note">No open matches. Add a fixture in the 📅 Fixtures tab.</p>';
  if(!selMatch||!ms.find(m=>m.id===selMatch))selMatch=(ms.find(m=>m.status==='live')||ms[0]).id;
  const m=M(selMatch);const id=m.id;
  let h=`<h4>Match</h4><select data-sel="match">${ms.map(x=>`<option value="${x.id}"${x.id===selMatch?' selected':''}>${esc(tn(x.t1))} vs ${esc(tn(x.t2))} — ${x.status.toUpperCase()}</option>`).join('')}</select>`;
  if(m.status!=='live')return h+`<p class="note">This match is not live yet. Starting it shows it on the public Live section.</p><button class="btn hot" data-act="start" data-id="${id}">🔴 GO LIVE</button>`;
  h+=`<h4>Batting innings</h4><div class="seg"><button class="${m.inn===1?'on':''}" data-act="inn" data-v="1">${esc(tn(m.t1))}</button><button class="${m.inn===2?'on':''}" data-act="inn" data-v="2">${esc(tn(m.t2))}</button></div>
  ${edCur(m)}<h4>Scoring pad</h4><div class="pad">${[0,1,2,3,4,6].map(n=>`<button data-act="ball" data-v="${n}">${n}</button>`).join('')}<button data-act="ball" data-v="wd">WD</button><button data-act="ball" data-v="nb">NB</button><button class="w" data-act="wkt">WKT</button><button data-act="undo">↶</button></div>
  <label>Commentary banner</label><input data-set="m.${id}.last" value="${esc(m.last)}" placeholder="e.g. WHAT A SHOT!">
  <h4>Manual override</h4><label>${esc(tn(m.t1))} — runs / wickets / balls</label><div class="g3">${num(`m.${id}.s1.r`,m.s1.r)}${num(`m.${id}.s1.w`,m.s1.w)}${num(`m.${id}.s1.b`,m.s1.b)}</div>
  <label>${esc(tn(m.t2))} — runs / wickets / balls</label><div class="g3">${num(`m.${id}.s2.r`,m.s2.r)}${num(`m.${id}.s2.w`,m.s2.w)}${num(`m.${id}.s2.b`,m.s2.b)}</div>
  <label>Overs per innings</label>${num(`m.${id}.overs`,m.overs)}
  ${edMotm(m)}<h4>Finish match</h4><div class="fin"><button class="btn hot" data-act="finish" data-id="${id}" data-v="1">🏆 ${esc(tn(m.t1))} won (+2)</button><button class="btn hot" data-act="finish" data-id="${id}" data-v="2">🏆 ${esc(tn(m.t2))} won (+2)</button><button class="btn" data-act="finish" data-id="${id}" data-v="d">🤝 Draw (+1 each)</button></div>
  <p class="note">Points are calculated automatically from the result. Press Publish when you want everyone to see the update.</p>`;
  return h;
}
function edFix(){
  let h=`<h4>Add match</h4><div class="g2"><div><label>Team 1</label><select id="am1">${teamOpts('')}</select></div><div><label>Team 2</label><select id="am2">${teamOpts(S.teams[1]&&S.teams[1].id)}</select></div><div><label>Date & time</label><input id="amd" type="datetime-local"></div><div><label>Venue</label><input id="amv" placeholder="BLTZ Arena"></div></div><br><button class="btn hot" data-act="addMatch">＋ Add match</button><h4>All matches</h4>`;
  h+=S.matches.map(m=>`<div class="edc"><div class="g2"><div><label>Team 1</label><select data-set="m.${m.id}.t1">${teamOpts(m.t1)}</select></div><div><label>Team 2</label><select data-set="m.${m.id}.t2">${teamOpts(m.t2)}</select></div>
  <div><label>Date & time</label><input type="datetime-local" data-set="m.${m.id}.date" value="${loc(m.date)}"></div><div><label>Venue</label><input data-set="m.${m.id}.venue" value="${esc(m.venue)}"></div>
  <div><label>Status</label><select data-set="m.${m.id}.status">${['upcoming','live','done'].map(s=>`<option${m.status===s?' selected':''}>${s}</option>`).join('')}</select></div>
  <div><label>Winner</label><select data-set="m.${m.id}.winner"><option value="">— none —</option><option value="${m.t1}"${m.winner===m.t1?' selected':''}>${esc(tn(m.t1))}</option><option value="${m.t2}"${m.winner===m.t2?' selected':''}>${esc(tn(m.t2))}</option><option value="draw"${m.winner==='draw'?' selected':''}>Draw</option></select></div></div>
  ${edMotm(m)}<div class="row" style="justify-content:flex-end;margin-top:8px">${del('delMatch',m.id)}</div></div>`).join('')||'<p class="note">No matches yet.</p>';
  return h;
}
function edTeams(){
  return `<h4>Register team</h4><div class="row"><input id="nt" placeholder="Team name"><input id="ntc" type="color" value="#ff2d7a" style="width:64px"></div><br><button class="btn hot" data-act="addTeam">＋ Register team</button><h4>Teams</h4>`+
  (S.teams.map(t=>`<div class="edc row"><input type="color" data-set="t.${t.id}.color" value="${esc(t.color)}" style="width:54px"><input data-set="t.${t.id}.name" value="${esc(t.name)}">${del('delTeam',t.id)}</div>`).join('')||'<p class="note">No teams yet.</p>')+'<p class="note">Deleting a team also removes its players and matches.</p>';
}
function edPlayers(){
  return `<h4>Register player</h4><div class="g2"><div><label>Name</label><input id="np" placeholder="Player name"></div><div><label>Team</label><select id="npt">${teamOpts('')}</select></div><div><label>Role</label><select id="npr">${ROLES.map(r=>`<option>${r}</option>`).join('')}</select></div></div><br><button class="btn hot" data-act="addPlayer">＋ Register player</button><h4>Players</h4>`+
  (S.players.map(p=>`<div class="edc"><div class="g2"><input data-set="p.${p.id}.name" value="${esc(p.name)}"><select data-set="p.${p.id}.team">${teamOpts(p.team)}</select><select data-set="p.${p.id}.role">${ROLES.map(r=>`<option${p.role===r?' selected':''}>${r}</option>`).join('')}</select><div style="text-align:right">${del('delPlayer',p.id)}</div></div></div>`).join('')||'<p class="note">No players yet.</p>');
}
function edStats(){
  return `<h4>Add match performance</h4><label>Player</label><select id="pp">${S.players.map(p=>`<option value="${p.id}">${esc(p.name)} (${esc(tn(p.team))})</option>`).join('')}</select><div class="g2"><div><label>Runs scored</label><input id="pr" type="number" min="0" value="0"></div><div><label>Wickets taken</label><input id="pw" type="number" min="0" value="0"></div></div><br><button class="btn hot" data-act="addPerf">＋ Add to totals (+1 match)</button>
  <h4>Edit totals directly</h4>`+S.players.map(p=>`<div class="edc"><b>${esc(p.name)}</b> <span class="note">${esc(tn(p.team))}</span><div class="g3"><div><label>Matches</label>${num(`p.${p.id}.matches`,p.matches)}</div><div><label>Runs</label>${num(`p.${p.id}.runs`,p.runs)}</div><div><label>Wickets</label>${num(`p.${p.id}.wickets`,p.wickets)}</div></div></div>`).join('');
}
function edPub(){
  return `<h4>Save changes</h4><p class="note">Your edits show instantly here. Press save to keep them in this browser.</p><button class="btn hot" data-act="publish">🚀 SAVE ${dirty?'●':''}</button>
  <label style="margin-top:14px"><input type="checkbox" data-sel="auto"${auto?' checked':''}> Auto-save 2s after each change</label>
  <h4>Site text</h4><label>Title</label><input data-set="meta.title" value="${esc(S.title)}"><label>Tagline</label><input data-set="meta.tagline" value="${esc(S.tagline)}">
  <h4>Data</h4>${S.demo?'<p class="note">⚠ Demo data is loaded. Clear it before your real tournament.</p>':''}<button class="btn pink" data-act="clearAll">${armed==='clearAll'?'SURE? CLICK AGAIN':'🧹 Clear all data'}</button>
  <h4>Session</h4><button class="btn" data-act="lock">🔒 Exit editor</button>`;
}
function edHTML(){
  const tabs=[['score','⚡ Score'],['fix','📅 Fixtures'],['teams','🛡 Teams'],['players','🏏 Players'],['stats','📊 Stats'],['pub','🚀 Publish']];
  const fn={score:edScore,fix:edFix,teams:edTeams,players:edPlayers,stats:edStats,pub:edPub}[edTab];
  return `<div class="edh"><div><b>EDITOR MODE</b><small>${dirty?'● unsaved changes':'✓ in sync'}</small></div><div class="row"><button class="btn sm hot" data-act="publish">Save</button><button class="x" data-act="panel" aria-label="Close panel">✕</button></div></div>
  <nav class="edt">${tabs.map(([k,l])=>`<button class="${edTab===k?'on':''}" data-act="tab" data-v="${k}">${l}</button>`).join('')}</nav><div class="edb">${fn()}</div>`;
}

/* ---------- render ---------- */
function render(){norm();
  const y=window.scrollY;const eb=$('#editor .edb');const ey=eb?eb.scrollTop:0;
  $('#app').innerHTML=view&&M(view)?ticker()+matchPage(M(view))+footer():ticker()+hero()+liveSec()+fixtures()+results()+pointsSec()+squads()+playersSec()+summary()+footer();
  const ed=$('#editor');ed.className=editing&&edOpen?'open':'';ed.innerHTML=editing?edHTML():'';
  const e2=$('#editor .edb');if(e2)e2.scrollTop=ey;
  $('#edbtn').innerHTML=editing?`<button class="btn hot" data-act="panel">⚙ Panel${dirty?' ●':''}</button><button class="btn" data-act="lock">🔒</button>`:`<button class="btn hot" data-act="unlock">✏️ Editor</button>`;
  $('#dock').innerHTML='';
  document.title=S.title+' — Cricket Tournament';
  window.scrollTo(0,y);
  if(!ready){
    const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.08});
    document.querySelectorAll('.rise').forEach(el=>io.observe(el));
    document.querySelectorAll('[data-n]').forEach(countUp);
    ready=true;
  }
  tick();
}
function countUp(el){const n=+el.dataset.n;if(!n)return;const t0=performance.now();(function f(t){const p=Math.min(1,(t-t0)/1000);el.textContent=Math.round(n*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)})(t0)}
function tick(){
  const el=$('#cd');if(!el)return;const t=new Date(el.dataset.t)-Date.now();
  if(isNaN(t))return;
  if(t<=0){el.innerHTML='<span style="min-width:200px"><b>🔥</b>STARTING SOON</span>';return}
  const d=Math.floor(t/864e5),h=Math.floor(t%864e5/36e5),m=Math.floor(t%36e5/6e4),s=Math.floor(t%6e4/1e3);
  el.innerHTML=[['Days',d],['Hrs',h],['Min',m],['Sec',s]].map(([l,v])=>`<span><b>${String(v).padStart(2,'0')}</b>${l}</span>`).join('');
}
setInterval(tick,1000);

/* ---------- toast / modal ---------- */
function toast(msg,kind){const t=$('#toast');t.textContent=msg;t.className='show'+(kind?' '+kind:'');clearTimeout(tkT);tkT=setTimeout(()=>{t.className=''},3000)}
function openModal(){$('#modal').innerHTML=`<div class="mask"><div class="mbox" id="mbox"><div style="font-size:2.4rem">🔐</div><h3>EDITOR ACCESS</h3><div class="muted">Enter the editor password</div><input id="pw" type="password" autocomplete="off" placeholder="••••••"><div class="row" style="justify-content:center"><button class="btn" data-act="closeModal">Cancel</button><button class="btn hot" data-act="submitPw">Unlock</button></div></div></div>`;setTimeout(()=>{const i=$('#pw');if(i)i.focus()},50)}
function closeModal(){$('#modal').innerHTML=''}
function submitPw(){
  const v=$('#pw').value;
  if(v===PASS){editing=true;edOpen=true;try{sessionStorage.setItem('bltz_ed','1')}catch(e){}closeModal();render();toast('Editor unlocked ⚡')}
  else{const b=$('#mbox');b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake');$('#pw').value='';toast('Wrong password','warn')}
}

/* ---------- state changes ---------- */
function changed(){dirty=true;render();if(auto){clearTimeout(pubT);pubT=setTimeout(publish,2000)}}
function addBall(v,info){
  const m=M(selMatch);if(!m||m.status!=='live')return;
  if(!/^\d$/.test(v)&&!['wd','nb','w'].includes(v))return;
  norm();
  const inn=m.inn===2?2:1,s=inn===2?m.s2:m.s1,batT=inn===1?m.t1:m.t2,bowT=inn===1?m.t2:m.t1,c=m.cur;
  const str=S.players.find(p=>p.id===c.str&&p.team===batT),non=S.players.find(p=>p.id===c.non&&p.team===batT),bwl=S.players.find(p=>p.id===c.bwl&&p.team===bowT);
  if(S.players.some(p=>p.team===batT)&&!str)return toast('Select the striker (batter) first','warn');
  if(S.players.some(p=>p.team===bowT)&&!bwl)return toast('Select the bowler first','warn');
  hist.push({id:m.id,snap:JSON.stringify(m),pl:S.players.map(p=>[p.id,p.runs,p.wickets,p.matches])});if(hist.length>60)hist.shift();
  [str,non,bwl].forEach(p=>{if(p&&!m.part.includes(p.id)){m.part.push(p.id);p.matches++}});
  const sb=s.b;let tok,bat=0,ext=0,legal=1,wk=0,how='',fl=null,ob=null;
  if(/^\d$/.test(v)){const n=+v;bat=n;s.r+=n;s.b++;tok=n===0?'.':String(n);m.last=n===4?'FOUR! 💥':n===6?'SIX! 🚀':n===0?'Dot ball':n+(n===1?' run':' runs')}
  else if(v==='wd'){ext=1;legal=0;s.r++;tok='wd';m.last='Wide'}
  else if(v==='nb'){ext=1;legal=0;s.r++;tok='nb';m.last='No ball — free hit!'}
  else{
    info=info||{};wk=1;how=info.h||'bowled';
    fl=['caught','stumped','runout'].includes(how)?S.players.find(p=>p.id===info.f&&p.team===bowT):null;
    ob=info.ob==='non'&&non?non:str;
    s.w=Math.min(10,s.w+1);s.b++;tok='W';
    m.last={bowled:'BOWLED! 🎯',caught:'CAUGHT! 🧤',lbw:'LBW! ☝️',runout:'RUN OUT! 🏃',stumped:'STUMPED! 🧤',hitwicket:'HIT WICKET! 💥'}[how]||'WICKET! ☝️';
  }
  if(str)str.runs+=bat;                                  /* runs go to the batter's score */
  if(bwl&&wk&&how!=='runout')bwl.wickets++;              /* wicket goes to the bowler (not for run outs) */
  if(wk&&ob){m.out[inn].push(ob.id);if(ob===str)c.str='';else c.non=''}
  if(legal&&bat%2===1)[c.str,c.non]=[c.non,c.str];
  const e={i:inn,o:ov(s.b),v:Math.floor(sb/6),s:str?str.id:'',sn:str?str.name:'',b:bwl?bwl.id:'',bn:bwl?bwl.name:'',r:bat,x:ext,t:tok,w:wk,l:legal,tr:s.r,tw:s.w};
  if(wk){e.h=how;e.f=fl?fl.id:'';e.fn=fl?fl.name:'';e.ob=ob?ob.id:'';e.obn=ob?ob.name:''}
  m.log.push(e);
  m.balls=(m.balls||[]).concat(tok).slice(-24);
  if(legal&&s.b%6===0){[c.str,c.non]=[c.non,c.str];c.bwl='';toast('Over complete — pick the next bowler')}
  changed();
}
function arm(key,fn){
  if(armed!==key){armed=key;render();setTimeout(()=>{if(armed===key){armed=null;render()}},3000);return}
  armed=null;fn();
}
function act(a,d){
  switch(a){
    case 'unlock':return openModal();
    case 'closeModal':return closeModal();
    case 'submitPw':return submitPw();
    case 'lock':editing=false;try{sessionStorage.removeItem('bltz_ed')}catch(e){}return render();
    case 'panel':edOpen=!edOpen;return render();
    case 'tab':edTab=d.v;return render();
    case 'start':{const m=M(d.id);m.status='live';m.inn=1;m.s1={r:0,w:0,b:0};m.s2={r:0,w:0,b:0};m.balls=[];m.log=[];m.part=[];m.out={1:[],2:[]};m.cur={str:'',non:'',bwl:''};m.last='Match is LIVE!';hist=[];return changed()}
    case 'open':return openMatch(d.id);
    case 'home':return goHome();
    case 'wkt':return openWkt();
    case 'wktOk':{
      const m=M(selMatch);if(!m)return;const h=$('#wh').value,f=$('#wf').value,o=$('#wo').value,inn=m.inn===2?2:1,bowT=inn===1?m.t2:m.t1;
      if(S.players.some(p=>p.team===bowT)&&(h==='caught'||h==='stumped')&&!f)return toast('Select who took the '+(h==='caught'?'catch':'stumping'),'warn');
      if(o==='non'&&!m.cur.non)return toast('Select the non-striker first','warn');
      closeModal();return addBall('w',{h:h,f:f,ob:o});
    }
    case 'useMotm':{const m=M(d.id);if(m)m.motm=d.p;return changed()}
    case 'ball':return addBall(d.v);
    case 'swap':{const m=M(selMatch);if(!m)return;const c=m.cur;[c.str,c.non]=[c.non,c.str];return changed()}
    case 'bb':bbOpen[d.id]=!bbOpen[d.id];return render();
    case 'sc':scOpen[d.id]=!scOpen[d.id];return render();
    case 'undo':{const h=hist.pop();if(!h)return toast('Nothing to undo','warn');const i=S.matches.findIndex(x=>x.id===h.id);if(i>-1)S.matches[i]=JSON.parse(h.snap);(h.pl||[]).forEach(([id,r,w,mt])=>{const p=S.players.find(x=>x.id===id);if(p){p.runs=r;p.wickets=w;p.matches=mt}});return changed()}
    case 'inn':{const m=M(selMatch);m.inn=+d.v;m.cur={str:'',non:'',bwl:''};m.last=m.inn===2?'Innings break — chase begins!':m.last;return changed()}
    case 'finish':{const m=M(d.id);m.status='done';m.winner=d.v==='1'?m.t1:d.v==='2'?m.t2:'draw';m.last='';return changed()}
    case 'addMatch':{
      if(S.teams.length<2)return toast('At least two teams are required','warn');
      const a=$('#am1').value,b=$('#am2').value,dt=$('#amd').value;
      if(a===b)return toast('A team cannot play against itself','warn');
      S.matches.push({id:uid(),t1:a,t2:b,date:dt?new Date(dt).toISOString():'',venue:$('#amv').value.trim()||'BLTZ Arena',status:'upcoming',winner:'',overs:20,inn:1,s1:{r:0,w:0,b:0},s2:{r:0,w:0,b:0},balls:[],last:''});
      toast('Match added');return changed();
    }
    case 'delMatch':return arm('delMatch'+d.id,()=>{S.matches=S.matches.filter(m=>m.id!==d.id);changed()});
    case 'addTeam':{
      const n=$('#nt').value.trim();if(!n)return toast('Enter a team name','warn');
      if(S.teams.some(t=>t.name.toLowerCase()===n.toLowerCase()))return toast('Team already exists','warn');
      S.teams.push({id:uid(),name:n,color:$('#ntc').value});toast('Team registered successfully');return changed();
    }
    case 'delTeam':return arm('delTeam'+d.id,()=>{S.teams=S.teams.filter(t=>t.id!==d.id);S.players=S.players.filter(p=>p.team!==d.id);S.matches=S.matches.filter(m=>m.t1!==d.id&&m.t2!==d.id);changed()});
    case 'addPlayer':{
      if(!S.teams.length)return toast('Please register a team first','warn');
      const n=$('#np').value.trim();if(!n)return toast('Enter a player name','warn');
      if(S.players.some(p=>p.name.toLowerCase()===n.toLowerCase()))return toast('Player already exists','warn');
      S.players.push({id:uid(),name:n,team:$('#npt').value,role:$('#npr').value,matches:0,runs:0,wickets:0});toast('Player registered successfully');return changed();
    }
    case 'delPlayer':return arm('delPlayer'+d.id,()=>{S.players=S.players.filter(p=>p.id!==d.id);changed()});
    case 'addPerf':{
      const p=S.players.find(x=>x.id===$('#pp').value);if(!p)return toast('Register a player first','warn');
      p.runs+=Math.max(0,parseInt($('#pr').value,10)||0);p.wickets+=Math.max(0,parseInt($('#pw').value,10)||0);p.matches++;
      toast('Player performance updated');return changed();
    }
    case 'clearAll':return arm('clearAll',()=>{S.teams=[];S.players=[];S.matches=[];S.demo=false;changed();toast('All data cleared')});
    case 'publish':return publish();
  }
}
document.addEventListener('click',e=>{
  if(e.target.classList&&e.target.classList.contains('mask')){closeModal();return}
  const t=e.target.closest('[data-act]');if(t)act(t.dataset.act,t.dataset);
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='pw')submitPw();if(e.key==='Escape')closeModal()});
document.addEventListener('input',e=>{if(e.target.id==='q'){q=e.target.value;$('#sres').innerHTML=searchRes()}});
document.addEventListener('change',e=>{
  const el=e.target,ds=el.dataset||{};
  if(ds.sel==='match'){selMatch=el.value;return render()}
  if(ds.sel==='auto'){auto=el.checked;return}
  if(ds.sel==='cur'){const m=M(selMatch);if(!m)return;const c=m.cur,f=ds.f,v=el.value;
    if(f==='str'&&v&&v===c.non)c.non=c.str;
    if(f==='non'&&v&&v===c.str)c.str=c.non;
    c[f]=v;return changed()}
  if(!ds.set)return;
  let v=el.value;
  if(el.type==='number')v=Math.max(0,parseInt(v||'0',10)||0);
  if(el.type==='datetime-local')v=v?new Date(v).toISOString():'';
  const parts=ds.set.split('.');const k=parts[0];
  if(k==='meta'){S[parts[1]]=v;return changed()}
  const list=k==='m'?S.matches:k==='p'?S.players:S.teams;const o=list.find(x=>x.id===parts[1]);if(!o)return;
  const f=parts.slice(2);
  if(k==='m'&&(f[0]==='t1'||f[0]==='t2')){const other=f[0]==='t1'?o.t2:o.t1;if(v===other){toast('A team cannot play against itself','warn');return render()}}
  let tgt=o;for(let i=0;i<f.length-1;i++)tgt=tgt[f[i]];tgt[f[f.length-1]]=v;
  if(k==='m'&&f[0]==='status'&&v==='live'){o.inn=o.inn||1}
  changed();
});

/* ---------- publish (local save) ---------- */
function exportData(){
  const txt='window.BLTZ_STATE = '+JSON.stringify(S,null,2)+';\n';
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([txt],{type:'text/javascript'}));
  a.download='data.js';document.body.appendChild(a);a.click();a.remove();
}
window.bltzExport=exportData;
async function publish(){
  clearTimeout(pubT);
  try{
    localStorage.setItem(STORE_KEY,JSON.stringify(S));
    dirty=false;render();
    toast('Saved ✓ — stored in this browser. Run bltzExport() in the console to download data.js for deploying');
  }catch(err){
    toast('Save failed: '+(err&&err.message||'error'),'warn');
  }
}

/* ---------- effects ---------- */
const glow=$('#glow');
document.addEventListener('mousemove',e=>{
  glow.style.transform='translate('+e.clientX+'px,'+e.clientY+'px)';
  const c=e.target.closest&&e.target.closest('.tilt');
  if(c){const r=c.getBoundingClientRect();c.style.setProperty('--ry',(((e.clientX-r.left)/r.width-.5)*10).toFixed(2)+'deg');c.style.setProperty('--rx',(-((e.clientY-r.top)/r.height-.5)*10).toFixed(2)+'deg')}
});
document.addEventListener('mouseout',e=>{const c=e.target.closest&&e.target.closest('.tilt');if(c&&!c.contains(e.relatedTarget)){c.style.setProperty('--rx','0deg');c.style.setProperty('--ry','0deg')}});

const cv=$('#fx'),cx=cv.getContext('2d');let W=0,H=0,P=[],bolt=null,flash=0,frame=0,nextBolt=240,cols=['198,255,46','255,45,122','39,227,255'];
function size(){const r=window.devicePixelRatio||1;W=innerWidth;H=innerHeight;cv.width=W*r;cv.height=H*r;cx.setTransform(r,0,0,r,0,0);
  P=Array.from({length:Math.min(80,Math.floor(W*H/20000))},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.45,vy:(Math.random()-.5)*.45,r:Math.random()*2.2+1,c:Math.floor(Math.random()*3)}))}
function readCols(){const s=getComputedStyle(document.documentElement);cols=['--fxa','--fxb','--fxc'].map(k=>s.getPropertyValue(k).trim()||'255,255,255')}
function makeBolt(){const pts=[];let x=Math.random()*W*.8+W*.1,y=0;const end=H*(.45+Math.random()*.35);while(y<end){pts.push([x,y]);x+=(Math.random()-.5)*70;y+=18+Math.random()*30}return pts}
function draw(){
  frame++;if(frame%90===1)readCols();
  cx.clearRect(0,0,W,H);
  for(const p of P){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1}
  for(let i=0;i<P.length;i++){const a=P[i];
    for(let j=i+1;j<P.length;j++){const b=P[j],dx=a.x-b.x,dy=a.y-b.y,d=dx*dx+dy*dy;if(d<14000){cx.strokeStyle='rgba('+cols[a.c]+','+(.22*(1-d/14000)).toFixed(3)+')';cx.lineWidth=1;cx.beginPath();cx.moveTo(a.x,a.y);cx.lineTo(b.x,b.y);cx.stroke()}}
    cx.fillStyle='rgba('+cols[a.c]+',.9)';cx.shadowColor='rgba('+cols[a.c]+',1)';cx.shadowBlur=12;cx.beginPath();cx.arc(a.x,a.y,a.r,0,7);cx.fill();cx.shadowBlur=0}
  if(--nextBolt<=0){bolt=makeBolt();flash=1;nextBolt=300+Math.random()*420}
  if(flash>0){
    cx.fillStyle='rgba('+cols[2]+','+(flash*.08).toFixed(3)+')';cx.fillRect(0,0,W,H);
    if(bolt){cx.strokeStyle='rgba(255,255,255,'+flash.toFixed(2)+')';cx.shadowColor='rgba('+cols[2]+',1)';cx.shadowBlur=24;cx.lineWidth=2.2;cx.beginPath();bolt.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.stroke();cx.shadowBlur=0}
    flash-=.035;if(flash<=0)bolt=null;
  }
  if(!reduce)requestAnimationFrame(draw);
}
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
size();readCols();addEventListener('resize',size);
if(reduce){nextBolt=1e9;draw()}else requestAnimationFrame(draw);

{const mm=location.hash.match(/^#match\/([^/]+)$/);if(mm&&M(decodeURIComponent(mm[1])))view=decodeURIComponent(mm[1])}
render();
addEventListener('popstate',route);addEventListener('hashchange',route);
})();
