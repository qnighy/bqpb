## Protobuf parser for BigQuery

bqpb is a **self-contained, yet feature-complete** parser for the [Protocol Buffers](https://protobuf.dev/) format, which is intended for use on [BigQuery](https://cloud.google.com/bigquery/) as a [JavaScript UDF](https://cloud.google.com/bigquery/docs/reference/standard-sql/user-defined-functions#javascript-udfs).

### Supported features

- [x] Protobuf input
- [x] JSON output
- [x] JSON output conformance -- see [JSON Mapping](https://protobuf.dev/programming-guides/proto3/#json) defined in the spec.
- Schema support
  - [x] Rough inspection of the message without a schema
  - [x] Precise parsing and serialization of the message with a schema
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
    - [x] packed representation
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
// bqpb v0.1.0
// (c) 2023, Masaki Hara. Licensed under the MIT License.
"use strict";function t(t){
const n=(t+"=").indexOf("="),e=new Uint8Array(.75*n|0);for(let r=0;n>r;r++){
const n=t.charCodeAt(r),o=.75*r+.75|0,i=n-(96>n?64>n?48>n?47>n?-19:-16:-4:65:71)<<2+r%4*2
;e[o-1]|=i>>8,e[o]|=i}return e}function n(t){
const n=new Array(4*((t.length+2)/3|0)),e=(4*t.length+2)/3|0
;for(let r=0;e>r;r++){const e=.75*r+.75|0,o=(t[e-1]<<8|t[e])>>2+r%4*2&63
;n[r]=o+(26>o?65:52>o?71:62>o?-4:63>o?-19:-16)}
for(let t=e;t<n.length;t++)n[t]=61;return String.fromCharCode(...n)}
function e(t){try{
return decodeURIComponent(Array.from(t).map((t=>`%${t.toString(16).padStart(2,"0")}`)).join(""))
}catch(t){throw new Error("Invalid UTF-8 sequence")}}function r(t){
if(t.p>=t.b.length)throw new Error("Unexpected EOF");return t.b[t.p++]}
function o(t){let n=0n,e=0n;for(;;){const o=r(t)
;if(n|=BigInt(127&o)<<e,128>o)break;e+=7n}return n}function i(t,n){let e=0n
;for(let o=0;n>o;o++){const n=r(t);e|=BigInt(n)<<BigInt(8*o)}return e}
function u(t,n){const e=[];for(;;){const r=f(t,n);if(null==r)break;e.push(r)}
return e}function f(t,n){if(null==n&&t.p>=t.b.length)return null
;const e=o(t),r=Number(7n&e),f=e>>3n;switch(r){case 0:return{f:f,w:r,v:o(t)}
;case 1:case 5:return{f:f,w:r,v:i(t,1===r?8:4)};case 2:{const n=Number(o(t))
;if(t.p+n>t.b.length)throw new Error("Unexpected EOF")
;const e=t.b.subarray(t.p,t.p+n);return t.p+=n,{f:f,w:r,v:e}}case 3:return{f:f,
w:r,v:u(t,f)};case 4:if(f===n)return null;throw new Error("Invalid group")
;default:throw new Error("Unexpected wire type")}}function s(t){return u({b:t,
p:0})}function c(t,n,e){return a(s(t),n,e)}function a(t,n,e){const r=_(t,n,e)
;return void 0!==r?r:l(t,n,e)}function l(t,r,u){const f={}
;for(const n of t)(f[n.f]??=[]).push(n);const s={},l=u[`message ${r}`]
;if(l)for(const[t,n]of Object.entries(l)){const e=f[n.id]??[];delete f[n.id]
;const r=z(n.type,u,n.messageEncoding),c=null!=n.oneofGroup?"explicit":n.fieldPresence??"explicit"
;let a,l;if(r===O){const t=e.map((t=>G(t,r,n.type,u))).filter((t=>null!=t))
;a=Object.fromEntries(t),l=!0}else if(n.repeated){let t=e;if(B>r){t=[]
;for(const u of e){if(2!==u.w){t.push(u);continue}const e={b:u.v,p:0}
;for(;e.p<u.v.length;)j>r?t.push({f:BigInt(n.id),w:0,v:o(e)}):t.push({
f:BigInt(n.id),w:k>r?5:1,v:i(e,k>r?4:8)})}}a=t.map((t=>G(t,r,n.type,u))),l=!0
}else"explicit"===c?(a=e.length>0?G(e[e.length-1],r,n.type,u):null,
l=e.length>0):(a=e.length>0?G(e[e.length-1],r,n.type,u):W(r,n.type,u),l=!0)
;l&&(s[t]=a)}for(const t of Object.values(f)){const r=t[0].f,o=t.map((t=>{
if(2===t.w){try{const n=e(t.v)
;if(!/[\0-\x08\x0b-\x1F\x7F]/.test(n))return`unknown:string:${n}`}catch(t){}
try{return c(t.v,"",u)}catch(t){}return`unknown:bytes:${n(t.v)}`}
if(3===t.w)return a(t.v,"",u);{
const n=1===t.w?"double":5===t.w?"float":0x100000000n>t.v?"int32":"int64"
;return`unknown:${n}:${G(t,z(n,u),n,u)}`}}));s[`#${r}`]=1===o.length?o[0]:o}
return s}
const p=0,w=1,g=8,d=9,b=11,h=12,v=13,m=15,y=16,F=17,x=19,$=20,E=21,S=23,I=24,O=25,L=26,U=27,A=28,j=16,k=20,B=24,N=28
;function V(t){return!(3&~t)}function C(t){return!(1&~t)}function T(t){
return!(4&~t)}function D(t){return t>=w&&E>=t&&t!=x||t===U}function W(t,n,e){
if(t===p){const t=e[`enum ${n}`];return Object.entries(t)[0][0]??0}return Z[t]}
const Z={[w]:!1,[g]:0,[d]:0,[b]:0,[h]:"0",[v]:"0",[m]:"0",[y]:0,[F]:0,[x]:0,
[$]:"0",[E]:"0",[S]:0,[I]:null,[L]:"",[U]:""},q={bool:w,uint32:g,int32:d,
sint32:b,uint64:h,int64:v,sint64:m,fixed32:y,sfixed32:F,float:x,fixed64:$,
sfixed64:E,double:S,bytes:L,string:U};function z(t,n,e){
return t in q?q[t]:t.startsWith("map<")?O:`enum ${t}`in n?p:"delimited"===e?A:I
}function G(t,r,o,i){if(B>r){const n=j>r?0:k>r?5:1
;if(t.w!==n)throw new Error(`Expected wire type ${n}, got ${t.w}`)
;if(r===w)return!!t.v;if(r===p){const n=i[`enum ${o}`]
;for(const[e,r]of Object.entries(n))if(r===Number(t.v))return e
;return Number(t.v)}if(r===x)return J(P(t.v));if(r===S)return J(M(t.v))
;const e=V(r)?t.v>>1n^-(1n&t.v):C(r)?T(r)?(0xFFFFFFFFFFFFFFFFn&t.v)-((t.v>>63n&1n)<<64n):(0xFFFFFFFFn&t.v)-((t.v>>31n&1n)<<32n):t.v
;return T(r)?String(e):Number(e)}if(N>r){
if(2!==t.w)throw new Error(`Expected wire type 2, got ${t.w}`)
;if(r===L)return n(t.v);if(r===U)return e(t.v);if(r===O){
const n=o.indexOf(","),e=o.lastIndexOf(">"),r=o.slice(4,n).trim(),u=o.slice(n+1,e).trim(),f=z(r,i),c=z(u,i)
;if(!D(f)||c===O)throw new Error("Invalid map type")
;const a=s(t.v),l=a.findLast((t=>1n===t.f)),p=a.findLast((t=>2n===t.f))
;if(!l)return null;const w=G(l,f,r,i);if(!p){return[w,W(c,u,i)]}
return[w,G(p,c,u,i)]}return c(t.v,o,i)}
if(3!==t.w)throw new Error(`Expected wire type 3, got ${t.w}`)
;return a(t.v,o,i)}function J(t){return 1/t==0||t!=t?`${t}`:t}function M(t){
return new Float64Array(BigUint64Array.of(t).buffer)[0]}function P(t){
return new Float32Array(Uint32Array.of(Number(t)).buffer)[0]}function R(n,e,r){
return c(t(n),e,r)}function _(t,n,e){
if(!n.startsWith("google.protobuf."))return;const r=n.slice(16)
;if(/^(U?Int(32|64)|Double|Float|Bool|String|Bytes)Value$/.test(r)){
const n=r.slice(0,-5).toLowerCase(),o=z(n,e),i=t.findLast((t=>1n===t.f))
;return i?G(i,o,n,e):W(o,n,e)}switch(r){case"Any":{
const n=t.findLast((t=>1n===t.f)),r=t.findLast((t=>2n===t.f)),o=n?G(n,U,"string",e):""
;if(r&&2!==r.w)throw new Error(`Expected wire type 2, got ${r.w}`)
;const i=r?.v??new Uint8Array;if(o.startsWith("type.googleapis.com/")){
const t=o.slice(20),n=s(i),r=_(n,t,e);return void 0!==r?{"@type":o,value:r}:{
"@type":o,...l(n,t,e)}}break}case"Value":{
const n=t.findLast((t=>t.f>=1n&&7n>=t.f))
;if(!n)throw new Error("Invalid JSON Value");switch(n.f){case 1n:
return G(n,g,"uint32",e),null;case 2n:return G(n,S,"bool",e);case 3n:
return G(n,U,"string",e);case 4n:return G(n,w,"bool",e);case 5n:
return G(n,I,"google.protobuf.Struct",e);case 6n:
return G(n,I,"google.protobuf.ListValue",e)}break}case"Struct":{
const n=t.filter((t=>1n===t.f)).map((t=>G(t,O,"map<string,google.protobuf.Value>",e)))
;return Object.fromEntries(n)}case"ListValue":
return t.filter((t=>1n===t.f)).map((t=>G(t,I,"google.protobuf.Value",e)))
;case"FieldMask":
return t.filter((t=>1n===t.f)).map((t=>G(t,U,"string",e))).map((t=>t.replace(/_([a-z])/g,((t,n)=>n.toUpperCase())))).join(",")
;case"Timestamp":case"Duration":{
const n=t.findLast((t=>1n===t.f)),o=t.findLast((t=>2n===t.f)),i=n?Number(G(n,v,"",e)):0,u=o?G(o,d,"",e):0
;if("Timestamp"===r){
return new Date(1e3*i+u/1e6).toISOString().replace(/Z$/,`${(u%1e6).toString().padStart(6,"0")}Z`)
}
return 0>i?`-${-i}.${(-u).toString().padStart(9,"0")}s`:`${i}.${u.toString().padStart(9,"0")}s`
}}}return R(input,messageType,typedefs);
""";

SELECT parseProtobuf(b'\x08\x01', 'Main', JSON"""{
  "message Main": {
    "field1": { "type": "uint32", "id": 1 }
  }
}""")
```

### API Reference

See [parse-protobuf.md](docs/parse-protobuf.md).

### License

MIT License. See [LICENSE](LICENSE).
