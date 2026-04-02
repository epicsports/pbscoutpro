// ─── BreakAnalyzer Web Worker v3 ───
// v2 features: risk levels, ball drop, edge shooting, snake arcs
// v3 NEW: ANALYZE_COUNTER — bump heatmap + bunker counter positions

const DRAG_K = (0.5 * 0.47 * 1.225 * Math.PI * 0.00865 * 0.00865) / 0.0032;
const G = 9.81, DT = 0.001, MV = 85;
const ARC_ANGLES = [0, 3, 5, 8, 10, 13, 15];
const ARC_MARGIN = 0.20;
const MIN_ARRIVAL_H = 0.20;

const ACC = [[5,.95],[10,.85],[15,.70],[20,.50],[25,.35],[30,.20],[35,.12],[40,.06],[50,.02]];
function getAcc(d) {
  if (d <= 0) return 1;
  if (d >= ACC[ACC.length-1][0]) return ACC[ACC.length-1][1];
  for (let i = 0; i < ACC.length-1; i++) {
    if (d >= ACC[i][0] && d < ACC[i+1][0]) {
      const f = (d - ACC[i][0]) / (ACC[i+1][0] - ACC[i][0]);
      return ACC[i][1] + (ACC[i+1][1] - ACC[i][1]) * f;
    }
  }
  return ACC[0][1];
}

const HEIGHTS = {
  SB:.76,SD:.85,MD:1,Tr:.9,C:1.2,Br:1.15,GB:1.5,MW:1.2,Wg:1.4,GW:1.7,
  Ck:1,TCK:1.6,T:1.5,MT:1.8,GP:1.5,
  Snake:.76,Beam:.76,Dorito:1,Can:1.1,Rollie:1.1,Brick:1.15,
  'Small Cake':1,'Tall Cake':1.6,Temple:1.5,Maya:1.5,Wing:1.4,
  Dollhouse:1.3,Carwash:1.4,'X-Bunker':1.5,Tower:2.1,Inne:1.2,
};
const SIZES = {
  SB:{w:3,d:.76},SD:{w:1,d:1.2},MD:{w:1.2,d:1.8},Tr:{w:.6,d:.6},C:{w:.9,d:.9},
  Br:{w:1.5,d:.9},GB:{w:3,d:1.5},MW:{w:1.5,d:.8},Wg:{w:2,d:1},GW:{w:2.4,d:1.5},
  Ck:{w:1.5,d:1.5},TCK:{w:1.5,d:1.5},T:{w:1.8,d:1.5},MT:{w:2.5,d:2},GP:{w:2.5,d:2.5},
  Snake:{w:3,d:.76},Beam:{w:3,d:.76},Dorito:{w:1.2,d:1.8},Can:{w:1,d:1},
  Rollie:{w:1,d:1},Brick:{w:1.5,d:.9},'Small Cake':{w:1.5,d:1.5},
  'Tall Cake':{w:1.5,d:1.5},Temple:{w:1.8,d:1.5},Maya:{w:1.8,d:1.5},
  Wing:{w:2.4,d:1.5},Dollhouse:{w:1.5,d:1.5},Carwash:{w:2,d:1.2},
  'X-Bunker':{w:1.5,d:1.5},Tower:{w:1.8,d:1.8},Inne:{w:1.2,d:1.2},
};
const STANCE = {
  SB:'prone',SD:'kneeling',MD:'kneeling',Tr:'kneeling',C:'kneeling',
  Br:'kneeling',GB:'standing',MW:'kneeling',Wg:'kneeling',GW:'standing',
  Ck:'kneeling',TCK:'standing',T:'standing',MT:'standing',GP:'standing',
  Snake:'prone',Beam:'prone',Dorito:'kneeling',Can:'kneeling',
};
const BARREL_H = { prone: 0.45, kneeling: 1.15, standing: 1.55 };
const SITUP_H = 0.95;

