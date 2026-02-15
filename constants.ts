
import { TowerType, Coordinate, TowerSkill } from './types';

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

// 밸런스 조정
export const TOWER_COSTS: Record<TowerType, number> = {
  [TowerType.BASIC]: 50,    
  [TowerType.SNIPER]: 120,  
  [TowerType.RAPID]: 160,   
  [TowerType.BOMBER]: 350,  
  [TowerType.SHIELD]: 250,    
  [TowerType.LASER]: 600,   
  [TowerType.TESLA]: 850,   
};

export const SELL_REFUND_RATIO = 0.7;
export const UPGRADE_COST_MULTIPLIER = 1.5; 

export const SKILL_COSTS: Record<TowerSkill, number> = {
  [TowerSkill.STICKY]: 9999, // 상점에서 삭제됨
  [TowerSkill.CHAINSAW]: 500,
  [TowerSkill.AUTO_REPAIR]: 300,
};

// 상점에 표시될 스킬 목록 (끈끈이 삭제)
export const SKILL_INFO: Partial<Record<TowerSkill, { name: string; desc: string; targetTypes?: TowerType[] }>> = {
  [TowerSkill.CHAINSAW]: { 
    name: '즉사 전기톱', 
    desc: '5% 확률로 적 즉사',
    targetTypes: [TowerType.RAPID, TowerType.LASER]
  },
  [TowerSkill.AUTO_REPAIR]: { 
    name: '자가 수리', 
    desc: '파괴 시 2턴 후 부활',
    targetTypes: undefined
  },
};

// 타워 스탯 재조정
export const TOWER_STATS: Record<TowerType, { 
  range: number; 
  damage: number; 
  cooldown: number; 
  color: string; 
  name: string; 
  splashRadius?: number;
  income?: number; 
  health: number; 
}> = {
  [TowerType.BASIC]: { range: 4.5, damage: 0, cooldown: 800, color: '#3b82f6', name: '끈끈이 포탑', health: 600, splashRadius: 2.0 },
  [TowerType.SNIPER]: { range: 10.0, damage: 160, cooldown: 2200, color: '#ef4444', name: '레일건 스나이퍼', health: 300 }, 
  [TowerType.RAPID]: { range: 3.5, damage: 20, cooldown: 180, color: '#eab308', name: '초고속 연사포', health: 400 }, 
  [TowerType.BOMBER]: { range: 5.0, damage: 80, cooldown: 1600, color: '#d946ef', name: '중화력 폭격기', splashRadius: 3.0, health: 600 },
  [TowerType.SHIELD]: { range: 1.8, damage: 0, cooldown: 0, color: '#64748b', name: '수호 방패', health: 5000 }, 
  [TowerType.LASER]: { range: 6.0, damage: 450, cooldown: 150, color: '#06b6d4', name: '공간 절단 레이저', health: 450 }, // DPS 대폭 상향
  [TowerType.TESLA]: { range: 6.5, damage: 350, cooldown: 1100, color: '#8b5cf6', name: '테슬라 캐논', splashRadius: 5.5, health: 800 },
};

export const GAME_PATH: Coordinate[] = [
  { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
  { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 2, y: 5 }, { x: 2, y: 6 }, { x: 2, y: 7 }, { x: 2, y: 8 }, { x: 2, y: 9 }, { x: 2, y: 10 },
  { x: 3, y: 10 }, { x: 4, y: 10 },
  { x: 4, y: 9 }, { x: 4, y: 8 }, { x: 4, y: 7 }, { x: 4, y: 6 }, { x: 4, y: 5 }, { x: 4, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 2 },
  { x: 5, y: 2 }, { x: 6, y: 2 },
  { x: 6, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 6, y: 7 }, { x: 6, y: 8 }, { x: 6, y: 9 },
  { x: 7, y: 9 }, { x: 8, y: 9 },
  { x: 8, y: 8 }, { x: 8, y: 7 }, { x: 8, y: 6 }, { x: 8, y: 5 }, { x: 8, y: 4 }, { x: 8, y: 3 }, { x: 8, y: 2 }, { x: 8, y: 1 },
  { x: 9, y: 1 }, { x: 10, y: 1 },
  { x: 10, y: 2 }, { x: 10, y: 3 }, { x: 10, y: 4 }, { x: 10, y: 5 }, { x: 10, y: 6 }, { x: 10, y: 7 }, { x: 10, y: 8 },
  { x: 11, y: 8 },
  { x: 13, y: 8 }
];

export const INITIAL_MONEY = 350; 
export const INITIAL_LIVES = 20;
