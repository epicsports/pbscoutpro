// ─── BreakAnalyzer Web Worker v5 ───
// 3-channel visibility: safe | arc | exposed
// safe = direct LOS, behind cover (green→red)
// arc = lob over obstacle, still behind cover (orange) — accuracy ×0.45
// exposed = must show body to shoot (blue) — snake sit-up, over-top lean

const DRAG_K = (0.5 * 0.47 * 1.225 * Math.PI * 0.00865 * 0.00865) / 0.0032;
const G = 9.81, DT = 0.001, MV = 85;
const ARC_ANGLES = [0, 3, 5, 8, 10, 13, 15];
const ARC_MARGIN = 0.20;
const MIN_ARRIVAL_H = 0.20;
const EDGE_OFFSET = 0.15;

const ACC = [[5,.95],[10,.85],[15,.70],[20,.50],[25,.35],[30,.20],[35,.12],[40,.06],[50,.02]];
function getAcc(d) {
  if (d<=0) return 1;
  if (d>=ACC[ACC.length-1][0]) return ACC[ACC.length-1][1];
  for (let i=0;i<ACC.length-1;i++) {
    if (d>=ACC[i][0]&&d<ACC[i+1][0]) {
      const f=(d-ACC[i][0])/(ACC[i+1][0]-ACC[i][0]);
      return ACC[i][1]+(ACC[i+1][1]-ACC[i][1])*f;
    }
  }
  return ACC[0][1];
}

const HEIGHTS = {
  SB:.76,SD:.85,MD:1,Tr:.9,C:1.2,Br:1.15,GB:1.5,MW:1.2,Wg:1.4,GW:1.7,
  Ck:1,TCK:1.6,T:1.5,MT:1.8,GP:1.5,
  R:.9,GD:1.3,Az:1.4,Pn:1.5,Mn:1.8,
  Snake:.76,Beam:.76,Dorito:1,Can:1.1,Rollie:.9,Brick:1.15,
  'Small Cake':1,'Tall Cake':1.6,Temple:1.5,Maya:1.5,Wing:1.4,
  Dollhouse:1.3,Carwash:1.4,'X-Bunker':1.5,Tower:2.1,Inne:1.2,
};
const SIZES = {
  SB:{w:3,d:.76},SD:{w:1,d:1.2},MD:{w:1.2,d:1.8},Tr:{w:.6,d:.6},C:{w:.9,d:.9},
  Br:{w:1.5,d:.9},GB:{w:3,d:1.5},MW:{w:1.5,d:.8},Wg:{w:2,d:1},GW:{w:2.4,d:1.5},
  Ck:{w:1.5,d:1.5},TCK:{w:1.5,d:1.5},T:{w:1.8,d:1.5},MT:{w:2.5,d:2},GP:{w:2.5,d:2.5},
  R:{w:.9,d:.9},GD:{w:1.5,d:2.2},Az:{w:1.5,d:1.5},Pn:{w:.5,d:.5},Mn:{w:2,d:.6},
  Snake:{w:3,d:.76},Beam:{w:3,d:.76},Dorito:{w:1.2,d:1.8},Can:{w:1,d:1},
  Rollie:{w:.9,d:.9},Brick:{w:1.5,d:.9},'Small Cake':{w:1.5,d:1.5},
  'Tall Cake':{w:1.5,d:1.5},Temple:{w:1.8,d:1.5},Maya:{w:1.8,d:1.5},
  Wing:{w:2.4,d:1.5},Dollhouse:{w:1.5,d:1.5},Carwash:{w:2,d:1.2},
  'X-Bunker':{w:1.5,d:1.5},Tower:{w:1.8,d:1.8},Inne:{w:1.2,d:1.2},
};
const STANCE={SB:'prone',SD:'kneeling',MD:'kneeling',Tr:'kneeling',C:'kneeling',
  Br:'kneeling',GB:'standing',MW:'kneeling',Wg:'kneeling',GW:'standing',
  Ck:'kneeling',TCK:'standing',T:'standing',MT:'standing',GP:'standing',
  R:'kneeling',GD:'kneeling',Az:'standing',Pn:'standing',Mn:'standing',
  Snake:'prone',Beam:'prone',Dorito:'kneeling',Can:'kneeling'};