// ═══ TRAJECTORY ═══
function ballH(dist, barrelH, elevDeg) {
  const r = elevDeg * Math.PI / 180;
  let vx = MV * Math.cos(r), vy = MV * Math.sin(r), x = 0, y = barrelH;
  for (let s = 0; s < 12000 && x < dist; s++) {
    const v = Math.sqrt(vx*vx + vy*vy);
    if (v < 1) return y;
    const d = DRAG_K * v * v;
    vx += -(vx/v)*d*DT; vy += (-(vy/v)*d - G)*DT;
    x += vx*DT; y += vy*DT;
    if (y < -0.5) return -1;
  }
  return y;
}

// ═══ RAY-CASTING ═══
function rayRect(ax,ay,bx,by,cx,cy,hw,hd) {
  const dx=bx-ax,dy=by-ay,len=Math.sqrt(dx*dx+dy*dy);
  if(len<.001)return -1;
  let tmin=0,tmax=1;
  if(Math.abs(dx)<.0001){if(ax<cx-hw||ax>cx+hw)return -1}
  else{let t1=(cx-hw-ax)/dx,t2=(cx+hw-ax)/dx;if(t1>t2)[t1,t2]=[t2,t1];tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);if(tmin>tmax)return -1}
  if(Math.abs(dy)<.0001){if(ay<cy-hd||ay>cy+hd)return -1}
  else{let t1=(cy-hd-ay)/dy,t2=(cy+hd-ay)/dy;if(t1>t2)[t1,t2]=[t2,t1];tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);if(tmin>tmax)return -1}
  return tmin*len;
}
function rayCircle(ax,ay,bx,by,cx,cy,r) {
  const dx=bx-ax,dy=by-ay,fx=ax-cx,fy=ay-cy;
  const a=dx*dx+dy*dy,b=2*(fx*dx+fy*dy),c=fx*fx+fy*fy-r*r;
  let disc=b*b-4*a*c; if(disc<0)return -1; disc=Math.sqrt(disc);
  const t1=(-b-disc)/(2*a),t2=(-b+disc)/(2*a);
  const t=t1>=0&&t1<=1?t1:(t2>=0&&t2<=1?t2:-1);
  return t>=0?t*Math.sqrt(a):-1;
}

function shotClear(sx,sy,sh,tx,ty,bunkers,elev) {
  for (const b of bunkers) {
    const ds=Math.sqrt((b.x-sx)**2+(b.y-sy)**2);
    const dt=Math.sqrt((b.x-tx)**2+(b.y-ty)**2);
    if(ds<0.3||dt<0.3) continue;
    const hw=b.w/2,hd=b.d/2;
    const hitD = b.shape==='circle' ? rayCircle(sx,sy,tx,ty,b.x,b.y,hw) : rayRect(sx,sy,tx,ty,b.x,b.y,hw,hd);
    if(hitD<0) continue;
    const bh = ballH(hitD, sh, elev);
    if(bh>=0 && bh <= b.h + ARC_MARGIN) return false;
  }
  return true;
}

function checkLOS(sx,sy,sh,tx,ty,bunkers) {
  const dist = Math.sqrt((tx-sx)**2+(ty-sy)**2);
  if(dist<0.3) return {vis:true, arc:false, dist};
  if(dist>45) return {vis:false, arc:false, dist};
  if (shotClear(sx,sy,sh,tx,ty,bunkers,0)) {
    const arrH = ballH(dist, sh, 0);
    if (arrH >= MIN_ARRIVAL_H) return {vis:true, arc:false, dist};
  }
  for (const ang of ARC_ANGLES) {
    if(ang===0) continue;
    if (shotClear(sx,sy,sh,tx,ty,bunkers,ang)) {
      const arrH = ballH(dist, sh, ang);
      if (arrH >= MIN_ARRIVAL_H && arrH <= 2.2) return {vis:false, arc:true, dist};
    }
  }
  return {vis:false, arc:false, dist};
}

