(() => {
  const report = (type, message) => parent.postMessage({type, message}, '*');
  window.addEventListener('error', e => report('game-error', e.message));
  window.addEventListener('unhandledrejection', e => report('game-error', String(e.reason)));
  try {
    const sources=JSON.parse(document.getElementById('game-source').textContent), cache={};
    const compiled=JSON.parse(document.getElementById('game-compiled').textContent);
    const css=document.createElement('style');css.textContent=sources['styles.css']||'';document.head.append(css);
    function load(name, from='') {
      if(window.GameVendors[name]) return window.GameVendors[name];
      let path=name;
      if(name.startsWith('.')) {const parts=from.split('/');parts.pop();for(const p of name.split('/')){if(p==='..')parts.pop();else if(p!=='.')parts.push(p);}path=parts.join('/');}
      const key=[path,path+'.tsx',path+'.ts',path+'.js'].find(p=>Object.hasOwn(sources,p));
      if(!key) throw Error('지원하지 않는 모듈: '+name);
      if(cache[key])return cache[key].exports;
      const module={exports:{}};cache[key]=module;
      const code=compiled[key];
      if(typeof code!=='string')throw Error('변환된 코드가 없습니다: '+key);
      new Function('require','module','exports',code)(n=>load(n,key),module,module.exports);
      return module.exports;
    }
    load('index.tsx');
    let ticks=0;const ready=setInterval(()=>{if(document.querySelector('canvas')){clearInterval(ready);report('game-ready','');}else if(++ticks>100){clearInterval(ready);report('game-error','게임 화면을 만들지 못했습니다.');}},100);
  } catch(e) {document.getElementById('root').textContent='게임 실행 오류: '+e.message;report('game-error',e.message);}
})();
