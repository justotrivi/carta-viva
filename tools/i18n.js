/* i18n compartido para las páginas de Grupo Del Sol. Requiere: window.T = {es:{...}, en:{...}} y una función render(). */
const QS=new URLSearchParams(location.search);
const nombre=(QS.get('n')||'').trim().slice(0,30);
let LANG=(()=>{const p=QS.get('lang');if(p)return p==='en'?'en':'es';try{const s=localStorage.getItem('gds-lang');if(s==='en'||s==='es')return s}catch(e){}return /^en/i.test(navigator.language||'')?'en':'es'})();
const tr=k=>{const v=(T[LANG]||{})[k];return v===undefined?(T.es[k]??''):v};
const link=h=>{const u=new URLSearchParams();if(nombre)u.set('n',nombre);if(LANG==='en')u.set('lang','en');const s=u.toString();return h+(s?'?'+s:'')};
const waLink=(num,t)=>`https://wa.me/${num}?text=${encodeURIComponent(t+(nombre?tr('soy').replace('{n}',nombre):''))}`;
function setLang(l,save){LANG=l;if(save){try{localStorage.setItem('gds-lang',l)}catch(e){}}
  document.documentElement.lang=l;
  document.querySelectorAll('[data-i]').forEach(e=>{e.innerHTML=tr(e.dataset.i).replaceAll('{n}',nombre)});
  document.querySelectorAll('.lang button').forEach(b=>b.classList.toggle('on',b.dataset.l===l));
  try{const u=new URL(location.href);if(l==='en')u.searchParams.set('lang','en');else u.searchParams.delete('lang');history.replaceState(null,'',u)}catch(e){}
  if(typeof render==='function')render()}
document.write('<div class="lang" role="group" aria-label="Idioma / Language"><button data-l="es" type="button">ES</button><button data-l="en" type="button">EN</button></div>');
document.addEventListener('click',e=>{const b=e.target.closest('.lang button');if(b){e.stopPropagation();setLang(b.dataset.l,true)}},true);
document.write('<style>.lang{position:fixed;top:.85rem;right:.9rem;z-index:200;display:flex;gap:2px;background:rgba(0,0,0,.45);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.22);border-radius:99px;padding:3px}.lang button{appearance:none;border:0;background:none;cursor:pointer;font:600 .64rem Montserrat,system-ui,sans-serif;letter-spacing:.14em;color:rgba(255,255,255,.75);padding:.45rem .7rem;border-radius:99px;transition:background .3s,color .3s}.lang button.on{background:var(--lang-acc,#C9A66B);color:var(--lang-fg,#1A140B)}</style>');
