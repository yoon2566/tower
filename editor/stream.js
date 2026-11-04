export function codeCharacters(text) {
  const fields=/"replace"\s*:\s*"/g;let match,total=0;
  while((match=fields.exec(text))){let value='',i=fields.lastIndex;
    for(;i<text.length;i++){const c=text[i];if(c==='"'){i++;break;}if(c==='\\'){if(i+1>=text.length)break;const next=text[++i];if(next==='u'){const hex=text.slice(i+1,i+5);if(!/^[0-9a-f]{4}$/i.test(hex))break;value+=String.fromCharCode(parseInt(hex,16));i+=4;}else value+=({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f'}[next]??next);}else value+=c;}
    if(/[\uD800-\uDBFF]$/.test(value))value=value.slice(0,-1);
    total+=Array.from(value).length;fields.lastIndex=i;
  }return total;
}
export async function readModelStream(body,onProgress){
  const reader=body.getReader(),decoder=new TextDecoder();let buffer='',content='',stop=null,complete=false;
  function line(raw){if(!raw.startsWith('data:'))return;const data=raw.slice(5).trim();if(!data||data==='[DONE]')return;const event=JSON.parse(data);
    if(event.type==='error')throw Error('AI 응답 중 오류가 발생했습니다. 다시 시도해주세요.');
    if(event.type==='content_block_delta'&&event.delta?.type==='text_delta'){content+=event.delta.text;onProgress(codeCharacters(content));}
    if(event.type==='message_delta')stop=event.delta?.stop_reason;
    if(event.type==='message_stop')complete=true;
  }
  try{while(true){const {value,done}=await reader.read();buffer+=decoder.decode(value,{stream:!done});let pos;while((pos=buffer.indexOf('\n'))>=0){line(buffer.slice(0,pos).trimEnd());buffer=buffer.slice(pos+1);}if(done)break;}if(buffer.trim())line(buffer.trimEnd());}finally{reader.releaseLock();}
  if(!complete)throw Error('AI 연결이 중단되었습니다. 기존 게임은 유지됩니다.');
  return {content:[{type:'text',text:content}],stop_reason:stop};
}
