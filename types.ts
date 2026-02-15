
export enum TowerType {
  BASIC = 'BASIC',
  SNIPER = 'SNIPER',
  RAPID = 'RAPID',
  BOMBER = 'BOMBER',
  SHIELD = 'SHIELD',
  LASER = 'LASER',
  TESLA = 'TESLA',
}

export enum TowerSkill {
  STICKY = 'STICKY',
  CHAINSAW = 'CHAINSAW',
  AUTO_REPAIR = 'AUTO_REPAIR',
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  pathIndex: number; 
  health: number;
  maxHealth: number;
  speed: number;
  color: string;
  frozen: number; // 0 means not frozen, >0 means slowed frame counter
  isSlowed?: boolean;
  reward: number; 
}

export interface Tower {
  id: string;
  x: number;
  y: number;
  type: TowerType;
  range: number;
  damage: number;
  cooldown: number;
  lastShotTime: number;
  level: number;
  health: number; 
  maxHealth: number; 
  totalEarned?: number; 
  skills: TowerSkill[]; // Applied skills
  isBroken?: boolean; // For Auto Repair
  repairTimer?: number; // Waves until repair
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetId: string;
  speed: number;
  damage: number;
  color: string;
  splashRadius?: number;
  effectType?: 'normal' | 'crit' | 'execution' | 'instant_death' | 'sticky'; 
  hasChainsaw?: boolean; // 5% kill chance
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  text?: string; // For emoji or text particles
}

export interface GameState {
  money: number;
  lives: number;
  wave: number;
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  gameSpeed: number;
  isAutoStart: boolean; 
}

export const MAP_SIZE = 12;
