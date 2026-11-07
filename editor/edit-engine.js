export const FILES=['App.tsx','index.tsx','types.ts','constants.ts','components/GameCanvas.tsx','components/GameUI.tsx','styles.css'];
export function validSources(s){return s&&typeof s==='object'&&!Array.isArray(s)&&Object.keys(s).length===FILES.length&&FILES.every(f=>typeof s[f]==='string')&&JSON.stringify(s).length<=2000000;}
export function applyEdits(sources,content){
  let change;try{change=JSON.parse(content.replace(/^\s*```(?:json)?\s*/,'').replace(/\s*```\s*$/,''));}catch{throw Error('Invalid JSON. Return a complete valid JSON object without markdown.');}
  if(!Array.isArray(change.edits)||!change.edits.length||change.edits.length>120)throw Error('Return 1–120 concrete edits implementing the request, not just a description.');
  const next={...sources};
  for(const edit of change.edits){
    if(!FILES.includes(edit.file)||typeof edit.replace!=='string')throw Error('Invalid edit file or replace field.');
    if(edit.mode==='replace_file'){next[edit.file]=edit.replace;continue;}
    if(typeof edit.find!=='string'||!edit.find)throw Error('Use a nonempty unique find string or mode: replace_file for a complete file rewrite.');
    const text=next[edit.file],pos=text.indexOf(edit.find);
    if(pos<0||text.indexOf(edit.find,pos+1)>=0)throw Error(`Exact unique find failed in ${edit.file}. Copy the exact current substring including whitespace, or use mode: replace_file with the COMPLETE file. All changes in this attempt were discarded. Start from the supplied source.`);
    next[edit.file]=text.slice(0,pos)+edit.replace+text.slice(pos+edit.find.length);
  }
  if(!validSources(next))throw Error('Project exceeds 2,000,000 characters. Reduce the edit size.');
  return {sources:next,summary:typeof change.summary==='string'?change.summary.slice(0,4000):'게임을 수정했어요.'};
}
