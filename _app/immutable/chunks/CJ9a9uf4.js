import{l as C,k as D}from"./grLjKn_M.js";import{r as P,g as U,d as N,e as Q}from"./C7qNSm1n.js";import{w as O,r as V}from"./C6CFVZEy.js";function F(e){return(e==null?void 0:e.length)!==void 0?e:Array.from(e)}function j(e,r){D(e,1,1,()=>{r.delete(e.key)})}function G(e,r){e.f(),j(e,r)}function W(e,r,u,f,g,n,t,a,o,c,m,p){let i=e.length,w=n.length,h=i;const T={};for(;h--;)T[e[h].key]=h;const M=[],b=new Map,v=new Map,E=[];for(h=w;h--;){const s=p(g,n,h),d=u(s);let l=t.get(d);l?E.push(()=>l.p(s,r)):(l=c(d,s),l.c()),b.set(d,M[h]=l),d in T&&v.set(d,Math.abs(h-T[d]))}const z=new Set,x=new Set;function I(s){C(s,1),s.m(a,m),t.set(s.key,s),m=s.first,w--}for(;i&&w;){const s=M[w-1],d=e[i-1],l=s.key,S=d.key;s===d?(m=s.first,i--,w--):b.has(S)?!t.has(l)||z.has(l)?I(s):x.has(S)?i--:v.get(l)>v.get(S)?(x.add(l),I(s)):(z.add(S),i--):(o(d,t),i--)}for(;i--;){const s=e[i];b.has(s.key)||o(s,t)}for(;w;)I(M[w-1]);return P(E),M}const k={message:"Missing Toast Message",autohide:!0,timeout:5e3},R="toastStore";function X(){const e=U(R);if(!e)throw new Error("toastStore is not initialized. Please ensure that `initializeStores()` is invoked in the root layout file of this app!");return e}function Z(){const e=H();return N(R,e)}function q(){const e=Math.random();return Number(e).toString(32)}function H(){const{subscribe:e,set:r,update:u}=O([]),f=n=>u(t=>{if(t.length>0){const a=t.findIndex(c=>c.id===n),o=t[a];o&&(o.callback&&o.callback({id:n,status:"closed"}),o.timeoutId&&clearTimeout(o.timeoutId),t.splice(a,1))}return t});function g(n){if(n.autohide===!0)return setTimeout(()=>{f(n.id)},n.timeout)}return{subscribe:e,close:f,trigger:n=>{const t=q();return u(a=>{n&&n.callback&&n.callback({id:t,status:"queued"}),n.hideDismiss&&(n.autohide=!0);const o={...k,...n,id:t};return o.timeoutId=g(o),a.push(o),a}),t},freeze:n=>u(t=>(t.length>0&&clearTimeout(t[n].timeoutId),t)),unfreeze:n=>u(t=>(t.length>0&&(t[n].timeoutId=g(t[n])),t)),clear:()=>r([])}}const _={};function L(e){return e==="local"?localStorage:sessionStorage}function y(e,r,u){const f=JSON,g="local";function n(t,a){L(g).setItem(t,f.stringify(a))}if(!_[e]){const t=O(r,c=>{const m=L(g).getItem(e);m&&c(f.parse(m));{const p=i=>{i.key===e&&c(i.newValue?f.parse(i.newValue):null)};return window.addEventListener("storage",p),()=>window.removeEventListener("storage",p)}}),{subscribe:a,set:o}=t;_[e]={set(c){n(e,c),o(c)},update(c){const m=c(Q(t));n(e,m),o(m)},subscribe:a}}return _[e]}y("modeOsPrefers",!1);y("modeUserPrefers",void 0);y("modeCurrent",!1);const A="(prefers-reduced-motion: reduce)";function J(){return window.matchMedia(A).matches}const $=V(J(),e=>{{const r=f=>{e(f.matches)},u=window.matchMedia(A);return u.addEventListener("change",r),()=>{u.removeEventListener("change",r)}}});export{F as e,G as f,X as g,Z as i,$ as p,W as u};
