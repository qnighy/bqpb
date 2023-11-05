## Protobuf parser for BigQuery

### Usage

```sql
CREATE TEMP FUNCTION parseProtobuf(input BYTES, messageType STRING, typedefs JSON)
RETURNS JSON DETERMINISTIC
LANGUAGE js
AS r"""
"use strict";function n(n){
const t=(n+"=").indexOf("="),r=new Uint8Array(.75*t|0);for(let e=0;t>e;e++){
const t=n.charCodeAt(e),o=.75*e+.75|0,i=t-(96>t?64>t?48>t?47>t?-19:-16:-4:65:71)<<2+e%4*2
;r[o-1]|=i>>8,r[o]|=i}return r}function t(n){
const t=new Array(4*((n.length+2)/3|0)),r=(4*n.length+2)/3|0
;for(let e=0;r>e;e++){const r=.75*e+.75|0,o=(n[r-1]<<8|n[r])>>2+e%4*2&63
;t[e]=o+(26>o?65:52>o?71:62>o?-4:63>o?-19:-16)}
for(let n=r;n<t.length;n++)t[n]=61;return String.fromCharCode(...t)}
function r(n){try{
return decodeURIComponent(Array.from(n).map((n=>`%${n.toString(16)}`)).join(""))
}catch(n){throw new Error("Invalid UTF-8 sequence")}}function e(n){
if(n.p>=n.b.length)throw new Error("Unexpected EOF");return n.b[n.p++]}
function o(n){let t=0n,r=0n;for(;;){const o=e(n)
;if(t|=BigInt(127&o)<<r,128>o)break;r+=7n}return t}function i(n,t){const r=[]
;for(;;){const e=u(n,t);if(null==e)break;r.push(e)}return r}function u(n,t){
if(null==t&&n.p>=n.b.length)return null;const r=o(n),u=Number(7n&r),f=r>>3n
;switch(u){case 0:return{f:f,w:u,v:o(n)};case 1:case 5:{const t=1===u?8:4
;let r=0n;for(let o=0;t>o;o++){const t=e(n);r|=BigInt(t)<<BigInt(8*o)}return{
f:f,w:u,v:r}}case 2:{const t=Number(o(n))
;if(n.p+t>n.b.length)throw new Error("Unexpected EOF")
;const r=n.b.subarray(n.p,n.p+t);return n.p+=t,{f:f,w:u,v:r}}case 3:return{f:f,
w:u,v:i(n,f)};case 4:if(f===t)return null;throw new Error("Invalid group")
;default:throw new Error("Unexpected wire type")}}function f(n){return i({b:n,
p:0})}function F(n){const{w:t,v:r}=n;if(1===t){const n=0x7FFFFFFFFFFFFFFFn&r
;if(0n===n||n>=0x3000000000000000n&&0x5000000000000000n>n||0x7FF0000000000000n===n||0x7FF8000000000000n===n)return"double"
}if(5===t){const n=0x7FFFFFFFn&r
;if(0n===n||n>=0x30000000n&&0x50000000n>n||0x7F800000n===n||0x7FC00000n===n)return"float"
}if(r>=0xE0000000n&&0x100000000n>r){if(0===t)return"int32"
;if(5===t)return"sfixed32"}if(r>=0xE000000000000000n&&0x10000000000000000n>r){
if(0===t)return"int64";if(1===t)return"sfixed64"}
return 1===t?"fixed64":5===t?"fixed32":"uint64"}function c(n,t,r){
return s(f(n),t,r)}function s(n,r,e){const o={}
;for(const t of n)(o[t.f]??=[]).push(t);const i={},u=e[`message ${r}`]
;if(u)for(const[n,t]of Object.entries(u)){const r=o[t.id]??[];delete o[t.id]
;const u=R(t.type,e);let f
;f="repeated"===t.label?r.map((n=>z(n,u,t.type,e))):"optional"===t.label||t.oneofGroup?r.length>0?z(r[r.length-1],u,t.type,e):null:r.length>0?z(r[r.length-1],u,t.type,e):q[u],
i[n]=f}for(const n of Object.values(o)){const o=n[0].f,u=n.map((n=>{let o
;if(2===n.w)o=`unknown:bytes:${t(n.v)}`;else if(3===n.w)o=s(n.v,r,e);else{
const t=F(n);switch(t){case"double":o=`unknown:double:${L(J(n.v))}`;break
;case"float":o=`unknown:float:${L(K(n.v))}`;break;case"int32":case"sfixed32":
o=`unknown:${t}:${(0xFFFFFFFFn&n.v)-0x100000000n*(n.v>>31n&1n)}`;break
;case"int64":case"sfixed64":
o=`unknown:${t}:${(0xFFFFFFFFFFFFFFFFn&n.v)-0x10000000000000000n*(n.v>>63n&1n)}`
;break;default:o=`unknown:uint64:${n.v}`}}return o}))
;i[`#${o}`]=1===u.length?u[0]:u}return i}
const a=0,l=1,w=8,p=9,x=11,d=12,b=13,v=15,h=16,g=17,y=19,m=20,E=21,$=23,O=24,k=25,A=26,U=27,I=28,T=16,C=20,B=24,D=28
;function N(n){return 3==(3&n)}function j(n){return 1==(1&n)}function S(n){
return 4==(4&n)}const q={[l]:!1,8:0,9:0,[x]:0,[d]:"0",[b]:"0",[v]:"0",[h]:0,
[g]:0,[y]:0,[m]:"0",[E]:"0",[$]:0,[A]:"",[U]:""},G={bool:l,uint32:8,int32:9,
sint32:x,uint64:d,int64:b,sint64:v,fixed32:h,sfixed32:g,float:y,fixed64:m,
sfixed64:E,double:$,bytes:A,string:U};function R(n,t){if(n in G)return G[n]
;if(`message ${n}`in t)return O;throw new Error("TODO: enum, map, or group")}
function z(n,e,o,i){if(B>e){const t=T>e?0:C>e?5:1
;if(n.w!==t)throw new Error(`Expected wire type ${t}, got ${n.w}`)
;if(e===l)return!!n.v;if(e===a)throw new Error("TODO: enum")
;if(e===y)return H(K(n.v));if(e===$)return H(J(n.v))
;const r=N(e)?n.v>>1n^-(1n&n.v):j(e)?S(e)?(0xFFFFFFFFFFFFFFFFn&n.v)-((n.v>>63n&1n)<<64n):(0xFFFFFFFFn&n.v)-((n.v>>31n&1n)<<32n):n.v
;return S(e)?String(r):Number(r)}if(D>e){
if(2!==n.w)throw new Error(`Expected wire type 2, got ${n.w}`)
;if(e===A)return t(n.v);if(e===U)return r(n.v)
;if(e===k)throw new Error("TODO: map");return c(n.v,o,i)}
throw new Error("TODO: wire type 3")}function H(n){return 1/n==0||n!=n?`${n}`:n
}function J(n){return new Float64Array(BigUint64Array.of(n).buffer)[0]}
function K(n){return new Float32Array(Uint32Array.of(Number(n)).buffer)[0]}
function L(n){return 0===n&&0>1/n?"-0":`${n}`}function M(t,r,e){
return c(n(t),r,e)}return M(input,messageType,typedefs);
""";

SELECT parseProtobuf(b'\x08\x01', 'Main', JSON"""{
  "message Main": {
    "field1": { "type": "uint32", "id": 1 }
  }
}""")
```
