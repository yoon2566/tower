const FILES=['App.tsx','index.tsx','types.ts','constants.ts','components/GameCanvas.tsx','components/GameUI.tsx','styles.css'];
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function onRequestPost({request,env}) {
  if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'같은 사이트에서 요청해주세요.'},403);
  if(!env.OPENROUTER_API_KEY)return reply({error:'AI 연결 설정이 필요합니다.'},503);
  try{
    const raw=await request.text();if(raw.length>550000)return reply({error:'게임 코드가 너무 큽니다.'},413);
    const {prompt,sources}=JSON.parse(raw);
    if(typeof prompt!=='string'||!prompt.trim()||prompt.length>3000||!sources||typeof sources!=='object'||Object.keys(sources).length!==FILES.length||FILES.some(f=>typeof sources[f]!=='string'))return reply({error:'요청 형식이 올바르지 않습니다.'},400);
    const system=`You edit an existing Korean tower-defense game. Preserve existing UI and gameplay except what the user requests. Sources are TypeScript/React modules compiled by Babel in a self-contained offline HTML. Available imports: react, react-dom/client, lucide-react (only existing imported icons), and existing relative modules. Do not add dependencies, network requests, storage access, navigation, eval, or new files. For new visual styles use inline styles or styles.css (existing Tailwind classes work; new Tailwind classes are not generated). Return ONLY valid JSON: {"summary":"short Korean description","edits":[{"file":"constants.ts","find":"exact unique existing substring","replace":"new code"}]}. Use small, exact, unique replacements. Multiple edits are applied sequentially. No markdown. Do not return the full project. Keep TS/JS syntax valid and keep all other features. If request is ambiguous choose reasonable game-related behavior. Never claim changes without edits.`;
    const upstream=await fetch('https://openrouter.ai/api/v1/messages',{method:'POST',headers:{Authorization:'Bearer '+env.OPENROUTER_API_KEY,'Content-Type':'application/json','HTTP-Referer':new URL(request.url).origin,'X-Title':'Tower Defense Editor'},body:JSON.stringify({model:'anthropic/claude-haiku-5.5',max_tokens:16000,thinking:{type:'disabled'},output_config:{effort:'high'},system,messages:[{role:'user',content:JSON.stringify({request:prompt,sources})}]}),signal:AbortSignal.timeout(150000)});
    if(!upstream.ok)return reply({error:upstream.status===429?'AI 요청이 많습니다. 잠시 후 다시 시도해주세요.':`AI 연결 실패 (${upstream.status}). 잠시 후 다시 시도해주세요.`},502);
    const result=await upstream.json();if(result.stop_reason==='max_tokens')return reply({error:'수정 내용이 너무 큽니다. 한 가지씩 요청해주세요.'},422);
    const content=result.content?.filter(x=>x.type==='text').map(x=>x.text).join('')||'';
    let change;try{change=JSON.parse(content.replace(/^\s*```(?:json)?\s*/,'').replace(/\s*```\s*$/,''));}catch{return reply({error:'AI 응답 형식이 올바르지 않습니다. 다시 요청해주세요.'},422);}
    if(!Array.isArray(change.edits)||!change.edits.length||change.edits.length>40)return reply({error:'적용할 수정 내용이 없습니다. 구체적으로 요청해주세요.'},422);
    const next={...sources};for(const edit of change.edits){if(!FILES.includes(edit.file)||typeof edit.find!=='string'||!edit.find||typeof edit.replace!=='string')return reply({error:'잘못된 수정 내용입니다.'},422);const text=next[edit.file];const pos=text.indexOf(edit.find);if(pos<0||text.indexOf(edit.find,pos+1)>=0)return reply({error:'수정 위치를 정확히 찾지 못했습니다. 다시 요청해주세요.'},422);next[edit.file]=text.slice(0,pos)+edit.replace+text.slice(pos+edit.find.length);}
    if(JSON.stringify(next).length>500000)return reply({error:'저장 가능한 게임 크기를 초과했습니다.'},422);
    return reply({sources:next,summary:typeof change.summary==='string'?change.summary.slice(0,2000):'게임을 수정했어요.'});
  }catch(e){return reply({error:e.name==='TimeoutError'?'AI 응답 시간이 초과되었습니다. 다시 시도해주세요.':'요청을 처리하지 못했습니다. 다시 시도해주세요.'},502);}
}
export const onRequestGet=()=>reply({error:'POST 요청만 지원합니다.'},405);