const BARREL_H={prone:.45,kneeling:1.15,standing:1.55};
const SITUP_H=0.95;

// ═══ TRAJECTORY ═══
function ballH(dist,bH,elev){
  const r=elev*Math.PI/180;
  let vx=MV*Math.cos(r),vy=MV*Math.sin(r),x=0,y=bH;
  for(let s=0;s<12000&&x<dist;s++){
    const v=Math.sqrt(vx*vx+vy*vy);if(v<1)return y;
    const d=DRAG_K*v*v;
    vx+=-(vx/v)*d*DT;vy+=(-(vy/v)*d-G)*DT;
    x+=vx*DT;y+=vy*DT;if(y<-0.5)return -1;
  }
  return y;
}

// ═══ RAY-CASTING ═══
function rayRect(ax,ay,bx,by,cx,cy,hw,hd){
  const dx=bx-ax,dy=by-ay,len=Math.sqrt(dx*dx+dy*dy);
  if(len<.001)return -1;
  let tmin=0,tmax=1;
  if(Math.abs(dx)<.0001){if(ax<cx-hw||ax>cx+hw)return -1}
  else{let t1=(cx-hw-ax)/dx,t2=(cx+hw-ax)/dx;if(t1>t2)[t1,t2]=[t2,t1];tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);if(tmin>tmax)return -1}
  if(Math.abs(dy)<.0001){if(ay<cy-hd||ay>cy+hd)return -1}
  else{let t1=(cy-hd-ay)/dy,t2=(cy+hd-ay)/dy;if(t1>t2)[t1,t2]=[t2,t1];tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);if(tmin>tmax)return -1}
  return tmin*len;
}
function rayCircle(ax,ay,bx,by,cx,cy,r){
  const dx=bx-ax,dy=by-ay,fx=ax-cx,fy=ay-cy;
  const a=dx*dx+dy*dy,b2=2*(fx*dx+fy*dy),c=fx*fx+fy*fy-r*r;
  let disc=b2*b2-4*a*c;if(disc<0)return -1;disc=Math.sqrt(disc);
  const t1=(-b2-disc)/(2*a),t2=(-b2+disc)/(2*a);
  const eps=0.001;
  const t=t1>eps&&t1<=1?t1:(t2>eps&&t2<=1?t2:-1);
  return t>=0?t*Math.sqrt(a):-1;
}

function insideBunker(px,py,bunkers){
  for(const b of bunkers){
    const hw=b.w/2,hd=b.d/2;
    if(b.shape==='circle'){if(Math.sqrt((px-b.x)**2+(py-b.y)**2)<hw)return b}
    else{if(px>b.x-hw&&px<b.x+hw&&py>b.y-hd&&py<b.y+hd)return b}
  }
  return null;
}

function shotClear(sx,sy,sh,tx,ty,bunkers,elev){
  for(const b of bunkers){
    const hw=b.w/2,hd=b.d/2;
    const hitD=b.shape==='circle'
      ?rayCircle(sx,sy,tx,ty,b.x,b.y,hw)
      :rayRect(sx,sy,tx,ty,b.x,b.y,hw,hd);
    if(hitD<0)continue;
    if(hitD<0.05)continue;
    const bh=ballH(hitD,sh,elev);
    if(bh>=0&&bh<=b.h+ARC_MARGIN)return false;
  }
  return true;
}

// Returns { vis:bool, arc:bool, dist }
// vis = direct flat shot clears everything
// arc = flat blocked, but angled shot works
function checkLOS(sx,sy,sh,tx,ty,bunkers){
  const dist=Math.sqrt((tx-sx)**2+(ty-sy)**2);
  if(dist<0.2)return{vis:true,arc:false,dist};
  if(dist>45)return{vis:false,arc:false,dist};
  if(shotClear(sx,sy,sh,tx,ty,bunkers,0)){
    const arrH=ballH(dist,sh,0);
    if(arrH>=MIN_ARRIVAL_H)return{vis:true,arc:false,dist};
  }
  for(const ang of ARC_ANGLES){
    if(ang===0)continue;
    if(shotClear(sx,sy,sh,tx,ty,bunkers,ang)){
      const arrH=ballH(dist,sh,ang);
      if(arrH>=MIN_ARRIVAL_H&&arrH<=2.2)return{vis:false,arc:true,dist};
    }
  }
  return{vis:false,arc:false,dist};
}

