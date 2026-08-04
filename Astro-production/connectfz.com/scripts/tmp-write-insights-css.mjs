import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const liveHtml = await (
  await fetch("https://connectfz.com/insights/?nowprocket=1", {
    headers: { "User-Agent": "EOR/1.0" },
  })
).text();

// Find all CSS rules mentioning filter-button in style tags and linked CSS we have
const styleCss = [...liveHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
const filterHits = [...styleCss.matchAll(/[^{}]*filter-button[^{}]*\{[^}]*\}/gi)].map((m) => m[0]);
const btnHits = [...styleCss.matchAll(/button\.btn[^{]*\{[^}]*\}|\.btn\s*\{[^}]*\}/gi)].slice(0, 10).map((m) => m[0]);

console.log("filterHits", filterHits);
console.log("btnHits", btnHits.slice(0, 5));

// Check bootstrap btn on live
console.log("hasBootstrap", /bootstrap/i.test(liveHtml));

// Extract clean topic CSS from the big block
const big = [...liveHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].find((m) =>
  /\.loop-wrap\s*\{/.test(m[1]),
)?.[1] || "";

const start = big.indexOf("/*  new css */");
const relevant = start >= 0 ? big.slice(start) : big;
// Keep only insights-related chunks + media queries that touch them
const clean = `/* Live insights Articles-by-Topic card grid (from connectfz.com custom CSS) */

.top-info {
    display:flex;
    align-items:center;
    margin-top:25px;
    margin-bottom:15px;
}

.top-info .author{
    border-radius: 4px;
    background: rgba(245, 107, 1, 0.20);
    padding: 4px 8px;
    color:  #2E282A;
    font-family: Nunito, sans-serif;
    font-size: 14px;
    font-style: normal;
    font-weight: 600;
    line-height: 21px;
    letter-spacing: 0.28px;
    margin-right:20px;
}

.top-info .date{
    color: #2E282A;
    font-family: Nunito, sans-serif;
    font-size: 14px;
    font-style: normal;
    font-weight: 600;
    line-height:21px;
    letter-spacing: 0.28px;
}

.loop-wrap .post-grid {
    min-width: 0;
}

.loop-wrap .post-grid img,
.loop-wrap .post-grid .img-fluid {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 0;
}

.post-grid h3{
    color: #18191F;
    font-family: Nunito, sans-serif;
    font-size: 24px;
    font-style: normal;
    font-weight: 600;
    line-height: 30px;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin: 0 0 10px;
}

.post-grid p{
    color: #2E282A;
    font-family: Nunito, sans-serif;
    font-size: 16px;
    font-style: normal;
    font-weight: 400;
    line-height: 26px;
    letter-spacing: 0.32px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin: 0 0 12px;
}

.post-grid a{
    color: #F56B01;
    font-family: Nunito, sans-serif;
    font-size: 16px;
    font-style: normal;
    font-weight: 600;
    line-height: 26px;
    letter-spacing: 0.32px;
    text-decoration: none;
}

.post-grid a i{
    position:relative;
    left:5px;
    top:1.5px;
    font-size:18px;
}

.loop-wrap {
    display: grid;
    grid-template-columns: repeat(3,1fr);
    gap: 40px;
    margin-top: 20px;
}

/* Topic filter buttons — match live orange pills */
.elementor-shortcode .btn.filter-button,
button.btn.filter-button {
    display: inline-block;
    cursor: pointer;
    border: none;
    border-radius: 4px;
    background: #F56B01;
    color: #fff;
    margin: 0 8px 12px 0;
    padding: 10px 16px;
    font-family: Nunito, sans-serif;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.2;
    text-transform: uppercase;
    letter-spacing: 0.02em;
}

.elementor-shortcode .btn.filter-button:hover,
.elementor-shortcode .btn.filter-button.active,
.elementor-shortcode .btn.filter-button:focus-visible,
button.btn.filter-button:hover,
button.btn.filter-button.active,
button.btn.filter-button:focus-visible {
    color: #fff;
    background: #3d2f1f;
    outline: 0;
    box-shadow: none;
}

.elementor-shortcode .btn:focus {
    outline: 0;
    box-shadow: none !important;
}

#pagination-container {
    margin-top: 2rem;
    text-align: center;
}

#pagination-container .simple-pagination li {
    display: inline-block;
    float: none;
}

#pagination-container .simple-pagination .current,
#pagination-container .light-theme .current {
    background: #F56B01 !important;
    border-color: #F56B01 !important;
    color: #fff !important;
}

@media only screen and (max-width: 767px) {
  .post-grid h3{
      font-size: 20px;
  }
  .loop-wrap {
      grid-template-columns: repeat(1,1fr);
  }
}

@media only screen and (min-width: 768px) and (max-width: 991px)  {
  .post-grid h3{
      font-size: 18px;
  }
  .top-info .author {
      font-size: 12px;
      margin-right: 10px;
  }
  .top-info .date {
      font-size: 12px;
  }
  .loop-wrap {
      grid-template-columns: repeat(2,1fr);
      gap: 24px;
  }
}
`;

fs.writeFileSync(path.join(ROOT, "public/css/insights-topic-cards.css"), clean);
console.log("wrote clean css", clean.length);
console.log("relevant live snippet length", relevant.length);
