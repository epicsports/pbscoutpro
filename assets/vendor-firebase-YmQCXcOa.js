import{o as qm,_ as za}from"./vendor-misc-CVja_RG8.js";const zm=()=>{};var tl={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Yh=function(r){const e=[];let t=0;for(let n=0;n<r.length;n++){let i=r.charCodeAt(n);i<128?e[t++]=i:i<2048?(e[t++]=i>>6|192,e[t++]=i&63|128):(i&64512)===55296&&n+1<r.length&&(r.charCodeAt(n+1)&64512)===56320?(i=65536+((i&1023)<<10)+(r.charCodeAt(++n)&1023),e[t++]=i>>18|240,e[t++]=i>>12&63|128,e[t++]=i>>6&63|128,e[t++]=i&63|128):(e[t++]=i>>12|224,e[t++]=i>>6&63|128,e[t++]=i&63|128)}return e},$m=function(r){const e=[];let t=0,n=0;for(;t<r.length;){const i=r[t++];if(i<128)e[n++]=String.fromCharCode(i);else if(i>191&&i<224){const s=r[t++];e[n++]=String.fromCharCode((i&31)<<6|s&63)}else if(i>239&&i<365){const s=r[t++],o=r[t++],c=r[t++],u=((i&7)<<18|(s&63)<<12|(o&63)<<6|c&63)-65536;e[n++]=String.fromCharCode(55296+(u>>10)),e[n++]=String.fromCharCode(56320+(u&1023))}else{const s=r[t++],o=r[t++];e[n++]=String.fromCharCode((i&15)<<12|(s&63)<<6|o&63)}}return e.join("")},Zh={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(r,e){if(!Array.isArray(r))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,n=[];for(let i=0;i<r.length;i+=3){const s=r[i],o=i+1<r.length,c=o?r[i+1]:0,u=i+2<r.length,h=u?r[i+2]:0,f=s>>2,m=(s&3)<<4|c>>4;let g=(c&15)<<2|h>>6,b=h&63;u||(b=64,o||(g=64)),n.push(t[f],t[m],t[g],t[b])}return n.join("")},encodeString(r,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(r):this.encodeByteArray(Yh(r),e)},decodeString(r,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(r):$m(this.decodeStringToByteArray(r,e))},decodeStringToByteArray(r,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,n=[];for(let i=0;i<r.length;){const s=t[r.charAt(i++)],c=i<r.length?t[r.charAt(i)]:0;++i;const h=i<r.length?t[r.charAt(i)]:64;++i;const m=i<r.length?t[r.charAt(i)]:64;if(++i,s==null||c==null||h==null||m==null)throw new Gm;const g=s<<2|c>>4;if(n.push(g),h!==64){const b=c<<4&240|h>>2;if(n.push(b),m!==64){const C=h<<6&192|m;n.push(C)}}}return n},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let r=0;r<this.ENCODED_VALS.length;r++)this.byteToCharMap_[r]=this.ENCODED_VALS.charAt(r),this.charToByteMap_[this.byteToCharMap_[r]]=r,this.byteToCharMapWebSafe_[r]=this.ENCODED_VALS_WEBSAFE.charAt(r),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[r]]=r,r>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(r)]=r,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(r)]=r)}}};class Gm extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const Km=function(r){const e=Yh(r);return Zh.encodeByteArray(e,!0)},ks=function(r){return Km(r).replace(/\./g,"")},ed=function(r){try{return Zh.decodeString(r,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function td(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Wm=()=>td().__FIREBASE_DEFAULTS__,Hm=()=>{if(typeof process>"u"||typeof tl>"u")return;const r=tl.__FIREBASE_DEFAULTS__;if(r)return JSON.parse(r)},Qm=()=>{if(typeof document>"u")return;let r;try{r=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=r&&ed(r[1]);return e&&JSON.parse(e)},ro=()=>{try{return zm()||Wm()||Hm()||Qm()}catch(r){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${r}`);return}},nd=r=>{var e,t;return(t=(e=ro())===null||e===void 0?void 0:e.emulatorHosts)===null||t===void 0?void 0:t[r]},Xm=r=>{const e=nd(r);if(!e)return;const t=e.lastIndexOf(":");if(t<=0||t+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const n=parseInt(e.substring(t+1),10);return e[0]==="["?[e.substring(1,t-1),n]:[e.substring(0,t),n]},rd=()=>{var r;return(r=ro())===null||r===void 0?void 0:r.config},id=r=>{var e;return(e=ro())===null||e===void 0?void 0:e[`_${r}`]};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jm{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,n)=>{t?this.reject(t):this.resolve(n),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,n))}}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pr(r){try{return(r.startsWith("http://")||r.startsWith("https://")?new URL(r).hostname:r).endsWith(".cloudworkstations.dev")}catch{return!1}}async function sd(r){return(await fetch(r,{credentials:"include"})).ok}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ym(r,e){if(r.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const t={alg:"none",type:"JWT"},n=e||"demo-project",i=r.iat||0,s=r.sub||r.user_id;if(!s)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o=Object.assign({iss:`https://securetoken.google.com/${n}`,aud:n,iat:i,exp:i+3600,auth_time:i,sub:s,user_id:s,firebase:{sign_in_provider:"custom",identities:{}}},r);return[ks(JSON.stringify(t)),ks(JSON.stringify(o)),""].join(".")}const Yr={};function Zm(){const r={prod:[],emulator:[]};for(const e of Object.keys(Yr))Yr[e]?r.emulator.push(e):r.prod.push(e);return r}function eg(r){let e=document.getElementById(r),t=!1;return e||(e=document.createElement("div"),e.setAttribute("id",r),t=!0),{created:t,element:e}}let nl=!1;function od(r,e){if(typeof window>"u"||typeof document>"u"||!pr(window.location.host)||Yr[r]===e||Yr[r]||nl)return;Yr[r]=e;function t(g){return`__firebase__banner__${g}`}const n="__firebase__banner",s=Zm().prod.length>0;function o(){const g=document.getElementById(n);g&&g.remove()}function c(g){g.style.display="flex",g.style.background="#7faaf0",g.style.position="fixed",g.style.bottom="5px",g.style.left="5px",g.style.padding=".5em",g.style.borderRadius="5px",g.style.alignItems="center"}function u(g,b){g.setAttribute("width","24"),g.setAttribute("id",b),g.setAttribute("height","24"),g.setAttribute("viewBox","0 0 24 24"),g.setAttribute("fill","none"),g.style.marginLeft="-6px"}function h(){const g=document.createElement("span");return g.style.cursor="pointer",g.style.marginLeft="16px",g.style.fontSize="24px",g.innerHTML=" &times;",g.onclick=()=>{nl=!0,o()},g}function f(g,b){g.setAttribute("id",b),g.innerText="Learn more",g.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",g.setAttribute("target","__blank"),g.style.paddingLeft="5px",g.style.textDecoration="underline"}function m(){const g=eg(n),b=t("text"),C=document.getElementById(b)||document.createElement("span"),N=t("learnmore"),D=document.getElementById(N)||document.createElement("a"),$=t("preprendIcon"),B=document.getElementById($)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(g.created){const F=g.element;c(F),f(D,N);const W=h();u(B,$),F.append(B,C,D,W),document.body.appendChild(F)}s?(C.innerText="Preview backend disconnected.",B.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`):(B.innerHTML=`<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`,C.innerText="Preview backend running in this workspace."),C.setAttribute("id",b)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",m):m()}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ge(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function tg(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(ge())}function ad(){var r;const e=(r=ro())===null||r===void 0?void 0:r.forceEnvironment;if(e==="node")return!0;if(e==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function ng(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function rg(){const r=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof r=="object"&&r.id!==void 0}function ig(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function sg(){const r=ge();return r.indexOf("MSIE ")>=0||r.indexOf("Trident/")>=0}function cd(){return!ad()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function ud(){return!ad()&&!!navigator.userAgent&&(navigator.userAgent.includes("Safari")||navigator.userAgent.includes("WebKit"))&&!navigator.userAgent.includes("Chrome")}function ld(){try{return typeof indexedDB=="object"}catch{return!1}}function og(){return new Promise((r,e)=>{try{let t=!0;const n="validate-browser-context-for-indexeddb-analytics-module",i=self.indexedDB.open(n);i.onsuccess=()=>{i.result.close(),t||self.indexedDB.deleteDatabase(n),r(!0)},i.onupgradeneeded=()=>{t=!1},i.onerror=()=>{var s;e(((s=i.error)===null||s===void 0?void 0:s.message)||"")}}catch(t){e(t)}})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ag="FirebaseError";class vt extends Error{constructor(e,t,n){super(t),this.code=e,this.customData=n,this.name=ag,Object.setPrototypeOf(this,vt.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,Ai.prototype.create)}}class Ai{constructor(e,t,n){this.service=e,this.serviceName=t,this.errors=n}create(e,...t){const n=t[0]||{},i=`${this.service}/${e}`,s=this.errors[e],o=s?cg(s,n):"Error",c=`${this.serviceName}: ${o} (${i}).`;return new vt(i,c,n)}}function cg(r,e){return r.replace(ug,(t,n)=>{const i=e[n];return i!=null?String(i):`<${n}?>`})}const ug=/\{\$([^}]+)}/g;function lg(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}function mt(r,e){if(r===e)return!0;const t=Object.keys(r),n=Object.keys(e);for(const i of t){if(!n.includes(i))return!1;const s=r[i],o=e[i];if(rl(s)&&rl(o)){if(!mt(s,o))return!1}else if(s!==o)return!1}for(const i of n)if(!t.includes(i))return!1;return!0}function rl(r){return r!==null&&typeof r=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ri(r){const e=[];for(const[t,n]of Object.entries(r))Array.isArray(n)?n.forEach(i=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(i))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(n));return e.length?"&"+e.join("&"):""}function Kr(r){const e={};return r.replace(/^\?/,"").split("&").forEach(n=>{if(n){const[i,s]=n.split("=");e[decodeURIComponent(i)]=decodeURIComponent(s)}}),e}function Wr(r){const e=r.indexOf("?");if(!e)return"";const t=r.indexOf("#",e);return r.substring(e,t>0?t:void 0)}function hg(r,e){const t=new dg(r,e);return t.subscribe.bind(t)}class dg{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(n=>{this.error(n)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,n){let i;if(e===void 0&&t===void 0&&n===void 0)throw new Error("Missing Observer.");fg(e,["next","error","complete"])?i=e:i={next:e,error:t,complete:n},i.next===void 0&&(i.next=ta),i.error===void 0&&(i.error=ta),i.complete===void 0&&(i.complete=ta);const s=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?i.error(this.finalError):i.complete()}catch{}}),this.observers.push(i),s}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(n){typeof console<"u"&&console.error&&console.error(n)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function fg(r,e){if(typeof r!="object"||r===null)return!1;for(const t of e)if(t in r&&typeof r[t]=="function")return!0;return!1}function ta(){}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function se(r){return r&&r._delegate?r._delegate:r}class pn{constructor(e,t,n){this.name=e,this.instanceFactory=t,this.type=n,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nn="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pg{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const n=new Jm;if(this.instancesDeferred.set(t,n),this.isInitialized(t)||this.shouldAutoInitialize())try{const i=this.getOrInitializeService({instanceIdentifier:t});i&&n.resolve(i)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){var t;const n=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),i=(t=e==null?void 0:e.optional)!==null&&t!==void 0?t:!1;if(this.isInitialized(n)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:n})}catch(s){if(i)return null;throw s}else{if(i)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(gg(e))try{this.getOrInitializeService({instanceIdentifier:nn})}catch{}for(const[t,n]of this.instancesDeferred.entries()){const i=this.normalizeInstanceIdentifier(t);try{const s=this.getOrInitializeService({instanceIdentifier:i});n.resolve(s)}catch{}}}}clearInstance(e=nn){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=nn){return this.instances.has(e)}getOptions(e=nn){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,n=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(n))throw Error(`${this.name}(${n}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const i=this.getOrInitializeService({instanceIdentifier:n,options:t});for(const[s,o]of this.instancesDeferred.entries()){const c=this.normalizeInstanceIdentifier(s);n===c&&o.resolve(i)}return i}onInit(e,t){var n;const i=this.normalizeInstanceIdentifier(t),s=(n=this.onInitCallbacks.get(i))!==null&&n!==void 0?n:new Set;s.add(e),this.onInitCallbacks.set(i,s);const o=this.instances.get(i);return o&&e(o,i),()=>{s.delete(e)}}invokeOnInitCallbacks(e,t){const n=this.onInitCallbacks.get(t);if(n)for(const i of n)try{i(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let n=this.instances.get(e);if(!n&&this.component&&(n=this.component.instanceFactory(this.container,{instanceIdentifier:mg(e),options:t}),this.instances.set(e,n),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(n,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,n)}catch{}return n||null}normalizeInstanceIdentifier(e=nn){return this.component?this.component.multipleInstances?e:nn:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function mg(r){return r===nn?void 0:r}function gg(r){return r.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _g{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new pg(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var H;(function(r){r[r.DEBUG=0]="DEBUG",r[r.VERBOSE=1]="VERBOSE",r[r.INFO=2]="INFO",r[r.WARN=3]="WARN",r[r.ERROR=4]="ERROR",r[r.SILENT=5]="SILENT"})(H||(H={}));const yg={debug:H.DEBUG,verbose:H.VERBOSE,info:H.INFO,warn:H.WARN,error:H.ERROR,silent:H.SILENT},Ig=H.INFO,vg={[H.DEBUG]:"log",[H.VERBOSE]:"log",[H.INFO]:"info",[H.WARN]:"warn",[H.ERROR]:"error"},Eg=(r,e,...t)=>{if(e<r.logLevel)return;const n=new Date().toISOString(),i=vg[e];if(i)console[i](`[${n}]  ${r.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class $a{constructor(e){this.name=e,this._logLevel=Ig,this._logHandler=Eg,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in H))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?yg[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,H.DEBUG,...e),this._logHandler(this,H.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,H.VERBOSE,...e),this._logHandler(this,H.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,H.INFO,...e),this._logHandler(this,H.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,H.WARN,...e),this._logHandler(this,H.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,H.ERROR,...e),this._logHandler(this,H.ERROR,...e)}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tg{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(wg(t)){const n=t.getImmediate();return`${n.library}/${n.version}`}else return null}).filter(t=>t).join(" ")}}function wg(r){const e=r.getComponent();return(e==null?void 0:e.type)==="VERSION"}const ha="@firebase/app",il="0.13.2";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gt=new $a("@firebase/app"),Ag="@firebase/app-compat",Rg="@firebase/analytics-compat",bg="@firebase/analytics",Pg="@firebase/app-check-compat",Sg="@firebase/app-check",Cg="@firebase/auth",Vg="@firebase/auth-compat",Dg="@firebase/database",kg="@firebase/data-connect",Ng="@firebase/database-compat",xg="@firebase/functions",Og="@firebase/functions-compat",Mg="@firebase/installations",Lg="@firebase/installations-compat",Fg="@firebase/messaging",Ug="@firebase/messaging-compat",Bg="@firebase/performance",jg="@firebase/performance-compat",qg="@firebase/remote-config",zg="@firebase/remote-config-compat",$g="@firebase/storage",Gg="@firebase/storage-compat",Kg="@firebase/firestore",Wg="@firebase/ai",Hg="@firebase/firestore-compat",Qg="firebase",Xg="11.10.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const da="[DEFAULT]",Jg={[ha]:"fire-core",[Ag]:"fire-core-compat",[bg]:"fire-analytics",[Rg]:"fire-analytics-compat",[Sg]:"fire-app-check",[Pg]:"fire-app-check-compat",[Cg]:"fire-auth",[Vg]:"fire-auth-compat",[Dg]:"fire-rtdb",[kg]:"fire-data-connect",[Ng]:"fire-rtdb-compat",[xg]:"fire-fn",[Og]:"fire-fn-compat",[Mg]:"fire-iid",[Lg]:"fire-iid-compat",[Fg]:"fire-fcm",[Ug]:"fire-fcm-compat",[Bg]:"fire-perf",[jg]:"fire-perf-compat",[qg]:"fire-rc",[zg]:"fire-rc-compat",[$g]:"fire-gcs",[Gg]:"fire-gcs-compat",[Kg]:"fire-fst",[Hg]:"fire-fst-compat",[Wg]:"fire-vertex","fire-js":"fire-js",[Qg]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ns=new Map,Yg=new Map,fa=new Map;function sl(r,e){try{r.container.addComponent(e)}catch(t){gt.debug(`Component ${e.name} failed to register with FirebaseApp ${r.name}`,t)}}function er(r){const e=r.name;if(fa.has(e))return gt.debug(`There were multiple attempts to register component ${e}.`),!1;fa.set(e,r);for(const t of Ns.values())sl(t,r);for(const t of Yg.values())sl(t,r);return!0}function Ga(r,e){const t=r.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),r.container.getProvider(e)}function je(r){return r==null?!1:r.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Zg={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},Ft=new Ai("app","Firebase",Zg);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class e_{constructor(e,t,n){this._isDeleted=!1,this._options=Object.assign({},e),this._config=Object.assign({},t),this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=n,this.container.addComponent(new pn("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw Ft.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const mr=Xg;function t_(r,e={}){let t=r;typeof e!="object"&&(e={name:e});const n=Object.assign({name:da,automaticDataCollectionEnabled:!0},e),i=n.name;if(typeof i!="string"||!i)throw Ft.create("bad-app-name",{appName:String(i)});if(t||(t=rd()),!t)throw Ft.create("no-options");const s=Ns.get(i);if(s){if(mt(t,s.options)&&mt(n,s.config))return s;throw Ft.create("duplicate-app",{appName:i})}const o=new _g(i);for(const u of fa.values())o.addComponent(u);const c=new e_(t,n,o);return Ns.set(i,c),c}function hd(r=da){const e=Ns.get(r);if(!e&&r===da&&rd())return t_();if(!e)throw Ft.create("no-app",{appName:r});return e}function Ut(r,e,t){var n;let i=(n=Jg[r])!==null&&n!==void 0?n:r;t&&(i+=`-${t}`);const s=i.match(/\s|\//),o=e.match(/\s|\//);if(s||o){const c=[`Unable to register library "${i}" with version "${e}":`];s&&c.push(`library name "${i}" contains illegal characters (whitespace or "/")`),s&&o&&c.push("and"),o&&c.push(`version name "${e}" contains illegal characters (whitespace or "/")`),gt.warn(c.join(" "));return}er(new pn(`${i}-version`,()=>({library:i,version:e}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const n_="firebase-heartbeat-database",r_=1,ci="firebase-heartbeat-store";let na=null;function dd(){return na||(na=qm(n_,r_,{upgrade:(r,e)=>{switch(e){case 0:try{r.createObjectStore(ci)}catch(t){console.warn(t)}}}}).catch(r=>{throw Ft.create("idb-open",{originalErrorMessage:r.message})})),na}async function i_(r){try{const t=(await dd()).transaction(ci),n=await t.objectStore(ci).get(fd(r));return await t.done,n}catch(e){if(e instanceof vt)gt.warn(e.message);else{const t=Ft.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});gt.warn(t.message)}}}async function ol(r,e){try{const n=(await dd()).transaction(ci,"readwrite");await n.objectStore(ci).put(e,fd(r)),await n.done}catch(t){if(t instanceof vt)gt.warn(t.message);else{const n=Ft.create("idb-set",{originalErrorMessage:t==null?void 0:t.message});gt.warn(n.message)}}}function fd(r){return`${r.name}!${r.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const s_=1024,o_=30;class a_{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new u_(t),this._heartbeatsCachePromise=this._storage.read().then(n=>(this._heartbeatsCache=n,n))}async triggerHeartbeat(){var e,t;try{const i=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),s=al();if(((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((t=this._heartbeatsCache)===null||t===void 0?void 0:t.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===s||this._heartbeatsCache.heartbeats.some(o=>o.date===s))return;if(this._heartbeatsCache.heartbeats.push({date:s,agent:i}),this._heartbeatsCache.heartbeats.length>o_){const o=l_(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(n){gt.warn(n)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=al(),{heartbeatsToSend:n,unsentEntries:i}=c_(this._heartbeatsCache.heartbeats),s=ks(JSON.stringify({version:2,heartbeats:n}));return this._heartbeatsCache.lastSentHeartbeatDate=t,i.length>0?(this._heartbeatsCache.heartbeats=i,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(t){return gt.warn(t),""}}}function al(){return new Date().toISOString().substring(0,10)}function c_(r,e=s_){const t=[];let n=r.slice();for(const i of r){const s=t.find(o=>o.agent===i.agent);if(s){if(s.dates.push(i.date),cl(t)>e){s.dates.pop();break}}else if(t.push({agent:i.agent,dates:[i.date]}),cl(t)>e){t.pop();break}n=n.slice(1)}return{heartbeatsToSend:t,unsentEntries:n}}class u_{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return ld()?og().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await i_(this.app);return t!=null&&t.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){var t;if(await this._canUseIndexedDBPromise){const i=await this.read();return ol(this.app,{lastSentHeartbeatDate:(t=e.lastSentHeartbeatDate)!==null&&t!==void 0?t:i.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){var t;if(await this._canUseIndexedDBPromise){const i=await this.read();return ol(this.app,{lastSentHeartbeatDate:(t=e.lastSentHeartbeatDate)!==null&&t!==void 0?t:i.lastSentHeartbeatDate,heartbeats:[...i.heartbeats,...e.heartbeats]})}else return}}function cl(r){return ks(JSON.stringify({version:2,heartbeats:r})).length}function l_(r){if(r.length===0)return-1;let e=0,t=r[0].date;for(let n=1;n<r.length;n++)r[n].date<t&&(t=r[n].date,e=n);return e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function h_(r){er(new pn("platform-logger",e=>new Tg(e),"PRIVATE")),er(new pn("heartbeat",e=>new a_(e),"PRIVATE")),Ut(ha,il,r),Ut(ha,il,"esm2017"),Ut("fire-js","")}h_("");var ul=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Bt,pd;(function(){var r;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(v,_){function I(){}I.prototype=_.prototype,v.D=_.prototype,v.prototype=new I,v.prototype.constructor=v,v.C=function(E,T,R){for(var y=Array(arguments.length-2),at=2;at<arguments.length;at++)y[at-2]=arguments[at];return _.prototype[T].apply(E,y)}}function t(){this.blockSize=-1}function n(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.B=Array(this.blockSize),this.o=this.h=0,this.s()}e(n,t),n.prototype.s=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function i(v,_,I){I||(I=0);var E=Array(16);if(typeof _=="string")for(var T=0;16>T;++T)E[T]=_.charCodeAt(I++)|_.charCodeAt(I++)<<8|_.charCodeAt(I++)<<16|_.charCodeAt(I++)<<24;else for(T=0;16>T;++T)E[T]=_[I++]|_[I++]<<8|_[I++]<<16|_[I++]<<24;_=v.g[0],I=v.g[1],T=v.g[2];var R=v.g[3],y=_+(R^I&(T^R))+E[0]+3614090360&4294967295;_=I+(y<<7&4294967295|y>>>25),y=R+(T^_&(I^T))+E[1]+3905402710&4294967295,R=_+(y<<12&4294967295|y>>>20),y=T+(I^R&(_^I))+E[2]+606105819&4294967295,T=R+(y<<17&4294967295|y>>>15),y=I+(_^T&(R^_))+E[3]+3250441966&4294967295,I=T+(y<<22&4294967295|y>>>10),y=_+(R^I&(T^R))+E[4]+4118548399&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(T^_&(I^T))+E[5]+1200080426&4294967295,R=_+(y<<12&4294967295|y>>>20),y=T+(I^R&(_^I))+E[6]+2821735955&4294967295,T=R+(y<<17&4294967295|y>>>15),y=I+(_^T&(R^_))+E[7]+4249261313&4294967295,I=T+(y<<22&4294967295|y>>>10),y=_+(R^I&(T^R))+E[8]+1770035416&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(T^_&(I^T))+E[9]+2336552879&4294967295,R=_+(y<<12&4294967295|y>>>20),y=T+(I^R&(_^I))+E[10]+4294925233&4294967295,T=R+(y<<17&4294967295|y>>>15),y=I+(_^T&(R^_))+E[11]+2304563134&4294967295,I=T+(y<<22&4294967295|y>>>10),y=_+(R^I&(T^R))+E[12]+1804603682&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(T^_&(I^T))+E[13]+4254626195&4294967295,R=_+(y<<12&4294967295|y>>>20),y=T+(I^R&(_^I))+E[14]+2792965006&4294967295,T=R+(y<<17&4294967295|y>>>15),y=I+(_^T&(R^_))+E[15]+1236535329&4294967295,I=T+(y<<22&4294967295|y>>>10),y=_+(T^R&(I^T))+E[1]+4129170786&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^T&(_^I))+E[6]+3225465664&4294967295,R=_+(y<<9&4294967295|y>>>23),y=T+(_^I&(R^_))+E[11]+643717713&4294967295,T=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(T^R))+E[0]+3921069994&4294967295,I=T+(y<<20&4294967295|y>>>12),y=_+(T^R&(I^T))+E[5]+3593408605&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^T&(_^I))+E[10]+38016083&4294967295,R=_+(y<<9&4294967295|y>>>23),y=T+(_^I&(R^_))+E[15]+3634488961&4294967295,T=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(T^R))+E[4]+3889429448&4294967295,I=T+(y<<20&4294967295|y>>>12),y=_+(T^R&(I^T))+E[9]+568446438&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^T&(_^I))+E[14]+3275163606&4294967295,R=_+(y<<9&4294967295|y>>>23),y=T+(_^I&(R^_))+E[3]+4107603335&4294967295,T=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(T^R))+E[8]+1163531501&4294967295,I=T+(y<<20&4294967295|y>>>12),y=_+(T^R&(I^T))+E[13]+2850285829&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^T&(_^I))+E[2]+4243563512&4294967295,R=_+(y<<9&4294967295|y>>>23),y=T+(_^I&(R^_))+E[7]+1735328473&4294967295,T=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(T^R))+E[12]+2368359562&4294967295,I=T+(y<<20&4294967295|y>>>12),y=_+(I^T^R)+E[5]+4294588738&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^T)+E[8]+2272392833&4294967295,R=_+(y<<11&4294967295|y>>>21),y=T+(R^_^I)+E[11]+1839030562&4294967295,T=R+(y<<16&4294967295|y>>>16),y=I+(T^R^_)+E[14]+4259657740&4294967295,I=T+(y<<23&4294967295|y>>>9),y=_+(I^T^R)+E[1]+2763975236&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^T)+E[4]+1272893353&4294967295,R=_+(y<<11&4294967295|y>>>21),y=T+(R^_^I)+E[7]+4139469664&4294967295,T=R+(y<<16&4294967295|y>>>16),y=I+(T^R^_)+E[10]+3200236656&4294967295,I=T+(y<<23&4294967295|y>>>9),y=_+(I^T^R)+E[13]+681279174&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^T)+E[0]+3936430074&4294967295,R=_+(y<<11&4294967295|y>>>21),y=T+(R^_^I)+E[3]+3572445317&4294967295,T=R+(y<<16&4294967295|y>>>16),y=I+(T^R^_)+E[6]+76029189&4294967295,I=T+(y<<23&4294967295|y>>>9),y=_+(I^T^R)+E[9]+3654602809&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^T)+E[12]+3873151461&4294967295,R=_+(y<<11&4294967295|y>>>21),y=T+(R^_^I)+E[15]+530742520&4294967295,T=R+(y<<16&4294967295|y>>>16),y=I+(T^R^_)+E[2]+3299628645&4294967295,I=T+(y<<23&4294967295|y>>>9),y=_+(T^(I|~R))+E[0]+4096336452&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~T))+E[7]+1126891415&4294967295,R=_+(y<<10&4294967295|y>>>22),y=T+(_^(R|~I))+E[14]+2878612391&4294967295,T=R+(y<<15&4294967295|y>>>17),y=I+(R^(T|~_))+E[5]+4237533241&4294967295,I=T+(y<<21&4294967295|y>>>11),y=_+(T^(I|~R))+E[12]+1700485571&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~T))+E[3]+2399980690&4294967295,R=_+(y<<10&4294967295|y>>>22),y=T+(_^(R|~I))+E[10]+4293915773&4294967295,T=R+(y<<15&4294967295|y>>>17),y=I+(R^(T|~_))+E[1]+2240044497&4294967295,I=T+(y<<21&4294967295|y>>>11),y=_+(T^(I|~R))+E[8]+1873313359&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~T))+E[15]+4264355552&4294967295,R=_+(y<<10&4294967295|y>>>22),y=T+(_^(R|~I))+E[6]+2734768916&4294967295,T=R+(y<<15&4294967295|y>>>17),y=I+(R^(T|~_))+E[13]+1309151649&4294967295,I=T+(y<<21&4294967295|y>>>11),y=_+(T^(I|~R))+E[4]+4149444226&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~T))+E[11]+3174756917&4294967295,R=_+(y<<10&4294967295|y>>>22),y=T+(_^(R|~I))+E[2]+718787259&4294967295,T=R+(y<<15&4294967295|y>>>17),y=I+(R^(T|~_))+E[9]+3951481745&4294967295,v.g[0]=v.g[0]+_&4294967295,v.g[1]=v.g[1]+(T+(y<<21&4294967295|y>>>11))&4294967295,v.g[2]=v.g[2]+T&4294967295,v.g[3]=v.g[3]+R&4294967295}n.prototype.u=function(v,_){_===void 0&&(_=v.length);for(var I=_-this.blockSize,E=this.B,T=this.h,R=0;R<_;){if(T==0)for(;R<=I;)i(this,v,R),R+=this.blockSize;if(typeof v=="string"){for(;R<_;)if(E[T++]=v.charCodeAt(R++),T==this.blockSize){i(this,E),T=0;break}}else for(;R<_;)if(E[T++]=v[R++],T==this.blockSize){i(this,E),T=0;break}}this.h=T,this.o+=_},n.prototype.v=function(){var v=Array((56>this.h?this.blockSize:2*this.blockSize)-this.h);v[0]=128;for(var _=1;_<v.length-8;++_)v[_]=0;var I=8*this.o;for(_=v.length-8;_<v.length;++_)v[_]=I&255,I/=256;for(this.u(v),v=Array(16),_=I=0;4>_;++_)for(var E=0;32>E;E+=8)v[I++]=this.g[_]>>>E&255;return v};function s(v,_){var I=c;return Object.prototype.hasOwnProperty.call(I,v)?I[v]:I[v]=_(v)}function o(v,_){this.h=_;for(var I=[],E=!0,T=v.length-1;0<=T;T--){var R=v[T]|0;E&&R==_||(I[T]=R,E=!1)}this.g=I}var c={};function u(v){return-128<=v&&128>v?s(v,function(_){return new o([_|0],0>_?-1:0)}):new o([v|0],0>v?-1:0)}function h(v){if(isNaN(v)||!isFinite(v))return m;if(0>v)return D(h(-v));for(var _=[],I=1,E=0;v>=I;E++)_[E]=v/I|0,I*=4294967296;return new o(_,0)}function f(v,_){if(v.length==0)throw Error("number format error: empty string");if(_=_||10,2>_||36<_)throw Error("radix out of range: "+_);if(v.charAt(0)=="-")return D(f(v.substring(1),_));if(0<=v.indexOf("-"))throw Error('number format error: interior "-" character');for(var I=h(Math.pow(_,8)),E=m,T=0;T<v.length;T+=8){var R=Math.min(8,v.length-T),y=parseInt(v.substring(T,T+R),_);8>R?(R=h(Math.pow(_,R)),E=E.j(R).add(h(y))):(E=E.j(I),E=E.add(h(y)))}return E}var m=u(0),g=u(1),b=u(16777216);r=o.prototype,r.m=function(){if(N(this))return-D(this).m();for(var v=0,_=1,I=0;I<this.g.length;I++){var E=this.i(I);v+=(0<=E?E:4294967296+E)*_,_*=4294967296}return v},r.toString=function(v){if(v=v||10,2>v||36<v)throw Error("radix out of range: "+v);if(C(this))return"0";if(N(this))return"-"+D(this).toString(v);for(var _=h(Math.pow(v,6)),I=this,E="";;){var T=W(I,_).g;I=$(I,T.j(_));var R=((0<I.g.length?I.g[0]:I.h)>>>0).toString(v);if(I=T,C(I))return R+E;for(;6>R.length;)R="0"+R;E=R+E}},r.i=function(v){return 0>v?0:v<this.g.length?this.g[v]:this.h};function C(v){if(v.h!=0)return!1;for(var _=0;_<v.g.length;_++)if(v.g[_]!=0)return!1;return!0}function N(v){return v.h==-1}r.l=function(v){return v=$(this,v),N(v)?-1:C(v)?0:1};function D(v){for(var _=v.g.length,I=[],E=0;E<_;E++)I[E]=~v.g[E];return new o(I,~v.h).add(g)}r.abs=function(){return N(this)?D(this):this},r.add=function(v){for(var _=Math.max(this.g.length,v.g.length),I=[],E=0,T=0;T<=_;T++){var R=E+(this.i(T)&65535)+(v.i(T)&65535),y=(R>>>16)+(this.i(T)>>>16)+(v.i(T)>>>16);E=y>>>16,R&=65535,y&=65535,I[T]=y<<16|R}return new o(I,I[I.length-1]&-2147483648?-1:0)};function $(v,_){return v.add(D(_))}r.j=function(v){if(C(this)||C(v))return m;if(N(this))return N(v)?D(this).j(D(v)):D(D(this).j(v));if(N(v))return D(this.j(D(v)));if(0>this.l(b)&&0>v.l(b))return h(this.m()*v.m());for(var _=this.g.length+v.g.length,I=[],E=0;E<2*_;E++)I[E]=0;for(E=0;E<this.g.length;E++)for(var T=0;T<v.g.length;T++){var R=this.i(E)>>>16,y=this.i(E)&65535,at=v.i(T)>>>16,Ar=v.i(T)&65535;I[2*E+2*T]+=y*Ar,B(I,2*E+2*T),I[2*E+2*T+1]+=R*Ar,B(I,2*E+2*T+1),I[2*E+2*T+1]+=y*at,B(I,2*E+2*T+1),I[2*E+2*T+2]+=R*at,B(I,2*E+2*T+2)}for(E=0;E<_;E++)I[E]=I[2*E+1]<<16|I[2*E];for(E=_;E<2*_;E++)I[E]=0;return new o(I,0)};function B(v,_){for(;(v[_]&65535)!=v[_];)v[_+1]+=v[_]>>>16,v[_]&=65535,_++}function F(v,_){this.g=v,this.h=_}function W(v,_){if(C(_))throw Error("division by zero");if(C(v))return new F(m,m);if(N(v))return _=W(D(v),_),new F(D(_.g),D(_.h));if(N(_))return _=W(v,D(_)),new F(D(_.g),_.h);if(30<v.g.length){if(N(v)||N(_))throw Error("slowDivide_ only works with positive integers.");for(var I=g,E=_;0>=E.l(v);)I=Z(I),E=Z(E);var T=K(I,1),R=K(E,1);for(E=K(E,2),I=K(I,2);!C(E);){var y=R.add(E);0>=y.l(v)&&(T=T.add(I),R=y),E=K(E,1),I=K(I,1)}return _=$(v,T.j(_)),new F(T,_)}for(T=m;0<=v.l(_);){for(I=Math.max(1,Math.floor(v.m()/_.m())),E=Math.ceil(Math.log(I)/Math.LN2),E=48>=E?1:Math.pow(2,E-48),R=h(I),y=R.j(_);N(y)||0<y.l(v);)I-=E,R=h(I),y=R.j(_);C(R)&&(R=g),T=T.add(R),v=$(v,y)}return new F(T,v)}r.A=function(v){return W(this,v).h},r.and=function(v){for(var _=Math.max(this.g.length,v.g.length),I=[],E=0;E<_;E++)I[E]=this.i(E)&v.i(E);return new o(I,this.h&v.h)},r.or=function(v){for(var _=Math.max(this.g.length,v.g.length),I=[],E=0;E<_;E++)I[E]=this.i(E)|v.i(E);return new o(I,this.h|v.h)},r.xor=function(v){for(var _=Math.max(this.g.length,v.g.length),I=[],E=0;E<_;E++)I[E]=this.i(E)^v.i(E);return new o(I,this.h^v.h)};function Z(v){for(var _=v.g.length+1,I=[],E=0;E<_;E++)I[E]=v.i(E)<<1|v.i(E-1)>>>31;return new o(I,v.h)}function K(v,_){var I=_>>5;_%=32;for(var E=v.g.length-I,T=[],R=0;R<E;R++)T[R]=0<_?v.i(R+I)>>>_|v.i(R+I+1)<<32-_:v.i(R+I);return new o(T,v.h)}n.prototype.digest=n.prototype.v,n.prototype.reset=n.prototype.s,n.prototype.update=n.prototype.u,pd=n,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.A,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=h,o.fromString=f,Bt=o}).apply(typeof ul<"u"?ul:typeof self<"u"?self:typeof window<"u"?window:{});var cs=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var md,Hr,gd,gs,pa,_d,yd,Id;(function(){var r,e=typeof Object.defineProperties=="function"?Object.defineProperty:function(a,l,d){return a==Array.prototype||a==Object.prototype||(a[l]=d.value),a};function t(a){a=[typeof globalThis=="object"&&globalThis,a,typeof window=="object"&&window,typeof self=="object"&&self,typeof cs=="object"&&cs];for(var l=0;l<a.length;++l){var d=a[l];if(d&&d.Math==Math)return d}throw Error("Cannot find global object")}var n=t(this);function i(a,l){if(l)e:{var d=n;a=a.split(".");for(var p=0;p<a.length-1;p++){var A=a[p];if(!(A in d))break e;d=d[A]}a=a[a.length-1],p=d[a],l=l(p),l!=p&&l!=null&&e(d,a,{configurable:!0,writable:!0,value:l})}}function s(a,l){a instanceof String&&(a+="");var d=0,p=!1,A={next:function(){if(!p&&d<a.length){var P=d++;return{value:l(P,a[P]),done:!1}}return p=!0,{done:!0,value:void 0}}};return A[Symbol.iterator]=function(){return A},A}i("Array.prototype.values",function(a){return a||function(){return s(this,function(l,d){return d})}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var o=o||{},c=this||self;function u(a){var l=typeof a;return l=l!="object"?l:a?Array.isArray(a)?"array":l:"null",l=="array"||l=="object"&&typeof a.length=="number"}function h(a){var l=typeof a;return l=="object"&&a!=null||l=="function"}function f(a,l,d){return a.call.apply(a.bind,arguments)}function m(a,l,d){if(!a)throw Error();if(2<arguments.length){var p=Array.prototype.slice.call(arguments,2);return function(){var A=Array.prototype.slice.call(arguments);return Array.prototype.unshift.apply(A,p),a.apply(l,A)}}return function(){return a.apply(l,arguments)}}function g(a,l,d){return g=Function.prototype.bind&&Function.prototype.bind.toString().indexOf("native code")!=-1?f:m,g.apply(null,arguments)}function b(a,l){var d=Array.prototype.slice.call(arguments,1);return function(){var p=d.slice();return p.push.apply(p,arguments),a.apply(this,p)}}function C(a,l){function d(){}d.prototype=l.prototype,a.aa=l.prototype,a.prototype=new d,a.prototype.constructor=a,a.Qb=function(p,A,P){for(var x=Array(arguments.length-2),re=2;re<arguments.length;re++)x[re-2]=arguments[re];return l.prototype[A].apply(p,x)}}function N(a){const l=a.length;if(0<l){const d=Array(l);for(let p=0;p<l;p++)d[p]=a[p];return d}return[]}function D(a,l){for(let d=1;d<arguments.length;d++){const p=arguments[d];if(u(p)){const A=a.length||0,P=p.length||0;a.length=A+P;for(let x=0;x<P;x++)a[A+x]=p[x]}else a.push(p)}}class ${constructor(l,d){this.i=l,this.j=d,this.h=0,this.g=null}get(){let l;return 0<this.h?(this.h--,l=this.g,this.g=l.next,l.next=null):l=this.i(),l}}function B(a){return/^[\s\xa0]*$/.test(a)}function F(){var a=c.navigator;return a&&(a=a.userAgent)?a:""}function W(a){return W[" "](a),a}W[" "]=function(){};var Z=F().indexOf("Gecko")!=-1&&!(F().toLowerCase().indexOf("webkit")!=-1&&F().indexOf("Edge")==-1)&&!(F().indexOf("Trident")!=-1||F().indexOf("MSIE")!=-1)&&F().indexOf("Edge")==-1;function K(a,l,d){for(const p in a)l.call(d,a[p],p,a)}function v(a,l){for(const d in a)l.call(void 0,a[d],d,a)}function _(a){const l={};for(const d in a)l[d]=a[d];return l}const I="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function E(a,l){let d,p;for(let A=1;A<arguments.length;A++){p=arguments[A];for(d in p)a[d]=p[d];for(let P=0;P<I.length;P++)d=I[P],Object.prototype.hasOwnProperty.call(p,d)&&(a[d]=p[d])}}function T(a){var l=1;a=a.split(":");const d=[];for(;0<l&&a.length;)d.push(a.shift()),l--;return a.length&&d.push(a.join(":")),d}function R(a){c.setTimeout(()=>{throw a},0)}function y(){var a=Do;let l=null;return a.g&&(l=a.g,a.g=a.g.next,a.g||(a.h=null),l.next=null),l}class at{constructor(){this.h=this.g=null}add(l,d){const p=Ar.get();p.set(l,d),this.h?this.h.next=p:this.g=p,this.h=p}}var Ar=new $(()=>new am,a=>a.reset());class am{constructor(){this.next=this.g=this.h=null}set(l,d){this.h=l,this.g=d,this.next=null}reset(){this.next=this.g=this.h=null}}let Rr,br=!1,Do=new at,tu=()=>{const a=c.Promise.resolve(void 0);Rr=()=>{a.then(cm)}};var cm=()=>{for(var a;a=y();){try{a.h.call(a.g)}catch(d){R(d)}var l=Ar;l.j(a),100>l.h&&(l.h++,a.next=l.g,l.g=a)}br=!1};function wt(){this.s=this.s,this.C=this.C}wt.prototype.s=!1,wt.prototype.ma=function(){this.s||(this.s=!0,this.N())},wt.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function Re(a,l){this.type=a,this.g=this.target=l,this.defaultPrevented=!1}Re.prototype.h=function(){this.defaultPrevented=!0};var um=(function(){if(!c.addEventListener||!Object.defineProperty)return!1;var a=!1,l=Object.defineProperty({},"passive",{get:function(){a=!0}});try{const d=()=>{};c.addEventListener("test",d,l),c.removeEventListener("test",d,l)}catch{}return a})();function Pr(a,l){if(Re.call(this,a?a.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,a){var d=this.type=a.type,p=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;if(this.target=a.target||a.srcElement,this.g=l,l=a.relatedTarget){if(Z){e:{try{W(l.nodeName);var A=!0;break e}catch{}A=!1}A||(l=null)}}else d=="mouseover"?l=a.fromElement:d=="mouseout"&&(l=a.toElement);this.relatedTarget=l,p?(this.clientX=p.clientX!==void 0?p.clientX:p.pageX,this.clientY=p.clientY!==void 0?p.clientY:p.pageY,this.screenX=p.screenX||0,this.screenY=p.screenY||0):(this.clientX=a.clientX!==void 0?a.clientX:a.pageX,this.clientY=a.clientY!==void 0?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0),this.button=a.button,this.key=a.key||"",this.ctrlKey=a.ctrlKey,this.altKey=a.altKey,this.shiftKey=a.shiftKey,this.metaKey=a.metaKey,this.pointerId=a.pointerId||0,this.pointerType=typeof a.pointerType=="string"?a.pointerType:lm[a.pointerType]||"",this.state=a.state,this.i=a,a.defaultPrevented&&Pr.aa.h.call(this)}}C(Pr,Re);var lm={2:"touch",3:"pen",4:"mouse"};Pr.prototype.h=function(){Pr.aa.h.call(this);var a=this.i;a.preventDefault?a.preventDefault():a.returnValue=!1};var zi="closure_listenable_"+(1e6*Math.random()|0),hm=0;function dm(a,l,d,p,A){this.listener=a,this.proxy=null,this.src=l,this.type=d,this.capture=!!p,this.ha=A,this.key=++hm,this.da=this.fa=!1}function $i(a){a.da=!0,a.listener=null,a.proxy=null,a.src=null,a.ha=null}function Gi(a){this.src=a,this.g={},this.h=0}Gi.prototype.add=function(a,l,d,p,A){var P=a.toString();a=this.g[P],a||(a=this.g[P]=[],this.h++);var x=No(a,l,p,A);return-1<x?(l=a[x],d||(l.fa=!1)):(l=new dm(l,this.src,P,!!p,A),l.fa=d,a.push(l)),l};function ko(a,l){var d=l.type;if(d in a.g){var p=a.g[d],A=Array.prototype.indexOf.call(p,l,void 0),P;(P=0<=A)&&Array.prototype.splice.call(p,A,1),P&&($i(l),a.g[d].length==0&&(delete a.g[d],a.h--))}}function No(a,l,d,p){for(var A=0;A<a.length;++A){var P=a[A];if(!P.da&&P.listener==l&&P.capture==!!d&&P.ha==p)return A}return-1}var xo="closure_lm_"+(1e6*Math.random()|0),Oo={};function nu(a,l,d,p,A){if(Array.isArray(l)){for(var P=0;P<l.length;P++)nu(a,l[P],d,p,A);return null}return d=su(d),a&&a[zi]?a.K(l,d,h(p)?!!p.capture:!1,A):fm(a,l,d,!1,p,A)}function fm(a,l,d,p,A,P){if(!l)throw Error("Invalid event type");var x=h(A)?!!A.capture:!!A,re=Lo(a);if(re||(a[xo]=re=new Gi(a)),d=re.add(l,d,p,x,P),d.proxy)return d;if(p=pm(),d.proxy=p,p.src=a,p.listener=d,a.addEventListener)um||(A=x),A===void 0&&(A=!1),a.addEventListener(l.toString(),p,A);else if(a.attachEvent)a.attachEvent(iu(l.toString()),p);else if(a.addListener&&a.removeListener)a.addListener(p);else throw Error("addEventListener and attachEvent are unavailable.");return d}function pm(){function a(d){return l.call(a.src,a.listener,d)}const l=mm;return a}function ru(a,l,d,p,A){if(Array.isArray(l))for(var P=0;P<l.length;P++)ru(a,l[P],d,p,A);else p=h(p)?!!p.capture:!!p,d=su(d),a&&a[zi]?(a=a.i,l=String(l).toString(),l in a.g&&(P=a.g[l],d=No(P,d,p,A),-1<d&&($i(P[d]),Array.prototype.splice.call(P,d,1),P.length==0&&(delete a.g[l],a.h--)))):a&&(a=Lo(a))&&(l=a.g[l.toString()],a=-1,l&&(a=No(l,d,p,A)),(d=-1<a?l[a]:null)&&Mo(d))}function Mo(a){if(typeof a!="number"&&a&&!a.da){var l=a.src;if(l&&l[zi])ko(l.i,a);else{var d=a.type,p=a.proxy;l.removeEventListener?l.removeEventListener(d,p,a.capture):l.detachEvent?l.detachEvent(iu(d),p):l.addListener&&l.removeListener&&l.removeListener(p),(d=Lo(l))?(ko(d,a),d.h==0&&(d.src=null,l[xo]=null)):$i(a)}}}function iu(a){return a in Oo?Oo[a]:Oo[a]="on"+a}function mm(a,l){if(a.da)a=!0;else{l=new Pr(l,this);var d=a.listener,p=a.ha||a.src;a.fa&&Mo(a),a=d.call(p,l)}return a}function Lo(a){return a=a[xo],a instanceof Gi?a:null}var Fo="__closure_events_fn_"+(1e9*Math.random()>>>0);function su(a){return typeof a=="function"?a:(a[Fo]||(a[Fo]=function(l){return a.handleEvent(l)}),a[Fo])}function be(){wt.call(this),this.i=new Gi(this),this.M=this,this.F=null}C(be,wt),be.prototype[zi]=!0,be.prototype.removeEventListener=function(a,l,d,p){ru(this,a,l,d,p)};function ke(a,l){var d,p=a.F;if(p)for(d=[];p;p=p.F)d.push(p);if(a=a.M,p=l.type||l,typeof l=="string")l=new Re(l,a);else if(l instanceof Re)l.target=l.target||a;else{var A=l;l=new Re(p,a),E(l,A)}if(A=!0,d)for(var P=d.length-1;0<=P;P--){var x=l.g=d[P];A=Ki(x,p,!0,l)&&A}if(x=l.g=a,A=Ki(x,p,!0,l)&&A,A=Ki(x,p,!1,l)&&A,d)for(P=0;P<d.length;P++)x=l.g=d[P],A=Ki(x,p,!1,l)&&A}be.prototype.N=function(){if(be.aa.N.call(this),this.i){var a=this.i,l;for(l in a.g){for(var d=a.g[l],p=0;p<d.length;p++)$i(d[p]);delete a.g[l],a.h--}}this.F=null},be.prototype.K=function(a,l,d,p){return this.i.add(String(a),l,!1,d,p)},be.prototype.L=function(a,l,d,p){return this.i.add(String(a),l,!0,d,p)};function Ki(a,l,d,p){if(l=a.i.g[String(l)],!l)return!0;l=l.concat();for(var A=!0,P=0;P<l.length;++P){var x=l[P];if(x&&!x.da&&x.capture==d){var re=x.listener,Ee=x.ha||x.src;x.fa&&ko(a.i,x),A=re.call(Ee,p)!==!1&&A}}return A&&!p.defaultPrevented}function ou(a,l,d){if(typeof a=="function")d&&(a=g(a,d));else if(a&&typeof a.handleEvent=="function")a=g(a.handleEvent,a);else throw Error("Invalid listener argument");return 2147483647<Number(l)?-1:c.setTimeout(a,l||0)}function au(a){a.g=ou(()=>{a.g=null,a.i&&(a.i=!1,au(a))},a.l);const l=a.h;a.h=null,a.m.apply(null,l)}class gm extends wt{constructor(l,d){super(),this.m=l,this.l=d,this.h=null,this.i=!1,this.g=null}j(l){this.h=arguments,this.g?this.i=!0:au(this)}N(){super.N(),this.g&&(c.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function Sr(a){wt.call(this),this.h=a,this.g={}}C(Sr,wt);var cu=[];function uu(a){K(a.g,function(l,d){this.g.hasOwnProperty(d)&&Mo(l)},a),a.g={}}Sr.prototype.N=function(){Sr.aa.N.call(this),uu(this)},Sr.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Uo=c.JSON.stringify,_m=c.JSON.parse,ym=class{stringify(a){return c.JSON.stringify(a,void 0)}parse(a){return c.JSON.parse(a,void 0)}};function Bo(){}Bo.prototype.h=null;function lu(a){return a.h||(a.h=a.i())}function hu(){}var Cr={OPEN:"a",kb:"b",Ja:"c",wb:"d"};function jo(){Re.call(this,"d")}C(jo,Re);function qo(){Re.call(this,"c")}C(qo,Re);var Jt={},du=null;function Wi(){return du=du||new be}Jt.La="serverreachability";function fu(a){Re.call(this,Jt.La,a)}C(fu,Re);function Vr(a){const l=Wi();ke(l,new fu(l))}Jt.STAT_EVENT="statevent";function pu(a,l){Re.call(this,Jt.STAT_EVENT,a),this.stat=l}C(pu,Re);function Ne(a){const l=Wi();ke(l,new pu(l,a))}Jt.Ma="timingevent";function mu(a,l){Re.call(this,Jt.Ma,a),this.size=l}C(mu,Re);function Dr(a,l){if(typeof a!="function")throw Error("Fn must not be null and must be a function");return c.setTimeout(function(){a()},l)}function kr(){this.g=!0}kr.prototype.xa=function(){this.g=!1};function Im(a,l,d,p,A,P){a.info(function(){if(a.g)if(P)for(var x="",re=P.split("&"),Ee=0;Ee<re.length;Ee++){var Y=re[Ee].split("=");if(1<Y.length){var Pe=Y[0];Y=Y[1];var Se=Pe.split("_");x=2<=Se.length&&Se[1]=="type"?x+(Pe+"="+Y+"&"):x+(Pe+"=redacted&")}}else x=null;else x=P;return"XMLHTTP REQ ("+p+") [attempt "+A+"]: "+l+`
`+d+`
`+x})}function vm(a,l,d,p,A,P,x){a.info(function(){return"XMLHTTP RESP ("+p+") [ attempt "+A+"]: "+l+`
`+d+`
`+P+" "+x})}function Nn(a,l,d,p){a.info(function(){return"XMLHTTP TEXT ("+l+"): "+Tm(a,d)+(p?" "+p:"")})}function Em(a,l){a.info(function(){return"TIMEOUT: "+l})}kr.prototype.info=function(){};function Tm(a,l){if(!a.g)return l;if(!l)return null;try{var d=JSON.parse(l);if(d){for(a=0;a<d.length;a++)if(Array.isArray(d[a])){var p=d[a];if(!(2>p.length)){var A=p[1];if(Array.isArray(A)&&!(1>A.length)){var P=A[0];if(P!="noop"&&P!="stop"&&P!="close")for(var x=1;x<A.length;x++)A[x]=""}}}}return Uo(d)}catch{return l}}var Hi={NO_ERROR:0,gb:1,tb:2,sb:3,nb:4,rb:5,ub:6,Ia:7,TIMEOUT:8,xb:9},gu={lb:"complete",Hb:"success",Ja:"error",Ia:"abort",zb:"ready",Ab:"readystatechange",TIMEOUT:"timeout",vb:"incrementaldata",yb:"progress",ob:"downloadprogress",Pb:"uploadprogress"},zo;function Qi(){}C(Qi,Bo),Qi.prototype.g=function(){return new XMLHttpRequest},Qi.prototype.i=function(){return{}},zo=new Qi;function At(a,l,d,p){this.j=a,this.i=l,this.l=d,this.R=p||1,this.U=new Sr(this),this.I=45e3,this.H=null,this.o=!1,this.m=this.A=this.v=this.L=this.F=this.S=this.B=null,this.D=[],this.g=null,this.C=0,this.s=this.u=null,this.X=-1,this.J=!1,this.O=0,this.M=null,this.W=this.K=this.T=this.P=!1,this.h=new _u}function _u(){this.i=null,this.g="",this.h=!1}var yu={},$o={};function Go(a,l,d){a.L=1,a.v=Zi(ct(l)),a.m=d,a.P=!0,Iu(a,null)}function Iu(a,l){a.F=Date.now(),Xi(a),a.A=ct(a.v);var d=a.A,p=a.R;Array.isArray(p)||(p=[String(p)]),Nu(d.i,"t",p),a.C=0,d=a.j.J,a.h=new _u,a.g=Ju(a.j,d?l:null,!a.m),0<a.O&&(a.M=new gm(g(a.Y,a,a.g),a.O)),l=a.U,d=a.g,p=a.ca;var A="readystatechange";Array.isArray(A)||(A&&(cu[0]=A.toString()),A=cu);for(var P=0;P<A.length;P++){var x=nu(d,A[P],p||l.handleEvent,!1,l.h||l);if(!x)break;l.g[x.key]=x}l=a.H?_(a.H):{},a.m?(a.u||(a.u="POST"),l["Content-Type"]="application/x-www-form-urlencoded",a.g.ea(a.A,a.u,a.m,l)):(a.u="GET",a.g.ea(a.A,a.u,null,l)),Vr(),Im(a.i,a.u,a.A,a.l,a.R,a.m)}At.prototype.ca=function(a){a=a.target;const l=this.M;l&&ut(a)==3?l.j():this.Y(a)},At.prototype.Y=function(a){try{if(a==this.g)e:{const Se=ut(this.g);var l=this.g.Ba();const Mn=this.g.Z();if(!(3>Se)&&(Se!=3||this.g&&(this.h.h||this.g.oa()||Bu(this.g)))){this.J||Se!=4||l==7||(l==8||0>=Mn?Vr(3):Vr(2)),Ko(this);var d=this.g.Z();this.X=d;t:if(vu(this)){var p=Bu(this.g);a="";var A=p.length,P=ut(this.g)==4;if(!this.h.i){if(typeof TextDecoder>"u"){Yt(this),Nr(this);var x="";break t}this.h.i=new c.TextDecoder}for(l=0;l<A;l++)this.h.h=!0,a+=this.h.i.decode(p[l],{stream:!(P&&l==A-1)});p.length=0,this.h.g+=a,this.C=0,x=this.h.g}else x=this.g.oa();if(this.o=d==200,vm(this.i,this.u,this.A,this.l,this.R,Se,d),this.o){if(this.T&&!this.K){t:{if(this.g){var re,Ee=this.g;if((re=Ee.g?Ee.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!B(re)){var Y=re;break t}}Y=null}if(d=Y)Nn(this.i,this.l,d,"Initial handshake response via X-HTTP-Initial-Response"),this.K=!0,Wo(this,d);else{this.o=!1,this.s=3,Ne(12),Yt(this),Nr(this);break e}}if(this.P){d=!0;let Ge;for(;!this.J&&this.C<x.length;)if(Ge=wm(this,x),Ge==$o){Se==4&&(this.s=4,Ne(14),d=!1),Nn(this.i,this.l,null,"[Incomplete Response]");break}else if(Ge==yu){this.s=4,Ne(15),Nn(this.i,this.l,x,"[Invalid Chunk]"),d=!1;break}else Nn(this.i,this.l,Ge,null),Wo(this,Ge);if(vu(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),Se!=4||x.length!=0||this.h.h||(this.s=1,Ne(16),d=!1),this.o=this.o&&d,!d)Nn(this.i,this.l,x,"[Invalid Chunked Response]"),Yt(this),Nr(this);else if(0<x.length&&!this.W){this.W=!0;var Pe=this.j;Pe.g==this&&Pe.ba&&!Pe.M&&(Pe.j.info("Great, no buffering proxy detected. Bytes received: "+x.length),Zo(Pe),Pe.M=!0,Ne(11))}}else Nn(this.i,this.l,x,null),Wo(this,x);Se==4&&Yt(this),this.o&&!this.J&&(Se==4?Wu(this.j,this):(this.o=!1,Xi(this)))}else Bm(this.g),d==400&&0<x.indexOf("Unknown SID")?(this.s=3,Ne(12)):(this.s=0,Ne(13)),Yt(this),Nr(this)}}}catch{}finally{}};function vu(a){return a.g?a.u=="GET"&&a.L!=2&&a.j.Ca:!1}function wm(a,l){var d=a.C,p=l.indexOf(`
`,d);return p==-1?$o:(d=Number(l.substring(d,p)),isNaN(d)?yu:(p+=1,p+d>l.length?$o:(l=l.slice(p,p+d),a.C=p+d,l)))}At.prototype.cancel=function(){this.J=!0,Yt(this)};function Xi(a){a.S=Date.now()+a.I,Eu(a,a.I)}function Eu(a,l){if(a.B!=null)throw Error("WatchDog timer not null");a.B=Dr(g(a.ba,a),l)}function Ko(a){a.B&&(c.clearTimeout(a.B),a.B=null)}At.prototype.ba=function(){this.B=null;const a=Date.now();0<=a-this.S?(Em(this.i,this.A),this.L!=2&&(Vr(),Ne(17)),Yt(this),this.s=2,Nr(this)):Eu(this,this.S-a)};function Nr(a){a.j.G==0||a.J||Wu(a.j,a)}function Yt(a){Ko(a);var l=a.M;l&&typeof l.ma=="function"&&l.ma(),a.M=null,uu(a.U),a.g&&(l=a.g,a.g=null,l.abort(),l.ma())}function Wo(a,l){try{var d=a.j;if(d.G!=0&&(d.g==a||Ho(d.h,a))){if(!a.K&&Ho(d.h,a)&&d.G==3){try{var p=d.Da.g.parse(l)}catch{p=null}if(Array.isArray(p)&&p.length==3){var A=p;if(A[0]==0){e:if(!d.u){if(d.g)if(d.g.F+3e3<a.F)ss(d),rs(d);else break e;Yo(d),Ne(18)}}else d.za=A[1],0<d.za-d.T&&37500>A[2]&&d.F&&d.v==0&&!d.C&&(d.C=Dr(g(d.Za,d),6e3));if(1>=Au(d.h)&&d.ca){try{d.ca()}catch{}d.ca=void 0}}else en(d,11)}else if((a.K||d.g==a)&&ss(d),!B(l))for(A=d.Da.g.parse(l),l=0;l<A.length;l++){let Y=A[l];if(d.T=Y[0],Y=Y[1],d.G==2)if(Y[0]=="c"){d.K=Y[1],d.ia=Y[2];const Pe=Y[3];Pe!=null&&(d.la=Pe,d.j.info("VER="+d.la));const Se=Y[4];Se!=null&&(d.Aa=Se,d.j.info("SVER="+d.Aa));const Mn=Y[5];Mn!=null&&typeof Mn=="number"&&0<Mn&&(p=1.5*Mn,d.L=p,d.j.info("backChannelRequestTimeoutMs_="+p)),p=d;const Ge=a.g;if(Ge){const as=Ge.g?Ge.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(as){var P=p.h;P.g||as.indexOf("spdy")==-1&&as.indexOf("quic")==-1&&as.indexOf("h2")==-1||(P.j=P.l,P.g=new Set,P.h&&(Qo(P,P.h),P.h=null))}if(p.D){const ea=Ge.g?Ge.g.getResponseHeader("X-HTTP-Session-Id"):null;ea&&(p.ya=ea,ie(p.I,p.D,ea))}}d.G=3,d.l&&d.l.ua(),d.ba&&(d.R=Date.now()-a.F,d.j.info("Handshake RTT: "+d.R+"ms")),p=d;var x=a;if(p.qa=Xu(p,p.J?p.ia:null,p.W),x.K){Ru(p.h,x);var re=x,Ee=p.L;Ee&&(re.I=Ee),re.B&&(Ko(re),Xi(re)),p.g=x}else Gu(p);0<d.i.length&&is(d)}else Y[0]!="stop"&&Y[0]!="close"||en(d,7);else d.G==3&&(Y[0]=="stop"||Y[0]=="close"?Y[0]=="stop"?en(d,7):Jo(d):Y[0]!="noop"&&d.l&&d.l.ta(Y),d.v=0)}}Vr(4)}catch{}}var Am=class{constructor(a,l){this.g=a,this.map=l}};function Tu(a){this.l=a||10,c.PerformanceNavigationTiming?(a=c.performance.getEntriesByType("navigation"),a=0<a.length&&(a[0].nextHopProtocol=="hq"||a[0].nextHopProtocol=="h2")):a=!!(c.chrome&&c.chrome.loadTimes&&c.chrome.loadTimes()&&c.chrome.loadTimes().wasFetchedViaSpdy),this.j=a?this.l:1,this.g=null,1<this.j&&(this.g=new Set),this.h=null,this.i=[]}function wu(a){return a.h?!0:a.g?a.g.size>=a.j:!1}function Au(a){return a.h?1:a.g?a.g.size:0}function Ho(a,l){return a.h?a.h==l:a.g?a.g.has(l):!1}function Qo(a,l){a.g?a.g.add(l):a.h=l}function Ru(a,l){a.h&&a.h==l?a.h=null:a.g&&a.g.has(l)&&a.g.delete(l)}Tu.prototype.cancel=function(){if(this.i=bu(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const a of this.g.values())a.cancel();this.g.clear()}};function bu(a){if(a.h!=null)return a.i.concat(a.h.D);if(a.g!=null&&a.g.size!==0){let l=a.i;for(const d of a.g.values())l=l.concat(d.D);return l}return N(a.i)}function Rm(a){if(a.V&&typeof a.V=="function")return a.V();if(typeof Map<"u"&&a instanceof Map||typeof Set<"u"&&a instanceof Set)return Array.from(a.values());if(typeof a=="string")return a.split("");if(u(a)){for(var l=[],d=a.length,p=0;p<d;p++)l.push(a[p]);return l}l=[],d=0;for(p in a)l[d++]=a[p];return l}function bm(a){if(a.na&&typeof a.na=="function")return a.na();if(!a.V||typeof a.V!="function"){if(typeof Map<"u"&&a instanceof Map)return Array.from(a.keys());if(!(typeof Set<"u"&&a instanceof Set)){if(u(a)||typeof a=="string"){var l=[];a=a.length;for(var d=0;d<a;d++)l.push(d);return l}l=[],d=0;for(const p in a)l[d++]=p;return l}}}function Pu(a,l){if(a.forEach&&typeof a.forEach=="function")a.forEach(l,void 0);else if(u(a)||typeof a=="string")Array.prototype.forEach.call(a,l,void 0);else for(var d=bm(a),p=Rm(a),A=p.length,P=0;P<A;P++)l.call(void 0,p[P],d&&d[P],a)}var Su=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function Pm(a,l){if(a){a=a.split("&");for(var d=0;d<a.length;d++){var p=a[d].indexOf("="),A=null;if(0<=p){var P=a[d].substring(0,p);A=a[d].substring(p+1)}else P=a[d];l(P,A?decodeURIComponent(A.replace(/\+/g," ")):"")}}}function Zt(a){if(this.g=this.o=this.j="",this.s=null,this.m=this.l="",this.h=!1,a instanceof Zt){this.h=a.h,Ji(this,a.j),this.o=a.o,this.g=a.g,Yi(this,a.s),this.l=a.l;var l=a.i,d=new Mr;d.i=l.i,l.g&&(d.g=new Map(l.g),d.h=l.h),Cu(this,d),this.m=a.m}else a&&(l=String(a).match(Su))?(this.h=!1,Ji(this,l[1]||"",!0),this.o=xr(l[2]||""),this.g=xr(l[3]||"",!0),Yi(this,l[4]),this.l=xr(l[5]||"",!0),Cu(this,l[6]||"",!0),this.m=xr(l[7]||"")):(this.h=!1,this.i=new Mr(null,this.h))}Zt.prototype.toString=function(){var a=[],l=this.j;l&&a.push(Or(l,Vu,!0),":");var d=this.g;return(d||l=="file")&&(a.push("//"),(l=this.o)&&a.push(Or(l,Vu,!0),"@"),a.push(encodeURIComponent(String(d)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),d=this.s,d!=null&&a.push(":",String(d))),(d=this.l)&&(this.g&&d.charAt(0)!="/"&&a.push("/"),a.push(Or(d,d.charAt(0)=="/"?Vm:Cm,!0))),(d=this.i.toString())&&a.push("?",d),(d=this.m)&&a.push("#",Or(d,km)),a.join("")};function ct(a){return new Zt(a)}function Ji(a,l,d){a.j=d?xr(l,!0):l,a.j&&(a.j=a.j.replace(/:$/,""))}function Yi(a,l){if(l){if(l=Number(l),isNaN(l)||0>l)throw Error("Bad port number "+l);a.s=l}else a.s=null}function Cu(a,l,d){l instanceof Mr?(a.i=l,Nm(a.i,a.h)):(d||(l=Or(l,Dm)),a.i=new Mr(l,a.h))}function ie(a,l,d){a.i.set(l,d)}function Zi(a){return ie(a,"zx",Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^Date.now()).toString(36)),a}function xr(a,l){return a?l?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function Or(a,l,d){return typeof a=="string"?(a=encodeURI(a).replace(l,Sm),d&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function Sm(a){return a=a.charCodeAt(0),"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var Vu=/[#\/\?@]/g,Cm=/[#\?:]/g,Vm=/[#\?]/g,Dm=/[#\?@]/g,km=/#/g;function Mr(a,l){this.h=this.g=null,this.i=a||null,this.j=!!l}function Rt(a){a.g||(a.g=new Map,a.h=0,a.i&&Pm(a.i,function(l,d){a.add(decodeURIComponent(l.replace(/\+/g," ")),d)}))}r=Mr.prototype,r.add=function(a,l){Rt(this),this.i=null,a=xn(this,a);var d=this.g.get(a);return d||this.g.set(a,d=[]),d.push(l),this.h+=1,this};function Du(a,l){Rt(a),l=xn(a,l),a.g.has(l)&&(a.i=null,a.h-=a.g.get(l).length,a.g.delete(l))}function ku(a,l){return Rt(a),l=xn(a,l),a.g.has(l)}r.forEach=function(a,l){Rt(this),this.g.forEach(function(d,p){d.forEach(function(A){a.call(l,A,p,this)},this)},this)},r.na=function(){Rt(this);const a=Array.from(this.g.values()),l=Array.from(this.g.keys()),d=[];for(let p=0;p<l.length;p++){const A=a[p];for(let P=0;P<A.length;P++)d.push(l[p])}return d},r.V=function(a){Rt(this);let l=[];if(typeof a=="string")ku(this,a)&&(l=l.concat(this.g.get(xn(this,a))));else{a=Array.from(this.g.values());for(let d=0;d<a.length;d++)l=l.concat(a[d])}return l},r.set=function(a,l){return Rt(this),this.i=null,a=xn(this,a),ku(this,a)&&(this.h-=this.g.get(a).length),this.g.set(a,[l]),this.h+=1,this},r.get=function(a,l){return a?(a=this.V(a),0<a.length?String(a[0]):l):l};function Nu(a,l,d){Du(a,l),0<d.length&&(a.i=null,a.g.set(xn(a,l),N(d)),a.h+=d.length)}r.toString=function(){if(this.i)return this.i;if(!this.g)return"";const a=[],l=Array.from(this.g.keys());for(var d=0;d<l.length;d++){var p=l[d];const P=encodeURIComponent(String(p)),x=this.V(p);for(p=0;p<x.length;p++){var A=P;x[p]!==""&&(A+="="+encodeURIComponent(String(x[p]))),a.push(A)}}return this.i=a.join("&")};function xn(a,l){return l=String(l),a.j&&(l=l.toLowerCase()),l}function Nm(a,l){l&&!a.j&&(Rt(a),a.i=null,a.g.forEach(function(d,p){var A=p.toLowerCase();p!=A&&(Du(this,p),Nu(this,A,d))},a)),a.j=l}function xm(a,l){const d=new kr;if(c.Image){const p=new Image;p.onload=b(bt,d,"TestLoadImage: loaded",!0,l,p),p.onerror=b(bt,d,"TestLoadImage: error",!1,l,p),p.onabort=b(bt,d,"TestLoadImage: abort",!1,l,p),p.ontimeout=b(bt,d,"TestLoadImage: timeout",!1,l,p),c.setTimeout(function(){p.ontimeout&&p.ontimeout()},1e4),p.src=a}else l(!1)}function Om(a,l){const d=new kr,p=new AbortController,A=setTimeout(()=>{p.abort(),bt(d,"TestPingServer: timeout",!1,l)},1e4);fetch(a,{signal:p.signal}).then(P=>{clearTimeout(A),P.ok?bt(d,"TestPingServer: ok",!0,l):bt(d,"TestPingServer: server error",!1,l)}).catch(()=>{clearTimeout(A),bt(d,"TestPingServer: error",!1,l)})}function bt(a,l,d,p,A){try{A&&(A.onload=null,A.onerror=null,A.onabort=null,A.ontimeout=null),p(d)}catch{}}function Mm(){this.g=new ym}function Lm(a,l,d){const p=d||"";try{Pu(a,function(A,P){let x=A;h(A)&&(x=Uo(A)),l.push(p+P+"="+encodeURIComponent(x))})}catch(A){throw l.push(p+"type="+encodeURIComponent("_badmap")),A}}function es(a){this.l=a.Ub||null,this.j=a.eb||!1}C(es,Bo),es.prototype.g=function(){return new ts(this.l,this.j)},es.prototype.i=(function(a){return function(){return a}})({});function ts(a,l){be.call(this),this.D=a,this.o=l,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.u=new Headers,this.h=null,this.B="GET",this.A="",this.g=!1,this.v=this.j=this.l=null}C(ts,be),r=ts.prototype,r.open=function(a,l){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.B=a,this.A=l,this.readyState=1,Fr(this)},r.send=function(a){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");this.g=!0;const l={headers:this.u,method:this.B,credentials:this.m,cache:void 0};a&&(l.body=a),(this.D||c).fetch(new Request(this.A,l)).then(this.Sa.bind(this),this.ga.bind(this))},r.abort=function(){this.response=this.responseText="",this.u=new Headers,this.status=0,this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),1<=this.readyState&&this.g&&this.readyState!=4&&(this.g=!1,Lr(this)),this.readyState=0},r.Sa=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,Fr(this)),this.g&&(this.readyState=3,Fr(this),this.g)))if(this.responseType==="arraybuffer")a.arrayBuffer().then(this.Qa.bind(this),this.ga.bind(this));else if(typeof c.ReadableStream<"u"&&"body"in a){if(this.j=a.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.v=new TextDecoder;xu(this)}else a.text().then(this.Ra.bind(this),this.ga.bind(this))};function xu(a){a.j.read().then(a.Pa.bind(a)).catch(a.ga.bind(a))}r.Pa=function(a){if(this.g){if(this.o&&a.value)this.response.push(a.value);else if(!this.o){var l=a.value?a.value:new Uint8Array(0);(l=this.v.decode(l,{stream:!a.done}))&&(this.response=this.responseText+=l)}a.done?Lr(this):Fr(this),this.readyState==3&&xu(this)}},r.Ra=function(a){this.g&&(this.response=this.responseText=a,Lr(this))},r.Qa=function(a){this.g&&(this.response=a,Lr(this))},r.ga=function(){this.g&&Lr(this)};function Lr(a){a.readyState=4,a.l=null,a.j=null,a.v=null,Fr(a)}r.setRequestHeader=function(a,l){this.u.append(a,l)},r.getResponseHeader=function(a){return this.h&&this.h.get(a.toLowerCase())||""},r.getAllResponseHeaders=function(){if(!this.h)return"";const a=[],l=this.h.entries();for(var d=l.next();!d.done;)d=d.value,a.push(d[0]+": "+d[1]),d=l.next();return a.join(`\r
`)};function Fr(a){a.onreadystatechange&&a.onreadystatechange.call(a)}Object.defineProperty(ts.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(a){this.m=a?"include":"same-origin"}});function Ou(a){let l="";return K(a,function(d,p){l+=p,l+=":",l+=d,l+=`\r
`}),l}function Xo(a,l,d){e:{for(p in d){var p=!1;break e}p=!0}p||(d=Ou(d),typeof a=="string"?d!=null&&encodeURIComponent(String(d)):ie(a,l,d))}function de(a){be.call(this),this.headers=new Map,this.o=a||null,this.h=!1,this.v=this.g=null,this.D="",this.m=0,this.l="",this.j=this.B=this.u=this.A=!1,this.I=null,this.H="",this.J=!1}C(de,be);var Fm=/^https?$/i,Um=["POST","PUT"];r=de.prototype,r.Ha=function(a){this.J=a},r.ea=function(a,l,d,p){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+a);l=l?l.toUpperCase():"GET",this.D=a,this.l="",this.m=0,this.A=!1,this.h=!0,this.g=this.o?this.o.g():zo.g(),this.v=this.o?lu(this.o):lu(zo),this.g.onreadystatechange=g(this.Ea,this);try{this.B=!0,this.g.open(l,String(a),!0),this.B=!1}catch(P){Mu(this,P);return}if(a=d||"",d=new Map(this.headers),p)if(Object.getPrototypeOf(p)===Object.prototype)for(var A in p)d.set(A,p[A]);else if(typeof p.keys=="function"&&typeof p.get=="function")for(const P of p.keys())d.set(P,p.get(P));else throw Error("Unknown input type for opt_headers: "+String(p));p=Array.from(d.keys()).find(P=>P.toLowerCase()=="content-type"),A=c.FormData&&a instanceof c.FormData,!(0<=Array.prototype.indexOf.call(Um,l,void 0))||p||A||d.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[P,x]of d)this.g.setRequestHeader(P,x);this.H&&(this.g.responseType=this.H),"withCredentials"in this.g&&this.g.withCredentials!==this.J&&(this.g.withCredentials=this.J);try{Uu(this),this.u=!0,this.g.send(a),this.u=!1}catch(P){Mu(this,P)}};function Mu(a,l){a.h=!1,a.g&&(a.j=!0,a.g.abort(),a.j=!1),a.l=l,a.m=5,Lu(a),ns(a)}function Lu(a){a.A||(a.A=!0,ke(a,"complete"),ke(a,"error"))}r.abort=function(a){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.m=a||7,ke(this,"complete"),ke(this,"abort"),ns(this))},r.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),ns(this,!0)),de.aa.N.call(this)},r.Ea=function(){this.s||(this.B||this.u||this.j?Fu(this):this.bb())},r.bb=function(){Fu(this)};function Fu(a){if(a.h&&typeof o<"u"&&(!a.v[1]||ut(a)!=4||a.Z()!=2)){if(a.u&&ut(a)==4)ou(a.Ea,0,a);else if(ke(a,"readystatechange"),ut(a)==4){a.h=!1;try{const x=a.Z();e:switch(x){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var l=!0;break e;default:l=!1}var d;if(!(d=l)){var p;if(p=x===0){var A=String(a.D).match(Su)[1]||null;!A&&c.self&&c.self.location&&(A=c.self.location.protocol.slice(0,-1)),p=!Fm.test(A?A.toLowerCase():"")}d=p}if(d)ke(a,"complete"),ke(a,"success");else{a.m=6;try{var P=2<ut(a)?a.g.statusText:""}catch{P=""}a.l=P+" ["+a.Z()+"]",Lu(a)}}finally{ns(a)}}}}function ns(a,l){if(a.g){Uu(a);const d=a.g,p=a.v[0]?()=>{}:null;a.g=null,a.v=null,l||ke(a,"ready");try{d.onreadystatechange=p}catch{}}}function Uu(a){a.I&&(c.clearTimeout(a.I),a.I=null)}r.isActive=function(){return!!this.g};function ut(a){return a.g?a.g.readyState:0}r.Z=function(){try{return 2<ut(this)?this.g.status:-1}catch{return-1}},r.oa=function(){try{return this.g?this.g.responseText:""}catch{return""}},r.Oa=function(a){if(this.g){var l=this.g.responseText;return a&&l.indexOf(a)==0&&(l=l.substring(a.length)),_m(l)}};function Bu(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.H){case"":case"text":return a.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch{return null}}function Bm(a){const l={};a=(a.g&&2<=ut(a)&&a.g.getAllResponseHeaders()||"").split(`\r
`);for(let p=0;p<a.length;p++){if(B(a[p]))continue;var d=T(a[p]);const A=d[0];if(d=d[1],typeof d!="string")continue;d=d.trim();const P=l[A]||[];l[A]=P,P.push(d)}v(l,function(p){return p.join(", ")})}r.Ba=function(){return this.m},r.Ka=function(){return typeof this.l=="string"?this.l:String(this.l)};function Ur(a,l,d){return d&&d.internalChannelParams&&d.internalChannelParams[a]||l}function ju(a){this.Aa=0,this.i=[],this.j=new kr,this.ia=this.qa=this.I=this.W=this.g=this.ya=this.D=this.H=this.m=this.S=this.o=null,this.Ya=this.U=0,this.Va=Ur("failFast",!1,a),this.F=this.C=this.u=this.s=this.l=null,this.X=!0,this.za=this.T=-1,this.Y=this.v=this.B=0,this.Ta=Ur("baseRetryDelayMs",5e3,a),this.cb=Ur("retryDelaySeedMs",1e4,a),this.Wa=Ur("forwardChannelMaxRetries",2,a),this.wa=Ur("forwardChannelRequestTimeoutMs",2e4,a),this.pa=a&&a.xmlHttpFactory||void 0,this.Xa=a&&a.Tb||void 0,this.Ca=a&&a.useFetchStreams||!1,this.L=void 0,this.J=a&&a.supportsCrossDomainXhr||!1,this.K="",this.h=new Tu(a&&a.concurrentRequestLimit),this.Da=new Mm,this.P=a&&a.fastHandshake||!1,this.O=a&&a.encodeInitMessageHeaders||!1,this.P&&this.O&&(this.O=!1),this.Ua=a&&a.Rb||!1,a&&a.xa&&this.j.xa(),a&&a.forceLongPolling&&(this.X=!1),this.ba=!this.P&&this.X&&a&&a.detectBufferingProxy||!1,this.ja=void 0,a&&a.longPollingTimeout&&0<a.longPollingTimeout&&(this.ja=a.longPollingTimeout),this.ca=void 0,this.R=0,this.M=!1,this.ka=this.A=null}r=ju.prototype,r.la=8,r.G=1,r.connect=function(a,l,d,p){Ne(0),this.W=a,this.H=l||{},d&&p!==void 0&&(this.H.OSID=d,this.H.OAID=p),this.F=this.X,this.I=Xu(this,null,this.W),is(this)};function Jo(a){if(qu(a),a.G==3){var l=a.U++,d=ct(a.I);if(ie(d,"SID",a.K),ie(d,"RID",l),ie(d,"TYPE","terminate"),Br(a,d),l=new At(a,a.j,l),l.L=2,l.v=Zi(ct(d)),d=!1,c.navigator&&c.navigator.sendBeacon)try{d=c.navigator.sendBeacon(l.v.toString(),"")}catch{}!d&&c.Image&&(new Image().src=l.v,d=!0),d||(l.g=Ju(l.j,null),l.g.ea(l.v)),l.F=Date.now(),Xi(l)}Qu(a)}function rs(a){a.g&&(Zo(a),a.g.cancel(),a.g=null)}function qu(a){rs(a),a.u&&(c.clearTimeout(a.u),a.u=null),ss(a),a.h.cancel(),a.s&&(typeof a.s=="number"&&c.clearTimeout(a.s),a.s=null)}function is(a){if(!wu(a.h)&&!a.s){a.s=!0;var l=a.Ga;Rr||tu(),br||(Rr(),br=!0),Do.add(l,a),a.B=0}}function jm(a,l){return Au(a.h)>=a.h.j-(a.s?1:0)?!1:a.s?(a.i=l.D.concat(a.i),!0):a.G==1||a.G==2||a.B>=(a.Va?0:a.Wa)?!1:(a.s=Dr(g(a.Ga,a,l),Hu(a,a.B)),a.B++,!0)}r.Ga=function(a){if(this.s)if(this.s=null,this.G==1){if(!a){this.U=Math.floor(1e5*Math.random()),a=this.U++;const A=new At(this,this.j,a);let P=this.o;if(this.S&&(P?(P=_(P),E(P,this.S)):P=this.S),this.m!==null||this.O||(A.H=P,P=null),this.P)e:{for(var l=0,d=0;d<this.i.length;d++){t:{var p=this.i[d];if("__data__"in p.map&&(p=p.map.__data__,typeof p=="string")){p=p.length;break t}p=void 0}if(p===void 0)break;if(l+=p,4096<l){l=d;break e}if(l===4096||d===this.i.length-1){l=d+1;break e}}l=1e3}else l=1e3;l=$u(this,A,l),d=ct(this.I),ie(d,"RID",a),ie(d,"CVER",22),this.D&&ie(d,"X-HTTP-Session-Id",this.D),Br(this,d),P&&(this.O?l="headers="+encodeURIComponent(String(Ou(P)))+"&"+l:this.m&&Xo(d,this.m,P)),Qo(this.h,A),this.Ua&&ie(d,"TYPE","init"),this.P?(ie(d,"$req",l),ie(d,"SID","null"),A.T=!0,Go(A,d,null)):Go(A,d,l),this.G=2}}else this.G==3&&(a?zu(this,a):this.i.length==0||wu(this.h)||zu(this))};function zu(a,l){var d;l?d=l.l:d=a.U++;const p=ct(a.I);ie(p,"SID",a.K),ie(p,"RID",d),ie(p,"AID",a.T),Br(a,p),a.m&&a.o&&Xo(p,a.m,a.o),d=new At(a,a.j,d,a.B+1),a.m===null&&(d.H=a.o),l&&(a.i=l.D.concat(a.i)),l=$u(a,d,1e3),d.I=Math.round(.5*a.wa)+Math.round(.5*a.wa*Math.random()),Qo(a.h,d),Go(d,p,l)}function Br(a,l){a.H&&K(a.H,function(d,p){ie(l,p,d)}),a.l&&Pu({},function(d,p){ie(l,p,d)})}function $u(a,l,d){d=Math.min(a.i.length,d);var p=a.l?g(a.l.Na,a.l,a):null;e:{var A=a.i;let P=-1;for(;;){const x=["count="+d];P==-1?0<d?(P=A[0].g,x.push("ofs="+P)):P=0:x.push("ofs="+P);let re=!0;for(let Ee=0;Ee<d;Ee++){let Y=A[Ee].g;const Pe=A[Ee].map;if(Y-=P,0>Y)P=Math.max(0,A[Ee].g-100),re=!1;else try{Lm(Pe,x,"req"+Y+"_")}catch{p&&p(Pe)}}if(re){p=x.join("&");break e}}}return a=a.i.splice(0,d),l.D=a,p}function Gu(a){if(!a.g&&!a.u){a.Y=1;var l=a.Fa;Rr||tu(),br||(Rr(),br=!0),Do.add(l,a),a.v=0}}function Yo(a){return a.g||a.u||3<=a.v?!1:(a.Y++,a.u=Dr(g(a.Fa,a),Hu(a,a.v)),a.v++,!0)}r.Fa=function(){if(this.u=null,Ku(this),this.ba&&!(this.M||this.g==null||0>=this.R)){var a=2*this.R;this.j.info("BP detection timer enabled: "+a),this.A=Dr(g(this.ab,this),a)}},r.ab=function(){this.A&&(this.A=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.M=!0,Ne(10),rs(this),Ku(this))};function Zo(a){a.A!=null&&(c.clearTimeout(a.A),a.A=null)}function Ku(a){a.g=new At(a,a.j,"rpc",a.Y),a.m===null&&(a.g.H=a.o),a.g.O=0;var l=ct(a.qa);ie(l,"RID","rpc"),ie(l,"SID",a.K),ie(l,"AID",a.T),ie(l,"CI",a.F?"0":"1"),!a.F&&a.ja&&ie(l,"TO",a.ja),ie(l,"TYPE","xmlhttp"),Br(a,l),a.m&&a.o&&Xo(l,a.m,a.o),a.L&&(a.g.I=a.L);var d=a.g;a=a.ia,d.L=1,d.v=Zi(ct(l)),d.m=null,d.P=!0,Iu(d,a)}r.Za=function(){this.C!=null&&(this.C=null,rs(this),Yo(this),Ne(19))};function ss(a){a.C!=null&&(c.clearTimeout(a.C),a.C=null)}function Wu(a,l){var d=null;if(a.g==l){ss(a),Zo(a),a.g=null;var p=2}else if(Ho(a.h,l))d=l.D,Ru(a.h,l),p=1;else return;if(a.G!=0){if(l.o)if(p==1){d=l.m?l.m.length:0,l=Date.now()-l.F;var A=a.B;p=Wi(),ke(p,new mu(p,d)),is(a)}else Gu(a);else if(A=l.s,A==3||A==0&&0<l.X||!(p==1&&jm(a,l)||p==2&&Yo(a)))switch(d&&0<d.length&&(l=a.h,l.i=l.i.concat(d)),A){case 1:en(a,5);break;case 4:en(a,10);break;case 3:en(a,6);break;default:en(a,2)}}}function Hu(a,l){let d=a.Ta+Math.floor(Math.random()*a.cb);return a.isActive()||(d*=2),d*l}function en(a,l){if(a.j.info("Error code "+l),l==2){var d=g(a.fb,a),p=a.Xa;const A=!p;p=new Zt(p||"//www.google.com/images/cleardot.gif"),c.location&&c.location.protocol=="http"||Ji(p,"https"),Zi(p),A?xm(p.toString(),d):Om(p.toString(),d)}else Ne(2);a.G=0,a.l&&a.l.sa(l),Qu(a),qu(a)}r.fb=function(a){a?(this.j.info("Successfully pinged google.com"),Ne(2)):(this.j.info("Failed to ping google.com"),Ne(1))};function Qu(a){if(a.G=0,a.ka=[],a.l){const l=bu(a.h);(l.length!=0||a.i.length!=0)&&(D(a.ka,l),D(a.ka,a.i),a.h.i.length=0,N(a.i),a.i.length=0),a.l.ra()}}function Xu(a,l,d){var p=d instanceof Zt?ct(d):new Zt(d);if(p.g!="")l&&(p.g=l+"."+p.g),Yi(p,p.s);else{var A=c.location;p=A.protocol,l=l?l+"."+A.hostname:A.hostname,A=+A.port;var P=new Zt(null);p&&Ji(P,p),l&&(P.g=l),A&&Yi(P,A),d&&(P.l=d),p=P}return d=a.D,l=a.ya,d&&l&&ie(p,d,l),ie(p,"VER",a.la),Br(a,p),p}function Ju(a,l,d){if(l&&!a.J)throw Error("Can't create secondary domain capable XhrIo object.");return l=a.Ca&&!a.pa?new de(new es({eb:d})):new de(a.pa),l.Ha(a.J),l}r.isActive=function(){return!!this.l&&this.l.isActive(this)};function Yu(){}r=Yu.prototype,r.ua=function(){},r.ta=function(){},r.sa=function(){},r.ra=function(){},r.isActive=function(){return!0},r.Na=function(){};function os(){}os.prototype.g=function(a,l){return new Me(a,l)};function Me(a,l){be.call(this),this.g=new ju(l),this.l=a,this.h=l&&l.messageUrlParams||null,a=l&&l.messageHeaders||null,l&&l.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"}),this.g.o=a,a=l&&l.initMessageHeaders||null,l&&l.messageContentType&&(a?a["X-WebChannel-Content-Type"]=l.messageContentType:a={"X-WebChannel-Content-Type":l.messageContentType}),l&&l.va&&(a?a["X-WebChannel-Client-Profile"]=l.va:a={"X-WebChannel-Client-Profile":l.va}),this.g.S=a,(a=l&&l.Sb)&&!B(a)&&(this.g.m=a),this.v=l&&l.supportsCrossDomainXhr||!1,this.u=l&&l.sendRawJson||!1,(l=l&&l.httpSessionIdParam)&&!B(l)&&(this.g.D=l,a=this.h,a!==null&&l in a&&(a=this.h,l in a&&delete a[l])),this.j=new On(this)}C(Me,be),Me.prototype.m=function(){this.g.l=this.j,this.v&&(this.g.J=!0),this.g.connect(this.l,this.h||void 0)},Me.prototype.close=function(){Jo(this.g)},Me.prototype.o=function(a){var l=this.g;if(typeof a=="string"){var d={};d.__data__=a,a=d}else this.u&&(d={},d.__data__=Uo(a),a=d);l.i.push(new Am(l.Ya++,a)),l.G==3&&is(l)},Me.prototype.N=function(){this.g.l=null,delete this.j,Jo(this.g),delete this.g,Me.aa.N.call(this)};function Zu(a){jo.call(this),a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var l=a.__sm__;if(l){e:{for(const d in l){a=d;break e}a=void 0}(this.i=a)&&(a=this.i,l=l!==null&&a in l?l[a]:void 0),this.data=l}else this.data=a}C(Zu,jo);function el(){qo.call(this),this.status=1}C(el,qo);function On(a){this.g=a}C(On,Yu),On.prototype.ua=function(){ke(this.g,"a")},On.prototype.ta=function(a){ke(this.g,new Zu(a))},On.prototype.sa=function(a){ke(this.g,new el)},On.prototype.ra=function(){ke(this.g,"b")},os.prototype.createWebChannel=os.prototype.g,Me.prototype.send=Me.prototype.o,Me.prototype.open=Me.prototype.m,Me.prototype.close=Me.prototype.close,Id=function(){return new os},yd=function(){return Wi()},_d=Jt,pa={mb:0,pb:1,qb:2,Jb:3,Ob:4,Lb:5,Mb:6,Kb:7,Ib:8,Nb:9,PROXY:10,NOPROXY:11,Gb:12,Cb:13,Db:14,Bb:15,Eb:16,Fb:17,ib:18,hb:19,jb:20},Hi.NO_ERROR=0,Hi.TIMEOUT=8,Hi.HTTP_ERROR=6,gs=Hi,gu.COMPLETE="complete",gd=gu,hu.EventType=Cr,Cr.OPEN="a",Cr.CLOSE="b",Cr.ERROR="c",Cr.MESSAGE="d",be.prototype.listen=be.prototype.K,Hr=hu,de.prototype.listenOnce=de.prototype.L,de.prototype.getLastError=de.prototype.Ka,de.prototype.getLastErrorCode=de.prototype.Ba,de.prototype.getStatus=de.prototype.Z,de.prototype.getResponseJson=de.prototype.Oa,de.prototype.getResponseText=de.prototype.oa,de.prototype.send=de.prototype.ea,de.prototype.setWithCredentials=de.prototype.Ha,md=de}).apply(typeof cs<"u"?cs:typeof self<"u"?self:typeof window<"u"?window:{});const ll="@firebase/firestore",hl="4.8.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Te{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}Te.UNAUTHENTICATED=new Te(null),Te.GOOGLE_CREDENTIALS=new Te("google-credentials-uid"),Te.FIRST_PARTY=new Te("first-party-uid"),Te.MOCK_USER=new Te("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let gr="11.10.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const mn=new $a("@firebase/firestore");function zn(){return mn.logLevel}function V(r,...e){if(mn.logLevel<=H.DEBUG){const t=e.map(Ka);mn.debug(`Firestore (${gr}): ${r}`,...t)}}function xe(r,...e){if(mn.logLevel<=H.ERROR){const t=e.map(Ka);mn.error(`Firestore (${gr}): ${r}`,...t)}}function rt(r,...e){if(mn.logLevel<=H.WARN){const t=e.map(Ka);mn.warn(`Firestore (${gr}): ${r}`,...t)}}function Ka(r){if(typeof r=="string")return r;try{/**
* @license
* Copyright 2020 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/return(function(t){return JSON.stringify(t)})(r)}catch{return r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function M(r,e,t){let n="Unexpected state";typeof e=="string"?n=e:t=e,vd(r,n,t)}function vd(r,e,t){let n=`FIRESTORE (${gr}) INTERNAL ASSERTION FAILED: ${e} (ID: ${r.toString(16)})`;if(t!==void 0)try{n+=" CONTEXT: "+JSON.stringify(t)}catch{n+=" CONTEXT: "+t}throw xe(n),new Error(n)}function L(r,e,t,n){let i="Unexpected state";typeof t=="string"?i=t:n=t,r||vd(e,i,n)}function z(r,e){return r}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const S={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class k extends vt{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class He{constructor(){this.promise=new Promise(((e,t)=>{this.resolve=e,this.reject=t}))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ed{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class d_{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable((()=>t(Te.UNAUTHENTICATED)))}shutdown(){}}class f_{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,t){this.changeListener=t,e.enqueueRetryable((()=>t(this.token.user)))}shutdown(){this.changeListener=null}}class p_{constructor(e){this.t=e,this.currentUser=Te.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,t){L(this.o===void 0,42304);let n=this.i;const i=u=>this.i!==n?(n=this.i,t(u)):Promise.resolve();let s=new He;this.o=()=>{this.i++,this.currentUser=this.u(),s.resolve(),s=new He,e.enqueueRetryable((()=>i(this.currentUser)))};const o=()=>{const u=s;e.enqueueRetryable((async()=>{await u.promise,await i(this.currentUser)}))},c=u=>{V("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=u,this.o&&(this.auth.addAuthTokenListener(this.o),o())};this.t.onInit((u=>c(u))),setTimeout((()=>{if(!this.auth){const u=this.t.getImmediate({optional:!0});u?c(u):(V("FirebaseAuthCredentialsProvider","Auth not yet detected"),s.resolve(),s=new He)}}),0),o()}getToken(){const e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then((n=>this.i!==e?(V("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):n?(L(typeof n.accessToken=="string",31837,{l:n}),new Ed(n.accessToken,this.currentUser)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return L(e===null||typeof e=="string",2055,{h:e}),new Te(e)}}class m_{constructor(e,t,n){this.P=e,this.T=t,this.I=n,this.type="FirstParty",this.user=Te.FIRST_PARTY,this.A=new Map}R(){return this.I?this.I():null}get headers(){this.A.set("X-Goog-AuthUser",this.P);const e=this.R();return e&&this.A.set("Authorization",e),this.T&&this.A.set("X-Goog-Iam-Authorization-Token",this.T),this.A}}class g_{constructor(e,t,n){this.P=e,this.T=t,this.I=n}getToken(){return Promise.resolve(new m_(this.P,this.T,this.I))}start(e,t){e.enqueueRetryable((()=>t(Te.FIRST_PARTY)))}shutdown(){}invalidateToken(){}}class dl{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class __{constructor(e,t){this.V=t,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,je(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,t){L(this.o===void 0,3512);const n=s=>{s.error!=null&&V("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${s.error.message}`);const o=s.token!==this.m;return this.m=s.token,V("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?t(s.token):Promise.resolve()};this.o=s=>{e.enqueueRetryable((()=>n(s)))};const i=s=>{V("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=s,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit((s=>i(s))),setTimeout((()=>{if(!this.appCheck){const s=this.V.getImmediate({optional:!0});s?i(s):V("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}}),0)}getToken(){if(this.p)return Promise.resolve(new dl(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then((t=>t?(L(typeof t.token=="string",44558,{tokenResult:t}),this.m=t.token,new dl(t.token)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function y_(r){const e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(r);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let n=0;n<r;n++)t[n]=Math.floor(256*Math.random());return t}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Td(){return new TextEncoder}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wa{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=62*Math.floor(4.129032258064516);let n="";for(;n.length<20;){const i=y_(40);for(let s=0;s<i.length;++s)n.length<20&&i[s]<t&&(n+=e.charAt(i[s]%62))}return n}}function q(r,e){return r<e?-1:r>e?1:0}function ma(r,e){let t=0;for(;t<r.length&&t<e.length;){const n=r.codePointAt(t),i=e.codePointAt(t);if(n!==i){if(n<128&&i<128)return q(n,i);{const s=Td(),o=I_(s.encode(fl(r,t)),s.encode(fl(e,t)));return o!==0?o:q(n,i)}}t+=n>65535?2:1}return q(r.length,e.length)}function fl(r,e){return r.codePointAt(e)>65535?r.substring(e,e+2):r.substring(e,e+1)}function I_(r,e){for(let t=0;t<r.length&&t<e.length;++t)if(r[t]!==e[t])return q(r[t],e[t]);return q(r.length,e.length)}function tr(r,e,t){return r.length===e.length&&r.every(((n,i)=>t(n,e[i])))}function wd(r){return r+"\0"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pl="__name__";class Xe{constructor(e,t,n){t===void 0?t=0:t>e.length&&M(637,{offset:t,range:e.length}),n===void 0?n=e.length-t:n>e.length-t&&M(1746,{length:n,range:e.length-t}),this.segments=e,this.offset=t,this.len=n}get length(){return this.len}isEqual(e){return Xe.comparator(this,e)===0}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof Xe?e.forEach((n=>{t.push(n)})):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,n=this.limit();t<n;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const n=Math.min(e.length,t.length);for(let i=0;i<n;i++){const s=Xe.compareSegments(e.get(i),t.get(i));if(s!==0)return s}return q(e.length,t.length)}static compareSegments(e,t){const n=Xe.isNumericId(e),i=Xe.isNumericId(t);return n&&!i?-1:!n&&i?1:n&&i?Xe.extractNumericId(e).compare(Xe.extractNumericId(t)):ma(e,t)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return Bt.fromString(e.substring(4,e.length-2))}}class J extends Xe{construct(e,t,n){return new J(e,t,n)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const n of e){if(n.indexOf("//")>=0)throw new k(S.INVALID_ARGUMENT,`Invalid segment (${n}). Paths must not contain // in them.`);t.push(...n.split("/").filter((i=>i.length>0)))}return new J(t)}static emptyPath(){return new J([])}}const v_=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class le extends Xe{construct(e,t,n){return new le(e,t,n)}static isValidIdentifier(e){return v_.test(e)}canonicalString(){return this.toArray().map((e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),le.isValidIdentifier(e)||(e="`"+e+"`"),e))).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===pl}static keyField(){return new le([pl])}static fromServerFormat(e){const t=[];let n="",i=0;const s=()=>{if(n.length===0)throw new k(S.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(n),n=""};let o=!1;for(;i<e.length;){const c=e[i];if(c==="\\"){if(i+1===e.length)throw new k(S.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const u=e[i+1];if(u!=="\\"&&u!=="."&&u!=="`")throw new k(S.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);n+=u,i+=2}else c==="`"?(o=!o,i++):c!=="."||o?(n+=c,i++):(s(),i++)}if(s(),o)throw new k(S.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new le(t)}static emptyPath(){return new le([])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class O{constructor(e){this.path=e}static fromPath(e){return new O(J.fromString(e))}static fromName(e){return new O(J.fromString(e).popFirst(5))}static empty(){return new O(J.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&J.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,t){return J.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new O(new J(e.slice()))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ha(r,e,t){if(!t)throw new k(S.INVALID_ARGUMENT,`Function ${r}() cannot be called with an empty ${e}.`)}function E_(r,e,t,n){if(e===!0&&n===!0)throw new k(S.INVALID_ARGUMENT,`${r} and ${t} cannot be used together.`)}function ml(r){if(!O.isDocumentKey(r))throw new k(S.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${r} has ${r.length}.`)}function gl(r){if(O.isDocumentKey(r))throw new k(S.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${r} has ${r.length}.`)}function Ad(r){return typeof r=="object"&&r!==null&&(Object.getPrototypeOf(r)===Object.prototype||Object.getPrototypeOf(r)===null)}function io(r){if(r===void 0)return"undefined";if(r===null)return"null";if(typeof r=="string")return r.length>20&&(r=`${r.substring(0,20)}...`),JSON.stringify(r);if(typeof r=="number"||typeof r=="boolean")return""+r;if(typeof r=="object"){if(r instanceof Array)return"an array";{const e=(function(n){return n.constructor?n.constructor.name:null})(r);return e?`a custom ${e} object`:"an object"}}return typeof r=="function"?"a function":M(12329,{type:typeof r})}function Ie(r,e){if("_delegate"in r&&(r=r._delegate),!(r instanceof e)){if(e.name===r.constructor.name)throw new k(S.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const t=io(r);throw new k(S.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return r}function T_(r,e){if(e<=0)throw new k(S.INVALID_ARGUMENT,`Function ${r}() requires a positive number, but it was: ${e}.`)}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pe(r,e){const t={typeString:r};return e&&(t.value=e),t}function bi(r,e){if(!Ad(r))throw new k(S.INVALID_ARGUMENT,"JSON must be an object");let t;for(const n in e)if(e[n]){const i=e[n].typeString,s="value"in e[n]?{value:e[n].value}:void 0;if(!(n in r)){t=`JSON missing required field: '${n}'`;break}const o=r[n];if(i&&typeof o!==i){t=`JSON field '${n}' must be a ${i}.`;break}if(s!==void 0&&o!==s.value){t=`Expected '${n}' field to equal '${s.value}'`;break}}if(t)throw new k(S.INVALID_ARGUMENT,t);return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _l=-62135596800,yl=1e6;class ee{static now(){return ee.fromMillis(Date.now())}static fromDate(e){return ee.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),n=Math.floor((e-1e3*t)*yl);return new ee(t,n)}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new k(S.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new k(S.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<_l)throw new k(S.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new k(S.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/yl}_compareTo(e){return this.seconds===e.seconds?q(this.nanoseconds,e.nanoseconds):q(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:ee._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(bi(e,ee._jsonSchema))return new ee(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-_l;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}ee._jsonSchemaVersion="firestore/timestamp/1.0",ee._jsonSchema={type:pe("string",ee._jsonSchemaVersion),seconds:pe("number"),nanoseconds:pe("number")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class U{static fromTimestamp(e){return new U(e)}static min(){return new U(new ee(0,0))}static max(){return new U(new ee(253402300799,999999999))}constructor(e){this.timestamp=e}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ui=-1;class xs{constructor(e,t,n,i){this.indexId=e,this.collectionGroup=t,this.fields=n,this.indexState=i}}function ga(r){return r.fields.find((e=>e.kind===2))}function rn(r){return r.fields.filter((e=>e.kind!==2))}xs.UNKNOWN_ID=-1;class _s{constructor(e,t){this.fieldPath=e,this.kind=t}}class li{constructor(e,t){this.sequenceNumber=e,this.offset=t}static empty(){return new li(0,Be.min())}}function w_(r,e){const t=r.toTimestamp().seconds,n=r.toTimestamp().nanoseconds+1,i=U.fromTimestamp(n===1e9?new ee(t+1,0):new ee(t,n));return new Be(i,O.empty(),e)}function Rd(r){return new Be(r.readTime,r.key,ui)}class Be{constructor(e,t,n){this.readTime=e,this.documentKey=t,this.largestBatchId=n}static min(){return new Be(U.min(),O.empty(),ui)}static max(){return new Be(U.max(),O.empty(),ui)}}function Qa(r,e){let t=r.readTime.compareTo(e.readTime);return t!==0?t:(t=O.comparator(r.documentKey,e.documentKey),t!==0?t:q(r.largestBatchId,e.largestBatchId))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bd="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class Pd{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach((e=>e()))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Pn(r){if(r.code!==S.FAILED_PRECONDITION||r.message!==bd)throw r;V("LocalStore","Unexpectedly lost primary lease")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class w{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e((t=>{this.isDone=!0,this.result=t,this.nextCallback&&this.nextCallback(t)}),(t=>{this.isDone=!0,this.error=t,this.catchCallback&&this.catchCallback(t)}))}catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&M(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new w(((n,i)=>{this.nextCallback=s=>{this.wrapSuccess(e,s).next(n,i)},this.catchCallback=s=>{this.wrapFailure(t,s).next(n,i)}}))}toPromise(){return new Promise(((e,t)=>{this.next(e,t)}))}wrapUserFunction(e){try{const t=e();return t instanceof w?t:w.resolve(t)}catch(t){return w.reject(t)}}wrapSuccess(e,t){return e?this.wrapUserFunction((()=>e(t))):w.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction((()=>e(t))):w.reject(t)}static resolve(e){return new w(((t,n)=>{t(e)}))}static reject(e){return new w(((t,n)=>{n(e)}))}static waitFor(e){return new w(((t,n)=>{let i=0,s=0,o=!1;e.forEach((c=>{++i,c.next((()=>{++s,o&&s===i&&t()}),(u=>n(u)))})),o=!0,s===i&&t()}))}static or(e){let t=w.resolve(!1);for(const n of e)t=t.next((i=>i?w.resolve(i):n()));return t}static forEach(e,t){const n=[];return e.forEach(((i,s)=>{n.push(t.call(this,i,s))})),this.waitFor(n)}static mapArray(e,t){return new w(((n,i)=>{const s=e.length,o=new Array(s);let c=0;for(let u=0;u<s;u++){const h=u;t(e[h]).next((f=>{o[h]=f,++c,c===s&&n(o)}),(f=>i(f)))}}))}static doWhile(e,t){return new w(((n,i)=>{const s=()=>{e()===!0?t().next((()=>{s()}),i):n()};s()}))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Le="SimpleDb";class so{static open(e,t,n,i){try{return new so(t,e.transaction(i,n))}catch(s){throw new Zr(t,s)}}constructor(e,t){this.action=e,this.transaction=t,this.aborted=!1,this.S=new He,this.transaction.oncomplete=()=>{this.S.resolve()},this.transaction.onabort=()=>{t.error?this.S.reject(new Zr(e,t.error)):this.S.resolve()},this.transaction.onerror=n=>{const i=Xa(n.target.error);this.S.reject(new Zr(e,i))}}get D(){return this.S.promise}abort(e){e&&this.S.reject(e),this.aborted||(V(Le,"Aborting transaction:",e?e.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}v(){const e=this.transaction;this.aborted||typeof e.commit!="function"||e.commit()}store(e){const t=this.transaction.objectStore(e);return new R_(t)}}class jt{static delete(e){return V(Le,"Removing database:",e),on(td().indexedDB.deleteDatabase(e)).toPromise()}static C(){if(!ld())return!1;if(jt.F())return!0;const e=ge(),t=jt.M(e),n=0<t&&t<10,i=Sd(e),s=0<i&&i<4.5;return!(e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0||e.indexOf("Edge/")>0||n||s)}static F(){var e;return typeof process<"u"&&((e=process.__PRIVATE_env)===null||e===void 0?void 0:e.O)==="YES"}static N(e,t){return e.store(t)}static M(e){const t=e.match(/i(?:phone|pad|pod) os ([\d_]+)/i),n=t?t[1].split("_").slice(0,2).join("."):"-1";return Number(n)}constructor(e,t,n){this.name=e,this.version=t,this.B=n,this.L=null,jt.M(ge())===12.2&&xe("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}async k(e){return this.db||(V(Le,"Opening database:",this.name),this.db=await new Promise(((t,n)=>{const i=indexedDB.open(this.name,this.version);i.onsuccess=s=>{const o=s.target.result;t(o)},i.onblocked=()=>{n(new Zr(e,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},i.onerror=s=>{const o=s.target.error;o.name==="VersionError"?n(new k(S.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):o.name==="InvalidStateError"?n(new k(S.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+o)):n(new Zr(e,o))},i.onupgradeneeded=s=>{V(Le,'Database "'+this.name+'" requires upgrade from version:',s.oldVersion);const o=s.target.result;if(this.L!==null&&this.L!==s.oldVersion)throw new Error(`refusing to open IndexedDB database due to potential corruption of the IndexedDB database data; this corruption could be caused by clicking the "clear site data" button in a web browser; try reloading the web page to re-initialize the IndexedDB database: lastClosedDbVersion=${this.L}, event.oldVersion=${s.oldVersion}, event.newVersion=${s.newVersion}, db.version=${o.version}`);this.B.q(o,i.transaction,s.oldVersion,this.version).next((()=>{V(Le,"Database upgrade to version "+this.version+" complete")}))}})),this.db.addEventListener("close",(t=>{const n=t.target;this.L=n.version}),{passive:!0})),this.db.addEventListener("versionchange",(t=>{var n;t.newVersion===null&&(rt('Received "versionchange" event with newVersion===null; notifying the registered DatabaseDeletedListener, if any'),(n=this.databaseDeletedListener)===null||n===void 0||n.call(this))}),{passive:!0}),this.db}setDatabaseDeletedListener(e){if(this.databaseDeletedListener)throw new Error("setDatabaseDeletedListener() may only be called once, and it has already been called");this.databaseDeletedListener=e}async runTransaction(e,t,n,i){const s=t==="readonly";let o=0;for(;;){++o;try{this.db=await this.k(e);const c=so.open(this.db,e,s?"readonly":"readwrite",n),u=i(c).next((h=>(c.v(),h))).catch((h=>(c.abort(h),w.reject(h)))).toPromise();return u.catch((()=>{})),await c.D,u}catch(c){const u=c,h=u.name!=="FirebaseError"&&o<3;if(V(Le,"Transaction failed with error:",u.message,"Retrying:",h),this.close(),!h)return Promise.reject(u)}}}close(){this.db&&this.db.close(),this.db=void 0}}function Sd(r){const e=r.match(/Android ([\d.]+)/i),t=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(t)}class A_{constructor(e){this.$=e,this.U=!1,this.K=null}get isDone(){return this.U}get W(){return this.K}set cursor(e){this.$=e}done(){this.U=!0}G(e){this.K=e}delete(){return on(this.$.delete())}}class Zr extends k{constructor(e,t){super(S.UNAVAILABLE,`IndexedDB transaction '${e}' failed: ${t}`),this.name="IndexedDbTransactionError"}}function Ht(r){return r.name==="IndexedDbTransactionError"}class R_{constructor(e){this.store=e}put(e,t){let n;return t!==void 0?(V(Le,"PUT",this.store.name,e,t),n=this.store.put(t,e)):(V(Le,"PUT",this.store.name,"<auto-key>",e),n=this.store.put(e)),on(n)}add(e){return V(Le,"ADD",this.store.name,e,e),on(this.store.add(e))}get(e){return on(this.store.get(e)).next((t=>(t===void 0&&(t=null),V(Le,"GET",this.store.name,e,t),t)))}delete(e){return V(Le,"DELETE",this.store.name,e),on(this.store.delete(e))}count(){return V(Le,"COUNT",this.store.name),on(this.store.count())}j(e,t){const n=this.options(e,t),i=n.index?this.store.index(n.index):this.store;if(typeof i.getAll=="function"){const s=i.getAll(n.range);return new w(((o,c)=>{s.onerror=u=>{c(u.target.error)},s.onsuccess=u=>{o(u.target.result)}}))}{const s=this.cursor(n),o=[];return this.J(s,((c,u)=>{o.push(u)})).next((()=>o))}}H(e,t){const n=this.store.getAll(e,t===null?void 0:t);return new w(((i,s)=>{n.onerror=o=>{s(o.target.error)},n.onsuccess=o=>{i(o.target.result)}}))}Y(e,t){V(Le,"DELETE ALL",this.store.name);const n=this.options(e,t);n.Z=!1;const i=this.cursor(n);return this.J(i,((s,o,c)=>c.delete()))}X(e,t){let n;t?n=e:(n={},t=e);const i=this.cursor(n);return this.J(i,t)}ee(e){const t=this.cursor({});return new w(((n,i)=>{t.onerror=s=>{const o=Xa(s.target.error);i(o)},t.onsuccess=s=>{const o=s.target.result;o?e(o.primaryKey,o.value).next((c=>{c?o.continue():n()})):n()}}))}J(e,t){const n=[];return new w(((i,s)=>{e.onerror=o=>{s(o.target.error)},e.onsuccess=o=>{const c=o.target.result;if(!c)return void i();const u=new A_(c),h=t(c.primaryKey,c.value,u);if(h instanceof w){const f=h.catch((m=>(u.done(),w.reject(m))));n.push(f)}u.isDone?i():u.W===null?c.continue():c.continue(u.W)}})).next((()=>w.waitFor(n)))}options(e,t){let n;return e!==void 0&&(typeof e=="string"?n=e:t=e),{index:n,range:t}}cursor(e){let t="next";if(e.reverse&&(t="prev"),e.index){const n=this.store.index(e.index);return e.Z?n.openKeyCursor(e.range,t):n.openCursor(e.range,t)}return this.store.openCursor(e.range,t)}}function on(r){return new w(((e,t)=>{r.onsuccess=n=>{const i=n.target.result;e(i)},r.onerror=n=>{const i=Xa(n.target.error);t(i)}}))}let Il=!1;function Xa(r){const e=jt.M(ge());if(e>=12.2&&e<13){const t="An internal error was encountered in the Indexed Database server";if(r.message.indexOf(t)>=0){const n=new k("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${t}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return Il||(Il=!0,setTimeout((()=>{throw n}),0)),n}}return r}const ei="IndexBackfiller";class b_{constructor(e,t){this.asyncQueue=e,this.te=t,this.task=null}start(){this.ne(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return this.task!==null}ne(e){V(ei,`Scheduled in ${e}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",e,(async()=>{this.task=null;try{const t=await this.te.re();V(ei,`Documents written: ${t}`)}catch(t){Ht(t)?V(ei,"Ignoring IndexedDB error during index backfill: ",t):await Pn(t)}await this.ne(6e4)}))}}class P_{constructor(e,t){this.localStore=e,this.persistence=t}async re(e=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",(t=>this.ie(t,e)))}ie(e,t){const n=new Set;let i=t,s=!0;return w.doWhile((()=>s===!0&&i>0),(()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(e).next((o=>{if(o!==null&&!n.has(o))return V(ei,`Processing collection: ${o}`),this.se(e,o,i).next((c=>{i-=c,n.add(o)}));s=!1})))).next((()=>t-i))}se(e,t,n){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(e,t).next((i=>this.localStore.localDocuments.getNextDocuments(e,t,i,n).next((s=>{const o=s.changes;return this.localStore.indexManager.updateIndexEntries(e,o).next((()=>this.oe(i,s))).next((c=>(V(ei,`Updating offset: ${c}`),this.localStore.indexManager.updateCollectionGroup(e,t,c)))).next((()=>o.size))}))))}oe(e,t){let n=e;return t.changes.forEach(((i,s)=>{const o=Rd(s);Qa(o,n)>0&&(n=o)})),new Be(n.readTime,n.documentKey,Math.max(t.batchId,e.largestBatchId))}}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qe{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=n=>this._e(n),this.ae=n=>t.writeSequenceNumber(n))}_e(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.ae&&this.ae(e),e}}qe.ue=-1;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const hn=-1;function Pi(r){return r==null}function hi(r){return r===0&&1/r==-1/0}function S_(r){return typeof r=="number"&&Number.isInteger(r)&&!hi(r)&&r<=Number.MAX_SAFE_INTEGER&&r>=Number.MIN_SAFE_INTEGER}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Os="";function De(r){let e="";for(let t=0;t<r.length;t++)e.length>0&&(e=vl(e)),e=C_(r.get(t),e);return vl(e)}function C_(r,e){let t=e;const n=r.length;for(let i=0;i<n;i++){const s=r.charAt(i);switch(s){case"\0":t+="";break;case Os:t+="";break;default:t+=s}}return t}function vl(r){return r+Os+""}function Je(r){const e=r.length;if(L(e>=2,64408,{path:r}),e===2)return L(r.charAt(0)===Os&&r.charAt(1)==="",56145,{path:r}),J.emptyPath();const t=e-2,n=[];let i="";for(let s=0;s<e;){const o=r.indexOf(Os,s);switch((o<0||o>t)&&M(50515,{path:r}),r.charAt(o+1)){case"":const c=r.substring(s,o);let u;i.length===0?u=c:(i+=c,u=i,i=""),n.push(u);break;case"":i+=r.substring(s,o),i+="\0";break;case"":i+=r.substring(s,o+1);break;default:M(61167,{path:r})}s=o+2}return new J(n)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sn="remoteDocuments",Si="owner",Ln="owner",di="mutationQueues",V_="userId",Ke="mutations",El="batchId",ln="userMutationsIndex",Tl=["userId","batchId"];/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ys(r,e){return[r,De(e)]}function Cd(r,e,t){return[r,De(e),t]}const D_={},nr="documentMutations",Ms="remoteDocumentsV14",k_=["prefixPath","collectionGroup","readTime","documentId"],Is="documentKeyIndex",N_=["prefixPath","collectionGroup","documentId"],Vd="collectionGroupIndex",x_=["collectionGroup","readTime","prefixPath","documentId"],fi="remoteDocumentGlobal",_a="remoteDocumentGlobalKey",rr="targets",Dd="queryTargetsIndex",O_=["canonicalId","targetId"],ir="targetDocuments",M_=["targetId","path"],Ja="documentTargetsIndex",L_=["path","targetId"],Ls="targetGlobalKey",dn="targetGlobal",pi="collectionParents",F_=["collectionId","parent"],sr="clientMetadata",U_="clientId",oo="bundles",B_="bundleId",ao="namedQueries",j_="name",Ya="indexConfiguration",q_="indexId",ya="collectionGroupIndex",z_="collectionGroup",ti="indexState",$_=["indexId","uid"],kd="sequenceNumberIndex",G_=["uid","sequenceNumber"],ni="indexEntries",K_=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],Nd="documentKeyIndex",W_=["indexId","uid","orderedDocumentKey"],co="documentOverlays",H_=["userId","collectionPath","documentId"],Ia="collectionPathOverlayIndex",Q_=["userId","collectionPath","largestBatchId"],xd="collectionGroupOverlayIndex",X_=["userId","collectionGroup","largestBatchId"],Za="globals",J_="name",Od=[di,Ke,nr,sn,rr,Si,dn,ir,sr,fi,pi,oo,ao],Y_=[...Od,co],Md=[di,Ke,nr,Ms,rr,Si,dn,ir,sr,fi,pi,oo,ao,co],Ld=Md,ec=[...Ld,Ya,ti,ni],Z_=ec,Fd=[...ec,Za],ey=Fd;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class va extends Pd{constructor(e,t){super(),this.ce=e,this.currentSequenceNumber=t}}function _e(r,e){const t=z(r);return jt.N(t.ce,e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function wl(r){let e=0;for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e++;return e}function Qt(r,e){for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e(t,r[t])}function Ud(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ue{constructor(e,t){this.comparator=e,this.root=t||we.EMPTY}insert(e,t){return new ue(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,we.BLACK,null,null))}remove(e){return new ue(this.comparator,this.root.remove(e,this.comparator).copy(null,null,we.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const n=this.comparator(e,t.key);if(n===0)return t.value;n<0?t=t.left:n>0&&(t=t.right)}return null}indexOf(e){let t=0,n=this.root;for(;!n.isEmpty();){const i=this.comparator(e,n.key);if(i===0)return t+n.left.size;i<0?n=n.left:(t+=n.left.size+1,n=n.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal(((t,n)=>(e(t,n),!1)))}toString(){const e=[];return this.inorderTraversal(((t,n)=>(e.push(`${t}:${n}`),!1))),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new us(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new us(this.root,e,this.comparator,!1)}getReverseIterator(){return new us(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new us(this.root,e,this.comparator,!0)}}class us{constructor(e,t,n,i){this.isReverse=i,this.nodeStack=[];let s=1;for(;!e.isEmpty();)if(s=t?n(e.key,t):1,t&&i&&(s*=-1),s<0)e=this.isReverse?e.left:e.right;else{if(s===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class we{constructor(e,t,n,i,s){this.key=e,this.value=t,this.color=n??we.RED,this.left=i??we.EMPTY,this.right=s??we.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,n,i,s){return new we(e??this.key,t??this.value,n??this.color,i??this.left,s??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,n){let i=this;const s=n(e,i.key);return i=s<0?i.copy(null,null,null,i.left.insert(e,t,n),null):s===0?i.copy(null,t,null,null,null):i.copy(null,null,null,null,i.right.insert(e,t,n)),i.fixUp()}removeMin(){if(this.left.isEmpty())return we.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let n,i=this;if(t(e,i.key)<0)i.left.isEmpty()||i.left.isRed()||i.left.left.isRed()||(i=i.moveRedLeft()),i=i.copy(null,null,null,i.left.remove(e,t),null);else{if(i.left.isRed()&&(i=i.rotateRight()),i.right.isEmpty()||i.right.isRed()||i.right.left.isRed()||(i=i.moveRedRight()),t(e,i.key)===0){if(i.right.isEmpty())return we.EMPTY;n=i.right.min(),i=i.copy(n.key,n.value,null,null,i.right.removeMin())}i=i.copy(null,null,null,null,i.right.remove(e,t))}return i.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,we.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,we.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw M(43730,{key:this.key,value:this.value});if(this.right.isRed())throw M(14113,{key:this.key,value:this.value});const e=this.left.check();if(e!==this.right.check())throw M(27949);return e+(this.isRed()?0:1)}}we.EMPTY=null,we.RED=!0,we.BLACK=!1;we.EMPTY=new class{constructor(){this.size=0}get key(){throw M(57766)}get value(){throw M(16141)}get color(){throw M(16727)}get left(){throw M(29726)}get right(){throw M(36894)}copy(e,t,n,i,s){return this}insert(e,t,n){return new we(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ne{constructor(e){this.comparator=e,this.data=new ue(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal(((t,n)=>(e(t),!1)))}forEachInRange(e,t){const n=this.data.getIteratorFrom(e[0]);for(;n.hasNext();){const i=n.getNext();if(this.comparator(i.key,e[1])>=0)return;t(i.key)}}forEachWhile(e,t){let n;for(n=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();n.hasNext();)if(!e(n.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new Al(this.data.getIterator())}getIteratorFrom(e){return new Al(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach((n=>{t=t.add(n)})),t}isEqual(e){if(!(e instanceof ne)||this.size!==e.size)return!1;const t=this.data.getIterator(),n=e.data.getIterator();for(;t.hasNext();){const i=t.getNext().key,s=n.getNext().key;if(this.comparator(i,s)!==0)return!1}return!0}toArray(){const e=[];return this.forEach((t=>{e.push(t)})),e}toString(){const e=[];return this.forEach((t=>e.push(t))),"SortedSet("+e.toString()+")"}copy(e){const t=new ne(this.comparator);return t.data=e,t}}class Al{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function Fn(r){return r.hasNext()?r.getNext():void 0}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Oe{constructor(e){this.fields=e,e.sort(le.comparator)}static empty(){return new Oe([])}unionWith(e){let t=new ne(le.comparator);for(const n of this.fields)t=t.add(n);for(const n of e)t=t.add(n);return new Oe(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return tr(this.fields,e.fields,((t,n)=>t.isEqual(n)))}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bd extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class me{constructor(e){this.binaryString=e}static fromBase64String(e){const t=(function(i){try{return atob(i)}catch(s){throw typeof DOMException<"u"&&s instanceof DOMException?new Bd("Invalid base64 string: "+s):s}})(e);return new me(t)}static fromUint8Array(e){const t=(function(i){let s="";for(let o=0;o<i.length;++o)s+=String.fromCharCode(i[o]);return s})(e);return new me(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return(function(t){return btoa(t)})(this.binaryString)}toUint8Array(){return(function(t){const n=new Uint8Array(t.length);for(let i=0;i<t.length;i++)n[i]=t.charCodeAt(i);return n})(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return q(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}me.EMPTY_BYTE_STRING=new me("");const ty=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function _t(r){if(L(!!r,39018),typeof r=="string"){let e=0;const t=ty.exec(r);if(L(!!t,46558,{timestamp:r}),t[1]){let i=t[1];i=(i+"000000000").substr(0,9),e=Number(i)}const n=new Date(r);return{seconds:Math.floor(n.getTime()/1e3),nanos:e}}return{seconds:oe(r.seconds),nanos:oe(r.nanos)}}function oe(r){return typeof r=="number"?r:typeof r=="string"?Number(r):0}function yt(r){return typeof r=="string"?me.fromBase64String(r):me.fromUint8Array(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const jd="server_timestamp",qd="__type__",zd="__previous_value__",$d="__local_write_time__";function tc(r){var e,t;return((t=(((e=r==null?void 0:r.mapValue)===null||e===void 0?void 0:e.fields)||{})[qd])===null||t===void 0?void 0:t.stringValue)===jd}function uo(r){const e=r.mapValue.fields[zd];return tc(e)?uo(e):e}function mi(r){const e=_t(r.mapValue.fields[$d].timestampValue);return new ee(e.seconds,e.nanos)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ny{constructor(e,t,n,i,s,o,c,u,h,f){this.databaseId=e,this.appId=t,this.persistenceKey=n,this.host=i,this.ssl=s,this.forceLongPolling=o,this.autoDetectLongPolling=c,this.longPollingOptions=u,this.useFetchStreams=h,this.isUsingEmulator=f}}const Fs="(default)";class gn{constructor(e,t){this.projectId=e,this.database=t||Fs}static empty(){return new gn("","")}get isDefaultDatabase(){return this.database===Fs}isEqual(e){return e instanceof gn&&e.projectId===this.projectId&&e.database===this.database}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nc="__type__",Gd="__max__",Mt={mapValue:{fields:{__type__:{stringValue:Gd}}}},rc="__vector__",or="value",vs={nullValue:"NULL_VALUE"};function $t(r){return"nullValue"in r?0:"booleanValue"in r?1:"integerValue"in r||"doubleValue"in r?2:"timestampValue"in r?3:"stringValue"in r?5:"bytesValue"in r?6:"referenceValue"in r?7:"geoPointValue"in r?8:"arrayValue"in r?9:"mapValue"in r?tc(r)?4:Kd(r)?9007199254740991:lo(r)?10:11:M(28295,{value:r})}function it(r,e){if(r===e)return!0;const t=$t(r);if(t!==$t(e))return!1;switch(t){case 0:case 9007199254740991:return!0;case 1:return r.booleanValue===e.booleanValue;case 4:return mi(r).isEqual(mi(e));case 3:return(function(i,s){if(typeof i.timestampValue=="string"&&typeof s.timestampValue=="string"&&i.timestampValue.length===s.timestampValue.length)return i.timestampValue===s.timestampValue;const o=_t(i.timestampValue),c=_t(s.timestampValue);return o.seconds===c.seconds&&o.nanos===c.nanos})(r,e);case 5:return r.stringValue===e.stringValue;case 6:return(function(i,s){return yt(i.bytesValue).isEqual(yt(s.bytesValue))})(r,e);case 7:return r.referenceValue===e.referenceValue;case 8:return(function(i,s){return oe(i.geoPointValue.latitude)===oe(s.geoPointValue.latitude)&&oe(i.geoPointValue.longitude)===oe(s.geoPointValue.longitude)})(r,e);case 2:return(function(i,s){if("integerValue"in i&&"integerValue"in s)return oe(i.integerValue)===oe(s.integerValue);if("doubleValue"in i&&"doubleValue"in s){const o=oe(i.doubleValue),c=oe(s.doubleValue);return o===c?hi(o)===hi(c):isNaN(o)&&isNaN(c)}return!1})(r,e);case 9:return tr(r.arrayValue.values||[],e.arrayValue.values||[],it);case 10:case 11:return(function(i,s){const o=i.mapValue.fields||{},c=s.mapValue.fields||{};if(wl(o)!==wl(c))return!1;for(const u in o)if(o.hasOwnProperty(u)&&(c[u]===void 0||!it(o[u],c[u])))return!1;return!0})(r,e);default:return M(52216,{left:r})}}function gi(r,e){return(r.values||[]).find((t=>it(t,e)))!==void 0}function Gt(r,e){if(r===e)return 0;const t=$t(r),n=$t(e);if(t!==n)return q(t,n);switch(t){case 0:case 9007199254740991:return 0;case 1:return q(r.booleanValue,e.booleanValue);case 2:return(function(s,o){const c=oe(s.integerValue||s.doubleValue),u=oe(o.integerValue||o.doubleValue);return c<u?-1:c>u?1:c===u?0:isNaN(c)?isNaN(u)?0:-1:1})(r,e);case 3:return Rl(r.timestampValue,e.timestampValue);case 4:return Rl(mi(r),mi(e));case 5:return ma(r.stringValue,e.stringValue);case 6:return(function(s,o){const c=yt(s),u=yt(o);return c.compareTo(u)})(r.bytesValue,e.bytesValue);case 7:return(function(s,o){const c=s.split("/"),u=o.split("/");for(let h=0;h<c.length&&h<u.length;h++){const f=q(c[h],u[h]);if(f!==0)return f}return q(c.length,u.length)})(r.referenceValue,e.referenceValue);case 8:return(function(s,o){const c=q(oe(s.latitude),oe(o.latitude));return c!==0?c:q(oe(s.longitude),oe(o.longitude))})(r.geoPointValue,e.geoPointValue);case 9:return bl(r.arrayValue,e.arrayValue);case 10:return(function(s,o){var c,u,h,f;const m=s.fields||{},g=o.fields||{},b=(c=m[or])===null||c===void 0?void 0:c.arrayValue,C=(u=g[or])===null||u===void 0?void 0:u.arrayValue,N=q(((h=b==null?void 0:b.values)===null||h===void 0?void 0:h.length)||0,((f=C==null?void 0:C.values)===null||f===void 0?void 0:f.length)||0);return N!==0?N:bl(b,C)})(r.mapValue,e.mapValue);case 11:return(function(s,o){if(s===Mt.mapValue&&o===Mt.mapValue)return 0;if(s===Mt.mapValue)return 1;if(o===Mt.mapValue)return-1;const c=s.fields||{},u=Object.keys(c),h=o.fields||{},f=Object.keys(h);u.sort(),f.sort();for(let m=0;m<u.length&&m<f.length;++m){const g=ma(u[m],f[m]);if(g!==0)return g;const b=Gt(c[u[m]],h[f[m]]);if(b!==0)return b}return q(u.length,f.length)})(r.mapValue,e.mapValue);default:throw M(23264,{le:t})}}function Rl(r,e){if(typeof r=="string"&&typeof e=="string"&&r.length===e.length)return q(r,e);const t=_t(r),n=_t(e),i=q(t.seconds,n.seconds);return i!==0?i:q(t.nanos,n.nanos)}function bl(r,e){const t=r.values||[],n=e.values||[];for(let i=0;i<t.length&&i<n.length;++i){const s=Gt(t[i],n[i]);if(s)return s}return q(t.length,n.length)}function ar(r){return Ea(r)}function Ea(r){return"nullValue"in r?"null":"booleanValue"in r?""+r.booleanValue:"integerValue"in r?""+r.integerValue:"doubleValue"in r?""+r.doubleValue:"timestampValue"in r?(function(t){const n=_t(t);return`time(${n.seconds},${n.nanos})`})(r.timestampValue):"stringValue"in r?r.stringValue:"bytesValue"in r?(function(t){return yt(t).toBase64()})(r.bytesValue):"referenceValue"in r?(function(t){return O.fromName(t).toString()})(r.referenceValue):"geoPointValue"in r?(function(t){return`geo(${t.latitude},${t.longitude})`})(r.geoPointValue):"arrayValue"in r?(function(t){let n="[",i=!0;for(const s of t.values||[])i?i=!1:n+=",",n+=Ea(s);return n+"]"})(r.arrayValue):"mapValue"in r?(function(t){const n=Object.keys(t.fields||{}).sort();let i="{",s=!0;for(const o of n)s?s=!1:i+=",",i+=`${o}:${Ea(t.fields[o])}`;return i+"}"})(r.mapValue):M(61005,{value:r})}function Es(r){switch($t(r)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const e=uo(r);return e?16+Es(e):16;case 5:return 2*r.stringValue.length;case 6:return yt(r.bytesValue).approximateByteSize();case 7:return r.referenceValue.length;case 9:return(function(n){return(n.values||[]).reduce(((i,s)=>i+Es(s)),0)})(r.arrayValue);case 10:case 11:return(function(n){let i=0;return Qt(n.fields,((s,o)=>{i+=s.length+Es(o)})),i})(r.mapValue);default:throw M(13486,{value:r})}}function _i(r,e){return{referenceValue:`projects/${r.projectId}/databases/${r.database}/documents/${e.path.canonicalString()}`}}function Ta(r){return!!r&&"integerValue"in r}function yi(r){return!!r&&"arrayValue"in r}function Pl(r){return!!r&&"nullValue"in r}function Sl(r){return!!r&&"doubleValue"in r&&isNaN(Number(r.doubleValue))}function Ts(r){return!!r&&"mapValue"in r}function lo(r){var e,t;return((t=(((e=r==null?void 0:r.mapValue)===null||e===void 0?void 0:e.fields)||{})[nc])===null||t===void 0?void 0:t.stringValue)===rc}function ri(r){if(r.geoPointValue)return{geoPointValue:Object.assign({},r.geoPointValue)};if(r.timestampValue&&typeof r.timestampValue=="object")return{timestampValue:Object.assign({},r.timestampValue)};if(r.mapValue){const e={mapValue:{fields:{}}};return Qt(r.mapValue.fields,((t,n)=>e.mapValue.fields[t]=ri(n))),e}if(r.arrayValue){const e={arrayValue:{values:[]}};for(let t=0;t<(r.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=ri(r.arrayValue.values[t]);return e}return Object.assign({},r)}function Kd(r){return(((r.mapValue||{}).fields||{}).__type__||{}).stringValue===Gd}const Wd={mapValue:{fields:{[nc]:{stringValue:rc},[or]:{arrayValue:{}}}}};function ry(r){return"nullValue"in r?vs:"booleanValue"in r?{booleanValue:!1}:"integerValue"in r||"doubleValue"in r?{doubleValue:NaN}:"timestampValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in r?{stringValue:""}:"bytesValue"in r?{bytesValue:""}:"referenceValue"in r?_i(gn.empty(),O.empty()):"geoPointValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in r?{arrayValue:{}}:"mapValue"in r?lo(r)?Wd:{mapValue:{}}:M(35942,{value:r})}function iy(r){return"nullValue"in r?{booleanValue:!1}:"booleanValue"in r?{doubleValue:NaN}:"integerValue"in r||"doubleValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in r?{stringValue:""}:"stringValue"in r?{bytesValue:""}:"bytesValue"in r?_i(gn.empty(),O.empty()):"referenceValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in r?{arrayValue:{}}:"arrayValue"in r?Wd:"mapValue"in r?lo(r)?{mapValue:{}}:Mt:M(61959,{value:r})}function Cl(r,e){const t=Gt(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?-1:!r.inclusive&&e.inclusive?1:0}function Vl(r,e){const t=Gt(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?1:!r.inclusive&&e.inclusive?-1:0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ae{constructor(e){this.value=e}static empty(){return new Ae({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let n=0;n<e.length-1;++n)if(t=(t.mapValue.fields||{})[e.get(n)],!Ts(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=ri(t)}setAll(e){let t=le.emptyPath(),n={},i=[];e.forEach(((o,c)=>{if(!t.isImmediateParentOf(c)){const u=this.getFieldsMap(t);this.applyChanges(u,n,i),n={},i=[],t=c.popLast()}o?n[c.lastSegment()]=ri(o):i.push(c.lastSegment())}));const s=this.getFieldsMap(t);this.applyChanges(s,n,i)}delete(e){const t=this.field(e.popLast());Ts(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return it(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let n=0;n<e.length;++n){let i=t.mapValue.fields[e.get(n)];Ts(i)&&i.mapValue.fields||(i={mapValue:{fields:{}}},t.mapValue.fields[e.get(n)]=i),t=i}return t.mapValue.fields}applyChanges(e,t,n){Qt(t,((i,s)=>e[i]=s));for(const i of n)delete e[i]}clone(){return new Ae(ri(this.value))}}function Hd(r){const e=[];return Qt(r.fields,((t,n)=>{const i=new le([t]);if(Ts(n)){const s=Hd(n.mapValue).fields;if(s.length===0)e.push(i);else for(const o of s)e.push(i.child(o))}else e.push(i)})),new Oe(e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ae{constructor(e,t,n,i,s,o,c){this.key=e,this.documentType=t,this.version=n,this.readTime=i,this.createTime=s,this.data=o,this.documentState=c}static newInvalidDocument(e){return new ae(e,0,U.min(),U.min(),U.min(),Ae.empty(),0)}static newFoundDocument(e,t,n,i){return new ae(e,1,t,U.min(),n,i,0)}static newNoDocument(e,t){return new ae(e,2,t,U.min(),U.min(),Ae.empty(),0)}static newUnknownDocument(e,t){return new ae(e,3,t,U.min(),U.min(),Ae.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(U.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=Ae.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=Ae.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=U.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof ae&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new ae(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cr{constructor(e,t){this.position=e,this.inclusive=t}}function Dl(r,e,t){let n=0;for(let i=0;i<r.position.length;i++){const s=e[i],o=r.position[i];if(s.field.isKeyField()?n=O.comparator(O.fromName(o.referenceValue),t.key):n=Gt(o,t.data.field(s.field)),s.dir==="desc"&&(n*=-1),n!==0)break}return n}function kl(r,e){if(r===null)return e===null;if(e===null||r.inclusive!==e.inclusive||r.position.length!==e.position.length)return!1;for(let t=0;t<r.position.length;t++)if(!it(r.position[t],e.position[t]))return!1;return!0}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ii{constructor(e,t="asc"){this.field=e,this.dir=t}}function sy(r,e){return r.dir===e.dir&&r.field.isEqual(e.field)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qd{}class Q extends Qd{constructor(e,t,n){super(),this.field=e,this.op=t,this.value=n}static create(e,t,n){return e.isKeyField()?t==="in"||t==="not-in"?this.createKeyFieldInFilter(e,t,n):new oy(e,t,n):t==="array-contains"?new uy(e,n):t==="in"?new tf(e,n):t==="not-in"?new ly(e,n):t==="array-contains-any"?new hy(e,n):new Q(e,t,n)}static createKeyFieldInFilter(e,t,n){return t==="in"?new ay(e,n):new cy(e,n)}matches(e){const t=e.data.field(this.field);return this.op==="!="?t!==null&&t.nullValue===void 0&&this.matchesComparison(Gt(t,this.value)):t!==null&&$t(this.value)===$t(t)&&this.matchesComparison(Gt(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return M(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class te extends Qd{constructor(e,t){super(),this.filters=e,this.op=t,this.he=null}static create(e,t){return new te(e,t)}matches(e){return ur(this)?this.filters.find((t=>!t.matches(e)))===void 0:this.filters.find((t=>t.matches(e)))!==void 0}getFlattenedFilters(){return this.he!==null||(this.he=this.filters.reduce(((e,t)=>e.concat(t.getFlattenedFilters())),[])),this.he}getFilters(){return Object.assign([],this.filters)}}function ur(r){return r.op==="and"}function wa(r){return r.op==="or"}function ic(r){return Xd(r)&&ur(r)}function Xd(r){for(const e of r.filters)if(e instanceof te)return!1;return!0}function Aa(r){if(r instanceof Q)return r.field.canonicalString()+r.op.toString()+ar(r.value);if(ic(r))return r.filters.map((e=>Aa(e))).join(",");{const e=r.filters.map((t=>Aa(t))).join(",");return`${r.op}(${e})`}}function Jd(r,e){return r instanceof Q?(function(n,i){return i instanceof Q&&n.op===i.op&&n.field.isEqual(i.field)&&it(n.value,i.value)})(r,e):r instanceof te?(function(n,i){return i instanceof te&&n.op===i.op&&n.filters.length===i.filters.length?n.filters.reduce(((s,o,c)=>s&&Jd(o,i.filters[c])),!0):!1})(r,e):void M(19439)}function Yd(r,e){const t=r.filters.concat(e);return te.create(t,r.op)}function Zd(r){return r instanceof Q?(function(t){return`${t.field.canonicalString()} ${t.op} ${ar(t.value)}`})(r):r instanceof te?(function(t){return t.op.toString()+" {"+t.getFilters().map(Zd).join(" ,")+"}"})(r):"Filter"}class oy extends Q{constructor(e,t,n){super(e,t,n),this.key=O.fromName(n.referenceValue)}matches(e){const t=O.comparator(e.key,this.key);return this.matchesComparison(t)}}class ay extends Q{constructor(e,t){super(e,"in",t),this.keys=ef("in",t)}matches(e){return this.keys.some((t=>t.isEqual(e.key)))}}class cy extends Q{constructor(e,t){super(e,"not-in",t),this.keys=ef("not-in",t)}matches(e){return!this.keys.some((t=>t.isEqual(e.key)))}}function ef(r,e){var t;return(((t=e.arrayValue)===null||t===void 0?void 0:t.values)||[]).map((n=>O.fromName(n.referenceValue)))}class uy extends Q{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return yi(t)&&gi(t.arrayValue,this.value)}}class tf extends Q{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return t!==null&&gi(this.value.arrayValue,t)}}class ly extends Q{constructor(e,t){super(e,"not-in",t)}matches(e){if(gi(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return t!==null&&t.nullValue===void 0&&!gi(this.value.arrayValue,t)}}class hy extends Q{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!yi(t)||!t.arrayValue.values)&&t.arrayValue.values.some((n=>gi(this.value.arrayValue,n)))}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dy{constructor(e,t=null,n=[],i=[],s=null,o=null,c=null){this.path=e,this.collectionGroup=t,this.orderBy=n,this.filters=i,this.limit=s,this.startAt=o,this.endAt=c,this.Pe=null}}function Ra(r,e=null,t=[],n=[],i=null,s=null,o=null){return new dy(r,e,t,n,i,s,o)}function _n(r){const e=z(r);if(e.Pe===null){let t=e.path.canonicalString();e.collectionGroup!==null&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map((n=>Aa(n))).join(","),t+="|ob:",t+=e.orderBy.map((n=>(function(s){return s.field.canonicalString()+s.dir})(n))).join(","),Pi(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map((n=>ar(n))).join(",")),e.endAt&&(t+="|ub:",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map((n=>ar(n))).join(",")),e.Pe=t}return e.Pe}function Ci(r,e){if(r.limit!==e.limit||r.orderBy.length!==e.orderBy.length)return!1;for(let t=0;t<r.orderBy.length;t++)if(!sy(r.orderBy[t],e.orderBy[t]))return!1;if(r.filters.length!==e.filters.length)return!1;for(let t=0;t<r.filters.length;t++)if(!Jd(r.filters[t],e.filters[t]))return!1;return r.collectionGroup===e.collectionGroup&&!!r.path.isEqual(e.path)&&!!kl(r.startAt,e.startAt)&&kl(r.endAt,e.endAt)}function Us(r){return O.isDocumentKey(r.path)&&r.collectionGroup===null&&r.filters.length===0}function Bs(r,e){return r.filters.filter((t=>t instanceof Q&&t.field.isEqual(e)))}function Nl(r,e,t){let n=vs,i=!0;for(const s of Bs(r,e)){let o=vs,c=!0;switch(s.op){case"<":case"<=":o=ry(s.value);break;case"==":case"in":case">=":o=s.value;break;case">":o=s.value,c=!1;break;case"!=":case"not-in":o=vs}Cl({value:n,inclusive:i},{value:o,inclusive:c})<0&&(n=o,i=c)}if(t!==null){for(let s=0;s<r.orderBy.length;++s)if(r.orderBy[s].field.isEqual(e)){const o=t.position[s];Cl({value:n,inclusive:i},{value:o,inclusive:t.inclusive})<0&&(n=o,i=t.inclusive);break}}return{value:n,inclusive:i}}function xl(r,e,t){let n=Mt,i=!0;for(const s of Bs(r,e)){let o=Mt,c=!0;switch(s.op){case">=":case">":o=iy(s.value),c=!1;break;case"==":case"in":case"<=":o=s.value;break;case"<":o=s.value,c=!1;break;case"!=":case"not-in":o=Mt}Vl({value:n,inclusive:i},{value:o,inclusive:c})>0&&(n=o,i=c)}if(t!==null){for(let s=0;s<r.orderBy.length;++s)if(r.orderBy[s].field.isEqual(e)){const o=t.position[s];Vl({value:n,inclusive:i},{value:o,inclusive:t.inclusive})>0&&(n=o,i=t.inclusive);break}}return{value:n,inclusive:i}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sn{constructor(e,t=null,n=[],i=[],s=null,o="F",c=null,u=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=n,this.filters=i,this.limit=s,this.limitType=o,this.startAt=c,this.endAt=u,this.Te=null,this.Ie=null,this.de=null,this.startAt,this.endAt}}function fy(r,e,t,n,i,s,o,c){return new Sn(r,e,t,n,i,s,o,c)}function Vi(r){return new Sn(r)}function Ol(r){return r.filters.length===0&&r.limit===null&&r.startAt==null&&r.endAt==null&&(r.explicitOrderBy.length===0||r.explicitOrderBy.length===1&&r.explicitOrderBy[0].field.isKeyField())}function nf(r){return r.collectionGroup!==null}function ii(r){const e=z(r);if(e.Te===null){e.Te=[];const t=new Set;for(const s of e.explicitOrderBy)e.Te.push(s),t.add(s.field.canonicalString());const n=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let c=new ne(le.comparator);return o.filters.forEach((u=>{u.getFlattenedFilters().forEach((h=>{h.isInequality()&&(c=c.add(h.field))}))})),c})(e).forEach((s=>{t.has(s.canonicalString())||s.isKeyField()||e.Te.push(new Ii(s,n))})),t.has(le.keyField().canonicalString())||e.Te.push(new Ii(le.keyField(),n))}return e.Te}function ze(r){const e=z(r);return e.Ie||(e.Ie=py(e,ii(r))),e.Ie}function py(r,e){if(r.limitType==="F")return Ra(r.path,r.collectionGroup,e,r.filters,r.limit,r.startAt,r.endAt);{e=e.map((i=>{const s=i.dir==="desc"?"asc":"desc";return new Ii(i.field,s)}));const t=r.endAt?new cr(r.endAt.position,r.endAt.inclusive):null,n=r.startAt?new cr(r.startAt.position,r.startAt.inclusive):null;return Ra(r.path,r.collectionGroup,e,r.filters,r.limit,t,n)}}function ba(r,e){const t=r.filters.concat([e]);return new Sn(r.path,r.collectionGroup,r.explicitOrderBy.slice(),t,r.limit,r.limitType,r.startAt,r.endAt)}function js(r,e,t){return new Sn(r.path,r.collectionGroup,r.explicitOrderBy.slice(),r.filters.slice(),e,t,r.startAt,r.endAt)}function ho(r,e){return Ci(ze(r),ze(e))&&r.limitType===e.limitType}function rf(r){return`${_n(ze(r))}|lt:${r.limitType}`}function $n(r){return`Query(target=${(function(t){let n=t.path.canonicalString();return t.collectionGroup!==null&&(n+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(n+=`, filters: [${t.filters.map((i=>Zd(i))).join(", ")}]`),Pi(t.limit)||(n+=", limit: "+t.limit),t.orderBy.length>0&&(n+=`, orderBy: [${t.orderBy.map((i=>(function(o){return`${o.field.canonicalString()} (${o.dir})`})(i))).join(", ")}]`),t.startAt&&(n+=", startAt: ",n+=t.startAt.inclusive?"b:":"a:",n+=t.startAt.position.map((i=>ar(i))).join(",")),t.endAt&&(n+=", endAt: ",n+=t.endAt.inclusive?"a:":"b:",n+=t.endAt.position.map((i=>ar(i))).join(",")),`Target(${n})`})(ze(r))}; limitType=${r.limitType})`}function Di(r,e){return e.isFoundDocument()&&(function(n,i){const s=i.key.path;return n.collectionGroup!==null?i.key.hasCollectionId(n.collectionGroup)&&n.path.isPrefixOf(s):O.isDocumentKey(n.path)?n.path.isEqual(s):n.path.isImmediateParentOf(s)})(r,e)&&(function(n,i){for(const s of ii(n))if(!s.field.isKeyField()&&i.data.field(s.field)===null)return!1;return!0})(r,e)&&(function(n,i){for(const s of n.filters)if(!s.matches(i))return!1;return!0})(r,e)&&(function(n,i){return!(n.startAt&&!(function(o,c,u){const h=Dl(o,c,u);return o.inclusive?h<=0:h<0})(n.startAt,ii(n),i)||n.endAt&&!(function(o,c,u){const h=Dl(o,c,u);return o.inclusive?h>=0:h>0})(n.endAt,ii(n),i))})(r,e)}function my(r){return r.collectionGroup||(r.path.length%2==1?r.path.lastSegment():r.path.get(r.path.length-2))}function sf(r){return(e,t)=>{let n=!1;for(const i of ii(r)){const s=gy(i,e,t);if(s!==0)return s;n=n||i.field.isKeyField()}return 0}}function gy(r,e,t){const n=r.field.isKeyField()?O.comparator(e.key,t.key):(function(s,o,c){const u=o.data.field(s),h=c.data.field(s);return u!==null&&h!==null?Gt(u,h):M(42886)})(r.field,e,t);switch(r.dir){case"asc":return n;case"desc":return-1*n;default:return M(19790,{direction:r.dir})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Et{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n!==void 0){for(const[i,s]of n)if(this.equalsFn(i,e))return s}}has(e){return this.get(e)!==void 0}set(e,t){const n=this.mapKeyFn(e),i=this.inner[n];if(i===void 0)return this.inner[n]=[[e,t]],void this.innerSize++;for(let s=0;s<i.length;s++)if(this.equalsFn(i[s][0],e))return void(i[s]=[e,t]);i.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n===void 0)return!1;for(let i=0;i<n.length;i++)if(this.equalsFn(n[i][0],e))return n.length===1?delete this.inner[t]:n.splice(i,1),this.innerSize--,!0;return!1}forEach(e){Qt(this.inner,((t,n)=>{for(const[i,s]of n)e(i,s)}))}isEmpty(){return Ud(this.inner)}size(){return this.innerSize}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _y=new ue(O.comparator);function Ue(){return _y}const of=new ue(O.comparator);function Qr(...r){let e=of;for(const t of r)e=e.insert(t.key,t);return e}function af(r){let e=of;return r.forEach(((t,n)=>e=e.insert(t,n.overlayedDocument))),e}function Ye(){return si()}function cf(){return si()}function si(){return new Et((r=>r.toString()),((r,e)=>r.isEqual(e)))}const yy=new ue(O.comparator),Iy=new ne(O.comparator);function G(...r){let e=Iy;for(const t of r)e=e.add(t);return e}const vy=new ne(q);function Ey(){return vy}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function sc(r,e){if(r.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:hi(e)?"-0":e}}function uf(r){return{integerValue:""+r}}function lf(r,e){return S_(e)?uf(e):sc(r,e)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fo{constructor(){this._=void 0}}function Ty(r,e,t){return r instanceof lr?(function(i,s){const o={fields:{[qd]:{stringValue:jd},[$d]:{timestampValue:{seconds:i.seconds,nanos:i.nanoseconds}}}};return s&&tc(s)&&(s=uo(s)),s&&(o.fields[zd]=s),{mapValue:o}})(t,e):r instanceof yn?df(r,e):r instanceof In?ff(r,e):(function(i,s){const o=hf(i,s),c=Ml(o)+Ml(i.Ee);return Ta(o)&&Ta(i.Ee)?uf(c):sc(i.serializer,c)})(r,e)}function wy(r,e,t){return r instanceof yn?df(r,e):r instanceof In?ff(r,e):t}function hf(r,e){return r instanceof hr?(function(n){return Ta(n)||(function(s){return!!s&&"doubleValue"in s})(n)})(e)?e:{integerValue:0}:null}class lr extends fo{}class yn extends fo{constructor(e){super(),this.elements=e}}function df(r,e){const t=pf(e);for(const n of r.elements)t.some((i=>it(i,n)))||t.push(n);return{arrayValue:{values:t}}}class In extends fo{constructor(e){super(),this.elements=e}}function ff(r,e){let t=pf(e);for(const n of r.elements)t=t.filter((i=>!it(i,n)));return{arrayValue:{values:t}}}class hr extends fo{constructor(e,t){super(),this.serializer=e,this.Ee=t}}function Ml(r){return oe(r.integerValue||r.doubleValue)}function pf(r){return yi(r)&&r.arrayValue.values?r.arrayValue.values.slice():[]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ki{constructor(e,t){this.field=e,this.transform=t}}function Ay(r,e){return r.field.isEqual(e.field)&&(function(n,i){return n instanceof yn&&i instanceof yn||n instanceof In&&i instanceof In?tr(n.elements,i.elements,it):n instanceof hr&&i instanceof hr?it(n.Ee,i.Ee):n instanceof lr&&i instanceof lr})(r.transform,e.transform)}class Ry{constructor(e,t){this.version=e,this.transformResults=t}}class ce{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new ce}static exists(e){return new ce(void 0,e)}static updateTime(e){return new ce(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function ws(r,e){return r.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(r.updateTime):r.exists===void 0||r.exists===e.isFoundDocument()}class po{}function mf(r,e){if(!r.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return r.isNoDocument()?new yr(r.key,ce.none()):new _r(r.key,r.data,ce.none());{const t=r.data,n=Ae.empty();let i=new ne(le.comparator);for(let s of e.fields)if(!i.has(s)){let o=t.field(s);o===null&&s.length>1&&(s=s.popLast(),o=t.field(s)),o===null?n.delete(s):n.set(s,o),i=i.add(s)}return new Tt(r.key,n,new Oe(i.toArray()),ce.none())}}function by(r,e,t){r instanceof _r?(function(i,s,o){const c=i.value.clone(),u=Fl(i.fieldTransforms,s,o.transformResults);c.setAll(u),s.convertToFoundDocument(o.version,c).setHasCommittedMutations()})(r,e,t):r instanceof Tt?(function(i,s,o){if(!ws(i.precondition,s))return void s.convertToUnknownDocument(o.version);const c=Fl(i.fieldTransforms,s,o.transformResults),u=s.data;u.setAll(gf(i)),u.setAll(c),s.convertToFoundDocument(o.version,u).setHasCommittedMutations()})(r,e,t):(function(i,s,o){s.convertToNoDocument(o.version).setHasCommittedMutations()})(0,e,t)}function oi(r,e,t,n){return r instanceof _r?(function(s,o,c,u){if(!ws(s.precondition,o))return c;const h=s.value.clone(),f=Ul(s.fieldTransforms,u,o);return h.setAll(f),o.convertToFoundDocument(o.version,h).setHasLocalMutations(),null})(r,e,t,n):r instanceof Tt?(function(s,o,c,u){if(!ws(s.precondition,o))return c;const h=Ul(s.fieldTransforms,u,o),f=o.data;return f.setAll(gf(s)),f.setAll(h),o.convertToFoundDocument(o.version,f).setHasLocalMutations(),c===null?null:c.unionWith(s.fieldMask.fields).unionWith(s.fieldTransforms.map((m=>m.field)))})(r,e,t,n):(function(s,o,c){return ws(s.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):c})(r,e,t)}function Py(r,e){let t=null;for(const n of r.fieldTransforms){const i=e.data.field(n.field),s=hf(n.transform,i||null);s!=null&&(t===null&&(t=Ae.empty()),t.set(n.field,s))}return t||null}function Ll(r,e){return r.type===e.type&&!!r.key.isEqual(e.key)&&!!r.precondition.isEqual(e.precondition)&&!!(function(n,i){return n===void 0&&i===void 0||!(!n||!i)&&tr(n,i,((s,o)=>Ay(s,o)))})(r.fieldTransforms,e.fieldTransforms)&&(r.type===0?r.value.isEqual(e.value):r.type!==1||r.data.isEqual(e.data)&&r.fieldMask.isEqual(e.fieldMask))}class _r extends po{constructor(e,t,n,i=[]){super(),this.key=e,this.value=t,this.precondition=n,this.fieldTransforms=i,this.type=0}getFieldMask(){return null}}class Tt extends po{constructor(e,t,n,i,s=[]){super(),this.key=e,this.data=t,this.fieldMask=n,this.precondition=i,this.fieldTransforms=s,this.type=1}getFieldMask(){return this.fieldMask}}function gf(r){const e=new Map;return r.fieldMask.fields.forEach((t=>{if(!t.isEmpty()){const n=r.data.field(t);e.set(t,n)}})),e}function Fl(r,e,t){const n=new Map;L(r.length===t.length,32656,{Ae:t.length,Re:r.length});for(let i=0;i<t.length;i++){const s=r[i],o=s.transform,c=e.data.field(s.field);n.set(s.field,wy(o,c,t[i]))}return n}function Ul(r,e,t){const n=new Map;for(const i of r){const s=i.transform,o=t.data.field(i.field);n.set(i.field,Ty(s,o,e))}return n}class yr extends po{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class oc extends po{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ac{constructor(e,t,n,i){this.batchId=e,this.localWriteTime=t,this.baseMutations=n,this.mutations=i}applyToRemoteDocument(e,t){const n=t.mutationResults;for(let i=0;i<this.mutations.length;i++){const s=this.mutations[i];s.key.isEqual(e.key)&&by(s,e,n[i])}}applyToLocalView(e,t){for(const n of this.baseMutations)n.key.isEqual(e.key)&&(t=oi(n,e,t,this.localWriteTime));for(const n of this.mutations)n.key.isEqual(e.key)&&(t=oi(n,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const n=cf();return this.mutations.forEach((i=>{const s=e.get(i.key),o=s.overlayedDocument;let c=this.applyToLocalView(o,s.mutatedFields);c=t.has(i.key)?null:c;const u=mf(o,c);u!==null&&n.set(i.key,u),o.isValidDocument()||o.convertToNoDocument(U.min())})),n}keys(){return this.mutations.reduce(((e,t)=>e.add(t.key)),G())}isEqual(e){return this.batchId===e.batchId&&tr(this.mutations,e.mutations,((t,n)=>Ll(t,n)))&&tr(this.baseMutations,e.baseMutations,((t,n)=>Ll(t,n)))}}class cc{constructor(e,t,n,i){this.batch=e,this.commitVersion=t,this.mutationResults=n,this.docVersions=i}static from(e,t,n){L(e.mutations.length===n.length,58842,{Ve:e.mutations.length,me:n.length});let i=(function(){return yy})();const s=e.mutations;for(let o=0;o<s.length;o++)i=i.insert(s[o].key,n[o].version);return new cc(e,t,n,i)}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uc{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
      largestBatchId: ${this.largestBatchId},
      mutation: ${this.mutation.toString()}
    }`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sy{constructor(e,t){this.count=e,this.unchangedNames=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var fe,X;function _f(r){switch(r){case S.OK:return M(64938);case S.CANCELLED:case S.UNKNOWN:case S.DEADLINE_EXCEEDED:case S.RESOURCE_EXHAUSTED:case S.INTERNAL:case S.UNAVAILABLE:case S.UNAUTHENTICATED:return!1;case S.INVALID_ARGUMENT:case S.NOT_FOUND:case S.ALREADY_EXISTS:case S.PERMISSION_DENIED:case S.FAILED_PRECONDITION:case S.ABORTED:case S.OUT_OF_RANGE:case S.UNIMPLEMENTED:case S.DATA_LOSS:return!0;default:return M(15467,{code:r})}}function yf(r){if(r===void 0)return xe("GRPC error has no .code"),S.UNKNOWN;switch(r){case fe.OK:return S.OK;case fe.CANCELLED:return S.CANCELLED;case fe.UNKNOWN:return S.UNKNOWN;case fe.DEADLINE_EXCEEDED:return S.DEADLINE_EXCEEDED;case fe.RESOURCE_EXHAUSTED:return S.RESOURCE_EXHAUSTED;case fe.INTERNAL:return S.INTERNAL;case fe.UNAVAILABLE:return S.UNAVAILABLE;case fe.UNAUTHENTICATED:return S.UNAUTHENTICATED;case fe.INVALID_ARGUMENT:return S.INVALID_ARGUMENT;case fe.NOT_FOUND:return S.NOT_FOUND;case fe.ALREADY_EXISTS:return S.ALREADY_EXISTS;case fe.PERMISSION_DENIED:return S.PERMISSION_DENIED;case fe.FAILED_PRECONDITION:return S.FAILED_PRECONDITION;case fe.ABORTED:return S.ABORTED;case fe.OUT_OF_RANGE:return S.OUT_OF_RANGE;case fe.UNIMPLEMENTED:return S.UNIMPLEMENTED;case fe.DATA_LOSS:return S.DATA_LOSS;default:return M(39323,{code:r})}}(X=fe||(fe={}))[X.OK=0]="OK",X[X.CANCELLED=1]="CANCELLED",X[X.UNKNOWN=2]="UNKNOWN",X[X.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",X[X.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",X[X.NOT_FOUND=5]="NOT_FOUND",X[X.ALREADY_EXISTS=6]="ALREADY_EXISTS",X[X.PERMISSION_DENIED=7]="PERMISSION_DENIED",X[X.UNAUTHENTICATED=16]="UNAUTHENTICATED",X[X.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",X[X.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",X[X.ABORTED=10]="ABORTED",X[X.OUT_OF_RANGE=11]="OUT_OF_RANGE",X[X.UNIMPLEMENTED=12]="UNIMPLEMENTED",X[X.INTERNAL=13]="INTERNAL",X[X.UNAVAILABLE=14]="UNAVAILABLE",X[X.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Cy=new Bt([4294967295,4294967295],0);function Bl(r){const e=Td().encode(r),t=new pd;return t.update(e),new Uint8Array(t.digest())}function jl(r){const e=new DataView(r.buffer),t=e.getUint32(0,!0),n=e.getUint32(4,!0),i=e.getUint32(8,!0),s=e.getUint32(12,!0);return[new Bt([t,n],0),new Bt([i,s],0)]}class lc{constructor(e,t,n){if(this.bitmap=e,this.padding=t,this.hashCount=n,t<0||t>=8)throw new Xr(`Invalid padding: ${t}`);if(n<0)throw new Xr(`Invalid hash count: ${n}`);if(e.length>0&&this.hashCount===0)throw new Xr(`Invalid hash count: ${n}`);if(e.length===0&&t!==0)throw new Xr(`Invalid padding when bitmap length is 0: ${t}`);this.fe=8*e.length-t,this.ge=Bt.fromNumber(this.fe)}pe(e,t,n){let i=e.add(t.multiply(Bt.fromNumber(n)));return i.compare(Cy)===1&&(i=new Bt([i.getBits(0),i.getBits(1)],0)),i.modulo(this.ge).toNumber()}ye(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(this.fe===0)return!1;const t=Bl(e),[n,i]=jl(t);for(let s=0;s<this.hashCount;s++){const o=this.pe(n,i,s);if(!this.ye(o))return!1}return!0}static create(e,t,n){const i=e%8==0?0:8-e%8,s=new Uint8Array(Math.ceil(e/8)),o=new lc(s,i,t);return n.forEach((c=>o.insert(c))),o}insert(e){if(this.fe===0)return;const t=Bl(e),[n,i]=jl(t);for(let s=0;s<this.hashCount;s++){const o=this.pe(n,i,s);this.we(o)}}we(e){const t=Math.floor(e/8),n=e%8;this.bitmap[t]|=1<<n}}class Xr extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mo{constructor(e,t,n,i,s){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=n,this.documentUpdates=i,this.resolvedLimboDocuments=s}static createSynthesizedRemoteEventForCurrentChange(e,t,n){const i=new Map;return i.set(e,Ni.createSynthesizedTargetChangeForCurrentChange(e,t,n)),new mo(U.min(),i,new ue(q),Ue(),G())}}class Ni{constructor(e,t,n,i,s){this.resumeToken=e,this.current=t,this.addedDocuments=n,this.modifiedDocuments=i,this.removedDocuments=s}static createSynthesizedTargetChangeForCurrentChange(e,t,n){return new Ni(n,t,G(),G(),G())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class As{constructor(e,t,n,i){this.Se=e,this.removedTargetIds=t,this.key=n,this.be=i}}class If{constructor(e,t){this.targetId=e,this.De=t}}class vf{constructor(e,t,n=me.EMPTY_BYTE_STRING,i=null){this.state=e,this.targetIds=t,this.resumeToken=n,this.cause=i}}class ql{constructor(){this.ve=0,this.Ce=zl(),this.Fe=me.EMPTY_BYTE_STRING,this.Me=!1,this.xe=!0}get current(){return this.Me}get resumeToken(){return this.Fe}get Oe(){return this.ve!==0}get Ne(){return this.xe}Be(e){e.approximateByteSize()>0&&(this.xe=!0,this.Fe=e)}Le(){let e=G(),t=G(),n=G();return this.Ce.forEach(((i,s)=>{switch(s){case 0:e=e.add(i);break;case 2:t=t.add(i);break;case 1:n=n.add(i);break;default:M(38017,{changeType:s})}})),new Ni(this.Fe,this.Me,e,t,n)}ke(){this.xe=!1,this.Ce=zl()}qe(e,t){this.xe=!0,this.Ce=this.Ce.insert(e,t)}Qe(e){this.xe=!0,this.Ce=this.Ce.remove(e)}$e(){this.ve+=1}Ue(){this.ve-=1,L(this.ve>=0,3241,{ve:this.ve})}Ke(){this.xe=!0,this.Me=!0}}class Vy{constructor(e){this.We=e,this.Ge=new Map,this.ze=Ue(),this.je=ls(),this.Je=ls(),this.He=new ue(q)}Ye(e){for(const t of e.Se)e.be&&e.be.isFoundDocument()?this.Ze(t,e.be):this.Xe(t,e.key,e.be);for(const t of e.removedTargetIds)this.Xe(t,e.key,e.be)}et(e){this.forEachTarget(e,(t=>{const n=this.tt(t);switch(e.state){case 0:this.nt(t)&&n.Be(e.resumeToken);break;case 1:n.Ue(),n.Oe||n.ke(),n.Be(e.resumeToken);break;case 2:n.Ue(),n.Oe||this.removeTarget(t);break;case 3:this.nt(t)&&(n.Ke(),n.Be(e.resumeToken));break;case 4:this.nt(t)&&(this.rt(t),n.Be(e.resumeToken));break;default:M(56790,{state:e.state})}}))}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.Ge.forEach(((n,i)=>{this.nt(i)&&t(i)}))}it(e){const t=e.targetId,n=e.De.count,i=this.st(t);if(i){const s=i.target;if(Us(s))if(n===0){const o=new O(s.path);this.Xe(t,o,ae.newNoDocument(o,U.min()))}else L(n===1,20013,{expectedCount:n});else{const o=this.ot(t);if(o!==n){const c=this._t(e),u=c?this.ut(c,e,o):1;if(u!==0){this.rt(t);const h=u===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.He=this.He.insert(t,h)}}}}}_t(e){const t=e.De.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:n="",padding:i=0},hashCount:s=0}=t;let o,c;try{o=yt(n).toUint8Array()}catch(u){if(u instanceof Bd)return rt("Decoding the base64 bloom filter in existence filter failed ("+u.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw u}try{c=new lc(o,i,s)}catch(u){return rt(u instanceof Xr?"BloomFilter error: ":"Applying bloom filter failed: ",u),null}return c.fe===0?null:c}ut(e,t,n){return t.De.count===n-this.ht(e,t.targetId)?0:2}ht(e,t){const n=this.We.getRemoteKeysForTarget(t);let i=0;return n.forEach((s=>{const o=this.We.lt(),c=`projects/${o.projectId}/databases/${o.database}/documents/${s.path.canonicalString()}`;e.mightContain(c)||(this.Xe(t,s,null),i++)})),i}Pt(e){const t=new Map;this.Ge.forEach(((s,o)=>{const c=this.st(o);if(c){if(s.current&&Us(c.target)){const u=new O(c.target.path);this.Tt(u).has(o)||this.It(o,u)||this.Xe(o,u,ae.newNoDocument(u,e))}s.Ne&&(t.set(o,s.Le()),s.ke())}}));let n=G();this.Je.forEach(((s,o)=>{let c=!0;o.forEachWhile((u=>{const h=this.st(u);return!h||h.purpose==="TargetPurposeLimboResolution"||(c=!1,!1)})),c&&(n=n.add(s))})),this.ze.forEach(((s,o)=>o.setReadTime(e)));const i=new mo(e,t,this.He,this.ze,n);return this.ze=Ue(),this.je=ls(),this.Je=ls(),this.He=new ue(q),i}Ze(e,t){if(!this.nt(e))return;const n=this.It(e,t.key)?2:0;this.tt(e).qe(t.key,n),this.ze=this.ze.insert(t.key,t),this.je=this.je.insert(t.key,this.Tt(t.key).add(e)),this.Je=this.Je.insert(t.key,this.dt(t.key).add(e))}Xe(e,t,n){if(!this.nt(e))return;const i=this.tt(e);this.It(e,t)?i.qe(t,1):i.Qe(t),this.Je=this.Je.insert(t,this.dt(t).delete(e)),this.Je=this.Je.insert(t,this.dt(t).add(e)),n&&(this.ze=this.ze.insert(t,n))}removeTarget(e){this.Ge.delete(e)}ot(e){const t=this.tt(e).Le();return this.We.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size}$e(e){this.tt(e).$e()}tt(e){let t=this.Ge.get(e);return t||(t=new ql,this.Ge.set(e,t)),t}dt(e){let t=this.Je.get(e);return t||(t=new ne(q),this.Je=this.Je.insert(e,t)),t}Tt(e){let t=this.je.get(e);return t||(t=new ne(q),this.je=this.je.insert(e,t)),t}nt(e){const t=this.st(e)!==null;return t||V("WatchChangeAggregator","Detected inactive target",e),t}st(e){const t=this.Ge.get(e);return t&&t.Oe?null:this.We.Et(e)}rt(e){this.Ge.set(e,new ql),this.We.getRemoteKeysForTarget(e).forEach((t=>{this.Xe(e,t,null)}))}It(e,t){return this.We.getRemoteKeysForTarget(e).has(t)}}function ls(){return new ue(O.comparator)}function zl(){return new ue(O.comparator)}const Dy={asc:"ASCENDING",desc:"DESCENDING"},ky={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},Ny={and:"AND",or:"OR"};class xy{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function Pa(r,e){return r.useProto3Json||Pi(e)?e:{value:e}}function dr(r,e){return r.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function Ef(r,e){return r.useProto3Json?e.toBase64():e.toUint8Array()}function Oy(r,e){return dr(r,e.toTimestamp())}function ve(r){return L(!!r,49232),U.fromTimestamp((function(t){const n=_t(t);return new ee(n.seconds,n.nanos)})(r))}function hc(r,e){return Sa(r,e).canonicalString()}function Sa(r,e){const t=(function(i){return new J(["projects",i.projectId,"databases",i.database])})(r).child("documents");return e===void 0?t:t.child(e)}function Tf(r){const e=J.fromString(r);return L(Df(e),10190,{key:e.toString()}),e}function vi(r,e){return hc(r.databaseId,e.path)}function ft(r,e){const t=Tf(e);if(t.get(1)!==r.databaseId.projectId)throw new k(S.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+r.databaseId.projectId);if(t.get(3)!==r.databaseId.database)throw new k(S.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+r.databaseId.database);return new O(Rf(t))}function wf(r,e){return hc(r.databaseId,e)}function Af(r){const e=Tf(r);return e.length===4?J.emptyPath():Rf(e)}function Ca(r){return new J(["projects",r.databaseId.projectId,"databases",r.databaseId.database]).canonicalString()}function Rf(r){return L(r.length>4&&r.get(4)==="documents",29091,{key:r.toString()}),r.popFirst(5)}function $l(r,e,t){return{name:vi(r,e),fields:t.value.mapValue.fields}}function My(r,e,t){const n=ft(r,e.name),i=ve(e.updateTime),s=e.createTime?ve(e.createTime):U.min(),o=new Ae({mapValue:{fields:e.fields}}),c=ae.newFoundDocument(n,i,s,o);return t&&c.setHasCommittedMutations(),t?c.setHasCommittedMutations():c}function Ly(r,e){return"found"in e?(function(n,i){L(!!i.found,43571),i.found.name,i.found.updateTime;const s=ft(n,i.found.name),o=ve(i.found.updateTime),c=i.found.createTime?ve(i.found.createTime):U.min(),u=new Ae({mapValue:{fields:i.found.fields}});return ae.newFoundDocument(s,o,c,u)})(r,e):"missing"in e?(function(n,i){L(!!i.missing,3894),L(!!i.readTime,22933);const s=ft(n,i.missing),o=ve(i.readTime);return ae.newNoDocument(s,o)})(r,e):M(7234,{result:e})}function Fy(r,e){let t;if("targetChange"in e){e.targetChange;const n=(function(h){return h==="NO_CHANGE"?0:h==="ADD"?1:h==="REMOVE"?2:h==="CURRENT"?3:h==="RESET"?4:M(39313,{state:h})})(e.targetChange.targetChangeType||"NO_CHANGE"),i=e.targetChange.targetIds||[],s=(function(h,f){return h.useProto3Json?(L(f===void 0||typeof f=="string",58123),me.fromBase64String(f||"")):(L(f===void 0||f instanceof Buffer||f instanceof Uint8Array,16193),me.fromUint8Array(f||new Uint8Array))})(r,e.targetChange.resumeToken),o=e.targetChange.cause,c=o&&(function(h){const f=h.code===void 0?S.UNKNOWN:yf(h.code);return new k(f,h.message||"")})(o);t=new vf(n,i,s,c||null)}else if("documentChange"in e){e.documentChange;const n=e.documentChange;n.document,n.document.name,n.document.updateTime;const i=ft(r,n.document.name),s=ve(n.document.updateTime),o=n.document.createTime?ve(n.document.createTime):U.min(),c=new Ae({mapValue:{fields:n.document.fields}}),u=ae.newFoundDocument(i,s,o,c),h=n.targetIds||[],f=n.removedTargetIds||[];t=new As(h,f,u.key,u)}else if("documentDelete"in e){e.documentDelete;const n=e.documentDelete;n.document;const i=ft(r,n.document),s=n.readTime?ve(n.readTime):U.min(),o=ae.newNoDocument(i,s),c=n.removedTargetIds||[];t=new As([],c,o.key,o)}else if("documentRemove"in e){e.documentRemove;const n=e.documentRemove;n.document;const i=ft(r,n.document),s=n.removedTargetIds||[];t=new As([],s,i,null)}else{if(!("filter"in e))return M(11601,{At:e});{e.filter;const n=e.filter;n.targetId;const{count:i=0,unchangedNames:s}=n,o=new Sy(i,s),c=n.targetId;t=new If(c,o)}}return t}function Ei(r,e){let t;if(e instanceof _r)t={update:$l(r,e.key,e.value)};else if(e instanceof yr)t={delete:vi(r,e.key)};else if(e instanceof Tt)t={update:$l(r,e.key,e.data),updateMask:$y(e.fieldMask)};else{if(!(e instanceof oc))return M(16599,{Rt:e.type});t={verify:vi(r,e.key)}}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map((n=>(function(s,o){const c=o.transform;if(c instanceof lr)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(c instanceof yn)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:c.elements}};if(c instanceof In)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:c.elements}};if(c instanceof hr)return{fieldPath:o.field.canonicalString(),increment:c.Ee};throw M(20930,{transform:o.transform})})(0,n)))),e.precondition.isNone||(t.currentDocument=(function(i,s){return s.updateTime!==void 0?{updateTime:Oy(i,s.updateTime)}:s.exists!==void 0?{exists:s.exists}:M(27497)})(r,e.precondition)),t}function Va(r,e){const t=e.currentDocument?(function(s){return s.updateTime!==void 0?ce.updateTime(ve(s.updateTime)):s.exists!==void 0?ce.exists(s.exists):ce.none()})(e.currentDocument):ce.none(),n=e.updateTransforms?e.updateTransforms.map((i=>(function(o,c){let u=null;if("setToServerValue"in c)L(c.setToServerValue==="REQUEST_TIME",16630,{proto:c}),u=new lr;else if("appendMissingElements"in c){const f=c.appendMissingElements.values||[];u=new yn(f)}else if("removeAllFromArray"in c){const f=c.removeAllFromArray.values||[];u=new In(f)}else"increment"in c?u=new hr(o,c.increment):M(16584,{proto:c});const h=le.fromServerFormat(c.fieldPath);return new ki(h,u)})(r,i))):[];if(e.update){e.update.name;const i=ft(r,e.update.name),s=new Ae({mapValue:{fields:e.update.fields}});if(e.updateMask){const o=(function(u){const h=u.fieldPaths||[];return new Oe(h.map((f=>le.fromServerFormat(f))))})(e.updateMask);return new Tt(i,s,o,t,n)}return new _r(i,s,t,n)}if(e.delete){const i=ft(r,e.delete);return new yr(i,t)}if(e.verify){const i=ft(r,e.verify);return new oc(i,t)}return M(1463,{proto:e})}function Uy(r,e){return r&&r.length>0?(L(e!==void 0,14353),r.map((t=>(function(i,s){let o=i.updateTime?ve(i.updateTime):ve(s);return o.isEqual(U.min())&&(o=ve(s)),new Ry(o,i.transformResults||[])})(t,e)))):[]}function bf(r,e){return{documents:[wf(r,e.path)]}}function Pf(r,e){const t={structuredQuery:{}},n=e.path;let i;e.collectionGroup!==null?(i=n,t.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(i=n.popLast(),t.structuredQuery.from=[{collectionId:n.lastSegment()}]),t.parent=wf(r,i);const s=(function(h){if(h.length!==0)return Vf(te.create(h,"and"))})(e.filters);s&&(t.structuredQuery.where=s);const o=(function(h){if(h.length!==0)return h.map((f=>(function(g){return{field:Gn(g.field),direction:jy(g.dir)}})(f)))})(e.orderBy);o&&(t.structuredQuery.orderBy=o);const c=Pa(r,e.limit);return c!==null&&(t.structuredQuery.limit=c),e.startAt&&(t.structuredQuery.startAt=(function(h){return{before:h.inclusive,values:h.position}})(e.startAt)),e.endAt&&(t.structuredQuery.endAt=(function(h){return{before:!h.inclusive,values:h.position}})(e.endAt)),{Vt:t,parent:i}}function Sf(r){let e=Af(r.parent);const t=r.structuredQuery,n=t.from?t.from.length:0;let i=null;if(n>0){L(n===1,65062);const f=t.from[0];f.allDescendants?i=f.collectionId:e=e.child(f.collectionId)}let s=[];t.where&&(s=(function(m){const g=Cf(m);return g instanceof te&&ic(g)?g.getFilters():[g]})(t.where));let o=[];t.orderBy&&(o=(function(m){return m.map((g=>(function(C){return new Ii(Kn(C.field),(function(D){switch(D){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}})(C.direction))})(g)))})(t.orderBy));let c=null;t.limit&&(c=(function(m){let g;return g=typeof m=="object"?m.value:m,Pi(g)?null:g})(t.limit));let u=null;t.startAt&&(u=(function(m){const g=!!m.before,b=m.values||[];return new cr(b,g)})(t.startAt));let h=null;return t.endAt&&(h=(function(m){const g=!m.before,b=m.values||[];return new cr(b,g)})(t.endAt)),fy(e,i,o,s,c,"F",u,h)}function By(r,e){const t=(function(i){switch(i){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return M(28987,{purpose:i})}})(e.purpose);return t==null?null:{"goog-listen-tags":t}}function Cf(r){return r.unaryFilter!==void 0?(function(t){switch(t.unaryFilter.op){case"IS_NAN":const n=Kn(t.unaryFilter.field);return Q.create(n,"==",{doubleValue:NaN});case"IS_NULL":const i=Kn(t.unaryFilter.field);return Q.create(i,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const s=Kn(t.unaryFilter.field);return Q.create(s,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=Kn(t.unaryFilter.field);return Q.create(o,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return M(61313);default:return M(60726)}})(r):r.fieldFilter!==void 0?(function(t){return Q.create(Kn(t.fieldFilter.field),(function(i){switch(i){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return M(58110);default:return M(50506)}})(t.fieldFilter.op),t.fieldFilter.value)})(r):r.compositeFilter!==void 0?(function(t){return te.create(t.compositeFilter.filters.map((n=>Cf(n))),(function(i){switch(i){case"AND":return"and";case"OR":return"or";default:return M(1026)}})(t.compositeFilter.op))})(r):M(30097,{filter:r})}function jy(r){return Dy[r]}function qy(r){return ky[r]}function zy(r){return Ny[r]}function Gn(r){return{fieldPath:r.canonicalString()}}function Kn(r){return le.fromServerFormat(r.fieldPath)}function Vf(r){return r instanceof Q?(function(t){if(t.op==="=="){if(Sl(t.value))return{unaryFilter:{field:Gn(t.field),op:"IS_NAN"}};if(Pl(t.value))return{unaryFilter:{field:Gn(t.field),op:"IS_NULL"}}}else if(t.op==="!="){if(Sl(t.value))return{unaryFilter:{field:Gn(t.field),op:"IS_NOT_NAN"}};if(Pl(t.value))return{unaryFilter:{field:Gn(t.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:Gn(t.field),op:qy(t.op),value:t.value}}})(r):r instanceof te?(function(t){const n=t.getFilters().map((i=>Vf(i)));return n.length===1?n[0]:{compositeFilter:{op:zy(t.op),filters:n}}})(r):M(54877,{filter:r})}function $y(r){const e=[];return r.fields.forEach((t=>e.push(t.canonicalString()))),{fieldPaths:e}}function Df(r){return r.length>=4&&r.get(0)==="projects"&&r.get(2)==="databases"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lt{constructor(e,t,n,i,s=U.min(),o=U.min(),c=me.EMPTY_BYTE_STRING,u=null){this.target=e,this.targetId=t,this.purpose=n,this.sequenceNumber=i,this.snapshotVersion=s,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=c,this.expectedCount=u}withSequenceNumber(e){return new lt(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new lt(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new lt(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new lt(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kf{constructor(e){this.gt=e}}function Gy(r,e){let t;if(e.document)t=My(r.gt,e.document,!!e.hasCommittedMutations);else if(e.noDocument){const n=O.fromSegments(e.noDocument.path),i=En(e.noDocument.readTime);t=ae.newNoDocument(n,i),e.hasCommittedMutations&&t.setHasCommittedMutations()}else{if(!e.unknownDocument)return M(56709);{const n=O.fromSegments(e.unknownDocument.path),i=En(e.unknownDocument.version);t=ae.newUnknownDocument(n,i)}}return e.readTime&&t.setReadTime((function(i){const s=new ee(i[0],i[1]);return U.fromTimestamp(s)})(e.readTime)),t}function Gl(r,e){const t=e.key,n={prefixPath:t.getCollectionPath().popLast().toArray(),collectionGroup:t.collectionGroup,documentId:t.path.lastSegment(),readTime:qs(e.readTime),hasCommittedMutations:e.hasCommittedMutations};if(e.isFoundDocument())n.document=(function(s,o){return{name:vi(s,o.key),fields:o.data.value.mapValue.fields,updateTime:dr(s,o.version.toTimestamp()),createTime:dr(s,o.createTime.toTimestamp())}})(r.gt,e);else if(e.isNoDocument())n.noDocument={path:t.path.toArray(),readTime:vn(e.version)};else{if(!e.isUnknownDocument())return M(57904,{document:e});n.unknownDocument={path:t.path.toArray(),version:vn(e.version)}}return n}function qs(r){const e=r.toTimestamp();return[e.seconds,e.nanoseconds]}function vn(r){const e=r.toTimestamp();return{seconds:e.seconds,nanoseconds:e.nanoseconds}}function En(r){const e=new ee(r.seconds,r.nanoseconds);return U.fromTimestamp(e)}function an(r,e){const t=(e.baseMutations||[]).map((s=>Va(r.gt,s)));for(let s=0;s<e.mutations.length-1;++s){const o=e.mutations[s];if(s+1<e.mutations.length&&e.mutations[s+1].transform!==void 0){const c=e.mutations[s+1];o.updateTransforms=c.transform.fieldTransforms,e.mutations.splice(s+1,1),++s}}const n=e.mutations.map((s=>Va(r.gt,s))),i=ee.fromMillis(e.localWriteTimeMs);return new ac(e.batchId,i,t,n)}function Jr(r){const e=En(r.readTime),t=r.lastLimboFreeSnapshotVersion!==void 0?En(r.lastLimboFreeSnapshotVersion):U.min();let n;return n=(function(s){return s.documents!==void 0})(r.query)?(function(s){const o=s.documents.length;return L(o===1,1966,{count:o}),ze(Vi(Af(s.documents[0])))})(r.query):(function(s){return ze(Sf(s))})(r.query),new lt(n,r.targetId,"TargetPurposeListen",r.lastListenSequenceNumber,e,t,me.fromBase64String(r.resumeToken))}function Nf(r,e){const t=vn(e.snapshotVersion),n=vn(e.lastLimboFreeSnapshotVersion);let i;i=Us(e.target)?bf(r.gt,e.target):Pf(r.gt,e.target).Vt;const s=e.resumeToken.toBase64();return{targetId:e.targetId,canonicalId:_n(e.target),readTime:t,resumeToken:s,lastListenSequenceNumber:e.sequenceNumber,lastLimboFreeSnapshotVersion:n,query:i}}function xf(r){const e=Sf({parent:r.parent,structuredQuery:r.structuredQuery});return r.limitType==="LAST"?js(e,e.limit,"L"):e}function ra(r,e){return new uc(e.largestBatchId,Va(r.gt,e.overlayMutation))}function Kl(r,e){const t=e.path.lastSegment();return[r,De(e.path.popLast()),t]}function Wl(r,e,t,n){return{indexId:r,uid:e,sequenceNumber:t,readTime:vn(n.readTime),documentKey:De(n.documentKey.path),largestBatchId:n.largestBatchId}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ky{getBundleMetadata(e,t){return Hl(e).get(t).next((n=>{if(n)return(function(s){return{id:s.bundleId,createTime:En(s.createTime),version:s.version}})(n)}))}saveBundleMetadata(e,t){return Hl(e).put((function(i){return{bundleId:i.id,createTime:vn(ve(i.createTime)),version:i.version}})(t))}getNamedQuery(e,t){return Ql(e).get(t).next((n=>{if(n)return(function(s){return{name:s.name,query:xf(s.bundledQuery),readTime:En(s.readTime)}})(n)}))}saveNamedQuery(e,t){return Ql(e).put((function(i){return{name:i.name,readTime:vn(ve(i.readTime)),bundledQuery:i.bundledQuery}})(t))}}function Hl(r){return _e(r,oo)}function Ql(r){return _e(r,ao)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class go{constructor(e,t){this.serializer=e,this.userId=t}static yt(e,t){const n=t.uid||"";return new go(e,n)}getOverlay(e,t){return jr(e).get(Kl(this.userId,t)).next((n=>n?ra(this.serializer,n):null))}getOverlays(e,t){const n=Ye();return w.forEach(t,(i=>this.getOverlay(e,i).next((s=>{s!==null&&n.set(i,s)})))).next((()=>n))}saveOverlays(e,t,n){const i=[];return n.forEach(((s,o)=>{const c=new uc(t,o);i.push(this.wt(e,c))})),w.waitFor(i)}removeOverlaysForBatchId(e,t,n){const i=new Set;t.forEach((o=>i.add(De(o.getCollectionPath()))));const s=[];return i.forEach((o=>{const c=IDBKeyRange.bound([this.userId,o,n],[this.userId,o,n+1],!1,!0);s.push(jr(e).Y(Ia,c))})),w.waitFor(s)}getOverlaysForCollection(e,t,n){const i=Ye(),s=De(t),o=IDBKeyRange.bound([this.userId,s,n],[this.userId,s,Number.POSITIVE_INFINITY],!0);return jr(e).j(Ia,o).next((c=>{for(const u of c){const h=ra(this.serializer,u);i.set(h.getKey(),h)}return i}))}getOverlaysForCollectionGroup(e,t,n,i){const s=Ye();let o;const c=IDBKeyRange.bound([this.userId,t,n],[this.userId,t,Number.POSITIVE_INFINITY],!0);return jr(e).X({index:xd,range:c},((u,h,f)=>{const m=ra(this.serializer,h);s.size()<i||m.largestBatchId===o?(s.set(m.getKey(),m),o=m.largestBatchId):f.done()})).next((()=>s))}wt(e,t){return jr(e).put((function(i,s,o){const[c,u,h]=Kl(s,o.mutation.key);return{userId:s,collectionPath:u,documentId:h,collectionGroup:o.mutation.key.getCollectionGroup(),largestBatchId:o.largestBatchId,overlayMutation:Ei(i.gt,o.mutation)}})(this.serializer,this.userId,t))}}function jr(r){return _e(r,co)}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wy{St(e){return _e(e,Za)}getSessionToken(e){return this.St(e).get("sessionToken").next((t=>{const n=t==null?void 0:t.value;return n?me.fromUint8Array(n):me.EMPTY_BYTE_STRING}))}setSessionToken(e,t){return this.St(e).put({name:"sessionToken",value:t.toUint8Array()})}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cn{constructor(){}bt(e,t){this.Dt(e,t),t.vt()}Dt(e,t){if("nullValue"in e)this.Ct(t,5);else if("booleanValue"in e)this.Ct(t,10),t.Ft(e.booleanValue?1:0);else if("integerValue"in e)this.Ct(t,15),t.Ft(oe(e.integerValue));else if("doubleValue"in e){const n=oe(e.doubleValue);isNaN(n)?this.Ct(t,13):(this.Ct(t,15),hi(n)?t.Ft(0):t.Ft(n))}else if("timestampValue"in e){let n=e.timestampValue;this.Ct(t,20),typeof n=="string"&&(n=_t(n)),t.Mt(`${n.seconds||""}`),t.Ft(n.nanos||0)}else if("stringValue"in e)this.xt(e.stringValue,t),this.Ot(t);else if("bytesValue"in e)this.Ct(t,30),t.Nt(yt(e.bytesValue)),this.Ot(t);else if("referenceValue"in e)this.Bt(e.referenceValue,t);else if("geoPointValue"in e){const n=e.geoPointValue;this.Ct(t,45),t.Ft(n.latitude||0),t.Ft(n.longitude||0)}else"mapValue"in e?Kd(e)?this.Ct(t,Number.MAX_SAFE_INTEGER):lo(e)?this.Lt(e.mapValue,t):(this.kt(e.mapValue,t),this.Ot(t)):"arrayValue"in e?(this.qt(e.arrayValue,t),this.Ot(t)):M(19022,{Qt:e})}xt(e,t){this.Ct(t,25),this.$t(e,t)}$t(e,t){t.Mt(e)}kt(e,t){const n=e.fields||{};this.Ct(t,55);for(const i of Object.keys(n))this.xt(i,t),this.Dt(n[i],t)}Lt(e,t){var n,i;const s=e.fields||{};this.Ct(t,53);const o=or,c=((i=(n=s[o].arrayValue)===null||n===void 0?void 0:n.values)===null||i===void 0?void 0:i.length)||0;this.Ct(t,15),t.Ft(oe(c)),this.xt(o,t),this.Dt(s[o],t)}qt(e,t){const n=e.values||[];this.Ct(t,50);for(const i of n)this.Dt(i,t)}Bt(e,t){this.Ct(t,37),O.fromName(e).path.forEach((n=>{this.Ct(t,60),this.$t(n,t)}))}Ct(e,t){e.Ft(t)}Ot(e){e.Ft(2)}}cn.Ut=new cn;/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law | agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES | CONDITIONS OF ANY KIND, either express | implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Un=255;function Hy(r){if(r===0)return 8;let e=0;return r>>4||(e+=4,r<<=4),r>>6||(e+=2,r<<=2),r>>7||(e+=1),e}function Xl(r){const e=64-(function(n){let i=0;for(let s=0;s<8;++s){const o=Hy(255&n[s]);if(i+=o,o!==8)break}return i})(r);return Math.ceil(e/8)}class Qy{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Kt(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Wt(n.value),n=t.next();this.Gt()}zt(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.jt(n.value),n=t.next();this.Jt()}Ht(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.Wt(n);else if(n<2048)this.Wt(960|n>>>6),this.Wt(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.Wt(480|n>>>12),this.Wt(128|63&n>>>6),this.Wt(128|63&n);else{const i=t.codePointAt(0);this.Wt(240|i>>>18),this.Wt(128|63&i>>>12),this.Wt(128|63&i>>>6),this.Wt(128|63&i)}}this.Gt()}Yt(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.jt(n);else if(n<2048)this.jt(960|n>>>6),this.jt(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.jt(480|n>>>12),this.jt(128|63&n>>>6),this.jt(128|63&n);else{const i=t.codePointAt(0);this.jt(240|i>>>18),this.jt(128|63&i>>>12),this.jt(128|63&i>>>6),this.jt(128|63&i)}}this.Jt()}Zt(e){const t=this.Xt(e),n=Xl(t);this.en(1+n),this.buffer[this.position++]=255&n;for(let i=t.length-n;i<t.length;++i)this.buffer[this.position++]=255&t[i]}tn(e){const t=this.Xt(e),n=Xl(t);this.en(1+n),this.buffer[this.position++]=~(255&n);for(let i=t.length-n;i<t.length;++i)this.buffer[this.position++]=~(255&t[i])}nn(){this.rn(Un),this.rn(255)}sn(){this._n(Un),this._n(255)}reset(){this.position=0}seed(e){this.en(e.length),this.buffer.set(e,this.position),this.position+=e.length}an(){return this.buffer.slice(0,this.position)}Xt(e){const t=(function(s){const o=new DataView(new ArrayBuffer(8));return o.setFloat64(0,s,!1),new Uint8Array(o.buffer)})(e),n=!!(128&t[0]);t[0]^=n?255:128;for(let i=1;i<t.length;++i)t[i]^=n?255:0;return t}Wt(e){const t=255&e;t===0?(this.rn(0),this.rn(255)):t===Un?(this.rn(Un),this.rn(0)):this.rn(t)}jt(e){const t=255&e;t===0?(this._n(0),this._n(255)):t===Un?(this._n(Un),this._n(0)):this._n(e)}Gt(){this.rn(0),this.rn(1)}Jt(){this._n(0),this._n(1)}rn(e){this.en(1),this.buffer[this.position++]=e}_n(e){this.en(1),this.buffer[this.position++]=~e}en(e){const t=e+this.position;if(t<=this.buffer.length)return;let n=2*this.buffer.length;n<t&&(n=t);const i=new Uint8Array(n);i.set(this.buffer),this.buffer=i}}class Xy{constructor(e){this.un=e}Nt(e){this.un.Kt(e)}Mt(e){this.un.Ht(e)}Ft(e){this.un.Zt(e)}vt(){this.un.nn()}}class Jy{constructor(e){this.un=e}Nt(e){this.un.zt(e)}Mt(e){this.un.Yt(e)}Ft(e){this.un.tn(e)}vt(){this.un.sn()}}class qr{constructor(){this.un=new Qy,this.cn=new Xy(this.un),this.ln=new Jy(this.un)}seed(e){this.un.seed(e)}hn(e){return e===0?this.cn:this.ln}an(){return this.un.an()}reset(){this.un.reset()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class un{constructor(e,t,n,i){this.Pn=e,this.Tn=t,this.In=n,this.dn=i}En(){const e=this.dn.length,t=e===0||this.dn[e-1]===255?e+1:e,n=new Uint8Array(t);return n.set(this.dn,0),t!==e?n.set([0],this.dn.length):++n[n.length-1],new un(this.Pn,this.Tn,this.In,n)}An(e,t,n){return{indexId:this.Pn,uid:e,arrayValue:Rs(this.In),directionalValue:Rs(this.dn),orderedDocumentKey:Rs(t),documentKey:n.path.toArray()}}Rn(e,t,n){const i=this.An(e,t,n);return[i.indexId,i.uid,i.arrayValue,i.directionalValue,i.orderedDocumentKey,i.documentKey]}}function Pt(r,e){let t=r.Pn-e.Pn;return t!==0?t:(t=Jl(r.In,e.In),t!==0?t:(t=Jl(r.dn,e.dn),t!==0?t:O.comparator(r.Tn,e.Tn)))}function Jl(r,e){for(let t=0;t<r.length&&t<e.length;++t){const n=r[t]-e[t];if(n!==0)return n}return r.length-e.length}function Rs(r){return ud()?(function(t){let n="";for(let i=0;i<t.length;i++)n+=String.fromCharCode(t[i]);return n})(r):r}function Yl(r){return typeof r!="string"?r:(function(t){const n=new Uint8Array(t.length);for(let i=0;i<t.length;i++)n[i]=t.charCodeAt(i);return n})(r)}class Zl{constructor(e){this.Vn=new ne(((t,n)=>le.comparator(t.field,n.field))),this.collectionId=e.collectionGroup!=null?e.collectionGroup:e.path.lastSegment(),this.mn=e.orderBy,this.fn=[];for(const t of e.filters){const n=t;n.isInequality()?this.Vn=this.Vn.add(n):this.fn.push(n)}}get gn(){return this.Vn.size>1}pn(e){if(L(e.collectionGroup===this.collectionId,49279),this.gn)return!1;const t=ga(e);if(t!==void 0&&!this.yn(t))return!1;const n=rn(e);let i=new Set,s=0,o=0;for(;s<n.length&&this.yn(n[s]);++s)i=i.add(n[s].fieldPath.canonicalString());if(s===n.length)return!0;if(this.Vn.size>0){const c=this.Vn.getIterator().getNext();if(!i.has(c.field.canonicalString())){const u=n[s];if(!this.wn(c,u)||!this.Sn(this.mn[o++],u))return!1}++s}for(;s<n.length;++s){const c=n[s];if(o>=this.mn.length||!this.Sn(this.mn[o++],c))return!1}return!0}bn(){if(this.gn)return null;let e=new ne(le.comparator);const t=[];for(const n of this.fn)if(!n.field.isKeyField())if(n.op==="array-contains"||n.op==="array-contains-any")t.push(new _s(n.field,2));else{if(e.has(n.field))continue;e=e.add(n.field),t.push(new _s(n.field,0))}for(const n of this.mn)n.field.isKeyField()||e.has(n.field)||(e=e.add(n.field),t.push(new _s(n.field,n.dir==="asc"?0:1)));return new xs(xs.UNKNOWN_ID,this.collectionId,t,li.empty())}yn(e){for(const t of this.fn)if(this.wn(t,e))return!0;return!1}wn(e,t){if(e===void 0||!e.field.isEqual(t.fieldPath))return!1;const n=e.op==="array-contains"||e.op==="array-contains-any";return t.kind===2===n}Sn(e,t){return!!e.field.isEqual(t.fieldPath)&&(t.kind===0&&e.dir==="asc"||t.kind===1&&e.dir==="desc")}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Of(r){var e,t;if(L(r instanceof Q||r instanceof te,20012),r instanceof Q){if(r instanceof tf){const i=((t=(e=r.value.arrayValue)===null||e===void 0?void 0:e.values)===null||t===void 0?void 0:t.map((s=>Q.create(r.field,"==",s))))||[];return te.create(i,"or")}return r}const n=r.filters.map((i=>Of(i)));return te.create(n,r.op)}function Yy(r){if(r.getFilters().length===0)return[];const e=Na(Of(r));return L(Mf(e),7391),Da(e)||ka(e)?[e]:e.getFilters()}function Da(r){return r instanceof Q}function ka(r){return r instanceof te&&ic(r)}function Mf(r){return Da(r)||ka(r)||(function(t){if(t instanceof te&&wa(t)){for(const n of t.getFilters())if(!Da(n)&&!ka(n))return!1;return!0}return!1})(r)}function Na(r){if(L(r instanceof Q||r instanceof te,34018),r instanceof Q)return r;if(r.filters.length===1)return Na(r.filters[0]);const e=r.filters.map((n=>Na(n)));let t=te.create(e,r.op);return t=zs(t),Mf(t)?t:(L(t instanceof te,64498),L(ur(t),40251),L(t.filters.length>1,57927),t.filters.reduce(((n,i)=>dc(n,i))))}function dc(r,e){let t;return L(r instanceof Q||r instanceof te,38388),L(e instanceof Q||e instanceof te,25473),t=r instanceof Q?e instanceof Q?(function(i,s){return te.create([i,s],"and")})(r,e):eh(r,e):e instanceof Q?eh(e,r):(function(i,s){if(L(i.filters.length>0&&s.filters.length>0,48005),ur(i)&&ur(s))return Yd(i,s.getFilters());const o=wa(i)?i:s,c=wa(i)?s:i,u=o.filters.map((h=>dc(h,c)));return te.create(u,"or")})(r,e),zs(t)}function eh(r,e){if(ur(e))return Yd(e,r.getFilters());{const t=e.filters.map((n=>dc(r,n)));return te.create(t,"or")}}function zs(r){if(L(r instanceof Q||r instanceof te,11850),r instanceof Q)return r;const e=r.getFilters();if(e.length===1)return zs(e[0]);if(Xd(r))return r;const t=e.map((i=>zs(i))),n=[];return t.forEach((i=>{i instanceof Q?n.push(i):i instanceof te&&(i.op===r.op?n.push(...i.filters):n.push(i))})),n.length===1?n[0]:te.create(n,r.op)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zy{constructor(){this.Dn=new fc}addToCollectionParentIndex(e,t){return this.Dn.add(t),w.resolve()}getCollectionParents(e,t){return w.resolve(this.Dn.getEntries(t))}addFieldIndex(e,t){return w.resolve()}deleteFieldIndex(e,t){return w.resolve()}deleteAllFieldIndexes(e){return w.resolve()}createTargetIndexes(e,t){return w.resolve()}getDocumentsMatchingTarget(e,t){return w.resolve(null)}getIndexType(e,t){return w.resolve(0)}getFieldIndexes(e,t){return w.resolve([])}getNextCollectionGroupToUpdate(e){return w.resolve(null)}getMinOffset(e,t){return w.resolve(Be.min())}getMinOffsetFromCollectionGroup(e,t){return w.resolve(Be.min())}updateCollectionGroup(e,t,n){return w.resolve()}updateIndexEntries(e,t){return w.resolve()}}class fc{constructor(){this.index={}}add(e){const t=e.lastSegment(),n=e.popLast(),i=this.index[t]||new ne(J.comparator),s=!i.has(n);return this.index[t]=i.add(n),s}has(e){const t=e.lastSegment(),n=e.popLast(),i=this.index[t];return i&&i.has(n)}getEntries(e){return(this.index[e]||new ne(J.comparator)).toArray()}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const th="IndexedDbIndexManager",hs=new Uint8Array(0);class eI{constructor(e,t){this.databaseId=t,this.vn=new fc,this.Cn=new Et((n=>_n(n)),((n,i)=>Ci(n,i))),this.uid=e.uid||""}addToCollectionParentIndex(e,t){if(!this.vn.has(t)){const n=t.lastSegment(),i=t.popLast();e.addOnCommittedListener((()=>{this.vn.add(t)}));const s={collectionId:n,parent:De(i)};return nh(e).put(s)}return w.resolve()}getCollectionParents(e,t){const n=[],i=IDBKeyRange.bound([t,""],[wd(t),""],!1,!0);return nh(e).j(i).next((s=>{for(const o of s){if(o.collectionId!==t)break;n.push(Je(o.parent))}return n}))}addFieldIndex(e,t){const n=zr(e),i=(function(c){return{indexId:c.indexId,collectionGroup:c.collectionGroup,fields:c.fields.map((u=>[u.fieldPath.canonicalString(),u.kind]))}})(t);delete i.indexId;const s=n.add(i);if(t.indexState){const o=jn(e);return s.next((c=>{o.put(Wl(c,this.uid,t.indexState.sequenceNumber,t.indexState.offset))}))}return s.next()}deleteFieldIndex(e,t){const n=zr(e),i=jn(e),s=Bn(e);return n.delete(t.indexId).next((()=>i.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0)))).next((()=>s.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0))))}deleteAllFieldIndexes(e){const t=zr(e),n=Bn(e),i=jn(e);return t.Y().next((()=>n.Y())).next((()=>i.Y()))}createTargetIndexes(e,t){return w.forEach(this.Fn(t),(n=>this.getIndexType(e,n).next((i=>{if(i===0||i===1){const s=new Zl(n).bn();if(s!=null)return this.addFieldIndex(e,s)}}))))}getDocumentsMatchingTarget(e,t){const n=Bn(e);let i=!0;const s=new Map;return w.forEach(this.Fn(t),(o=>this.Mn(e,o).next((c=>{i&&(i=!!c),s.set(o,c)})))).next((()=>{if(i){let o=G();const c=[];return w.forEach(s,((u,h)=>{V(th,`Using index ${(function(F){return`id=${F.indexId}|cg=${F.collectionGroup}|f=${F.fields.map((W=>`${W.fieldPath}:${W.kind}`)).join(",")}`})(u)} to execute ${_n(t)}`);const f=(function(F,W){const Z=ga(W);if(Z===void 0)return null;for(const K of Bs(F,Z.fieldPath))switch(K.op){case"array-contains-any":return K.value.arrayValue.values||[];case"array-contains":return[K.value]}return null})(h,u),m=(function(F,W){const Z=new Map;for(const K of rn(W))for(const v of Bs(F,K.fieldPath))switch(v.op){case"==":case"in":Z.set(K.fieldPath.canonicalString(),v.value);break;case"not-in":case"!=":return Z.set(K.fieldPath.canonicalString(),v.value),Array.from(Z.values())}return null})(h,u),g=(function(F,W){const Z=[];let K=!0;for(const v of rn(W)){const _=v.kind===0?Nl(F,v.fieldPath,F.startAt):xl(F,v.fieldPath,F.startAt);Z.push(_.value),K&&(K=_.inclusive)}return new cr(Z,K)})(h,u),b=(function(F,W){const Z=[];let K=!0;for(const v of rn(W)){const _=v.kind===0?xl(F,v.fieldPath,F.endAt):Nl(F,v.fieldPath,F.endAt);Z.push(_.value),K&&(K=_.inclusive)}return new cr(Z,K)})(h,u),C=this.xn(u,h,g),N=this.xn(u,h,b),D=this.On(u,h,m),$=this.Nn(u.indexId,f,C,g.inclusive,N,b.inclusive,D);return w.forEach($,(B=>n.H(B,t.limit).next((F=>{F.forEach((W=>{const Z=O.fromSegments(W.documentKey);o.has(Z)||(o=o.add(Z),c.push(Z))}))}))))})).next((()=>c))}return w.resolve(null)}))}Fn(e){let t=this.Cn.get(e);return t||(e.filters.length===0?t=[e]:t=Yy(te.create(e.filters,"and")).map((n=>Ra(e.path,e.collectionGroup,e.orderBy,n.getFilters(),e.limit,e.startAt,e.endAt))),this.Cn.set(e,t),t)}Nn(e,t,n,i,s,o,c){const u=(t!=null?t.length:1)*Math.max(n.length,s.length),h=u/(t!=null?t.length:1),f=[];for(let m=0;m<u;++m){const g=t?this.Bn(t[m/h]):hs,b=this.Ln(e,g,n[m%h],i),C=this.kn(e,g,s[m%h],o),N=c.map((D=>this.Ln(e,g,D,!0)));f.push(...this.createRange(b,C,N))}return f}Ln(e,t,n,i){const s=new un(e,O.empty(),t,n);return i?s:s.En()}kn(e,t,n,i){const s=new un(e,O.empty(),t,n);return i?s.En():s}Mn(e,t){const n=new Zl(t),i=t.collectionGroup!=null?t.collectionGroup:t.path.lastSegment();return this.getFieldIndexes(e,i).next((s=>{let o=null;for(const c of s)n.pn(c)&&(!o||c.fields.length>o.fields.length)&&(o=c);return o}))}getIndexType(e,t){let n=2;const i=this.Fn(t);return w.forEach(i,(s=>this.Mn(e,s).next((o=>{o?n!==0&&o.fields.length<(function(u){let h=new ne(le.comparator),f=!1;for(const m of u.filters)for(const g of m.getFlattenedFilters())g.field.isKeyField()||(g.op==="array-contains"||g.op==="array-contains-any"?f=!0:h=h.add(g.field));for(const m of u.orderBy)m.field.isKeyField()||(h=h.add(m.field));return h.size+(f?1:0)})(s)&&(n=1):n=0})))).next((()=>(function(o){return o.limit!==null})(t)&&i.length>1&&n===2?1:n))}qn(e,t){const n=new qr;for(const i of rn(e)){const s=t.data.field(i.fieldPath);if(s==null)return null;const o=n.hn(i.kind);cn.Ut.bt(s,o)}return n.an()}Bn(e){const t=new qr;return cn.Ut.bt(e,t.hn(0)),t.an()}Qn(e,t){const n=new qr;return cn.Ut.bt(_i(this.databaseId,t),n.hn((function(s){const o=rn(s);return o.length===0?0:o[o.length-1].kind})(e))),n.an()}On(e,t,n){if(n===null)return[];let i=[];i.push(new qr);let s=0;for(const o of rn(e)){const c=n[s++];for(const u of i)if(this.$n(t,o.fieldPath)&&yi(c))i=this.Un(i,o,c);else{const h=u.hn(o.kind);cn.Ut.bt(c,h)}}return this.Kn(i)}xn(e,t,n){return this.On(e,t,n.position)}Kn(e){const t=[];for(let n=0;n<e.length;++n)t[n]=e[n].an();return t}Un(e,t,n){const i=[...e],s=[];for(const o of n.arrayValue.values||[])for(const c of i){const u=new qr;u.seed(c.an()),cn.Ut.bt(o,u.hn(t.kind)),s.push(u)}return s}$n(e,t){return!!e.filters.find((n=>n instanceof Q&&n.field.isEqual(t)&&(n.op==="in"||n.op==="not-in")))}getFieldIndexes(e,t){const n=zr(e),i=jn(e);return(t?n.j(ya,IDBKeyRange.bound(t,t)):n.j()).next((s=>{const o=[];return w.forEach(s,(c=>i.get([c.indexId,this.uid]).next((u=>{o.push((function(f,m){const g=m?new li(m.sequenceNumber,new Be(En(m.readTime),new O(Je(m.documentKey)),m.largestBatchId)):li.empty(),b=f.fields.map((([C,N])=>new _s(le.fromServerFormat(C),N)));return new xs(f.indexId,f.collectionGroup,b,g)})(c,u))})))).next((()=>o))}))}getNextCollectionGroupToUpdate(e){return this.getFieldIndexes(e).next((t=>t.length===0?null:(t.sort(((n,i)=>{const s=n.indexState.sequenceNumber-i.indexState.sequenceNumber;return s!==0?s:q(n.collectionGroup,i.collectionGroup)})),t[0].collectionGroup)))}updateCollectionGroup(e,t,n){const i=zr(e),s=jn(e);return this.Wn(e).next((o=>i.j(ya,IDBKeyRange.bound(t,t)).next((c=>w.forEach(c,(u=>s.put(Wl(u.indexId,this.uid,o,n))))))))}updateIndexEntries(e,t){const n=new Map;return w.forEach(t,((i,s)=>{const o=n.get(i.collectionGroup);return(o?w.resolve(o):this.getFieldIndexes(e,i.collectionGroup)).next((c=>(n.set(i.collectionGroup,c),w.forEach(c,(u=>this.Gn(e,i,u).next((h=>{const f=this.zn(s,u);return h.isEqual(f)?w.resolve():this.jn(e,s,u,h,f)})))))))}))}Jn(e,t,n,i){return Bn(e).put(i.An(this.uid,this.Qn(n,t.key),t.key))}Hn(e,t,n,i){return Bn(e).delete(i.Rn(this.uid,this.Qn(n,t.key),t.key))}Gn(e,t,n){const i=Bn(e);let s=new ne(Pt);return i.X({index:Nd,range:IDBKeyRange.only([n.indexId,this.uid,Rs(this.Qn(n,t))])},((o,c)=>{s=s.add(new un(n.indexId,t,Yl(c.arrayValue),Yl(c.directionalValue)))})).next((()=>s))}zn(e,t){let n=new ne(Pt);const i=this.qn(t,e);if(i==null)return n;const s=ga(t);if(s!=null){const o=e.data.field(s.fieldPath);if(yi(o))for(const c of o.arrayValue.values||[])n=n.add(new un(t.indexId,e.key,this.Bn(c),i))}else n=n.add(new un(t.indexId,e.key,hs,i));return n}jn(e,t,n,i,s){V(th,"Updating index entries for document '%s'",t.key);const o=[];return(function(u,h,f,m,g){const b=u.getIterator(),C=h.getIterator();let N=Fn(b),D=Fn(C);for(;N||D;){let $=!1,B=!1;if(N&&D){const F=f(N,D);F<0?B=!0:F>0&&($=!0)}else N!=null?B=!0:$=!0;$?(m(D),D=Fn(C)):B?(g(N),N=Fn(b)):(N=Fn(b),D=Fn(C))}})(i,s,Pt,(c=>{o.push(this.Jn(e,t,n,c))}),(c=>{o.push(this.Hn(e,t,n,c))})),w.waitFor(o)}Wn(e){let t=1;return jn(e).X({index:kd,reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},((n,i,s)=>{s.done(),t=i.sequenceNumber+1})).next((()=>t))}createRange(e,t,n){n=n.sort(((o,c)=>Pt(o,c))).filter(((o,c,u)=>!c||Pt(o,u[c-1])!==0));const i=[];i.push(e);for(const o of n){const c=Pt(o,e),u=Pt(o,t);if(c===0)i[0]=e.En();else if(c>0&&u<0)i.push(o),i.push(o.En());else if(u>0)break}i.push(t);const s=[];for(let o=0;o<i.length;o+=2){if(this.Yn(i[o],i[o+1]))return[];const c=i[o].Rn(this.uid,hs,O.empty()),u=i[o+1].Rn(this.uid,hs,O.empty());s.push(IDBKeyRange.bound(c,u))}return s}Yn(e,t){return Pt(e,t)>0}getMinOffsetFromCollectionGroup(e,t){return this.getFieldIndexes(e,t).next(rh)}getMinOffset(e,t){return w.mapArray(this.Fn(t),(n=>this.Mn(e,n).next((i=>i||M(44426))))).next(rh)}}function nh(r){return _e(r,pi)}function Bn(r){return _e(r,ni)}function zr(r){return _e(r,Ya)}function jn(r){return _e(r,ti)}function rh(r){L(r.length!==0,28825);let e=r[0].indexState.offset,t=e.largestBatchId;for(let n=1;n<r.length;n++){const i=r[n].indexState.offset;Qa(i,e)<0&&(e=i),t<i.largestBatchId&&(t=i.largestBatchId)}return new Be(e.readTime,e.documentKey,t)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ih={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},Lf=41943040;class Ve{static withCacheSize(e){return new Ve(e,Ve.DEFAULT_COLLECTION_PERCENTILE,Ve.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,t,n){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=n}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ff(r,e,t){const n=r.store(Ke),i=r.store(nr),s=[],o=IDBKeyRange.only(t.batchId);let c=0;const u=n.X({range:o},((f,m,g)=>(c++,g.delete())));s.push(u.next((()=>{L(c===1,47070,{batchId:t.batchId})})));const h=[];for(const f of t.mutations){const m=Cd(e,f.key.path,t.batchId);s.push(i.delete(m)),h.push(f.key)}return w.waitFor(s).next((()=>h))}function $s(r){if(!r)return 0;let e;if(r.document)e=r.document;else if(r.unknownDocument)e=r.unknownDocument;else{if(!r.noDocument)throw M(14731);e=r.noDocument}return JSON.stringify(e).length}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Ve.DEFAULT_COLLECTION_PERCENTILE=10,Ve.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,Ve.DEFAULT=new Ve(Lf,Ve.DEFAULT_COLLECTION_PERCENTILE,Ve.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),Ve.DISABLED=new Ve(-1,0,0);class _o{constructor(e,t,n,i){this.userId=e,this.serializer=t,this.indexManager=n,this.referenceDelegate=i,this.Zn={}}static yt(e,t,n,i){L(e.uid!=="",64387);const s=e.isAuthenticated()?e.uid:"";return new _o(s,t,n,i)}checkEmpty(e){let t=!0;const n=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return St(e).X({index:ln,range:n},((i,s,o)=>{t=!1,o.done()})).next((()=>t))}addMutationBatch(e,t,n,i){const s=Wn(e),o=St(e);return o.add({}).next((c=>{L(typeof c=="number",49019);const u=new ac(c,t,n,i),h=(function(b,C,N){const D=N.baseMutations.map((B=>Ei(b.gt,B))),$=N.mutations.map((B=>Ei(b.gt,B)));return{userId:C,batchId:N.batchId,localWriteTimeMs:N.localWriteTime.toMillis(),baseMutations:D,mutations:$}})(this.serializer,this.userId,u),f=[];let m=new ne(((g,b)=>q(g.canonicalString(),b.canonicalString())));for(const g of i){const b=Cd(this.userId,g.key.path,c);m=m.add(g.key.path.popLast()),f.push(o.put(h)),f.push(s.put(b,D_))}return m.forEach((g=>{f.push(this.indexManager.addToCollectionParentIndex(e,g))})),e.addOnCommittedListener((()=>{this.Zn[c]=u.keys()})),w.waitFor(f).next((()=>u))}))}lookupMutationBatch(e,t){return St(e).get(t).next((n=>n?(L(n.userId===this.userId,48,"Unexpected user for mutation batch",{userId:n.userId,batchId:t}),an(this.serializer,n)):null))}Xn(e,t){return this.Zn[t]?w.resolve(this.Zn[t]):this.lookupMutationBatch(e,t).next((n=>{if(n){const i=n.keys();return this.Zn[t]=i,i}return null}))}getNextMutationBatchAfterBatchId(e,t){const n=t+1,i=IDBKeyRange.lowerBound([this.userId,n]);let s=null;return St(e).X({index:ln,range:i},((o,c,u)=>{c.userId===this.userId&&(L(c.batchId>=n,47524,{er:n}),s=an(this.serializer,c)),u.done()})).next((()=>s))}getHighestUnacknowledgedBatchId(e){const t=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let n=hn;return St(e).X({index:ln,range:t,reverse:!0},((i,s,o)=>{n=s.batchId,o.done()})).next((()=>n))}getAllMutationBatches(e){const t=IDBKeyRange.bound([this.userId,hn],[this.userId,Number.POSITIVE_INFINITY]);return St(e).j(ln,t).next((n=>n.map((i=>an(this.serializer,i)))))}getAllMutationBatchesAffectingDocumentKey(e,t){const n=ys(this.userId,t.path),i=IDBKeyRange.lowerBound(n),s=[];return Wn(e).X({range:i},((o,c,u)=>{const[h,f,m]=o,g=Je(f);if(h===this.userId&&t.path.isEqual(g))return St(e).get(m).next((b=>{if(!b)throw M(61480,{tr:o,batchId:m});L(b.userId===this.userId,10503,"Unexpected user for mutation batch",{userId:b.userId,batchId:m}),s.push(an(this.serializer,b))}));u.done()})).next((()=>s))}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new ne(q);const i=[];return t.forEach((s=>{const o=ys(this.userId,s.path),c=IDBKeyRange.lowerBound(o),u=Wn(e).X({range:c},((h,f,m)=>{const[g,b,C]=h,N=Je(b);g===this.userId&&s.path.isEqual(N)?n=n.add(C):m.done()}));i.push(u)})),w.waitFor(i).next((()=>this.nr(e,n)))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,i=n.length+1,s=ys(this.userId,n),o=IDBKeyRange.lowerBound(s);let c=new ne(q);return Wn(e).X({range:o},((u,h,f)=>{const[m,g,b]=u,C=Je(g);m===this.userId&&n.isPrefixOf(C)?C.length===i&&(c=c.add(b)):f.done()})).next((()=>this.nr(e,c)))}nr(e,t){const n=[],i=[];return t.forEach((s=>{i.push(St(e).get(s).next((o=>{if(o===null)throw M(35274,{batchId:s});L(o.userId===this.userId,9748,"Unexpected user for mutation batch",{userId:o.userId,batchId:s}),n.push(an(this.serializer,o))})))})),w.waitFor(i).next((()=>n))}removeMutationBatch(e,t){return Ff(e.ce,this.userId,t).next((n=>(e.addOnCommittedListener((()=>{this.rr(t.batchId)})),w.forEach(n,(i=>this.referenceDelegate.markPotentiallyOrphaned(e,i))))))}rr(e){delete this.Zn[e]}performConsistencyCheck(e){return this.checkEmpty(e).next((t=>{if(!t)return w.resolve();const n=IDBKeyRange.lowerBound((function(o){return[o]})(this.userId)),i=[];return Wn(e).X({range:n},((s,o,c)=>{if(s[0]===this.userId){const u=Je(s[1]);i.push(u)}else c.done()})).next((()=>{L(i.length===0,56720,{ir:i.map((s=>s.canonicalString()))})}))}))}containsKey(e,t){return Uf(e,this.userId,t)}sr(e){return Bf(e).get(this.userId).next((t=>t||{userId:this.userId,lastAcknowledgedBatchId:hn,lastStreamToken:""}))}}function Uf(r,e,t){const n=ys(e,t.path),i=n[1],s=IDBKeyRange.lowerBound(n);let o=!1;return Wn(r).X({range:s,Z:!0},((c,u,h)=>{const[f,m,g]=c;f===e&&m===i&&(o=!0),h.done()})).next((()=>o))}function St(r){return _e(r,Ke)}function Wn(r){return _e(r,nr)}function Bf(r){return _e(r,di)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tn{constructor(e){this._r=e}next(){return this._r+=2,this._r}static ar(){return new Tn(0)}static ur(){return new Tn(-1)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tI{constructor(e,t){this.referenceDelegate=e,this.serializer=t}allocateTargetId(e){return this.cr(e).next((t=>{const n=new Tn(t.highestTargetId);return t.highestTargetId=n.next(),this.lr(e,t).next((()=>t.highestTargetId))}))}getLastRemoteSnapshotVersion(e){return this.cr(e).next((t=>U.fromTimestamp(new ee(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds))))}getHighestSequenceNumber(e){return this.cr(e).next((t=>t.highestListenSequenceNumber))}setTargetsMetadata(e,t,n){return this.cr(e).next((i=>(i.highestListenSequenceNumber=t,n&&(i.lastRemoteSnapshotVersion=n.toTimestamp()),t>i.highestListenSequenceNumber&&(i.highestListenSequenceNumber=t),this.lr(e,i))))}addTargetData(e,t){return this.hr(e,t).next((()=>this.cr(e).next((n=>(n.targetCount+=1,this.Pr(t,n),this.lr(e,n))))))}updateTargetData(e,t){return this.hr(e,t)}removeTargetData(e,t){return this.removeMatchingKeysForTargetId(e,t.targetId).next((()=>qn(e).delete(t.targetId))).next((()=>this.cr(e))).next((n=>(L(n.targetCount>0,8065),n.targetCount-=1,this.lr(e,n))))}removeTargets(e,t,n){let i=0;const s=[];return qn(e).X(((o,c)=>{const u=Jr(c);u.sequenceNumber<=t&&n.get(u.targetId)===null&&(i++,s.push(this.removeTargetData(e,u)))})).next((()=>w.waitFor(s))).next((()=>i))}forEachTarget(e,t){return qn(e).X(((n,i)=>{const s=Jr(i);t(s)}))}cr(e){return sh(e).get(Ls).next((t=>(L(t!==null,2888),t)))}lr(e,t){return sh(e).put(Ls,t)}hr(e,t){return qn(e).put(Nf(this.serializer,t))}Pr(e,t){let n=!1;return e.targetId>t.highestTargetId&&(t.highestTargetId=e.targetId,n=!0),e.sequenceNumber>t.highestListenSequenceNumber&&(t.highestListenSequenceNumber=e.sequenceNumber,n=!0),n}getTargetCount(e){return this.cr(e).next((t=>t.targetCount))}getTargetData(e,t){const n=_n(t),i=IDBKeyRange.bound([n,Number.NEGATIVE_INFINITY],[n,Number.POSITIVE_INFINITY]);let s=null;return qn(e).X({range:i,index:Dd},((o,c,u)=>{const h=Jr(c);Ci(t,h.target)&&(s=h,u.done())})).next((()=>s))}addMatchingKeys(e,t,n){const i=[],s=Dt(e);return t.forEach((o=>{const c=De(o.path);i.push(s.put({targetId:n,path:c})),i.push(this.referenceDelegate.addReference(e,n,o))})),w.waitFor(i)}removeMatchingKeys(e,t,n){const i=Dt(e);return w.forEach(t,(s=>{const o=De(s.path);return w.waitFor([i.delete([n,o]),this.referenceDelegate.removeReference(e,n,s)])}))}removeMatchingKeysForTargetId(e,t){const n=Dt(e),i=IDBKeyRange.bound([t],[t+1],!1,!0);return n.delete(i)}getMatchingKeysForTargetId(e,t){const n=IDBKeyRange.bound([t],[t+1],!1,!0),i=Dt(e);let s=G();return i.X({range:n,Z:!0},((o,c,u)=>{const h=Je(o[1]),f=new O(h);s=s.add(f)})).next((()=>s))}containsKey(e,t){const n=De(t.path),i=IDBKeyRange.bound([n],[wd(n)],!1,!0);let s=0;return Dt(e).X({index:Ja,Z:!0,range:i},(([o,c],u,h)=>{o!==0&&(s++,h.done())})).next((()=>s>0))}Et(e,t){return qn(e).get(t).next((n=>n?Jr(n):null))}}function qn(r){return _e(r,rr)}function sh(r){return _e(r,dn)}function Dt(r){return _e(r,ir)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const oh="LruGarbageCollector",nI=1048576;function ah([r,e],[t,n]){const i=q(r,t);return i===0?q(e,n):i}class rI{constructor(e){this.Tr=e,this.buffer=new ne(ah),this.Ir=0}dr(){return++this.Ir}Er(e){const t=[e,this.dr()];if(this.buffer.size<this.Tr)this.buffer=this.buffer.add(t);else{const n=this.buffer.last();ah(t,n)<0&&(this.buffer=this.buffer.delete(n).add(t))}}get maxValue(){return this.buffer.last()[0]}}class jf{constructor(e,t,n){this.garbageCollector=e,this.asyncQueue=t,this.localStore=n,this.Ar=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Rr(6e4)}stop(){this.Ar&&(this.Ar.cancel(),this.Ar=null)}get started(){return this.Ar!==null}Rr(e){V(oh,`Garbage collection scheduled in ${e}ms`),this.Ar=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,(async()=>{this.Ar=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(t){Ht(t)?V(oh,"Ignoring IndexedDB error during garbage collection: ",t):await Pn(t)}await this.Rr(3e5)}))}}class iI{constructor(e,t){this.Vr=e,this.params=t}calculateTargetCount(e,t){return this.Vr.mr(e).next((n=>Math.floor(t/100*n)))}nthSequenceNumber(e,t){if(t===0)return w.resolve(qe.ue);const n=new rI(t);return this.Vr.forEachTarget(e,(i=>n.Er(i.sequenceNumber))).next((()=>this.Vr.gr(e,(i=>n.Er(i))))).next((()=>n.maxValue))}removeTargets(e,t,n){return this.Vr.removeTargets(e,t,n)}removeOrphanedDocuments(e,t){return this.Vr.removeOrphanedDocuments(e,t)}collect(e,t){return this.params.cacheSizeCollectionThreshold===-1?(V("LruGarbageCollector","Garbage collection skipped; disabled"),w.resolve(ih)):this.getCacheSize(e).next((n=>n<this.params.cacheSizeCollectionThreshold?(V("LruGarbageCollector",`Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),ih):this.pr(e,t)))}getCacheSize(e){return this.Vr.getCacheSize(e)}pr(e,t){let n,i,s,o,c,u,h;const f=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next((m=>(m>this.params.maximumSequenceNumbersToCollect?(V("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${m}`),i=this.params.maximumSequenceNumbersToCollect):i=m,o=Date.now(),this.nthSequenceNumber(e,i)))).next((m=>(n=m,c=Date.now(),this.removeTargets(e,n,t)))).next((m=>(s=m,u=Date.now(),this.removeOrphanedDocuments(e,n)))).next((m=>(h=Date.now(),zn()<=H.DEBUG&&V("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${o-f}ms
	Determined least recently used ${i} in `+(c-o)+`ms
	Removed ${s} targets in `+(u-c)+`ms
	Removed ${m} documents in `+(h-u)+`ms
Total Duration: ${h-f}ms`),w.resolve({didRun:!0,sequenceNumbersCollected:i,targetsRemoved:s,documentsRemoved:m}))))}}function qf(r,e){return new iI(r,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sI{constructor(e,t){this.db=e,this.garbageCollector=qf(this,t)}mr(e){const t=this.yr(e);return this.db.getTargetCache().getTargetCount(e).next((n=>t.next((i=>n+i))))}yr(e){let t=0;return this.gr(e,(n=>{t++})).next((()=>t))}forEachTarget(e,t){return this.db.getTargetCache().forEachTarget(e,t)}gr(e,t){return this.wr(e,((n,i)=>t(i)))}addReference(e,t,n){return ds(e,n)}removeReference(e,t,n){return ds(e,n)}removeTargets(e,t,n){return this.db.getTargetCache().removeTargets(e,t,n)}markPotentiallyOrphaned(e,t){return ds(e,t)}Sr(e,t){return(function(i,s){let o=!1;return Bf(i).ee((c=>Uf(i,c,s).next((u=>(u&&(o=!0),w.resolve(!u)))))).next((()=>o))})(e,t)}removeOrphanedDocuments(e,t){const n=this.db.getRemoteDocumentCache().newChangeBuffer(),i=[];let s=0;return this.wr(e,((o,c)=>{if(c<=t){const u=this.Sr(e,o).next((h=>{if(!h)return s++,n.getEntry(e,o).next((()=>(n.removeEntry(o,U.min()),Dt(e).delete((function(m){return[0,De(m.path)]})(o)))))}));i.push(u)}})).next((()=>w.waitFor(i))).next((()=>n.apply(e))).next((()=>s))}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(e,n)}updateLimboDocument(e,t){return ds(e,t)}wr(e,t){const n=Dt(e);let i,s=qe.ue;return n.X({index:Ja},(([o,c],{path:u,sequenceNumber:h})=>{o===0?(s!==qe.ue&&t(new O(Je(i)),s),s=h,i=u):s=qe.ue})).next((()=>{s!==qe.ue&&t(new O(Je(i)),s)}))}getCacheSize(e){return this.db.getRemoteDocumentCache().getSize(e)}}function ds(r,e){return Dt(r).put((function(n,i){return{targetId:0,path:De(n.path),sequenceNumber:i}})(e,r.currentSequenceNumber))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zf{constructor(){this.changes=new Et((e=>e.toString()),((e,t)=>e.isEqual(t))),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,ae.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const n=this.changes.get(t);return n!==void 0?w.resolve(n):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class oI{constructor(e){this.serializer=e}setIndexManager(e){this.indexManager=e}addEntry(e,t,n){return tn(e).put(n)}removeEntry(e,t,n){return tn(e).delete((function(s,o){const c=s.path.toArray();return[c.slice(0,c.length-2),c[c.length-2],qs(o),c[c.length-1]]})(t,n))}updateMetadata(e,t){return this.getMetadata(e).next((n=>(n.byteSize+=t,this.br(e,n))))}getEntry(e,t){let n=ae.newInvalidDocument(t);return tn(e).X({index:Is,range:IDBKeyRange.only($r(t))},((i,s)=>{n=this.Dr(t,s)})).next((()=>n))}vr(e,t){let n={size:0,document:ae.newInvalidDocument(t)};return tn(e).X({index:Is,range:IDBKeyRange.only($r(t))},((i,s)=>{n={document:this.Dr(t,s),size:$s(s)}})).next((()=>n))}getEntries(e,t){let n=Ue();return this.Cr(e,t,((i,s)=>{const o=this.Dr(i,s);n=n.insert(i,o)})).next((()=>n))}Fr(e,t){let n=Ue(),i=new ue(O.comparator);return this.Cr(e,t,((s,o)=>{const c=this.Dr(s,o);n=n.insert(s,c),i=i.insert(s,$s(o))})).next((()=>({documents:n,Mr:i})))}Cr(e,t,n){if(t.isEmpty())return w.resolve();let i=new ne(lh);t.forEach((u=>i=i.add(u)));const s=IDBKeyRange.bound($r(i.first()),$r(i.last())),o=i.getIterator();let c=o.getNext();return tn(e).X({index:Is,range:s},((u,h,f)=>{const m=O.fromSegments([...h.prefixPath,h.collectionGroup,h.documentId]);for(;c&&lh(c,m)<0;)n(c,null),c=o.getNext();c&&c.isEqual(m)&&(n(c,h),c=o.hasNext()?o.getNext():null),c?f.G($r(c)):f.done()})).next((()=>{for(;c;)n(c,null),c=o.hasNext()?o.getNext():null}))}getDocumentsMatchingQuery(e,t,n,i,s){const o=t.path,c=[o.popLast().toArray(),o.lastSegment(),qs(n.readTime),n.documentKey.path.isEmpty()?"":n.documentKey.path.lastSegment()],u=[o.popLast().toArray(),o.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return tn(e).j(IDBKeyRange.bound(c,u,!0)).next((h=>{s==null||s.incrementDocumentReadCount(h.length);let f=Ue();for(const m of h){const g=this.Dr(O.fromSegments(m.prefixPath.concat(m.collectionGroup,m.documentId)),m);g.isFoundDocument()&&(Di(t,g)||i.has(g.key))&&(f=f.insert(g.key,g))}return f}))}getAllFromCollectionGroup(e,t,n,i){let s=Ue();const o=uh(t,n),c=uh(t,Be.max());return tn(e).X({index:Vd,range:IDBKeyRange.bound(o,c,!0)},((u,h,f)=>{const m=this.Dr(O.fromSegments(h.prefixPath.concat(h.collectionGroup,h.documentId)),h);s=s.insert(m.key,m),s.size===i&&f.done()})).next((()=>s))}newChangeBuffer(e){return new aI(this,!!e&&e.trackRemovals)}getSize(e){return this.getMetadata(e).next((t=>t.byteSize))}getMetadata(e){return ch(e).get(_a).next((t=>(L(!!t,20021),t)))}br(e,t){return ch(e).put(_a,t)}Dr(e,t){if(t){const n=Gy(this.serializer,t);if(!(n.isNoDocument()&&n.version.isEqual(U.min())))return n}return ae.newInvalidDocument(e)}}function $f(r){return new oI(r)}class aI extends zf{constructor(e,t){super(),this.Or=e,this.trackRemovals=t,this.Nr=new Et((n=>n.toString()),((n,i)=>n.isEqual(i)))}applyChanges(e){const t=[];let n=0,i=new ne(((s,o)=>q(s.canonicalString(),o.canonicalString())));return this.changes.forEach(((s,o)=>{const c=this.Nr.get(s);if(t.push(this.Or.removeEntry(e,s,c.readTime)),o.isValidDocument()){const u=Gl(this.Or.serializer,o);i=i.add(s.path.popLast());const h=$s(u);n+=h-c.size,t.push(this.Or.addEntry(e,s,u))}else if(n-=c.size,this.trackRemovals){const u=Gl(this.Or.serializer,o.convertToNoDocument(U.min()));t.push(this.Or.addEntry(e,s,u))}})),i.forEach((s=>{t.push(this.Or.indexManager.addToCollectionParentIndex(e,s))})),t.push(this.Or.updateMetadata(e,n)),w.waitFor(t)}getFromCache(e,t){return this.Or.vr(e,t).next((n=>(this.Nr.set(t,{size:n.size,readTime:n.document.readTime}),n.document)))}getAllFromCache(e,t){return this.Or.Fr(e,t).next((({documents:n,Mr:i})=>(i.forEach(((s,o)=>{this.Nr.set(s,{size:o,readTime:n.get(s).readTime})})),n)))}}function ch(r){return _e(r,fi)}function tn(r){return _e(r,Ms)}function $r(r){const e=r.path.toArray();return[e.slice(0,e.length-2),e[e.length-2],e[e.length-1]]}function uh(r,e){const t=e.documentKey.path.toArray();return[r,qs(e.readTime),t.slice(0,t.length-2),t.length>0?t[t.length-1]:""]}function lh(r,e){const t=r.path.toArray(),n=e.path.toArray();let i=0;for(let s=0;s<t.length-2&&s<n.length-2;++s)if(i=q(t[s],n[s]),i)return i;return i=q(t.length,n.length),i||(i=q(t[t.length-2],n[n.length-2]),i||q(t[t.length-1],n[n.length-1]))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cI{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gf{constructor(e,t,n,i){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=n,this.indexManager=i}getDocument(e,t){let n=null;return this.documentOverlayCache.getOverlay(e,t).next((i=>(n=i,this.remoteDocumentCache.getEntry(e,t)))).next((i=>(n!==null&&oi(n.mutation,i,Oe.empty(),ee.now()),i)))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next((n=>this.getLocalViewOfDocuments(e,n,G()).next((()=>n))))}getLocalViewOfDocuments(e,t,n=G()){const i=Ye();return this.populateOverlays(e,i,t).next((()=>this.computeViews(e,t,i,n).next((s=>{let o=Qr();return s.forEach(((c,u)=>{o=o.insert(c,u.overlayedDocument)})),o}))))}getOverlayedDocuments(e,t){const n=Ye();return this.populateOverlays(e,n,t).next((()=>this.computeViews(e,t,n,G())))}populateOverlays(e,t,n){const i=[];return n.forEach((s=>{t.has(s)||i.push(s)})),this.documentOverlayCache.getOverlays(e,i).next((s=>{s.forEach(((o,c)=>{t.set(o,c)}))}))}computeViews(e,t,n,i){let s=Ue();const o=si(),c=(function(){return si()})();return t.forEach(((u,h)=>{const f=n.get(h.key);i.has(h.key)&&(f===void 0||f.mutation instanceof Tt)?s=s.insert(h.key,h):f!==void 0?(o.set(h.key,f.mutation.getFieldMask()),oi(f.mutation,h,f.mutation.getFieldMask(),ee.now())):o.set(h.key,Oe.empty())})),this.recalculateAndSaveOverlays(e,s).next((u=>(u.forEach(((h,f)=>o.set(h,f))),t.forEach(((h,f)=>{var m;return c.set(h,new cI(f,(m=o.get(h))!==null&&m!==void 0?m:null))})),c)))}recalculateAndSaveOverlays(e,t){const n=si();let i=new ue(((o,c)=>o-c)),s=G();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next((o=>{for(const c of o)c.keys().forEach((u=>{const h=t.get(u);if(h===null)return;let f=n.get(u)||Oe.empty();f=c.applyToLocalView(h,f),n.set(u,f);const m=(i.get(c.batchId)||G()).add(u);i=i.insert(c.batchId,m)}))})).next((()=>{const o=[],c=i.getReverseIterator();for(;c.hasNext();){const u=c.getNext(),h=u.key,f=u.value,m=cf();f.forEach((g=>{if(!s.has(g)){const b=mf(t.get(g),n.get(g));b!==null&&m.set(g,b),s=s.add(g)}})),o.push(this.documentOverlayCache.saveOverlays(e,h,m))}return w.waitFor(o)})).next((()=>n))}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next((n=>this.recalculateAndSaveOverlays(e,n)))}getDocumentsMatchingQuery(e,t,n,i){return(function(o){return O.isDocumentKey(o.path)&&o.collectionGroup===null&&o.filters.length===0})(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):nf(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,n,i):this.getDocumentsMatchingCollectionQuery(e,t,n,i)}getNextDocuments(e,t,n,i){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,n,i).next((s=>{const o=i-s.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,n.largestBatchId,i-s.size):w.resolve(Ye());let c=ui,u=s;return o.next((h=>w.forEach(h,((f,m)=>(c<m.largestBatchId&&(c=m.largestBatchId),s.get(f)?w.resolve():this.remoteDocumentCache.getEntry(e,f).next((g=>{u=u.insert(f,g)}))))).next((()=>this.populateOverlays(e,h,s))).next((()=>this.computeViews(e,u,h,G()))).next((f=>({batchId:c,changes:af(f)})))))}))}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new O(t)).next((n=>{let i=Qr();return n.isFoundDocument()&&(i=i.insert(n.key,n)),i}))}getDocumentsMatchingCollectionGroupQuery(e,t,n,i){const s=t.collectionGroup;let o=Qr();return this.indexManager.getCollectionParents(e,s).next((c=>w.forEach(c,(u=>{const h=(function(m,g){return new Sn(g,null,m.explicitOrderBy.slice(),m.filters.slice(),m.limit,m.limitType,m.startAt,m.endAt)})(t,u.child(s));return this.getDocumentsMatchingCollectionQuery(e,h,n,i).next((f=>{f.forEach(((m,g)=>{o=o.insert(m,g)}))}))})).next((()=>o))))}getDocumentsMatchingCollectionQuery(e,t,n,i){let s;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,n.largestBatchId).next((o=>(s=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,n,s,i)))).next((o=>{s.forEach(((u,h)=>{const f=h.getKey();o.get(f)===null&&(o=o.insert(f,ae.newInvalidDocument(f)))}));let c=Qr();return o.forEach(((u,h)=>{const f=s.get(u);f!==void 0&&oi(f.mutation,h,Oe.empty(),ee.now()),Di(t,h)&&(c=c.insert(u,h))})),c}))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uI{constructor(e){this.serializer=e,this.Br=new Map,this.Lr=new Map}getBundleMetadata(e,t){return w.resolve(this.Br.get(t))}saveBundleMetadata(e,t){return this.Br.set(t.id,(function(i){return{id:i.id,version:i.version,createTime:ve(i.createTime)}})(t)),w.resolve()}getNamedQuery(e,t){return w.resolve(this.Lr.get(t))}saveNamedQuery(e,t){return this.Lr.set(t.name,(function(i){return{name:i.name,query:xf(i.bundledQuery),readTime:ve(i.readTime)}})(t)),w.resolve()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lI{constructor(){this.overlays=new ue(O.comparator),this.kr=new Map}getOverlay(e,t){return w.resolve(this.overlays.get(t))}getOverlays(e,t){const n=Ye();return w.forEach(t,(i=>this.getOverlay(e,i).next((s=>{s!==null&&n.set(i,s)})))).next((()=>n))}saveOverlays(e,t,n){return n.forEach(((i,s)=>{this.wt(e,t,s)})),w.resolve()}removeOverlaysForBatchId(e,t,n){const i=this.kr.get(n);return i!==void 0&&(i.forEach((s=>this.overlays=this.overlays.remove(s))),this.kr.delete(n)),w.resolve()}getOverlaysForCollection(e,t,n){const i=Ye(),s=t.length+1,o=new O(t.child("")),c=this.overlays.getIteratorFrom(o);for(;c.hasNext();){const u=c.getNext().value,h=u.getKey();if(!t.isPrefixOf(h.path))break;h.path.length===s&&u.largestBatchId>n&&i.set(u.getKey(),u)}return w.resolve(i)}getOverlaysForCollectionGroup(e,t,n,i){let s=new ue(((h,f)=>h-f));const o=this.overlays.getIterator();for(;o.hasNext();){const h=o.getNext().value;if(h.getKey().getCollectionGroup()===t&&h.largestBatchId>n){let f=s.get(h.largestBatchId);f===null&&(f=Ye(),s=s.insert(h.largestBatchId,f)),f.set(h.getKey(),h)}}const c=Ye(),u=s.getIterator();for(;u.hasNext()&&(u.getNext().value.forEach(((h,f)=>c.set(h,f))),!(c.size()>=i)););return w.resolve(c)}wt(e,t,n){const i=this.overlays.get(n.key);if(i!==null){const o=this.kr.get(i.largestBatchId).delete(n.key);this.kr.set(i.largestBatchId,o)}this.overlays=this.overlays.insert(n.key,new uc(t,n));let s=this.kr.get(t);s===void 0&&(s=G(),this.kr.set(t,s)),this.kr.set(t,s.add(n.key))}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hI{constructor(){this.sessionToken=me.EMPTY_BYTE_STRING}getSessionToken(e){return w.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,w.resolve()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pc{constructor(){this.qr=new ne(ye.Qr),this.$r=new ne(ye.Ur)}isEmpty(){return this.qr.isEmpty()}addReference(e,t){const n=new ye(e,t);this.qr=this.qr.add(n),this.$r=this.$r.add(n)}Kr(e,t){e.forEach((n=>this.addReference(n,t)))}removeReference(e,t){this.Wr(new ye(e,t))}Gr(e,t){e.forEach((n=>this.removeReference(n,t)))}zr(e){const t=new O(new J([])),n=new ye(t,e),i=new ye(t,e+1),s=[];return this.$r.forEachInRange([n,i],(o=>{this.Wr(o),s.push(o.key)})),s}jr(){this.qr.forEach((e=>this.Wr(e)))}Wr(e){this.qr=this.qr.delete(e),this.$r=this.$r.delete(e)}Jr(e){const t=new O(new J([])),n=new ye(t,e),i=new ye(t,e+1);let s=G();return this.$r.forEachInRange([n,i],(o=>{s=s.add(o.key)})),s}containsKey(e){const t=new ye(e,0),n=this.qr.firstAfterOrEqual(t);return n!==null&&e.isEqual(n.key)}}class ye{constructor(e,t){this.key=e,this.Hr=t}static Qr(e,t){return O.comparator(e.key,t.key)||q(e.Hr,t.Hr)}static Ur(e,t){return q(e.Hr,t.Hr)||O.comparator(e.key,t.key)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dI{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.er=1,this.Yr=new ne(ye.Qr)}checkEmpty(e){return w.resolve(this.mutationQueue.length===0)}addMutationBatch(e,t,n,i){const s=this.er;this.er++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new ac(s,t,n,i);this.mutationQueue.push(o);for(const c of i)this.Yr=this.Yr.add(new ye(c.key,s)),this.indexManager.addToCollectionParentIndex(e,c.key.path.popLast());return w.resolve(o)}lookupMutationBatch(e,t){return w.resolve(this.Zr(t))}getNextMutationBatchAfterBatchId(e,t){const n=t+1,i=this.Xr(n),s=i<0?0:i;return w.resolve(this.mutationQueue.length>s?this.mutationQueue[s]:null)}getHighestUnacknowledgedBatchId(){return w.resolve(this.mutationQueue.length===0?hn:this.er-1)}getAllMutationBatches(e){return w.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const n=new ye(t,0),i=new ye(t,Number.POSITIVE_INFINITY),s=[];return this.Yr.forEachInRange([n,i],(o=>{const c=this.Zr(o.Hr);s.push(c)})),w.resolve(s)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new ne(q);return t.forEach((i=>{const s=new ye(i,0),o=new ye(i,Number.POSITIVE_INFINITY);this.Yr.forEachInRange([s,o],(c=>{n=n.add(c.Hr)}))})),w.resolve(this.ei(n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,i=n.length+1;let s=n;O.isDocumentKey(s)||(s=s.child(""));const o=new ye(new O(s),0);let c=new ne(q);return this.Yr.forEachWhile((u=>{const h=u.key.path;return!!n.isPrefixOf(h)&&(h.length===i&&(c=c.add(u.Hr)),!0)}),o),w.resolve(this.ei(c))}ei(e){const t=[];return e.forEach((n=>{const i=this.Zr(n);i!==null&&t.push(i)})),t}removeMutationBatch(e,t){L(this.ti(t.batchId,"removed")===0,55003),this.mutationQueue.shift();let n=this.Yr;return w.forEach(t.mutations,(i=>{const s=new ye(i.key,t.batchId);return n=n.delete(s),this.referenceDelegate.markPotentiallyOrphaned(e,i.key)})).next((()=>{this.Yr=n}))}rr(e){}containsKey(e,t){const n=new ye(t,0),i=this.Yr.firstAfterOrEqual(n);return w.resolve(t.isEqual(i&&i.key))}performConsistencyCheck(e){return this.mutationQueue.length,w.resolve()}ti(e,t){return this.Xr(e)}Xr(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Zr(e){const t=this.Xr(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fI{constructor(e){this.ni=e,this.docs=(function(){return new ue(O.comparator)})(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const n=t.key,i=this.docs.get(n),s=i?i.size:0,o=this.ni(t);return this.docs=this.docs.insert(n,{document:t.mutableCopy(),size:o}),this.size+=o-s,this.indexManager.addToCollectionParentIndex(e,n.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const n=this.docs.get(t);return w.resolve(n?n.document.mutableCopy():ae.newInvalidDocument(t))}getEntries(e,t){let n=Ue();return t.forEach((i=>{const s=this.docs.get(i);n=n.insert(i,s?s.document.mutableCopy():ae.newInvalidDocument(i))})),w.resolve(n)}getDocumentsMatchingQuery(e,t,n,i){let s=Ue();const o=t.path,c=new O(o.child("__id-9223372036854775808__")),u=this.docs.getIteratorFrom(c);for(;u.hasNext();){const{key:h,value:{document:f}}=u.getNext();if(!o.isPrefixOf(h.path))break;h.path.length>o.length+1||Qa(Rd(f),n)<=0||(i.has(f.key)||Di(t,f))&&(s=s.insert(f.key,f.mutableCopy()))}return w.resolve(s)}getAllFromCollectionGroup(e,t,n,i){M(9500)}ri(e,t){return w.forEach(this.docs,(n=>t(n)))}newChangeBuffer(e){return new pI(this)}getSize(e){return w.resolve(this.size)}}class pI extends zf{constructor(e){super(),this.Or=e}applyChanges(e){const t=[];return this.changes.forEach(((n,i)=>{i.isValidDocument()?t.push(this.Or.addEntry(e,i)):this.Or.removeEntry(n)})),w.waitFor(t)}getFromCache(e,t){return this.Or.getEntry(e,t)}getAllFromCache(e,t){return this.Or.getEntries(e,t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mI{constructor(e){this.persistence=e,this.ii=new Et((t=>_n(t)),Ci),this.lastRemoteSnapshotVersion=U.min(),this.highestTargetId=0,this.si=0,this.oi=new pc,this.targetCount=0,this._i=Tn.ar()}forEachTarget(e,t){return this.ii.forEach(((n,i)=>t(i))),w.resolve()}getLastRemoteSnapshotVersion(e){return w.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return w.resolve(this.si)}allocateTargetId(e){return this.highestTargetId=this._i.next(),w.resolve(this.highestTargetId)}setTargetsMetadata(e,t,n){return n&&(this.lastRemoteSnapshotVersion=n),t>this.si&&(this.si=t),w.resolve()}hr(e){this.ii.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this._i=new Tn(t),this.highestTargetId=t),e.sequenceNumber>this.si&&(this.si=e.sequenceNumber)}addTargetData(e,t){return this.hr(t),this.targetCount+=1,w.resolve()}updateTargetData(e,t){return this.hr(t),w.resolve()}removeTargetData(e,t){return this.ii.delete(t.target),this.oi.zr(t.targetId),this.targetCount-=1,w.resolve()}removeTargets(e,t,n){let i=0;const s=[];return this.ii.forEach(((o,c)=>{c.sequenceNumber<=t&&n.get(c.targetId)===null&&(this.ii.delete(o),s.push(this.removeMatchingKeysForTargetId(e,c.targetId)),i++)})),w.waitFor(s).next((()=>i))}getTargetCount(e){return w.resolve(this.targetCount)}getTargetData(e,t){const n=this.ii.get(t)||null;return w.resolve(n)}addMatchingKeys(e,t,n){return this.oi.Kr(t,n),w.resolve()}removeMatchingKeys(e,t,n){this.oi.Gr(t,n);const i=this.persistence.referenceDelegate,s=[];return i&&t.forEach((o=>{s.push(i.markPotentiallyOrphaned(e,o))})),w.waitFor(s)}removeMatchingKeysForTargetId(e,t){return this.oi.zr(t),w.resolve()}getMatchingKeysForTargetId(e,t){const n=this.oi.Jr(t);return w.resolve(n)}containsKey(e,t){return w.resolve(this.oi.containsKey(t))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mc{constructor(e,t){this.ai={},this.overlays={},this.ui=new qe(0),this.ci=!1,this.ci=!0,this.li=new hI,this.referenceDelegate=e(this),this.hi=new mI(this),this.indexManager=new Zy,this.remoteDocumentCache=(function(i){return new fI(i)})((n=>this.referenceDelegate.Pi(n))),this.serializer=new kf(t),this.Ti=new uI(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.ci=!1,Promise.resolve()}get started(){return this.ci}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new lI,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let n=this.ai[e.toKey()];return n||(n=new dI(t,this.referenceDelegate),this.ai[e.toKey()]=n),n}getGlobalsCache(){return this.li}getTargetCache(){return this.hi}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Ti}runTransaction(e,t,n){V("MemoryPersistence","Starting transaction:",e);const i=new gI(this.ui.next());return this.referenceDelegate.Ii(),n(i).next((s=>this.referenceDelegate.di(i).next((()=>s)))).toPromise().then((s=>(i.raiseOnCommittedEvent(),s)))}Ei(e,t){return w.or(Object.values(this.ai).map((n=>()=>n.containsKey(e,t))))}}class gI extends Pd{constructor(e){super(),this.currentSequenceNumber=e}}class yo{constructor(e){this.persistence=e,this.Ai=new pc,this.Ri=null}static Vi(e){return new yo(e)}get mi(){if(this.Ri)return this.Ri;throw M(60996)}addReference(e,t,n){return this.Ai.addReference(n,t),this.mi.delete(n.toString()),w.resolve()}removeReference(e,t,n){return this.Ai.removeReference(n,t),this.mi.add(n.toString()),w.resolve()}markPotentiallyOrphaned(e,t){return this.mi.add(t.toString()),w.resolve()}removeTarget(e,t){this.Ai.zr(t.targetId).forEach((i=>this.mi.add(i.toString())));const n=this.persistence.getTargetCache();return n.getMatchingKeysForTargetId(e,t.targetId).next((i=>{i.forEach((s=>this.mi.add(s.toString())))})).next((()=>n.removeTargetData(e,t)))}Ii(){this.Ri=new Set}di(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return w.forEach(this.mi,(n=>{const i=O.fromPath(n);return this.fi(e,i).next((s=>{s||t.removeEntry(i,U.min())}))})).next((()=>(this.Ri=null,t.apply(e))))}updateLimboDocument(e,t){return this.fi(e,t).next((n=>{n?this.mi.delete(t.toString()):this.mi.add(t.toString())}))}Pi(e){return 0}fi(e,t){return w.or([()=>w.resolve(this.Ai.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Ei(e,t)])}}class Gs{constructor(e,t){this.persistence=e,this.gi=new Et((n=>De(n.path)),((n,i)=>n.isEqual(i))),this.garbageCollector=qf(this,t)}static Vi(e,t){return new Gs(e,t)}Ii(){}di(e){return w.resolve()}forEachTarget(e,t){return this.persistence.getTargetCache().forEachTarget(e,t)}mr(e){const t=this.yr(e);return this.persistence.getTargetCache().getTargetCount(e).next((n=>t.next((i=>n+i))))}yr(e){let t=0;return this.gr(e,(n=>{t++})).next((()=>t))}gr(e,t){return w.forEach(this.gi,((n,i)=>this.Sr(e,n,i).next((s=>s?w.resolve():t(i)))))}removeTargets(e,t,n){return this.persistence.getTargetCache().removeTargets(e,t,n)}removeOrphanedDocuments(e,t){let n=0;const i=this.persistence.getRemoteDocumentCache(),s=i.newChangeBuffer();return i.ri(e,(o=>this.Sr(e,o,t).next((c=>{c||(n++,s.removeEntry(o,U.min()))})))).next((()=>s.apply(e))).next((()=>n))}markPotentiallyOrphaned(e,t){return this.gi.set(t,e.currentSequenceNumber),w.resolve()}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,n)}addReference(e,t,n){return this.gi.set(n,e.currentSequenceNumber),w.resolve()}removeReference(e,t,n){return this.gi.set(n,e.currentSequenceNumber),w.resolve()}updateLimboDocument(e,t){return this.gi.set(t,e.currentSequenceNumber),w.resolve()}Pi(e){let t=e.key.toString().length;return e.isFoundDocument()&&(t+=Es(e.data.value)),t}Sr(e,t,n){return w.or([()=>this.persistence.Ei(e,t),()=>this.persistence.getTargetCache().containsKey(e,t),()=>{const i=this.gi.get(t);return w.resolve(i!==void 0&&i>n)}])}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _I{constructor(e){this.serializer=e}q(e,t,n,i){const s=new so("createOrUpgrade",t);n<1&&i>=1&&((function(u){u.createObjectStore(Si)})(e),(function(u){u.createObjectStore(di,{keyPath:V_}),u.createObjectStore(Ke,{keyPath:El,autoIncrement:!0}).createIndex(ln,Tl,{unique:!0}),u.createObjectStore(nr)})(e),hh(e),(function(u){u.createObjectStore(sn)})(e));let o=w.resolve();return n<3&&i>=3&&(n!==0&&((function(u){u.deleteObjectStore(ir),u.deleteObjectStore(rr),u.deleteObjectStore(dn)})(e),hh(e)),o=o.next((()=>(function(u){const h=u.store(dn),f={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:U.min().toTimestamp(),targetCount:0};return h.put(Ls,f)})(s)))),n<4&&i>=4&&(n!==0&&(o=o.next((()=>(function(u,h){return h.store(Ke).j().next((m=>{u.deleteObjectStore(Ke),u.createObjectStore(Ke,{keyPath:El,autoIncrement:!0}).createIndex(ln,Tl,{unique:!0});const g=h.store(Ke),b=m.map((C=>g.put(C)));return w.waitFor(b)}))})(e,s)))),o=o.next((()=>{(function(u){u.createObjectStore(sr,{keyPath:U_})})(e)}))),n<5&&i>=5&&(o=o.next((()=>this.pi(s)))),n<6&&i>=6&&(o=o.next((()=>((function(u){u.createObjectStore(fi)})(e),this.yi(s))))),n<7&&i>=7&&(o=o.next((()=>this.wi(s)))),n<8&&i>=8&&(o=o.next((()=>this.Si(e,s)))),n<9&&i>=9&&(o=o.next((()=>{(function(u){u.objectStoreNames.contains("remoteDocumentChanges")&&u.deleteObjectStore("remoteDocumentChanges")})(e)}))),n<10&&i>=10&&(o=o.next((()=>this.bi(s)))),n<11&&i>=11&&(o=o.next((()=>{(function(u){u.createObjectStore(oo,{keyPath:B_})})(e),(function(u){u.createObjectStore(ao,{keyPath:j_})})(e)}))),n<12&&i>=12&&(o=o.next((()=>{(function(u){const h=u.createObjectStore(co,{keyPath:H_});h.createIndex(Ia,Q_,{unique:!1}),h.createIndex(xd,X_,{unique:!1})})(e)}))),n<13&&i>=13&&(o=o.next((()=>(function(u){const h=u.createObjectStore(Ms,{keyPath:k_});h.createIndex(Is,N_),h.createIndex(Vd,x_)})(e))).next((()=>this.Di(e,s))).next((()=>e.deleteObjectStore(sn)))),n<14&&i>=14&&(o=o.next((()=>this.Ci(e,s)))),n<15&&i>=15&&(o=o.next((()=>(function(u){u.createObjectStore(Ya,{keyPath:q_,autoIncrement:!0}).createIndex(ya,z_,{unique:!1}),u.createObjectStore(ti,{keyPath:$_}).createIndex(kd,G_,{unique:!1}),u.createObjectStore(ni,{keyPath:K_}).createIndex(Nd,W_,{unique:!1})})(e)))),n<16&&i>=16&&(o=o.next((()=>{t.objectStore(ti).clear()})).next((()=>{t.objectStore(ni).clear()}))),n<17&&i>=17&&(o=o.next((()=>{(function(u){u.createObjectStore(Za,{keyPath:J_})})(e)}))),n<18&&i>=18&&ud()&&(o=o.next((()=>{t.objectStore(ti).clear()})).next((()=>{t.objectStore(ni).clear()}))),o}yi(e){let t=0;return e.store(sn).X(((n,i)=>{t+=$s(i)})).next((()=>{const n={byteSize:t};return e.store(fi).put(_a,n)}))}pi(e){const t=e.store(di),n=e.store(Ke);return t.j().next((i=>w.forEach(i,(s=>{const o=IDBKeyRange.bound([s.userId,hn],[s.userId,s.lastAcknowledgedBatchId]);return n.j(ln,o).next((c=>w.forEach(c,(u=>{L(u.userId===s.userId,18650,"Cannot process batch from unexpected user",{batchId:u.batchId});const h=an(this.serializer,u);return Ff(e,s.userId,h).next((()=>{}))}))))}))))}wi(e){const t=e.store(ir),n=e.store(sn);return e.store(dn).get(Ls).next((i=>{const s=[];return n.X(((o,c)=>{const u=new J(o),h=(function(m){return[0,De(m)]})(u);s.push(t.get(h).next((f=>f?w.resolve():(m=>t.put({targetId:0,path:De(m),sequenceNumber:i.highestListenSequenceNumber}))(u))))})).next((()=>w.waitFor(s)))}))}Si(e,t){e.createObjectStore(pi,{keyPath:F_});const n=t.store(pi),i=new fc,s=o=>{if(i.add(o)){const c=o.lastSegment(),u=o.popLast();return n.put({collectionId:c,parent:De(u)})}};return t.store(sn).X({Z:!0},((o,c)=>{const u=new J(o);return s(u.popLast())})).next((()=>t.store(nr).X({Z:!0},(([o,c,u],h)=>{const f=Je(c);return s(f.popLast())}))))}bi(e){const t=e.store(rr);return t.X(((n,i)=>{const s=Jr(i),o=Nf(this.serializer,s);return t.put(o)}))}Di(e,t){const n=t.store(sn),i=[];return n.X(((s,o)=>{const c=t.store(Ms),u=(function(m){return m.document?new O(J.fromString(m.document.name).popFirst(5)):m.noDocument?O.fromSegments(m.noDocument.path):m.unknownDocument?O.fromSegments(m.unknownDocument.path):M(36783)})(o).path.toArray(),h={prefixPath:u.slice(0,u.length-2),collectionGroup:u[u.length-2],documentId:u[u.length-1],readTime:o.readTime||[0,0],unknownDocument:o.unknownDocument,noDocument:o.noDocument,document:o.document,hasCommittedMutations:!!o.hasCommittedMutations};i.push(c.put(h))})).next((()=>w.waitFor(i)))}Ci(e,t){const n=t.store(Ke),i=$f(this.serializer),s=new mc(yo.Vi,this.serializer.gt);return n.j().next((o=>{const c=new Map;return o.forEach((u=>{var h;let f=(h=c.get(u.userId))!==null&&h!==void 0?h:G();an(this.serializer,u).keys().forEach((m=>f=f.add(m))),c.set(u.userId,f)})),w.forEach(c,((u,h)=>{const f=new Te(h),m=go.yt(this.serializer,f),g=s.getIndexManager(f),b=_o.yt(f,this.serializer,g,s.referenceDelegate);return new Gf(i,b,m,g).recalculateAndSaveOverlaysForDocumentKeys(new va(t,qe.ue),u).next()}))}))}}function hh(r){r.createObjectStore(ir,{keyPath:M_}).createIndex(Ja,L_,{unique:!0}),r.createObjectStore(rr,{keyPath:"targetId"}).createIndex(Dd,O_,{unique:!0}),r.createObjectStore(dn)}const Ct="IndexedDbPersistence",ia=18e5,sa=5e3,oa="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.",yI="main";class gc{constructor(e,t,n,i,s,o,c,u,h,f,m=18){if(this.allowTabSynchronization=e,this.persistenceKey=t,this.clientId=n,this.Fi=s,this.window=o,this.document=c,this.Mi=h,this.xi=f,this.Oi=m,this.ui=null,this.ci=!1,this.isPrimary=!1,this.networkEnabled=!0,this.Ni=null,this.inForeground=!1,this.Bi=null,this.Li=null,this.ki=Number.NEGATIVE_INFINITY,this.qi=g=>Promise.resolve(),!gc.C())throw new k(S.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new sI(this,i),this.Qi=t+yI,this.serializer=new kf(u),this.$i=new jt(this.Qi,this.Oi,new _I(this.serializer)),this.li=new Wy,this.hi=new tI(this.referenceDelegate,this.serializer),this.remoteDocumentCache=$f(this.serializer),this.Ti=new Ky,this.window&&this.window.localStorage?this.Ui=this.window.localStorage:(this.Ui=null,f===!1&&xe(Ct,"LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.Ki().then((()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new k(S.FAILED_PRECONDITION,oa);return this.Wi(),this.Gi(),this.zi(),this.runTransaction("getHighestListenSequenceNumber","readonly",(e=>this.hi.getHighestSequenceNumber(e)))})).then((e=>{this.ui=new qe(e,this.Mi)})).then((()=>{this.ci=!0})).catch((e=>(this.$i&&this.$i.close(),Promise.reject(e))))}ji(e){return this.qi=async t=>{if(this.started)return e(t)},e(this.isPrimary)}setDatabaseDeletedListener(e){this.$i.setDatabaseDeletedListener(e)}setNetworkEnabled(e){this.networkEnabled!==e&&(this.networkEnabled=e,this.Fi.enqueueAndForget((async()=>{this.started&&await this.Ki()})))}Ki(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",(e=>fs(e).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next((()=>{if(this.isPrimary)return this.Ji(e).next((t=>{t||(this.isPrimary=!1,this.Fi.enqueueRetryable((()=>this.qi(!1))))}))})).next((()=>this.Hi(e))).next((t=>this.isPrimary&&!t?this.Yi(e).next((()=>!1)):!!t&&this.Zi(e).next((()=>!0)))))).catch((e=>{if(Ht(e))return V(Ct,"Failed to extend owner lease: ",e),this.isPrimary;if(!this.allowTabSynchronization)throw e;return V(Ct,"Releasing owner lease after error during lease refresh",e),!1})).then((e=>{this.isPrimary!==e&&this.Fi.enqueueRetryable((()=>this.qi(e))),this.isPrimary=e}))}Ji(e){return Gr(e).get(Ln).next((t=>w.resolve(this.Xi(t))))}es(e){return fs(e).delete(this.clientId)}async ts(){if(this.isPrimary&&!this.ns(this.ki,ia)){this.ki=Date.now();const e=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",(t=>{const n=_e(t,sr);return n.j().next((i=>{const s=this.rs(i,ia),o=i.filter((c=>s.indexOf(c)===-1));return w.forEach(o,(c=>n.delete(c.clientId))).next((()=>o))}))})).catch((()=>[]));if(this.Ui)for(const t of e)this.Ui.removeItem(this.ss(t.clientId))}}zi(){this.Li=this.Fi.enqueueAfterDelay("client_metadata_refresh",4e3,(()=>this.Ki().then((()=>this.ts())).then((()=>this.zi()))))}Xi(e){return!!e&&e.ownerId===this.clientId}Hi(e){return this.xi?w.resolve(!0):Gr(e).get(Ln).next((t=>{if(t!==null&&this.ns(t.leaseTimestampMs,sa)&&!this._s(t.ownerId)){if(this.Xi(t)&&this.networkEnabled)return!0;if(!this.Xi(t)){if(!t.allowTabSynchronization)throw new k(S.FAILED_PRECONDITION,oa);return!1}}return!(!this.networkEnabled||!this.inForeground)||fs(e).j().next((n=>this.rs(n,sa).find((i=>{if(this.clientId!==i.clientId){const s=!this.networkEnabled&&i.networkEnabled,o=!this.inForeground&&i.inForeground,c=this.networkEnabled===i.networkEnabled;if(s||o&&c)return!0}return!1}))===void 0))})).next((t=>(this.isPrimary!==t&&V(Ct,`Client ${t?"is":"is not"} eligible for a primary lease.`),t)))}async shutdown(){this.ci=!1,this.us(),this.Li&&(this.Li.cancel(),this.Li=null),this.cs(),this.ls(),await this.$i.runTransaction("shutdown","readwrite",[Si,sr],(e=>{const t=new va(e,qe.ue);return this.Yi(t).next((()=>this.es(t)))})),this.$i.close(),this.hs()}rs(e,t){return e.filter((n=>this.ns(n.updateTimeMs,t)&&!this._s(n.clientId)))}Ps(){return this.runTransaction("getActiveClients","readonly",(e=>fs(e).j().next((t=>this.rs(t,ia).map((n=>n.clientId))))))}get started(){return this.ci}getGlobalsCache(){return this.li}getMutationQueue(e,t){return _o.yt(e,this.serializer,t,this.referenceDelegate)}getTargetCache(){return this.hi}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(e){return new eI(e,this.serializer.gt.databaseId)}getDocumentOverlayCache(e){return go.yt(this.serializer,e)}getBundleCache(){return this.Ti}runTransaction(e,t,n){V(Ct,"Starting transaction:",e);const i=t==="readonly"?"readonly":"readwrite",s=(function(u){return u===18?ey:u===17?Fd:u===16?Z_:u===15?ec:u===14?Ld:u===13?Md:u===12?Y_:u===11?Od:void M(60245)})(this.Oi);let o;return this.$i.runTransaction(e,i,s,(c=>(o=new va(c,this.ui?this.ui.next():qe.ue),t==="readwrite-primary"?this.Ji(o).next((u=>!!u||this.Hi(o))).next((u=>{if(!u)throw xe(`Failed to obtain primary lease for action '${e}'.`),this.isPrimary=!1,this.Fi.enqueueRetryable((()=>this.qi(!1))),new k(S.FAILED_PRECONDITION,bd);return n(o)})).next((u=>this.Zi(o).next((()=>u)))):this.Ts(o).next((()=>n(o)))))).then((c=>(o.raiseOnCommittedEvent(),c)))}Ts(e){return Gr(e).get(Ln).next((t=>{if(t!==null&&this.ns(t.leaseTimestampMs,sa)&&!this._s(t.ownerId)&&!this.Xi(t)&&!(this.xi||this.allowTabSynchronization&&t.allowTabSynchronization))throw new k(S.FAILED_PRECONDITION,oa)}))}Zi(e){const t={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return Gr(e).put(Ln,t)}static C(){return jt.C()}Yi(e){const t=Gr(e);return t.get(Ln).next((n=>this.Xi(n)?(V(Ct,"Releasing primary lease."),t.delete(Ln)):w.resolve()))}ns(e,t){const n=Date.now();return!(e<n-t)&&(!(e>n)||(xe(`Detected an update time that is in the future: ${e} > ${n}`),!1))}Wi(){this.document!==null&&typeof this.document.addEventListener=="function"&&(this.Bi=()=>{this.Fi.enqueueAndForget((()=>(this.inForeground=this.document.visibilityState==="visible",this.Ki())))},this.document.addEventListener("visibilitychange",this.Bi),this.inForeground=this.document.visibilityState==="visible")}cs(){this.Bi&&(this.document.removeEventListener("visibilitychange",this.Bi),this.Bi=null)}Gi(){var e;typeof((e=this.window)===null||e===void 0?void 0:e.addEventListener)=="function"&&(this.Ni=()=>{this.us();const t=/(?:Version|Mobile)\/1[456]/;cd()&&(navigator.appVersion.match(t)||navigator.userAgent.match(t))&&this.Fi.enterRestrictedMode(!0),this.Fi.enqueueAndForget((()=>this.shutdown()))},this.window.addEventListener("pagehide",this.Ni))}ls(){this.Ni&&(this.window.removeEventListener("pagehide",this.Ni),this.Ni=null)}_s(e){var t;try{const n=((t=this.Ui)===null||t===void 0?void 0:t.getItem(this.ss(e)))!==null;return V(Ct,`Client '${e}' ${n?"is":"is not"} zombied in LocalStorage`),n}catch(n){return xe(Ct,"Failed to get zombied client id.",n),!1}}us(){if(this.Ui)try{this.Ui.setItem(this.ss(this.clientId),String(Date.now()))}catch(e){xe("Failed to set zombie client id.",e)}}hs(){if(this.Ui)try{this.Ui.removeItem(this.ss(this.clientId))}catch{}}ss(e){return`firestore_zombie_${this.persistenceKey}_${e}`}}function Gr(r){return _e(r,Si)}function fs(r){return _e(r,sr)}function II(r,e){let t=r.projectId;return r.isDefaultDatabase||(t+="."+r.database),"firestore/"+e+"/"+t+"/"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _c{constructor(e,t,n,i){this.targetId=e,this.fromCache=t,this.Is=n,this.ds=i}static Es(e,t){let n=G(),i=G();for(const s of t.docChanges)switch(s.type){case 0:n=n.add(s.doc.key);break;case 1:i=i.add(s.doc.key)}return new _c(e,t.fromCache,n,i)}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vI{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Kf{constructor(){this.As=!1,this.Rs=!1,this.Vs=100,this.fs=(function(){return cd()?8:Sd(ge())>0?6:4})()}initialize(e,t){this.gs=e,this.indexManager=t,this.As=!0}getDocumentsMatchingQuery(e,t,n,i){const s={result:null};return this.ps(e,t).next((o=>{s.result=o})).next((()=>{if(!s.result)return this.ys(e,t,i,n).next((o=>{s.result=o}))})).next((()=>{if(s.result)return;const o=new vI;return this.ws(e,t,o).next((c=>{if(s.result=c,this.Rs)return this.Ss(e,t,o,c.size)}))})).next((()=>s.result))}Ss(e,t,n,i){return n.documentReadCount<this.Vs?(zn()<=H.DEBUG&&V("QueryEngine","SDK will not create cache indexes for query:",$n(t),"since it only creates cache indexes for collection contains","more than or equal to",this.Vs,"documents"),w.resolve()):(zn()<=H.DEBUG&&V("QueryEngine","Query:",$n(t),"scans",n.documentReadCount,"local documents and returns",i,"documents as results."),n.documentReadCount>this.fs*i?(zn()<=H.DEBUG&&V("QueryEngine","The SDK decides to create cache indexes for query:",$n(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,ze(t))):w.resolve())}ps(e,t){if(Ol(t))return w.resolve(null);let n=ze(t);return this.indexManager.getIndexType(e,n).next((i=>i===0?null:(t.limit!==null&&i===1&&(t=js(t,null,"F"),n=ze(t)),this.indexManager.getDocumentsMatchingTarget(e,n).next((s=>{const o=G(...s);return this.gs.getDocuments(e,o).next((c=>this.indexManager.getMinOffset(e,n).next((u=>{const h=this.bs(t,c);return this.Ds(t,h,o,u.readTime)?this.ps(e,js(t,null,"F")):this.vs(e,h,t,u)}))))})))))}ys(e,t,n,i){return Ol(t)||i.isEqual(U.min())?w.resolve(null):this.gs.getDocuments(e,n).next((s=>{const o=this.bs(t,s);return this.Ds(t,o,n,i)?w.resolve(null):(zn()<=H.DEBUG&&V("QueryEngine","Re-using previous result from %s to execute query: %s",i.toString(),$n(t)),this.vs(e,o,t,w_(i,ui)).next((c=>c)))}))}bs(e,t){let n=new ne(sf(e));return t.forEach(((i,s)=>{Di(e,s)&&(n=n.add(s))})),n}Ds(e,t,n,i){if(e.limit===null)return!1;if(n.size!==t.size)return!0;const s=e.limitType==="F"?t.last():t.first();return!!s&&(s.hasPendingWrites||s.version.compareTo(i)>0)}ws(e,t,n){return zn()<=H.DEBUG&&V("QueryEngine","Using full collection scan to execute query:",$n(t)),this.gs.getDocumentsMatchingQuery(e,t,Be.min(),n)}vs(e,t,n,i){return this.gs.getDocumentsMatchingQuery(e,n,i).next((s=>(t.forEach((o=>{s=s.insert(o.key,o)})),s)))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yc="LocalStore",EI=3e8;class TI{constructor(e,t,n,i){this.persistence=e,this.Cs=t,this.serializer=i,this.Fs=new ue(q),this.Ms=new Et((s=>_n(s)),Ci),this.xs=new Map,this.Os=e.getRemoteDocumentCache(),this.hi=e.getTargetCache(),this.Ti=e.getBundleCache(),this.Ns(n)}Ns(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new Gf(this.Os,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.Os.setIndexManager(this.indexManager),this.Cs.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",(t=>e.collect(t,this.Fs)))}}function Wf(r,e,t,n){return new TI(r,e,t,n)}async function Hf(r,e){const t=z(r);return await t.persistence.runTransaction("Handle user change","readonly",(n=>{let i;return t.mutationQueue.getAllMutationBatches(n).next((s=>(i=s,t.Ns(e),t.mutationQueue.getAllMutationBatches(n)))).next((s=>{const o=[],c=[];let u=G();for(const h of i){o.push(h.batchId);for(const f of h.mutations)u=u.add(f.key)}for(const h of s){c.push(h.batchId);for(const f of h.mutations)u=u.add(f.key)}return t.localDocuments.getDocuments(n,u).next((h=>({Bs:h,removedBatchIds:o,addedBatchIds:c})))}))}))}function wI(r,e){const t=z(r);return t.persistence.runTransaction("Acknowledge batch","readwrite-primary",(n=>{const i=e.batch.keys(),s=t.Os.newChangeBuffer({trackRemovals:!0});return(function(c,u,h,f){const m=h.batch,g=m.keys();let b=w.resolve();return g.forEach((C=>{b=b.next((()=>f.getEntry(u,C))).next((N=>{const D=h.docVersions.get(C);L(D!==null,48541),N.version.compareTo(D)<0&&(m.applyToRemoteDocument(N,h),N.isValidDocument()&&(N.setReadTime(h.commitVersion),f.addEntry(N)))}))})),b.next((()=>c.mutationQueue.removeMutationBatch(u,m)))})(t,n,e,s).next((()=>s.apply(n))).next((()=>t.mutationQueue.performConsistencyCheck(n))).next((()=>t.documentOverlayCache.removeOverlaysForBatchId(n,i,e.batch.batchId))).next((()=>t.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(n,(function(c){let u=G();for(let h=0;h<c.mutationResults.length;++h)c.mutationResults[h].transformResults.length>0&&(u=u.add(c.batch.mutations[h].key));return u})(e)))).next((()=>t.localDocuments.getDocuments(n,i)))}))}function Qf(r){const e=z(r);return e.persistence.runTransaction("Get last remote snapshot version","readonly",(t=>e.hi.getLastRemoteSnapshotVersion(t)))}function AI(r,e){const t=z(r),n=e.snapshotVersion;let i=t.Fs;return t.persistence.runTransaction("Apply remote event","readwrite-primary",(s=>{const o=t.Os.newChangeBuffer({trackRemovals:!0});i=t.Fs;const c=[];e.targetChanges.forEach(((f,m)=>{const g=i.get(m);if(!g)return;c.push(t.hi.removeMatchingKeys(s,f.removedDocuments,m).next((()=>t.hi.addMatchingKeys(s,f.addedDocuments,m))));let b=g.withSequenceNumber(s.currentSequenceNumber);e.targetMismatches.get(m)!==null?b=b.withResumeToken(me.EMPTY_BYTE_STRING,U.min()).withLastLimboFreeSnapshotVersion(U.min()):f.resumeToken.approximateByteSize()>0&&(b=b.withResumeToken(f.resumeToken,n)),i=i.insert(m,b),(function(N,D,$){return N.resumeToken.approximateByteSize()===0||D.snapshotVersion.toMicroseconds()-N.snapshotVersion.toMicroseconds()>=EI?!0:$.addedDocuments.size+$.modifiedDocuments.size+$.removedDocuments.size>0})(g,b,f)&&c.push(t.hi.updateTargetData(s,b))}));let u=Ue(),h=G();if(e.documentUpdates.forEach((f=>{e.resolvedLimboDocuments.has(f)&&c.push(t.persistence.referenceDelegate.updateLimboDocument(s,f))})),c.push(RI(s,o,e.documentUpdates).next((f=>{u=f.Ls,h=f.ks}))),!n.isEqual(U.min())){const f=t.hi.getLastRemoteSnapshotVersion(s).next((m=>t.hi.setTargetsMetadata(s,s.currentSequenceNumber,n)));c.push(f)}return w.waitFor(c).next((()=>o.apply(s))).next((()=>t.localDocuments.getLocalViewOfDocuments(s,u,h))).next((()=>u))})).then((s=>(t.Fs=i,s)))}function RI(r,e,t){let n=G(),i=G();return t.forEach((s=>n=n.add(s))),e.getEntries(r,n).next((s=>{let o=Ue();return t.forEach(((c,u)=>{const h=s.get(c);u.isFoundDocument()!==h.isFoundDocument()&&(i=i.add(c)),u.isNoDocument()&&u.version.isEqual(U.min())?(e.removeEntry(c,u.readTime),o=o.insert(c,u)):!h.isValidDocument()||u.version.compareTo(h.version)>0||u.version.compareTo(h.version)===0&&h.hasPendingWrites?(e.addEntry(u),o=o.insert(c,u)):V(yc,"Ignoring outdated watch update for ",c,". Current version:",h.version," Watch version:",u.version)})),{Ls:o,ks:i}}))}function bI(r,e){const t=z(r);return t.persistence.runTransaction("Get next mutation batch","readonly",(n=>(e===void 0&&(e=hn),t.mutationQueue.getNextMutationBatchAfterBatchId(n,e))))}function PI(r,e){const t=z(r);return t.persistence.runTransaction("Allocate target","readwrite",(n=>{let i;return t.hi.getTargetData(n,e).next((s=>s?(i=s,w.resolve(i)):t.hi.allocateTargetId(n).next((o=>(i=new lt(e,o,"TargetPurposeListen",n.currentSequenceNumber),t.hi.addTargetData(n,i).next((()=>i)))))))})).then((n=>{const i=t.Fs.get(n.targetId);return(i===null||n.snapshotVersion.compareTo(i.snapshotVersion)>0)&&(t.Fs=t.Fs.insert(n.targetId,n),t.Ms.set(e,n.targetId)),n}))}async function xa(r,e,t){const n=z(r),i=n.Fs.get(e),s=t?"readwrite":"readwrite-primary";try{t||await n.persistence.runTransaction("Release target",s,(o=>n.persistence.referenceDelegate.removeTarget(o,i)))}catch(o){if(!Ht(o))throw o;V(yc,`Failed to update sequence numbers for target ${e}: ${o}`)}n.Fs=n.Fs.remove(e),n.Ms.delete(i.target)}function dh(r,e,t){const n=z(r);let i=U.min(),s=G();return n.persistence.runTransaction("Execute query","readwrite",(o=>(function(u,h,f){const m=z(u),g=m.Ms.get(f);return g!==void 0?w.resolve(m.Fs.get(g)):m.hi.getTargetData(h,f)})(n,o,ze(e)).next((c=>{if(c)return i=c.lastLimboFreeSnapshotVersion,n.hi.getMatchingKeysForTargetId(o,c.targetId).next((u=>{s=u}))})).next((()=>n.Cs.getDocumentsMatchingQuery(o,e,t?i:U.min(),t?s:G()))).next((c=>(SI(n,my(e),c),{documents:c,qs:s})))))}function SI(r,e,t){let n=r.xs.get(e)||U.min();t.forEach(((i,s)=>{s.readTime.compareTo(n)>0&&(n=s.readTime)})),r.xs.set(e,n)}class fh{constructor(){this.activeTargetIds=Ey()}Gs(e){this.activeTargetIds=this.activeTargetIds.add(e)}zs(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Ws(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class Xf{constructor(){this.Fo=new fh,this.Mo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,n){}addLocalQueryTarget(e,t=!0){return t&&this.Fo.Gs(e),this.Mo[e]||"not-current"}updateQueryState(e,t,n){this.Mo[e]=t}removeLocalQueryTarget(e){this.Fo.zs(e)}isLocalQueryTarget(e){return this.Fo.activeTargetIds.has(e)}clearQueryState(e){delete this.Mo[e]}getAllActiveQueryTargets(){return this.Fo.activeTargetIds}isActiveQueryTarget(e){return this.Fo.activeTargetIds.has(e)}start(){return this.Fo=new fh,Promise.resolve()}handleUserChange(e,t,n){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class CI{xo(e){}shutdown(){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ph="ConnectivityMonitor";class mh{constructor(){this.Oo=()=>this.No(),this.Bo=()=>this.Lo(),this.ko=[],this.qo()}xo(e){this.ko.push(e)}shutdown(){window.removeEventListener("online",this.Oo),window.removeEventListener("offline",this.Bo)}qo(){window.addEventListener("online",this.Oo),window.addEventListener("offline",this.Bo)}No(){V(ph,"Network connectivity changed: AVAILABLE");for(const e of this.ko)e(0)}Lo(){V(ph,"Network connectivity changed: UNAVAILABLE");for(const e of this.ko)e(1)}static C(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let ps=null;function Oa(){return ps===null?ps=(function(){return 268435456+Math.round(2147483648*Math.random())})():ps++,"0x"+ps.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const aa="RestConnection",VI={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};class DI{get Qo(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const t=e.ssl?"https":"http",n=encodeURIComponent(this.databaseId.projectId),i=encodeURIComponent(this.databaseId.database);this.$o=t+"://"+e.host,this.Uo=`projects/${n}/databases/${i}`,this.Ko=this.databaseId.database===Fs?`project_id=${n}`:`project_id=${n}&database_id=${i}`}Wo(e,t,n,i,s){const o=Oa(),c=this.Go(e,t.toUriEncodedString());V(aa,`Sending RPC '${e}' ${o}:`,c,n);const u={"google-cloud-resource-prefix":this.Uo,"x-goog-request-params":this.Ko};this.zo(u,i,s);const{host:h}=new URL(c),f=pr(h);return this.jo(e,c,u,n,f).then((m=>(V(aa,`Received RPC '${e}' ${o}: `,m),m)),(m=>{throw rt(aa,`RPC '${e}' ${o} failed with error: `,m,"url: ",c,"request:",n),m}))}Jo(e,t,n,i,s,o){return this.Wo(e,t,n,i,s)}zo(e,t,n){e["X-Goog-Api-Client"]=(function(){return"gl-js/ fire/"+gr})(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach(((i,s)=>e[s]=i)),n&&n.headers.forEach(((i,s)=>e[s]=i))}Go(e,t){const n=VI[e];return`${this.$o}/v1/${t}:${n}`}terminate(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kI{constructor(e){this.Ho=e.Ho,this.Yo=e.Yo}Zo(e){this.Xo=e}e_(e){this.t_=e}n_(e){this.r_=e}onMessage(e){this.i_=e}close(){this.Yo()}send(e){this.Ho(e)}s_(){this.Xo()}o_(){this.t_()}__(e){this.r_(e)}a_(e){this.i_(e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ce="WebChannelConnection";class NI extends DI{constructor(e){super(e),this.u_=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}jo(e,t,n,i,s){const o=Oa();return new Promise(((c,u)=>{const h=new md;h.setWithCredentials(!0),h.listenOnce(gd.COMPLETE,(()=>{try{switch(h.getLastErrorCode()){case gs.NO_ERROR:const m=h.getResponseJson();V(Ce,`XHR for RPC '${e}' ${o} received:`,JSON.stringify(m)),c(m);break;case gs.TIMEOUT:V(Ce,`RPC '${e}' ${o} timed out`),u(new k(S.DEADLINE_EXCEEDED,"Request time out"));break;case gs.HTTP_ERROR:const g=h.getStatus();if(V(Ce,`RPC '${e}' ${o} failed with status:`,g,"response text:",h.getResponseText()),g>0){let b=h.getResponseJson();Array.isArray(b)&&(b=b[0]);const C=b==null?void 0:b.error;if(C&&C.status&&C.message){const N=(function($){const B=$.toLowerCase().replace(/_/g,"-");return Object.values(S).indexOf(B)>=0?B:S.UNKNOWN})(C.status);u(new k(N,C.message))}else u(new k(S.UNKNOWN,"Server responded with status "+h.getStatus()))}else u(new k(S.UNAVAILABLE,"Connection failed."));break;default:M(9055,{c_:e,streamId:o,l_:h.getLastErrorCode(),h_:h.getLastError()})}}finally{V(Ce,`RPC '${e}' ${o} completed.`)}}));const f=JSON.stringify(i);V(Ce,`RPC '${e}' ${o} sending request:`,i),h.send(t,"POST",f,n,15)}))}P_(e,t,n){const i=Oa(),s=[this.$o,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=Id(),c=yd(),u={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},h=this.longPollingOptions.timeoutSeconds;h!==void 0&&(u.longPollingTimeout=Math.round(1e3*h)),this.useFetchStreams&&(u.useFetchStreams=!0),this.zo(u.initMessageHeaders,t,n),u.encodeInitMessageHeaders=!0;const f=s.join("");V(Ce,`Creating RPC '${e}' stream ${i}: ${f}`,u);const m=o.createWebChannel(f,u);this.T_(m);let g=!1,b=!1;const C=new kI({Ho:D=>{b?V(Ce,`Not sending because RPC '${e}' stream ${i} is closed:`,D):(g||(V(Ce,`Opening RPC '${e}' stream ${i} transport.`),m.open(),g=!0),V(Ce,`RPC '${e}' stream ${i} sending:`,D),m.send(D))},Yo:()=>m.close()}),N=(D,$,B)=>{D.listen($,(F=>{try{B(F)}catch(W){setTimeout((()=>{throw W}),0)}}))};return N(m,Hr.EventType.OPEN,(()=>{b||(V(Ce,`RPC '${e}' stream ${i} transport opened.`),C.s_())})),N(m,Hr.EventType.CLOSE,(()=>{b||(b=!0,V(Ce,`RPC '${e}' stream ${i} transport closed`),C.__(),this.I_(m))})),N(m,Hr.EventType.ERROR,(D=>{b||(b=!0,rt(Ce,`RPC '${e}' stream ${i} transport errored. Name:`,D.name,"Message:",D.message),C.__(new k(S.UNAVAILABLE,"The operation could not be completed")))})),N(m,Hr.EventType.MESSAGE,(D=>{var $;if(!b){const B=D.data[0];L(!!B,16349);const F=B,W=(F==null?void 0:F.error)||(($=F[0])===null||$===void 0?void 0:$.error);if(W){V(Ce,`RPC '${e}' stream ${i} received error:`,W);const Z=W.status;let K=(function(I){const E=fe[I];if(E!==void 0)return yf(E)})(Z),v=W.message;K===void 0&&(K=S.INTERNAL,v="Unknown error status: "+Z+" with message "+W.message),b=!0,C.__(new k(K,v)),m.close()}else V(Ce,`RPC '${e}' stream ${i} received:`,B),C.a_(B)}})),N(c,_d.STAT_EVENT,(D=>{D.stat===pa.PROXY?V(Ce,`RPC '${e}' stream ${i} detected buffering proxy`):D.stat===pa.NOPROXY&&V(Ce,`RPC '${e}' stream ${i} detected no buffering proxy`)})),setTimeout((()=>{C.o_()}),0),C}terminate(){this.u_.forEach((e=>e.close())),this.u_=[]}T_(e){this.u_.push(e)}I_(e){this.u_=this.u_.filter((t=>t===e))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function xI(){return typeof window<"u"?window:null}function bs(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Io(r){return new xy(r,!0)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ic{constructor(e,t,n=1e3,i=1.5,s=6e4){this.Fi=e,this.timerId=t,this.d_=n,this.E_=i,this.A_=s,this.R_=0,this.V_=null,this.m_=Date.now(),this.reset()}reset(){this.R_=0}f_(){this.R_=this.A_}g_(e){this.cancel();const t=Math.floor(this.R_+this.p_()),n=Math.max(0,Date.now()-this.m_),i=Math.max(0,t-n);i>0&&V("ExponentialBackoff",`Backing off for ${i} ms (base delay: ${this.R_} ms, delay with jitter: ${t} ms, last attempt: ${n} ms ago)`),this.V_=this.Fi.enqueueAfterDelay(this.timerId,i,(()=>(this.m_=Date.now(),e()))),this.R_*=this.E_,this.R_<this.d_&&(this.R_=this.d_),this.R_>this.A_&&(this.R_=this.A_)}y_(){this.V_!==null&&(this.V_.skipDelay(),this.V_=null)}cancel(){this.V_!==null&&(this.V_.cancel(),this.V_=null)}p_(){return(Math.random()-.5)*this.R_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gh="PersistentStream";class Jf{constructor(e,t,n,i,s,o,c,u){this.Fi=e,this.w_=n,this.S_=i,this.connection=s,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=c,this.listener=u,this.state=0,this.b_=0,this.D_=null,this.v_=null,this.stream=null,this.C_=0,this.F_=new Ic(e,t)}M_(){return this.state===1||this.state===5||this.x_()}x_(){return this.state===2||this.state===3}start(){this.C_=0,this.state!==4?this.auth():this.O_()}async stop(){this.M_()&&await this.close(0)}N_(){this.state=0,this.F_.reset()}B_(){this.x_()&&this.D_===null&&(this.D_=this.Fi.enqueueAfterDelay(this.w_,6e4,(()=>this.L_())))}k_(e){this.q_(),this.stream.send(e)}async L_(){if(this.x_())return this.close(0)}q_(){this.D_&&(this.D_.cancel(),this.D_=null)}Q_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(e,t){this.q_(),this.Q_(),this.F_.cancel(),this.b_++,e!==4?this.F_.reset():t&&t.code===S.RESOURCE_EXHAUSTED?(xe(t.toString()),xe("Using maximum backoff delay to prevent overloading the backend."),this.F_.f_()):t&&t.code===S.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.U_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.n_(t)}U_(){}auth(){this.state=1;const e=this.K_(this.b_),t=this.b_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then((([n,i])=>{this.b_===t&&this.W_(n,i)}),(n=>{e((()=>{const i=new k(S.UNKNOWN,"Fetching auth token failed: "+n.message);return this.G_(i)}))}))}W_(e,t){const n=this.K_(this.b_);this.stream=this.z_(e,t),this.stream.Zo((()=>{n((()=>this.listener.Zo()))})),this.stream.e_((()=>{n((()=>(this.state=2,this.v_=this.Fi.enqueueAfterDelay(this.S_,1e4,(()=>(this.x_()&&(this.state=3),Promise.resolve()))),this.listener.e_())))})),this.stream.n_((i=>{n((()=>this.G_(i)))})),this.stream.onMessage((i=>{n((()=>++this.C_==1?this.j_(i):this.onNext(i)))}))}O_(){this.state=5,this.F_.g_((async()=>{this.state=0,this.start()}))}G_(e){return V(gh,`close with error: ${e}`),this.stream=null,this.close(4,e)}K_(e){return t=>{this.Fi.enqueueAndForget((()=>this.b_===e?t():(V(gh,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve())))}}}class OI extends Jf{constructor(e,t,n,i,s,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,n,i,o),this.serializer=s}z_(e,t){return this.connection.P_("Listen",e,t)}j_(e){return this.onNext(e)}onNext(e){this.F_.reset();const t=Fy(this.serializer,e),n=(function(s){if(!("targetChange"in s))return U.min();const o=s.targetChange;return o.targetIds&&o.targetIds.length?U.min():o.readTime?ve(o.readTime):U.min()})(e);return this.listener.J_(t,n)}H_(e){const t={};t.database=Ca(this.serializer),t.addTarget=(function(s,o){let c;const u=o.target;if(c=Us(u)?{documents:bf(s,u)}:{query:Pf(s,u).Vt},c.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){c.resumeToken=Ef(s,o.resumeToken);const h=Pa(s,o.expectedCount);h!==null&&(c.expectedCount=h)}else if(o.snapshotVersion.compareTo(U.min())>0){c.readTime=dr(s,o.snapshotVersion.toTimestamp());const h=Pa(s,o.expectedCount);h!==null&&(c.expectedCount=h)}return c})(this.serializer,e);const n=By(this.serializer,e);n&&(t.labels=n),this.k_(t)}Y_(e){const t={};t.database=Ca(this.serializer),t.removeTarget=e,this.k_(t)}}class MI extends Jf{constructor(e,t,n,i,s,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,n,i,o),this.serializer=s}get Z_(){return this.C_>0}start(){this.lastStreamToken=void 0,super.start()}U_(){this.Z_&&this.X_([])}z_(e,t){return this.connection.P_("Write",e,t)}j_(e){return L(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,L(!e.writeResults||e.writeResults.length===0,55816),this.listener.ea()}onNext(e){L(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.F_.reset();const t=Uy(e.writeResults,e.commitTime),n=ve(e.commitTime);return this.listener.ta(n,t)}na(){const e={};e.database=Ca(this.serializer),this.k_(e)}X_(e){const t={streamToken:this.lastStreamToken,writes:e.map((n=>Ei(this.serializer,n)))};this.k_(t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class LI{}class FI extends LI{constructor(e,t,n,i){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=n,this.serializer=i,this.ra=!1}ia(){if(this.ra)throw new k(S.FAILED_PRECONDITION,"The client has already been terminated.")}Wo(e,t,n,i){return this.ia(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then((([s,o])=>this.connection.Wo(e,Sa(t,n),i,s,o))).catch((s=>{throw s.name==="FirebaseError"?(s.code===S.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),s):new k(S.UNKNOWN,s.toString())}))}Jo(e,t,n,i,s){return this.ia(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then((([o,c])=>this.connection.Jo(e,Sa(t,n),i,o,c,s))).catch((o=>{throw o.name==="FirebaseError"?(o.code===S.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new k(S.UNKNOWN,o.toString())}))}terminate(){this.ra=!0,this.connection.terminate()}}class UI{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.sa=0,this.oa=null,this._a=!0}aa(){this.sa===0&&(this.ua("Unknown"),this.oa=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,(()=>(this.oa=null,this.ca("Backend didn't respond within 10 seconds."),this.ua("Offline"),Promise.resolve()))))}la(e){this.state==="Online"?this.ua("Unknown"):(this.sa++,this.sa>=1&&(this.ha(),this.ca(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.ua("Offline")))}set(e){this.ha(),this.sa=0,e==="Online"&&(this._a=!1),this.ua(e)}ua(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}ca(e){const t=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this._a?(xe(t),this._a=!1):V("OnlineStateTracker",t)}ha(){this.oa!==null&&(this.oa.cancel(),this.oa=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wn="RemoteStore";class BI{constructor(e,t,n,i,s){this.localStore=e,this.datastore=t,this.asyncQueue=n,this.remoteSyncer={},this.Pa=[],this.Ta=new Map,this.Ia=new Set,this.da=[],this.Ea=s,this.Ea.xo((o=>{n.enqueueAndForget((async()=>{Cn(this)&&(V(wn,"Restarting streams for network reachability change."),await(async function(u){const h=z(u);h.Ia.add(4),await xi(h),h.Aa.set("Unknown"),h.Ia.delete(4),await vo(h)})(this))}))})),this.Aa=new UI(n,i)}}async function vo(r){if(Cn(r))for(const e of r.da)await e(!0)}async function xi(r){for(const e of r.da)await e(!1)}function Yf(r,e){const t=z(r);t.Ta.has(e.targetId)||(t.Ta.set(e.targetId,e),wc(t)?Tc(t):Ir(t).x_()&&Ec(t,e))}function vc(r,e){const t=z(r),n=Ir(t);t.Ta.delete(e),n.x_()&&Zf(t,e),t.Ta.size===0&&(n.x_()?n.B_():Cn(t)&&t.Aa.set("Unknown"))}function Ec(r,e){if(r.Ra.$e(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(U.min())>0){const t=r.remoteSyncer.getRemoteKeysForTarget(e.targetId).size;e=e.withExpectedCount(t)}Ir(r).H_(e)}function Zf(r,e){r.Ra.$e(e),Ir(r).Y_(e)}function Tc(r){r.Ra=new Vy({getRemoteKeysForTarget:e=>r.remoteSyncer.getRemoteKeysForTarget(e),Et:e=>r.Ta.get(e)||null,lt:()=>r.datastore.serializer.databaseId}),Ir(r).start(),r.Aa.aa()}function wc(r){return Cn(r)&&!Ir(r).M_()&&r.Ta.size>0}function Cn(r){return z(r).Ia.size===0}function ep(r){r.Ra=void 0}async function jI(r){r.Aa.set("Online")}async function qI(r){r.Ta.forEach(((e,t)=>{Ec(r,e)}))}async function zI(r,e){ep(r),wc(r)?(r.Aa.la(e),Tc(r)):r.Aa.set("Unknown")}async function $I(r,e,t){if(r.Aa.set("Online"),e instanceof vf&&e.state===2&&e.cause)try{await(async function(i,s){const o=s.cause;for(const c of s.targetIds)i.Ta.has(c)&&(await i.remoteSyncer.rejectListen(c,o),i.Ta.delete(c),i.Ra.removeTarget(c))})(r,e)}catch(n){V(wn,"Failed to remove targets %s: %s ",e.targetIds.join(","),n),await Ks(r,n)}else if(e instanceof As?r.Ra.Ye(e):e instanceof If?r.Ra.it(e):r.Ra.et(e),!t.isEqual(U.min()))try{const n=await Qf(r.localStore);t.compareTo(n)>=0&&await(function(s,o){const c=s.Ra.Pt(o);return c.targetChanges.forEach(((u,h)=>{if(u.resumeToken.approximateByteSize()>0){const f=s.Ta.get(h);f&&s.Ta.set(h,f.withResumeToken(u.resumeToken,o))}})),c.targetMismatches.forEach(((u,h)=>{const f=s.Ta.get(u);if(!f)return;s.Ta.set(u,f.withResumeToken(me.EMPTY_BYTE_STRING,f.snapshotVersion)),Zf(s,u);const m=new lt(f.target,u,h,f.sequenceNumber);Ec(s,m)})),s.remoteSyncer.applyRemoteEvent(c)})(r,t)}catch(n){V(wn,"Failed to raise snapshot:",n),await Ks(r,n)}}async function Ks(r,e,t){if(!Ht(e))throw e;r.Ia.add(1),await xi(r),r.Aa.set("Offline"),t||(t=()=>Qf(r.localStore)),r.asyncQueue.enqueueRetryable((async()=>{V(wn,"Retrying IndexedDB access"),await t(),r.Ia.delete(1),await vo(r)}))}function tp(r,e){return e().catch((t=>Ks(r,t,e)))}async function Oi(r){const e=z(r),t=Kt(e);let n=e.Pa.length>0?e.Pa[e.Pa.length-1].batchId:hn;for(;GI(e);)try{const i=await bI(e.localStore,n);if(i===null){e.Pa.length===0&&t.B_();break}n=i.batchId,KI(e,i)}catch(i){await Ks(e,i)}np(e)&&rp(e)}function GI(r){return Cn(r)&&r.Pa.length<10}function KI(r,e){r.Pa.push(e);const t=Kt(r);t.x_()&&t.Z_&&t.X_(e.mutations)}function np(r){return Cn(r)&&!Kt(r).M_()&&r.Pa.length>0}function rp(r){Kt(r).start()}async function WI(r){Kt(r).na()}async function HI(r){const e=Kt(r);for(const t of r.Pa)e.X_(t.mutations)}async function QI(r,e,t){const n=r.Pa.shift(),i=cc.from(n,e,t);await tp(r,(()=>r.remoteSyncer.applySuccessfulWrite(i))),await Oi(r)}async function XI(r,e){e&&Kt(r).Z_&&await(async function(n,i){if((function(o){return _f(o)&&o!==S.ABORTED})(i.code)){const s=n.Pa.shift();Kt(n).N_(),await tp(n,(()=>n.remoteSyncer.rejectFailedWrite(s.batchId,i))),await Oi(n)}})(r,e),np(r)&&rp(r)}async function _h(r,e){const t=z(r);t.asyncQueue.verifyOperationInProgress(),V(wn,"RemoteStore received new credentials");const n=Cn(t);t.Ia.add(3),await xi(t),n&&t.Aa.set("Unknown"),await t.remoteSyncer.handleCredentialChange(e),t.Ia.delete(3),await vo(t)}async function JI(r,e){const t=z(r);e?(t.Ia.delete(2),await vo(t)):e||(t.Ia.add(2),await xi(t),t.Aa.set("Unknown"))}function Ir(r){return r.Va||(r.Va=(function(t,n,i){const s=z(t);return s.ia(),new OI(n,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)})(r.datastore,r.asyncQueue,{Zo:jI.bind(null,r),e_:qI.bind(null,r),n_:zI.bind(null,r),J_:$I.bind(null,r)}),r.da.push((async e=>{e?(r.Va.N_(),wc(r)?Tc(r):r.Aa.set("Unknown")):(await r.Va.stop(),ep(r))}))),r.Va}function Kt(r){return r.ma||(r.ma=(function(t,n,i){const s=z(t);return s.ia(),new MI(n,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)})(r.datastore,r.asyncQueue,{Zo:()=>Promise.resolve(),e_:WI.bind(null,r),n_:XI.bind(null,r),ea:HI.bind(null,r),ta:QI.bind(null,r)}),r.da.push((async e=>{e?(r.ma.N_(),await Oi(r)):(await r.ma.stop(),r.Pa.length>0&&(V(wn,`Stopping write stream with ${r.Pa.length} pending writes`),r.Pa=[]))}))),r.ma}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ac{constructor(e,t,n,i,s){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=n,this.op=i,this.removalCallback=s,this.deferred=new He,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch((o=>{}))}get promise(){return this.deferred.promise}static createAndSchedule(e,t,n,i,s){const o=Date.now()+n,c=new Ac(e,t,o,i,s);return c.start(n),c}start(e){this.timerHandle=setTimeout((()=>this.handleDelayElapsed()),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new k(S.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget((()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then((e=>this.deferred.resolve(e)))):Promise.resolve()))}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function Rc(r,e){if(xe("AsyncQueue",`${e}: ${r}`),Ht(r))return new k(S.UNAVAILABLE,`${e}: ${r}`);throw r}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xn{static emptySet(e){return new Xn(e.comparator)}constructor(e){this.comparator=e?(t,n)=>e(t,n)||O.comparator(t.key,n.key):(t,n)=>O.comparator(t.key,n.key),this.keyedMap=Qr(),this.sortedSet=new ue(this.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal(((t,n)=>(e(t),!1)))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof Xn)||this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),n=e.sortedSet.getIterator();for(;t.hasNext();){const i=t.getNext().key,s=n.getNext().key;if(!i.isEqual(s))return!1}return!0}toString(){const e=[];return this.forEach((t=>{e.push(t.toString())})),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,t){const n=new Xn;return n.comparator=this.comparator,n.keyedMap=e,n.sortedSet=t,n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yh{constructor(){this.fa=new ue(O.comparator)}track(e){const t=e.doc.key,n=this.fa.get(t);n?e.type!==0&&n.type===3?this.fa=this.fa.insert(t,e):e.type===3&&n.type!==1?this.fa=this.fa.insert(t,{type:n.type,doc:e.doc}):e.type===2&&n.type===2?this.fa=this.fa.insert(t,{type:2,doc:e.doc}):e.type===2&&n.type===0?this.fa=this.fa.insert(t,{type:0,doc:e.doc}):e.type===1&&n.type===0?this.fa=this.fa.remove(t):e.type===1&&n.type===2?this.fa=this.fa.insert(t,{type:1,doc:n.doc}):e.type===0&&n.type===1?this.fa=this.fa.insert(t,{type:2,doc:e.doc}):M(63341,{At:e,ga:n}):this.fa=this.fa.insert(t,e)}pa(){const e=[];return this.fa.inorderTraversal(((t,n)=>{e.push(n)})),e}}class fr{constructor(e,t,n,i,s,o,c,u,h){this.query=e,this.docs=t,this.oldDocs=n,this.docChanges=i,this.mutatedKeys=s,this.fromCache=o,this.syncStateChanged=c,this.excludesMetadataChanges=u,this.hasCachedResults=h}static fromInitialDocuments(e,t,n,i,s){const o=[];return t.forEach((c=>{o.push({type:0,doc:c})})),new fr(e,t,Xn.emptySet(t),o,n,i,!0,!1,s)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&ho(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,n=e.docChanges;if(t.length!==n.length)return!1;for(let i=0;i<t.length;i++)if(t[i].type!==n[i].type||!t[i].doc.isEqual(n[i].doc))return!1;return!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class YI{constructor(){this.ya=void 0,this.wa=[]}Sa(){return this.wa.some((e=>e.ba()))}}class ZI{constructor(){this.queries=Ih(),this.onlineState="Unknown",this.Da=new Set}terminate(){(function(t,n){const i=z(t),s=i.queries;i.queries=Ih(),s.forEach(((o,c)=>{for(const u of c.wa)u.onError(n)}))})(this,new k(S.ABORTED,"Firestore shutting down"))}}function Ih(){return new Et((r=>rf(r)),ho)}async function bc(r,e){const t=z(r);let n=3;const i=e.query;let s=t.queries.get(i);s?!s.Sa()&&e.ba()&&(n=2):(s=new YI,n=e.ba()?0:1);try{switch(n){case 0:s.ya=await t.onListen(i,!0);break;case 1:s.ya=await t.onListen(i,!1);break;case 2:await t.onFirstRemoteStoreListen(i)}}catch(o){const c=Rc(o,`Initialization of query '${$n(e.query)}' failed`);return void e.onError(c)}t.queries.set(i,s),s.wa.push(e),e.va(t.onlineState),s.ya&&e.Ca(s.ya)&&Sc(t)}async function Pc(r,e){const t=z(r),n=e.query;let i=3;const s=t.queries.get(n);if(s){const o=s.wa.indexOf(e);o>=0&&(s.wa.splice(o,1),s.wa.length===0?i=e.ba()?0:1:!s.Sa()&&e.ba()&&(i=2))}switch(i){case 0:return t.queries.delete(n),t.onUnlisten(n,!0);case 1:return t.queries.delete(n),t.onUnlisten(n,!1);case 2:return t.onLastRemoteStoreUnlisten(n);default:return}}function ev(r,e){const t=z(r);let n=!1;for(const i of e){const s=i.query,o=t.queries.get(s);if(o){for(const c of o.wa)c.Ca(i)&&(n=!0);o.ya=i}}n&&Sc(t)}function tv(r,e,t){const n=z(r),i=n.queries.get(e);if(i)for(const s of i.wa)s.onError(t);n.queries.delete(e)}function Sc(r){r.Da.forEach((e=>{e.next()}))}var Ma,vh;(vh=Ma||(Ma={})).Fa="default",vh.Cache="cache";class Cc{constructor(e,t,n){this.query=e,this.Ma=t,this.xa=!1,this.Oa=null,this.onlineState="Unknown",this.options=n||{}}Ca(e){if(!this.options.includeMetadataChanges){const n=[];for(const i of e.docChanges)i.type!==3&&n.push(i);e=new fr(e.query,e.docs,e.oldDocs,n,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.xa?this.Na(e)&&(this.Ma.next(e),t=!0):this.Ba(e,this.onlineState)&&(this.La(e),t=!0),this.Oa=e,t}onError(e){this.Ma.error(e)}va(e){this.onlineState=e;let t=!1;return this.Oa&&!this.xa&&this.Ba(this.Oa,e)&&(this.La(this.Oa),t=!0),t}Ba(e,t){if(!e.fromCache||!this.ba())return!0;const n=t!=="Offline";return(!this.options.ka||!n)&&(!e.docs.isEmpty()||e.hasCachedResults||t==="Offline")}Na(e){if(e.docChanges.length>0)return!0;const t=this.Oa&&this.Oa.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&this.options.includeMetadataChanges===!0}La(e){e=fr.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.xa=!0,this.Ma.next(e)}ba(){return this.options.source!==Ma.Cache}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ip{constructor(e){this.key=e}}class sp{constructor(e){this.key=e}}class nv{constructor(e,t){this.query=e,this.Ha=t,this.Ya=null,this.hasCachedResults=!1,this.current=!1,this.Za=G(),this.mutatedKeys=G(),this.Xa=sf(e),this.eu=new Xn(this.Xa)}get tu(){return this.Ha}nu(e,t){const n=t?t.ru:new yh,i=t?t.eu:this.eu;let s=t?t.mutatedKeys:this.mutatedKeys,o=i,c=!1;const u=this.query.limitType==="F"&&i.size===this.query.limit?i.last():null,h=this.query.limitType==="L"&&i.size===this.query.limit?i.first():null;if(e.inorderTraversal(((f,m)=>{const g=i.get(f),b=Di(this.query,m)?m:null,C=!!g&&this.mutatedKeys.has(g.key),N=!!b&&(b.hasLocalMutations||this.mutatedKeys.has(b.key)&&b.hasCommittedMutations);let D=!1;g&&b?g.data.isEqual(b.data)?C!==N&&(n.track({type:3,doc:b}),D=!0):this.iu(g,b)||(n.track({type:2,doc:b}),D=!0,(u&&this.Xa(b,u)>0||h&&this.Xa(b,h)<0)&&(c=!0)):!g&&b?(n.track({type:0,doc:b}),D=!0):g&&!b&&(n.track({type:1,doc:g}),D=!0,(u||h)&&(c=!0)),D&&(b?(o=o.add(b),s=N?s.add(f):s.delete(f)):(o=o.delete(f),s=s.delete(f)))})),this.query.limit!==null)for(;o.size>this.query.limit;){const f=this.query.limitType==="F"?o.last():o.first();o=o.delete(f.key),s=s.delete(f.key),n.track({type:1,doc:f})}return{eu:o,ru:n,Ds:c,mutatedKeys:s}}iu(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,n,i){const s=this.eu;this.eu=e.eu,this.mutatedKeys=e.mutatedKeys;const o=e.ru.pa();o.sort(((f,m)=>(function(b,C){const N=D=>{switch(D){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return M(20277,{At:D})}};return N(b)-N(C)})(f.type,m.type)||this.Xa(f.doc,m.doc))),this.su(n),i=i!=null&&i;const c=t&&!i?this.ou():[],u=this.Za.size===0&&this.current&&!i?1:0,h=u!==this.Ya;return this.Ya=u,o.length!==0||h?{snapshot:new fr(this.query,e.eu,s,o,e.mutatedKeys,u===0,h,!1,!!n&&n.resumeToken.approximateByteSize()>0),_u:c}:{_u:c}}va(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({eu:this.eu,ru:new yh,mutatedKeys:this.mutatedKeys,Ds:!1},!1)):{_u:[]}}au(e){return!this.Ha.has(e)&&!!this.eu.has(e)&&!this.eu.get(e).hasLocalMutations}su(e){e&&(e.addedDocuments.forEach((t=>this.Ha=this.Ha.add(t))),e.modifiedDocuments.forEach((t=>{})),e.removedDocuments.forEach((t=>this.Ha=this.Ha.delete(t))),this.current=e.current)}ou(){if(!this.current)return[];const e=this.Za;this.Za=G(),this.eu.forEach((n=>{this.au(n.key)&&(this.Za=this.Za.add(n.key))}));const t=[];return e.forEach((n=>{this.Za.has(n)||t.push(new sp(n))})),this.Za.forEach((n=>{e.has(n)||t.push(new ip(n))})),t}uu(e){this.Ha=e.qs,this.Za=G();const t=this.nu(e.documents);return this.applyChanges(t,!0)}cu(){return fr.fromInitialDocuments(this.query,this.eu,this.mutatedKeys,this.Ya===0,this.hasCachedResults)}}const Vc="SyncEngine";class rv{constructor(e,t,n){this.query=e,this.targetId=t,this.view=n}}class iv{constructor(e){this.key=e,this.lu=!1}}class sv{constructor(e,t,n,i,s,o){this.localStore=e,this.remoteStore=t,this.eventManager=n,this.sharedClientState=i,this.currentUser=s,this.maxConcurrentLimboResolutions=o,this.hu={},this.Pu=new Et((c=>rf(c)),ho),this.Tu=new Map,this.Iu=new Set,this.du=new ue(O.comparator),this.Eu=new Map,this.Au=new pc,this.Ru={},this.Vu=new Map,this.mu=Tn.ur(),this.onlineState="Unknown",this.fu=void 0}get isPrimaryClient(){return this.fu===!0}}async function ov(r,e,t=!0){const n=hp(r);let i;const s=n.Pu.get(e);return s?(n.sharedClientState.addLocalQueryTarget(s.targetId),i=s.view.cu()):i=await op(n,e,t,!0),i}async function av(r,e){const t=hp(r);await op(t,e,!0,!1)}async function op(r,e,t,n){const i=await PI(r.localStore,ze(e)),s=i.targetId,o=r.sharedClientState.addLocalQueryTarget(s,t);let c;return n&&(c=await cv(r,e,s,o==="current",i.resumeToken)),r.isPrimaryClient&&t&&Yf(r.remoteStore,i),c}async function cv(r,e,t,n,i){r.gu=(m,g,b)=>(async function(N,D,$,B){let F=D.view.nu($);F.Ds&&(F=await dh(N.localStore,D.query,!1).then((({documents:v})=>D.view.nu(v,F))));const W=B&&B.targetChanges.get(D.targetId),Z=B&&B.targetMismatches.get(D.targetId)!=null,K=D.view.applyChanges(F,N.isPrimaryClient,W,Z);return Th(N,D.targetId,K._u),K.snapshot})(r,m,g,b);const s=await dh(r.localStore,e,!0),o=new nv(e,s.qs),c=o.nu(s.documents),u=Ni.createSynthesizedTargetChangeForCurrentChange(t,n&&r.onlineState!=="Offline",i),h=o.applyChanges(c,r.isPrimaryClient,u);Th(r,t,h._u);const f=new rv(e,t,o);return r.Pu.set(e,f),r.Tu.has(t)?r.Tu.get(t).push(e):r.Tu.set(t,[e]),h.snapshot}async function uv(r,e,t){const n=z(r),i=n.Pu.get(e),s=n.Tu.get(i.targetId);if(s.length>1)return n.Tu.set(i.targetId,s.filter((o=>!ho(o,e)))),void n.Pu.delete(e);n.isPrimaryClient?(n.sharedClientState.removeLocalQueryTarget(i.targetId),n.sharedClientState.isActiveQueryTarget(i.targetId)||await xa(n.localStore,i.targetId,!1).then((()=>{n.sharedClientState.clearQueryState(i.targetId),t&&vc(n.remoteStore,i.targetId),La(n,i.targetId)})).catch(Pn)):(La(n,i.targetId),await xa(n.localStore,i.targetId,!0))}async function lv(r,e){const t=z(r),n=t.Pu.get(e),i=t.Tu.get(n.targetId);t.isPrimaryClient&&i.length===1&&(t.sharedClientState.removeLocalQueryTarget(n.targetId),vc(t.remoteStore,n.targetId))}async function hv(r,e,t){const n=dp(r);try{const i=await(function(o,c){const u=z(o),h=ee.now(),f=c.reduce(((b,C)=>b.add(C.key)),G());let m,g;return u.persistence.runTransaction("Locally write mutations","readwrite",(b=>{let C=Ue(),N=G();return u.Os.getEntries(b,f).next((D=>{C=D,C.forEach((($,B)=>{B.isValidDocument()||(N=N.add($))}))})).next((()=>u.localDocuments.getOverlayedDocuments(b,C))).next((D=>{m=D;const $=[];for(const B of c){const F=Py(B,m.get(B.key).overlayedDocument);F!=null&&$.push(new Tt(B.key,F,Hd(F.value.mapValue),ce.exists(!0)))}return u.mutationQueue.addMutationBatch(b,h,$,c)})).next((D=>{g=D;const $=D.applyToLocalDocumentSet(m,N);return u.documentOverlayCache.saveOverlays(b,D.batchId,$)}))})).then((()=>({batchId:g.batchId,changes:af(m)})))})(n.localStore,e);n.sharedClientState.addPendingMutation(i.batchId),(function(o,c,u){let h=o.Ru[o.currentUser.toKey()];h||(h=new ue(q)),h=h.insert(c,u),o.Ru[o.currentUser.toKey()]=h})(n,i.batchId,t),await Mi(n,i.changes),await Oi(n.remoteStore)}catch(i){const s=Rc(i,"Failed to persist write");t.reject(s)}}async function ap(r,e){const t=z(r);try{const n=await AI(t.localStore,e);e.targetChanges.forEach(((i,s)=>{const o=t.Eu.get(s);o&&(L(i.addedDocuments.size+i.modifiedDocuments.size+i.removedDocuments.size<=1,22616),i.addedDocuments.size>0?o.lu=!0:i.modifiedDocuments.size>0?L(o.lu,14607):i.removedDocuments.size>0&&(L(o.lu,42227),o.lu=!1))})),await Mi(t,n,e)}catch(n){await Pn(n)}}function Eh(r,e,t){const n=z(r);if(n.isPrimaryClient&&t===0||!n.isPrimaryClient&&t===1){const i=[];n.Pu.forEach(((s,o)=>{const c=o.view.va(e);c.snapshot&&i.push(c.snapshot)})),(function(o,c){const u=z(o);u.onlineState=c;let h=!1;u.queries.forEach(((f,m)=>{for(const g of m.wa)g.va(c)&&(h=!0)})),h&&Sc(u)})(n.eventManager,e),i.length&&n.hu.J_(i),n.onlineState=e,n.isPrimaryClient&&n.sharedClientState.setOnlineState(e)}}async function dv(r,e,t){const n=z(r);n.sharedClientState.updateQueryState(e,"rejected",t);const i=n.Eu.get(e),s=i&&i.key;if(s){let o=new ue(O.comparator);o=o.insert(s,ae.newNoDocument(s,U.min()));const c=G().add(s),u=new mo(U.min(),new Map,new ue(q),o,c);await ap(n,u),n.du=n.du.remove(s),n.Eu.delete(e),Dc(n)}else await xa(n.localStore,e,!1).then((()=>La(n,e,t))).catch(Pn)}async function fv(r,e){const t=z(r),n=e.batch.batchId;try{const i=await wI(t.localStore,e);up(t,n,null),cp(t,n),t.sharedClientState.updateMutationState(n,"acknowledged"),await Mi(t,i)}catch(i){await Pn(i)}}async function pv(r,e,t){const n=z(r);try{const i=await(function(o,c){const u=z(o);return u.persistence.runTransaction("Reject batch","readwrite-primary",(h=>{let f;return u.mutationQueue.lookupMutationBatch(h,c).next((m=>(L(m!==null,37113),f=m.keys(),u.mutationQueue.removeMutationBatch(h,m)))).next((()=>u.mutationQueue.performConsistencyCheck(h))).next((()=>u.documentOverlayCache.removeOverlaysForBatchId(h,f,c))).next((()=>u.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(h,f))).next((()=>u.localDocuments.getDocuments(h,f)))}))})(n.localStore,e);up(n,e,t),cp(n,e),n.sharedClientState.updateMutationState(e,"rejected",t),await Mi(n,i)}catch(i){await Pn(i)}}function cp(r,e){(r.Vu.get(e)||[]).forEach((t=>{t.resolve()})),r.Vu.delete(e)}function up(r,e,t){const n=z(r);let i=n.Ru[n.currentUser.toKey()];if(i){const s=i.get(e);s&&(t?s.reject(t):s.resolve(),i=i.remove(e)),n.Ru[n.currentUser.toKey()]=i}}function La(r,e,t=null){r.sharedClientState.removeLocalQueryTarget(e);for(const n of r.Tu.get(e))r.Pu.delete(n),t&&r.hu.pu(n,t);r.Tu.delete(e),r.isPrimaryClient&&r.Au.zr(e).forEach((n=>{r.Au.containsKey(n)||lp(r,n)}))}function lp(r,e){r.Iu.delete(e.path.canonicalString());const t=r.du.get(e);t!==null&&(vc(r.remoteStore,t),r.du=r.du.remove(e),r.Eu.delete(t),Dc(r))}function Th(r,e,t){for(const n of t)n instanceof ip?(r.Au.addReference(n.key,e),mv(r,n)):n instanceof sp?(V(Vc,"Document no longer in limbo: "+n.key),r.Au.removeReference(n.key,e),r.Au.containsKey(n.key)||lp(r,n.key)):M(19791,{yu:n})}function mv(r,e){const t=e.key,n=t.path.canonicalString();r.du.get(t)||r.Iu.has(n)||(V(Vc,"New document in limbo: "+t),r.Iu.add(n),Dc(r))}function Dc(r){for(;r.Iu.size>0&&r.du.size<r.maxConcurrentLimboResolutions;){const e=r.Iu.values().next().value;r.Iu.delete(e);const t=new O(J.fromString(e)),n=r.mu.next();r.Eu.set(n,new iv(t)),r.du=r.du.insert(t,n),Yf(r.remoteStore,new lt(ze(Vi(t.path)),n,"TargetPurposeLimboResolution",qe.ue))}}async function Mi(r,e,t){const n=z(r),i=[],s=[],o=[];n.Pu.isEmpty()||(n.Pu.forEach(((c,u)=>{o.push(n.gu(u,e,t).then((h=>{var f;if((h||t)&&n.isPrimaryClient){const m=h?!h.fromCache:(f=t==null?void 0:t.targetChanges.get(u.targetId))===null||f===void 0?void 0:f.current;n.sharedClientState.updateQueryState(u.targetId,m?"current":"not-current")}if(h){i.push(h);const m=_c.Es(u.targetId,h);s.push(m)}})))})),await Promise.all(o),n.hu.J_(i),await(async function(u,h){const f=z(u);try{await f.persistence.runTransaction("notifyLocalViewChanges","readwrite",(m=>w.forEach(h,(g=>w.forEach(g.Is,(b=>f.persistence.referenceDelegate.addReference(m,g.targetId,b))).next((()=>w.forEach(g.ds,(b=>f.persistence.referenceDelegate.removeReference(m,g.targetId,b)))))))))}catch(m){if(!Ht(m))throw m;V(yc,"Failed to update sequence numbers: "+m)}for(const m of h){const g=m.targetId;if(!m.fromCache){const b=f.Fs.get(g),C=b.snapshotVersion,N=b.withLastLimboFreeSnapshotVersion(C);f.Fs=f.Fs.insert(g,N)}}})(n.localStore,s))}async function gv(r,e){const t=z(r);if(!t.currentUser.isEqual(e)){V(Vc,"User change. New user:",e.toKey());const n=await Hf(t.localStore,e);t.currentUser=e,(function(s,o){s.Vu.forEach((c=>{c.forEach((u=>{u.reject(new k(S.CANCELLED,o))}))})),s.Vu.clear()})(t,"'waitForPendingWrites' promise is rejected due to a user change."),t.sharedClientState.handleUserChange(e,n.removedBatchIds,n.addedBatchIds),await Mi(t,n.Bs)}}function _v(r,e){const t=z(r),n=t.Eu.get(e);if(n&&n.lu)return G().add(n.key);{let i=G();const s=t.Tu.get(e);if(!s)return i;for(const o of s){const c=t.Pu.get(o);i=i.unionWith(c.view.tu)}return i}}function hp(r){const e=z(r);return e.remoteStore.remoteSyncer.applyRemoteEvent=ap.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=_v.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=dv.bind(null,e),e.hu.J_=ev.bind(null,e.eventManager),e.hu.pu=tv.bind(null,e.eventManager),e}function dp(r){const e=z(r);return e.remoteStore.remoteSyncer.applySuccessfulWrite=fv.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=pv.bind(null,e),e}class Ti{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=Io(e.databaseInfo.databaseId),this.sharedClientState=this.bu(e),this.persistence=this.Du(e),await this.persistence.start(),this.localStore=this.vu(e),this.gcScheduler=this.Cu(e,this.localStore),this.indexBackfillerScheduler=this.Fu(e,this.localStore)}Cu(e,t){return null}Fu(e,t){return null}vu(e){return Wf(this.persistence,new Kf,e.initialUser,this.serializer)}Du(e){return new mc(yo.Vi,this.serializer)}bu(e){return new Xf}async terminate(){var e,t;(e=this.gcScheduler)===null||e===void 0||e.stop(),(t=this.indexBackfillerScheduler)===null||t===void 0||t.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}Ti.provider={build:()=>new Ti};class yv extends Ti{constructor(e){super(),this.cacheSizeBytes=e}Cu(e,t){L(this.persistence.referenceDelegate instanceof Gs,46915);const n=this.persistence.referenceDelegate.garbageCollector;return new jf(n,e.asyncQueue,t)}Du(e){const t=this.cacheSizeBytes!==void 0?Ve.withCacheSize(this.cacheSizeBytes):Ve.DEFAULT;return new mc((n=>Gs.Vi(n,t)),this.serializer)}}class Iv extends Ti{constructor(e,t,n){super(),this.Mu=e,this.cacheSizeBytes=t,this.forceOwnership=n,this.kind="persistent",this.synchronizeTabs=!1}async initialize(e){await super.initialize(e),await this.Mu.initialize(this,e),await dp(this.Mu.syncEngine),await Oi(this.Mu.remoteStore),await this.persistence.ji((()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve())))}vu(e){return Wf(this.persistence,new Kf,e.initialUser,this.serializer)}Cu(e,t){const n=this.persistence.referenceDelegate.garbageCollector;return new jf(n,e.asyncQueue,t)}Fu(e,t){const n=new P_(t,this.persistence);return new b_(e.asyncQueue,n)}Du(e){const t=II(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey),n=this.cacheSizeBytes!==void 0?Ve.withCacheSize(this.cacheSizeBytes):Ve.DEFAULT;return new gc(this.synchronizeTabs,t,e.clientId,n,e.asyncQueue,xI(),bs(),this.serializer,this.sharedClientState,!!this.forceOwnership)}bu(e){return new Xf}}class Ws{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=n=>Eh(this.syncEngine,n,1),this.remoteStore.remoteSyncer.handleCredentialChange=gv.bind(null,this.syncEngine),await JI(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return(function(){return new ZI})()}createDatastore(e){const t=Io(e.databaseInfo.databaseId),n=(function(s){return new NI(s)})(e.databaseInfo);return(function(s,o,c,u){return new FI(s,o,c,u)})(e.authCredentials,e.appCheckCredentials,n,t)}createRemoteStore(e){return(function(n,i,s,o,c){return new BI(n,i,s,o,c)})(this.localStore,this.datastore,e.asyncQueue,(t=>Eh(this.syncEngine,t,0)),(function(){return mh.C()?new mh:new CI})())}createSyncEngine(e,t){return(function(i,s,o,c,u,h,f){const m=new sv(i,s,o,c,u,h);return f&&(m.fu=!0),m})(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){var e,t;await(async function(i){const s=z(i);V(wn,"RemoteStore shutting down."),s.Ia.add(5),await xi(s),s.Ea.shutdown(),s.Aa.set("Unknown")})(this.remoteStore),(e=this.datastore)===null||e===void 0||e.terminate(),(t=this.eventManager)===null||t===void 0||t.terminate()}}Ws.provider={build:()=>new Ws};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kc{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.xu(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.xu(this.observer.error,e):xe("Uncaught Error in snapshot listener:",e.toString()))}Ou(){this.muted=!0}xu(e,t){setTimeout((()=>{this.muted||e(t)}),0)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vv{constructor(e){this.datastore=e,this.readVersions=new Map,this.mutations=[],this.committed=!1,this.lastTransactionError=null,this.writtenDocs=new Set}async lookup(e){if(this.ensureCommitNotCalled(),this.mutations.length>0)throw this.lastTransactionError=new k(S.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes."),this.lastTransactionError;const t=await(async function(i,s){const o=z(i),c={documents:s.map((m=>vi(o.serializer,m)))},u=await o.Jo("BatchGetDocuments",o.serializer.databaseId,J.emptyPath(),c,s.length),h=new Map;u.forEach((m=>{const g=Ly(o.serializer,m);h.set(g.key.toString(),g)}));const f=[];return s.forEach((m=>{const g=h.get(m.toString());L(!!g,55234,{key:m}),f.push(g)})),f})(this.datastore,e);return t.forEach((n=>this.recordVersion(n))),t}set(e,t){this.write(t.toMutation(e,this.precondition(e))),this.writtenDocs.add(e.toString())}update(e,t){try{this.write(t.toMutation(e,this.preconditionForUpdate(e)))}catch(n){this.lastTransactionError=n}this.writtenDocs.add(e.toString())}delete(e){this.write(new yr(e,this.precondition(e))),this.writtenDocs.add(e.toString())}async commit(){if(this.ensureCommitNotCalled(),this.lastTransactionError)throw this.lastTransactionError;const e=this.readVersions;this.mutations.forEach((t=>{e.delete(t.key.toString())})),e.forEach(((t,n)=>{const i=O.fromPath(n);this.mutations.push(new oc(i,this.precondition(i)))})),await(async function(n,i){const s=z(n),o={writes:i.map((c=>Ei(s.serializer,c)))};await s.Wo("Commit",s.serializer.databaseId,J.emptyPath(),o)})(this.datastore,this.mutations),this.committed=!0}recordVersion(e){let t;if(e.isFoundDocument())t=e.version;else{if(!e.isNoDocument())throw M(50498,{Wu:e.constructor.name});t=U.min()}const n=this.readVersions.get(e.key.toString());if(n){if(!t.isEqual(n))throw new k(S.ABORTED,"Document version changed between two reads.")}else this.readVersions.set(e.key.toString(),t)}precondition(e){const t=this.readVersions.get(e.toString());return!this.writtenDocs.has(e.toString())&&t?t.isEqual(U.min())?ce.exists(!1):ce.updateTime(t):ce.none()}preconditionForUpdate(e){const t=this.readVersions.get(e.toString());if(!this.writtenDocs.has(e.toString())&&t){if(t.isEqual(U.min()))throw new k(S.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");return ce.updateTime(t)}return ce.exists(!0)}write(e){this.ensureCommitNotCalled(),this.mutations.push(e)}ensureCommitNotCalled(){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ev{constructor(e,t,n,i,s){this.asyncQueue=e,this.datastore=t,this.options=n,this.updateFunction=i,this.deferred=s,this.Gu=n.maxAttempts,this.F_=new Ic(this.asyncQueue,"transaction_retry")}zu(){this.Gu-=1,this.ju()}ju(){this.F_.g_((async()=>{const e=new vv(this.datastore),t=this.Ju(e);t&&t.then((n=>{this.asyncQueue.enqueueAndForget((()=>e.commit().then((()=>{this.deferred.resolve(n)})).catch((i=>{this.Hu(i)}))))})).catch((n=>{this.Hu(n)}))}))}Ju(e){try{const t=this.updateFunction(e);return!Pi(t)&&t.catch&&t.then?t:(this.deferred.reject(Error("Transaction callback must return a Promise")),null)}catch(t){return this.deferred.reject(t),null}}Hu(e){this.Gu>0&&this.Yu(e)?(this.Gu-=1,this.asyncQueue.enqueueAndForget((()=>(this.ju(),Promise.resolve())))):this.deferred.reject(e)}Yu(e){if(e.name==="FirebaseError"){const t=e.code;return t==="aborted"||t==="failed-precondition"||t==="already-exists"||!_f(t)}return!1}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Wt="FirestoreClient";class Tv{constructor(e,t,n,i,s){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=n,this.databaseInfo=i,this.user=Te.UNAUTHENTICATED,this.clientId=Wa.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=s,this.authCredentials.start(n,(async o=>{V(Wt,"Received user=",o.uid),await this.authCredentialListener(o),this.user=o})),this.appCheckCredentials.start(n,(o=>(V(Wt,"Received new app check token=",o),this.appCheckCredentialListener(o,this.user))))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new He;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted((async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const n=Rc(t,"Failed to shutdown persistence");e.reject(n)}})),e.promise}}async function ca(r,e){r.asyncQueue.verifyOperationInProgress(),V(Wt,"Initializing OfflineComponentProvider");const t=r.configuration;await e.initialize(t);let n=t.initialUser;r.setCredentialChangeListener((async i=>{n.isEqual(i)||(await Hf(e.localStore,i),n=i)})),e.persistence.setDatabaseDeletedListener((()=>{rt("Terminating Firestore due to IndexedDb database deletion"),r.terminate().then((()=>{V("Terminating Firestore due to IndexedDb database deletion completed successfully")})).catch((i=>{rt("Terminating Firestore due to IndexedDb database deletion failed",i)}))})),r._offlineComponents=e}async function wh(r,e){r.asyncQueue.verifyOperationInProgress();const t=await wv(r);V(Wt,"Initializing OnlineComponentProvider"),await e.initialize(t,r.configuration),r.setCredentialChangeListener((n=>_h(e.remoteStore,n))),r.setAppCheckTokenChangeListener(((n,i)=>_h(e.remoteStore,i))),r._onlineComponents=e}async function wv(r){if(!r._offlineComponents)if(r._uninitializedComponentsProvider){V(Wt,"Using user provided OfflineComponentProvider");try{await ca(r,r._uninitializedComponentsProvider._offline)}catch(e){const t=e;if(!(function(i){return i.name==="FirebaseError"?i.code===S.FAILED_PRECONDITION||i.code===S.UNIMPLEMENTED:!(typeof DOMException<"u"&&i instanceof DOMException)||i.code===22||i.code===20||i.code===11})(t))throw t;rt("Error using user provided cache. Falling back to memory cache: "+t),await ca(r,new Ti)}}else V(Wt,"Using default OfflineComponentProvider"),await ca(r,new yv(void 0));return r._offlineComponents}async function Nc(r){return r._onlineComponents||(r._uninitializedComponentsProvider?(V(Wt,"Using user provided OnlineComponentProvider"),await wh(r,r._uninitializedComponentsProvider._online)):(V(Wt,"Using default OnlineComponentProvider"),await wh(r,new Ws))),r._onlineComponents}function Av(r){return Nc(r).then((e=>e.syncEngine))}function Rv(r){return Nc(r).then((e=>e.datastore))}async function Hs(r){const e=await Nc(r),t=e.eventManager;return t.onListen=ov.bind(null,e.syncEngine),t.onUnlisten=uv.bind(null,e.syncEngine),t.onFirstRemoteStoreListen=av.bind(null,e.syncEngine),t.onLastRemoteStoreUnlisten=lv.bind(null,e.syncEngine),t}function bv(r,e,t={}){const n=new He;return r.asyncQueue.enqueueAndForget((async()=>(function(s,o,c,u,h){const f=new kc({next:g=>{f.Ou(),o.enqueueAndForget((()=>Pc(s,m)));const b=g.docs.has(c);!b&&g.fromCache?h.reject(new k(S.UNAVAILABLE,"Failed to get document because the client is offline.")):b&&g.fromCache&&u&&u.source==="server"?h.reject(new k(S.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):h.resolve(g)},error:g=>h.reject(g)}),m=new Cc(Vi(c.path),f,{includeMetadataChanges:!0,ka:!0});return bc(s,m)})(await Hs(r),r.asyncQueue,e,t,n))),n.promise}function Pv(r,e,t={}){const n=new He;return r.asyncQueue.enqueueAndForget((async()=>(function(s,o,c,u,h){const f=new kc({next:g=>{f.Ou(),o.enqueueAndForget((()=>Pc(s,m))),g.fromCache&&u.source==="server"?h.reject(new k(S.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):h.resolve(g)},error:g=>h.reject(g)}),m=new Cc(c,f,{includeMetadataChanges:!0,ka:!0});return bc(s,m)})(await Hs(r),r.asyncQueue,e,t,n))),n.promise}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function fp(r){const e={};return r.timeoutSeconds!==void 0&&(e.timeoutSeconds=r.timeoutSeconds),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ah=new Map;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pp="firestore.googleapis.com",Rh=!0;class bh{constructor(e){var t,n;if(e.host===void 0){if(e.ssl!==void 0)throw new k(S.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=pp,this.ssl=Rh}else this.host=e.host,this.ssl=(t=e.ssl)!==null&&t!==void 0?t:Rh;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=Lf;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<nI)throw new k(S.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}E_("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=fp((n=e.experimentalLongPollingOptions)!==null&&n!==void 0?n:{}),(function(s){if(s.timeoutSeconds!==void 0){if(isNaN(s.timeoutSeconds))throw new k(S.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (must not be NaN)`);if(s.timeoutSeconds<5)throw new k(S.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (minimum allowed value is 5)`);if(s.timeoutSeconds>30)throw new k(S.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (maximum allowed value is 30)`)}})(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&(function(n,i){return n.timeoutSeconds===i.timeoutSeconds})(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class Li{constructor(e,t,n,i){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=n,this._app=i,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new bh({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new k(S.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new k(S.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new bh(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=(function(n){if(!n)return new d_;switch(n.type){case"firstParty":return new g_(n.sessionIndex||"0",n.iamToken||null,n.authTokenFactory||null);case"provider":return n.client;default:throw new k(S.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}})(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return(function(t){const n=Ah.get(t);n&&(V("ComponentProvider","Removing Datastore"),Ah.delete(t),n.terminate())})(this),Promise.resolve()}}function Sv(r,e,t,n={}){var i;r=Ie(r,Li);const s=pr(e),o=r._getSettings(),c=Object.assign(Object.assign({},o),{emulatorOptions:r._getEmulatorOptions()}),u=`${e}:${t}`;s&&(sd(`https://${u}`),od("Firestore",!0)),o.host!==pp&&o.host!==u&&rt("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const h=Object.assign(Object.assign({},o),{host:u,ssl:s,emulatorOptions:n});if(!mt(h,c)&&(r._setSettings(h),n.mockUserToken)){let f,m;if(typeof n.mockUserToken=="string")f=n.mockUserToken,m=Te.MOCK_USER;else{f=Ym(n.mockUserToken,(i=r._app)===null||i===void 0?void 0:i.options.projectId);const g=n.mockUserToken.sub||n.mockUserToken.user_id;if(!g)throw new k(S.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");m=new Te(g)}r._authCredentials=new f_(new Ed(f,m))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class st{constructor(e,t,n){this.converter=t,this._query=n,this.type="query",this.firestore=e}withConverter(e){return new st(this.firestore,e,this._query)}}class he{constructor(e,t,n){this.converter=t,this._key=n,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new qt(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new he(this.firestore,e,this._key)}toJSON(){return{type:he._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,t,n){if(bi(t,he._jsonSchema))return new he(e,n||null,new O(J.fromString(t.referencePath)))}}he._jsonSchemaVersion="firestore/documentReference/1.0",he._jsonSchema={type:pe("string",he._jsonSchemaVersion),referencePath:pe("string")};class qt extends st{constructor(e,t,n){super(e,t,Vi(n)),this._path=n,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new he(this.firestore,null,new O(e))}withConverter(e){return new qt(this.firestore,e,this._path)}}function sw(r,e,...t){if(r=se(r),Ha("collection","path",e),r instanceof Li){const n=J.fromString(e,...t);return gl(n),new qt(r,null,n)}{if(!(r instanceof he||r instanceof qt))throw new k(S.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(J.fromString(e,...t));return gl(n),new qt(r.firestore,null,n)}}function ow(r,e){if(r=Ie(r,Li),Ha("collectionGroup","collection id",e),e.indexOf("/")>=0)throw new k(S.INVALID_ARGUMENT,`Invalid collection ID '${e}' passed to function collectionGroup(). Collection IDs must not contain '/'.`);return new st(r,null,(function(n){return new Sn(J.emptyPath(),n)})(e))}function Cv(r,e,...t){if(r=se(r),arguments.length===1&&(e=Wa.newId()),Ha("doc","path",e),r instanceof Li){const n=J.fromString(e,...t);return ml(n),new he(r,null,new O(n))}{if(!(r instanceof he||r instanceof qt))throw new k(S.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(J.fromString(e,...t));return ml(n),new he(r.firestore,r instanceof qt?r.converter:null,new O(n))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ph="AsyncQueue";class Sh{constructor(e=Promise.resolve()){this.Zu=[],this.Xu=!1,this.ec=[],this.tc=null,this.nc=!1,this.rc=!1,this.sc=[],this.F_=new Ic(this,"async_queue_retry"),this.oc=()=>{const n=bs();n&&V(Ph,"Visibility state changed to "+n.visibilityState),this.F_.y_()},this._c=e;const t=bs();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this.oc)}get isShuttingDown(){return this.Xu}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.ac(),this.uc(e)}enterRestrictedMode(e){if(!this.Xu){this.Xu=!0,this.rc=e||!1;const t=bs();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this.oc)}}enqueue(e){if(this.ac(),this.Xu)return new Promise((()=>{}));const t=new He;return this.uc((()=>this.Xu&&this.rc?Promise.resolve():(e().then(t.resolve,t.reject),t.promise))).then((()=>t.promise))}enqueueRetryable(e){this.enqueueAndForget((()=>(this.Zu.push(e),this.cc())))}async cc(){if(this.Zu.length!==0){try{await this.Zu[0](),this.Zu.shift(),this.F_.reset()}catch(e){if(!Ht(e))throw e;V(Ph,"Operation failed with retryable error: "+e)}this.Zu.length>0&&this.F_.g_((()=>this.cc()))}}uc(e){const t=this._c.then((()=>(this.nc=!0,e().catch((n=>{throw this.tc=n,this.nc=!1,xe("INTERNAL UNHANDLED ERROR: ",Ch(n)),n})).then((n=>(this.nc=!1,n))))));return this._c=t,t}enqueueAfterDelay(e,t,n){this.ac(),this.sc.indexOf(e)>-1&&(t=0);const i=Ac.createAndSchedule(this,e,t,n,(s=>this.lc(s)));return this.ec.push(i),i}ac(){this.tc&&M(47125,{hc:Ch(this.tc)})}verifyOperationInProgress(){}async Pc(){let e;do e=this._c,await e;while(e!==this._c)}Tc(e){for(const t of this.ec)if(t.timerId===e)return!0;return!1}Ic(e){return this.Pc().then((()=>{this.ec.sort(((t,n)=>t.targetTimeMs-n.targetTimeMs));for(const t of this.ec)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.Pc()}))}dc(e){this.sc.push(e)}lc(e){const t=this.ec.indexOf(e);this.ec.splice(t,1)}}function Ch(r){let e=r.message||"";return r.stack&&(e=r.stack.includes(r.message)?r.stack:r.message+`
`+r.stack),e}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Vh(r){return(function(t,n){if(typeof t!="object"||t===null)return!1;const i=t;for(const s of n)if(s in i&&typeof i[s]=="function")return!0;return!1})(r,["next","error","complete"])}class $e extends Li{constructor(e,t,n,i){super(e,t,n,i),this.type="firestore",this._queue=new Sh,this._persistenceKey=(i==null?void 0:i.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new Sh(e),this._firestoreClient=void 0,await e}}}function aw(r,e){const t=typeof r=="object"?r:hd(),n=typeof r=="string"?r:Fs,i=Ga(t,"firestore").getImmediate({identifier:n});if(!i._initialized){const s=Xm("firestore");s&&Sv(i,...s)}return i}function vr(r){if(r._terminated)throw new k(S.FAILED_PRECONDITION,"The client has already been terminated.");return r._firestoreClient||mp(r),r._firestoreClient}function mp(r){var e,t,n;const i=r._freezeSettings(),s=(function(c,u,h,f){return new ny(c,u,h,f.host,f.ssl,f.experimentalForceLongPolling,f.experimentalAutoDetectLongPolling,fp(f.experimentalLongPollingOptions),f.useFetchStreams,f.isUsingEmulator)})(r._databaseId,((e=r._app)===null||e===void 0?void 0:e.options.appId)||"",r._persistenceKey,i);r._componentsProvider||!((t=i.localCache)===null||t===void 0)&&t._offlineComponentProvider&&(!((n=i.localCache)===null||n===void 0)&&n._onlineComponentProvider)&&(r._componentsProvider={_offline:i.localCache._offlineComponentProvider,_online:i.localCache._onlineComponentProvider}),r._firestoreClient=new Tv(r._authCredentials,r._appCheckCredentials,r._queue,s,r._componentsProvider&&(function(c){const u=c==null?void 0:c._online.build();return{_offline:c==null?void 0:c._offline.build(u),_online:u}})(r._componentsProvider))}function cw(r,e){rt("enableIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead.");const t=r._freezeSettings();return Vv(r,Ws.provider,{build:n=>new Iv(n,t.cacheSizeBytes,void 0)}),Promise.resolve()}function Vv(r,e,t){if((r=Ie(r,$e))._firestoreClient||r._terminated)throw new k(S.FAILED_PRECONDITION,"Firestore has already been started and persistence can no longer be enabled. You can only enable persistence before calling any other methods on a Firestore object.");if(r._componentsProvider||r._getSettings().localCache)throw new k(S.FAILED_PRECONDITION,"SDK cache is already specified.");r._componentsProvider={_online:e,_offline:t},mp(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fe{constructor(e){this._byteString=e}static fromBase64String(e){try{return new Fe(me.fromBase64String(e))}catch(t){throw new k(S.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new Fe(me.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:Fe._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(bi(e,Fe._jsonSchema))return Fe.fromBase64String(e.bytes)}}Fe._jsonSchemaVersion="firestore/bytes/1.0",Fe._jsonSchema={type:pe("string",Fe._jsonSchemaVersion),bytes:pe("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Er{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new k(S.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new le(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vn{constructor(e){this._methodName=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ze{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new k(S.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new k(S.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return q(this._lat,e._lat)||q(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:Ze._jsonSchemaVersion}}static fromJSON(e){if(bi(e,Ze._jsonSchema))return new Ze(e.latitude,e.longitude)}}Ze._jsonSchemaVersion="firestore/geoPoint/1.0",Ze._jsonSchema={type:pe("string",Ze._jsonSchemaVersion),latitude:pe("number"),longitude:pe("number")};/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class et{constructor(e){this._values=(e||[]).map((t=>t))}toArray(){return this._values.map((e=>e))}isEqual(e){return(function(n,i){if(n.length!==i.length)return!1;for(let s=0;s<n.length;++s)if(n[s]!==i[s])return!1;return!0})(this._values,e._values)}toJSON(){return{type:et._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(bi(e,et._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every((t=>typeof t=="number")))return new et(e.vectorValues);throw new k(S.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}et._jsonSchemaVersion="firestore/vectorValue/1.0",et._jsonSchema={type:pe("string",et._jsonSchemaVersion),vectorValues:pe("object")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Dv=/^__.*__$/;class kv{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return this.fieldMask!==null?new Tt(e,this.data,this.fieldMask,t,this.fieldTransforms):new _r(e,this.data,t,this.fieldTransforms)}}class gp{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return new Tt(e,this.data,this.fieldMask,t,this.fieldTransforms)}}function _p(r){switch(r){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw M(40011,{Ec:r})}}class Eo{constructor(e,t,n,i,s,o){this.settings=e,this.databaseId=t,this.serializer=n,this.ignoreUndefinedProperties=i,s===void 0&&this.Ac(),this.fieldTransforms=s||[],this.fieldMask=o||[]}get path(){return this.settings.path}get Ec(){return this.settings.Ec}Rc(e){return new Eo(Object.assign(Object.assign({},this.settings),e),this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}Vc(e){var t;const n=(t=this.path)===null||t===void 0?void 0:t.child(e),i=this.Rc({path:n,mc:!1});return i.fc(e),i}gc(e){var t;const n=(t=this.path)===null||t===void 0?void 0:t.child(e),i=this.Rc({path:n,mc:!1});return i.Ac(),i}yc(e){return this.Rc({path:void 0,mc:!0})}wc(e){return Qs(e,this.settings.methodName,this.settings.Sc||!1,this.path,this.settings.bc)}contains(e){return this.fieldMask.find((t=>e.isPrefixOf(t)))!==void 0||this.fieldTransforms.find((t=>e.isPrefixOf(t.field)))!==void 0}Ac(){if(this.path)for(let e=0;e<this.path.length;e++)this.fc(this.path.get(e))}fc(e){if(e.length===0)throw this.wc("Document fields must not be empty");if(_p(this.Ec)&&Dv.test(e))throw this.wc('Document fields cannot begin and end with "__"')}}class Nv{constructor(e,t,n){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=n||Io(e)}Dc(e,t,n,i=!1){return new Eo({Ec:e,methodName:t,bc:n,path:le.emptyPath(),mc:!1,Sc:i},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function Tr(r){const e=r._freezeSettings(),t=Io(r._databaseId);return new Nv(r._databaseId,!!e.ignoreUndefinedProperties,t)}function To(r,e,t,n,i,s={}){const o=r.Dc(s.merge||s.mergeFields?2:0,e,t,i);Bc("Data must be an object, but it was:",o,n);const c=Ip(n,o);let u,h;if(s.merge)u=new Oe(o.fieldMask),h=o.fieldTransforms;else if(s.mergeFields){const f=[];for(const m of s.mergeFields){const g=Fa(e,m,t);if(!o.contains(g))throw new k(S.INVALID_ARGUMENT,`Field '${g}' is specified in your field mask but missing from your input data.`);Ep(f,g)||f.push(g)}u=new Oe(f),h=o.fieldTransforms.filter((m=>u.covers(m.field)))}else u=null,h=o.fieldTransforms;return new kv(new Ae(c),u,h)}class wo extends Vn{_toFieldTransform(e){if(e.Ec!==2)throw e.Ec===1?e.wc(`${this._methodName}() can only appear at the top level of your update data`):e.wc(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof wo}}function yp(r,e,t){return new Eo({Ec:3,bc:e.settings.bc,methodName:r._methodName,mc:t},e.databaseId,e.serializer,e.ignoreUndefinedProperties)}class xc extends Vn{_toFieldTransform(e){return new ki(e.path,new lr)}isEqual(e){return e instanceof xc}}class Oc extends Vn{constructor(e,t){super(e),this.vc=t}_toFieldTransform(e){const t=yp(this,e,!0),n=this.vc.map((s=>Dn(s,t))),i=new yn(n);return new ki(e.path,i)}isEqual(e){return e instanceof Oc&&mt(this.vc,e.vc)}}class Mc extends Vn{constructor(e,t){super(e),this.vc=t}_toFieldTransform(e){const t=yp(this,e,!0),n=this.vc.map((s=>Dn(s,t))),i=new In(n);return new ki(e.path,i)}isEqual(e){return e instanceof Mc&&mt(this.vc,e.vc)}}class Lc extends Vn{constructor(e,t){super(e),this.Cc=t}_toFieldTransform(e){const t=new hr(e.serializer,lf(e.serializer,this.Cc));return new ki(e.path,t)}isEqual(e){return e instanceof Lc&&this.Cc===e.Cc}}function Fc(r,e,t,n){const i=r.Dc(1,e,t);Bc("Data must be an object, but it was:",i,n);const s=[],o=Ae.empty();Qt(n,((u,h)=>{const f=jc(e,u,t);h=se(h);const m=i.gc(f);if(h instanceof wo)s.push(f);else{const g=Dn(h,m);g!=null&&(s.push(f),o.set(f,g))}}));const c=new Oe(s);return new gp(o,c,i.fieldTransforms)}function Uc(r,e,t,n,i,s){const o=r.Dc(1,e,t),c=[Fa(e,n,t)],u=[i];if(s.length%2!=0)throw new k(S.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let g=0;g<s.length;g+=2)c.push(Fa(e,s[g])),u.push(s[g+1]);const h=[],f=Ae.empty();for(let g=c.length-1;g>=0;--g)if(!Ep(h,c[g])){const b=c[g];let C=u[g];C=se(C);const N=o.gc(b);if(C instanceof wo)h.push(b);else{const D=Dn(C,N);D!=null&&(h.push(b),f.set(b,D))}}const m=new Oe(h);return new gp(f,m,o.fieldTransforms)}function xv(r,e,t,n=!1){return Dn(t,r.Dc(n?4:3,e))}function Dn(r,e){if(vp(r=se(r)))return Bc("Unsupported field value:",e,r),Ip(r,e);if(r instanceof Vn)return(function(n,i){if(!_p(i.Ec))throw i.wc(`${n._methodName}() can only be used with update() and set()`);if(!i.path)throw i.wc(`${n._methodName}() is not currently supported inside arrays`);const s=n._toFieldTransform(i);s&&i.fieldTransforms.push(s)})(r,e),null;if(r===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),r instanceof Array){if(e.settings.mc&&e.Ec!==4)throw e.wc("Nested arrays are not supported");return(function(n,i){const s=[];let o=0;for(const c of n){let u=Dn(c,i.yc(o));u==null&&(u={nullValue:"NULL_VALUE"}),s.push(u),o++}return{arrayValue:{values:s}}})(r,e)}return(function(n,i){if((n=se(n))===null)return{nullValue:"NULL_VALUE"};if(typeof n=="number")return lf(i.serializer,n);if(typeof n=="boolean")return{booleanValue:n};if(typeof n=="string")return{stringValue:n};if(n instanceof Date){const s=ee.fromDate(n);return{timestampValue:dr(i.serializer,s)}}if(n instanceof ee){const s=new ee(n.seconds,1e3*Math.floor(n.nanoseconds/1e3));return{timestampValue:dr(i.serializer,s)}}if(n instanceof Ze)return{geoPointValue:{latitude:n.latitude,longitude:n.longitude}};if(n instanceof Fe)return{bytesValue:Ef(i.serializer,n._byteString)};if(n instanceof he){const s=i.databaseId,o=n.firestore._databaseId;if(!o.isEqual(s))throw i.wc(`Document reference is for database ${o.projectId}/${o.database} but should be for database ${s.projectId}/${s.database}`);return{referenceValue:hc(n.firestore._databaseId||i.databaseId,n._key.path)}}if(n instanceof et)return(function(o,c){return{mapValue:{fields:{[nc]:{stringValue:rc},[or]:{arrayValue:{values:o.toArray().map((h=>{if(typeof h!="number")throw c.wc("VectorValues must only contain numeric values.");return sc(c.serializer,h)}))}}}}}})(n,i);throw i.wc(`Unsupported field value: ${io(n)}`)})(r,e)}function Ip(r,e){const t={};return Ud(r)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):Qt(r,((n,i)=>{const s=Dn(i,e.Vc(n));s!=null&&(t[n]=s)})),{mapValue:{fields:t}}}function vp(r){return!(typeof r!="object"||r===null||r instanceof Array||r instanceof Date||r instanceof ee||r instanceof Ze||r instanceof Fe||r instanceof he||r instanceof Vn||r instanceof et)}function Bc(r,e,t){if(!vp(t)||!Ad(t)){const n=io(t);throw n==="an object"?e.wc(r+" a custom object"):e.wc(r+" "+n)}}function Fa(r,e,t){if((e=se(e))instanceof Er)return e._internalPath;if(typeof e=="string")return jc(r,e);throw Qs("Field path arguments must be of type string or ",r,!1,void 0,t)}const Ov=new RegExp("[~\\*/\\[\\]]");function jc(r,e,t){if(e.search(Ov)>=0)throw Qs(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,r,!1,void 0,t);try{return new Er(...e.split("."))._internalPath}catch{throw Qs(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,r,!1,void 0,t)}}function Qs(r,e,t,n,i){const s=n&&!n.isEmpty(),o=i!==void 0;let c=`Function ${e}() called with invalid data`;t&&(c+=" (via `toFirestore()`)"),c+=". ";let u="";return(s||o)&&(u+=" (found",s&&(u+=` in field ${n}`),o&&(u+=` in document ${i}`),u+=")"),new k(S.INVALID_ARGUMENT,c+r+u)}function Ep(r,e){return r.some((t=>t.isEqual(e)))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xs{constructor(e,t,n,i,s){this._firestore=e,this._userDataWriter=t,this._key=n,this._document=i,this._converter=s}get id(){return this._key.path.lastSegment()}get ref(){return new he(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new Mv(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}get(e){if(this._document){const t=this._document.data.field(Ao("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}}class Mv extends Xs{data(){return super.data()}}function Ao(r,e){return typeof e=="string"?jc(r,e):e instanceof Er?e._internalPath:e._delegate._internalPath}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Tp(r){if(r.limitType==="L"&&r.explicitOrderBy.length===0)throw new k(S.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class qc{}class zc extends qc{}function uw(r,e,...t){let n=[];e instanceof qc&&n.push(e),n=n.concat(t),(function(s){const o=s.filter((u=>u instanceof $c)).length,c=s.filter((u=>u instanceof Ro)).length;if(o>1||o>0&&c>0)throw new k(S.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")})(n);for(const i of n)r=i._apply(r);return r}class Ro extends zc{constructor(e,t,n){super(),this._field=e,this._op=t,this._value=n,this.type="where"}static _create(e,t,n){return new Ro(e,t,n)}_apply(e){const t=this._parse(e);return wp(e._query,t),new st(e.firestore,e.converter,ba(e._query,t))}_parse(e){const t=Tr(e.firestore);return(function(s,o,c,u,h,f,m){let g;if(h.isKeyField()){if(f==="array-contains"||f==="array-contains-any")throw new k(S.INVALID_ARGUMENT,`Invalid Query. You can't perform '${f}' queries on documentId().`);if(f==="in"||f==="not-in"){kh(m,f);const C=[];for(const N of m)C.push(Dh(u,s,N));g={arrayValue:{values:C}}}else g=Dh(u,s,m)}else f!=="in"&&f!=="not-in"&&f!=="array-contains-any"||kh(m,f),g=xv(c,o,m,f==="in"||f==="not-in");return Q.create(h,f,g)})(e._query,"where",t,e.firestore._databaseId,this._field,this._op,this._value)}}function lw(r,e,t){const n=e,i=Ao("where",r);return Ro._create(i,n,t)}class $c extends qc{constructor(e,t){super(),this.type=e,this._queryConstraints=t}static _create(e,t){return new $c(e,t)}_parse(e){const t=this._queryConstraints.map((n=>n._parse(e))).filter((n=>n.getFilters().length>0));return t.length===1?t[0]:te.create(t,this._getOperator())}_apply(e){const t=this._parse(e);return t.getFilters().length===0?e:((function(i,s){let o=i;const c=s.getFlattenedFilters();for(const u of c)wp(o,u),o=ba(o,u)})(e._query,t),new st(e.firestore,e.converter,ba(e._query,t)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}class Gc extends zc{constructor(e,t){super(),this._field=e,this._direction=t,this.type="orderBy"}static _create(e,t){return new Gc(e,t)}_apply(e){const t=(function(i,s,o){if(i.startAt!==null)throw new k(S.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(i.endAt!==null)throw new k(S.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new Ii(s,o)})(e._query,this._field,this._direction);return new st(e.firestore,e.converter,(function(i,s){const o=i.explicitOrderBy.concat([s]);return new Sn(i.path,i.collectionGroup,o,i.filters.slice(),i.limit,i.limitType,i.startAt,i.endAt)})(e._query,t))}}function hw(r,e="asc"){const t=e,n=Ao("orderBy",r);return Gc._create(n,t)}class Kc extends zc{constructor(e,t,n){super(),this.type=e,this._limit=t,this._limitType=n}static _create(e,t,n){return new Kc(e,t,n)}_apply(e){return new st(e.firestore,e.converter,js(e._query,this._limit,this._limitType))}}function dw(r){return T_("limit",r),Kc._create("limit",r,"F")}function Dh(r,e,t){if(typeof(t=se(t))=="string"){if(t==="")throw new k(S.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!nf(e)&&t.indexOf("/")!==-1)throw new k(S.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${t}' contains a '/' character.`);const n=e.path.child(J.fromString(t));if(!O.isDocumentKey(n))throw new k(S.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${n}' is not because it has an odd number of segments (${n.length}).`);return _i(r,new O(n))}if(t instanceof he)return _i(r,t._key);throw new k(S.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${io(t)}.`)}function kh(r,e){if(!Array.isArray(r)||r.length===0)throw new k(S.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function wp(r,e){const t=(function(i,s){for(const o of i)for(const c of o.getFlattenedFilters())if(s.indexOf(c.op)>=0)return c.op;return null})(r.filters,(function(i){switch(i){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}})(e.op));if(t!==null)throw t===e.op?new k(S.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new k(S.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${t.toString()}' filters.`)}class Ap{convertValue(e,t="none"){switch($t(e)){case 0:return null;case 1:return e.booleanValue;case 2:return oe(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(yt(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw M(62114,{value:e})}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const n={};return Qt(e,((i,s)=>{n[i]=this.convertValue(s,t)})),n}convertVectorValue(e){var t,n,i;const s=(i=(n=(t=e.fields)===null||t===void 0?void 0:t[or].arrayValue)===null||n===void 0?void 0:n.values)===null||i===void 0?void 0:i.map((o=>oe(o.doubleValue)));return new et(s)}convertGeoPoint(e){return new Ze(oe(e.latitude),oe(e.longitude))}convertArray(e,t){return(e.values||[]).map((n=>this.convertValue(n,t)))}convertServerTimestamp(e,t){switch(t){case"previous":const n=uo(e);return n==null?null:this.convertValue(n,t);case"estimate":return this.convertTimestamp(mi(e));default:return null}}convertTimestamp(e){const t=_t(e);return new ee(t.seconds,t.nanos)}convertDocumentKey(e,t){const n=J.fromString(e);L(Df(n),9688,{name:e});const i=new gn(n.get(1),n.get(3)),s=new O(n.popFirst(5));return i.isEqual(t)||xe(`Document ${s} contains a document reference within a different database (${i.projectId}/${i.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),s}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function bo(r,e,t){let n;return n=r?t&&(t.merge||t.mergeFields)?r.toFirestore(e,t):r.toFirestore(e):e,n}class Lv extends Ap{constructor(e){super(),this.firestore=e}convertBytes(e){return new Fe(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new he(this.firestore,null,t)}}class Hn{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class zt extends Xs{constructor(e,t,n,i,s,o){super(e,t,n,i,o),this._firestore=e,this._firestoreImpl=e,this.metadata=s}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new Ps(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const n=this._document.data.field(Ao("DocumentSnapshot.get",e));if(n!==null)return this._userDataWriter.convertValue(n,t.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new k(S.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,t={};return t.type=zt._jsonSchemaVersion,t.bundle="",t.bundleSource="DocumentSnapshot",t.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?t:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),t.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),t)}}zt._jsonSchemaVersion="firestore/documentSnapshot/1.0",zt._jsonSchema={type:pe("string",zt._jsonSchemaVersion),bundleSource:pe("string","DocumentSnapshot"),bundleName:pe("string"),bundle:pe("string")};class Ps extends zt{data(e={}){return super.data(e)}}class fn{constructor(e,t,n,i){this._firestore=e,this._userDataWriter=t,this._snapshot=i,this.metadata=new Hn(i.hasPendingWrites,i.fromCache),this.query=n}get docs(){const e=[];return this.forEach((t=>e.push(t))),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,t){this._snapshot.docs.forEach((n=>{e.call(t,new Ps(this._firestore,this._userDataWriter,n.key,n,new Hn(this._snapshot.mutatedKeys.has(n.key),this._snapshot.fromCache),this.query.converter))}))}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new k(S.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=(function(i,s){if(i._snapshot.oldDocs.isEmpty()){let o=0;return i._snapshot.docChanges.map((c=>{const u=new Ps(i._firestore,i._userDataWriter,c.doc.key,c.doc,new Hn(i._snapshot.mutatedKeys.has(c.doc.key),i._snapshot.fromCache),i.query.converter);return c.doc,{type:"added",doc:u,oldIndex:-1,newIndex:o++}}))}{let o=i._snapshot.oldDocs;return i._snapshot.docChanges.filter((c=>s||c.type!==3)).map((c=>{const u=new Ps(i._firestore,i._userDataWriter,c.doc.key,c.doc,new Hn(i._snapshot.mutatedKeys.has(c.doc.key),i._snapshot.fromCache),i.query.converter);let h=-1,f=-1;return c.type!==0&&(h=o.indexOf(c.doc.key),o=o.delete(c.doc.key)),c.type!==1&&(o=o.add(c.doc),f=o.indexOf(c.doc.key)),{type:Fv(c.type),doc:u,oldIndex:h,newIndex:f}}))}})(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new k(S.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=fn._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=Wa.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const t=[],n=[],i=[];return this.docs.forEach((s=>{s._document!==null&&(t.push(s._document),n.push(this._userDataWriter.convertObjectMap(s._document.data.value.mapValue.fields,"previous")),i.push(s.ref.path))})),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}}function Fv(r){switch(r){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return M(61501,{type:r})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function fw(r){r=Ie(r,he);const e=Ie(r.firestore,$e);return bv(vr(e),r._key).then((t=>Rp(e,r,t)))}fn._jsonSchemaVersion="firestore/querySnapshot/1.0",fn._jsonSchema={type:pe("string",fn._jsonSchemaVersion),bundleSource:pe("string","QuerySnapshot"),bundleName:pe("string"),bundle:pe("string")};class Po extends Ap{constructor(e){super(),this.firestore=e}convertBytes(e){return new Fe(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new he(this.firestore,null,t)}}function pw(r){r=Ie(r,st);const e=Ie(r.firestore,$e),t=vr(e),n=new Po(e);return Tp(r._query),Pv(t,r._query).then((i=>new fn(e,n,r,i)))}function mw(r,e,t){r=Ie(r,he);const n=Ie(r.firestore,$e),i=bo(r.converter,e,t);return Fi(n,[To(Tr(n),"setDoc",r._key,i,r.converter!==null,t).toMutation(r._key,ce.none())])}function gw(r,e,t,...n){r=Ie(r,he);const i=Ie(r.firestore,$e),s=Tr(i);let o;return o=typeof(e=se(e))=="string"||e instanceof Er?Uc(s,"updateDoc",r._key,e,t,n):Fc(s,"updateDoc",r._key,e),Fi(i,[o.toMutation(r._key,ce.exists(!0))])}function _w(r){return Fi(Ie(r.firestore,$e),[new yr(r._key,ce.none())])}function yw(r,e){const t=Ie(r.firestore,$e),n=Cv(r),i=bo(r.converter,e);return Fi(t,[To(Tr(r.firestore),"addDoc",n._key,i,r.converter!==null,{}).toMutation(n._key,ce.exists(!1))]).then((()=>n))}function Iw(r,...e){var t,n,i;r=se(r);let s={includeMetadataChanges:!1,source:"default"},o=0;typeof e[o]!="object"||Vh(e[o])||(s=e[o++]);const c={includeMetadataChanges:s.includeMetadataChanges,source:s.source};if(Vh(e[o])){const m=e[o];e[o]=(t=m.next)===null||t===void 0?void 0:t.bind(m),e[o+1]=(n=m.error)===null||n===void 0?void 0:n.bind(m),e[o+2]=(i=m.complete)===null||i===void 0?void 0:i.bind(m)}let u,h,f;if(r instanceof he)h=Ie(r.firestore,$e),f=Vi(r._key.path),u={next:m=>{e[o]&&e[o](Rp(h,r,m))},error:e[o+1],complete:e[o+2]};else{const m=Ie(r,st);h=Ie(m.firestore,$e),f=m._query;const g=new Po(h);u={next:b=>{e[o]&&e[o](new fn(h,g,m,b))},error:e[o+1],complete:e[o+2]},Tp(r._query)}return(function(g,b,C,N){const D=new kc(N),$=new Cc(b,D,C);return g.asyncQueue.enqueueAndForget((async()=>bc(await Hs(g),$))),()=>{D.Ou(),g.asyncQueue.enqueueAndForget((async()=>Pc(await Hs(g),$)))}})(vr(h),f,c,u)}function Fi(r,e){return(function(n,i){const s=new He;return n.asyncQueue.enqueueAndForget((async()=>hv(await Av(n),i,s))),s.promise})(vr(r),e)}function Rp(r,e,t){const n=t.docs.get(e._key),i=new Po(r);return new zt(r,i,e._key,n,new Hn(t.hasPendingWrites,t.fromCache),e.converter)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Uv={maxAttempts:5};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bv{constructor(e,t){this._firestore=e,this._commitHandler=t,this._mutations=[],this._committed=!1,this._dataReader=Tr(e)}set(e,t,n){this._verifyNotCommitted();const i=Lt(e,this._firestore),s=bo(i.converter,t,n),o=To(this._dataReader,"WriteBatch.set",i._key,s,i.converter!==null,n);return this._mutations.push(o.toMutation(i._key,ce.none())),this}update(e,t,n,...i){this._verifyNotCommitted();const s=Lt(e,this._firestore);let o;return o=typeof(t=se(t))=="string"||t instanceof Er?Uc(this._dataReader,"WriteBatch.update",s._key,t,n,i):Fc(this._dataReader,"WriteBatch.update",s._key,t),this._mutations.push(o.toMutation(s._key,ce.exists(!0))),this}delete(e){this._verifyNotCommitted();const t=Lt(e,this._firestore);return this._mutations=this._mutations.concat(new yr(t._key,ce.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new k(S.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}}function Lt(r,e){if((r=se(r)).firestore!==e)throw new k(S.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jv{constructor(e,t){this._firestore=e,this._transaction=t,this._dataReader=Tr(e)}get(e){const t=Lt(e,this._firestore),n=new Lv(this._firestore);return this._transaction.lookup([t._key]).then((i=>{if(!i||i.length!==1)return M(24041);const s=i[0];if(s.isFoundDocument())return new Xs(this._firestore,n,s.key,s,t.converter);if(s.isNoDocument())return new Xs(this._firestore,n,t._key,null,t.converter);throw M(18433,{doc:s})}))}set(e,t,n){const i=Lt(e,this._firestore),s=bo(i.converter,t,n),o=To(this._dataReader,"Transaction.set",i._key,s,i.converter!==null,n);return this._transaction.set(i._key,o),this}update(e,t,n,...i){const s=Lt(e,this._firestore);let o;return o=typeof(t=se(t))=="string"||t instanceof Er?Uc(this._dataReader,"Transaction.update",s._key,t,n,i):Fc(this._dataReader,"Transaction.update",s._key,t),this._transaction.update(s._key,o),this}delete(e){const t=Lt(e,this._firestore);return this._transaction.delete(t._key),this}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qv extends jv{constructor(e,t){super(e,t),this._firestore=e}get(e){const t=Lt(e,this._firestore),n=new Po(this._firestore);return super.get(e).then((i=>new zt(this._firestore,n,t._key,i._document,new Hn(!1,!1),t.converter)))}}function vw(r,e,t){r=Ie(r,$e);const n=Object.assign(Object.assign({},Uv),t);return(function(s){if(s.maxAttempts<1)throw new k(S.INVALID_ARGUMENT,"Max attempts must be at least 1")})(n),(function(s,o,c){const u=new He;return s.asyncQueue.enqueueAndForget((async()=>{const h=await Rv(s);new Ev(s.asyncQueue,h,c,o,u).zu()})),u.promise})(vr(r),(i=>e(new qv(r,i))),n)}function Ew(){return new xc("serverTimestamp")}function Tw(...r){return new Oc("arrayUnion",r)}function ww(...r){return new Mc("arrayRemove",r)}function Aw(r){return new Lc("increment",r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Rw(r){return vr(r=Ie(r,$e)),new Bv(r,(e=>Fi(r,e)))}(function(e,t=!0){(function(i){gr=i})(mr),er(new pn("firestore",((n,{instanceIdentifier:i,options:s})=>{const o=n.getProvider("app").getImmediate(),c=new $e(new p_(n.getProvider("auth-internal")),new __(o,n.getProvider("app-check-internal")),(function(h,f){if(!Object.prototype.hasOwnProperty.apply(h.options,["projectId"]))throw new k(S.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new gn(h.options.projectId,f)})(o,i),o);return s=Object.assign({useFetchStreams:t},s),c._setSettings(s),c}),"PUBLIC").setMultipleInstances(!0)),Ut(ll,hl,e),Ut(ll,hl,"esm2017")})();var zv="firebase",$v="11.10.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Ut(zv,$v,"app");function bp(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const Gv=bp,Pp=new Ai("auth","Firebase",bp());/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Js=new $a("@firebase/auth");function Kv(r,...e){Js.logLevel<=H.WARN&&Js.warn(`Auth (${mr}): ${r}`,...e)}function Ss(r,...e){Js.logLevel<=H.ERROR&&Js.error(`Auth (${mr}): ${r}`,...e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Qe(r,...e){throw Wc(r,...e)}function tt(r,...e){return Wc(r,...e)}function Sp(r,e,t){const n=Object.assign(Object.assign({},Gv()),{[e]:t});return new Ai("auth","Firebase",n).create(e,{appName:r.name})}function pt(r){return Sp(r,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function Wc(r,...e){if(typeof r!="string"){const t=e[0],n=[...e.slice(1)];return n[0]&&(n[0].appName=r.name),r._errorFactory.create(t,...n)}return Pp.create(r,...e)}function j(r,e,...t){if(!r)throw Wc(e,...t)}function ht(r){const e="INTERNAL ASSERTION FAILED: "+r;throw Ss(e),new Error(e)}function It(r,e){r||ht(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ua(){var r;return typeof self<"u"&&((r=self.location)===null||r===void 0?void 0:r.href)||""}function Wv(){return Nh()==="http:"||Nh()==="https:"}function Nh(){var r;return typeof self<"u"&&((r=self.location)===null||r===void 0?void 0:r.protocol)||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Hv(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(Wv()||rg()||"connection"in navigator)?navigator.onLine:!0}function Qv(){if(typeof navigator>"u")return null;const r=navigator;return r.languages&&r.languages[0]||r.language||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ui{constructor(e,t){this.shortDelay=e,this.longDelay=t,It(t>e,"Short delay should be less than long delay!"),this.isMobile=tg()||ig()}get(){return Hv()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Hc(r,e){It(r.emulator,"Emulator should always be set here");const{url:t}=r.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cp{static initialize(e,t,n){this.fetchImpl=e,t&&(this.headersImpl=t),n&&(this.responseImpl=n)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;ht("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;ht("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;ht("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xv={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Jv=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],Yv=new Ui(3e4,6e4);function Xt(r,e){return r.tenantId&&!e.tenantId?Object.assign(Object.assign({},e),{tenantId:r.tenantId}):e}async function ot(r,e,t,n,i={}){return Vp(r,i,async()=>{let s={},o={};n&&(e==="GET"?o=n:s={body:JSON.stringify(n)});const c=Ri(Object.assign({key:r.config.apiKey},o)).slice(1),u=await r._getAdditionalHeaders();u["Content-Type"]="application/json",r.languageCode&&(u["X-Firebase-Locale"]=r.languageCode);const h=Object.assign({method:e,headers:u},s);return ng()||(h.referrerPolicy="no-referrer"),r.emulatorConfig&&pr(r.emulatorConfig.host)&&(h.credentials="include"),Cp.fetch()(await Dp(r,r.config.apiHost,t,c),h)})}async function Vp(r,e,t){r._canInitEmulator=!1;const n=Object.assign(Object.assign({},Xv),e);try{const i=new eE(r),s=await Promise.race([t(),i.promise]);i.clearNetworkTimeout();const o=await s.json();if("needConfirmation"in o)throw ms(r,"account-exists-with-different-credential",o);if(s.ok&&!("errorMessage"in o))return o;{const c=s.ok?o.errorMessage:o.error.message,[u,h]=c.split(" : ");if(u==="FEDERATED_USER_ID_ALREADY_LINKED")throw ms(r,"credential-already-in-use",o);if(u==="EMAIL_EXISTS")throw ms(r,"email-already-in-use",o);if(u==="USER_DISABLED")throw ms(r,"user-disabled",o);const f=n[u]||u.toLowerCase().replace(/[_\s]+/g,"-");if(h)throw Sp(r,f,h);Qe(r,f)}}catch(i){if(i instanceof vt)throw i;Qe(r,"network-request-failed",{message:String(i)})}}async function Bi(r,e,t,n,i={}){const s=await ot(r,e,t,n,i);return"mfaPendingCredential"in s&&Qe(r,"multi-factor-auth-required",{_serverResponse:s}),s}async function Dp(r,e,t,n){const i=`${e}${t}?${n}`,s=r,o=s.config.emulator?Hc(r.config,i):`${r.config.apiScheme}://${i}`;return Jv.includes(t)&&(await s._persistenceManagerAvailable,s._getPersistenceType()==="COOKIE")?s._getPersistence()._getFinalTarget(o).toString():o}function Zv(r){switch(r){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class eE{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,n)=>{this.timer=setTimeout(()=>n(tt(this.auth,"network-request-failed")),Yv.get())})}}function ms(r,e,t){const n={appName:r.name};t.email&&(n.email=t.email),t.phoneNumber&&(n.phoneNumber=t.phoneNumber);const i=tt(r,e,n);return i.customData._tokenResponse=t,i}function xh(r){return r!==void 0&&r.enterprise!==void 0}class tE{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(const t of this.recaptchaEnforcementState)if(t.provider&&t.provider===e)return Zv(t.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}async function nE(r,e){return ot(r,"GET","/v2/recaptchaConfig",Xt(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function rE(r,e){return ot(r,"POST","/v1/accounts:delete",e)}async function Ys(r,e){return ot(r,"POST","/v1/accounts:lookup",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ai(r){if(r)try{const e=new Date(Number(r));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function iE(r,e=!1){const t=se(r),n=await t.getIdToken(e),i=Qc(n);j(i&&i.exp&&i.auth_time&&i.iat,t.auth,"internal-error");const s=typeof i.firebase=="object"?i.firebase:void 0,o=s==null?void 0:s.sign_in_provider;return{claims:i,token:n,authTime:ai(ua(i.auth_time)),issuedAtTime:ai(ua(i.iat)),expirationTime:ai(ua(i.exp)),signInProvider:o||null,signInSecondFactor:(s==null?void 0:s.sign_in_second_factor)||null}}function ua(r){return Number(r)*1e3}function Qc(r){const[e,t,n]=r.split(".");if(e===void 0||t===void 0||n===void 0)return Ss("JWT malformed, contained fewer than 3 sections"),null;try{const i=ed(t);return i?JSON.parse(i):(Ss("Failed to decode base64 JWT payload"),null)}catch(i){return Ss("Caught error parsing JWT payload as JSON",i==null?void 0:i.toString()),null}}function Oh(r){const e=Qc(r);return j(e,"internal-error"),j(typeof e.exp<"u","internal-error"),j(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function An(r,e,t=!1){if(t)return e;try{return await e}catch(n){throw n instanceof vt&&sE(n)&&r.auth.currentUser===r&&await r.auth.signOut(),n}}function sE({code:r}){return r==="auth/user-disabled"||r==="auth/user-token-expired"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class oE{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){var t;if(e){const n=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),n}else{this.errorBackoff=3e4;const i=((t=this.user.stsTokenManager.expirationTime)!==null&&t!==void 0?t:0)-Date.now()-3e5;return Math.max(0,i)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ba{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=ai(this.lastLoginAt),this.creationTime=ai(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Zs(r){var e;const t=r.auth,n=await r.getIdToken(),i=await An(r,Ys(t,{idToken:n}));j(i==null?void 0:i.users.length,t,"internal-error");const s=i.users[0];r._notifyReloadListener(s);const o=!((e=s.providerUserInfo)===null||e===void 0)&&e.length?kp(s.providerUserInfo):[],c=cE(r.providerData,o),u=r.isAnonymous,h=!(r.email&&s.passwordHash)&&!(c!=null&&c.length),f=u?h:!1,m={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:c,metadata:new Ba(s.createdAt,s.lastLoginAt),isAnonymous:f};Object.assign(r,m)}async function aE(r){const e=se(r);await Zs(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function cE(r,e){return[...r.filter(n=>!e.some(i=>i.providerId===n.providerId)),...e]}function kp(r){return r.map(e=>{var{providerId:t}=e,n=za(e,["providerId"]);return{providerId:t,uid:n.rawId||"",displayName:n.displayName||null,email:n.email||null,phoneNumber:n.phoneNumber||null,photoURL:n.photoUrl||null}})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function uE(r,e){const t=await Vp(r,{},async()=>{const n=Ri({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:i,apiKey:s}=r.config,o=await Dp(r,i,"/v1/token",`key=${s}`),c=await r._getAdditionalHeaders();c["Content-Type"]="application/x-www-form-urlencoded";const u={method:"POST",headers:c,body:n};return r.emulatorConfig&&pr(r.emulatorConfig.host)&&(u.credentials="include"),Cp.fetch()(o,u)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function lE(r,e){return ot(r,"POST","/v2/accounts:revokeToken",Xt(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jn{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){j(e.idToken,"internal-error"),j(typeof e.idToken<"u","internal-error"),j(typeof e.refreshToken<"u","internal-error");const t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):Oh(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){j(e.length!==0,"internal-error");const t=Oh(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(j(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:n,refreshToken:i,expiresIn:s}=await uE(e,t);this.updateTokensAndExpiration(n,i,Number(s))}updateTokensAndExpiration(e,t,n){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+n*1e3}static fromJSON(e,t){const{refreshToken:n,accessToken:i,expirationTime:s}=t,o=new Jn;return n&&(j(typeof n=="string","internal-error",{appName:e}),o.refreshToken=n),i&&(j(typeof i=="string","internal-error",{appName:e}),o.accessToken=i),s&&(j(typeof s=="number","internal-error",{appName:e}),o.expirationTime=s),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new Jn,this.toJSON())}_performRefresh(){return ht("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Vt(r,e){j(typeof r=="string"||typeof r>"u","internal-error",{appName:e})}class We{constructor(e){var{uid:t,auth:n,stsTokenManager:i}=e,s=za(e,["uid","auth","stsTokenManager"]);this.providerId="firebase",this.proactiveRefresh=new oE(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=t,this.auth=n,this.stsTokenManager=i,this.accessToken=i.accessToken,this.displayName=s.displayName||null,this.email=s.email||null,this.emailVerified=s.emailVerified||!1,this.phoneNumber=s.phoneNumber||null,this.photoURL=s.photoURL||null,this.isAnonymous=s.isAnonymous||!1,this.tenantId=s.tenantId||null,this.providerData=s.providerData?[...s.providerData]:[],this.metadata=new Ba(s.createdAt||void 0,s.lastLoginAt||void 0)}async getIdToken(e){const t=await An(this,this.stsTokenManager.getToken(this.auth,e));return j(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return iE(this,e)}reload(){return aE(this)}_assign(e){this!==e&&(j(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>Object.assign({},t)),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new We(Object.assign(Object.assign({},this),{auth:e,stsTokenManager:this.stsTokenManager._clone()}));return t.metadata._copy(this.metadata),t}_onReload(e){j(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let n=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),n=!0),t&&await Zs(this),await this.auth._persistUserIfCurrent(this),n&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(je(this.auth.app))return Promise.reject(pt(this.auth));const e=await this.getIdToken();return await An(this,rE(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return Object.assign(Object.assign({uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>Object.assign({},e)),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId},this.metadata.toJSON()),{apiKey:this.auth.config.apiKey,appName:this.auth.name})}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){var n,i,s,o,c,u,h,f;const m=(n=t.displayName)!==null&&n!==void 0?n:void 0,g=(i=t.email)!==null&&i!==void 0?i:void 0,b=(s=t.phoneNumber)!==null&&s!==void 0?s:void 0,C=(o=t.photoURL)!==null&&o!==void 0?o:void 0,N=(c=t.tenantId)!==null&&c!==void 0?c:void 0,D=(u=t._redirectEventId)!==null&&u!==void 0?u:void 0,$=(h=t.createdAt)!==null&&h!==void 0?h:void 0,B=(f=t.lastLoginAt)!==null&&f!==void 0?f:void 0,{uid:F,emailVerified:W,isAnonymous:Z,providerData:K,stsTokenManager:v}=t;j(F&&v,e,"internal-error");const _=Jn.fromJSON(this.name,v);j(typeof F=="string",e,"internal-error"),Vt(m,e.name),Vt(g,e.name),j(typeof W=="boolean",e,"internal-error"),j(typeof Z=="boolean",e,"internal-error"),Vt(b,e.name),Vt(C,e.name),Vt(N,e.name),Vt(D,e.name),Vt($,e.name),Vt(B,e.name);const I=new We({uid:F,auth:e,email:g,emailVerified:W,displayName:m,isAnonymous:Z,photoURL:C,phoneNumber:b,tenantId:N,stsTokenManager:_,createdAt:$,lastLoginAt:B});return K&&Array.isArray(K)&&(I.providerData=K.map(E=>Object.assign({},E))),D&&(I._redirectEventId=D),I}static async _fromIdTokenResponse(e,t,n=!1){const i=new Jn;i.updateFromServerResponse(t);const s=new We({uid:t.localId,auth:e,stsTokenManager:i,isAnonymous:n});return await Zs(s),s}static async _fromGetAccountInfoResponse(e,t,n){const i=t.users[0];j(i.localId!==void 0,"internal-error");const s=i.providerUserInfo!==void 0?kp(i.providerUserInfo):[],o=!(i.email&&i.passwordHash)&&!(s!=null&&s.length),c=new Jn;c.updateFromIdToken(n);const u=new We({uid:i.localId,auth:e,stsTokenManager:c,isAnonymous:o}),h={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:s,metadata:new Ba(i.createdAt,i.lastLoginAt),isAnonymous:!(i.email&&i.passwordHash)&&!(s!=null&&s.length)};return Object.assign(u,h),u}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Mh=new Map;function dt(r){It(r instanceof Function,"Expected a class definition");let e=Mh.get(r);return e?(It(e instanceof r,"Instance stored in cache mismatched with class"),e):(e=new r,Mh.set(r,e),e)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Np{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}Np.type="NONE";const Lh=Np;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Cs(r,e,t){return`firebase:${r}:${e}:${t}`}class Yn{constructor(e,t,n){this.persistence=e,this.auth=t,this.userKey=n;const{config:i,name:s}=this.auth;this.fullUserKey=Cs(this.userKey,i.apiKey,s),this.fullPersistenceKey=Cs("persistence",i.apiKey,s),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const t=await Ys(this.auth,{idToken:e}).catch(()=>{});return t?We._fromGetAccountInfoResponse(this.auth,t,e):null}return We._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,n="authUser"){if(!t.length)return new Yn(dt(Lh),e,n);const i=(await Promise.all(t.map(async h=>{if(await h._isAvailable())return h}))).filter(h=>h);let s=i[0]||dt(Lh);const o=Cs(n,e.config.apiKey,e.name);let c=null;for(const h of t)try{const f=await h._get(o);if(f){let m;if(typeof f=="string"){const g=await Ys(e,{idToken:f}).catch(()=>{});if(!g)break;m=await We._fromGetAccountInfoResponse(e,g,f)}else m=We._fromJSON(e,f);h!==s&&(c=m),s=h;break}}catch{}const u=i.filter(h=>h._shouldAllowMigration);return!s._shouldAllowMigration||!u.length?new Yn(s,e,n):(s=u[0],c&&await s._set(o,c.toJSON()),await Promise.all(t.map(async h=>{if(h!==s)try{await h._remove(o)}catch{}})),new Yn(s,e,n))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Fh(r){const e=r.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(Lp(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(xp(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(Up(e))return"Blackberry";if(Bp(e))return"Webos";if(Op(e))return"Safari";if((e.includes("chrome/")||Mp(e))&&!e.includes("edge/"))return"Chrome";if(Fp(e))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,n=r.match(t);if((n==null?void 0:n.length)===2)return n[1]}return"Other"}function xp(r=ge()){return/firefox\//i.test(r)}function Op(r=ge()){const e=r.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function Mp(r=ge()){return/crios\//i.test(r)}function Lp(r=ge()){return/iemobile/i.test(r)}function Fp(r=ge()){return/android/i.test(r)}function Up(r=ge()){return/blackberry/i.test(r)}function Bp(r=ge()){return/webos/i.test(r)}function Xc(r=ge()){return/iphone|ipad|ipod/i.test(r)||/macintosh/i.test(r)&&/mobile/i.test(r)}function hE(r=ge()){var e;return Xc(r)&&!!(!((e=window.navigator)===null||e===void 0)&&e.standalone)}function dE(){return sg()&&document.documentMode===10}function jp(r=ge()){return Xc(r)||Fp(r)||Bp(r)||Up(r)||/windows phone/i.test(r)||Lp(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qp(r,e=[]){let t;switch(r){case"Browser":t=Fh(ge());break;case"Worker":t=`${Fh(ge())}-${r}`;break;default:t=r}const n=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${mr}/${n}`}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fE{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const n=s=>new Promise((o,c)=>{try{const u=e(s);o(u)}catch(u){c(u)}});n.onAbort=t,this.queue.push(n);const i=this.queue.length-1;return()=>{this.queue[i]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const n of this.queue)await n(e),n.onAbort&&t.push(n.onAbort)}catch(n){t.reverse();for(const i of t)try{i()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:n==null?void 0:n.message})}}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function pE(r,e={}){return ot(r,"GET","/v2/passwordPolicy",Xt(r,e))}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const mE=6;class gE{constructor(e){var t,n,i,s;const o=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=(t=o.minPasswordLength)!==null&&t!==void 0?t:mE,o.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=o.maxPasswordLength),o.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=o.containsLowercaseCharacter),o.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=o.containsUppercaseCharacter),o.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=o.containsNumericCharacter),o.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=o.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=(i=(n=e.allowedNonAlphanumericCharacters)===null||n===void 0?void 0:n.join(""))!==null&&i!==void 0?i:"",this.forceUpgradeOnSignin=(s=e.forceUpgradeOnSignin)!==null&&s!==void 0?s:!1,this.schemaVersion=e.schemaVersion}validatePassword(e){var t,n,i,s,o,c;const u={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,u),this.validatePasswordCharacterOptions(e,u),u.isValid&&(u.isValid=(t=u.meetsMinPasswordLength)!==null&&t!==void 0?t:!0),u.isValid&&(u.isValid=(n=u.meetsMaxPasswordLength)!==null&&n!==void 0?n:!0),u.isValid&&(u.isValid=(i=u.containsLowercaseLetter)!==null&&i!==void 0?i:!0),u.isValid&&(u.isValid=(s=u.containsUppercaseLetter)!==null&&s!==void 0?s:!0),u.isValid&&(u.isValid=(o=u.containsNumericCharacter)!==null&&o!==void 0?o:!0),u.isValid&&(u.isValid=(c=u.containsNonAlphanumericCharacter)!==null&&c!==void 0?c:!0),u}validatePasswordLengthOptions(e,t){const n=this.customStrengthOptions.minPasswordLength,i=this.customStrengthOptions.maxPasswordLength;n&&(t.meetsMinPasswordLength=e.length>=n),i&&(t.meetsMaxPasswordLength=e.length<=i)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let n;for(let i=0;i<e.length;i++)n=e.charAt(i),this.updatePasswordCharacterOptionsStatuses(t,n>="a"&&n<="z",n>="A"&&n<="Z",n>="0"&&n<="9",this.allowedNonAlphanumericCharacters.includes(n))}updatePasswordCharacterOptionsStatuses(e,t,n,i,s){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=n)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=i)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=s))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _E{constructor(e,t,n,i){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=n,this.config=i,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new Uh(this),this.idTokenSubscription=new Uh(this),this.beforeStateQueue=new fE(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=Pp,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=i.sdkClientVersion,this._persistenceManagerAvailable=new Promise(s=>this._resolvePersistenceManagerAvailable=s)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=dt(t)),this._initializationPromise=this.queue(async()=>{var n,i,s;if(!this._deleted&&(this.persistenceManager=await Yn.create(this,e),(n=this._resolvePersistenceManagerAvailable)===null||n===void 0||n.call(this),!this._deleted)){if(!((i=this._popupRedirectResolver)===null||i===void 0)&&i._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(t),this.lastNotifiedUid=((s=this.currentUser)===null||s===void 0?void 0:s.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const t=await Ys(this,{idToken:e}),n=await We._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(n)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var t;if(je(this.app)){const o=this.app.settings.authIdToken;return o?new Promise(c=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(c,c))}):this.directlySetCurrentUser(null)}const n=await this.assertedPersistence.getCurrentUser();let i=n,s=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const o=(t=this.redirectUser)===null||t===void 0?void 0:t._redirectEventId,c=i==null?void 0:i._redirectEventId,u=await this.tryRedirectSignIn(e);(!o||o===c)&&(u!=null&&u.user)&&(i=u.user,s=!0)}if(!i)return this.directlySetCurrentUser(null);if(!i._redirectEventId){if(s)try{await this.beforeStateQueue.runMiddleware(i)}catch(o){i=n,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(o))}return i?this.reloadAndSetCurrentUserOrClear(i):this.directlySetCurrentUser(null)}return j(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===i._redirectEventId?this.directlySetCurrentUser(i):this.reloadAndSetCurrentUserOrClear(i)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await Zs(e)}catch(t){if((t==null?void 0:t.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=Qv()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(je(this.app))return Promise.reject(pt(this));const t=e?se(e):null;return t&&j(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&j(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return je(this.app)?Promise.reject(pt(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return je(this.app)?Promise.reject(pt(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(dt(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await pE(this),t=new gE(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new Ai("auth","Firebase",e())}onAuthStateChanged(e,t,n){return this.registerStateListener(this.authStateSubscription,e,t,n)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,n){return this.registerStateListener(this.idTokenSubscription,e,t,n)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const n=this.onAuthStateChanged(()=>{n(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t=await this.currentUser.getIdToken(),n={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(n.tenantId=this.tenantId),await lE(this,n)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)===null||e===void 0?void 0:e.toJSON()}}async _setRedirectUser(e,t){const n=await this.getOrInitRedirectPersistenceManager(t);return e===null?n.removeCurrentUser():n.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&dt(e)||this._popupRedirectResolver;j(t,this,"argument-error"),this.redirectPersistenceManager=await Yn.create(this,[dt(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var t,n;return this._isInitialized&&await this.queue(async()=>{}),((t=this._currentUser)===null||t===void 0?void 0:t._redirectEventId)===e?this._currentUser:((n=this.redirectUser)===null||n===void 0?void 0:n._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var e,t;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const n=(t=(e=this.currentUser)===null||e===void 0?void 0:e.uid)!==null&&t!==void 0?t:null;this.lastNotifiedUid!==n&&(this.lastNotifiedUid=n,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,n,i){if(this._deleted)return()=>{};const s=typeof t=="function"?t:t.next.bind(t);let o=!1;const c=this._isInitialized?Promise.resolve():this._initializationPromise;if(j(c,this,"internal-error"),c.then(()=>{o||s(this.currentUser)}),typeof t=="function"){const u=e.addObserver(t,n,i);return()=>{o=!0,u()}}else{const u=e.addObserver(t);return()=>{o=!0,u()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return j(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=qp(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var e;const t={"X-Client-Version":this.clientVersion};this.app.options.appId&&(t["X-Firebase-gmpid"]=this.app.options.appId);const n=await((e=this.heartbeatServiceProvider.getImmediate({optional:!0}))===null||e===void 0?void 0:e.getHeartbeatsHeader());n&&(t["X-Firebase-Client"]=n);const i=await this._getAppCheckToken();return i&&(t["X-Firebase-AppCheck"]=i),t}async _getAppCheckToken(){var e;if(je(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const t=await((e=this.appCheckServiceProvider.getImmediate({optional:!0}))===null||e===void 0?void 0:e.getToken());return t!=null&&t.error&&Kv(`Error while retrieving App Check token: ${t.error}`),t==null?void 0:t.token}}function kn(r){return se(r)}class Uh{constructor(e){this.auth=e,this.observer=null,this.addObserver=hg(t=>this.observer=t)}get next(){return j(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let So={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function yE(r){So=r}function zp(r){return So.loadJS(r)}function IE(){return So.recaptchaEnterpriseScript}function vE(){return So.gapiScript}function EE(r){return`__${r}${Math.floor(Math.random()*1e6)}`}class TE{constructor(){this.enterprise=new wE}ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class wE{ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}const AE="recaptcha-enterprise",$p="NO_RECAPTCHA";class RE{constructor(e){this.type=AE,this.auth=kn(e)}async verify(e="verify",t=!1){async function n(s){if(!t){if(s.tenantId==null&&s._agentRecaptchaConfig!=null)return s._agentRecaptchaConfig.siteKey;if(s.tenantId!=null&&s._tenantRecaptchaConfigs[s.tenantId]!==void 0)return s._tenantRecaptchaConfigs[s.tenantId].siteKey}return new Promise(async(o,c)=>{nE(s,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(u=>{if(u.recaptchaKey===void 0)c(new Error("recaptcha Enterprise site key undefined"));else{const h=new tE(u);return s.tenantId==null?s._agentRecaptchaConfig=h:s._tenantRecaptchaConfigs[s.tenantId]=h,o(h.siteKey)}}).catch(u=>{c(u)})})}function i(s,o,c){const u=window.grecaptcha;xh(u)?u.enterprise.ready(()=>{u.enterprise.execute(s,{action:e}).then(h=>{o(h)}).catch(()=>{o($p)})}):c(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new TE().execute("siteKey",{action:"verify"}):new Promise((s,o)=>{n(this.auth).then(c=>{if(!t&&xh(window.grecaptcha))i(c,s,o);else{if(typeof window>"u"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let u=IE();u.length!==0&&(u+=c),zp(u).then(()=>{i(c,s,o)}).catch(h=>{o(h)})}}).catch(c=>{o(c)})})}}async function Bh(r,e,t,n=!1,i=!1){const s=new RE(r);let o;if(i)o=$p;else try{o=await s.verify(t)}catch{o=await s.verify(t,!0)}const c=Object.assign({},e);if(t==="mfaSmsEnrollment"||t==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in c){const u=c.phoneEnrollmentInfo.phoneNumber,h=c.phoneEnrollmentInfo.recaptchaToken;Object.assign(c,{phoneEnrollmentInfo:{phoneNumber:u,recaptchaToken:h,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in c){const u=c.phoneSignInInfo.recaptchaToken;Object.assign(c,{phoneSignInInfo:{recaptchaToken:u,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return c}return n?Object.assign(c,{captchaResp:o}):Object.assign(c,{captchaResponse:o}),Object.assign(c,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(c,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),c}async function ja(r,e,t,n,i){var s;if(!((s=r._getRecaptchaConfig())===null||s===void 0)&&s.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const o=await Bh(r,e,t,t==="getOobCode");return n(r,o)}else return n(r,e).catch(async o=>{if(o.code==="auth/missing-recaptcha-token"){console.log(`${t} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const c=await Bh(r,e,t,t==="getOobCode");return n(r,c)}else return Promise.reject(o)})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function bE(r,e){const t=Ga(r,"auth");if(t.isInitialized()){const i=t.getImmediate(),s=t.getOptions();if(mt(s,e??{}))return i;Qe(i,"already-initialized")}return t.initialize({options:e})}function PE(r,e){const t=(e==null?void 0:e.persistence)||[],n=(Array.isArray(t)?t:[t]).map(dt);e!=null&&e.errorMap&&r._updateErrorMap(e.errorMap),r._initializeWithPersistence(n,e==null?void 0:e.popupRedirectResolver)}function SE(r,e,t){const n=kn(r);j(/^https?:\/\//.test(e),n,"invalid-emulator-scheme");const i=!1,s=Gp(e),{host:o,port:c}=CE(e),u=c===null?"":`:${c}`,h={url:`${s}//${o}${u}/`},f=Object.freeze({host:o,port:c,protocol:s.replace(":",""),options:Object.freeze({disableWarnings:i})});if(!n._canInitEmulator){j(n.config.emulator&&n.emulatorConfig,n,"emulator-config-failed"),j(mt(h,n.config.emulator)&&mt(f,n.emulatorConfig),n,"emulator-config-failed");return}n.config.emulator=h,n.emulatorConfig=f,n.settings.appVerificationDisabledForTesting=!0,pr(o)?(sd(`${s}//${o}${u}`),od("Auth",!0)):VE()}function Gp(r){const e=r.indexOf(":");return e<0?"":r.substr(0,e+1)}function CE(r){const e=Gp(r),t=/(\/\/)?([^?#/]+)/.exec(r.substr(e.length));if(!t)return{host:"",port:null};const n=t[2].split("@").pop()||"",i=/^(\[[^\]]+\])(:|$)/.exec(n);if(i){const s=i[1];return{host:s,port:jh(n.substr(s.length+1))}}else{const[s,o]=n.split(":");return{host:s,port:jh(o)}}}function jh(r){if(!r)return null;const e=Number(r);return isNaN(e)?null:e}function VE(){function r(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",r):r())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jc{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return ht("not implemented")}_getIdTokenResponse(e){return ht("not implemented")}_linkToIdToken(e,t){return ht("not implemented")}_getReauthenticationResolver(e){return ht("not implemented")}}async function DE(r,e){return ot(r,"POST","/v1/accounts:update",e)}async function kE(r,e){return ot(r,"POST","/v1/accounts:signUp",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function NE(r,e){return Bi(r,"POST","/v1/accounts:signInWithPassword",Xt(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function xE(r,e){return Bi(r,"POST","/v1/accounts:signInWithEmailLink",Xt(r,e))}async function OE(r,e){return Bi(r,"POST","/v1/accounts:signInWithEmailLink",Xt(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wi extends Jc{constructor(e,t,n,i=null){super("password",n),this._email=e,this._password=t,this._tenantId=i}static _fromEmailAndPassword(e,t){return new wi(e,t,"password")}static _fromEmailAndCode(e,t,n=null){return new wi(e,t,"emailLink",n)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;if(t!=null&&t.email&&(t!=null&&t.password)){if(t.signInMethod==="password")return this._fromEmailAndPassword(t.email,t.password);if(t.signInMethod==="emailLink")return this._fromEmailAndCode(t.email,t.password,t.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":const t={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return ja(e,t,"signInWithPassword",NE);case"emailLink":return xE(e,{email:this._email,oobCode:this._password});default:Qe(e,"internal-error")}}async _linkToIdToken(e,t){switch(this.signInMethod){case"password":const n={idToken:t,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return ja(e,n,"signUpPassword",kE);case"emailLink":return OE(e,{idToken:t,email:this._email,oobCode:this._password});default:Qe(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Zn(r,e){return Bi(r,"POST","/v1/accounts:signInWithIdp",Xt(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ME="http://localhost";class Rn extends Jc{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new Rn(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):Qe("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:n,signInMethod:i}=t,s=za(t,["providerId","signInMethod"]);if(!n||!i)return null;const o=new Rn(n,i);return o.idToken=s.idToken||void 0,o.accessToken=s.accessToken||void 0,o.secret=s.secret,o.nonce=s.nonce,o.pendingToken=s.pendingToken||null,o}_getIdTokenResponse(e){const t=this.buildRequest();return Zn(e,t)}_linkToIdToken(e,t){const n=this.buildRequest();return n.idToken=t,Zn(e,n)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,Zn(e,t)}buildRequest(){const e={requestUri:ME,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=Ri(t)}return e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function LE(r){switch(r){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function FE(r){const e=Kr(Wr(r)).link,t=e?Kr(Wr(e)).deep_link_id:null,n=Kr(Wr(r)).deep_link_id;return(n?Kr(Wr(n)).link:null)||n||t||e||r}class Yc{constructor(e){var t,n,i,s,o,c;const u=Kr(Wr(e)),h=(t=u.apiKey)!==null&&t!==void 0?t:null,f=(n=u.oobCode)!==null&&n!==void 0?n:null,m=LE((i=u.mode)!==null&&i!==void 0?i:null);j(h&&f&&m,"argument-error"),this.apiKey=h,this.operation=m,this.code=f,this.continueUrl=(s=u.continueUrl)!==null&&s!==void 0?s:null,this.languageCode=(o=u.lang)!==null&&o!==void 0?o:null,this.tenantId=(c=u.tenantId)!==null&&c!==void 0?c:null}static parseLink(e){const t=FE(e);try{return new Yc(t)}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wr{constructor(){this.providerId=wr.PROVIDER_ID}static credential(e,t){return wi._fromEmailAndPassword(e,t)}static credentialWithLink(e,t){const n=Yc.parseLink(t);return j(n,"argument-error"),wi._fromEmailAndCode(e,n.code,n.tenantId)}}wr.PROVIDER_ID="password";wr.EMAIL_PASSWORD_SIGN_IN_METHOD="password";wr.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Kp{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ji extends Kp{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kt extends ji{constructor(){super("facebook.com")}static credential(e){return Rn._fromParams({providerId:kt.PROVIDER_ID,signInMethod:kt.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return kt.credentialFromTaggedObject(e)}static credentialFromError(e){return kt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return kt.credential(e.oauthAccessToken)}catch{return null}}}kt.FACEBOOK_SIGN_IN_METHOD="facebook.com";kt.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nt extends ji{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return Rn._fromParams({providerId:Nt.PROVIDER_ID,signInMethod:Nt.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return Nt.credentialFromTaggedObject(e)}static credentialFromError(e){return Nt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:n}=e;if(!t&&!n)return null;try{return Nt.credential(t,n)}catch{return null}}}Nt.GOOGLE_SIGN_IN_METHOD="google.com";Nt.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xt extends ji{constructor(){super("github.com")}static credential(e){return Rn._fromParams({providerId:xt.PROVIDER_ID,signInMethod:xt.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return xt.credentialFromTaggedObject(e)}static credentialFromError(e){return xt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return xt.credential(e.oauthAccessToken)}catch{return null}}}xt.GITHUB_SIGN_IN_METHOD="github.com";xt.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ot extends ji{constructor(){super("twitter.com")}static credential(e,t){return Rn._fromParams({providerId:Ot.PROVIDER_ID,signInMethod:Ot.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return Ot.credentialFromTaggedObject(e)}static credentialFromError(e){return Ot.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:n}=e;if(!t||!n)return null;try{return Ot.credential(t,n)}catch{return null}}}Ot.TWITTER_SIGN_IN_METHOD="twitter.com";Ot.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function UE(r,e){return Bi(r,"POST","/v1/accounts:signUp",Xt(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bn{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,n,i=!1){const s=await We._fromIdTokenResponse(e,n,i),o=qh(n);return new bn({user:s,providerId:o,_tokenResponse:n,operationType:t})}static async _forOperation(e,t,n){await e._updateTokensIfNecessary(n,!0);const i=qh(n);return new bn({user:e,providerId:i,_tokenResponse:n,operationType:t})}}function qh(r){return r.providerId?r.providerId:"phoneNumber"in r?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eo extends vt{constructor(e,t,n,i){var s;super(t.code,t.message),this.operationType=n,this.user=i,Object.setPrototypeOf(this,eo.prototype),this.customData={appName:e.name,tenantId:(s=e.tenantId)!==null&&s!==void 0?s:void 0,_serverResponse:t.customData._serverResponse,operationType:n}}static _fromErrorAndOperation(e,t,n,i){return new eo(e,t,n,i)}}function Wp(r,e,t,n){return(e==="reauthenticate"?t._getReauthenticationResolver(r):t._getIdTokenResponse(r)).catch(s=>{throw s.code==="auth/multi-factor-auth-required"?eo._fromErrorAndOperation(r,s,e,n):s})}async function BE(r,e,t=!1){const n=await An(r,e._linkToIdToken(r.auth,await r.getIdToken()),t);return bn._forOperation(r,"link",n)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Hp(r,e,t=!1){const{auth:n}=r;if(je(n.app))return Promise.reject(pt(n));const i="reauthenticate";try{const s=await An(r,Wp(n,i,e,r),t);j(s.idToken,n,"internal-error");const o=Qc(s.idToken);j(o,n,"internal-error");const{sub:c}=o;return j(r.uid===c,n,"user-mismatch"),bn._forOperation(r,i,s)}catch(s){throw(s==null?void 0:s.code)==="auth/user-not-found"&&Qe(n,"user-mismatch"),s}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Qp(r,e,t=!1){if(je(r.app))return Promise.reject(pt(r));const n="signIn",i=await Wp(r,n,e),s=await bn._fromIdTokenResponse(r,n,i);return t||await r._updateCurrentUser(s.user),s}async function jE(r,e){return Qp(kn(r),e)}async function bw(r,e){return Hp(se(r),e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Xp(r){const e=kn(r);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}async function Pw(r,e,t){if(je(r.app))return Promise.reject(pt(r));const n=kn(r),o=await ja(n,{returnSecureToken:!0,email:e,password:t,clientType:"CLIENT_TYPE_WEB"},"signUpPassword",UE).catch(u=>{throw u.code==="auth/password-does-not-meet-requirements"&&Xp(r),u}),c=await bn._fromIdTokenResponse(n,"signIn",o);return await n._updateCurrentUser(c.user),c}function Sw(r,e,t){return je(r.app)?Promise.reject(pt(r)):jE(se(r),wr.credential(e,t)).catch(async n=>{throw n.code==="auth/password-does-not-meet-requirements"&&Xp(r),n})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function qE(r,e){return ot(r,"POST","/v1/accounts:update",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Cw(r,{displayName:e,photoURL:t}){if(e===void 0&&t===void 0)return;const n=se(r),s={idToken:await n.getIdToken(),displayName:e,photoUrl:t,returnSecureToken:!0},o=await An(n,qE(n.auth,s));n.displayName=o.displayName||null,n.photoURL=o.photoUrl||null;const c=n.providerData.find(({providerId:u})=>u==="password");c&&(c.displayName=n.displayName,c.photoURL=n.photoURL),await n._updateTokensIfNecessary(o)}function Vw(r,e){return zE(se(r),null,e)}async function zE(r,e,t){const{auth:n}=r,s={idToken:await r.getIdToken(),returnSecureToken:!0};t&&(s.password=t);const o=await An(r,DE(n,s));await r._updateTokensIfNecessary(o,!0)}function $E(r,e,t,n){return se(r).onIdTokenChanged(e,t,n)}function GE(r,e,t){return se(r).beforeAuthStateChanged(e,t)}function Dw(r,e,t,n){return se(r).onAuthStateChanged(e,t,n)}function kw(r){return se(r).signOut()}const to="__sak";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jp{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(to,"1"),this.storage.removeItem(to),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const KE=1e3,WE=10;class Yp extends Jp{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=jp(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const n=this.storage.getItem(t),i=this.localCache[t];n!==i&&e(t,i,n)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((o,c,u)=>{this.notifyListeners(o,u)});return}const n=e.key;t?this.detachListener():this.stopPolling();const i=()=>{const o=this.storage.getItem(n);!t&&this.localCache[n]===o||this.notifyListeners(n,o)},s=this.storage.getItem(n);dE()&&s!==e.newValue&&e.newValue!==e.oldValue?setTimeout(i,WE):i()}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const i of Array.from(n))i(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,n)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:n}),!0)})},KE)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}Yp.type="LOCAL";const HE=Yp;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zp extends Jp{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}Zp.type="SESSION";const em=Zp;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function QE(r){return Promise.all(r.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Co{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(i=>i.isListeningto(e));if(t)return t;const n=new Co(e);return this.receivers.push(n),n}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:n,eventType:i,data:s}=t.data,o=this.handlersMap[i];if(!(o!=null&&o.size))return;t.ports[0].postMessage({status:"ack",eventId:n,eventType:i});const c=Array.from(o).map(async h=>h(t.origin,s)),u=await QE(c);t.ports[0].postMessage({status:"done",eventId:n,eventType:i,response:u})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}Co.receivers=[];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Zc(r="",e=10){let t="";for(let n=0;n<e;n++)t+=Math.floor(Math.random()*10);return r+t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class XE{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,n=50){const i=typeof MessageChannel<"u"?new MessageChannel:null;if(!i)throw new Error("connection_unavailable");let s,o;return new Promise((c,u)=>{const h=Zc("",20);i.port1.start();const f=setTimeout(()=>{u(new Error("unsupported_event"))},n);o={messageChannel:i,onMessage(m){const g=m;if(g.data.eventId===h)switch(g.data.status){case"ack":clearTimeout(f),s=setTimeout(()=>{u(new Error("timeout"))},3e3);break;case"done":clearTimeout(s),c(g.data.response);break;default:clearTimeout(f),clearTimeout(s),u(new Error("invalid_response"));break}}},this.handlers.add(o),i.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:h,data:t},[i.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function nt(){return window}function JE(r){nt().location.href=r}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function tm(){return typeof nt().WorkerGlobalScope<"u"&&typeof nt().importScripts=="function"}async function YE(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function ZE(){var r;return((r=navigator==null?void 0:navigator.serviceWorker)===null||r===void 0?void 0:r.controller)||null}function eT(){return tm()?self:null}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nm="firebaseLocalStorageDb",tT=1,no="firebaseLocalStorage",rm="fbase_key";class qi{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function Vo(r,e){return r.transaction([no],e?"readwrite":"readonly").objectStore(no)}function nT(){const r=indexedDB.deleteDatabase(nm);return new qi(r).toPromise()}function qa(){const r=indexedDB.open(nm,tT);return new Promise((e,t)=>{r.addEventListener("error",()=>{t(r.error)}),r.addEventListener("upgradeneeded",()=>{const n=r.result;try{n.createObjectStore(no,{keyPath:rm})}catch(i){t(i)}}),r.addEventListener("success",async()=>{const n=r.result;n.objectStoreNames.contains(no)?e(n):(n.close(),await nT(),e(await qa()))})})}async function zh(r,e,t){const n=Vo(r,!0).put({[rm]:e,value:t});return new qi(n).toPromise()}async function rT(r,e){const t=Vo(r,!1).get(e),n=await new qi(t).toPromise();return n===void 0?null:n.value}function $h(r,e){const t=Vo(r,!0).delete(e);return new qi(t).toPromise()}const iT=800,sT=3;class im{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await qa(),this.db)}async _withRetries(e){let t=0;for(;;)try{const n=await this._openDb();return await e(n)}catch(n){if(t++>sT)throw n;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return tm()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=Co._getInstance(eT()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){var e,t;if(this.activeServiceWorker=await YE(),!this.activeServiceWorker)return;this.sender=new XE(this.activeServiceWorker);const n=await this.sender._send("ping",{},800);n&&!((e=n[0])===null||e===void 0)&&e.fulfilled&&!((t=n[0])===null||t===void 0)&&t.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||ZE()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await qa();return await zh(e,to,"1"),await $h(e,to),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(n=>zh(n,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(n=>rT(n,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>$h(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(i=>{const s=Vo(i,!1).getAll();return new qi(s).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const t=[],n=new Set;if(e.length!==0)for(const{fbase_key:i,value:s}of e)n.add(i),JSON.stringify(this.localCache[i])!==JSON.stringify(s)&&(this.notifyListeners(i,s),t.push(i));for(const i of Object.keys(this.localCache))this.localCache[i]&&!n.has(i)&&(this.notifyListeners(i,null),t.push(i));return t}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const i of Array.from(n))i(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),iT)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}im.type="LOCAL";const oT=im;new Ui(3e4,6e4);/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function aT(r,e){return e?dt(e):(j(r._popupRedirectResolver,r,"argument-error"),r._popupRedirectResolver)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eu extends Jc{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return Zn(e,this._buildIdpRequest())}_linkToIdToken(e,t){return Zn(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return Zn(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function cT(r){return Qp(r.auth,new eu(r),r.bypassAuthState)}function uT(r){const{auth:e,user:t}=r;return j(t,e,"internal-error"),Hp(t,new eu(r),r.bypassAuthState)}async function lT(r){const{auth:e,user:t}=r;return j(t,e,"internal-error"),BE(t,new eu(r),r.bypassAuthState)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sm{constructor(e,t,n,i,s=!1){this.auth=e,this.resolver=n,this.user=i,this.bypassAuthState=s,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(n){this.reject(n)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:n,postBody:i,tenantId:s,error:o,type:c}=e;if(o){this.reject(o);return}const u={auth:this.auth,requestUri:t,sessionId:n,tenantId:s||void 0,postBody:i||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(c)(u))}catch(h){this.reject(h)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return cT;case"linkViaPopup":case"linkViaRedirect":return lT;case"reauthViaPopup":case"reauthViaRedirect":return uT;default:Qe(this.auth,"internal-error")}}resolve(e){It(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){It(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const hT=new Ui(2e3,1e4);class Qn extends sm{constructor(e,t,n,i,s){super(e,t,i,s),this.provider=n,this.authWindow=null,this.pollId=null,Qn.currentPopupAction&&Qn.currentPopupAction.cancel(),Qn.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return j(e,this.auth,"internal-error"),e}async onExecution(){It(this.filter.length===1,"Popup operations only handle one event");const e=Zc();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(tt(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)===null||e===void 0?void 0:e.associatedEvent)||null}cancel(){this.reject(tt(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,Qn.currentPopupAction=null}pollUserCancellation(){const e=()=>{var t,n;if(!((n=(t=this.authWindow)===null||t===void 0?void 0:t.window)===null||n===void 0)&&n.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(tt(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,hT.get())};e()}}Qn.currentPopupAction=null;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const dT="pendingRedirect",Vs=new Map;class fT extends sm{constructor(e,t,n=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,n),this.eventId=null}async execute(){let e=Vs.get(this.auth._key());if(!e){try{const n=await pT(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(n)}catch(t){e=()=>Promise.reject(t)}Vs.set(this.auth._key(),e)}return this.bypassAuthState||Vs.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function pT(r,e){const t=_T(e),n=gT(r);if(!await n._isAvailable())return!1;const i=await n._get(t)==="true";return await n._remove(t),i}function mT(r,e){Vs.set(r._key(),e)}function gT(r){return dt(r._redirectPersistence)}function _T(r){return Cs(dT,r.config.apiKey,r.name)}async function yT(r,e,t=!1){if(je(r.app))return Promise.reject(pt(r));const n=kn(r),i=aT(n,e),o=await new fT(n,i,t).execute();return o&&!t&&(delete o.user._redirectEventId,await n._persistUserIfCurrent(o.user),await n._setRedirectUser(null,e)),o}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const IT=600*1e3;class vT{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(n=>{this.isEventForConsumer(e,n)&&(t=!0,this.sendToConsumer(e,n),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!ET(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){var n;if(e.error&&!om(e)){const i=((n=e.error.code)===null||n===void 0?void 0:n.split("auth/")[1])||"internal-error";t.onError(tt(this.auth,i))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const n=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&n}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=IT&&this.cachedEventUids.clear(),this.cachedEventUids.has(Gh(e))}saveEventToCache(e){this.cachedEventUids.add(Gh(e)),this.lastProcessedEventTime=Date.now()}}function Gh(r){return[r.type,r.eventId,r.sessionId,r.tenantId].filter(e=>e).join("-")}function om({type:r,error:e}){return r==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function ET(r){switch(r.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return om(r);default:return!1}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function TT(r,e={}){return ot(r,"GET","/v1/projects",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wT=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,AT=/^https?/;async function RT(r){if(r.config.emulator)return;const{authorizedDomains:e}=await TT(r);for(const t of e)try{if(bT(t))return}catch{}Qe(r,"unauthorized-domain")}function bT(r){const e=Ua(),{protocol:t,hostname:n}=new URL(e);if(r.startsWith("chrome-extension://")){const o=new URL(r);return o.hostname===""&&n===""?t==="chrome-extension:"&&r.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&o.hostname===n}if(!AT.test(t))return!1;if(wT.test(r))return n===r;const i=r.replace(/\./g,"\\.");return new RegExp("^(.+\\."+i+"|"+i+")$","i").test(n)}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const PT=new Ui(3e4,6e4);function Kh(){const r=nt().___jsl;if(r!=null&&r.H){for(const e of Object.keys(r.H))if(r.H[e].r=r.H[e].r||[],r.H[e].L=r.H[e].L||[],r.H[e].r=[...r.H[e].L],r.CP)for(let t=0;t<r.CP.length;t++)r.CP[t]=null}}function ST(r){return new Promise((e,t)=>{var n,i,s;function o(){Kh(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{Kh(),t(tt(r,"network-request-failed"))},timeout:PT.get()})}if(!((i=(n=nt().gapi)===null||n===void 0?void 0:n.iframes)===null||i===void 0)&&i.Iframe)e(gapi.iframes.getContext());else if(!((s=nt().gapi)===null||s===void 0)&&s.load)o();else{const c=EE("iframefcb");return nt()[c]=()=>{gapi.load?o():t(tt(r,"network-request-failed"))},zp(`${vE()}?onload=${c}`).catch(u=>t(u))}}).catch(e=>{throw Ds=null,e})}let Ds=null;function CT(r){return Ds=Ds||ST(r),Ds}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const VT=new Ui(5e3,15e3),DT="__/auth/iframe",kT="emulator/auth/iframe",NT={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},xT=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function OT(r){const e=r.config;j(e.authDomain,r,"auth-domain-config-required");const t=e.emulator?Hc(e,kT):`https://${r.config.authDomain}/${DT}`,n={apiKey:e.apiKey,appName:r.name,v:mr},i=xT.get(r.config.apiHost);i&&(n.eid=i);const s=r._getFrameworks();return s.length&&(n.fw=s.join(",")),`${t}?${Ri(n).slice(1)}`}async function MT(r){const e=await CT(r),t=nt().gapi;return j(t,r,"internal-error"),e.open({where:document.body,url:OT(r),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:NT,dontclear:!0},n=>new Promise(async(i,s)=>{await n.restyle({setHideOnLeave:!1});const o=tt(r,"network-request-failed"),c=nt().setTimeout(()=>{s(o)},VT.get());function u(){nt().clearTimeout(c),i(n)}n.ping(u).then(u,()=>{s(o)})}))}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const LT={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},FT=500,UT=600,BT="_blank",jT="http://localhost";class Wh{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function qT(r,e,t,n=FT,i=UT){const s=Math.max((window.screen.availHeight-i)/2,0).toString(),o=Math.max((window.screen.availWidth-n)/2,0).toString();let c="";const u=Object.assign(Object.assign({},LT),{width:n.toString(),height:i.toString(),top:s,left:o}),h=ge().toLowerCase();t&&(c=Mp(h)?BT:t),xp(h)&&(e=e||jT,u.scrollbars="yes");const f=Object.entries(u).reduce((g,[b,C])=>`${g}${b}=${C},`,"");if(hE(h)&&c!=="_self")return zT(e||"",c),new Wh(null);const m=window.open(e||"",c,f);j(m,r,"popup-blocked");try{m.focus()}catch{}return new Wh(m)}function zT(r,e){const t=document.createElement("a");t.href=r,t.target=e;const n=document.createEvent("MouseEvent");n.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(n)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $T="__/auth/handler",GT="emulator/auth/handler",KT=encodeURIComponent("fac");async function Hh(r,e,t,n,i,s){j(r.config.authDomain,r,"auth-domain-config-required"),j(r.config.apiKey,r,"invalid-api-key");const o={apiKey:r.config.apiKey,appName:r.name,authType:t,redirectUrl:n,v:mr,eventId:i};if(e instanceof Kp){e.setDefaultLanguage(r.languageCode),o.providerId=e.providerId||"",lg(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[f,m]of Object.entries({}))o[f]=m}if(e instanceof ji){const f=e.getScopes().filter(m=>m!=="");f.length>0&&(o.scopes=f.join(","))}r.tenantId&&(o.tid=r.tenantId);const c=o;for(const f of Object.keys(c))c[f]===void 0&&delete c[f];const u=await r._getAppCheckToken(),h=u?`#${KT}=${encodeURIComponent(u)}`:"";return`${WT(r)}?${Ri(c).slice(1)}${h}`}function WT({config:r}){return r.emulator?Hc(r,GT):`https://${r.authDomain}/${$T}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const la="webStorageSupport";class HT{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=em,this._completeRedirectFn=yT,this._overrideRedirectResult=mT}async _openPopup(e,t,n,i){var s;It((s=this.eventManagers[e._key()])===null||s===void 0?void 0:s.manager,"_initialize() not called before _openPopup()");const o=await Hh(e,t,n,Ua(),i);return qT(e,o,Zc())}async _openRedirect(e,t,n,i){await this._originValidation(e);const s=await Hh(e,t,n,Ua(),i);return JE(s),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:i,promise:s}=this.eventManagers[t];return i?Promise.resolve(i):(It(s,"If manager is not set, promise should be"),s)}const n=this.initAndGetManager(e);return this.eventManagers[t]={promise:n},n.catch(()=>{delete this.eventManagers[t]}),n}async initAndGetManager(e){const t=await MT(e),n=new vT(e);return t.register("authEvent",i=>(j(i==null?void 0:i.authEvent,e,"invalid-auth-event"),{status:n.onEvent(i.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:n},this.iframes[e._key()]=t,n}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(la,{type:la},i=>{var s;const o=(s=i==null?void 0:i[0])===null||s===void 0?void 0:s[la];o!==void 0&&t(!!o),Qe(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=RT(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return jp()||Op()||Xc()}}const QT=HT;var Qh="@firebase/auth",Xh="1.10.8";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class XT{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)===null||e===void 0?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(n=>{e((n==null?void 0:n.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){j(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function JT(r){switch(r){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function YT(r){er(new pn("auth",(e,{options:t})=>{const n=e.getProvider("app").getImmediate(),i=e.getProvider("heartbeat"),s=e.getProvider("app-check-internal"),{apiKey:o,authDomain:c}=n.options;j(o&&!o.includes(":"),"invalid-api-key",{appName:n.name});const u={apiKey:o,authDomain:c,clientPlatform:r,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:qp(r)},h=new _E(n,i,s,u);return PE(h,t),h},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,n)=>{e.getProvider("auth-internal").initialize()})),er(new pn("auth-internal",e=>{const t=kn(e.getProvider("auth").getImmediate());return(n=>new XT(n))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),Ut(Qh,Xh,JT(r)),Ut(Qh,Xh,"esm2017")}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ZT=300,ew=id("authIdTokenMaxAge")||ZT;let Jh=null;const tw=r=>async e=>{const t=e&&await e.getIdTokenResult(),n=t&&(new Date().getTime()-Date.parse(t.issuedAtTime))/1e3;if(n&&n>ew)return;const i=t==null?void 0:t.token;Jh!==i&&(Jh=i,await fetch(r,{method:i?"POST":"DELETE",headers:i?{Authorization:`Bearer ${i}`}:{}}))};function Nw(r=hd()){const e=Ga(r,"auth");if(e.isInitialized())return e.getImmediate();const t=bE(r,{popupRedirectResolver:QT,persistence:[oT,HE,em]}),n=id("authTokenSyncURL");if(n&&typeof isSecureContext=="boolean"&&isSecureContext){const s=new URL(n,location.origin);if(location.origin===s.origin){const o=tw(s.toString());GE(t,o,()=>o(t.currentUser)),$E(t,c=>o(c))}}const i=nd("auth");return i&&SE(t,`http://${i}`),t}function nw(){var r,e;return(e=(r=document.getElementsByTagName("head"))===null||r===void 0?void 0:r[0])!==null&&e!==void 0?e:document}yE({loadJS(r){return new Promise((e,t)=>{const n=document.createElement("script");n.setAttribute("src",r),n.onload=e,n.onerror=i=>{const s=tt("internal-error");s.customData=i,t(s)},n.type="text/javascript",n.charset="UTF-8",nw().appendChild(n)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});YT("Browser");export{Tw as A,dw as B,Iw as C,bw as D,wr as E,Vw as F,ee as T,Nw as a,Sw as b,Pw as c,gw as d,cw as e,Cv as f,aw as g,pw as h,t_ as i,sw as j,yw as k,ww as l,_w as m,fw as n,Dw as o,hw as p,uw as q,vw as r,kw as s,Ew as t,Cw as u,lw as v,Rw as w,ow as x,mw as y,Aw as z};
