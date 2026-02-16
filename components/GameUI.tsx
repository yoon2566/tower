import React, { useState, useEffect } from 'react';
import { TowerType, Tower, TowerSkill } from '../types';
import { TOWER_COSTS, TOWER_STATS, SELL_REFUND_RATIO, UPGRADE_COST_MULTIPLIER, SKILL_COSTS, SKILL_INFO } from '../constants';
import { Coins, Heart, Zap, Crosshair, ShieldAlert, Play, Swords, Pause, Bomb, FastForward, ChevronDown, ChevronUp, X, Trash2, Hammer, ZoomIn, ZoomOut, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, TrendingUp, Sparkles, BatteryCharging, RefreshCcw, Skull, Target, Flame, ArrowRightCircle, Repeat, Check, BookOpen, Star, ShieldCheck, Shield } from 'lucide-react';

interface GameUIProps {
  money: number;
  lives: number;
  wave: number;
  selectedTower: TowerType | null;
  onSelectTower: (type: TowerType | null) => void;
  onNextWave: () => void;
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  onRestart: () => void;
  onTogglePause: () => void;
  hoveredTowerInfo: { tower: Tower, x: number, y: number } | null;
  gameSpeed: number;
  onToggleSpeed: () => void;
  selectedPlacedTower: { tower: Tower, x: number, y: number } | null;
  onSellTower: () => void;
  onUpgradeTower: () => void;
  onCloseSelection: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPan: (dx: number, dy: number) => void;
  isAutoStart: boolean;
  onToggleAutoStart: () => void;
  selectedSkill: TowerSkill | null;
  onSelectSkill: (skill: TowerSkill | null) => void;
  skillTargetTower: Tower | null;
  onApplySkill: () => void;
  onCancelSkill: () => void;
}

const TowerTooltip = ({ type, x, y, isBottom = false }: { type: TowerType, x: number, y: number, isBottom?: boolean }) => {
    const stat = TOWER_STATS[type];
    const isSlow = [TowerType.SNIPER, TowerType.BOMBER, TowerType.TESLA].includes(type);
    
    return (
        <div
            className="absolute bg-slate-900/95 backdrop-blur-sm text-white p-3 rounded-xl border border-slate-600 shadow-2xl z-[60] w-60 pointer-events-none transition-opacity duration-200 animate-fade-in hidden md:block"
            style={{
                left: x,
                top: y,
                transform: isBottom ? 'translate(-50%, -100%) translateY(-10px)' : 'translate(-50%, -100%) translateY(-20px)'
            }}
        >
            <div className="flex items-center justify-between mb-2 border-b border-slate-700 pb-2">
                <h3 className="font-bold text-sm text-yellow-400">{stat.name}</h3>
                <span className="text-[10px] bg-slate-800 px-1.5 rounded border border-slate-700">Lv.1</span>
            </div>
            <div className="space-y-1 text-xs text-slate-300">
                {type === TowerType.SHIELD ? (
                  <>
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1"><Shield size={12}/> 내구도</span>
                        <span className="font-mono font-bold text-emerald-400">{stat.health}</span>
                    </div>
                    <div className="mt-2 p-1.5 bg-blue-500/10 rounded border border-blue-500/20 text-[10px] text-blue-200 leading-tight">
                        <ShieldCheck size={10} className="inline mr-1"/>
                        주변 2.5칸 이내 타워를 보호합니다. 본체는 막대한 체력을 가집니다.
                    </div>
                  </>
                ) : type === TowerType.BASIC ? (
                   <>
                    <div className="flex justify-between items-center text-blue-300">
                        <span className="flex items-center gap-1 font-bold"><ShieldCheck size={12}/> 끈끈이 효과</span>
                    </div>
                    <div className="text-[10px] text-slate-400 pl-1 leading-tight mb-2">
                        공격력은 없지만 적의 이동속도를 50% 감소시킵니다. (스플래시)
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1"><Zap size={12}/> 주기</span>
                        <span className="font-mono font-bold text-white">{(stat.cooldown / 1000).toFixed(2)}s</span>
                    </div>
                   </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1"><Swords size={12}/> 공격력</span>
                        <span className="font-mono font-bold text-white">{stat.damage}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1"><Zap size={12}/> 주기</span>
                        <span className="font-mono font-bold text-white">{(stat.cooldown / 1000).toFixed(2)}s</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1"><Crosshair size={12}/> 사거리</span>
                        <span className="font-mono font-bold text-white">{stat.range}</span>
                    </div>
                    {isSlow && (
                      <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-700">
                         <div>
                             <div className="flex items-center gap-1 text-[10px] text-orange-400 font-bold mb-0.5">
                                <Target size={10}/> 치명타 (20% 확률)
                             </div>
                             <div className="text-[10px] text-slate-400 pl-3.5 leading-tight">
                                {type === TowerType.SNIPER && "2배 피해"}
                                {type === TowerType.BOMBER && "3배 피해 (스플레시)"}
                                {type === TowerType.TESLA && "5배 피해 (스플레시)"}
                             </div>
                         </div>
                         <div>
                             <div className="flex items-center gap-1 text-[10px] text-red-400 font-bold mb-0.5">
                                <Flame size={10}/> 처형 (HP 50%↓)
                             </div>
                             <div className="text-[10px] text-slate-400 pl-3.5 leading-tight">
                                {type === TowerType.SNIPER && "40% 확률로 즉사, 실패 시 3배 피해"}
                                {type === TowerType.BOMBER && "10배 피해 (스플래시)"}
                                {type === TowerType.TESLA && "즉사 (단일 대상)"}
                             </div>
                         </div>
                      </div>
                    )}
                  </>
                )}
            </div>
        </div>
    );
};