// ═══ SHOOTING POSITIONS ═══
// Each position: { x, y, covered: bool, barrelH: number }
// covered=true: body behind bunker (safe or arc channel)
// covered=false: body exposed (exposed channel)
function getShootingPositions(B){
  const hw=B.w/2, hd=B.d/2, off=EDGE_OFFSET;
  const stance=STANCE[B.type]||'kneeling';
  const bh=BARREL_H[stance]||1.15;

  if(stance==='prone'){
    // Snake: sideways=covered(prone), forward=exposed(sit-up)
    return [
      {x:B.x, y:B.y-hd-off, covered:true,  barrelH:BARREL_H.prone}, // side top
      {x:B.x, y:B.y+hd+off, covered:true,  barrelH:BARREL_H.prone}, // side bottom
      {x:B.x-hw-off, y:B.y, covered:false, barrelH:SITUP_H},        // front (sit-up)
      {x:B.x+hw+off, y:B.y, covered:false, barrelH:SITUP_H},        // back (sit-up)
    ];
  }

  const positions=[
    {x:B.x-hw-off, y:B.y,      covered:true, barrelH:bh}, // left
    {x:B.x+hw+off, y:B.y,      covered:true, barrelH:bh}, // right
    {x:B.x, y:B.y-hd-off,      covered:true, barrelH:bh}, // top
    {x:B.x, y:B.y+hd+off,      covered:true, barrelH:bh}, // bottom
  ];

  // Over-the-top: only for low bunkers, EXPOSED (must lean body above cover)
  if(B.h<1.50){
    positions.push({
      x:B.x, y:B.y,
      covered:false,
      barrelH:Math.max(B.h+0.30, 1.20),
    });
  }

  return positions;
}

// ═══ PATH HELPERS ═══
function buildPathSamples(waypoints,speed,dt){
  const samples=[];let totalT=0;
  for(let i=0;i<waypoints.length-1;i++){
    const ax=waypoints[i].x,ay=waypoints[i].y;
    const bx=waypoints[i+1].x,by=waypoints[i+1].y;
    const dx=bx-ax,dy=by-ay,segLen=Math.sqrt(dx*dx+dy*dy);
    const segTime=segLen/speed,nS=Math.max(1,Math.ceil(segTime/dt));
    for(let s=0;s<nS;s++){
      const f=s/nS;
      samples.push({x:ax+dx*f,y:ay+dy*f,t:totalT+segTime*f});
    }
    totalT+=segTime;
  }
  const last=waypoints[waypoints.length-1];
  samples.push({x:last.x,y:last.y,t:totalT});
  return{samples,totalTime:totalT};
}

// ═══ STATE ═══
let F=null;

self.onmessage=function(e){
  const{type,payload:P}=e.data;
  try{
    if(type==='INIT_FIELD')initField(P);
    else if(type==='QUERY_VIS')queryVis(P);
    else if(type==='ANALYZE_PATH')analyzePath(P);
    else if(type==='ANALYZE_COUNTER')analyzeCounter(P);
    else self.postMessage({type:'ERROR',payload:{message:'Unknown: '+type}});
  }catch(err){self.postMessage({type:'ERROR',payload:{message:err.message}})}
};

