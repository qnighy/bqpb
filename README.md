## Protobuf parser for BigQuery

bqpb is a **self-contained, yet feature-complete** parser for the [Protocol Buffers](https://protobuf.dev/) format, which is intended for use on [BigQuery](https://cloud.google.com/bigquery/) as a [JavaScript UDF](https://cloud.google.com/bigquery/docs/reference/standard-sql/user-defined-functions#javascript-udfs).

### Supported features

- [x] Protobuf input
- [x] JSON output
- [x] JSON output conformance -- see [JSON Mapping](https://protobuf.dev/programming-guides/proto3/#json) defined in the spec.
- Supported types
  - [x] All integer types -- `uint32`, `int32`, `sint32`, `uint64`, `int64`, `sint64`, `fixed32`, `sfixed32`, `fixed64`, `sfixed64`
  - [x] `float` and `double`
  - [x] `bool`
  - [x] `bytes` and `string`
  - [x] `map`
  - [x] Enums
  - [x] Messages
- Supported field types
  - [x] optional
  - [x] repeated
  - [x] oneof (partially supported)
  - [x] group in proto2
- Supported special JSON serialization rules
  - [x] Any
  - [x] Generic JSON Values -- Value, Struct, ListValue, and NullValue
  - [x] Timestamp and Duration
  - [x] FieldMask
  - [x] Wrapper types -- `UInt32Value`, `Int32Value`, `UInt64Value`, `Int64Value`, `FloatValue`, `DoubleValue`, `BoolValue`, `StringValue`, `BytesValue`

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
const t=new Array(4*((n.length+2)/3|0)),e=(4*n.length+2)/3|0
;for(let r=0;e>r;r++){const e=.75*r+.75|0,o=(n[e-1]<<8|n[e])>>2+r%4*2&63
;t[r]=o+(26>o?65:52>o?71:62>o?-4:63>o?-19:-16)}
for(let n=e;n<t.length;n++)t[n]=61;return String.fromCharCode(...t)}
function e(n){try{
return decodeURIComponent(Array.from(n).map((n=>`%${n.toString(16)}`)).join(""))
}catch(n){throw new Error("Invalid UTF-8 sequence")}}function r(n){
if(n.p>=n.b.length)throw new Error("Unexpected EOF");return n.b[n.p++]}
function o(n){let t=0n,e=0n;for(;;){const o=r(n)
;if(t|=BigInt(127&o)<<e,128>o)break;e+=7n}return t}function i(n,t){let e=0n
;for(let o=0;t>o;o++){const t=r(n);e|=BigInt(t)<<BigInt(8*o)}return e}
function u(n,t){const e=[];for(;;){const r=f(n,t);if(null==r)break;e.push(r)}
return e}function f(n,t){if(null==t&&n.p>=n.b.length)return null
;const e=o(n),r=Number(7n&e),f=e>>3n;switch(r){case 0:return{f:f,w:r,v:o(n)}
;case 1:case 5:return{f:f,w:r,v:i(n,1===r?8:4)};case 2:{const t=Number(o(n))
;if(n.p+t>n.b.length)throw new Error("Unexpected EOF")
;const e=n.b.subarray(n.p,n.p+t);return n.p+=t,{f:f,w:r,v:e}}case 3:return{f:f,
w:r,v:u(n,f)};case 4:if(f===t)return null;throw new Error("Invalid group")
;default:throw new Error("Unexpected wire type")}}function s(n){return u({b:n,
p:0})}function c(n){const{w:t,v:e}=n;if(1===t){const n=0x7FFFFFFFFFFFFFFFn&e
;if(0n===n||n>=0x3000000000000000n&&0x5000000000000000n>n||0x7FF0000000000000n===n||0x7FF8000000000000n===n)return"double"
}if(5===t){const n=0x7FFFFFFFn&e
;if(0n===n||n>=0x30000000n&&0x50000000n>n||0x7F800000n===n||0x7FC00000n===n)return"float"
}if(e>=0xE0000000n&&0x100000000n>e){if(0===t)return"int32"
;if(5===t)return"sfixed32"}if(e>=0xE000000000000000n&&0x10000000000000000n>e){
if(0===t)return"int64";if(1===t)return"sfixed64"}
return 1===t?"fixed64":5===t?"fixed32":"uint64"}function a(n,t,e){
return l(s(n),t,e)}function l(n,t,e){const r=K(n,t,e)
;return void 0!==r?r:F(n,t,e)}function F(n,e,r){const u={}
;for(const t of n)(u[t.f]??=[]).push(t);const f={},s=r[`message ${e}`]
;if(s)for(const[n,t]of Object.entries(s)){const e=u[t.id]??[];delete u[t.id]
;const s=G(t.type,r,t.messageEncoding),c=null!=t.oneofGroup?"explicit":t.fieldPresence??"explicit"
;let a,l;if(s===O){const n=e.map((n=>J(n,s,t.type,r)))
;a=Object.fromEntries(n),l=!0}else if(t.repeated){let n=e;if(N>s){n=[]
;for(const r of e){if(2!==r.w){n.push(r);continue}const e={b:r.v,p:0}
;for(;e.p<r.v.length;)j>s?n.push({f:BigInt(t.id),w:0,v:o(e)}):n.push({
f:BigInt(t.id),w:B>s?5:1,v:i(e,B>s?4:8)})}}a=n.map((n=>J(n,s,t.type,r))),l=!0
}else"explicit"===c?(a=e.length>0?J(e[e.length-1],s,t.type,r):null,
l=e.length>0):(a=e.length>0?J(e[e.length-1],s,t.type,r):Z(s,t.type,r),l=!0)
;l&&(f[n]=a)}for(const n of Object.values(u)){const o=n[0].f,i=n.map((n=>{let o
;if(2===n.w)o=`unknown:bytes:${t(n.v)}`;else if(3===n.w)o=l(n.v,e,r);else{
const t=c(n);switch(t){case"double":o=`unknown:double:${_(P(n.v))}`;break
;case"float":o=`unknown:float:${_(R(n.v))}`;break;case"int32":case"sfixed32":
o=`unknown:${t}:${(0xFFFFFFFFn&n.v)-0x100000000n*(n.v>>31n&1n)}`;break
;case"int64":case"sfixed64":
o=`unknown:${t}:${(0xFFFFFFFFFFFFFFFFn&n.v)-0x10000000000000000n*(n.v>>63n&1n)}`
;break;default:o=`unknown:uint64:${n.v}`}}return o}))
;f[`#${o}`]=1===i.length?i[0]:i}return f}
const p=0,w=1,d=8,g=9,b=11,v=12,x=13,h=15,m=16,y=17,$=19,E=20,k=21,S=23,I=24,O=25,L=26,U=27,A=28,j=16,B=20,N=24,C=28
;function V(n){return 3==(3&n)}function T(n){return 1==(1&n)}function D(n){
return 4==(4&n)}function W(n){return n>=w&&k>=n&&n!=$||n===U}function Z(n,t,e){
if(n===p){const n=e[`enum ${t}`];return Object.entries(n)[0][0]??0}return q[n]}
const q={[w]:!1,[d]:0,[g]:0,[b]:0,[v]:"0",[x]:"0",[h]:"0",[m]:0,[y]:0,[$]:0,
[E]:"0",[k]:"0",[S]:0,[I]:null,[L]:"",[U]:""},z={bool:w,uint32:d,int32:g,
sint32:b,uint64:v,int64:x,sint64:h,fixed32:m,sfixed32:y,float:$,fixed64:E,
sfixed64:k,double:S,bytes:L,string:U};function G(n,t,e){
return n in z?z[n]:n.startsWith("map<")?O:`enum ${n}`in t?p:"delimited"===e?A:I
}function J(n,r,o,i){if(N>r){const t=j>r?0:B>r?5:1
;if(n.w!==t)throw new Error(`Expected wire type ${t}, got ${n.w}`)
;if(r===w)return!!n.v;if(r===p){const t=i[`enum ${o}`]
;for(const[e,r]of Object.entries(t))if(r===Number(n.v))return e
;return Number(n.v)}if(r===$)return M(R(n.v));if(r===S)return M(P(n.v))
;const e=V(r)?n.v>>1n^-(1n&n.v):T(r)?D(r)?(0xFFFFFFFFFFFFFFFFn&n.v)-((n.v>>63n&1n)<<64n):(0xFFFFFFFFn&n.v)-((n.v>>31n&1n)<<32n):n.v
;return D(r)?String(e):Number(e)}if(C>r){
if(2!==n.w)throw new Error(`Expected wire type 2, got ${n.w}`)
;if(r===L)return t(n.v);if(r===U)return e(n.v);if(r===O){
const t=o.indexOf(","),e=o.lastIndexOf(">"),r=o.slice(4,t).trim(),u=o.slice(t+1,e).trim(),f=G(r,i),c=G(u,i)
;if(!W(f)||c===O)throw new Error("Invalid map type")
;const a=s(n.v),l=a.findLast((n=>1n===n.f)),F=a.findLast((n=>2n===n.f))
;if(!l||!F)return null;return[J(l,f,r,i),J(F,c,u,i)]}return a(n.v,o,i)}
if(3!==n.w)throw new Error(`Expected wire type 3, got ${n.w}`)
;return l(n.v,o,i)}function M(n){return 1/n==0||n!=n?`${n}`:n}function P(n){
return new Float64Array(BigUint64Array.of(n).buffer)[0]}function R(n){
return new Float32Array(Uint32Array.of(Number(n)).buffer)[0]}function _(n){
return 0===n&&0>1/n?"-0":`${n}`}function H(t,e,r){return a(n(t),e,r)}
function K(n,t,e){if(!t.startsWith("google.protobuf."))return
;const r=t.slice(16)
;if(/^(U?Int(32|64)|Double|Float|Bool|String|Bytes)Value$/.test(r)){
const t=r.slice(0,-5).toLowerCase(),o=G(t,e),i=n.findLast((n=>1n===n.f))
;return i?J(i,o,t,e):Z(o,t,e)}switch(r){case"Any":{
const t=n.findLast((n=>1n===n.f)),r=n.findLast((n=>2n===n.f)),o=t?J(t,U,"string",e):""
;if(r&&2!==r.w)throw new Error(`Expected wire type 2, got ${r.w}`)
;const i=r?.v??new Uint8Array;if(o.startsWith("type.googleapis.com/")){
const n=o.slice(20),t=s(i),r=K(t,n,e);return void 0!==r?{"@type":o,value:r}:{
"@type":o,...F(t,n,e)}}break}case"Value":{
const t=n.findLast((n=>n.f>=1n&&7n>=n.f))
;if(!t)throw new Error("Invalid JSON Value");switch(t.f){case 1n:
return J(t,d,"uint32",e),null;case 2n:return J(t,S,"bool",e);case 3n:
return J(t,U,"string",e);case 4n:return J(t,w,"bool",e);case 5n:
return J(t,I,"google.protobuf.Struct",e);case 6n:
return J(t,I,"google.protobuf.ListValue",e)}break}case"Struct":{
const t=n.filter((n=>1n===n.f)).map((n=>J(n,O,"map<string,google.protobuf.Value>",e)))
;return Object.fromEntries(t)}case"ListValue":
return n.filter((n=>1n===n.f)).map((n=>J(n,I,"google.protobuf.Value",e)))
;case"FieldMask":
return n.filter((n=>1n===n.f)).map((n=>J(n,U,"string",e))).map((n=>n.replace(/_([a-z])/g,((n,t)=>t.toUpperCase())))).join(",")
;case"Timestamp":case"Duration":{
const t=n.findLast((n=>1n===n.f)),o=n.findLast((n=>2n===n.f)),i=t?Number(J(t,x,"",e)):0,u=o?J(o,g,"",e):0
;if("Timestamp"===r){
return new Date(1e3*i+u/1e6).toISOString().replace(/Z$/,`${(u%1e6).toString().padStart(6,"0")}Z`)
}
return 0>i?`-${-i}.${(-u).toString().padStart(9,"0")}s`:`${i}.${u.toString().padStart(9,"0")}s`
}}}return H(input,messageType,typedefs);
""";

SELECT parseProtobuf(b'\x08\x01', 'Main', JSON"""{
  "message Main": {
    "field1": { "type": "uint32", "id": 1 }
  }
}""")
```
