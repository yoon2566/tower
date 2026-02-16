import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, MAP_SIZE, Tower, Enemy, Coordinate, Projectile, Particle, TowerType, TowerSkill } from '../types';
import { TILE_WIDTH, TILE_HEIGHT, GAME_PATH, TOWER_COSTS, TOWER_STATS, INITIAL_MONEY, INITIAL_LIVES, SELL_REFUND_RATIO, UPGRADE_COST_MULTIPLIER, SKILL_COSTS, SKILL_INFO } from '../constants';
import GameUI from './GameUI';

const isOnPath = (x: number, y: number) => GAME_PATH.some(p => p.x === x && p.y === y);

const SLOW_TOWERS = [TowerType.SNIPER, TowerType.BOMBER, TowerType.TESLA];

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>({
    money: INITIAL_MONEY,
    lives: INITIAL_LIVES,
    wave: 1,
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    gameSpeed: 1,
    isAutoStart: false,
  });
  
  const gameTimeRef = useRef(0);
  const towersRef = useRef<Tower[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const waveStateRef = useRef({ enemiesToSpawn: 0, spawnTimer: 0, spawnInterval: 60 });
  const autoStartTimerRef = useRef<number | null>(null);

  const [uiState, setUiState] = useState<GameState>(gameStateRef.current);
  const [selectedTower, setSelectedTower] = useState<TowerType | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<TowerSkill | null>(null);
  const [zoom, setZoom] = useState<number>(typeof window !== 'undefined' && window.innerWidth < 768 ? 0.7 : 1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredTowerInfo, setHoveredTowerInfo] = useState<{ tower: Tower, x: number, y: number } | null>(null);
  const [selectedPlacedTower, setSelectedPlacedTower] = useState<{ tower: Tower, x: number, y: number } | null>(null);
  const [skillTargetTower, setSkillTargetTower] = useState<Tower | null>(null);
  const [pendingPlacement, setPendingPlacement] = useState<{ gridX: number, gridY: number } | null>(null);

  const mouseRef = useRef({ x: 0, y: 0, gridX: -1, gridY: -1, rawX: 0, rawY: 0 });

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameStateRef.current.isPlaying && !gameStateRef.current.isGameOver) {
        gameStateRef.current.isPaused = true;
        setUiState(prev => ({ ...prev, isPaused: true }));
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const startWave = useCallback(() => {
    if (gameStateRef.current.isPlaying || gameStateRef.current.isGameOver) return;
    
    // Auto Repair Logic
    towersRef.current.forEach(t => {
        if (t.isBroken && t.repairTimer) {
            t.repairTimer--;
            if (t.repairTimer <= 0) {
                t.isBroken = false;
                t.health = t.maxHealth; 
                t.repairTimer = undefined;
                createParticles(t.x, t.y, '#22c55e', 40); 
            }
        }
        // Shield Tower Regen
        if (t.type === TowerType.SHIELD && !t.isBroken && t.health < t.maxHealth) {
            t.health = Math.min(t.maxHealth, t.health + (t.maxHealth * 0.1)); // 10% regen
            createParticles(t.x, t.y, '#60a5fa', 15);
        }
    });

    const wave = gameStateRef.current.wave;
    const count = Math.floor(5 + (wave * 1.5) + Math.pow(wave, 1.3) * 0.5);
    const interval = Math.max(10, 60 - Math.floor(wave * 3));
    
    waveStateRef.current = { enemiesToSpawn: count, spawnTimer: 0, spawnInterval: interval };
    gameStateRef.current.isPlaying = true;
    gameStateRef.current.isPaused = false;
    setUiState({ ...gameStateRef.current });
    
    if (selectedPlacedTower) {
        const t = towersRef.current.find(tower => tower.id === selectedPlacedTower.tower.id);
        if (t) setSelectedPlacedTower({ ...selectedPlacedTower, tower: { ...t } });
    }

  }, [selectedPlacedTower]);

  const toggleAutoStart = () => {
      gameStateRef.current.isAutoStart = !gameStateRef.current.isAutoStart;
      setUiState(prev => ({ ...prev, isAutoStart: gameStateRef.current.isAutoStart }));
      
      if (gameStateRef.current.isAutoStart && !gameStateRef.current.isPlaying && !gameStateRef.current.isGameOver) {
          if (autoStartTimerRef.current) clearTimeout(autoStartTimerRef.current);
          autoStartTimerRef.current = window.setTimeout(() => startWave(), 1000);
      }
  };

  const upgradeTower = () => {
      if (!selectedPlacedTower) return;
      const t = towersRef.current.find(tower => tower.id === selectedPlacedTower.tower.id);
      if (!t) return;

      const cost = Math.floor(TOWER_COSTS[t.type] * Math.pow(UPGRADE_COST_MULTIPLIER, t.level));
      if (gameStateRef.current.money >= cost) {
          gameStateRef.current.money -= cost;
          t.level += 1;
          
          if (t.type !== TowerType.SHIELD) {
            if (t.type !== TowerType.BASIC) t.damage = Math.floor(t.damage * 1.5); 
            t.range *= 1.08;
            t.cooldown *= 0.94;
          }
          t.maxHealth = Math.floor(t.maxHealth * 1.2); 
          if (!t.isBroken) t.health = t.maxHealth; 
          
          setUiState(prev => ({ ...prev, money: gameStateRef.current.money }));
          createParticles(t.x, t.y, '#fbbf24', 25);
          
          const pos = getScreenPos(t.x, t.y);
          setSelectedPlacedTower({ tower: { ...t }, x: pos.x, y: pos.y });
      }
  };

  const sellTower = () => {
      if (!selectedPlacedTower) return;
      const index = towersRef.current.findIndex(t => t.id === selectedPlacedTower.tower.id);
      if (index > -1) {
          const tower = towersRef.current[index];
          let totalInvested = TOWER_COSTS[tower.type];
          for (let i = 1; i < tower.level; i++) {
              totalInvested += Math.floor(TOWER_COSTS[tower.type] * Math.pow(UPGRADE_COST_MULTIPLIER, i));
          }
          const refund = Math.floor(totalInvested * SELL_REFUND_RATIO);
          
          gameStateRef.current.money += refund;
          towersRef.current.splice(index, 1);
          setUiState(prev => ({ ...prev, money: gameStateRef.current.money }));
          setSelectedPlacedTower(null);
      }
  };

  const applySkill = () => {
      if (!skillTargetTower || !selectedSkill) return;
      const t = towersRef.current.find(tower => tower.id === skillTargetTower.id);
      if (!t) return;
      if (t.skills.includes(selectedSkill)) return; // 중복 방지

      const cost = SKILL_COSTS[selectedSkill];
      if (gameStateRef.current.money >= cost) {
          gameStateRef.current.money -= cost;
          t.skills.push(selectedSkill);
          createParticles(t.x, t.y, '#a855f7', 40);
          setUiState(prev => ({ ...prev, money: gameStateRef.current.money }));

          setSkillTargetTower(null);
          setSelectedSkill(null);
      }
  };

  const applySkillToSelected = (skill: TowerSkill) => {
      if (!selectedPlacedTower) return;
      const t = towersRef.current.find(tower => tower.id === selectedPlacedTower.tower.id);
      if (!t) return;
      if (t.skills.includes(skill)) return; // 중복 방지

      const info = SKILL_INFO[skill];
      if (info?.targetTypes && !info.targetTypes.includes(t.type)) return;

      const cost = SKILL_COSTS[skill];
      if (gameStateRef.current.money >= cost) {
          gameStateRef.current.money -= cost;
          t.skills.push(skill);
          createParticles(t.x, t.y, '#a855f7', 40);
          setUiState(prev => ({ ...prev, money: gameStateRef.current.money }));

          const pos = getScreenPos(t.x, t.y);
          setSelectedPlacedTower({ tower: { ...t }, x: pos.x, y: pos.y });
      }
  };

  const confirmPlacement = useCallback(() => {
      if (!selectedTower || !pendingPlacement) return;
      const { gridX, gridY } = pendingPlacement;
      const cost = TOWER_COSTS[selectedTower];
      if (gameStateRef.current.money >= cost && !isOnPath(gridX, gridY) && !towersRef.current.some(t => t.x === gridX && t.y === gridY)) {
          gameStateRef.current.money -= cost;
          const stats = TOWER_STATS[selectedTower];
          towersRef.current.push({
              id: Math.random().toString(),
              x: gridX, y: gridY,
              type: selectedTower,
              range: stats.range,
              damage: stats.damage,
              cooldown: stats.cooldown,
              lastShotTime: 0,
              level: 1,
              health: stats.health,
              maxHealth: stats.health,
              totalEarned: selectedTower === TowerType.SHIELD ? 0 : undefined,
              skills: []
          });
          setUiState(prev => ({ ...prev, money: gameStateRef.current.money }));
          setPendingPlacement(null);
          if (gameStateRef.current.money < cost) {
              setSelectedTower(null);
          }
      }
  }, [selectedTower, pendingPlacement]);

  const cancelPlacement = useCallback(() => {
      setPendingPlacement(null);
  }, []);

  const getWorldPos = (gx: number, gy: number) => {
    const offsetX = window.innerWidth / 2;
    const offsetY = 100;
    const sx = (gx - gy) * (TILE_WIDTH / 2) + offsetX;
    const sy = (gx + gy) * (TILE_HEIGHT / 2) + offsetY;
    return { x: sx, y: sy };
  };

  const getScreenPos = (gx: number, gy: number) => {
      const world = getWorldPos(gx, gy);
      const pivotX = window.innerWidth / 2;
      const pivotY = window.innerHeight / 2;
      const sx = (world.x - pivotX) * zoom + pivotX + pan.x;
      const sy = (world.y - pivotY) * zoom + pivotY + pan.y;
      return { x: sx, y: sy };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;
      const gameDt = deltaTime * gameStateRef.current.gameSpeed;
      if (!gameStateRef.current.isPaused && !gameStateRef.current.isGameOver) {
          gameTimeRef.current += gameDt;
      }
      update(gameDt);
      render(ctx);
      animationFrameId = requestAnimationFrame(loop);
    };

    const update = (dt: number) => {
      if (gameStateRef.current.isGameOver || gameStateRef.current.isPaused) return; 

      if (gameStateRef.current.isPlaying) {
        if (waveStateRef.current.enemiesToSpawn > 0) {
          waveStateRef.current.spawnTimer -= (dt / 16.67);
          if (waveStateRef.current.spawnTimer <= 0) {
            spawnEnemy();
            waveStateRef.current.enemiesToSpawn--;
            waveStateRef.current.spawnTimer = waveStateRef.current.spawnInterval;
          }
        } else if (enemiesRef.current.length === 0) {
            gameStateRef.current.isPlaying = false;
            gameStateRef.current.wave++;
            setUiState(prev => ({ ...prev, isPlaying: false, wave: gameStateRef.current.wave }));
            
            if (gameStateRef.current.isAutoStart) {
                if (autoStartTimerRef.current) clearTimeout(autoStartTimerRef.current);
                autoStartTimerRef.current = window.setTimeout(() => {
                    startWave();
                }, 2000);
            }
        }
      }

      // Enemy Update & Tower Damage Logic
      for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
        const enemy = enemiesRef.current[i];
        if (enemy.health <= 0) {
            gameStateRef.current.money += enemy.reward; 
            setUiState(prev => ({ ...prev, money: gameStateRef.current.money }));
            enemiesRef.current.splice(i, 1);
            continue;
        }
        
        if (enemy.frozen > 0) enemy.frozen -= (dt / 16.67);
        enemy.isSlowed = enemy.frozen > 0;

        // Enemies damage nearby towers
        towersRef.current.forEach(tower => {
            if (tower.isBroken) return;
            const dist = Math.sqrt((enemy.x - tower.x) ** 2 + (enemy.y - tower.y) ** 2);
            if (dist < 1.8) { 
                // Shield check: Check if any ACTIVE Shield tower is nearby (range 1.8 approx for 1 tile diagonal)
                const isProtected = towersRef.current.some(t =>
                    t.type === TowerType.SHIELD &&
                    !t.isBroken &&
                    t.id !== tower.id && // Shield can't protect itself from damage (it has high HP instead)
                    Math.sqrt((t.x - tower.x)**2 + (t.y - tower.y)**2) <= 2.5
                );

                if (!isProtected || tower.type === TowerType.SHIELD) {
                    const damagePerFrame = (0.5 + (gameStateRef.current.wave * 0.05)) * (dt / 16.67);
                    tower.health -= damagePerFrame;
                    if (tower.health <= 0) {
                        if (tower.skills.includes(TowerSkill.AUTO_REPAIR)) {
                            tower.isBroken = true;
                            tower.health = 0;
                            tower.repairTimer = 2;
                            createParticles(tower.x, tower.y, '#ef4444', 15);
                        } else {
                            createParticles(tower.x, tower.y, '#94a3b8', 30); 
                        }
                    }
                }
            }
        });

        const currentSpeed = enemy.isSlowed ? enemy.speed * 0.5 : enemy.speed;
        let moveDist = currentSpeed * (dt / 16.67);
        let reachedEnd = false;

        while (moveDist > 0) {
            const targetTile = GAME_PATH[Math.min(enemy.pathIndex + 1, GAME_PATH.length - 1)];
            const dx = targetTile.x - enemy.x;
            const dy = targetTile.y - enemy.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist <= moveDist) {
                enemy.x = targetTile.x;
                enemy.y = targetTile.y;
                moveDist -= dist;
                enemy.pathIndex++;

                if (enemy.pathIndex >= GAME_PATH.length - 1) {
                    reachedEnd = true;
                    break;
                }
            } else {
                enemy.x += (dx / dist) * moveDist;
                enemy.y += (dy / dist) * moveDist;
                moveDist = 0;
            }
        }

        if (reachedEnd) {
            gameStateRef.current.lives--;
            enemiesRef.current.splice(i, 1);
            setUiState(prev => ({ ...prev, lives: gameStateRef.current.lives }));
            if (gameStateRef.current.lives <= 0) {
                gameStateRef.current.lives = 0;
                gameStateRef.current.isGameOver = true;
                setUiState(prev => ({ ...prev, lives: 0, isGameOver: true }));
            }
            continue;
        }
      }

      for (let i = towersRef.current.length - 1; i >= 0; i--) {
          const t = towersRef.current[i];
          if (t.health <= 0 && !t.isBroken) {
              if (selectedPlacedTower?.tower.id === t.id) {
                  setSelectedPlacedTower(null);
              }
              towersRef.current.splice(i, 1);
          }
      }

      const now = gameTimeRef.current;
      towersRef.current.forEach(tower => {
        if (tower.type === TowerType.SHIELD || tower.isBroken) return;
        if (now - tower.lastShotTime >= tower.cooldown) {
            const target = enemiesRef.current.find(e => Math.sqrt((e.x - tower.x)**2 + (e.y - tower.y)**2) <= tower.range);
            if (target) {
                tower.lastShotTime = now;
                
                let damage = tower.damage;
                let color = TOWER_STATS[tower.type].color;
                let splashRadius = TOWER_STATS[tower.type].splashRadius;
                
                let effectType: 'normal' | 'crit' | 'execution' | 'instant_death' | 'sticky' = 'normal';
                
                if (tower.type === TowerType.BASIC || tower.skills.includes(TowerSkill.STICKY)) {
                    effectType = 'sticky';
                    color = '#3b82f6';
                    if (!splashRadius) splashRadius = 2.0;
                }

                if (SLOW_TOWERS.includes(tower.type)) {
                    const hpPercent = target.health / target.maxHealth;

                    // Sniper Update: 40% Instant Death if < 50%, 20% Crit otherwise
                    if (tower.type === TowerType.SNIPER) {
                        if (hpPercent < 0.5) {
                             if (Math.random() < 0.4) {
                                effectType = 'instant_death'; // 40% Execute
                                damage = 999999;
                             } else {
                                damage *= 3.0; // Failed execute dmg (3배)
                             }
                        } else if (Math.random() < 0.2) {
                            effectType = 'crit';
                            damage *= 2.0;
                        }
                    } 
                    else if (tower.type === TowerType.BOMBER) {
                        if (hpPercent < 0.5) {
                             effectType = 'execution';
                             damage *= 10.0; // Splash execute
                        } else if (Math.random() < 0.25) {
                             effectType = 'crit';
                             damage *= 3.0; // 5배 → 3배 조정
                        }
                    } 
                    else if (tower.type === TowerType.TESLA) {
                        if (hpPercent < 0.5) {
                             damage = 999999;
                             effectType = 'instant_death';
                             splashRadius = 0;
                        } else if (Math.random() < 0.25) {
                             effectType = 'crit';
                             damage *= 5.0; // 10배 → 5배 너프
                        }
                    }
                }

                const hasChainsaw = tower.skills.includes(TowerSkill.CHAINSAW);

                projectilesRef.current.push({
                    id: Math.random().toString(),
                    x: tower.x, y: tower.y,
                    targetId: target.id,
                    speed: tower.type === TowerType.LASER || effectType === 'instant_death' ? 0.9 : 0.35, 
                    damage: damage,
                    color: color,
                    splashRadius: splashRadius,
                    effectType: effectType,
                    hasChainsaw
                });
            }
        }
      });

      for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
        const proj = projectilesRef.current[i];
        const targetEnemy = enemiesRef.current.find(e => e.id === proj.targetId);
        if (!targetEnemy) { projectilesRef.current.splice(i, 1); continue; }
        const dx = targetEnemy.x - proj.x;
        const dy = targetEnemy.y - proj.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        const hitRadius = (proj.effectType === 'instant_death' || proj.effectType === 'execution' || proj.speed > 0.5) ? 0.6 : 0.3;

        if (dist < hitRadius) {
            const targetsToHit: Enemy[] = [];
            if (proj.splashRadius) {
                createParticles(targetEnemy.x, targetEnemy.y, proj.color, 18); 
                enemiesRef.current.forEach(e => {
                    if (Math.sqrt((e.x - targetEnemy.x)**2 + (e.y - targetEnemy.y)**2) <= proj.splashRadius!) {
                        targetsToHit.push(e);
                    }
                });
            } else {
                targetsToHit.push(targetEnemy);
                if (proj.effectType === 'instant_death') createParticles(targetEnemy.x, targetEnemy.y, '#a855f7', 30, '💀');
                else if (proj.effectType === 'execution') createParticles(targetEnemy.x, targetEnemy.y, '#ef4444', 20);
                else createParticles(targetEnemy.x, targetEnemy.y, proj.color, 8);
            }

            targetsToHit.forEach(e => {
                e.health -= proj.damage;
                
                if (proj.effectType === 'sticky') {
                    e.frozen = 120;
                }

                if (proj.hasChainsaw && Math.random() < 0.03) { // 5% → 3%
                    e.health = 0;
                    createParticles(e.x, e.y, '#ef4444', 50, '💀');
                }
            });

            projectilesRef.current.splice(i, 1);
        } else {
            proj.x += (dx / dist) * proj.speed * (dt / 16.67);
            proj.y += (dy / dist) * proj.speed * (dt / 16.67);
        }
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.04 * (dt / 16.67);
        if (p.life <= 0) particlesRef.current.splice(i, 1);
      }
    };

    const render = (ctx: CanvasRenderingContext2D) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const pivotX = canvas.width / 2;
      const pivotY = canvas.height / 2;
      ctx.translate(pivotX + pan.x, pivotY + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-pivotX, -pivotY);
      const offsetX = canvas.width / 2;
      const offsetY = 100; 
      const toIso = (gx: number, gy: number) => ({
        x: (gx - gy) * (TILE_WIDTH / 2) + offsetX,
        y: (gx + gy) * (TILE_HEIGHT / 2) + offsetY
      });

      for (let y = 0; y < MAP_SIZE; y++) {
        for (let x = 0; x < MAP_SIZE; x++) {
            const pos = toIso(x, y);
            drawIsoTile(ctx, pos.x, pos.y, isOnPath(x, y) ? '#475569' : '#059669', mouseRef.current.gridX === x && mouseRef.current.gridY === y); 
        }
      }

      const renderables: any[] = [];
      towersRef.current.forEach(t => renderables.push({ type: 'TOWER', z: t.x + t.y, obj: t }));
      enemiesRef.current.forEach(e => renderables.push({ type: 'ENEMY', z: e.x + e.y, obj: e }));
      renderables.sort((a, b) => a.z - b.z).forEach(item => {
        const pos = toIso(item.obj.x, item.obj.y);
        if (item.type === 'TOWER') drawTower(ctx, pos.x, pos.y, item.obj);
        else drawEnemy(ctx, pos.x, pos.y, item.obj);
      });

      // Projectiles
      projectilesRef.current.forEach(p => {
          const pos = toIso(p.x, p.y);
          ctx.fillStyle = p.color;
          
          if (p.effectType === 'instant_death') {
              ctx.beginPath();
              ctx.moveTo(pos.x, pos.y);
              ctx.lineTo(pos.x - 10, pos.y - 20);
              ctx.lineTo(pos.x + 5, pos.y - 15);
              ctx.lineTo(pos.x, pos.y - 35);
              ctx.strokeStyle = '#d8b4fe';
              ctx.lineWidth = 3;
              ctx.stroke();
              ctx.shadowColor = '#a855f7';
              ctx.shadowBlur = 15;
              ctx.stroke();
              ctx.shadowBlur = 0;
          } else if (p.effectType === 'execution') {
              ctx.beginPath();
              ctx.ellipse(pos.x, pos.y - 20, 4, 15, Math.PI / 4, 0, Math.PI * 2);
              ctx.fillStyle = '#ef4444';
              ctx.fill();
              ctx.shadowColor = 'red';
              ctx.shadowBlur = 10;
              ctx.fill();
              ctx.shadowBlur = 0;
          } else {
              ctx.beginPath();
              ctx.arc(pos.x, pos.y - 20, p.splashRadius ? 7 : 5, 0, Math.PI * 2);
              ctx.fill();
              if (p.effectType === 'crit') { 
                ctx.shadowBlur = 15; ctx.shadowColor = 'white';
                ctx.fill();
                ctx.shadowBlur = 0;
              }
          }
      });

      particlesRef.current.forEach(p => {
          const pos = toIso(p.x, p.y);
          ctx.globalAlpha = p.life;
          if (p.text) {
              ctx.font = '16px Arial';
              ctx.textAlign = 'center';
              ctx.fillStyle = p.color || 'white';
              ctx.fillText(p.text, pos.x, pos.y - 20);
          } else {
              ctx.fillStyle = p.color;
              ctx.fillRect(pos.x, pos.y - 20, 3, 3);
          }
          ctx.globalAlpha = 1.0;
      });

      // Pending Placement Preview (confirmed position)
      if (selectedTower && pendingPlacement) {
         const gx = pendingPlacement.gridX; const gy = pendingPlacement.gridY;
         const pos = toIso(gx, gy);
         ctx.globalAlpha = 0.8;
         drawTower(ctx, pos.x, pos.y, { type: selectedTower, level: 1, health: 100, maxHealth: 100, skills: [] } as any);
         ctx.globalAlpha = 1.0;
         // Range circle
         ctx.beginPath();
         const range = TOWER_STATS[selectedTower].range;
         ctx.ellipse(pos.x, pos.y, range * TILE_WIDTH/1.5, range * TILE_HEIGHT/1.5, 0, 0, Math.PI*2);
         ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
         ctx.fill();
         ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
         ctx.lineWidth = 2;
         ctx.stroke();
      }
      // Mouse hover preview (when no pending placement)
      else if (selectedTower && !pendingPlacement && mouseRef.current.gridX >= 0 && mouseRef.current.gridX < MAP_SIZE && mouseRef.current.gridY >= 0 && mouseRef.current.gridY < MAP_SIZE) {
         const gx = mouseRef.current.gridX; const gy = mouseRef.current.gridY;
         const isValid = !towersRef.current.some(t => t.x === gx && t.y === gy) && !isOnPath(gx, gy);
         const pos = toIso(gx, gy);
         ctx.globalAlpha = 0.4;
         drawTower(ctx, pos.x, pos.y, { type: selectedTower, level: 1, health: 100, maxHealth: 100, skills: [] } as any);
         ctx.beginPath();
         const range = TOWER_STATS[selectedTower].range;
         ctx.ellipse(pos.x, pos.y, range * TILE_WIDTH/1.5, range * TILE_HEIGHT/1.5, 0, 0, Math.PI*2);
         ctx.fillStyle = isValid ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 0, 0, 0.2)';
         ctx.fill();
         ctx.globalAlpha = 1.0;
      }
      
      if (selectedPlacedTower) {
           const pos = toIso(selectedPlacedTower.tower.x, selectedPlacedTower.tower.y);
           drawRange(ctx, pos.x, pos.y, selectedPlacedTower.tower.range, selectedPlacedTower.tower.type, true);
      } 
    };

    const drawIsoTile = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, highlight: boolean) => {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + TILE_WIDTH / 2, y + TILE_HEIGHT / 2);
        ctx.lineTo(x, y + TILE_HEIGHT); ctx.lineTo(x - TILE_WIDTH / 2, y + TILE_HEIGHT / 2); ctx.closePath();
        ctx.fillStyle = color; ctx.fill();
        if (highlight) { ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill(); }
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.stroke();
    };

    const drawTower = (ctx: CanvasRenderingContext2D, x: number, y: number, tower: Tower) => {
        const color = skillTargetTower?.id === tower.id ? '#10b981' : TOWER_STATS[tower.type].color;
        const level = tower.level;
        const h = 45 + (level * 6); 
        const isSelected = selectedPlacedTower?.tower.id === tower.id;
        const isBroken = tower.isBroken;

        if (isSelected) {
            ctx.beginPath(); ctx.ellipse(x, y + TILE_HEIGHT/2, TILE_WIDTH/2, TILE_HEIGHT/2, 0, 0, Math.PI*2);
            ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.stroke();
        }

        ctx.fillStyle = isBroken ? '#334155' : color; 
        if (isBroken) ctx.globalAlpha = 0.5;

        // Draw Tower Body
        ctx.beginPath();
        ctx.moveTo(x, y - h); ctx.lineTo(x + TILE_WIDTH/3, y - h + TILE_HEIGHT/3);
        ctx.lineTo(x, y - h + TILE_HEIGHT/1.5); ctx.lineTo(x - TILE_WIDTH/3, y - h + TILE_HEIGHT/3);
        ctx.closePath(); ctx.fill();
        
        ctx.fillStyle = isBroken ? '#1e293b' : shadeColor(color, -25);
        ctx.beginPath();
        ctx.moveTo(x + TILE_WIDTH/3, y - h + TILE_HEIGHT/3); ctx.lineTo(x + TILE_WIDTH/3, y + TILE_HEIGHT/3);
        ctx.lineTo(x, y + TILE_HEIGHT/1.5); ctx.lineTo(x, y - h + TILE_HEIGHT/1.5);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = isBroken ? '#0f172a' : shadeColor(color, -45);
        ctx.beginPath();
        ctx.moveTo(x - TILE_WIDTH/3, y - h + TILE_HEIGHT/3); ctx.lineTo(x - TILE_WIDTH/3, y + TILE_HEIGHT/3);
        ctx.lineTo(x, y + TILE_HEIGHT/1.5); ctx.lineTo(x, y - h + TILE_HEIGHT/1.5);
        ctx.closePath(); ctx.fill();
        
        ctx.globalAlpha = 1.0;

        // Shield Tower Aura
        if (tower.type === TowerType.SHIELD && !isBroken) {
             ctx.save();
             ctx.beginPath();
             ctx.ellipse(x, y, TILE_WIDTH * 0.8, TILE_HEIGHT * 0.8, 0, 0, Math.PI * 2);
             ctx.fillStyle = 'rgba(100, 116, 139, 0.2)';
             ctx.fill();
             ctx.strokeStyle = '#94a3b8';
             ctx.lineWidth = 1;
             ctx.setLineDash([5, 5]);
             ctx.stroke();
             ctx.restore();
        }

        // Skill Indicators (Enhanced Visuals)
        if (tower.skills && !isBroken) {
            tower.skills.forEach((s, idx) => {
                const angle = (Date.now() / 500) + (idx * (Math.PI * 2 / tower.skills.length));
                const radius = 25;
                const sx = x + Math.cos(angle) * radius;
                const sy = (y - h/2) + Math.sin(angle) * radius * 0.5;
                
                ctx.beginPath();
                ctx.arc(sx, sy, 4, 0, Math.PI * 2);
                ctx.fillStyle = s === TowerSkill.CHAINSAW ? '#ef4444' : s === TowerSkill.STICKY ? '#3b82f6' : '#22c55e';
                ctx.fill();
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 5;
                ctx.stroke();
                ctx.shadowBlur = 0;
            });
        }
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(isBroken ? `수리 ${tower.repairTimer}` : `Lv.${level}`, x, y - h - 7);

        // Tower HP Bar
        if (tower.health < tower.maxHealth && !isBroken) {
            const barWidth = 24;
            const barHeight = 4;
            const hpPct = Math.max(0, tower.health / tower.maxHealth);
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(x - barWidth/2, y - h - 20, barWidth, barHeight);
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(x - barWidth/2 + 1, y - h - 19, (barWidth-2) * hpPct, barHeight - 2);
        }
    };
    
    const drawRange = (ctx: CanvasRenderingContext2D, x: number, y: number, range: number, type: TowerType, isFixed: boolean) => {
          if (range <= 0) return;
          ctx.beginPath();
          ctx.ellipse(x, y, range * TILE_WIDTH/1.5, range * TILE_HEIGHT/1.5, 0, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 2; ctx.stroke();
    };

    const drawEnemy = (ctx: CanvasRenderingContext2D, x: number, y: number, enemy: Enemy) => {
        const floatY = y - 25;
        const hpPercent = Math.max(0, enemy.health / enemy.maxHealth);
        
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 12, floatY - 22, 24, 6);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(x - 11, floatY - 21, 22, 4);
        ctx.fillStyle = '#22c55e'; ctx.fillRect(x - 11, floatY - 21, 22 * hpPercent, 4);
        
        ctx.beginPath(); ctx.arc(x, floatY, 11, 0, Math.PI * 2); 
        ctx.fillStyle = enemy.isSlowed ? '#60a5fa' : enemy.color; 
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();

        ctx.save();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 3;
        ctx.fillText(Math.ceil(enemy.health).toString(), x, floatY - 24);
        ctx.restore();
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [selectedTower, zoom, pan, selectedPlacedTower, skillTargetTower, selectedSkill, pendingPlacement]);

  const calculateGridPos = (clientX: number, clientY: number) => {
     const rect = canvasRef.current?.getBoundingClientRect();
     if (!rect) return { gridX: -1, gridY: -1, mx: 0, my: 0, rawX: 0, rawY: 0 };
     const rawX = clientX - rect.left; const rawY = clientY - rect.top;
     const pivotX = rect.width / 2; const pivotY = rect.height / 2;
     const mx = (rawX - pan.x - pivotX) / zoom + pivotX;
     const my = (rawY - pan.y - pivotY) / zoom + pivotY;
     const adjX = mx - rect.width / 2; const adjY = my - 100;
     const halfW = TILE_WIDTH / 2; const halfH = TILE_HEIGHT / 2;
     const gridX = Math.floor(((adjY / halfH) + (adjX / halfW)) / 2);
     const gridY = Math.floor(((adjY / halfH) - (adjX / halfW)) / 2);
     return { gridX, gridY, mx, my, rawX, rawY };
  };

  const handleCanvasClick = () => {
     const { gridX, gridY, rawX, rawY } = mouseRef.current;
     
     if (selectedSkill) {
        const towersByRenderOrder = [...towersRef.current].sort((a, b) => (a.x + a.y) - (b.x + b.y));
        for (let i = towersByRenderOrder.length - 1; i >= 0; i--) {
            const t = towersByRenderOrder[i];
            const screenPos = getScreenPos(t.x, t.y);
            const towerHeight = 45 + (t.level * 6);
            const w = TILE_WIDTH * zoom; 
            const top = screenPos.y - (towerHeight * zoom); 
            const bottom = screenPos.y + (TILE_HEIGHT / 2 * zoom); 

            if (rawX >= screenPos.x - w/2 && rawX <= screenPos.x + w/2 && rawY >= top && rawY <= bottom) {
                const skillInfo = SKILL_INFO[selectedSkill];
                if (skillInfo?.targetTypes && !skillInfo.targetTypes.includes(t.type)) {
                    return;
                }

                if (skillTargetTower?.id === t.id) {
                    applySkill();
                } else {
                    setSkillTargetTower(t);
                    setSelectedPlacedTower(null); 
                }
                return;
            }
        }
        setSelectedSkill(null);
        setSkillTargetTower(null);
        return;
     }

     if (selectedTower) {
        const isValidTile = gridX >= 0 && gridX < MAP_SIZE && gridY >= 0 && gridY < MAP_SIZE;
        if (gameStateRef.current.money < TOWER_COSTS[selectedTower]) {
            setSelectedTower(null);
            setPendingPlacement(null);
            return;
        }

        if (isValidTile && !isOnPath(gridX, gridY) && !towersRef.current.some(t => t.x === gridX && t.y === gridY)) {
            // 2-step: first click sets pending, second click on same tile confirms
            if (pendingPlacement && pendingPlacement.gridX === gridX && pendingPlacement.gridY === gridY) {
                confirmPlacement();
            } else {
                setPendingPlacement({ gridX, gridY });
            }
        } else {
            setPendingPlacement(null);
        }
        return;
     }

     const towersByRenderOrder = [...towersRef.current].sort((a, b) => (a.x + a.y) - (b.x + b.y));
     for (let i = towersByRenderOrder.length - 1; i >= 0; i--) {
        const t = towersByRenderOrder[i];
        const screenPos = getScreenPos(t.x, t.y);
        const towerHeight = 45 + (t.level * 6);
        const w = TILE_WIDTH * zoom; 
        const left = screenPos.x - (w / 2);
        const right = screenPos.x + (w / 2);
        const top = screenPos.y - (towerHeight * zoom); 
        const bottom = screenPos.y + (TILE_HEIGHT / 2 * zoom); 

        if (rawX >= left && rawX <= right && rawY >= top && rawY <= bottom) {
             setSelectedPlacedTower({ tower: { ...t }, x: screenPos.x, y: screenPos.y });
             setSelectedTower(null);
             return; 
        }
     }

     const isValidTile = gridX >= 0 && gridX < MAP_SIZE && gridY >= 0 && gridY < MAP_SIZE;
     if (isValidTile) {
         const clickedTower = towersRef.current.find(t => t.x === gridX && t.y === gridY);
         if (clickedTower) {
             const pos = getScreenPos(gridX, gridY); 
             setSelectedPlacedTower({ tower: { ...clickedTower }, x: pos.x, y: pos.y });
             setSelectedTower(null); 
             return;
         }
     }
     
     setSelectedPlacedTower(null);
  };

  const spawnEnemy = () => {
      const start = GAME_PATH[0];
      const wave = gameStateRef.current.wave;
      
      let hp = 110 * Math.pow(1.18, wave - 1); // 1.25 → 1.18 완화
      let speed = 0.025 + Math.min(0.155, (wave * 0.002) + Math.log(wave) * 0.005);

      let color = '#f97316';
      let reward = Math.floor(15 + (wave * 2)); // 보상 상향: 12+(w*1.5) → 15+(w*2)

      if (wave % 5 === 0) {
          hp *= 4.0; // 보스 HP 5배 → 4배
          speed *= 0.6;
          color = '#a855f7';
          reward *= 5;
      }
      
      enemiesRef.current.push({
          id: Math.random().toString(), x: start.x, y: start.y, pathIndex: 0,
          health: hp, maxHealth: hp, speed: speed, 
          color: color, frozen: 0, reward: reward
      });
  };

  const createParticles = (x: number, y: number, color: string, count: number, text?: string) => {
      for(let i=0; i<count; i++) particlesRef.current.push({
          id: Math.random().toString(), x, y,
          vx: (Math.random() - 0.5) * 2.5, vy: (Math.random() - 0.5) * 2.5,
          life: 1.0, color, text
      });
  };
  
  function shadeColor(color: string, percent: number) {
    let R = parseInt(color.substring(1,3),16);
    let G = parseInt(color.substring(3,5),16);
    let B = parseInt(color.substring(5,7),16);
    R = Math.floor(R * (100 + percent) / 100); G = Math.floor(G * (100 + percent) / 100); B = Math.floor(B * (100 + percent) / 100);
    R = Math.min(255, R); G = Math.min(255, G); B = Math.min(255, B);
    return "#"+(R.toString(16).padStart(2,'0'))+(G.toString(16).padStart(2,'0'))+(B.toString(16).padStart(2,'0'));
  }

  return (
    <div className="relative w-full h-screen bg-white overflow-hidden touch-none">
      <canvas
        ref={canvasRef} width={window.innerWidth} height={window.innerHeight}
        onMouseMove={(e) => { const p = calculateGridPos(e.clientX, e.clientY); mouseRef.current = p; }}
        onClick={handleCanvasClick} className="cursor-crosshair touch-none"
      />
      {/* Confirm/Cancel placement buttons */}
      {selectedTower && pendingPlacement && (() => {
          const sp = getScreenPos(pendingPlacement.gridX, pendingPlacement.gridY);
          return (
            <div className="absolute z-[55] pointer-events-auto flex gap-2" style={{ left: sp.x, top: sp.y - 70 * zoom, transform: 'translate(-50%, -50%)' }}>
              <button
                onClick={(e) => { e.stopPropagation(); confirmPlacement(); }}
                className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg border-2 border-emerald-300 flex items-center justify-center active:scale-90 transition-all animate-bounce"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); cancelPlacement(); }}
                className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 shadow-lg border-2 border-slate-500 flex items-center justify-center active:scale-90 transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          );
      })()}
      <GameUI 
        money={uiState.money} lives={uiState.lives} wave={uiState.wave}
        isPlaying={uiState.isPlaying} isPaused={uiState.isPaused} isGameOver={uiState.isGameOver}
        selectedTower={selectedTower} onSelectTower={(t) => { setSelectedTower(t); setPendingPlacement(null); }}
        onNextWave={startWave} onRestart={() => window.location.reload()}
        onTogglePause={() => { gameStateRef.current.isPaused = !gameStateRef.current.isPaused; setUiState({...gameStateRef.current}); }}
        hoveredTowerInfo={hoveredTowerInfo} gameSpeed={uiState.gameSpeed}
        onToggleSpeed={() => { 
          const speeds = [0.5, 1, 1.5, 2];
          const current = gameStateRef.current.gameSpeed;
          const nextIdx = (speeds.indexOf(current) + 1) % speeds.length;
          gameStateRef.current.gameSpeed = speeds[nextIdx];
          setUiState({...gameStateRef.current}); 
        }}
        selectedPlacedTower={selectedPlacedTower} onSellTower={sellTower} onUpgradeTower={upgradeTower}
        onCloseSelection={() => setSelectedPlacedTower(null)} zoom={zoom}
        onZoomIn={() => setZoom(z => Math.min(z+0.1, 2))} onZoomOut={() => setZoom(z => Math.max(z-0.1, 0.4))}
        onPan={(dx, dy) => setPan(p => ({ x: p.x + dx, y: p.y + dy }))}
        isAutoStart={uiState.isAutoStart}
        onToggleAutoStart={toggleAutoStart}
        selectedSkill={selectedSkill}
        onSelectSkill={(skill) => {
            setSelectedSkill(skill);
            setSelectedTower(null);
            setSelectedPlacedTower(null);
            setSkillTargetTower(null);
            setPendingPlacement(null);
        }}
        skillTargetTower={skillTargetTower}
        onApplySkill={applySkill}
        onCancelSkill={() => { setSelectedSkill(null); setSkillTargetTower(null); }}
        onApplySkillToSelected={applySkillToSelected}
      />
    </div>
  );
};

export default GameCanvas;