function initField(P){
  const{fieldW,fieldH,bunkers,res=4}=P;
  F={
    w:fieldW,h:fieldH,
    bunkers:bunkers.map(b=>({
      id:b.id, name:b.name||b.id, x:b.x*fieldW, y:b.y*fieldH,
      w:b.widthM||(SIZES[b.type]||{w:1.2}).w,
      d:b.depthM||(SIZES[b.type]||{d:1.2}).d,
      h:b.heightM||HEIGHTS[b.type]||1.2,
      shape:b.shape||'rect', type:b.type,
      nx:b.x, ny:b.y,
    })),
    cols:Math.round(fieldW*res),rows:Math.round(fieldH*res),
    cw:fieldW/Math.round(fieldW*res),ch:fieldH/Math.round(fieldH*res),
  };
  self.postMessage({type:'FIELD_READY',payload:{cols:F.cols,rows:F.rows,bunkers:F.bunkers.length}});
}

// ═══ 3-CHANNEL VISIBILITY ═══
function queryVis(P){
  if(!F)return self.postMessage({type:'ERROR',payload:{message:'No field'}});
  const{bunkerId,pos,stanceOverride}=P;

  let shootPositions, isSnake=false;

  if(bunkerId){
    const B=F.bunkers.find(b=>b.id===bunkerId);
    if(!B)return self.postMessage({type:'ERROR',payload:{message:'Bunker not found'}});

    if(stanceOverride){
      // User forced a stance — rebuild positions with that stance
      const bh=BARREL_H[stanceOverride]||1.55;
      const hw=B.w/2,hd=B.d/2,off=EDGE_OFFSET;
      if(stanceOverride==='prone'){
        isSnake=true;
        shootPositions=[
          {x:B.x,y:B.y-hd-off,covered:true,barrelH:BARREL_H.prone},
          {x:B.x,y:B.y+hd+off,covered:true,barrelH:BARREL_H.prone},
          {x:B.x-hw-off,y:B.y,covered:false,barrelH:SITUP_H},
          {x:B.x+hw+off,y:B.y,covered:false,barrelH:SITUP_H},
        ];
      } else {
        shootPositions=[
          {x:B.x-hw-off,y:B.y,covered:true,barrelH:bh},
          {x:B.x+hw+off,y:B.y,covered:true,barrelH:bh},
          {x:B.x,y:B.y-hd-off,covered:true,barrelH:bh},
          {x:B.x,y:B.y+hd+off,covered:true,barrelH:bh},
        ];
        if(B.h<1.50) shootPositions.push({x:B.x,y:B.y,covered:false,barrelH:Math.max(B.h+0.30,1.20)});
      }
    } else {
      shootPositions=getShootingPositions(B);
      isSnake=(STANCE[B.type]||'kneeling')==='prone';
    }
  } else if(pos){
    let fx=pos.x*F.w,fy=pos.y*F.h;
    const inside=insideBunker(fx,fy,F.bunkers);
    if(inside){
      const dx=fx-inside.x,dy=fy-inside.y;
      const len=Math.sqrt(dx*dx+dy*dy)||0.01;
      fx=inside.x+dx/len*(Math.max(inside.w,inside.d)/2+EDGE_OFFSET);
      fy=inside.y+dy/len*(Math.max(inside.w,inside.d)/2+EDGE_OFFSET);
    }
    // Free point = standing in open. All shots are "covered=true" for channel purposes
    // because there's no bunker to be "exposed from" — you're already fully visible.
    // We use safe/arc channels for accuracy, the exposure is inherent to being in the open.
    shootPositions=[{x:fx,y:fy,covered:true,barrelH:BARREL_H[stanceOverride||'standing']||1.55}];
  } else return;

  const n=F.cols*F.rows;
  const safe=new Float32Array(n);    // direct LOS, behind cover (or free point direct)
  const arc=new Float32Array(n);     // lob over obstacle, behind cover (or free point lob)
  const exposed=new Float32Array(n); // must expose body (sit-up, over-top lean)
  const step=Math.max(1,Math.floor(n/20));

  for(let gy=0;gy<F.rows;gy++){
    for(let gx=0;gx<F.cols;gx++){
      const idx=gy*F.cols+gx;
      const tx=(gx+.5)*F.cw, ty=(gy+.5)*F.ch;

      let bestSafe=0, bestArc=0, bestExposed=0;

      for(const sp of shootPositions){
        const r=checkLOS(sp.x,sp.y,sp.barrelH,tx,ty,F.bunkers);

        if(sp.covered){
          // Behind cover — direct=safe, arc=arc(orange)
          if(r.vis)      bestSafe=Math.max(bestSafe, getAcc(r.dist));
          else if(r.arc) bestArc=Math.max(bestArc, getAcc(r.dist)*0.45);
        } else {
          // Body exposed — direct or arc, all goes to exposed channel
          if(r.vis)      bestExposed=Math.max(bestExposed, getAcc(r.dist));
          else if(r.arc) bestExposed=Math.max(bestExposed, getAcc(r.dist)*0.45);
        }
      }

      // Priority: safe > arc > exposed (show best available)
      safe[idx]=bestSafe;
      arc[idx]=bestSafe<0.01 ? bestArc : 0;
      exposed[idx]=(bestSafe<0.01 && bestArc<0.01) ? bestExposed : 0;

      if(idx%step===0)
        self.postMessage({type:'PROGRESS',payload:{phase:'vis',pct:Math.round(idx/n*100)}});
    }
  }

  const usedStance=stanceOverride||(isSnake?'prone':(STANCE[F.bunkers.find(b=>b.id===bunkerId)?.type]||'standing'));

  self.postMessage({type:'VIS_RESULT',payload:{
    bunkerId, cols:F.cols, rows:F.rows, isSnake,
    stance:usedStance, barrelH:BARREL_H[usedStance]||1.55,
    safe:Array.from(safe), arc:Array.from(arc), exposed:Array.from(exposed),
  }});
}

