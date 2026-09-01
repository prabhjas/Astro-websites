import{r as a,e as o,l as h,s as l,m as S,f as s,n as x}from"./parser-BjLl6_yf.js";import{i as B,p as z,d as m,a as C,b as L,c as T,e as A,g as _,f as R,h as j,j as P,k as G,l as V,m as I,n as N,o as H,q as F,r as M,s as D}from"./common-CIQc5GQ4.js";const W=t=>{if(!t.hasLabel)return"";const n={display:t.hasLabel?"inline-flex":"none",background:t.labelBg,color:t.labelColor},e=l(n),i=`border-color: rgba(0, 0, 0, 0) ${t.labelBg} rgba(0, 0, 0, 0)`;return`
    <div class="wptb-button-label" style="${e}">
      <div
        class="wptb-button-label-decorator"
        style="${i}"
      >
        <br />
      </div>
      <div>
        ${t.labelText||""}
      </div>
    </div>
  `},O=t=>{const n={...o(t.margin,"margin")},e={...o(t.padding,"padding"),borderRadius:h(t.borderRadius),"--wptb-btn-bg":t.background,"--wptb-btn-color":t.color,"--wptb-btn-hover-bg":t.hoverBg,"--wptb-btn-hover-color":t.hoverColor,"--wptb-btn-hover-scale":t.hoverScale,justifyContent:t.contentAlignment,position:"relative"},i={fontSize:t.fontSize??m.fontSize},c=l(n),d=l(e),r=l(i),g=t.fullWidth?{width:"100%"}:{},{tag:b,attrs:$}=S({url:t.url,target:t.linkTarget,rel:t.linkRel,convertToAbsolute:t.convertToAbsolute,className:"wptb-link-target",style:g,id:t.id}),k=[`wptb-size-${t.size}`,t.hasLabel?"wptb-button-has-label":""].filter(Boolean).join(" "),y=t.iconSize??m.iconSize,v=t.iconPosition??m.iconPosition,w=t.iconSVG?`<div class="wptb-button-icon" style="width: ${y}; height: ${y}">${t.iconSVG}</div>`:"";return`
    <div style="${c}" class="wptb-button-container wptb-ph-element wptb-element-button-404 wptb-preview-block">
      <div class="wptb-button-wrapper ${k}" style="justify-content: ${t.buttonAlignment}">
        <${b} ${$}>
          <div class="wptb-button wptb-plugin-button-order-${v}" style="${d}">
            <p style="${r}">${t.text}</p>
            ${w}
            ${W(t)}
          </div>
        </${b}>
      </div>
    </div>
  `};a({name:"button",parse:z,render:O,isBlock:B});const Y=t=>{const n={...o(t.margin,"margin"),...o(t.padding,"padding")};return`
    <div class="wptb-custom_html-container" style="${l(n)}">
      <div class="wptb-custom-html-wrapper">${t.html}</div>
    </div>
  `};a({name:"custom-html",render:Y,isBlock:L,parse:C});const E=t=>{const n={...o(t.margin,"margin"),...o(t.padding,"padding")},e={justifyContent:t.alignment},i=l(n),c=_(t),d=[`style="${l(c)}"`,`src="${s(t.src)}"`,`alt="${s(t.alt)}"`,...Object.entries(t.attrs||{}).map(([$,k])=>`${$}="${s(k)}"`)].join(" "),{tag:r,attrs:g}=S({url:t.url,target:t.linkTarget,rel:t.linkRel,convertToAbsolute:t.convertToAbsolute,className:"wptb-link-target",style:e,attrs:t.linkAttrs}),b=t.src?`<img ${d} />`:"";return`
    <div class="wptb-image-container" style="${i}">
      <div class="wptb-image-wrapper">
        <${r} ${g}>${b}</${r}>
      </div>
    </div>
  `};a({name:"image",render:E,isBlock:A,parse:T});const X=(t,n)=>{const{padding:e,margin:i}=t,c={...o(e,"padding"),...o(i,"margin")};return`<div class="wptb-list-container" style="${l(c)}"><ul>${n||""}</ul></div>`};a({name:"list",parse:R,render:X,isBlock:t=>t.classList.contains("wptb-list-container")});const q=(t,n,e)=>{var v;const i=(v=t.toolTip)==null?void 0:v.trim(),c=e[0];let d="wptb-in-element";i&&(d+=` wptb-tooltip wptb-tooltip-${t.tooltipPosision}`);const r={marginBottom:c.itemSpacing},g={color:t.color??c.color,fontSize:c.fontSize,justifyContent:{left:"flex-start",right:"flex-end"}[t.alignment||c.alignment]||"center"},b=l(g),$=l(r),k=c.type==="unordered"?`wptb-list-style-type-${c.listIcon}`:"",y=i?`<div class="wptb-m-tooltip">${i}</div>`:"";return`
    <li class="${d}" style="${$}">
      <div class="wptb-list-item-content" style="position: relative">
        <div class="wptb-list-item-text ${k}" data-list-style-type-index="${t.index}." style="${b}">
          <div class="wptb-list-item-text-content">${t.text||""}</div>
        </div>
      </div>
      ${y}
    </li>
  `};a({name:"list-item",parse:null,render:q,isBlock:()=>!1});const Z=t=>{const n={...o(t.margin,"margin"),...o(t.padding,"padding")};return`
    <div class="wptb-shortcode-container" style="${l(n)}">
      <div style="position: relative">${t.shortcode}</div>
    </div>
  `};a({name:"shortcode",parse:j,render:Z,isBlock:t=>t.classList.contains("wptb-shortcode-container")});let u=0;const J=(t,n,e,i)=>{u++;const c=Math.max(0,Math.min(n-t,1))*150;return`<svg xmlns="http://www.w3.org/2000/svg" height="${i}" width="${i}" viewBox="-10 -10 170 170"><defs><mask id="wptb_star_rating_filter-${u}-${t}"><rect height="150" width="${c}" y="0" x="0" fill="#fff"/></mask></defs><path fill="none" stroke-width="5" d="m0.75,56.89914l56.02207,0l17.31126,-56.14914l17.31126,56.14914l56.02206,0l-45.32273,34.70168l17.31215,56.14914l-45.32274,-34.70262l-45.32274,34.70262l17.31215,-56.14914l-45.32274,-34.70168z" stroke="${s(e)}"/><path class="star" mask="url(#wptb_star_rating_filter-${u}-${t})" fill="${s(e)}" stroke-width="5" d="m0.75,56.89914l56.02207,0l17.31126,-56.14914l17.31126,56.14914l56.02206,0l-45.32273,34.70168l17.31215,56.14914l-45.32274,-34.70262l-45.32274,34.70262l17.31215,-56.14914l-45.32274,-34.70168z" stroke="${s(e)}"/></svg>`},K=t=>{const n={textAlign:t.alignment||"center",...o(t.margin,"margin"),...o(t.padding,"padding")},e=t.value||0,i=t.fontSize||"15px",c={fontSize:i,lineHeight:i,height:i,color:t.color||""},d=t.maxValue||0,r=t.showRating?"block":"none",g=t.starColor||"#000000",b=t.starSize||"20px",$=l(n),k=l(c),y=Array(d).fill(0).map((v,w)=>`<li>${J(w,e,g,b)}</li>`).join("");return`
    <div data-star-count="${d}" style="${$}" class="wptb-star_rating-container">
      <div class="wptb-rating-stars-box">
        <ul class="wptb-rating-stars-list">${y}</ul>
        <div class="wptb-number-rating-box" style="display: ${r}">
          <div class="wptb-number-rating" style="${k}">${+e.toFixed(2)}/${d}</div>
        </div>
      </div>
    </div>`};a({name:"star-rating",parse:P,render:K,isBlock:t=>t.classList.contains("wptb-star_rating-container")});const Q=t=>{const n={color:t.color,fontSize:t.fontSize,"--wptb-link-color":t.linkColor,...o(t.padding,"padding"),...o(t.margin,"margin")},e=t.linkColor?" wptb-has-link-color":"",i=l(n);return`
    <div class="wptb-text-container${e}" style="${i}">
      <div>${t.text||""}</div>
    </div>
  `};a({name:"text",parse:G,render:Q,isBlock:t=>t.classList.contains("wptb-text-container")});const U={left:"flex-start",right:"flex-end",center:"center"},p=t=>{const n={color:t.color,fontSize:t.fontSize,justifyContent:U[t.alignment],...o(t.margin,"margin"),...o(t.padding,"padding")},e={background:t.background,...x(t.borderRadius)},i=l(n),c=l(e);return`<div class="wptb-badge-block" style="${i}">
    <div class="wptb-badge-block-text" style="${c}">${t.text||""}</div>
  </div>`};a({name:"badge",parse:V,render:p,isBlock:t=>t.classList.contains("wptb-badge-container")});const tt=t=>{const n={...o(t==null?void 0:t.margin,"margin"),...o(t==null?void 0:t.padding,"padding")},e=parseInt((t==null?void 0:t.size)||"100"),i=t.value||0,c=(t==null?void 0:t.ratingType)==="number"?"":"%",d=(t==null?void 0:t.color)||"rgb(48, 123, 187)";let r=(t==null?void 0:t.total)||100;c?r=100:r<1&&(r=1);const g=8,b=(e-g)/2,$=2*Math.PI*b,k=i/r*$;return`
  <div class="wptb-circle-rating-block" style="${l(n)}">
    <svg width="${e}" height="${e}" viewBox="0 0 ${e} ${e}">
      <circle cx="${e/2}" cy="${e/2}" r="${b}" fill="whitesmoke"/>
      <circle cx="${e/2}" cy="${e/2}" r="${b}" stroke="#cccccc" stroke-width="${g}" fill="none"/>
      <circle cx="${e/2}" cy="${e/2}" r="${b}" stroke="${s(d)}" stroke-width="${g}" fill="none" stroke-dasharray="${$}" stroke-dashoffset="${$-k}" stroke-linecap="round" transform="rotate(-90 ${e/2} ${e/2})"/>
      <text
        x="50%"
        y="50%"
        text-anchor="middle"
        dominant-baseline="central"
        fill="${s(d)}"
        font-size="${e*.22}"
        font-weight="bold"
      >
        ${t.ratingType==="percentage"?parseFloat(i.toFixed(1)):`${i}/${r}`}${c}
      </text>
    </svg>
  </div>
  `};a({name:"circle-rating",parse:I,render:tt,isBlock:t=>t.classList.contains("wptb-circle_rating-container")});const et={left:"flex-start",center:"center",right:"flex-end"},nt=(t,n)=>{const e={fill:t==null?void 0:t.color,justifyContent:et[(t==null?void 0:t.alignment)||"center"],...o(t==null?void 0:t.margin,"margin"),...o(t==null?void 0:t.padding,"padding"),"--wptb-icon-block-size":t==null?void 0:t.size};return`
  <div class="wptb-icon-block" style="${l(e)}">
    ${n||""}
  </div>
  `};a({name:"icon",parse:N,render:nt,isBlock:t=>t.classList.contains("wptb-icon-container")});const it=t=>{const{tag:n,attrs:e}=S({url:t.url,target:t.linkTarget,rel:t.linkRel,convertToAbsolute:t.convertToAbsolute}),i=t!=null&&t.color?{fill:t.color}:{};return`
  <div class="wptb-icon-block-item" style="${l(i)}">
    <${n} ${e}>${t.iconSVG}</${n}>
  </div>`};a({name:"icon-item",parse:()=>({name:"icon-item",props:{icon:"star",convertToAbsolute:!1,iconSVG:""}}),render:it,isBlock:t=>t.classList.contains("wptb-icon-block-item")});const lt=t=>{const n={...o(t.margin,"margin"),...o(t.padding,"padding")},e=l({color:t.color}),i=l(n),c=l({background:t.primaryColor,height:`calc(2 * ${t.thickness})`,width:`${t.value}%`});return`
    <div class="wptb-progress-bar-block" style="${i}">
      <div class="wptb-progress-bar-block-main" style="background: ${s(t.secondaryColor)}">
        <div class="wptb-progress-bar-block-progress" style="${c}"></div>
      </div>
      <div class="wptb-progress-bar-block-value" style="${e}">${t.value}%</div>
    </div>
  `};a({name:"progress-bar",parse:H,render:lt,isBlock:t=>t.classList.contains("wptb-progress_bar-container")});const f=t=>{const n=t.individual,e={width:n.width,top:n.positionY,left:n.positionX,color:t.color,fontSize:t.fontSize,filter:"drop-shadow(4px 6px 2px rgba(0, 0, 0, 0.1))"};return`<div class="wptb-ribbon-block wptb-ribbon-block-bookmark wptb-preview-block" style="${l(e)}">
    <div class="wptb-ribbon-block-bookmark-text" style="background: ${s(t.background)}">${t.text||""}</div>
    <svg preserveAspectRatio="none" viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="color: ${s(t.background)}"><path d="M0 40V0H64V38.5714L32.5 19.6429L0 40Z" fill="currentColor"/></svg>
  </div>`},ct=t=>{const n=t.individual,e={color:t.color,fontSize:t.fontSize,[n.side==="right"?"right":"left"]:"-5px"};return`<div class="wptb-ribbon-block wptb-ribbon-block-corner wptb-preview-block" style="${l(e)}">
    <div class="wptb-ribbon-block-corner-${n.side}">
      <div class="wptb-ribbon-block-corner-text" style="background: ${s(t.background)}">${t.text||""}</div>
    </div>
  </div>`},ot=t=>{const n=t.individual,e={color:t.color,fontSize:t.fontSize,top:n.positionY,left:n.positionX,background:t.background,borderColor:t.borderColor||t.background};return`<div class="wptb-ribbon-block wptb-ribbon-block-rectangle wptb-preview-block" style="${l(e)}">
    <div>${t.text||""}</div>
  </div>`},st=t=>{const n=t.individual,e={color:t.color,fontSize:t.fontSize,top:n.positionY,[n.side==="right"?"right":"left"]:"-20px"},i=l(e),c=s(t.borderColor||t.background);return`<div class="wptb-ribbon-block wptb-ribbon-block-side wptb-ribbon-block-side-${n.side} wptb-preview-block" style="${i}">
    <div class="wptb-ribbon-block-side-text" style="background: ${s(t.background)}; border-color: ${c}">
      <div>${t.text||""}</div>
    </div>
    <div class="wptb-ribbon-block-side-shadow" style="background: ${s(t.background)}"/></div>
  </div>`},at=t=>{const n=t.individual,e={color:t.color,fontSize:t.fontSize,top:n.positionY},i=l(e);return`<div class="wptb-ribbon-block wptb-ribbon-block-icon wptb-ribbon-block-icon-${n.side} wptb-preview-block" style="${i}">
    <div class="wptb-ribbon-block-icon-icon" style="background: ${s(t.background)}; fill: ${s(t.color)}" data-wptb-animation="${s(n.animation)}">${n.iconSVG}</div>
      <div class="wptb-ribbon-block-icon-text-container">
        <div class="wptb-ribbon-block-icon-text" style="background: ${s(t.background)}">${t.text||""}</div>
        <div class="wptb-ribbon-block-icon-triangle" style="background: ${s(t.background)}"/>
      </div>
    </div>
  </div>`},rt=t=>{switch(t.type){case"bookmark":return f(t);case"corner":return ct(t);case"rectangle":return ot(t);case"side":return st(t);case"icon":return at(t);default:return f(t)}};a({name:"ribbon",parse:F,render:rt,isBlock:t=>t.classList.contains("wptb-ribbon_element-container")});const dt=(t,n)=>{const e={...o(t.padding,"padding"),...o(t.margin,"margin"),color:t.color,fontSize:t.fontSize};return`<ul class="wptb-styled-list-block" style="${l(e)}">${n||""}</ul>`};a({name:"styled-list",parse:M,render:dt,isBlock:t=>t.classList.contains("wptb-styled_list-container")});const bt=(t,n)=>t?`<div class="wptb-list-tooltip wptb-list-tooltip-${n}">${t}</div>`:"",gt=(t,n,e)=>{const i=e[0];if(!i)return"";const c={marginBottom:i.itemSpacing,gap:i.iconSpacing},d={width:i.iconSize,height:i.iconSize,fill:t.iconColor??i.iconColor},r={},g=t.color??i.color;g&&(r.color=g);const b=l(c),$=l(d),k=l(r),y=bt(t.toolTip,t.tooltipPosision),v=t.iconSVG??i.iconSVG;return`
    <li class="wptb-styled-list-item-block" style="${b}">
      <div class="wptb-styled-list-item-icon" style="${$}">${v}</div>
      <div class="wptb-styled-list-item-text"${k?` style="${k}"`:""}>${t.text||""}</div>
      ${y}
    </li>
  `};a({name:"styled-list-item",parse:()=>({name:"styled-list-item",props:{text:"List Item",tooltipPosision:"top"}}),render:gt,isBlock:t=>t.classList.contains("wptb-styled-list-item-block")});const $t={left:{left:"flex-start",center:"center",right:"flex-end"},right:{right:"flex-start",center:"center",left:"flex-end"}},kt=t=>{const n={fill:t.iconColor,fontSize:t.fontSize,justifyContent:$t[t.iconSide][t.alignment||"center"],...o(t.margin,"margin"),...o(t.padding,"padding"),gap:t.iconSpacing,flexDirection:t.iconSide==="left"?"row":"row-reverse","--wptb-icon-size":t.iconSize,color:t.color};return`<div class="wptb-text-icon-block wptb-preview-block" style="${l(n)}"><div class="wptb-text-icon-block-icon">${t.iconSVG}</div><div class="wptb-text-icon-block-text">${t.text||""}</div></div>`};a({name:"text-icon",parse:D,render:kt,isBlock:t=>t.classList.contains("wptb-text_icon_element-container")});const yt={registerFBlock:a};window.WPTB_FRONTEND=yt;