function edgePos(b, tx, ty) {
  const hw=b.w/2, hd=b.d/2;
  const dx=tx-b.x, dy=ty-b.y, len=Math.sqrt(dx*dx+dy*dy);
  if(len<0.1) return [{x:b.x,y:b.y}];
  const nx=dx/len, ny=dy/len;
  const ed = Math.max(hw, hd);
  const out = [{x: b.x + nx*ed, y: b.y + ny*ed}];
  if(ed > 0.5) {
    out.push({x: b.x - ny*hw*0.8, y: b.y + nx*hd*0.8});
    out.push({x: b.x + ny*hw*0.8, y: b.y - nx*hd*0.8});
  }
  return out;
}

// ═══ PATH HELPERS ═══
// Build timed samples along a polyline path (in meters)
function buildPathSamples(waypoints, speed, sampleDt) {
  const samples = []; // [{x, y, t}]
  let totalT = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const ax = waypoints[i].x, ay = waypoints[i].y;
    const bx = waypoints[i+1].x, by = waypoints[i+1].y;
    const dx = bx-ax, dy = by-ay, segLen = Math.sqrt(dx*dx + dy*dy);
    const segTime = segLen / speed;
    const nSamples = Math.max(1, Math.ceil(segTime / sampleDt));
    for (let s = 0; s < nSamples; s++) {
      const frac = s / nSamples;
      samples.push({ x: ax + dx*frac, y: ay + dy*frac, t: totalT + segTime*frac });
    }
    totalT += segTime;
  }
  // Add final point
  const last = waypoints[waypoints.length - 1];
  samples.push({ x: last.x, y: last.y, t: totalT });
  return { samples, totalTime: totalT };
}

// Check if a point is inside any bunker footprint
function insideBunker(px, py, bunkers) {
  for (const b of bunkers) {
    const hw = b.w/2, hd = b.d/2;
    if (b.shape === 'circle') {
      if (Math.sqrt((px-b.x)**2 + (py-b.y)**2) < hw) return true;
    } else {
      if (px > b.x-hw && px < b.x+hw && py > b.y-hd && py < b.y+hd) return true;
    }
  }
  return false;
}

// ═══ STATE ═══
let F = null;

self.onmessage = function(e) {
  const {type, payload: P} = e.data;
  try {
    if(type==='INIT_FIELD') initField(P);
    else if(type==='QUERY_VIS') queryVis(P);
    else if(type==='ANALYZE_PATH') analyzePath(P);
    else if(type==='ANALYZE_COUNTER') analyzeCounter(P);
    else self.postMessage({type:'ERROR',payload:{message:'Unknown: '+type}});
  } catch(err) { self.postMessage({type:'ERROR',payload:{message:err.message}}); }
};

function initField(P) {
  const {fieldW, fieldH, bunkers, res=4} = P;
  F = {
    w:fieldW, h:fieldH,
    bunkers: bunkers.map(b => ({
      id:b.id, name:b.name||b.id, x:b.x*fieldW, y:b.y*fieldH,
      w: b.widthM||(SIZES[b.type]||{w:1.2}).w,
      d: b.depthM||(SIZES[b.type]||{d:1.2}).d,
      h: b.heightM||HEIGHTS[b.type]||1.2,
      shape: b.shape||'rect', type: b.type,
      nx: b.x, ny: b.y, // keep normalized coords
    })),
    cols: Math.round(fieldW*res), rows: Math.round(fieldH*res),
    cw: fieldW/Math.round(fieldW*res), ch: fieldH/Math.round(fieldH*res),
  };
  self.postMessage({type:'FIELD_READY',payload:{cols:F.cols,rows:F.rows,bunkers:F.bunkers.length}});
}

