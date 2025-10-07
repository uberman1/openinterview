import fs from 'fs'; import path from 'path';
const ROOT=process.cwd(), PUB=path.join(ROOT,'public'), JS=path.join(PUB,'js');
const HERE=path.dirname(new URL(import.meta.url).pathname);
function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
function backup(f){ if(fs.existsSync(f)) fs.copyFileSync(f,f+'.bak.'+Date.now()); }
function write(rel, from){
  const dest=path.join(PUB,rel); ensureDir(path.dirname(dest)); backup(dest);
  const src=path.join(HERE,'..','public',rel); fs.copyFileSync(src,dest); console.log('WROTE',rel);
}
function inject(rel){
  const file=path.join(PUB,rel); if(!fs.existsSync(file)) return;
  const html=fs.readFileSync(file,'utf8');
  if(html.includes('/js/header.avatar.bind.js')) return;
  const updated=html.replace(/<\/head>/i,'<script src="/js/header.avatar.bind.js" defer></script>\n</head>');
  if(updated!==html){ backup(file); fs.writeFileSync(file,updated,'utf8'); console.log('INJECTED header binder in',rel); }
}
(function main(){
  ensureDir(PUB); ensureDir(JS);
  write('home.html'); write('js/header.avatar.bind.js'); write('js/avatar.bind.js'); write('js/attachments.bind.js');
  ['uploads.html','subscription.html','password.html','profiles.html','availability.html','index.html'].forEach(inject);
  console.log('Patch applied.');
})();