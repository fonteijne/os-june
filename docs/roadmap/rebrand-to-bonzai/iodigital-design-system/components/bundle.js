/* @ds-bundle: {"format":4,"namespace":"IO","components":[{"name":"Button"},{"name":"LinkArrow"},{"name":"Tag"},{"name":"SectionHeader"},{"name":"Card"},{"name":"Stat"},{"name":"TextField"}]} */
(function(){
var h=React.createElement;
function cx(){return Array.prototype.filter.call(arguments,Boolean).join(" ")}
function omit(o,k){var r={};for(var p in o){if(k.indexOf(p)<0)r[p]=o[p]}return r}
function Arrow(){return h("span",{className:"io-arrow","aria-hidden":"true"},"\u2192")}
function Button(p){var v=p.variant||"primary";var tag=p.href?"a":"button";
 return h(tag,Object.assign(omit(p,["variant","arrow","children","className"]),{className:cx("io-btn","io-btn--"+v,p.className)}),p.children,p.arrow?h(Arrow):null)}
function LinkArrow(p){return h("a",Object.assign(omit(p,["children","className"]),{className:cx("io-link",p.className)}),p.children,h(Arrow))}
function Tag(p){return h("span",{className:cx("io-tag",p.tone==="accent"&&"io-tag--accent")},p.children)}
function SectionHeader(p){return h("header",{className:"io-section-head"},p.eyebrow?h("span",{className:"io-eyebrow"},p.eyebrow):null,h("h2",null,p.title),p.lead?h("p",null,p.lead):null)}
function Card(p){return h(p.href?"a":"div",{href:p.href,className:cx("io-card",p.variant==="outline"&&"io-card--outline")},
 p.eyebrow?h("span",{className:"io-eyebrow"},p.eyebrow):null,h("h3",{className:"io-card__title"},p.title),
 p.children?h("p",{className:"io-card__body"},p.children):null,p.cta?h("span",{className:"io-card__foot"},p.cta,h(Arrow)):null)}
function Stat(p){return h("div",{className:"io-stat"},h("span",{className:"io-stat__value"},p.value),h("span",{className:"io-stat__label"},p.label))}
var n=0;
function TextField(p){var id=p.id||("io-f"+(++n));var eid=id+"-err";
 return h("label",{className:cx("io-field",p.error&&"io-field--error"),htmlFor:id},p.label,
  h("input",Object.assign(omit(p,["label","error","id"]),{id:id,className:"io-input","aria-invalid":p.error?"true":undefined,"aria-describedby":p.error?eid:undefined})),
  p.error?h("span",{className:"io-field__error",id:eid},p.error):null)}
window.IO={Button:Button,LinkArrow:LinkArrow,Tag:Tag,SectionHeader:SectionHeader,Card:Card,Stat:Stat,TextField:TextField};
})();
