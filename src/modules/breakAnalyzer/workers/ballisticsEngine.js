// ─── BreakAnalyzer Web Worker ───
// Self-contained: all physics, raycasting, and constants inline.
// No imports — required for Vite worker bundling.

// ═══ CONSTANTS ═══
const DRAG_K = (0.5 * 0.47 * 1.225 * Math.PI * 0.00865 * 0.00865) / 0.0032;
const G = 9.81;
const DT = 0.001;
const MV = 85; // muzzle velocity m/s
const ARC_ANGLES = [0, 3, 5, 8, 10, 13, 15];
const ARC_MARGIN = 0.20;

const ACC = [[5,.95],[10,.85],[15,.70],[20,.50],[25,.35],[30,.20],[35,.12],[40,.06],[50,.02]];
function getAcc(d) {
  if (d <= 0) return 1; const t = ACC;
  if (d >= t[t.length-1][0]) return t[t.length-1][1];
  for (let i = 0; i < t.length-1; i++) {
    if (d >= t[i][0] && d < t[i+1][0]) {
      const f = (d - t[i][0]) / (t[i+1][0] - t[i][0]);
      return t[i][1] + (t[i+1][1] - t[i][1]) * f;
    }
  }
  return t[0][1];
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

// ═══ TRAJECTORY ═══
function ballH(dist, barrelH, elevDeg) {
  const r = elevDeg * Math.PI / 180;
  let vx = MV * Math.cos(r), vy = MV * Math.sin(r), x = 0, y = barrelH;
  for (let s = 0; s < 10000 && x < dist; s++) {
    const v = Math.sqrt(vx*vx + vy*vy);
    const d = DRAG_K * v * v;
    vx += -(vx/v)*d * DT; vy += (-(vy/v)*d - G) * DT;
    x += vx * DT; y += vy * DT;
    if (y < 0) return -1;
  }
  return y;
}

function flightTime(dist, barrelH, elevDeg) {
  const r = elevDeg * Math.PI / 180;
  let vx = MV * Math.cos(r), vy = MV * Math.sin(r), x = 0, y = barrelH, s = 0;
  while (x < dist && s < 10000) {
    const v = Math.sqrt(vx*vx + vy*vy);
    const d = DRAG_K * v * v;
    vx += -(vx/v)*d * DT; vy += (-(vy/v)*d - G) * DT;
    x += vx * DT; y += vy * DT;
    if (y < 0) break; s++;
  }
  return s * DT;
}

// ═══ RAY-CASTING ═══
function rayRect(ax,ay,bx,by,cx,cy,hw,hd) {
  const dx=bx-ax,dy=by-ay,len=Math.sqrt(dx*dx+dy*dy);
  if(len<.001)return -1;
  let tmin=0,tmax=1;
  if(Math.abs(dx)<.0001){if(ax<cx-hw||ax>cx+hw)return -1}
  else{let t1=(cx-hw-ax)/dx,t2=(cx+hw-ax)/dx;if(t1>t2){const tmp=t1;t1=t2;t2=tmp}tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);if(tmin>tmax)return -1}
  if(Math.abs(dy)<.0001){if(ay<cy-hd||ay>cy+hd)return -1}
  else{let t1=(cy-hd-ay)/dy,t2=(cy+hd-ay)/dy;if(t1>t2){const tmp=t1;t1=t2;t2=tmp}tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);if(tmin>tmax)return -1}
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

function checkLOS(sx,sy,sh,tx,ty,bunkers,elev) {
  const dist=Math.sqrt((tx-sx)**2+(ty-sy)**2);
  if(dist<.3)return{vis:true,arc:false,dist};
  for(const b of bunkers){
    const ds=Math.sqrt((b.x-sx)**2+(b.y-sy)**2);
    const dt=Math.sqrt((b.x-tx)**2+(b.y-ty)**2);
    if(ds<.5||dt<.5)continue;
    const hw=b.w/2,hd=b.d/2;
    const hd2=b.shape==='circle'?rayCircle(sx,sy,tx,ty,b.x,b.y,hw):rayRect(sx,sy,tx,ty,b.x,b.y,hw,hd);
    if(hd2<0)continue;
    if(ballH(hd2,sh,elev)<=b.h+ARC_MARGIN)return checkArc(sx,sy,sh,tx,ty,dist,bunkers);
  }
  return{vis:true,arc:false,dist};
}

function checkArc(sx,sy,sh,tx,ty,dist,bunkers){
  for(const ang of ARC_ANGLES){
    if(ang===0)continue;
    let ok=true;
    for(const b of bunkers){
      const ds=Math.sqrt((b.x-sx)**2+(b.y-sy)**2);
      const dt2=Math.sqrt((b.x-tx)**2+(b.y-ty)**2);
      if(ds<.5||dt2<.5)continue;
      const hw=b.w/2,hd=b.d/2;
      const hd2=b.shape==='circle'?rayCircle(sx,sy,tx,ty,b.x,b.y,hw):rayRect(sx,sy,tx,ty,b.x,b.y,hw,hd);
      if(hd2<0)continue;
      if(ballH(hd2,sh,ang)<=b.h+ARC_MARGIN){ok=false;break}
    }
    if(ok){const arr=ballH(dist,sh,ang);if(arr>=0&&arr<=2.2)return{vis:false,arc:true,dist,ang}}
  }
  return{vis:false,arc:false,dist};
}