// ═══ QUERY_VIS (unchanged from v2) ═══
function queryVis(P) {
  if(!F) return self.postMessage({type:'ERROR',payload:{message:'No field'}});
  const {bunkerId, pos, barrelH: bh, bunkerType} = P;
  let srcB = null;
  if(bunkerId) srcB = F.bunkers.find(b=>b.id===bunkerId);
  const srcX = srcB ? srcB.x : (pos ? pos.x*F.w : 0);
  const srcY = srcB ? srcB.y : (pos ? pos.y*F.h : 0);
  const st = STANCE[bunkerType] || (srcB ? STANCE[srcB.type] : null) || 'kneeling';
  const barrelH = bh || BARREL_H[st] || 1.15;
  const isSnake = st === 'prone';
  const n = F.cols * F.rows;
  const safe = new Float32Array(n), risky = new Float32Array(n);
  const step = Math.max(1, Math.floor(n/20));
  for (let gy=0; gy<F.rows; gy++) {
    for (let gx=0; gx<F.cols; gx++) {
      const idx = gy*F.cols+gx;
      const tx = (gx+.5)*F.cw, ty = (gy+.5)*F.ch;
      if (isSnake) {
        const dy = Math.abs(ty - srcY), dx = Math.abs(tx - srcX);
        const isSideways = dy > dx * 0.5;
        const edges = srcB ? edgePos(srcB, tx, ty) : [{x:srcX,y:srcY}];
        let best = 0;
        for (const e of edges) {
          const r = checkLOS(e.x, e.y, isSideways ? barrelH : SITUP_H, tx, ty, F.bunkers);
          if(r.vis) best = Math.max(best, getAcc(r.dist));
          else if(r.arc) best = Math.max(best, getAcc(r.dist)*0.45);
        }
        if (isSideways) safe[idx] = best; else risky[idx] = best;
      } else {
        const edges = srcB ? edgePos(srcB, tx, ty) : [{x:srcX,y:srcY}];
        let bestS=0, bestR=0;
        for (const e of edges) {
          const r = checkLOS(e.x, e.y, barrelH, tx, ty, F.bunkers);
          if(r.vis) bestS = Math.max(bestS, getAcc(r.dist));
          else if(r.arc) bestR = Math.max(bestR, getAcc(r.dist)*0.45);
        }
        safe[idx] = bestS;
        if(bestS < 0.01) risky[idx] = bestR;
      }
      if(idx%step===0) self.postMessage({type:'PROGRESS',payload:{phase:'vis',pct:Math.round(idx/n*100)}});
    }
  }
  self.postMessage({type:'VIS_RESULT', payload:{bunkerId, cols:F.cols, rows:F.rows, isSnake,
    safe: Array.from(safe), risky: Array.from(risky)}});
}

// ═══ ANALYZE_PATH (unchanged from v2) ═══
function analyzePath(P) {
  if(!F) return self.postMessage({type:'ERROR',payload:{message:'No field'}});
  const {pathId, waypoints, speed=6.5, shooters=[]} = P;
  const wp = waypoints.map(p=>({x:p.x*F.w, y:p.y*F.h}));
  const segs=[]; let totalT=0;
  for(let i=0;i<wp.length-1;i++){
    const from=wp[i],to=wp[i+1];
    const dx=to.x-from.x,dy=to.y-from.y,d=Math.sqrt(dx*dx+dy*dy);
    const dur=d/speed, samples=Math.max(1,Math.ceil(dur/.1));
    for(let s=0;s<samples;s++){
      const t=s/samples, px=from.x+dx*t, py=from.y+dy*t;
      let maxT=0,nT=0;
      for(const sp of shooters){
        const r=checkLOS(sp.x*F.w,sp.y*F.h,sp.bh||1.3,px,py,F.bunkers);
        if(r.vis){const a=getAcc(r.dist);if(a>maxT)maxT=a;nT++}
        else if(r.arc){const a=getAcc(r.dist)*.45;if(a>maxT)maxT=a;nT++}
      }
      segs.push({time:totalT+dur*t,x:px/F.w,y:py/F.h,threat:maxT,n:nT});
    }
    totalT+=dur;
  }
  let surv=1;
  for(const s of segs){if(s.threat>0)surv*=(1-Math.min(1,1-Math.pow(1-s.threat,.8)))}
  self.postMessage({type:'PATH_RESULT',payload:{pathId,totalT,surv,elim:1-surv,segs}});
}

