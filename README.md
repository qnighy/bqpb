## Protobuf parser for BigQuery

### Usage

```sql
CREATE TEMP FUNCTION parseProtobuf(input BYTES, messageType STRING, typedefs JSON)
RETURNS JSON DETERMINISTIC
LANGUAGE js
AS r"""
"use strict";function n(n){
const t=(n+"=").indexOf("="),e=new Uint8Array(.75*t|0);for(let r=0;t>r;r++){
const t=n.charCodeAt(r),o=.75*r+.75|0,i=t-(96>t?64>t?48>t?47>t?-19:-16:-4:65:71)<<2+r%4*2
;e[o-1]|=i>>8,e[o]|=i}return e}function t(n){
if(n.p>=n.b.length)throw new Error("Unexpected EOF");return n.b[n.p++]}
function e(n){let e=0n,r=0n;for(;;){const o=t(n)
;if(e|=BigInt(127&o)<<r,128>o)break;r+=7n}return e}function r(n,t){const e=[]
;for(;;){const r=o(n,t);if(null==r)break;e.push(r)}return e}function o(n,o){
if(null==o&&n.p>=n.b.length)return null;const i=e(n),u=Number(7n&i),f=i>>3n
;switch(u){case 0:return{f:f,w:u,v:e(n)};case 1:case 5:{const e=1===u?8:4
;let r=0n;for(let o=0;e>o;o++){const e=t(n);r|=BigInt(e)<<BigInt(8*o)}return{
f:f,w:u,v:r}}case 2:{const t=Number(e(n))
;if(n.p+t>n.b.length)throw new Error("Unexpected EOF")
;const r=n.b.subarray(n.p,n.p+t);return n.p+=t,{f:f,w:u,v:r}}case 3:return{f:f,
w:u,v:r(n,f)};case 4:if(f===o)return null;throw new Error("Invalid group")
;default:throw new Error("Unexpected wire type")}}function i(n){return r({b:n,
p:0})}function u(n){const{w:t,v:e}=n;if(1===t){const n=0x7FFFFFFFFFFFFFFFn&e
;if(0n===n||n>=0x3000000000000000n&&0x5000000000000000n>n||0x7FF0000000000000n===n||0x7FF8000000000000n===n)return"double"
}if(5===t){const n=0x7FFFFFFFn&e
;if(0n===n||n>=0x30000000n&&0x50000000n>n||0x7F800000n===n||0x7FC00000n===n)return"float"
}if(e>=0xE0000000n&&0x100000000n>e){if(0===t)return"int32"
;if(5===t)return"sfixed32"}if(e>=0xE000000000000000n&&0x10000000000000000n>e){
if(0===t)return"int64";if(1===t)return"sfixed64"}
return 1===t?"fixed64":5===t?"fixed32":"uint64"}function f(n,t,e){
return F(i(n),t,e)}function F(n,t,e){const r={}
;for(const t of n)(r[t.f]??=[]).push(t);const o={},i=e[t]
;if(i)for(const[n,t]of Object.entries(i)){const i=r[t.id]??[];delete r[t.id]
;const u=S(t.type);let f
;f="repeated"===t.label?i.map((n=>q(n,u,t.type,e))):"optional"===t.label||t.oneofGroup?i.length>0?q(i[i.length-1],u,t.type,e):null:i.length>0?q(i[i.length-1],u,t.type,e):C[u],
o[n]=f}for(const n of Object.values(r)){const r=n[0].f,i=n.map((n=>{let r
;if(2===n.w)throw new Error("TODO");if(3===n.w)r=F(n.v,t,e);else{const t=u(n)
;switch(t){case"double":r=`unknown:double:${K(H(n.v))}`;break;case"float":
r=`unknown:float:${K(J(n.v))}`;break;case"int32":case"sfixed32":
r=`unknown:${t}:${(0xFFFFFFFFn&n.v)-0x100000000n*(n.v>>31n&1n)}`;break
;case"int64":case"sfixed64":
r=`unknown:${t}:${(0xFFFFFFFFFFFFFFFFn&n.v)-0x10000000000000000n*(n.v>>63n&1n)}`
;break;default:r=`unknown:uint64:${n.v}`}}return r}))
;o[`#${r}`]=1===i.length?i[0]:i}return o}
const c=0,s=1,l=8,a=9,w=11,x=12,p=13,b=15,d=16,v=17,h=19,g=20,y=21,E=23,O=24,$=25,k=26,m=27,A=28,T=16,U=20,D=24,B=28
;function I(n){return 3==(3&n)}function N(n){return 1==(1&n)}function j(n){
return 4==(4&n)}const C={[s]:!1,8:0,9:0,[w]:0,[x]:"0",[p]:"0",[b]:"0",[d]:0,
[v]:0,[h]:0,[g]:"0",[y]:"0",[E]:0,[k]:"",[m]:""},G={bool:s,uint32:8,int32:9,
sint32:w,uint64:x,int64:p,sint64:b,fixed32:d,sfixed32:v,float:h,fixed64:g,
sfixed64:y,double:E,bytes:k,string:m};function S(n){if(n in G)return G[n]
;throw new Error("TODO: enum, message, map, or group")}function q(n,t){if(D>t){
const e=T>t?0:U>t?5:1
;if(n.w!==e)throw new Error(`Expected wire type ${e}, got ${n.w}`)
;if(t===s)return!!n.v;if(t===c)throw new Error("TODO: enum")
;if(t===h)return z(J(n.v));if(t===E)return z(H(n.v))
;const r=I(t)?n.v>>1n^-(1n&n.v):N(t)?j(t)?(0xFFFFFFFFFFFFFFFFn&n.v)-((n.v>>63n&1n)<<64n):(0xFFFFFFFFn&n.v)-((n.v>>31n&1n)<<32n):n.v
;return j(t)?String(r):Number(r)}
throw B>t?new Error("TODO: wire type 2"):new Error("TODO: wire type 3")}
function z(n){return 1/n==0||n!=n?`${n}`:n}function H(n){
return new Float64Array(BigUint64Array.of(n).buffer)[0]}function J(n){
return new Float32Array(Uint32Array.of(Number(n)).buffer)[0]}function K(n){
return 0===n&&0>1/n?"-0":`${n}`}function L(t,e,r){return f(n(t),e,r)}
return L(input,messageType,typedefs);
""";

SELECT parseProtobuf(b'\x08\x01', 'Main', JSON"""{
  "Main": {
    "field1": { "type": "uint32", "id": 1 }
  }
}""")
```
