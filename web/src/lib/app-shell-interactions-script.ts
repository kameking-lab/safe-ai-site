/**
 * Tiny nonce-protected DOM controller for global display settings and the
 * server-rendered mobile drawer. It never reads page inputs or sends requests.
 * Active-link state is deliberately excluded and follows Next usePathname.
 */
export const APP_SHELL_INTERACTIONS_SCRIPT = `(function(){
if(window.__safeAiAppShellInteractionsInstalled)return;
window.__safeAiAppShellInteractionsInstalled=true;
var details=null,menu=null,summary=null,initialized=false;
var volatileBooleans=Object.create(null),volatileTheme='system';
var configs={
furigana:{storageKey:'furigana-enabled',eventName:'anzen:furigana-change'},
easy:{storageKey:'easy-japanese-enabled',eventName:'anzen:easy-japanese-change'},
large:{storageKey:'large-font-enabled',rootClass:'large-font'},
contrast:{storageKey:'high-contrast-enabled',rootClass:'high-contrast'}
};
var focusableSelector="button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])";
function readBoolean(key){try{var stored=localStorage.getItem(key);if(stored==='true'||stored==='false')return stored==='true';}catch(e){}return volatileBooleans[key]===true;}
function storeBoolean(key,value){volatileBooleans[key]=value;try{localStorage.setItem(key,String(value));}catch(e){}}
function syncButtons(name,active){document.querySelectorAll('button[data-display-preference="'+name+'"]').forEach(function(button){button.setAttribute('aria-pressed',String(active));button.dataset.active=String(active);});}
function readTheme(){try{var stored=localStorage.getItem('anzen-theme');if(stored==='light'||stored==='dark'||stored==='system'){volatileTheme=stored;return stored;}}catch(e){}return volatileTheme;}
function syncTheme(theme){document.querySelectorAll('button[data-display-preference="theme"]').forEach(function(button){button.dataset.theme=theme;button.setAttribute('aria-label','テーマ切替。現在は'+(theme==='light'?'ライト':theme==='dark'?'ダーク':'端末設定'));});}
function applyTheme(theme){volatileTheme=theme;var dark=theme==='dark'||(theme==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light';try{localStorage.setItem('anzen-theme',theme);}catch(e){}window.dispatchEvent(new Event('anzen:theme-change'));syncTheme(theme);}
function visibleFocusable(){if(!menu)return[];return Array.prototype.filter.call(menu.querySelectorAll(focusableSelector),function(element){return !element.hidden&&element.getAttribute('aria-hidden')!=='true'&&window.getComputedStyle(element).display!=='none'&&window.getComputedStyle(element).visibility!=='hidden';});}
function focusMenuStart(){if(!details||!details.open)return;requestAnimationFrame(function(){if(!details||!details.open)return;var first=visibleFocusable()[0];if(first)first.focus();});}
function initialize(){if(initialized)return;initialized=true;details=document.querySelector('details[data-mobile-site-menu]');menu=document.getElementById('mobile-site-menu');summary=details?details.querySelector('summary'):null;if(details){details.dataset.appShellHydrated='true';details.addEventListener('toggle',focusMenuStart);if(details.open)focusMenuStart();}Object.keys(configs).forEach(function(name){var config=configs[name],active=readBoolean(config.storageKey);if(config.rootClass)document.documentElement.classList.toggle(config.rootClass,active);syncButtons(name,active);});syncTheme(readTheme());}
function handleKeyDown(event){if(event.defaultPrevented)return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();window.location.assign('/search');return;}if(event.key==='Tab'&&details&&details.open&&menu){var items=visibleFocusable(),first=items[0],last=items[items.length-1];if(!first||!last)return;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();return;}if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();return;}if(!menu.contains(document.activeElement)){event.preventDefault();(event.shiftKey?last:first).focus();return;}}if(event.key!=='Escape'||!details||!details.open)return;event.preventDefault();details.open=false;if(summary)requestAnimationFrame(function(){summary.focus();});}
function handleClick(event){var origin=event.target;if(!(origin instanceof Element))return;var navLink=origin.closest('a[data-app-shell-nav-href]');if(navLink&&details&&details.open)details.open=false;var button=origin.closest('button[data-display-preference]');if(!button)return;var name=button.dataset.displayPreference;if(name==='theme'){var order=['light','dark','system'],current=button.dataset.theme||readTheme();applyTheme(order[(order.indexOf(current)+1)%order.length]);return;}var config=configs[name];if(!config)return;var next=!readBoolean(config.storageKey);storeBoolean(config.storageKey,next);if(config.rootClass)document.documentElement.classList.toggle(config.rootClass,next);if(config.eventName)window.dispatchEvent(new Event(config.eventName));syncButtons(name,next);}
document.addEventListener('keydown',handleKeyDown,true);
document.addEventListener('click',handleClick);
window.__safeAiAppShellInteractionsDispose=function(){document.removeEventListener('keydown',handleKeyDown,true);document.removeEventListener('click',handleClick);if(details)details.removeEventListener('toggle',focusMenuStart);delete window.__safeAiAppShellInteractionsInstalled;delete window.__safeAiAppShellInteractionsDispose;};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
}());`;
