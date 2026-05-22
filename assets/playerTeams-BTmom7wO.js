function e(t){return t?Array.isArray(t.teams)&&t.teams.length>0?t.teams:t.teamId?[t.teamId]:[]:[]}function r(t,n){return!!n&&e(t).includes(n)}export{e as a,r as p};
