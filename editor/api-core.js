import {readModelStream} from './stream.js';
import {validSources,applyEdits} from './edit-engine.js';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const system=`You are a capable coding assistant editing a Korean tower-defense game. Implement the user's requested changes concretely, preserving unrelated features and UI. Current sources are the authoritative state; history explains intent and prior changes. Do not treat complexity as impossibility. New towers, skills, visual effects, enemies, maps and gameplay mechanics can be implemented with the existing React/Canvas modules. For artwork use procedural Canvas or inline SVG when external assets are unavailable. Explain genuine limitations honestly and implement the closest useful feasible version.
The supplied TS/React modules run in a sandboxed offline single HTML. Imports available: react, react-dom/client, lucide-react (existing imported icon names only), and existing relative modules. You may extensively modify any of the existing files, including types, game mechanics, rendering and UI together. No external dependencies, network, navigation, storage, eval, or new files. Add styles with inline styles or styles.css; new Tailwind classes are not compiled. Keep index.tsx mounting a canvas game. CSS text must be in styles.css, not imported as a JS module.
Return ONLY complete valid JSON: {"summary":"Korean explanation of actual changes","edits":[{"file":"constants.ts","find":"exact unique current substring","replace":"replacement code"}]}. Exact replacements apply sequentially. Prefer small unique patches. For large rewrites or ambiguous exact matches use {"file":"...","mode":"replace_file","replace":"COMPLETE new file contents"}. Never omit existing code using placeholders. Never claim success with empty edits. No markdown fences. Coordinate changes across types, rendering, stats and UI. Validate imports, syntax, variable names and game flow mentally before answering. If fixing a failed attempt, correct all related issues, not only the first error.`;
export async function edit({request,env},emit){
  if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'같은 사이트에서 요청해주세요.'},403);
  if(!env.OPENROUTER_API_KEY)return reply({error:'AI 연결 설정이 필요합니다.'},503);
  try{
    const raw=await request.text();if(raw.length>4300000)return reply({error:'게임 코드가 너무 큽니다.'},413);
    const {prompt,sources,history=[],repair}=JSON.parse(raw);
    if(typeof prompt!=='string'||!prompt.trim()||prompt.length>10000||!validSources(sources))return reply({error:'요청 형식 또는 게임 크기가 올바르지 않습니다.'},400);
    const recent=Array.isArray(history)?history.filter(x=>['user','assistant'].includes(x?.role)&&typeof x.content==='string').slice(-24).map(x=>({role:x.role,content:x.content.slice(0,10000)})):[];
    const base=repair&&validSources(repair.sources)?repair.sources:sources;
    const messages=[{role:'user',content:JSON.stringify({recentConversation:recent,request:prompt,sources:base,executionError:typeof repair?.error==='string'?repair.error.slice(0,4000):undefined,instruction:repair?'Fix the failed candidate so the original request works.':'Implement the request on the current source.'})}];
    let total=0;
    for(let attempt=0;attempt<2;attempt++){
      if(attempt)emit?.({type:'status',message:'수정 내용을 다시 검토하고 있어요…'});
      const response=await fetch('https://openrouter.ai/api/v1/messages',{method:'POST',headers:{Authorization:'Bearer '+env.OPENROUTER_API_KEY,'Content-Type':'application/json','HTTP-Referer':new URL(request.url).origin,'X-Title':'Tower Defense Editor'},body:JSON.stringify({model:'anthropic/claude-haiku-5.5',max_tokens:128000,stream:Boolean(emit),thinking:{type:'disabled'},output_config:{effort:'high'},system,messages}),signal:AbortSignal.timeout(1200000)});
      if(!response.ok)return reply({error:response.status===429?'AI 요청이 많습니다. 잠시 후 다시 시도해주세요.':`AI 연결 실패 (${response.status}). 잠시 후 다시 시도해주세요.`},502);
      let last=0;
      const result=emit?await readModelStream(response.body,n=>{last=n;emit({type:'progress',characters:total+n});}):await response.json();total+=last;
      const content=result.content?.filter(x=>x.type==='text').map(x=>x.text).join('')||'';
      try{if(result.stop_reason==='max_tokens')throw Error('Output was truncated. Return smaller precise patches rather than full files.');return reply(applyEdits(base,content));}
      catch(error){if(attempt===1)return reply({error:'자동 재시도 후에도 수정 내용을 적용하지 못했습니다. 변경할 대상을 조금 더 구체적으로 알려주세요.'},422);messages.push({role:'assistant',content:content.slice(0,180000)},{role:'user',content:'Your last edit failed validation: '+error.message+' Return corrected JSON. The source remains unchanged from the supplied source.'});}
    }
  }catch(e){return reply({error:e.name==='TimeoutError'?'AI 응답 시간이 초과되었습니다. 기존 게임은 유지됩니다.':'AI 응답을 처리하지 못했습니다. 기존 게임은 유지됩니다.'},502);}
}
export async function onRequestPost(context){
  if(!context.request.headers.get('Accept')?.includes('application/x-ndjson'))return edit(context);
  const encoder=new TextEncoder();let cancelled=false;
  const body=new ReadableStream({async start(controller){
    const send=value=>{if(cancelled)throw Error('Client disconnected');controller.enqueue(encoder.encode(JSON.stringify(value)+'\n'));};
    try{send({type:'progress',characters:0});const response=await edit(context,send);const data=await response.json();send(response.ok?{type:'result',...data}:{type:'error',error:data.error});}
    catch{if(!cancelled)send({type:'error',error:'AI 연결이 중단되었습니다. 다시 시도해주세요.'});}
    finally{if(!cancelled)controller.close();}
  },cancel(){cancelled=true;}});
  return new Response(body,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store, no-transform','X-Content-Type-Options':'nosniff'}});
}
export const onRequestGet=()=>reply({error:'POST 요청만 지원합니다.'},405);