// ═══ ANALYZE_COUNTER (NEW v3) ═══
function analyzeCounter(P) {
  if(!F) return self.postMessage({type:'ERROR',payload:{message:'No field'}});

  const {enemyPath, enemySpeed=6.5, myBase, mySpeed=6.5, rof=8} = P;
  const SAMPLE_DT = 0.05; // sample every 50ms

  // Convert enemy path to meters and build timed samples
  const wpMeters = enemyPath.map(p => ({x: p.x * F.w, y: p.y * F.h}));
  const {samples: eSamples, totalTime: eTotalTime} = buildPathSamples(wpMeters, enemySpeed, SAMPLE_DT);

  const myBaseM = { x: myBase.x * F.w, y: myBase.y * F.h };

  // ── PHASE A: Bump Heatmap ──
  // For each grid cell: P(hit) if I stand there from T=0 with barrel aimed
  self.postMessage({type:'PROGRESS',payload:{phase:'counter-bump',pct:0}});

  const n = F.cols * F.rows;
  const bumpGrid = new Float32Array(n);
  const bumpStep = Math.max(1, Math.floor(n / 10));

  for (let gy = 0; gy < F.rows; gy++) {
    for (let gx = 0; gx < F.cols; gx++) {
      const idx = gy * F.cols + gx;
      const sx = (gx + 0.5) * F.cw;
      const sy = (gy + 0.5) * F.ch;

      // Skip if inside a bunker (can't stand in open there)
      if (insideBunker(sx, sy, F.bunkers)) continue;

      // Compute P(hit) across all enemy path samples
      let pSurvive = 1.0;
      for (const es of eSamples) {
        const r = checkLOS(sx, sy, 1.55, es.x, es.y, F.bunkers); // standing
        if (!r.vis && !r.arc) continue;
        const acc = r.vis ? getAcc(r.dist) : getAcc(r.dist) * 0.45;
        const pHitInterval = 1 - Math.pow(1 - acc, rof * SAMPLE_DT);
        pSurvive *= (1 - pHitInterval);
      }
      bumpGrid[idx] = 1 - pSurvive;

      if (idx % bumpStep === 0)
        self.postMessage({type:'PROGRESS',payload:{phase:'counter-bump',pct:Math.round(idx/n*100)}});
    }
  }

  // ── PHASE B: Bunker Counter Positions ──
  self.postMessage({type:'PROGRESS',payload:{phase:'counter-bunkers',pct:0}});

  const counters = [];

  for (let bi = 0; bi < F.bunkers.length; bi++) {
    const B = F.bunkers[bi];
    const distToB = Math.sqrt((myBaseM.x - B.x)**2 + (myBaseM.y - B.y)**2);
    const arrivalTime = distToB / mySpeed;

    const st = STANCE[B.type] || 'kneeling';
    const barrelH = BARREL_H[st] || 1.15;

    // For each path sample, find best shooting edge
    // We track windows: contiguous time intervals where I can see the enemy

    // Try each shooting edge
    let bestSafe = null, bestRisky = null;

    // Use center of enemy path as edge-computation target
    const midSample = eSamples[Math.floor(eSamples.length / 2)];
    const edges = edgePos(B, midSample.x, midSample.y);

    for (const E of edges) {
      // Determine which side this edge represents
      const edgeDx = E.x - B.x, edgeDy = E.y - B.y;
      const side = Math.abs(edgeDy) > Math.abs(edgeDx)
        ? (edgeDy > 0 ? 'bottom' : 'top')
        : (edgeDx > 0 ? 'right' : 'left');

      // Scan enemy path for safe and risky windows
      let safeStart = null, safeEnd = null, safeSumAcc = 0, safeSamples = 0;
      let riskyStart = null, riskyEnd = null, riskySumAcc = 0, riskySamples = 0;
      let safeLaneEnd = null, riskyLaneEnd = null;

      for (const es of eSamples) {
        const r = checkLOS(E.x, E.y, barrelH, es.x, es.y, F.bunkers);

        if (r.vis) {
          if (safeStart === null) safeStart = es.t;
          safeEnd = es.t;
          safeSumAcc += getAcc(r.dist);
          safeSamples++;
          safeLaneEnd = { x: es.x / F.w, y: es.y / F.h };
        } else if (r.arc) {
          if (riskyStart === null) riskyStart = es.t;
          riskyEnd = es.t;
          riskySumAcc += getAcc(r.dist) * 0.45;
          riskySamples++;
          riskyLaneEnd = { x: es.x / F.w, y: es.y / F.h };
        }
      }

      // Process safe window
      if (safeSamples > 0) {
        const duration = safeEnd - safeStart;
        const avgAcc = safeSumAcc / safeSamples;
        // Effective window: I can only shoot after I arrive
        const effStart = Math.max(safeStart, arrivalTime);
        const effDuration = Math.max(0, safeEnd - effStart);
        const pHit = effDuration > 0 ? 1 - Math.pow(1 - avgAcc, rof * effDuration) : 0;

        if (!bestSafe || pHit > bestSafe.pHit) {
          bestSafe = {
            startT: safeStart, endT: safeEnd, duration,
            pHit, avgDistance: safeSumAcc > 0 ? safeSumAcc / safeSamples / getAcc(1) : 0,
            shootingSide: side,
            laneStart: { x: E.x / F.w, y: E.y / F.h },
            laneEnd: safeLaneEnd,
          };
        }
      }

      // Process risky window
      if (riskySamples > 0) {
        const duration = riskyEnd - riskyStart;
        const avgAcc = riskySumAcc / riskySamples;
        const effStart = Math.max(riskyStart, arrivalTime);
        const effDuration = Math.max(0, riskyEnd - effStart);
        const pHit = effDuration > 0 ? 1 - Math.pow(1 - avgAcc, rof * effDuration) : 0;

        if (!bestRisky || pHit > bestRisky.pHit) {
          bestRisky = {
            startT: riskyStart, endT: riskyEnd, duration,
            pHit, avgDistance: 0,
            shootingSide: side,
            laneStart: { x: E.x / F.w, y: E.y / F.h },
            laneEnd: riskyLaneEnd,
          };
        }
      }
    }

    // Skip bunkers with zero shooting opportunity
    if (!bestSafe && !bestRisky) continue;

    const canIntercept = bestSafe
      ? arrivalTime < bestSafe.endT
      : (bestRisky ? arrivalTime < bestRisky.endT : false);

    // Score: safe shots worth 2×, risky 0.5×. Penalty if late.
    const score = (bestSafe?.pHit || 0) * 2
                + (bestRisky?.pHit || 0) * 0.5
                - (canIntercept ? 0 : 0.3);

    counters.push({
      bunkerId: B.id, bunkerName: B.name,
      arrivalTime: Math.round(arrivalTime * 10) / 10,
      safe: bestSafe, risky: bestRisky,
      canIntercept, score,
    });

    self.postMessage({type:'PROGRESS',payload:{
      phase:'counter-bunkers', pct: Math.round((bi+1) / F.bunkers.length * 100)
    }});
  }

  // Sort by score, take top 8
  counters.sort((a, b) => b.score - a.score);

  self.postMessage({
    type: 'COUNTER_RESULT',
    payload: {
      bumpGrid: Array.from(bumpGrid),
      bumpCols: F.cols, bumpRows: F.rows,
      counters: counters.slice(0, 8),
      enemyTotalTime: Math.round(eTotalTime * 10) / 10,
    },
  });
}