// ═══ ANALYZE_PATH ═══
function analyzePath(P){
  if(!F)return self.postMessage({type:'ERROR',payload:{message:'No field'}});
  const{pathId,waypoints,speed=6.5,shooters=[]}=P;
  const wp=waypoints.map(p=>({x:p.x*F.w,y:p.y*F.h}));
  const segs=[];let totalT=0;
  for(let i=0;i<wp.length-1;i++){
    const from=wp[i],to=wp[i+1];
    const dx=to.x-from.x,dy=to.y-from.y,d=Math.sqrt(dx*dx+dy*dy);
    const dur=d/speed,samples=Math.max(1,Math.ceil(dur/.1));
    for(let s=0;s<samples;s++){
      const t=s/samples,px=from.x+dx*t,py=from.y+dy*t;
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

// ═══ COUNTER ANALYSIS (3-channel scoring) ═══
function analyzeCounter(P){
  if(!F)return self.postMessage({type:'ERROR',payload:{message:'No field'}});
  const{enemyPath,enemySpeed=6.5,myBase,mySpeed=6.5,rof=8}=P;
  const SAMPLE_DT=0.05;
  const wpM=enemyPath.map(p=>({x:p.x*F.w,y:p.y*F.h}));
  const{samples:eS,totalTime:eTT}=buildPathSamples(wpM,enemySpeed,SAMPLE_DT);
  const myBaseM={x:myBase.x*F.w,y:myBase.y*F.h};

  // ── Bump heatmap (standing in open = everything is direct/arc, no "exposed" concept) ──
  self.postMessage({type:'PROGRESS',payload:{phase:'counter-bump',pct:0}});
  const n=F.cols*F.rows;
  const bumpGrid=new Float32Array(n);
  const bStep=Math.max(1,Math.floor(n/10));

  for(let gy=0;gy<F.rows;gy++){
    for(let gx=0;gx<F.cols;gx++){
      const idx=gy*F.cols+gx;
      const sx=(gx+.5)*F.cw,sy=(gy+.5)*F.ch;
      if(insideBunker(sx,sy,F.bunkers))continue;
      let pSurv=1;
      for(const es of eS){
        const r=checkLOS(sx,sy,1.55,es.x,es.y,F.bunkers);
        if(!r.vis&&!r.arc)continue;
        const acc=r.vis?getAcc(r.dist):getAcc(r.dist)*0.45;
        pSurv*=(1-(1-Math.pow(1-acc,rof*SAMPLE_DT)));
      }
      bumpGrid[idx]=1-pSurv;
      if(idx%bStep===0)self.postMessage({type:'PROGRESS',payload:{phase:'counter-bump',pct:Math.round(idx/n*100)}});
    }
  }

  // ── Bunker counters (3-channel scoring) ──
  self.postMessage({type:'PROGRESS',payload:{phase:'counter-bunkers',pct:0}});
  const counters=[];

  for(let bi=0;bi<F.bunkers.length;bi++){
    const B=F.bunkers[bi];
    const distToB=Math.sqrt((myBaseM.x-B.x)**2+(myBaseM.y-B.y)**2);
    const arrivalTime=distToB/mySpeed;
    const positions=getShootingPositions(B);

    let bestSafe=null, bestArc=null, bestExposed=null;

    for(const sp of positions){
      let wStart=null,wEnd=null,sumAcc=0,cnt=0,laneEnd=null;
      let channel=null; // will be determined by first hit

      for(const es of eS){
        const r=checkLOS(sp.x,sp.y,sp.barrelH,es.x,es.y,F.bunkers);
        let acc=0, ch=null;

        if(r.vis && sp.covered)      { acc=getAcc(r.dist);      ch='safe'; }
        else if(r.arc && sp.covered) { acc=getAcc(r.dist)*0.45; ch='arc'; }
        else if(r.vis && !sp.covered){ acc=getAcc(r.dist);      ch='exposed'; }
        else if(r.arc && !sp.covered){ acc=getAcc(r.dist)*0.45; ch='exposed'; }

        if(acc>0){
          if(wStart===null){wStart=es.t; channel=ch;}
          wEnd=es.t; sumAcc+=acc; cnt++;
          laneEnd={x:es.x/F.w,y:es.y/F.h};
        }
      }

      if(cnt===0)continue;

      const duration=wEnd-wStart;
      const avgAcc=sumAcc/cnt;
      const effStart=Math.max(wStart,arrivalTime);
      const effDur=Math.max(0,wEnd-effStart);
      const pH=effDur>0 ? 1-Math.pow(1-avgAcc,rof*effDur) : 0;

      const edgeDx=sp.x-B.x,edgeDy=sp.y-B.y;
      const side=Math.abs(edgeDy)>Math.abs(edgeDx)?(edgeDy>0?'bottom':'top'):(edgeDx>0?'right':'left');

      const result={startT:wStart,endT:wEnd,duration,pHit:pH,
        shootingSide:side,laneStart:{x:sp.x/F.w,y:sp.y/F.h},laneEnd};

      if(channel==='safe'    && (!bestSafe    || pH>bestSafe.pHit))    bestSafe=result;
      if(channel==='arc'     && (!bestArc     || pH>bestArc.pHit))     bestArc=result;
      if(channel==='exposed' && (!bestExposed || pH>bestExposed.pHit)) bestExposed=result;
    }

    if(!bestSafe&&!bestArc&&!bestExposed)continue;

    const best=bestSafe||bestArc||bestExposed;
    const canInt=arrivalTime<best.endT;

    // 3-channel scoring: safe ×2.0, arc ×1.2, exposed ×0.3
    const score=(bestSafe?.pHit||0)*2.0
               +(bestArc?.pHit||0)*1.2
               +(bestExposed?.pHit||0)*0.3
               -(canInt?0:0.3);

    counters.push({
      bunkerId:B.id, bunkerName:B.name,
      arrivalTime:Math.round(arrivalTime*10)/10,
      safe:bestSafe, arc:bestArc, exposed:bestExposed,
      canIntercept:canInt, score,
    });

    self.postMessage({type:'PROGRESS',payload:{phase:'counter-bunkers',pct:Math.round((bi+1)/F.bunkers.length*100)}});
  }

  counters.sort((a,b)=>b.score-a.score);
  self.postMessage({type:'COUNTER_RESULT',payload:{
    bumpGrid:Array.from(bumpGrid),bumpCols:F.cols,bumpRows:F.rows,
    counters:counters.slice(0,8),enemyTotalTime:Math.round(eTT*10)/10,
  }});
}