const GameUI: React.FC<GameUIProps> = ({
  money,
  lives,
  wave,
  selectedTower,
  onSelectTower,
  onNextWave,
  isPlaying,
  isPaused,
  isGameOver,
  onRestart,
  onTogglePause,
  hoveredTowerInfo,
  gameSpeed,
  onToggleSpeed,
  selectedPlacedTower,
  onSellTower,
  onUpgradeTower,
  onCloseSelection,
  zoom,
  onZoomIn,
  onZoomOut,
  onPan,
  isAutoStart,
  onToggleAutoStart,
  selectedSkill,
  onSelectSkill,
  skillTargetTower,
  onApplySkill,
  onCancelSkill
}) => {
  const [hoveredBuildType, setHoveredBuildType] = useState<TowerType | null>(null);
  const [hoveredButtonRect, setHoveredButtonRect] = useState<{x: number, y: number} | null>(null);
  const [showMenu, setShowMenu] = useState(true);
  const [showShop, setShowShop] = useState(false);

  const handleBuildEnter = (type: TowerType, e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setHoveredBuildType(type);
      setHoveredButtonRect({ x: rect.left + rect.width / 2, y: rect.top });
  };

  const renderTowerIcon = (type: TowerType, size: number = 20, className: string = "text-white") => {
      switch(type) {
        case TowerType.RAPID: return <Zap size={size} className={className} />;
        case TowerType.BASIC: return <ShieldAlert size={size} className={className} />;
        case TowerType.BOMBER: return <Bomb size={size} className={className} />;
        case TowerType.SHIELD: return <Shield size={size} className={className} />;
        case TowerType.LASER: return <Sparkles size={size} className={className} />;
        case TowerType.TESLA: return <BatteryCharging size={size} className={className} />;
        default: return <Crosshair size={size} className={className} />;
      }
  };

  const getUpgradeCost = (t: Tower) => Math.floor(TOWER_COSTS[t.type] * Math.pow(UPGRADE_COST_MULTIPLIER, t.level));

  const getNextStats = (t: Tower) => {
      if (t.type === TowerType.SHIELD) {
          return {
             health: Math.floor(t.health * 1.2)
          }
      }
      return {
          damage: t.type === TowerType.BASIC ? 0 : Math.floor(t.damage * 1.5),
          range: t.range * 1.08,
          cooldown: t.cooldown * 0.94
      };
  };

  const getSellPrice = (tower: Tower) => {
    let totalInvested = TOWER_COSTS[tower.type];
    for (let i = 1; i < tower.level; i++) {
        totalInvested += Math.floor(TOWER_COSTS[tower.type] * Math.pow(UPGRADE_COST_MULTIPLIER, i));
    }
    return Math.floor(totalInvested * SELL_REFUND_RATIO);
  };

  const shopSkills = Object.values(TowerSkill).filter(skill => SKILL_INFO[skill]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between overflow-hidden">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center pointer-events-auto p-2 md:p-4 gap-2 absolute top-0 left-0 right-16 md:right-0 z-50">
            <div className="bg-slate-900/80 backdrop-blur-md p-2 md:p-3 rounded-xl border border-slate-700 text-white shadow-lg flex gap-3 items-center h-10 md:h-12">
                <div className="flex items-center gap-1 md:gap-2">
                    <Heart className="text-red-500 fill-red-500" size={16} />
                    <span className="text-sm md:text-lg font-bold">{lives}</span>
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                    <Coins className="text-yellow-400 fill-yellow-400" size={16} />
                    <span className="text-sm md:text-lg font-bold">{money}</span>
                </div>
                <div className="flex items-center gap-1 md:gap-2 pl-2 border-l border-slate-600">
                    <ShieldAlert className="text-blue-400" size={16} />
                    <span className="text-sm md:text-lg font-bold">W {wave}</span>
                </div>
            </div>

            <button onClick={onToggleSpeed} className="bg-slate-900/80 hover:bg-slate-700 text-white px-3 rounded-xl border border-slate-700 font-bold shadow-lg flex items-center justify-center gap-1 backdrop-blur-md h-10 md:h-12 transition-all active:scale-95">
                <FastForward size={16} className={gameSpeed !== 1 ? "text-yellow-400 fill-yellow-400" : "text-white"} />
                <span className="text-xs md:text-sm">{gameSpeed}x</span>
            </button>

             <button onClick={onToggleAutoStart} className={`px-3 rounded-xl border font-bold shadow-lg flex items-center justify-center gap-1 backdrop-blur-md h-10 md:h-12 transition-all active:scale-95 ${isAutoStart ? 'bg-emerald-600/90 border-emerald-500 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-400'}`}>
                <Repeat size={16} className={isAutoStart ? "animate-spin-slow" : ""} />
                <span className="text-xs md:text-sm">AUTO</span>
            </button>

            <button onClick={onTogglePause} disabled={!isPlaying || isGameOver} className="bg-slate-900/80 hover:bg-slate-700 text-white px-3 rounded-xl border border-slate-700 font-bold shadow-lg flex items-center justify-center backdrop-blur-md h-10 md:h-12 disabled:opacity-30">
                {isPaused ? <Play size={16} className="fill-white"/> : <Pause size={16} className="fill-white"/>}
            </button>
      </div>

      {/* Special Shop Button */}
      <div className="absolute top-2 md:top-4 right-2 md:right-4 pointer-events-auto z-50">
        <button
            onClick={() => setShowShop(!showShop)}
            className={`p-2 md:p-3 rounded-xl border font-bold shadow-lg flex items-center justify-center gap-2 backdrop-blur-md transition-all active:scale-95 h-10 md:h-auto ${showShop ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900/80 text-indigo-300 border-indigo-500/50 hover:bg-slate-800'}`}
        >
            <BookOpen size={18} />
            <span className="hidden md:inline text-sm">특수 상점</span>
        </button>

        {showShop && (
            <div className="absolute top-14 right-0 w-64 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 animate-fade-in-down">
                <div className="text-sm font-bold text-slate-400 mb-1 px-1">특수 스킬 구매</div>
                {shopSkills.map(skill => {
                    const info = SKILL_INFO[skill]!;
                    const cost = SKILL_COSTS[skill];
                    const canAfford = money >= cost;
                    return (
                        <button 
                            key={skill}
                            onClick={() => { onSelectSkill(skill); setShowShop(false); }}
                            disabled={!canAfford}
                            className={`flex flex-col text-left p-2 rounded-xl border transition-all ${canAfford ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-indigo-500' : 'bg-slate-800/50 border-slate-800 opacity-50 cursor-not-allowed'}`}
                        >
                            <div className="flex justify-between items-center w-full">
                                <span className="font-bold text-sm text-indigo-300">{info.name}</span>
                                <span className={`text-xs font-bold ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>{cost}G</span>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1">{info.desc}</span>
                        </button>
                    )
                })}
            </div>
        )}
      </div>

      {/* Skill Application Overlay */}
      {selectedSkill && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-4 animate-bounce pointer-events-auto">
              <div className="flex flex-col items-center">
                <span className="font-bold text-sm">스킬 적용 모드</span>
                <span className="text-xs text-indigo-200">{skillTargetTower ? '클릭하여 적용 확인' : '타워를 선택하세요'}</span>
              </div>
              {skillTargetTower && (
                   <button onClick={onApplySkill} className="bg-white text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-indigo-50">적용</button>
              )}
              <button onClick={onCancelSkill} className="bg-indigo-800 p-1 rounded-full hover:bg-indigo-900"><X size={14}/></button>
          </div>
      )}

      {/* Pan & Zoom Controls */}
      <div className="absolute left-2 md:left-auto md:right-4 bottom-56 md:top-1/2 md:-translate-y-1/2 md:bottom-auto flex flex-col items-center gap-0.5 md:gap-1 pointer-events-auto opacity-60 hover:opacity-100 z-40 transition-opacity">
        <button onClick={() => onPan(0, 50)} className="p-1.5 md:p-3 bg-slate-800/80 rounded-full text-white border border-slate-600 hover:bg-slate-700 active:scale-95 shadow-lg"><ArrowUp size={16} className="md:hidden" /><ArrowUp size={24} className="hidden md:block" /></button>
        <div className="flex gap-2 md:gap-4">
            <button onClick={() => onPan(50, 0)} className="p-1.5 md:p-3 bg-slate-800/80 rounded-full text-white border border-slate-600 hover:bg-slate-700 active:scale-95 shadow-lg"><ArrowLeft size={16} className="md:hidden" /><ArrowLeft size={24} className="hidden md:block" /></button>
            <button onClick={() => onPan(-50, 0)} className="p-1.5 md:p-3 bg-slate-800/80 rounded-full text-white border border-slate-600 hover:bg-slate-700 active:scale-95 shadow-lg"><ArrowRight size={16} className="md:hidden" /><ArrowRight size={24} className="hidden md:block" /></button>
        </div>
        <button onClick={() => onPan(0, -50)} className="p-1.5 md:p-3 bg-slate-800/80 rounded-full text-white border border-slate-600 hover:bg-slate-700 active:scale-95 shadow-lg"><ArrowDown size={16} className="md:hidden" /><ArrowDown size={24} className="hidden md:block" /></button>
      </div>

      <div className="absolute right-2 md:right-4 bottom-56 md:bottom-36 flex flex-col gap-2 pointer-events-auto z-40">
        <div className="flex flex-col bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700 overflow-hidden shadow-lg items-center w-9 md:w-12">
            <button onClick={onZoomIn} className="w-full p-1.5 md:p-3 hover:bg-slate-700 text-white border-b border-slate-600 active:bg-slate-600 flex items-center justify-center"><ZoomIn size={14} className="md:hidden" /><ZoomIn size={16} className="hidden md:block" /></button>
            <div className="w-full py-0.5 md:py-1 text-[9px] md:text-xs font-mono flex items-center justify-center text-slate-300 bg-slate-800/50">{Math.round(zoom * 100)}%</div>
            <button onClick={onZoomOut} className="w-full p-1.5 md:p-3 hover:bg-slate-700 text-white active:bg-slate-600 flex items-center justify-center"><ZoomOut size={14} className="md:hidden" /><ZoomOut size={16} className="hidden md:block" /></button>
        </div>
      </div>

      {/* Tooltips */}
      {hoveredTowerInfo && !selectedPlacedTower && !selectedSkill && <TowerTooltip type={hoveredTowerInfo.tower.type} x={hoveredTowerInfo.x} y={hoveredTowerInfo.y} />}
      {hoveredBuildType && hoveredButtonRect && !selectedPlacedTower && showMenu && <TowerTooltip type={hoveredBuildType} x={hoveredButtonRect.x} y={hoveredButtonRect.y} isBottom={true}/>}

      {/* Overlays */}
      {isGameOver && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center pointer-events-auto z-[100] animate-fade-in">
           <div className="bg-slate-900 border-2 border-red-500/50 p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full text-center">
              <div className="bg-red-500/20 p-6 rounded-full border-4 border-red-500/30 animate-pulse">
                <Skull size={64} className="text-red-500" />
              </div>
              <div className="space-y-1">
                <h2 className="text-4xl font-black text-white">GAME OVER</h2>
                <p className="text-slate-400 font-medium">최종 방어 실패</p>
              </div>
              <div className="bg-slate-800/50 w-full py-4 rounded-2xl border border-slate-700">
                <div className="text-slate-400 text-sm">진행 웨이브</div>
                <div className="text-3xl font-black text-yellow-400">{wave}</div>
              </div>
              <button onClick={onRestart} className="w-full flex items-center justify-center gap-3 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl transition-all hover:scale-105 active:scale-95 group">
                <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                다시 시작하기
              </button>
           </div>
        </div>
      )}

      {/* Compact Next Wave Button */}
      {!isPlaying && !isGameOver && !isAutoStart && (
        <div className="absolute bottom-56 md:bottom-32 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-20 pointer-events-auto z-40">
            <button onClick={onNextWave} className="group flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 md:px-5 md:py-3 rounded-full font-bold shadow-xl transition-all active:scale-95 border-2 border-emerald-400">
                <span className="text-xs md:text-sm">시작하기!</span>
                <ArrowRightCircle size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
      )}

      {/* Mobile Build Tooltip */}
      {selectedTower && !selectedPlacedTower && showMenu && (
        <div className="md:hidden fixed bottom-[120px] left-2 right-2 z-[60] pointer-events-none animate-fade-in">
          <div className="bg-slate-900/95 backdrop-blur-sm text-white p-3 rounded-xl border border-slate-600 shadow-2xl mx-auto max-w-xs">
            {(() => {
              const stat = TOWER_STATS[selectedTower];
              const isSlow = [TowerType.SNIPER, TowerType.BOMBER, TowerType.TESLA].includes(selectedTower);
              return (
                <>
                  <div className="flex items-center justify-between mb-2 border-b border-slate-700 pb-2">
                    <h3 className="font-bold text-sm text-yellow-400">{stat.name}</h3>
                    <span className="text-[10px] bg-slate-800 px-1.5 rounded border border-slate-700">Lv.1</span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-300">
                    {selectedTower === TowerType.SHIELD ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1"><Shield size={12}/> 내구도</span>
                          <span className="font-mono font-bold text-emerald-400">{stat.health}</span>
                        </div>
                        <div className="mt-2 p-1.5 bg-blue-500/10 rounded border border-blue-500/20 text-[10px] text-blue-200 leading-tight">
                          <ShieldCheck size={10} className="inline mr-1"/>주변 2.5칸 이내 타워를 보호합니다.
                        </div>
                      </>
                    ) : selectedTower === TowerType.BASIC ? (
                      <>
                        <div className="flex justify-between items-center text-blue-300">
                          <span className="flex items-center gap-1 font-bold"><ShieldCheck size={12}/> 끈끈이 효과</span>
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight">적의 이동속도를 50% 감소 (스플래시)</div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between"><span className="flex items-center gap-1"><Swords size={12}/> 공격력</span><span className="font-mono font-bold text-white">{stat.damage}</span></div>
                        <div className="flex justify-between"><span className="flex items-center gap-1"><Zap size={12}/> 주기</span><span className="font-mono font-bold text-white">{(stat.cooldown / 1000).toFixed(2)}s</span></div>
                        <div className="flex justify-between"><span className="flex items-center gap-1"><Crosshair size={12}/> 사거리</span><span className="font-mono font-bold text-white">{stat.range}</span></div>
                        {isSlow && (
                          <div className="mt-2 space-y-1 pt-2 border-t border-slate-700">
                            <div className="text-[10px]"><span className="text-orange-400 font-bold"><Target size={10} className="inline mr-1"/>치명타 (20%)</span> <span className="text-slate-400">{selectedTower === TowerType.SNIPER ? '2배' : selectedTower === TowerType.BOMBER ? '3배 스플' : '5배 스플'}</span></div>
                            <div className="text-[10px]"><span className="text-red-400 font-bold"><Flame size={10} className="inline mr-1"/>처형 (HP50%↓)</span> <span className="text-slate-400">{selectedTower === TowerType.SNIPER ? '40% 즉사/실패 3배' : selectedTower === TowerType.BOMBER ? '10배 스플' : '즉사'}</span></div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* BOTTOM HUD */}
      <div className={`pointer-events-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-700 p-2 md:p-3 shadow-2xl z-50 fixed bottom-0 left-0 right-0 flex justify-center transition-transform duration-300 ${showMenu ? 'translate-y-0' : 'translate-y-full'}`}>
        <button onClick={() => setShowMenu(!showMenu)} className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/95 text-slate-400 hover:text-white p-1 px-4 rounded-t-xl border-t border-x border-slate-700 shadow-lg">{showMenu ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}</button>

        {selectedPlacedTower ? (
            <div className="flex flex-row items-center gap-2 md:gap-6 w-full max-w-5xl justify-between animate-fade-in-up px-2">
                <div className="flex items-center gap-2 md:gap-4 flex-1">
                    <div className="w-12 h-12 md:w-20 md:h-20 rounded-2xl flex items-center justify-center shadow-lg border border-slate-600 shrink-0 relative overflow-hidden group" style={{backgroundColor: TOWER_STATS[selectedPlacedTower.tower.type].color}}>
                        {renderTowerIcon(selectedPlacedTower.tower.type, 32)}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-[10px] md:text-xs text-white py-0.5 text-center font-bold">Lv.{selectedPlacedTower.tower.level}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm md:text-xl font-black text-white truncate">
                                {TOWER_STATS[selectedPlacedTower.tower.type].name}
                            </h3>
                            <span className="text-[10px] md:text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">ACTIVE</span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 md:gap-y-2">
                            {selectedPlacedTower.tower.type === TowerType.SHIELD ? (
                              <>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">내구도</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs md:text-lg font-mono font-bold text-white">
                                            {selectedPlacedTower.tower.health.toFixed(0)}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            / {selectedPlacedTower.tower.maxHealth}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">범위</span>
                                    <span className="text-xs md:text-lg font-mono font-bold text-emerald-400">
                                        주변 2.5칸
                                    </span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">공격력</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs md:text-lg font-mono font-bold text-white">{selectedPlacedTower.tower.damage}</span>
                                        <ArrowRightCircle size={14} className="text-slate-600"/>
                                        <span className="text-xs md:text-lg font-mono font-bold text-emerald-400">{(getNextStats(selectedPlacedTower.tower) as any).damage}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">사거리</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs md:text-lg font-mono font-bold text-white">{selectedPlacedTower.tower.range.toFixed(1)}</span>
                                        <ArrowRightCircle size={14} className="text-slate-600"/>
                                        <span className="text-xs md:text-lg font-mono font-bold text-emerald-400">{(getNextStats(selectedPlacedTower.tower) as any).range.toFixed(1)}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col hidden md:flex">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">공격 주기</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs md:text-lg font-mono font-bold text-white">{(selectedPlacedTower.tower.cooldown / 1000).toFixed(2)}s</span>
                                        <ArrowRightCircle size={14} className="text-slate-600"/>
                                        <span className="text-xs md:text-lg font-mono font-bold text-emerald-400">{((getNextStats(selectedPlacedTower.tower) as any).cooldown / 1000).toFixed(2)}s</span>
                                    </div>
                                </div>
                              </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                    <div className="flex flex-col gap-2 items-end">
                        <button 
                            onClick={onUpgradeTower}
                            disabled={money < getUpgradeCost(selectedPlacedTower.tower)}
                            className={`flex flex-col items-center justify-center px-4 py-2 md:px-8 md:py-4 rounded-2xl font-black shadow-xl transition-all min-w-[100px] md:w-44 group border-2 relative overflow-hidden ${money >= getUpgradeCost(selectedPlacedTower.tower) ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400' : 'bg-slate-800 border-slate-700 opacity-50 grayscale cursor-not-allowed'}`}
                        >
                            <span className="flex items-center gap-1 text-[10px] md:text-xs text-emerald-100 mb-0.5"><Hammer size={12} /> LEVEL UP</span>
                            <div className="flex items-center gap-1">
                                <Coins size={14} className="text-yellow-400" />
                                <span className="text-yellow-300 text-sm md:text-xl">-{getUpgradeCost(selectedPlacedTower.tower)}G</span>
                            </div>
                            {money >= getUpgradeCost(selectedPlacedTower.tower) && (
                                <div className="absolute top-0 right-0 p-1">
                                    <ArrowUp size={12} className="text-emerald-300 animate-bounce" />
                                </div>
                            )}
                        </button>
                        <div className="flex gap-2">
                             <button 
                                onClick={onSellTower} 
                                className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-md min-w-[60px] bg-slate-800 text-slate-400 border-slate-600 hover:text-red-400 hover:border-red-500/50 hover:bg-slate-700"
                            >
                                <Trash2 size={16} /> 
                            </button>
                            {/* 판매 가격 툴팁/라벨 */}
                            <div className="hidden md:flex items-center text-[10px] text-slate-500 font-mono bg-slate-800 px-2 rounded border border-slate-700 h-8">
                                +{getSellPrice(selectedPlacedTower.tower)}G
                            </div>

                            <button onClick={onCloseSelection} className="flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 p-2 rounded-xl border border-slate-700 transition-colors h-8 w-8 md:h-9 md:w-9">
                                <X size={16}/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex items-center w-full max-w-5xl gap-2 overflow-x-auto hide-scrollbar px-1 pb-1">
                <div className="flex gap-2 w-full justify-start md:justify-center">
                    {[TowerType.BASIC, TowerType.SNIPER, TowerType.RAPID, TowerType.BOMBER, TowerType.SHIELD, TowerType.LASER, TowerType.TESLA].map((type) => {
                        const stat = TOWER_STATS[type];
                        const cost = TOWER_COSTS[type];
                        const isSelected = selectedTower === type;
                        const canAfford = money >= cost;

                        return (
                        <button
                            key={type}
                            onClick={() => {
                                if (canAfford) onSelectTower(isSelected ? null : type);
                            }}
                            onMouseEnter={(e) => handleBuildEnter(type, e)}
                            onMouseLeave={() => setHoveredBuildType(null)}
                            className={`relative flex flex-col items-center justify-center p-2 rounded-xl min-w-[80px] md:min-w-[110px] transition-all border-2 ${isSelected ? 'bg-blue-600/20 border-blue-500 -translate-y-2 shadow-2xl' : 'bg-slate-800 border-slate-700 hover:border-slate-500'} ${!canAfford ? 'opacity-40 grayscale cursor-default' : 'cursor-pointer'}`}
                        >
                            <div className={`p-1.5 md:p-2 rounded-lg mb-1 ${isSelected ? 'scale-110' : ''}`} style={{ backgroundColor: stat.color }}>{renderTowerIcon(type, 18)}</div>
                            <span className="text-[10px] md:text-xs font-bold text-slate-200 truncate w-full text-center">{stat.name}</span>
                            <div className={`flex items-center text-[10px] md:text-xs font-bold mt-0.5 ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}><Coins size={10} className="mr-0.5" /> {cost}</div>
                        </button>
                        );
                    })}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default GameUI;