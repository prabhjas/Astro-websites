#!/usr/bin/env node
/** Download only assets needed by live-rendered page HTML/CSS (not stale peer CSS). */
import fs from "node:fs";
import path from "node:path";

const BASE = "http://127.0.0.1:5113";
const ORIGIN = "https://raadrecruitment.ae";
const PUBLIC = "public";
const UA = "Mozilla/5.0";
const pages = ["/", "/emiratisation/", "/contact-us/", "/blog/", "/recruitment/", "/staff-outsourcing-in-uae/", "/about-raad-recruitment/", "/mazaya/"];

function isHtml(b){const h=b.slice(0,80).toString("utf8").toLowerCase();return h.includes("<!doctype")||h.includes("<html");}
function isImage(b){if(!b||b.length<12)return false;if(b[0]===0xff&&b[1]===0xd8)return true;if(b[0]===0x89&&b[1]===0x50)return true;if(b.slice(0,4).toString()==="RIFF"&&b.slice(8,12).toString()==="WEBP")return true;if(b.slice(0,3).toString()==="GIF")return true;if(b.toString("utf8",0,100).includes("<svg"))return true;return false;}
function isFont(b){if(!b||b.length<4)return false;const a=b.slice(0,4).toString("ascii");return a==="wOF2"||a==="wOFF"||a==="OTTO"||a==="true"||(b[0]===0&&b[1]===1)||(b.length>1000&&!isHtml(b)&&!isImage(b));}

async function fetchBuf(url){
  const c=new AbortController();
  const t=setTimeout(()=>c.abort(),12000);
  try{
    const r=await fetch(url,{headers:{"User-Agent":UA},signal:c.signal});
    if(!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  }catch{return null;} finally{clearTimeout(t);}
}

function okLocal(rel){
  const p=path.join(PUBLIC, rel.replace(/^\//,""));
  if(!fs.existsSync(p)) return false;
  const b=fs.readFileSync(p);
  if(isHtml(b)) return false;
  if(/\.(png|jpe?g|webp|gif|svg)$/i.test(rel)) return isImage(b);
  if(/\.(woff2?|ttf|otf|eot)$/i.test(rel)) return isFont(b);
  return b.length>20;
}

async function download(rel){
  if(okLocal(rel)) return "skip";
  const dest=path.join(PUBLIC, rel.replace(/^\//,""));
  const tries=[ORIGIN+rel, ORIGIN+rel.replace(/-\d+x\d+(?=\.)/, "")];
  for(const u of [...new Set(tries)]){
    const b=await fetchBuf(u);
    if(!b||isHtml(b)) continue;
    const fine=(/\.(png|jpe?g|webp|gif|svg)$/i.test(rel)&&isImage(b))||(/\.(woff2?|ttf|otf|eot)$/i.test(rel)&&isFont(b));
    if(!fine) continue;
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest,b);
    return "dl";
  }
  return "fail";
}

const needed=new Set();
function add(u, cssPath){
  if(!u) return;
  u=u.trim().replace(/^url\(/i,"").replace(/\)$/,"").replace(/['"]/g,"");
  if(!u||u.startsWith("data:")) return;
  let pathname;
  try{
    if(u.startsWith("http")||u.startsWith("//")){
      const abs=u.startsWith("//")?"https:"+u:u;
      if(!new URL(abs).hostname.includes("raadrecruitment") && !abs.includes("127.0.0.1")) return;
      pathname=new URL(abs).pathname;
    } else if(u.startsWith("/")) pathname=u.split("?")[0];
    else if(cssPath){
      const dir=cssPath.replace(/\/[^/]*$/,"/");
      pathname=path.posix.normalize(dir+u.split("?")[0]);
    } else return;
  }catch{return;}
  if(/\.(png|jpe?g|webp|gif|svg|woff2?|ttf|otf|eot)(\?|$)/i.test(pathname)) needed.add(pathname.split("?")[0]);
}

for(const p of pages){
  const html=await (await fetch(BASE+p)).text();
  for(const m of html.matchAll(/\b(?:src|data-src|data-lazy-src|data-bg)=["']([^"']+)["']/gi)) add(m[1]);
  for(const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) for(const part of m[1].split(",")) add(part.trim().split(/\s+/)[0]);
  const css=[...html.matchAll(/href="([^"]+\.css[^"]*)"/gi)].map(m=>m[1].split("?")[0]).filter(h=>h.startsWith("/"));
  for(const href of css){
    const file=path.join(PUBLIC, href.slice(1));
    if(!fs.existsSync(file)) continue;
    const text=fs.readFileSync(file,"utf8");
    for(const m of text.matchAll(/url\(([^)]+)\)/gi)) add(m[1], href);
  }
}

console.log("page-needed", needed.size);
const missing=[...needed].filter(r=>!okLocal(r));
console.log("missing", missing.length);
let dl=0,fail=0; const fails=[];
for(const rel of missing){
  const r=await download(rel);
  if(r==="dl") dl++;
  else if(r==="fail"){ fail++; fails.push(rel); }
}
console.log({dl,fail});
fs.writeFileSync("scripts/_page-asset-fails.json", JSON.stringify(fails,null,2));
console.log(fails.slice(0,50));