// ═══ STATE ═══
let F = null;

// ═══ HANDLER ═══
self.onmessage = function(e) {
  const {type, payload: P} = e.data;
  try {
    if (type==='INIT_FIELD') initField(P);
    else if (type==='QUERY_VIS') queryVis(P);
    else if (type==='ANALYZE_PATH') analyzePath(P);
    else self.postMessage({type:'ERROR',payload:{message:'Unknown: '+type}});
  } catch(err) {
    self.postMessage({type:'ERROR',payload:{message:err.message}});
  }
};

function initField(P) {
  const {fieldW, fieldH, bunkers, res=2} = P;
  F = {
    w: fieldW, h: fieldH,
    bunkers: bunkers.map(b => ({
      id:b.id, x:b.x*fieldW, y:b.y*fieldH,
      w: b.widthM || (SIZES[b.type]||{w:1.2}).w,
      d: b.depthM || (SIZES[b.type]||{d:1.2}).d,
      h: b.heightM || HEIGHTS[b.type] || 1.2,
      shape: b.shape||'rect', type: b.type,
    })),
    cols: Math.round(fieldW*res), rows: Math.round(fieldH*res),
    cw: fieldW/Math.round(fieldW*res), ch: fieldH/Math.round(fieldH*res),
  };
  self.postMessage({type:'FIELD_READY',payload:{cols:F.cols,rows:F.rows,bunkers:F.bunkers.length}});
}

function queryVis(P) {
  if(!F) return self.postMessage({type:'ERROR',payload:{message:'No field'}});
  const {bunkerId, pos, barrelH=1.3} = P;
  let sx,sy;
  if(bunkerId){const b=F.bunkers.find(b=>b.id===bunkerId);if(!b)return;sx=b.x;sy=b.y}
  else if(pos){sx=pos.x*F.w;sy=pos.y*F.h}
  else return;

  const n=F.cols*F.rows;
  const vis=new Float32Array(n), dist=new Float32Array(n), arc=new Uint8Array(n);
  const step=Math.max(1,Math.floor(n/20));

  for(let gy=0;gy<F.rows;gy++){
    for(let gx=0;gx<F.cols;gx++){
      const idx=gy*F.cols+gx;
      const tx=(gx+.5)*F.cw, ty=(gy+.5)*F.ch;
      const r=checkLOS(sx,sy,barrelH,tx,ty,F.bunkers,0);
      dist[idx]=r.dist;
      if(r.vis){vis[idx]=getAcc(r.dist)}
      else if(r.arc){vis[idx]=getAcc(r.dist)*.45;arc[idx]=1}
      if(idx%step===0)self.postMessage({type:'PROGRESS',payload:{phase:'vis',pct:Math.round(idx/n*100)}});
    }
  }
  self.postMessage({type:'VIS_RESULT',payload:{
    bunkerId,cols:F.cols,rows:F.rows,
    vis:Array.from(vis),dist:Array.from(dist),arc:Array.from(arc),
  }});
}

function analyzePath(P) {
  if(!F) return self.postMessage({type:'ERROR',payload:{message:'No field'}});
  const {pathId, waypoints, speed=6.5, shooters=[]} = P;
  const wp = waypoints.map(p=>({x:p.x*F.w, y:p.y*F.h}));
  const segs = [];
  let totalT = 0;

  for(let i=0;i<wp.length-1;i++){
    const from=wp[i],to=wp[i+1];
    const dx=to.x-from.x, dy=to.y-from.y, d=Math.sqrt(dx*dx+dy*dy);
    const dur=d/speed;
    const samples=Math.max(1,Math.ceil(dur/.1));
    for(let s=0;s<samples;s++){
      const t=s/samples;
      const px=from.x+dx*t, py=from.y+dy*t;
      let maxThreat=0, threatN=0;
      for(const sp of shooters){
        const spx=sp.x*F.w,spy=sp.y*F.h;
        const r=checkLOS(spx,spy,sp.bh||1.3,px,py,F.bunkers,0);
        if(r.vis){const a=getAcc(r.dist);if(a>maxThreat)maxThreat=a;threatN++}
        else if(r.arc){const a=getAcc(r.dist)*.45;if(a>maxThreat)maxThreat=a;threatN++}
      }
      segs.push({time:totalT+dur*t, x:px/F.w, y:py/F.h, threat:maxThreat, n:threatN});
    }
    totalT+=dur;
  }

  let surv=1;
  for(const s of segs){if(s.threat>0)surv*=(1-Math.min(1,1-Math.pow(1-s.threat,.8)))}

  self.postMessage({type:'PATH_RESULT',payload:{pathId,totalT,surv,elim:1-surv,segs}});
}
