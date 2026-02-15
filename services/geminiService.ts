
import { GoogleGenAI } from "@google/genai";
import { GameState, Tower } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const getTacticalAdvice = async (
  gameState: GameState,
  towers: Tower[],
  enemyCount: number
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "API 키가 설정되지 않았습니다.";

  // Summarize tower composition
  const towerCounts = towers.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + (1 * t.level); // Level weighted count
      return acc;
  }, {} as Record<string, number>);
  
  const towerSummary = Object.entries(towerCounts)
    .map(([type, weight]) => `${type}(강도:${weight})`)
    .join(', ');

  const prompt = `
    당신은 타워 디펜스 전략가입니다. 업그레이드의 중요성을 강조하며 조언하세요.
    현재 상황을 보고 50자 이내의 긴박한 전술 조언을 하세요.
    업그레이드는 타워 공격력을 1.5배(50%)나 폭발적으로 상승시킵니다.
    
    [상황]
    - 웨이브: ${gameState.wave}
    - 체력: ${gameState.lives}
    - 자금: ${gameState.money}
    - 적 수: ${enemyCount}
    - 방어선 화력: ${towerSummary || '무방비'}
    
    조언 가이드:
    - 돈이 많으면 "새 타워보다 기존 타워 업그레이드가 화력 효율이 낫습니다!" 같은 조언 포함.
    - 금광이 적으면 "금광을 올려서 잭팟을 노려야 역전 가능합니다!" 유도.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "전술 데이터 수신 중...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "통신 불안정";
  }
};

export const getDifficultyReport = async (
  gameState: GameState,
  enemyStats: { hp: number; speed: number; reward: number },
  towersCount: number
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "API 키가 설정되지 않았습니다.";

  const prompt = `
    당신은 고도로 지능적인 군사 전략 AI입니다. 
    타워 업그레이드가 '공격력 50% 증가'라는 점을 핵심 전략으로 활용하여 보고서를 작성하세요.
    
    [데이터]
    - 현재 웨이브: ${gameState.wave}
    - 기지 내구도: ${gameState.lives}
    - 보유 자금: ${gameState.money}G
    - 타워 수: ${towersCount}
    - 적 스펙: HP ${enemyStats.hp.toFixed(0)}, Speed ${enemyStats.speed.toFixed(3)}
    
    다음 형식의 순수 텍스트 브리핑 (마크다운 제외):
    
    [전장 브리핑]
    1. 화력 증강 보고:
    (현재 적의 체력을 고려할 때, 타워를 새로 짓는 것보다 업그레이드하여 50% 데미지 보너스를 받는 것이 얼마나 유리한지 분석)
    
    2. 경제 순환 평가:
    (금광 업그레이드를 통해 웨이브당 +50G 확정 수익을 확보할 시점인지 판단)
    
    3. 차세대 업그레이드 추천:
    (현재 적의 속도와 물량을 볼 때 스나이퍼의 한방 화력이 필요한지, 연사포의 누적 딜이 필요한지 추천)
    
    4. 최후통첩:
    (패배 가능성에 대한 냉철한 경고)
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "데이터 분석 중...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "보고서 시스템 마비";
  }
};
