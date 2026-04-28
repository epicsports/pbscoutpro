import{r as c}from"./vendor-react-yIF0F9t9.js";/**
 * @remix-run/router v1.23.2
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */function N(){return N=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e},N.apply(this,arguments)}var E;(function(e){e.Pop="POP",e.Push="PUSH",e.Replace="REPLACE"})(E||(E={}));const Z="popstate";function en(e){e===void 0&&(e={});function t(a,o){let{pathname:i="/",search:l="",hash:s=""}=_(a.location.hash.substr(1));return!i.startsWith("/")&&!i.startsWith(".")&&(i="/"+i),z("",{pathname:i,search:l,hash:s},o.state&&o.state.usr||null,o.state&&o.state.key||"default")}function n(a,o){let i=a.document.querySelector("base"),l="";if(i&&i.getAttribute("href")){let s=a.location.href,u=s.indexOf("#");l=u===-1?s:s.slice(0,u)}return l+"#"+(typeof o=="string"?o:ae(o))}function r(a,o){R(a.pathname.charAt(0)==="/","relative pathnames are not supported in hash history.push("+JSON.stringify(o)+")")}return ke(t,n,r,e)}function v(e,t){if(e===!1||e===null||typeof e>"u")throw new Error(t)}function R(e,t){if(!e){typeof console<"u"&&console.warn(t);try{throw new Error(t)}catch{}}}function xe(){return Math.random().toString(36).substr(2,8)}function K(e,t){return{usr:e.state,key:e.key,idx:t}}function z(e,t,n,r){return n===void 0&&(n=null),N({pathname:typeof e=="string"?e:e.pathname,search:"",hash:""},typeof t=="string"?_(t):t,{state:n,key:t&&t.key||r||xe()})}function ae(e){let{pathname:t="/",search:n="",hash:r=""}=e;return n&&n!=="?"&&(t+=n.charAt(0)==="?"?n:"?"+n),r&&r!=="#"&&(t+=r.charAt(0)==="#"?r:"#"+r),t}function _(e){let t={};if(e){let n=e.indexOf("#");n>=0&&(t.hash=e.substr(n),e=e.substr(0,n));let r=e.indexOf("?");r>=0&&(t.search=e.substr(r),e=e.substr(0,r)),e&&(t.pathname=e)}return t}function ke(e,t,n,r){r===void 0&&(r={});let{window:a=document.defaultView,v5Compat:o=!1}=r,i=a.history,l=E.Pop,s=null,u=d();u==null&&(u=0,i.replaceState(N({},i.state,{idx:u}),""));function d(){return(i.state||{idx:null}).idx}function h(){l=E.Pop;let f=d(),k=f==null?null:f-u;u=f,s&&s({action:l,location:y.location,delta:k})}function m(f,k){l=E.Push;let C=z(y.location,f,k);n&&n(C,f),u=d()+1;let b=K(C,u),I=y.createHref(C);try{i.pushState(b,"",I)}catch(j){if(j instanceof DOMException&&j.name==="DataCloneError")throw j;a.location.assign(I)}o&&s&&s({action:l,location:y.location,delta:1})}function x(f,k){l=E.Replace;let C=z(y.location,f,k);n&&n(C,f),u=d();let b=K(C,u),I=y.createHref(C);i.replaceState(b,"",I),o&&s&&s({action:l,location:y.location,delta:0})}function g(f){let k=a.location.origin!=="null"?a.location.origin:a.location.href,C=typeof f=="string"?f:ae(f);return C=C.replace(/ $/,"%20"),v(k,"No window.location.(origin|href) available to create URL for href: "+C),new URL(C,k)}let y={get action(){return l},get location(){return e(a,i)},listen(f){if(s)throw new Error("A history only accepts one active listener");return a.addEventListener(Z,h),s=f,()=>{a.removeEventListener(Z,h),s=null}},createHref(f){return t(a,f)},createURL:g,encodeLocation(f){let k=g(f);return{pathname:k.pathname,search:k.search,hash:k.hash}},push:m,replace:x,go(f){return i.go(f)}};return y}var G;(function(e){e.data="data",e.deferred="deferred",e.redirect="redirect",e.error="error"})(G||(G={}));function Ce(e,t,n){return n===void 0&&(n="/"),be(e,t,n)}function be(e,t,n,r){let a=typeof t=="string"?_(t):t,o=se(a.pathname||"/",n);if(o==null)return null;let i=oe(e);Ee(i);let l=null;for(let s=0;l==null&&s<i.length;++s){let u=je(o);l=Ie(i[s],u)}return l}function oe(e,t,n,r){t===void 0&&(t=[]),n===void 0&&(n=[]),r===void 0&&(r="");let a=(o,i,l)=>{let s={relativePath:l===void 0?o.path||"":l,caseSensitive:o.caseSensitive===!0,childrenIndex:i,route:o};s.relativePath.startsWith("/")&&(v(s.relativePath.startsWith(r),'Absolute route path "'+s.relativePath+'" nested under path '+('"'+r+'" is not valid. An absolute child route path ')+"must start with the combined path of all its parent routes."),s.relativePath=s.relativePath.slice(r.length));let u=P([r,s.relativePath]),d=n.concat(s);o.children&&o.children.length>0&&(v(o.index!==!0,"Index routes must not have child routes. Please remove "+('all child routes from route path "'+u+'".')),oe(o.children,t,d,u)),!(o.path==null&&!o.index)&&t.push({path:u,score:Le(u,o.index),routesMeta:d})};return e.forEach((o,i)=>{var l;if(o.path===""||!((l=o.path)!=null&&l.includes("?")))a(o,i);else for(let s of ie(o.path))a(o,i,s)}),t}function ie(e){let t=e.split("/");if(t.length===0)return[];let[n,...r]=t,a=n.endsWith("?"),o=n.replace(/\?$/,"");if(r.length===0)return a?[o,""]:[o];let i=ie(r.join("/")),l=[];return l.push(...i.map(s=>s===""?o:[o,s].join("/"))),a&&l.push(...i),l.map(s=>e.startsWith("/")&&s===""?"/":s)}function Ee(e){e.sort((t,n)=>t.score!==n.score?n.score-t.score:$e(t.routesMeta.map(r=>r.childrenIndex),n.routesMeta.map(r=>r.childrenIndex)))}const we=/^:[\w-]+$/,Me=3,Pe=2,_e=1,Ne=10,Se=-2,X=e=>e==="*";function Le(e,t){let n=e.split("/"),r=n.length;return n.some(X)&&(r+=Se),t&&(r+=Pe),n.filter(a=>!X(a)).reduce((a,o)=>a+(we.test(o)?Me:o===""?_e:Ne),r)}function $e(e,t){return e.length===t.length&&e.slice(0,-1).every((r,a)=>r===t[a])?e[e.length-1]-t[t.length-1]:0}function Ie(e,t,n){let{routesMeta:r}=e,a={},o="/",i=[];for(let l=0;l<r.length;++l){let s=r[l],u=l===r.length-1,d=o==="/"?t:t.slice(o.length)||"/",h=Re({path:s.relativePath,caseSensitive:s.caseSensitive,end:u},d),m=s.route;if(!h)return null;Object.assign(a,h.params),i.push({params:a,pathname:P([o,h.pathname]),pathnameBase:Ue(P([o,h.pathnameBase])),route:m}),h.pathnameBase!=="/"&&(o=P([o,h.pathnameBase]))}return i}function Re(e,t){typeof e=="string"&&(e={path:e,caseSensitive:!1,end:!0});let[n,r]=Be(e.path,e.caseSensitive,e.end),a=t.match(n);if(!a)return null;let o=a[0],i=o.replace(/(.)\/+$/,"$1"),l=a.slice(1);return{params:r.reduce((u,d,h)=>{let{paramName:m,isOptional:x}=d;if(m==="*"){let y=l[h]||"";i=o.slice(0,o.length-y.length).replace(/(.)\/+$/,"$1")}const g=l[h];return x&&!g?u[m]=void 0:u[m]=(g||"").replace(/%2F/g,"/"),u},{}),pathname:o,pathnameBase:i,pattern:e}}function Be(e,t,n){t===void 0&&(t=!1),n===void 0&&(n=!0),R(e==="*"||!e.endsWith("*")||e.endsWith("/*"),'Route path "'+e+'" will be treated as if it were '+('"'+e.replace(/\*$/,"/*")+'" because the `*` character must ')+"always follow a `/` in the pattern. To get rid of this warning, "+('please change the route path to "'+e.replace(/\*$/,"/*")+'".'));let r=[],a="^"+e.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(i,l,s)=>(r.push({paramName:l,isOptional:s!=null}),s?"/?([^\\/]+)?":"/([^\\/]+)"));return e.endsWith("*")?(r.push({paramName:"*"}),a+=e==="*"||e==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):n?a+="\\/*$":e!==""&&e!=="/"&&(a+="(?:(?=\\/|$))"),[new RegExp(a,t?void 0:"i"),r]}function je(e){try{return e.split("/").map(t=>decodeURIComponent(t).replace(/\//g,"%2F")).join("/")}catch(t){return R(!1,'The URL path "'+e+'" could not be decoded because it is is a malformed URL segment. This is probably due to a bad percent '+("encoding ("+t+").")),e}}function se(e,t){if(t==="/")return e;if(!e.toLowerCase().startsWith(t.toLowerCase()))return null;let n=t.endsWith("/")?t.length-1:t.length,r=e.charAt(n);return r&&r!=="/"?null:e.slice(n)||"/"}const Oe=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,De=e=>Oe.test(e);function Ae(e,t){t===void 0&&(t="/");let{pathname:n,search:r="",hash:a=""}=typeof e=="string"?_(e):e,o;if(n)if(De(n))o=n;else{if(n.includes("//")){let i=n;n=n.replace(/\/\/+/g,"/"),R(!1,"Pathnames cannot have embedded double slashes - normalizing "+(i+" -> "+n))}n.startsWith("/")?o=Q(n.substring(1),"/"):o=Q(n,t)}else o=t;return{pathname:o,search:ze(r),hash:Te(a)}}function Q(e,t){let n=t.replace(/\/+$/,"").split("/");return e.split("/").forEach(a=>{a===".."?n.length>1&&n.pop():a!=="."&&n.push(a)}),n.length>1?n.join("/"):"/"}function O(e,t,n,r){return"Cannot include a '"+e+"' character in a manually specified "+("`to."+t+"` field ["+JSON.stringify(r)+"].  Please separate it out to the ")+("`to."+n+"` field. Alternatively you may provide the full path as ")+'a string in <Link to="..."> and the router will parse it for you.'}function We(e){return e.filter((t,n)=>n===0||t.route.path&&t.route.path.length>0)}function le(e,t){let n=We(e);return t?n.map((r,a)=>a===n.length-1?r.pathname:r.pathnameBase):n.map(r=>r.pathnameBase)}function ce(e,t,n,r){r===void 0&&(r=!1);let a;typeof e=="string"?a=_(e):(a=N({},e),v(!a.pathname||!a.pathname.includes("?"),O("?","pathname","search",a)),v(!a.pathname||!a.pathname.includes("#"),O("#","pathname","hash",a)),v(!a.search||!a.search.includes("#"),O("#","search","hash",a)));let o=e===""||a.pathname==="",i=o?"/":a.pathname,l;if(i==null)l=n;else{let h=t.length-1;if(!r&&i.startsWith("..")){let m=i.split("/");for(;m[0]==="..";)m.shift(),h-=1;a.pathname=m.join("/")}l=h>=0?t[h]:"/"}let s=Ae(a,l),u=i&&i!=="/"&&i.endsWith("/"),d=(o||i===".")&&n.endsWith("/");return!s.pathname.endsWith("/")&&(u||d)&&(s.pathname+="/"),s}const P=e=>e.join("/").replace(/\/\/+/g,"/"),Ue=e=>e.replace(/\/+$/,"").replace(/^\/*/,"/"),ze=e=>!e||e==="?"?"":e.startsWith("?")?e:"?"+e,Te=e=>!e||e==="#"?"":e.startsWith("#")?e:"#"+e;function qe(e){return e!=null&&typeof e.status=="number"&&typeof e.statusText=="string"&&typeof e.internal=="boolean"&&"data"in e}const ue=["post","put","patch","delete"];new Set(ue);const Ve=["get",...ue];new Set(Ve);/**
 * React Router v6.30.3
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */function S(){return S=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e},S.apply(this,arguments)}const F=c.createContext(null),Fe=c.createContext(null),L=c.createContext(null),B=c.createContext(null),M=c.createContext({outlet:null,matches:[],isDataRoute:!1}),he=c.createContext(null);function $(){return c.useContext(B)!=null}function H(){return $()||v(!1),c.useContext(B).location}function de(e){c.useContext(L).static||c.useLayoutEffect(e)}function He(){let{isDataRoute:e}=c.useContext(M);return e?ot():Je()}function Je(){$()||v(!1);let e=c.useContext(F),{basename:t,future:n,navigator:r}=c.useContext(L),{matches:a}=c.useContext(M),{pathname:o}=H(),i=JSON.stringify(le(a,n.v7_relativeSplatPath)),l=c.useRef(!1);return de(()=>{l.current=!0}),c.useCallback(function(u,d){if(d===void 0&&(d={}),!l.current)return;if(typeof u=="number"){r.go(u);return}let h=ce(u,JSON.parse(i),o,d.relative==="path");e==null&&t!=="/"&&(h.pathname=h.pathname==="/"?t:P([t,h.pathname])),(d.replace?r.replace:r.push)(h,d.state,d)},[t,r,i,o,e])}function tn(){let{matches:e}=c.useContext(M),t=e[e.length-1];return t?t.params:{}}function Ze(e,t){return Ke(e,t)}function Ke(e,t,n,r){$()||v(!1);let{navigator:a}=c.useContext(L),{matches:o}=c.useContext(M),i=o[o.length-1],l=i?i.params:{};i&&i.pathname;let s=i?i.pathnameBase:"/";i&&i.route;let u=H(),d;if(t){var h;let f=typeof t=="string"?_(t):t;s==="/"||(h=f.pathname)!=null&&h.startsWith(s)||v(!1),d=f}else d=u;let m=d.pathname||"/",x=m;if(s!=="/"){let f=s.replace(/^\//,"").split("/");x="/"+m.replace(/^\//,"").split("/").slice(f.length).join("/")}let g=Ce(e,{pathname:x}),y=et(g&&g.map(f=>Object.assign({},f,{params:Object.assign({},l,f.params),pathname:P([s,a.encodeLocation?a.encodeLocation(f.pathname).pathname:f.pathname]),pathnameBase:f.pathnameBase==="/"?s:P([s,a.encodeLocation?a.encodeLocation(f.pathnameBase).pathname:f.pathnameBase])})),o,n,r);return t&&y?c.createElement(B.Provider,{value:{location:S({pathname:"/",search:"",hash:"",state:null,key:"default"},d),navigationType:E.Pop}},y):y}function Ge(){let e=at(),t=qe(e)?e.status+" "+e.statusText:e instanceof Error?e.message:JSON.stringify(e),n=e instanceof Error?e.stack:null,a={padding:"0.5rem",backgroundColor:"rgba(200,200,200, 0.5)"};return c.createElement(c.Fragment,null,c.createElement("h2",null,"Unexpected Application Error!"),c.createElement("h3",{style:{fontStyle:"italic"}},t),n?c.createElement("pre",{style:a},n):null,null)}const Xe=c.createElement(Ge,null);class Qe extends c.Component{constructor(t){super(t),this.state={location:t.location,revalidation:t.revalidation,error:t.error}}static getDerivedStateFromError(t){return{error:t}}static getDerivedStateFromProps(t,n){return n.location!==t.location||n.revalidation!=="idle"&&t.revalidation==="idle"?{error:t.error,location:t.location,revalidation:t.revalidation}:{error:t.error!==void 0?t.error:n.error,location:n.location,revalidation:t.revalidation||n.revalidation}}componentDidCatch(t,n){console.error("React Router caught the following error during render",t,n)}render(){return this.state.error!==void 0?c.createElement(M.Provider,{value:this.props.routeContext},c.createElement(he.Provider,{value:this.state.error,children:this.props.component})):this.props.children}}function Ye(e){let{routeContext:t,match:n,children:r}=e,a=c.useContext(F);return a&&a.static&&a.staticContext&&(n.route.errorElement||n.route.ErrorBoundary)&&(a.staticContext._deepestRenderedBoundaryId=n.route.id),c.createElement(M.Provider,{value:t},r)}function et(e,t,n,r){var a;if(t===void 0&&(t=[]),n===void 0&&(n=null),r===void 0&&(r=null),e==null){var o;if(!n)return null;if(n.errors)e=n.matches;else if((o=r)!=null&&o.v7_partialHydration&&t.length===0&&!n.initialized&&n.matches.length>0)e=n.matches;else return null}let i=e,l=(a=n)==null?void 0:a.errors;if(l!=null){let d=i.findIndex(h=>h.route.id&&(l==null?void 0:l[h.route.id])!==void 0);d>=0||v(!1),i=i.slice(0,Math.min(i.length,d+1))}let s=!1,u=-1;if(n&&r&&r.v7_partialHydration)for(let d=0;d<i.length;d++){let h=i[d];if((h.route.HydrateFallback||h.route.hydrateFallbackElement)&&(u=d),h.route.id){let{loaderData:m,errors:x}=n,g=h.route.loader&&m[h.route.id]===void 0&&(!x||x[h.route.id]===void 0);if(h.route.lazy||g){s=!0,u>=0?i=i.slice(0,u+1):i=[i[0]];break}}}return i.reduceRight((d,h,m)=>{let x,g=!1,y=null,f=null;n&&(x=l&&h.route.id?l[h.route.id]:void 0,y=h.route.errorElement||Xe,s&&(u<0&&m===0?(it("route-fallback"),g=!0,f=null):u===m&&(g=!0,f=h.route.hydrateFallbackElement||null)));let k=t.concat(i.slice(0,m+1)),C=()=>{let b;return x?b=y:g?b=f:h.route.Component?b=c.createElement(h.route.Component,null):h.route.element?b=h.route.element:b=d,c.createElement(Ye,{match:h,routeContext:{outlet:d,matches:k,isDataRoute:n!=null},children:b})};return n&&(h.route.ErrorBoundary||h.route.errorElement||m===0)?c.createElement(Qe,{location:n.location,revalidation:n.revalidation,component:y,error:x,children:C(),routeContext:{outlet:null,matches:k,isDataRoute:!0}}):C()},null)}var fe=(function(e){return e.UseBlocker="useBlocker",e.UseRevalidator="useRevalidator",e.UseNavigateStable="useNavigate",e})(fe||{}),pe=(function(e){return e.UseBlocker="useBlocker",e.UseLoaderData="useLoaderData",e.UseActionData="useActionData",e.UseRouteError="useRouteError",e.UseNavigation="useNavigation",e.UseRouteLoaderData="useRouteLoaderData",e.UseMatches="useMatches",e.UseRevalidator="useRevalidator",e.UseNavigateStable="useNavigate",e.UseRouteId="useRouteId",e})(pe||{});function tt(e){let t=c.useContext(F);return t||v(!1),t}function nt(e){let t=c.useContext(Fe);return t||v(!1),t}function rt(e){let t=c.useContext(M);return t||v(!1),t}function me(e){let t=rt(),n=t.matches[t.matches.length-1];return n.route.id||v(!1),n.route.id}function at(){var e;let t=c.useContext(he),n=nt(),r=me();return t!==void 0?t:(e=n.errors)==null?void 0:e[r]}function ot(){let{router:e}=tt(fe.UseNavigateStable),t=me(pe.UseNavigateStable),n=c.useRef(!1);return de(()=>{n.current=!0}),c.useCallback(function(a,o){o===void 0&&(o={}),n.current&&(typeof a=="number"?e.navigate(a):e.navigate(a,S({fromRouteId:t},o)))},[e,t])}const Y={};function it(e,t,n){Y[e]||(Y[e]=!0)}function nn(e,t){e==null||e.v7_startTransition,e==null||e.v7_relativeSplatPath}function rn(e){let{to:t,replace:n,state:r,relative:a}=e;$()||v(!1);let{future:o,static:i}=c.useContext(L),{matches:l}=c.useContext(M),{pathname:s}=H(),u=He(),d=ce(t,le(l,o.v7_relativeSplatPath),s,a==="path"),h=JSON.stringify(d);return c.useEffect(()=>u(JSON.parse(h),{replace:n,state:r,relative:a}),[u,h,a,n,r]),null}function st(e){v(!1)}function an(e){let{basename:t="/",children:n=null,location:r,navigationType:a=E.Pop,navigator:o,static:i=!1,future:l}=e;$()&&v(!1);let s=t.replace(/^\/*/,"/"),u=c.useMemo(()=>({basename:s,navigator:o,static:i,future:S({v7_relativeSplatPath:!1},l)}),[s,l,o,i]);typeof r=="string"&&(r=_(r));let{pathname:d="/",search:h="",hash:m="",state:x=null,key:g="default"}=r,y=c.useMemo(()=>{let f=se(d,s);return f==null?null:{location:{pathname:f,search:h,hash:m,state:x,key:g},navigationType:a}},[s,d,h,m,x,g,a]);return y==null?null:c.createElement(L.Provider,{value:u},c.createElement(B.Provider,{children:n,value:y}))}function on(e){let{children:t,location:n}=e;return Ze(T(t),n)}new Promise(()=>{});function T(e,t){t===void 0&&(t=[]);let n=[];return c.Children.forEach(e,(r,a)=>{if(!c.isValidElement(r))return;let o=[...t,a];if(r.type===c.Fragment){n.push.apply(n,T(r.props.children,o));return}r.type!==st&&v(!1),!r.props.index||!r.props.children||v(!1);let i={id:r.props.id||o.join("-"),caseSensitive:r.props.caseSensitive,element:r.props.element,Component:r.props.Component,index:r.props.index,path:r.props.path,loader:r.props.loader,action:r.props.action,errorElement:r.props.errorElement,ErrorBoundary:r.props.ErrorBoundary,hasErrorBoundary:r.props.ErrorBoundary!=null||r.props.errorElement!=null,shouldRevalidate:r.props.shouldRevalidate,handle:r.props.handle,lazy:r.props.lazy};r.props.children&&(i.children=T(r.props.children,o)),n.push(i)}),n}const lt=(e,t)=>t.some(n=>e instanceof n);let ee,te;function ct(){return ee||(ee=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function ut(){return te||(te=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const ye=new WeakMap,q=new WeakMap,ve=new WeakMap,D=new WeakMap,J=new WeakMap;function ht(e){const t=new Promise((n,r)=>{const a=()=>{e.removeEventListener("success",o),e.removeEventListener("error",i)},o=()=>{n(w(e.result)),a()},i=()=>{r(e.error),a()};e.addEventListener("success",o),e.addEventListener("error",i)});return t.then(n=>{n instanceof IDBCursor&&ye.set(n,e)}).catch(()=>{}),J.set(t,e),t}function dt(e){if(q.has(e))return;const t=new Promise((n,r)=>{const a=()=>{e.removeEventListener("complete",o),e.removeEventListener("error",i),e.removeEventListener("abort",i)},o=()=>{n(),a()},i=()=>{r(e.error||new DOMException("AbortError","AbortError")),a()};e.addEventListener("complete",o),e.addEventListener("error",i),e.addEventListener("abort",i)});q.set(e,t)}let V={get(e,t,n){if(e instanceof IDBTransaction){if(t==="done")return q.get(e);if(t==="objectStoreNames")return e.objectStoreNames||ve.get(e);if(t==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return w(e[t])},set(e,t,n){return e[t]=n,!0},has(e,t){return e instanceof IDBTransaction&&(t==="done"||t==="store")?!0:t in e}};function ft(e){V=e(V)}function pt(e){return e===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(t,...n){const r=e.call(A(this),t,...n);return ve.set(r,t.sort?t.sort():[t]),w(r)}:ut().includes(e)?function(...t){return e.apply(A(this),t),w(ye.get(this))}:function(...t){return w(e.apply(A(this),t))}}function mt(e){return typeof e=="function"?pt(e):(e instanceof IDBTransaction&&dt(e),lt(e,ct())?new Proxy(e,V):e)}function w(e){if(e instanceof IDBRequest)return ht(e);if(D.has(e))return D.get(e);const t=mt(e);return t!==e&&(D.set(e,t),J.set(t,e)),t}const A=e=>J.get(e);function sn(e,t,{blocked:n,upgrade:r,blocking:a,terminated:o}={}){const i=indexedDB.open(e,t),l=w(i);return r&&i.addEventListener("upgradeneeded",s=>{r(w(i.result),s.oldVersion,s.newVersion,w(i.transaction),s)}),n&&i.addEventListener("blocked",s=>n(s.oldVersion,s.newVersion,s)),l.then(s=>{o&&s.addEventListener("close",()=>o()),a&&s.addEventListener("versionchange",u=>a(u.oldVersion,u.newVersion,u))}).catch(()=>{}),l}const yt=["get","getKey","getAll","getAllKeys","count"],vt=["put","add","delete","clear"],W=new Map;function ne(e,t){if(!(e instanceof IDBDatabase&&!(t in e)&&typeof t=="string"))return;if(W.get(t))return W.get(t);const n=t.replace(/FromIndex$/,""),r=t!==n,a=vt.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!(a||yt.includes(n)))return;const o=async function(i,...l){const s=this.transaction(i,a?"readwrite":"readonly");let u=s.store;return r&&(u=u.index(l.shift())),(await Promise.all([u[n](...l),a&&s.done]))[0]};return W.set(t,o),o}ft(e=>({...e,get:(t,n,r)=>ne(t,n)||e.get(t,n,r),has:(t,n)=>!!ne(t,n)||e.has(t,n)}));function ln(e,t){var n={};for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&t.indexOf(r)<0&&(n[r]=e[r]);if(e!=null&&typeof Object.getOwnPropertySymbols=="function")for(var a=0,r=Object.getOwnPropertySymbols(e);a<r.length;a++)t.indexOf(r[a])<0&&Object.prototype.propertyIsEnumerable.call(e,r[a])&&(n[r[a]]=e[r[a]]);return n}/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ge=(...e)=>e.filter((t,n,r)=>!!t&&t.trim()!==""&&r.indexOf(t)===n).join(" ").trim();/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gt=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xt=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,n,r)=>r?r.toUpperCase():n.toLowerCase());/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const re=e=>{const t=xt(e);return t.charAt(0).toUpperCase()+t.slice(1)};/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var U={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kt=e=>{for(const t in e)if(t.startsWith("aria-")||t==="role"||t==="title")return!0;return!1},Ct=c.createContext({}),bt=()=>c.useContext(Ct),Et=c.forwardRef(({color:e,size:t,strokeWidth:n,absoluteStrokeWidth:r,className:a="",children:o,iconNode:i,...l},s)=>{const{size:u=24,strokeWidth:d=2,absoluteStrokeWidth:h=!1,color:m="currentColor",className:x=""}=bt()??{},g=r??h?Number(n??d)*24/Number(t??u):n??d;return c.createElement("svg",{ref:s,...U,width:t??u??U.width,height:t??u??U.height,stroke:e??m,strokeWidth:g,className:ge("lucide",x,a),...!o&&!kt(l)&&{"aria-hidden":"true"},...l},[...i.map(([y,f])=>c.createElement(y,f)),...Array.isArray(o)?o:[o]])});/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=(e,t)=>{const n=c.forwardRef(({className:r,...a},o)=>c.createElement(Et,{ref:o,iconNode:t,className:ge(`lucide-${gt(re(e))}`,`lucide-${e}`,r),...a}));return n.displayName=re(e),n};/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wt=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]],cn=p("arrow-right",wt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mt=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],un=p("calendar",Mt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pt=[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]],hn=p("check",Pt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _t=[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]],dn=p("chevron-left",_t);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nt=[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]],fn=p("chevron-right",Nt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const St=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",key:"1u773s"}],["path",{d:"M12 17h.01",key:"p32p05"}]],pn=p("circle-question-mark",St);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lt=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 6v6l4 2",key:"mmk7yg"}]],mn=p("clock",Lt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $t=[["path",{d:"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z",key:"p7xjir"}]],yn=p("cloud",$t);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const It=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"22",x2:"18",y1:"12",y2:"12",key:"l9bcsi"}],["line",{x1:"6",x2:"2",y1:"12",y2:"12",key:"13hhkx"}],["line",{x1:"12",x2:"12",y1:"6",y2:"2",key:"10w3f3"}],["line",{x1:"12",x2:"12",y1:"22",y2:"18",key:"15g9kq"}]],vn=p("crosshair",It);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rt=[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]],gn=p("external-link",Rt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bt=[["path",{d:"M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528",key:"1jaruq"}]],xn=p("flag",Bt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jt=[["path",{d:"M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z",key:"1dudjm"}],["path",{d:"M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z",key:"l2t8xc"}],["path",{d:"M16 17h4",key:"1dejxt"}],["path",{d:"M4 13h4",key:"1bwh8b"}]],kn=p("footprints",jt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ot=[["path",{d:"M12 2v4",key:"3427ic"}],["path",{d:"m16.2 7.8 2.9-2.9",key:"r700ao"}],["path",{d:"M18 12h4",key:"wj9ykh"}],["path",{d:"m16.2 16.2 2.9 2.9",key:"1bxg5t"}],["path",{d:"M12 18v4",key:"jadmvz"}],["path",{d:"m4.9 19.1 2.9-2.9",key:"bwix9q"}],["path",{d:"M2 12h4",key:"j09sii"}],["path",{d:"m4.9 4.9 2.9 2.9",key:"giyufr"}]],Cn=p("loader",Ot);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dt=[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]],bn=p("map-pin",Dt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const At=[["path",{d:"M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15",key:"143lza"}],["path",{d:"M11 12 5.12 2.2",key:"qhuxz6"}],["path",{d:"m13 12 5.88-9.8",key:"hbye0f"}],["path",{d:"M8 7h8",key:"i86dvs"}],["circle",{cx:"12",cy:"17",r:"5",key:"qbz8iq"}],["path",{d:"M12 18v-2h-.5",key:"fawc4q"}]],En=p("medal",At);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wt=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]],wn=p("plus",Wt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ut=[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]],Mn=p("refresh-cw",Ut);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zt=[["circle",{cx:"6",cy:"19",r:"3",key:"1kj8tv"}],["path",{d:"M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15",key:"1d8sl"}],["circle",{cx:"18",cy:"5",r:"3",key:"gq8acd"}]],Pn=p("route",zt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tt=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]],_n=p("shield",Tt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qt=[["path",{d:"m12.5 17-.5-1-.5 1h1z",key:"3me087"}],["path",{d:"M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z",key:"1o5pge"}],["circle",{cx:"15",cy:"12",r:"1",key:"1tmaij"}],["circle",{cx:"9",cy:"12",r:"1",key:"1vctgf"}]],Nn=p("skull",qt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vt=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]],Sn=p("square",Vt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ft=[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]],Ln=p("star",Ft);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ht=[["path",{d:"M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z",key:"1dfntj"}],["path",{d:"M15 3v5a1 1 0 0 0 1 1h5",key:"6s6qgf"}]],$n=p("sticky-note",Ht);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jt=[["polyline",{points:"14.5 17.5 3 6 3 3 6 3 17.5 14.5",key:"1hfsw2"}],["line",{x1:"13",x2:"19",y1:"19",y2:"13",key:"1vrmhu"}],["line",{x1:"16",x2:"20",y1:"16",y2:"20",key:"1bron3"}],["line",{x1:"19",x2:"21",y1:"21",y2:"19",key:"13pww6"}],["polyline",{points:"14.5 6.5 18 3 21 3 21 6 17.5 9.5",key:"hbey2j"}],["line",{x1:"5",x2:"9",y1:"14",y2:"18",key:"1hf58s"}],["line",{x1:"7",x2:"4",y1:"17",y2:"20",key:"pidxm4"}],["line",{x1:"3",x2:"5",y1:"19",y2:"21",key:"1pehsh"}]],In=p("swords",Jt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zt=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"12",r:"6",key:"1vlfrh"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]],Rn=p("target",Zt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kt=[["path",{d:"M16 17h6v-6",key:"t6n2it"}],["path",{d:"m22 17-8.5-8.5-5 5L2 7",key:"x473p"}]],Bn=p("trending-down",Kt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gt=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],jn=p("triangle-alert",Gt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xt=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],On=p("x",Xt);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qt=[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]],Dn=p("zap",Qt);export{cn as A,vn as C,gn as E,kn as F,Cn as L,En as M,rn as N,wn as P,an as R,Ln as S,jn as T,On as X,Dn as Z,ln as _,He as a,on as b,en as c,st as d,tn as e,Pn as f,_n as g,Nn as h,hn as i,bn as j,fn as k,nn as l,$n as m,Mn as n,sn as o,un as p,mn as q,Bn as r,In as s,Rn as t,H as u,xn as v,Sn as w,pn as x,dn as y,yn as z};
