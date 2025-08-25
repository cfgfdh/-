/**
 * 🎮 阿尔修斯的传说 - Canvas RPG 游戏核心
 * 
 * 一个完整的5章节中世纪奇幻风格RPG游戏
 * 
 * 主要特色：
 * - 完整5章节剧情：从迷雾森林到魔王城堡
 * - 智能技能系统：4种可叠加技能
 * - 动态敌人AI：不同敌人类型和攻击模式
 * - 角色成长系统：升级、加点、装备购买
 * - 视觉效果系统：背景图、角色头像、技能特效
 * - 动态画布适配：根据背景图自动调整游戏区域
 * 
 * @author Zzy
 * @version 2.0
 * @date 2025-08
 */
(function(){
  // 工具函数：数值限制、随机数、碰撞检测、伤害计算、经验值公式
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function rand(a,b){ return a + Math.random()*(b-a); }
  function rectsOverlap(a,b){ return !(a.x+a.w < b.x || a.x > b.x+b.w || a.y+a.h < b.y || a.y > b.y+b.h); }
  function dmgCalc(atk, def){ return Math.max(1, atk - def) * rand(0.9, 1.1); }
  function xpToNext(level){ return Math.round(10 * Math.pow(level, 1.5)); }

  /**
   * 🎯 游戏核心类
   * 
   * 管理游戏的所有核心逻辑：
   * - 玩家控制和技能系统
   * - 敌人AI和生成逻辑  
   * - 章节系统和剧情展示
   * - 碰撞检测和战斗计算
   * - 资源管理和画布适配
   */
  class Game {
    constructor(canvas){
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.world = { w: 1600, h: 900 }; // 默认世界尺寸，会根据背景图动态调整
      this.input = { w:false, a:false, s:false, d:false, space:false, e:false, q:false, r:false, z:false, esc:false };
      this.paused = false;
      this.last = performance.now();
      this.enemies = [];
      this.projectiles = []; // 玩家魔法弹
      this.enemyProjectiles = []; // 敌人的远程攻击
      this.spawnTimer = 0;
      
      // 🏰 5章节系统：完整的史诗冒险
      this.chapter = 1;
      this.killCount = { 
        slimes: 0,           // 第1章：腐化史莱姆
        orcs: 0,             // 第2章：堕落兽人
        fire_bats: 0,        // 第3章：火焰蝙蝠
        lava_giants: 0,      // 第3章：熔岩巨人
        ice_archers: 0,      // 第4章：冰霜射手
        ice_knights: 0,      // 第4章：寒冰骑士
        demon_lord: 0        // 第5章：暗影魔王(Boss)
      };
      this.storyShown = false;
      this.showChapterComplete = false;
      this.chapterTransitionTime = 0;
      this.bossSpawned = false; // Boss生成标记
      this.nextChapterNumber = null; // 等待进入的下一章编号
      this.showChapterContinueHint = false; // 显示"按Z继续"提示

      // 👤 主角：阿尔修斯·星辉 - 精灵王族后裔，持有星辉法杖的英雄
      this.player = {
        x: 400, y: 350, w: 18, h: 18, // 临时位置，会在adjustCanvasSize后重新设置
        hp: 75, maxHp: 75, atk: 12, def: 5, spd: 150, // 🔥 增强的基础数值
        level: 1, xp: 0, xpToNext: xpToNext(1), statPoints: 0,
        gold: 0, weapon: 0, armor: 0, attackCd: 0, faceX: 1, faceY: 0,
        lastMoveX: 1, lastMoveY: 0, // 记录最后移动方向用于智能射击
        // ⚡ 技能系统：可叠加使用的强大技能
        skills: {
          dash: { level: 1, cooldown: 0, maxCooldown: 2.5, active: false, duration: 0 }, // 冲刺：穿越敌人
          rapidFire: { level: 1, cooldown: 0, maxCooldown: 4.0, active: false, shots: 0 }, // 连发：快速射击
          circleBlast: { level: 0, cooldown: 0, maxCooldown: 6.0 }, // 环形弹幕：360度攻击(7级解锁)
          knockback: { level: 1, cooldown: 0, maxCooldown: 1.0 } // 击退：范围控制技能
        }
      };

      this.bindInput();
      this.showChapterStory();
    }

    // 调整画布尺寸以匹配背景图尺寸
    adjustCanvasSize() {
      let bgKey = '';
      switch(this.chapter) {
        case 1: bgKey = 'forest_bg'; break;
        case 2: bgKey = 'abyss_bg'; break;
        case 3: bgKey = 'volcano_bg'; break;
        case 4: bgKey = 'fortress_bg'; break;
        case 5: bgKey = 'castle_bg'; break;
        default: return; // 无背景图，保持原尺寸
      }
      
      const bgImage = window.Assets?.getImage(bgKey);
      if(bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
        // 设置画布尺寸完全匹配背景图尺寸，不再限制最大尺寸
        const newWidth = bgImage.naturalWidth;
        const newHeight = bgImage.naturalHeight;
        
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        
        // 更新世界尺寸以完全匹配画布，确保无空白区域
        this.world.w = newWidth;
        this.world.h = newHeight;
        
        // 将玩家重新定位到画布中央
        this.player.x = Math.max(0, Math.min(newWidth/2 - this.player.w/2, newWidth - this.player.w));
        this.player.y = Math.max(0, Math.min(newHeight/2 - this.player.h/2, newHeight - this.player.h));
        
        console.log(`画布尺寸已调整为: ${newWidth}x${newHeight}`);
      }
    }
    
    showChapterStory() {
      if(this.storyShown) return;
      this.storyShown = true;
      
      // 调整画布尺寸以匹配当前章节的背景图
      this.adjustCanvasSize();
      
      const stories = {
        1: {
          title: "第一章：迷雾森林外围",
          content: `三天前，恐怖降临了艾尔多拉王国。

天空突然被暗云笼罩，紫色的闪电撕裂长空。传说中的暗影魔王巴尔撒泽突破了封印，率领恶魔大军闯入人类世界。

王都在一夜之间沦陷，无数民众逃离家园。最令人绝望的是——美丽善良的艾莉娅公主被魔王亲自掳走，消失在了他那座漂浮在虚空中的恶魔城堡里。

「星辉...我的孩子，你是我们最后的希望了。」艾德华国王苍老的声音颤抖着，「你体内流淌着古老精灵王族的血脉，手持的星辉法杖是千年前先祖用来封印魔王的圣器。」

国王双手颤抖地将一卷古老的预言交给他：「只有光明之子才能再次封印黑暗，拯救我们的世界。艾莉娅...她是纯洁无暇的圣女，魔王掳走她一定有着邪恶的目的。」

阿尔修斯·星辉接受了这个艰难的使命。现在，他踏入了被魔王诅咒的迷雾森林外围——这里原本是王国最美丽的地方，如今却被黑暗力量扭曲，史莱姆们被腐化成了怪物。

「艾莉娅，等着我...我一定会救你出来，重新封印魔王，拯救这个世界！」

星辉法杖散发出温和的圣光，这是希望的象征，也是他内心不屈意志的体现。

目标：清理15只腐化史莱姆，踏上拯救世界的英雄之路。`,
          portraits: { kingdom: true, princess: true, player: true, demonLord: true }
        },
        2: {
          title: "第二章：哀嚎深渊",
          content: `迷雾森林已被净化，阿尔修斯踏上了通往哀嚎深渊的道路。这里是魔王势力在人间的第一道防线，充满了被暗影力量腐蚀的兽人战士。

深渊中不断传来令人心碎的哀嚎声，有些是艾莉娅公主微弱的呼救，有些是被魔王奴役的生灵的痛苦呻吟。

「艾莉娅的声音...她就在前方！」星辉法杖的光芒变得更加急切，感应到公主的痛苦。

但魔王的计谋远比想象中狡猾。这些兽人战士曾经是王国的勇士，却被暗影力量洗脑，失去了理智。阿尔修斯必须战胜他们，但每一次战斗都让他心痛不已。

「原谅我...为了拯救更多人，我必须战胜你们！」

他知道，只有到达魔王城堡，才能真正拯救所有人——包括这些被控制的战士们。

目标：击败15只堕落兽人，突破魔王的第一道防线。`,
          portraits: { kingdom: true, princess: true, player: true, demonLord: true }
        },
        3: {
          title: "第三章：火焰山脊", 
          content: `离开哀嚎深渊，阿尔修斯攀上了灼热的火焰山脊。这里是魔王领域的外围防线，岩浆奔流，火星四溅。

空中盘旋着被暗影腐化的火焰蝙蝠，地面上游荡着巨大的熔岩巨人。它们都是魔王的守卫，阻挡着任何胆敢接近城堡的勇士。

「这些生物本来是山脉的守护者...现在却成了魔王的爪牙。」

星辉法杖在高温中依然闪耀，但阿尔修斯感到前所未有的压力。艾莉娅的声音越来越微弱，他必须加快速度。

火焰无法阻挡他拯救爱人的决心！

目标：消灭20只火焰蝙蝠和10只熔岩巨人。`,
          portraits: { kingdom: true, princess: true, player: true, demonLord: true }
        },
        4: {
          title: "第四章：冰霜要塞",
          content: `穿过火焰山脊，阿尔修斯惊讶地发现前方是一片冰天雪地。这里是魔王的冰霜要塞，强烈的魔法制造出了极地般的寒冷。

要塞中驻扎着魔王的精锐部队：冰霜射手和寒冰骑士。它们训练有素，是最后的防线。

「这种极端的魔法...魔王的力量比我想象的还要强大。」

但是，星辉法杖的温暖光芒给了他勇气。他能感觉到艾莉娅就在不远的城堡中，她的生命之光虽然微弱，但仍在坚持。

「艾莉娅，再坚持一下！我马上就到了！」

这是最后一道防线，突破这里，魔王城堡就在眼前！

目标：击败20名冰霜射手和10名寒冰骑士。`,
          portraits: { kingdom: true, princess: true, player: true, demonLord: true }
        },
        5: {
          title: "第五章：魔王城堡",
          content: `终于，阿尔修斯站在了暗影魔王城堡的门前。这座邪恶的建筑高耸入云，周围雷电交加，充满了黑暗的魔法气息。

在城堡的最高塔楼中，他看到了被束缚的艾莉娅公主。她的光芒即将熄灭，时间已经不多了。

「星辉...你终于来了...」艾莉娅微弱的声音传来。

「我发誓，我会救你出来的！」阿尔修斯紧握星辉法杖，准备面对最终的挑战。

突然，可怕的笑声响彻城堡：

「哈哈哈！愚蠢的法师，你以为能够阻止我吗？这个王国的光明即将永远消失！」

暗影魔王现身了！这将是决定艾尔多拉王国命运的最终决战！

目标：击败暗影魔王，拯救艾莉娅公主！`,
          portraits: { kingdom: true, princess: true, player: true, demonLord: true }
        }
      };

      const story = stories[this.chapter];
      if(story) {
        // 显示故事时暂停游戏
        this.togglePause(true);
        const isFirstChapter = (this.chapter === 1);
        window.UI.showStoryDialog(story.title, story.content, () => {
          // 故事结束后恢复游戏
          this.togglePause(false);
        }, isFirstChapter, null, story.portraits || {});
      }
    }    bindInput(){
      const kmap = { 
        KeyW:"w", KeyA:"a", KeyS:"s", KeyD:"d", 
        ArrowUp:"w", ArrowLeft:"a", ArrowDown:"s", ArrowRight:"d", 
        Space:"space", KeyE:"e", KeyQ:"q", KeyR:"r", KeyZ:"z", Escape:"esc" 
      };
      window.addEventListener("keydown", (e)=>{ const k=kmap[e.code]; if(k){ this.input[k]=true; e.preventDefault(); } });
      window.addEventListener("keyup", (e)=>{ const k=kmap[e.code]; if(k){ this.input[k]=false; e.preventDefault(); } });
    }

    togglePause(pause){
      this.paused = pause ?? !this.paused;
      return this.paused;
    }

    buy(kind){
      const p = this.player;
      if(kind==="sword" && p.gold>=20){ p.gold-=20; p.atk+=20; p.weapon++; }
      if(kind==="armor" && p.gold>=20){ p.gold-=20; p.def+=15; p.armor++; }
      if(kind==="heal" && p.gold>=10){ p.gold-=10; p.hp = p.maxHp; }
    }

    addPoint(stat){
      const p=this.player;
      if(p.statPoints<=0) return;
      if(stat==="hp"){ p.maxHp+=100; p.hp=p.maxHp; } // 增强：+50→+100血量
      if(stat==="atk"){ p.atk+=20; } // 增强：+5→+10攻击
      if(stat==="def"){ p.def+=10; } // 增强：+5→+8防御
      if(stat==="spd"){ p.spd+=15; } // 增强：+5→+15速度
      p.statPoints--;
    }

    gainXP(v){
      const p=this.player;
      p.xp += v;
      while(p.xp >= p.xpToNext){
        p.xp -= p.xpToNext;
        p.level++;
        p.statPoints += 2; // 增强：每级获得2个加点而不是1个
        p.xpToNext = xpToNext(p.level);
        
        // 升级时自动成长属性
        p.maxHp += 15; // 每级自动+15血量
        p.hp = p.maxHp; // 升级时满血
        p.atk += 5; // 每级自动+5攻击
        p.def += 3; // 每级自动+3防御
        p.spd += 5; // 每级自动+5速度
        
        // 升级时技能增强
        if(p.level <= 10) {
          p.skills.dash.level = p.level;
          p.skills.rapidFire.level = p.level;
          p.skills.knockback.level = p.level;
        }
        // 7级解锁环形弹幕（降低解锁等级）
        if(p.level >= 7 && p.skills.circleBlast.level === 0) {
          p.skills.circleBlast.level = 1;
        }
        if(p.level > 7) {
          p.skills.circleBlast.level = p.level - 6;
        }
        
        // 高级技能强化
        if(p.level > 10) {
          p.skills.dash.level = p.level;
          p.skills.rapidFire.level = p.level;
          p.skills.knockback.level = p.level;
          p.skills.circleBlast.level = p.level - 6;
        }
      }
    }

    // 获取敌人生成位置（基于背景图边界）
    getEnemySpawnPosition() {
      const bgBounds = this.getBackgroundBounds();
      const margin = 5;
      const side = Math.floor(rand(0,4));
      let x = 0, y = 0;
      
      if(side === 0) { // 上边
        x = rand(margin, bgBounds.maxX - margin);
        y = margin;
      }
      if(side === 1) { // 右边
        x = bgBounds.maxX - margin;
        y = rand(margin, bgBounds.maxY - margin);
      }
      if(side === 2) { // 下边
        x = rand(margin, bgBounds.maxX - margin);
        y = bgBounds.maxY - margin;
      }
      if(side === 3) { // 左边
        x = margin;
        y = rand(margin, bgBounds.maxY - margin);
      }
      
      return {x, y};
    }

    spawnSlime(){
      const pos = this.getEnemySpawnPosition();
      const zone = Math.max(0, this.player.level-1);
      const e = {
        type: 'slime',
        x: pos.x, y: pos.y, w:20, h:20,
        hp: 25+zone*2, maxHp: 25+zone*2, // 修复：hp应该等于maxHp
        atk: 8+zone*1.5, def: 3+Math.floor(zone/3), spd: 70+zone*3, // 增强攻击力和速度
        xp: 4+zone, gold: 2+Math.floor(zone/2),
        hitCd: 0, touchCd: 0, dead:false,
      };
      this.enemies.push(e);
    }
    
    spawnOrc(){
      const pos = this.getEnemySpawnPosition();
      const zone = Math.max(0, this.player.level-1);
      const e = {
        type: 'orc',
        x: pos.x, y: pos.y, w:25, h:25,
        hp: 150+zone*4, maxHp: 150+zone*4, // 修复：maxHp应该等于hp
        atk: 15+zone*3, def: 8+Math.floor(zone/2), spd: 55+zone*2, // 高攻击力的重装单位
        xp: 12+zone*2, gold: 5+Math.floor(zone*1.5),
        hitCd: 0, touchCd: 0, dead:false,
      };
      this.enemies.push(e);
    }

    spawnFireBat(){
      const pos = this.getEnemySpawnPosition();
      const zone = Math.max(0, this.player.level-1);
      const e = {
        type: 'fire_bat',
        x: pos.x, y: pos.y, w:18, h:18,
        hp: 50+zone*2, maxHp: 50+zone*2, // 修复：maxHp应该等于hp
        atk: 12+zone*2, def: 3, spd: 120+zone*4, // 快速但脆弱的敌人
        xp: 6+zone, gold: 5+Math.floor(zone/2),
        hitCd: 0, touchCd: 0, dead:false,
      };
      this.enemies.push(e);
    }

    spawnLavaGiant(){
      const pos = this.getEnemySpawnPosition();
      const zone = Math.max(0, this.player.level-1);
      const e = {
        type: 'lava_giant',
        x: pos.x, y: pos.y, w:40, h:40,
        hp: 300+zone*8, maxHp: 300+zone*8, // 修复：maxHp应该等于hp
        atk: 25+zone*4, def: 12+Math.floor(zone*0.8), spd: 40+zone*1.5, // 慢速但极高攻击和防御
        xp: 20+zone*3, gold: 25+Math.floor(zone*2),
        hitCd: 0, touchCd: 0, dead:false,
      };
      this.enemies.push(e);
    }

    spawnIceArcher(){
      const pos = this.getEnemySpawnPosition();
      const zone = Math.max(0, this.player.level-1);
      const e = {
        type: 'ice_archer',
        x: pos.x, y: pos.y, w:22, h:22,
        hp: 100+zone*3, maxHp: 100+zone*3, // 修复：maxHp应该等于hp
        atk: 18+zone*3, def: 4+Math.floor(zone/3), spd: 90+zone*2, // 高攻击力远程单位
        xp: 15+zone*2, gold: 15+Math.floor(zone*1.5),
        hitCd: 0, touchCd: 0, dead:false,
        // 远程攻击相关
        attackTimer: 0, attackCooldown: 1.5 // 增强：更快的攻击频率
      };
      this.enemies.push(e);
    }

    spawnIceKnight(){
      const pos = this.getEnemySpawnPosition();
      const zone = Math.max(0, this.player.level-1);
      const e = {
        type: 'ice_knight',
        x: pos.x, y: pos.y, w:30, h:30,
        hp: 200+zone*6, maxHp: 200+zone*6, // 修复：maxHp应该等于hp
        atk: 22+zone*4, def: 10+Math.floor(zone*0.6), spd: 60+zone*3, // 平衡的重装单位
        xp: 25+zone*4, gold: 40+Math.floor(zone*3),
        hitCd: 0, touchCd: 0, dead:false,
        // 冲锋攻击相关
        chargeTimer: 0, chargeCooldown: 3.0, charging: false // 增强：更频繁的冲锋
      };
      this.enemies.push(e);
    }

    spawnDemonLord(){
      // Boss生成在背景图中央
      const bgBounds = this.getBackgroundBounds();
      const e = {
        type: 'demon_lord',
        x: bgBounds.maxX/2 - 50, y: bgBounds.maxY/2 - 100, w:100, h:100,
        hp: 2000, maxHp: 2000, // 修复：maxHp应该等于hp
        atk: 35, def: 20, spd: 90, // 增强：高攻击力，中等防御，合理速度
        xp: 1000, gold: 500,
        hitCd: 0, touchCd: 0, dead:false,
        // Boss技能相关
        phase: 1, // 战斗阶段
        skillTimer: 0, skillCooldown: 2.5, // 增强：更频繁的技能释放
        shadowBalls: [], // 暗影球攻击
        summonTimer: 0
      };
      this.enemies.push(e);
    }

    attack(){
      const p = this.player;
      if(p.attackCd > 0) return;
      p.attackCd = 0.25; // 增强：射击间隔0.4→0.25秒
      
      const {dirX, dirY} = this.getAttackDirection();
      this.fireProjectile(dirX, dirY, p.atk);
    }
    
    // 计算射击方向（优先瞄准最近敌人）
    getAttackDirection() {
      const p = this.player;
      
      // 寻找最近的敌人作为目标
      let targetEnemy = null;
      let minDistance = Infinity;
      
      for(const e of this.enemies) {
        if(e.dead) continue;
        const dx = (e.x + e.w/2) - (p.x + p.w/2);
        const dy = (e.y + e.h/2) - (p.y + p.h/2);
        const distance = Math.hypot(dx, dy);
        
        if(distance < minDistance) {
          minDistance = distance;
          targetEnemy = e;
        }
      }
      
      // 如果找到目标敌人，朝向敌人射击；否则朝移动方向射击
      let dirX = p.lastMoveX;
      let dirY = p.lastMoveY;
      
      if(targetEnemy) {
        const dx = (targetEnemy.x + targetEnemy.w/2) - (p.x + p.w/2);
        const dy = (targetEnemy.y + targetEnemy.h/2) - (p.y + p.h/2);
        const distance = Math.hypot(dx, dy);
        if(distance > 0) {
          dirX = dx / distance;
          dirY = dy / distance;
        }
      }
      
      return { dirX, dirY };
    }
    
    fireProjectile(dirX, dirY, damage) {
      const p = this.player;
      // 从玩家前方生成魔法弹，固定距离
      const spawnDistance = 25;
      const projectileX = p.x + p.w/2 - 4 + dirX * spawnDistance;
      const projectileY = p.y + p.h/2 - 4 + dirY * spawnDistance;
      
      const projectile = {
        x: projectileX, 
        y: projectileY,
        w: 10, h: 10, // 增强：体积8→10
        vx: dirX * 450, // 增强：弹速300→450
        vy: dirY * 450,
        damage: damage * 1.5, // 增强：伤害1.5倍
        life: 2.0, // 增强：存活时间1.5→2.0秒
        dead: false
      };
      this.projectiles.push(projectile);
    }
    
    useDash() {
      const p = this.player;
      const skill = p.skills.dash;
      if(skill.cooldown > 0 || skill.active) return false;
      
      skill.cooldown = skill.maxCooldown;
      skill.active = true;
      skill.duration = 5 + skill.level * 1; // 基础5秒，每级1秒
      return true;
    }
    
    useRapidFire() {
      const p = this.player;
      const skill = p.skills.rapidFire;
      if(skill.cooldown > 0 || skill.active) return false;
      
      skill.cooldown = skill.maxCooldown;
      skill.active = true;
      skill.shots = 10 + skill.level; // 基础3发，每级+1发
      return true;
    }
    
    useCircleBlast() {
      const p = this.player;
      const skill = p.skills.circleBlast;
      if(skill.level === 0 || skill.cooldown > 0) return false;
      
      skill.cooldown = skill.maxCooldown;
      const bulletCount = 8 + skill.level * 2; // 基础8发，每级+2发
      const damage = p.atk * (0.7 + skill.level * 0.1); // 基础70%伤害，每级+10%
      
      for(let i = 0; i < bulletCount; i++) {
        const angle = (Math.PI * 2 * i) / bulletCount;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        this.fireProjectile(dirX, dirY, damage);
      }
      return true;
    }
    
    useKnockback() {
      const p = this.player;
      const skill = p.skills.knockback;
      if(skill.cooldown > 0) return false;
      
      skill.cooldown = skill.maxCooldown;
      const knockbackForce = 180; // 增强：击退距离120→180
      const knockbackRange = 80; // 增强：击退范围40→80
      
      // 找到玩家周围的敌人并击退
      for(const e of this.enemies) {
        if(e.dead) continue;
        
        const dx = (e.x + e.w/2) - (p.x + p.w/2);
        const dy = (e.y + e.h/2) - (p.y + p.h/2);
        const distance = Math.hypot(dx, dy);
        
        // 如果敌人在击退范围内
        if(distance <= knockbackRange && distance > 0) {
          const dirX = dx / distance;
          const dirY = dy / distance;
          
          // 击退敌人
          e.x += dirX * knockbackForce;
          e.y += dirY * knockbackForce;
          
          // 确保敌人不会被击退到边界外
          e.x = clamp(e.x, 0, this.world.w - e.w);
          e.y = clamp(e.y, 0, this.world.h - e.h);
          
          // 给敌人一个短暂的击中效果
          e.hitCd = 0.3;
        }
      }
      
      return true;
    }

    update(dt){
      if(this.paused){ return; }

      // 章节过渡效果倒计时
      if(this.chapterTransitionTime > 0) {
        this.chapterTransitionTime -= dt;
      }

      // 输入与移动
      const p=this.player;
      
      // 技能冷却更新
      for(const skillName in p.skills) {
        const skill = p.skills[skillName];
        if(skill.cooldown > 0) skill.cooldown -= dt;
        if(skill.duration !== undefined && skill.duration > 0) skill.duration -= dt;
      }
      
      // 冲刺技能处理
      if(p.skills.dash.active) {
        if(p.skills.dash.duration <= 0) {
          p.skills.dash.active = false;
        }
      }
      
      // 连发技能处理
      if(p.skills.rapidFire.active && p.skills.rapidFire.shots > 0) {
        if(p.attackCd <= 0) {
          const {dirX, dirY} = this.getAttackDirection();
          this.fireProjectile(dirX, dirY, p.atk);
          p.attackCd = 0.08; // 增强：连发间隔0.15→0.08秒
          p.skills.rapidFire.shots--;
          if(p.skills.rapidFire.shots <= 0) {
            p.skills.rapidFire.active = false;
          }
        }
      }
      
      // 计算移动速度（冲刺时翻倍）
      const currentSpd = p.skills.dash.active ? p.spd * 2 : p.spd;
      
      let dx = (this.input.d?1:0) - (this.input.a?1:0);
      let dy = (this.input.s?1:0) - (this.input.w?1:0);
      if(dx!==0 || dy!==0){
        const len = Math.hypot(dx,dy);
        dx/=len; dy/=len;
        p.faceX = dx; p.faceY = dy;
        p.lastMoveX = dx; p.lastMoveY = dy; // 记录移动方向
      }
      p.x += dx * currentSpd * dt;
      p.y += dy * currentSpd * dt;
      
      // 根据背景图尺寸限制角色移动范围
      const bgBounds = this.getBackgroundBounds();
      p.x = clamp(p.x, bgBounds.minX, bgBounds.maxX - p.w);
      p.y = clamp(p.y, bgBounds.minY, bgBounds.maxY - p.h);

      // 技能使用 - 移除互斥限制，允许同时使用多个技能
      if(this.input.q){ this.useDash(); }
      if(this.input.e){ this.useRapidFire(); }
      if(this.input.r){ this.useCircleBlast(); }
      if(this.input.z){ 
        if(this.showChapterContinueHint) {
          // 如果在等待进入下一章，使用Z键继续
          this.continueToNextChapter();
        } else {
          // 否则使用击退技能
          this.useKnockback(); 
        }
      }
      
      if(this.input.space){ this.attack(); }
      if(this.input.e){ /* 由 main.js 统一处理开关面板 */ }

      // 冷却
      if(p.attackCd>0) p.attackCd -= dt;

      // 更新魔法弹
      for(const proj of this.projectiles) {
        if(proj.dead) continue;
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.life -= dt;
        
        // 超出边界或生命耗尽
        if(proj.life <= 0 || proj.x < -50 || proj.x > this.world.w + 50 || 
           proj.y < -50 || proj.y > this.world.h + 50) {
          proj.dead = true;
          continue;
        }
        
        // 碰撞检测（只检测敌人，不检测玩家）
        for(const e of this.enemies) {
          if(e.dead) continue;
          if(rectsOverlap(
            {x: proj.x, y: proj.y, w: proj.w, h: proj.h},
            {x: e.x, y: e.y, w: e.w, h: e.h}
          )) {
            const dmg = dmgCalc(proj.damage, e.def);
            e.hp -= dmg;
            e.hitCd = 0.2;
            proj.dead = true;
            
            if(e.hp <= 0 && !e.dead) {
              e.dead = true;
              this.player.gold += e.gold;
              this.gainXP(e.xp);
              
              // 击杀计数 - 修复所有怪物类型
              this.recordKill(e.type);
              
              // 检查章节进度
              this.checkChapterProgress();
            }
            break;
          }
        }
      }

      // 敌人生成 - 在章节转换期间暂停生成
      if(!this.showChapterComplete && !this.showChapterContinueHint) {
        this.spawnTimer -= dt;
        // 增强难度：根据章节增加敌人数量
        let want = 6;
        if(this.chapter >= 2) want = 8; // 第2章开始增加到8个敌人
        if(this.chapter >= 4) want = 10; // 第4章增加到10个敌人
        
        if(this.enemies.filter(e=>!e.dead).length < want && this.spawnTimer<=0){
          if(this.chapter === 1) {
            this.spawnSlime();
          } else if(this.chapter === 2) {
            this.spawnOrc();
          } else if(this.chapter === 3) {
            // 火焰山脊：混合生成火焰蝙蝠和熔岩巨人，增加巨人概率
            if(Math.random() < 0.6) {
              this.spawnFireBat();
            } else {
              this.spawnLavaGiant();
            }
          } else if(this.chapter === 4) {
            // 冰霜要塞：混合生成冰霜射手和寒冰骑士，更平衡的比例
            if(Math.random() < 0.65) {
              this.spawnIceArcher();
            } else {
              this.spawnIceKnight();
            }
          } else if(this.chapter === 5) {
            // 魔王城堡：只生成Boss
            if(!this.bossSpawned) {
              this.spawnDemonLord();
              this.bossSpawned = true;
            }
          }
          // 增强难度：更快的生成速度
          this.spawnTimer = rand(0.5, 1.2); // 原来是0.8-1.6，现在是0.5-1.2
        }
      }

      // 敌人AI: 追踪 + 碰撞伤害 + 特殊技能
      for(const e of this.enemies){
        if(e.dead) continue;
        
        // 更新击中闪烁计时
        if(e.hitCd > 0) e.hitCd -= dt;
        
        const vx = (p.x + p.w/2) - (e.x + e.w/2);
        const vy = (p.y + p.h/2) - (e.y + e.h/2);
        const dist = Math.hypot(vx, vy) || 1;
        const ux = vx/dist, uy = vy/dist;
        
        // 射手远程攻击逻辑
        if(e.type === 'ice_archer') {
          e.attackTimer -= dt;
          if(dist <= 250 && e.attackTimer <= 0) { // 增强：攻击范围从200扩大到250
            // 发射冰箭
            const arrow = {
              x: e.x + e.w/2 - 3,
              y: e.y + e.h/2 - 3,
              w: 6, h: 6,
              vx: ux * 200, // 增强：冰箭速度从150提升到200
              vy: uy * 200,
              damage: e.atk,
              life: 2.5, // 增强：箭矢存活时间更长
              dead: false,
              type: 'enemy_projectile'
            };
            this.enemyProjectiles.push(arrow);
            e.attackTimer = e.attackCooldown;
          }
          // 射手保持距离，不会冲上来
          if(dist > 120) { // 增强：从100调整到120，更积极地保持攻击距离
            e.x += ux * e.spd * dt * 0.4; // 增强：移动速度从0.3提升到0.4
            e.y += uy * e.spd * dt * 0.4;
          } else if(dist < 80) {
            // 增强：如果玩家太近，射手会后退
            e.x -= ux * e.spd * dt * 0.5;
            e.y -= uy * e.spd * dt * 0.5;
          }
        } else {
          // 其他敌人正常追踪
          e.x += ux * e.spd * dt;
          e.y += uy * e.spd * dt;
        }

        // 贴身伤害有冷却
        if(e.touchCd>0) e.touchCd -= dt;
        const touching = rectsOverlap({x:e.x,y:e.y,w:e.w,h:e.h},{x:p.x,y:p.y,w:p.w,h:p.h});
        if(touching && e.touchCd<=0){
          const dmg = dmgCalc(e.atk, p.def);
          p.hp -= dmg;
          e.touchCd = 0.5; // 增强难度：接触伤害冷却从0.7减少到0.5秒
          if(p.hp<=0){
            // 简易死亡处理：复活并扣金币
            p.hp = p.maxHp;
            p.gold = Math.max(0, p.gold - 10); // 增强：死亡惩罚从5金币增加到10金币
            p.x = this.world.w/2; p.y = this.world.h/2;
            // 清理存量敌人和魔法弹，给玩家缓口气
            this.enemies = [];
            this.projectiles = [];
            this.enemyProjectiles = [];
            break;
          }
        }
      }

      // 更新敌人弹药
      for(const proj of this.enemyProjectiles) {
        if(proj.dead) continue;
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.life -= dt;
        
        // 超出边界或生命耗尽
        if(proj.life <= 0 || proj.x < -50 || proj.x > this.world.w + 50 || 
           proj.y < -50 || proj.y > this.world.h + 50) {
          proj.dead = true;
          continue;
        }
        
        // 检查与玩家的碰撞
        if(rectsOverlap(
          {x: proj.x, y: proj.y, w: proj.w, h: proj.h},
          {x: p.x, y: p.y, w: p.w, h: p.h}
        )) {
          const dmg = dmgCalc(proj.damage, p.def);
          p.hp -= dmg;
          proj.dead = true;
          
          if(p.hp <= 0) {
            // 简易死亡处理
            p.hp = p.maxHp;
            p.gold = Math.max(0, p.gold - 10); // 增强：远程攻击死亡惩罚也增加到10金币
            p.x = this.world.w/2; p.y = this.world.h/2;
            this.enemies = [];
            this.projectiles = [];
            this.enemyProjectiles = [];
            break;
          }
        }
      }

      // 清理死亡实体
      this.enemies = this.enemies.filter(e => !e.dead || Math.random()>0.002);
      this.projectiles = this.projectiles.filter(p => !p.dead);
      this.enemyProjectiles = this.enemyProjectiles.filter(p => !p.dead);
    }
    
    recordKill(enemyType) {
      // 统一的击杀计数处理
      if(enemyType === 'slime') this.killCount.slimes++;
      if(enemyType === 'orc') this.killCount.orcs++;
      if(enemyType === 'fire_bat') this.killCount.fire_bats++;
      if(enemyType === 'lava_giant') this.killCount.lava_giants++;
      if(enemyType === 'ice_archer') this.killCount.ice_archers++;
      if(enemyType === 'ice_knight') this.killCount.ice_knights++;
      if(enemyType === 'demon_lord') this.killCount.demon_lord++;
    }

    checkChapterProgress() {
      if(this.chapter === 1 && this.killCount.slimes >= 20) { // 测试：3只史莱姆
        this.advanceToNextChapter(2);
      } else if(this.chapter === 2 && this.killCount.orcs >= 15) { // 测试：2只兽人
        this.advanceToNextChapter(3);
      } else if(this.chapter === 3 && this.killCount.fire_bats >= 20 && this.killCount.lava_giants >= 10) { // 测试：2只蝙蝠+1只巨人
        this.advanceToNextChapter(4);
      } else if(this.chapter === 4 && this.killCount.ice_archers >= 20 && this.killCount.ice_knights >= 10) { // 测试：2只射手+1只骑士
        this.advanceToNextChapter(5);
      } else if(this.chapter === 5 && this.killCount.demon_lord >= 1) { // Boss战：1只魔王
        // 游戏胜利！
        this.showGameComplete();
      }
    }

    advanceToNextChapter(nextChapter) {
      // 显示章节完成庆祝效果，但不自动跳转
      this.showChapterComplete = true;
      this.chapterTransitionTime = 3.0;
      this.nextChapterNumber = nextChapter; // 保存下一章编号，等待用户手动继续
      this.enemies = []; // 清空当前敌人，避免干扰
      
      // 3秒后隐藏庆祝效果，但不进入下一章
      setTimeout(() => {
        this.showChapterComplete = false;
        // 显示"按Z键继续下一章"的提示
        this.showChapterContinueHint = true;
      }, 3000);
    }
    
    // 用户手动进入下一章
    continueToNextChapter() {
      if(!this.nextChapterNumber) return;
      
      this.chapter = this.nextChapterNumber;
      this.nextChapterNumber = null;
      this.storyShown = false;
      this.bossSpawned = false; // 重置Boss标记
      this.showChapterContinueHint = false;
      
      // 清理之前章节的敌人和弹药，避免混乱
      this.enemies = [];
      this.projectiles = [];
      this.enemyProjectiles = [];
      
      // 重置生成计时器，确保新章节的敌人生成正常
      this.spawnTimer = 1.0;
      
      // 调整画布尺寸以匹配新章节背景图
      this.adjustCanvasSize();
      
      this.showChapterStory(); // 显示下一章故事
    }

    showGameComplete() {
      // 游戏完成，显示胜利画面
      window.UI.showStoryDialog(
        "游戏完成！", 
        `恭喜！阿尔修斯·星辉成功击败了暗影魔王，拯救了艾莉娅公主！

艾尔多拉王国再次迎来了光明，人民们欢声笑语。

「谢谢你，星辉...」艾莉娅轻抚着他的脸颊，「你真的做到了。」

「我说过，我会救你出来的。」阿尔修斯握住她的手，「现在，我们回家吧。」

星辉法杖闪烁着温和的光芒，见证着这个美好的时刻。

感谢游玩！你是真正的英雄！`,
        () => {
          // 可以在这里重置游戏或显示积分
        },
        false, // 不是第一章
        "结束游戏" // 自定义按钮文字
      );
    }

    // 获取背景图的实际显示边界
    getBackgroundBounds() {
      const {canvas} = this;
      
      // 现在画布尺寸应该与背景图匹配，直接使用画布尺寸
      return {
        minX: 0,
        minY: 0,
        maxX: canvas.width,
        maxY: canvas.height
      };
    }

    // 绘制血条的通用方法
    drawHealthBar(ctx, x, y, width, currentHP, maxHP, fillColor = "#44ff44", bgColor = "#444444") {
      const barHeight = 4;
      const barWidth = Math.max(width, 30); // 血条最小宽度30像素
      
      // 血条背景
      ctx.fillStyle = bgColor;
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // 血条填充
      const healthPercent = Math.max(0, currentHP / maxHP);
      const fillWidth = barWidth * healthPercent;
      
      // 根据血量百分比调整颜色
      if(healthPercent > 0.6) {
        ctx.fillStyle = fillColor; // 健康绿色
      } else if(healthPercent > 0.3) {
        ctx.fillStyle = "#ffaa00"; // 警告橙色
      } else {
        ctx.fillStyle = "#ff4444"; // 危险红色
      }
      
      ctx.fillRect(x, y, fillWidth, barHeight);
      
      // 血条边框
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barWidth, barHeight);
    }

    drawEnvironment() {
      const {ctx, canvas, world, player: p} = this;
      // 当世界尺寸等于画布尺寸时，不需要摄像机移动
      const camX = world.w > canvas.width ? clamp(p.x + p.w/2 - canvas.width/2, 0, world.w - canvas.width) : 0;
      const camY = world.h > canvas.height ? clamp(p.y + p.h/2 - canvas.height/2, 0, world.h - canvas.height) : 0;

      if(this.chapter === 1) {
        // 第一章：迷雾森林外围
        const forestBg = window.Assets?.getImage('forest_bg');
        if(forestBg && forestBg.complete && forestBg.naturalWidth > 0) {
          // 背景图完全填充画布，不使用视差滚动
          ctx.drawImage(forestBg, 0, 0, canvas.width, canvas.height);
        } else {
          // Fallback到代码绘制
          ctx.fillStyle = "#1a3d1a";
          ctx.fillRect(0,0,canvas.width,canvas.height);
        }
        
        // 森林迷雾特效
        ctx.fillStyle = "#2e5c2e";
        for(let x = 0; x < canvas.width; x += 8) {
          for(let y = 0; y < canvas.height; y += 8) {
            if(Math.random() < 0.3) {
              ctx.fillRect(x + (camX % 8), y + (camY % 8), 2, 2);
            }
          }
        }
        
        // 迷雾效果
        const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, 300);
        gradient.addColorStop(0, "rgba(200,200,255,0.08)");
        gradient.addColorStop(1, "rgba(150,150,200,0.18)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0,0,canvas.width,canvas.height);
        
        // 飘动的光点
        for(let i = 0; i < 12; i++) {
          const x = Math.sin(performance.now() * 0.0008 + i * 0.5) * 180 + canvas.width/2;
          const y = Math.cos(performance.now() * 0.001 + i * 0.8) * 120 + canvas.height/2;
          const alpha = Math.sin(performance.now() * 0.003 + i) * 0.3 + 0.5;
          ctx.fillStyle = `rgba(220,255,220,${alpha})`;
          ctx.fillRect(x, y, 2, 2);
        }
        
      } else if(this.chapter === 2) {
        // 第二章：哀嚎深渊
        const abyssBg = window.Assets?.getImage('abyss_bg');
        if(abyssBg && abyssBg.complete && abyssBg.naturalWidth > 0) {
          // 背景图完全填充画布
          ctx.drawImage(abyssBg, 0, 0, canvas.width, canvas.height);
        } else {
          // Fallback
          ctx.fillStyle = "#0d0d1a";
          ctx.fillRect(0,0,canvas.width,canvas.height);
        }
        
        // 深渊石块纹理
        ctx.fillStyle = "#1a1a2e";
        for(let x = 0; x < canvas.width; x += 16) {
          for(let y = 0; y < canvas.height; y += 16) {
            if(Math.random() < 0.4) {
              ctx.fillRect(x + (camX % 16), y + (camY % 16), 4, 4);
            }
          }
        }
        
        // 血红色哀嚎光芒
        const redGlow = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, 200);
        redGlow.addColorStop(0, "rgba(120,20,20,0.15)");
        redGlow.addColorStop(1, "rgba(80,0,0,0.08)");
        ctx.fillStyle = redGlow;
        ctx.fillRect(0,0,canvas.width,canvas.height);
        
        // 怨灵粒子效果
        for(let i = 0; i < 18; i++) {
          const x = Math.sin(performance.now() * 0.001 + i * 0.4) * 200 + canvas.width/2;
          const y = Math.cos(performance.now() * 0.0015 + i * 0.6) * 150 + canvas.height/2;
          const alpha = Math.sin(performance.now() * 0.004 + i) * 0.4 + 0.6;
          ctx.fillStyle = `rgba(150,30,30,${alpha})`;
          ctx.fillRect(x, y, 1, 1);
        }
        
      } else if(this.chapter === 3) {
        // 第三章：火焰山脊
        const volcaBg = window.Assets?.getImage('volcano_bg');
        if(volcaBg && volcaBg.complete && volcaBg.naturalWidth > 0) {
          // 背景图完全填充画布
          ctx.drawImage(volcaBg, 0, 0, canvas.width, canvas.height);
        } else {
          // Fallback
          ctx.fillStyle = "#2d1b0e";
          ctx.fillRect(0,0,canvas.width,canvas.height);
        }
        
        // 岩浆纹理
        ctx.fillStyle = "#8b2500";
        for(let x = 0; x < canvas.width; x += 12) {
          for(let y = 0; y < canvas.height; y += 12) {
            if(Math.random() < 0.35) {
              ctx.fillRect(x + (camX % 12), y + (camY % 12), 3, 3);
            }
          }
        }
        
        // 火焰光芒
        const fireGlow = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, 250);
        fireGlow.addColorStop(0, "rgba(255,100,0,0.2)");
        fireGlow.addColorStop(1, "rgba(139,37,0,0.12)");
        ctx.fillStyle = fireGlow;
        ctx.fillRect(0,0,canvas.width,canvas.height);
        
        // 增强火星效果
        for(let i = 0; i < 25; i++) {
          const x = Math.sin(performance.now() * 0.001 + i) * 220 + canvas.width/2;
          const y = Math.cos(performance.now() * 0.002 + i * 0.5) * 130 + canvas.height/2;
          const alpha = Math.sin(performance.now() * 0.005 + i) * 0.4 + 0.7;
          const size = Math.sin(performance.now() * 0.003 + i) + 2;
          ctx.fillStyle = `rgba(255,165,0,${alpha})`;
          ctx.fillRect(x, y, size, size);
        }
        
        // 热浪扭曲效果（模拟）
        if(Math.random() < 0.3) {
          const waveGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
          waveGrad.addColorStop(0, "rgba(255,69,0,0.03)");
          waveGrad.addColorStop(0.5, "rgba(255,140,0,0.05)");
          waveGrad.addColorStop(1, "rgba(255,69,0,0.03)");
          ctx.fillStyle = waveGrad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
      } else if(this.chapter === 4) {
        // 第四章：冰霜要塞
        const fortressBg = window.Assets?.getImage('fortress_bg');
        if(fortressBg && fortressBg.complete && fortressBg.naturalWidth > 0) {
          // 背景图完全填充画布
          ctx.drawImage(fortressBg, 0, 0, canvas.width, canvas.height);
        } else {
          // Fallback
          ctx.fillStyle = "#0f1429";
          ctx.fillRect(0,0,canvas.width,canvas.height);
        }
        
        // 冰霜纹理
        ctx.fillStyle = "#1e2952";
        for(let x = 0; x < canvas.width; x += 10) {
          for(let y = 0; y < canvas.height; y += 10) {
            if(Math.random() < 0.4) {
              ctx.fillRect(x + (camX % 10), y + (camY % 10), 3, 3);
            }
          }
        }
        
        // 冰蓝光芒
        const iceGlow = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, 220);
        iceGlow.addColorStop(0, "rgba(0,150,255,0.18)");
        iceGlow.addColorStop(1, "rgba(0,100,200,0.08)");
        ctx.fillStyle = iceGlow;
        ctx.fillRect(0,0,canvas.width,canvas.height);
        
        // 增强雪花效果
        for(let i = 0; i < 30; i++) {
          const x = Math.sin(performance.now() * 0.0008 + i * 0.8) * 180 + canvas.width/2 + Math.sin(performance.now() * 0.001) * 50;
          const y = Math.cos(performance.now() * 0.0012 + i) * 140 + canvas.height/2;
          const alpha = Math.sin(performance.now() * 0.003 + i) * 0.3 + 0.8;
          const size = Math.sin(performance.now() * 0.002 + i) * 0.5 + 1;
          ctx.fillStyle = `rgba(200,230,255,${alpha})`;
          ctx.fillRect(x, y, size, size);
        }
        
        // 冰晶闪烁
        for(let i = 0; i < 8; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          if(Math.random() < 0.02) {
            ctx.fillStyle = `rgba(150,200,255,0.8)`;
            ctx.fillRect(x, y, 3, 3);
          }
        }
        
      } else if(this.chapter === 5) {
        // 第五章：魔王城内
        const castleBg = window.Assets?.getImage('castle_bg');
        if(castleBg && castleBg.complete && castleBg.naturalWidth > 0) {
          // 背景图完全填充画布
          ctx.drawImage(castleBg, 0, 0, canvas.width, canvas.height);
        } else {
          // Fallback
          ctx.fillStyle = "#1a0d1a";
          ctx.fillRect(0,0,canvas.width,canvas.height);
        }
        
        // 邪恶石砖纹理
        ctx.fillStyle = "#2e1a2e";
        for(let x = 0; x < canvas.width; x += 14) {
          for(let y = 0; y < canvas.height; y += 14) {
            if(Math.random() < 0.45) {
              ctx.fillRect(x + (camX % 14), y + (camY % 14), 4, 4);
            }
          }
        }
        
        // 紫色邪恶光芒
        const evilGlow = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, 300);
        evilGlow.addColorStop(0, "rgba(138,43,226,0.25)");
        evilGlow.addColorStop(1, "rgba(75,0,130,0.12)");
        ctx.fillStyle = evilGlow;
        ctx.fillRect(0,0,canvas.width,canvas.height);
        
        // 魔法能量粒子
        for(let i = 0; i < 20; i++) {
          const x = Math.sin(performance.now() * 0.0012 + i * 0.3) * 200 + canvas.width/2;
          const y = Math.cos(performance.now() * 0.0008 + i * 0.7) * 160 + canvas.height/2;
          const alpha = Math.sin(performance.now() * 0.004 + i) * 0.4 + 0.7;
          ctx.fillStyle = `rgba(138,43,226,${alpha})`;
          ctx.fillRect(x, y, 2, 2);
        }
        
        // 增强闪电效果
        if(Math.random() < 0.08) {
          ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.6 + 0.4})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          const startX = Math.random() * canvas.width;
          const startY = Math.random() * canvas.height * 0.3;
          ctx.moveTo(startX, startY);
          
          // 闪电路径
          for(let i = 1; i <= 5; i++) {
            const x = startX + (Math.random() - 0.5) * 100;
            const y = startY + (canvas.height / 5) * i + (Math.random() - 0.5) * 50;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        
        // 邪恶脉搏效果
        const pulse = Math.sin(performance.now() * 0.005) * 0.1 + 0.9;
        const pulsGrad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, 150 * pulse);
        pulsGrad.addColorStop(0, `rgba(75,0,130,${0.15 * pulse})`);
        pulsGrad.addColorStop(1, "rgba(75,0,130,0)");
        ctx.fillStyle = pulsGrad;
        ctx.fillRect(0,0,canvas.width,canvas.height);
      }
    }

    draw(){
      const {ctx, canvas, world, player: p} = this;
      
      // 摄像机 - 当世界尺寸等于画布尺寸时不移动
      const bgBounds = this.getBackgroundBounds();
      const camX = bgBounds.maxX > canvas.width ? clamp(p.x + p.w/2 - canvas.width/2, 0, bgBounds.maxX - canvas.width) : 0;
      const camY = bgBounds.maxY > canvas.height ? clamp(p.y + p.h/2 - canvas.height/2, 0, bgBounds.maxY - canvas.height) : 0;

      // 地面（不同章节不同背景）
      this.drawEnvironment();
      
      // 网格（当摄像机不移动时，网格也不需要偏移）
      ctx.strokeStyle = this.chapter === 1 ? "rgba(255,255,255,0.06)" : "rgba(139,69,19,0.15)";
      ctx.lineWidth = 1;
      const grid = 32;
      const startX = camX === 0 ? 0 : -(camX % grid);
      const startY = camY === 0 ? 0 : -(camY % grid);
      for(let x=startX; x<canvas.width; x+=grid){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
      for(let y=startY; y<canvas.height; y+=grid){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }

      // 敌人
      for(const e of this.enemies){
        if(e.dead) continue;
        const screenX = Math.floor(e.x - camX);
        const screenY = Math.floor(e.y - camY);
        
        // 敌人高亮边框效果
        if(e.hitCd > 0) {
          // 受伤时红色高亮
          ctx.strokeStyle = "#ff4444";
          ctx.lineWidth = 3;
          ctx.strokeRect(screenX-2, screenY-2, e.w+4, e.h+4);
        } else {
          // 正常时淡淡的类型高亮
          let highlightColor = "#ffffff";
          let lineWidth = 1;
          let lineDash = [2, 2];
          
          if(e.type === 'slime') {
            highlightColor = "#66ff66";
          } else if(e.type === 'orc') {
            highlightColor = "#ff6666";
            lineWidth = 1.5;
          } else if(e.type === 'fire_bat') {
            highlightColor = "#ff9944";
          } else if(e.type === 'lava_giant') {
            highlightColor = "#ff4400";
            lineWidth = 2;
            lineDash = [4, 2]; // 更醒目的虚线
          } else if(e.type === 'ice_archer') {
            highlightColor = "#44aaff";
          } else if(e.type === 'ice_knight') {
            highlightColor = "#66ccff";
            lineWidth = 2;
            lineDash = [3, 3];
          } else if(e.type === 'demon_lord') {
            // Boss特殊效果：闪烁的紫色边框
            const time = performance.now() * 0.005;
            const alpha = Math.sin(time) * 0.3 + 0.7;
            highlightColor = `rgba(255, 68, 255, ${alpha})`;
            lineWidth = 3;
            lineDash = [6, 3]; // Boss专属虚线样式
          }
          
          ctx.strokeStyle = highlightColor;
          ctx.lineWidth = lineWidth;
          ctx.setLineDash(lineDash);
          ctx.strokeRect(screenX-1, screenY-1, e.w+2, e.h+2);
          ctx.setLineDash([]); // 重置虚线
          
          // Boss额外光环效果
          if(e.type === 'demon_lord') {
            const time = performance.now() * 0.003;
            const radius = 5 + Math.sin(time) * 3;
            ctx.strokeStyle = `rgba(138, 43, 226, 0.6)`;
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX - radius, screenY - radius, e.w + radius * 2, e.h + radius * 2);
          }
        }
        
        // 根据敌人类型选择贴图或颜色
        const enemyImg = window.Assets?.getImage(e.type);
        if(enemyImg && enemyImg.complete && enemyImg.naturalWidth > 0) {
          ctx.drawImage(enemyImg, screenX, screenY, e.w, e.h);
        } else {
          // 史莱姆：绿色，兽人：棕色
          ctx.fillStyle = e.type === 'slime' ? "#3bd16f" : "#8b4513";
          ctx.fillRect(screenX, screenY, e.w, e.h);
        }
        
        // 绘制敌人血条
        if(e.type === 'demon_lord') {
          // Boss血条特殊效果：更大更醒目
          this.drawHealthBar(ctx, screenX - 10, screenY - 12, e.w + 20, e.hp, e.maxHp, "#ff44ff", "#330033");
          
          // Boss血条上方显示名称
          ctx.fillStyle = "#ff44ff";
          ctx.font = "bold 12px Arial";
          ctx.textAlign = "center";
          ctx.fillText("暗影魔王·巴尔撒泽", screenX + e.w/2, screenY - 18);
          ctx.textAlign = "left"; // 重置文本对齐
        } else {
          this.drawHealthBar(ctx, screenX, screenY - 8, e.w, e.hp, e.maxHp, "#ff4444", "#222222");
        }
      }

      // 魔法弹
      for(const proj of this.projectiles) {
        if(proj.dead) continue;
        const screenX = Math.floor(proj.x - camX);
        const screenY = Math.floor(proj.y - camY);
        
        const projImg = window.Assets?.getImage('projectile');
        if(projImg && projImg.complete && projImg.naturalWidth > 0) {
          ctx.drawImage(projImg, screenX, screenY, proj.w, proj.h);
        } else {
          ctx.fillStyle = "#4fc3f7";
          ctx.fillRect(screenX, screenY, proj.w, proj.h);
          // 添加一个小光环效果
          ctx.strokeStyle = "#81d4fa";
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX-1, screenY-1, proj.w+2, proj.h+2);
        }
      }

      // 敌人弹药
      for(const proj of this.enemyProjectiles) {
        if(proj.dead) continue;
        const screenX = Math.floor(proj.x - camX);
        const screenY = Math.floor(proj.y - camY);
        
        // 冰箭为蓝色尖锐形状
        ctx.fillStyle = "#64b5f6";
        ctx.fillRect(screenX, screenY, proj.w, proj.h);
        // 添加冰蓝色边框效果
        ctx.strokeStyle = "#42a5f5";
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX-1, screenY-1, proj.w+2, proj.h+2);
      }

      // 玩家
      const playerScreenX = Math.floor(p.x - camX);
      const playerScreenY = Math.floor(p.y - camY);
      
      const playerImg = window.Assets?.getImage('player');
      if(playerImg && playerImg.complete && playerImg.naturalWidth > 0) {
        ctx.drawImage(playerImg, playerScreenX, playerScreenY, p.w, p.h);
      } else {
        // 根据激活的技能组合调整颜色
        let glowColor = "#f4d35e"; // 默认颜色
        if(p.skills.dash.active && p.skills.rapidFire.active) {
          glowColor = "#ff6ec7"; // 紫红色 - 冲刺+连发
        } else if(p.skills.dash.active) {
          glowColor = "#ffeb3b"; // 黄色 - 冲刺
        } else if(p.skills.rapidFire.active) {
          glowColor = "#4fc3f7"; // 蓝色 - 连发
        }
        
        ctx.fillStyle = glowColor;
        ctx.fillRect(playerScreenX, playerScreenY, p.w, p.h);
        
        // 绘制朝向指示器
        ctx.fillStyle = "#ffa726";
        const indicatorSize = 4;
        const indicatorX = playerScreenX + p.w/2 + p.lastMoveX * 10 - indicatorSize/2;
        const indicatorY = playerScreenY + p.h/2 + p.lastMoveY * 10 - indicatorSize/2;
        ctx.fillRect(indicatorX, indicatorY, indicatorSize, indicatorSize);
        
        // 技能光环效果 - 可以叠加多个
        if(p.skills.dash.active) {
          ctx.strokeStyle = "#ffeb3b";
          ctx.lineWidth = 2;
          ctx.strokeRect(playerScreenX-3, playerScreenY-3, p.w+6, p.h+6);
        }
        if(p.skills.rapidFire.active) {
          ctx.strokeStyle = "#4fc3f7";
          ctx.lineWidth = 2;
          ctx.strokeRect(playerScreenX-5, playerScreenY-5, p.w+10, p.h+10);
        }
      }

      // 绘制玩家血条
      const playerHealthPercent = p.hp / p.maxHp;
      let playerBarColor = "#44ff44";
      
      // 玩家血条根据血量变色，并在低血量时添加警告效果
      if(playerHealthPercent <= 0.3) {
        // 低血量时闪烁红色警告
        const time = performance.now() * 0.008;
        const alpha = Math.sin(time) * 0.3 + 0.7;
        playerBarColor = `rgba(255, 68, 68, ${alpha})`;
        
        // 低血量时在玩家周围添加红色警告边框
        ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(playerScreenX - 4, playerScreenY - 4, p.w + 8, p.h + 8);
      } else if(playerHealthPercent <= 0.6) {
        playerBarColor = "#ffaa00"; // 中等血量橙色
      }
      
      this.drawHealthBar(ctx, playerScreenX, playerScreenY - 10, p.w, p.hp, p.maxHp, playerBarColor, "#444444");

      // 技能冷却UI
      const skillUIY = playerScreenY - 35;
      const skills = [
        { name: 'Q', skill: p.skills.dash, color: '#ffeb3b' },
        { name: 'E', skill: p.skills.rapidFire, color: '#f44336' },
        { name: 'Z', skill: p.skills.knockback, color: '#4caf50' },
      ];
      if(p.skills.circleBlast.level > 0) {
        skills.push({ name: 'R', skill: p.skills.circleBlast, color: '#9c27b0' });
      }
      
      skills.forEach((s, i) => {
        const skillX = playerScreenX + i * 25 - (skills.length-1) * 12.5;
        const size = 20;
        
        // 背景
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(skillX, skillUIY, size, size);
        
        // 冷却遮罩
        if(s.skill.cooldown > 0) {
          const progress = s.skill.cooldown / s.skill.maxCooldown;
          ctx.fillStyle = 'rgba(128,128,128,0.8)';
          ctx.fillRect(skillX, skillUIY, size, size * progress);
        }
        
        // 激活状态
        if(s.skill.active) {
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 2;
          ctx.strokeRect(skillX-1, skillUIY-1, size+2, size+2);
        }
        
        // 按键提示
        ctx.fillStyle = s.skill.cooldown > 0 ? '#666' : s.color;
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(s.name, skillX + size/2, skillUIY + 14);
      });
      ctx.textAlign = 'left'; // 重置对齐

      // 章节继续提示
      if(this.showChapterContinueHint) {
        ctx.fillStyle = "rgba(255,215,0,0.9)";
        ctx.fillRect(canvas.width/2 - 120, canvas.height - 80, 240, 40);
        ctx.strokeStyle = "#ffeb3b";
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width/2 - 120, canvas.height - 80, 240, 40);
        
        ctx.fillStyle = "#000000";
        ctx.font = "16px monospace";
        ctx.textAlign = "center";
        ctx.fillText("按 Z 键继续下一章", canvas.width/2, canvas.height - 55);
        ctx.textAlign = "left"; // 重置对齐
      }

      // 章节和进度信息
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(10, 10, 320, 85);
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px monospace";
      
      const chapterNames = {
        1: '迷雾森林外围',
        2: '哀嚎深渊', 
        3: '火焰山脊',
        4: '冰霜要塞',
        5: '魔王城堡'
      };
      
      ctx.fillText(`第${this.chapter}章: ${chapterNames[this.chapter]}`, 15, 30);
      ctx.font = "12px monospace";
      
      if(this.chapter === 1) {
        ctx.fillText(`腐化史莱姆: ${this.killCount.slimes}/20`, 15, 50);
        ctx.fillStyle = "#aaffaa";
        ctx.fillText(`「必须尽快穿越这片被诅咒的土地...」`, 15, 65);
        ctx.fillStyle = "#888888";
        ctx.font = "10px monospace";
        ctx.fillText(`*树叶沙沙作响，迷雾中传来诡异的嘶鸣声*`, 15, 80);
      } else if(this.chapter === 2) {
        ctx.fillText(`狂暴兽人战士: ${this.killCount.orcs}/15`, 15, 50);
        ctx.fillStyle = "#ffaaaa";
        ctx.fillText(`「艾莉娅的生命气息越来越微弱...」`, 15, 65);
        ctx.fillStyle = "#888888";
        ctx.font = "10px monospace";
        ctx.fillText(`*深渊中回荡着痛苦的哀嚎和兵器撞击声*`, 15, 80);
      } else if(this.chapter === 3) {
        ctx.fillText(`火焰蝙蝠: ${this.killCount.fire_bats}/20 | 熔岩巨人: ${this.killCount.lava_giants}/10`, 15, 50);
        ctx.fillStyle = "#ffaa55";
        ctx.fillText(`「岩浆的热浪扑面而来...」`, 15, 65);
        ctx.fillStyle = "#888888";
        ctx.font = "10px monospace";
        ctx.fillText(`*火山轰鸣声不断，空气中弥漫着硫磺味*`, 15, 80);
      } else if(this.chapter === 4) {
        ctx.fillText(`冰霜射手: ${this.killCount.ice_archers}/20 | 寒冰骑士: ${this.killCount.ice_knights}/10`, 15, 50);
        ctx.fillStyle = "#aaeeff";
        ctx.fillText(`「要塞的寒风刺骨...」`, 15, 65);
        ctx.fillStyle = "#888888";
        ctx.font = "10px monospace";
        ctx.fillText(`*暴风雪呼啸，远处传来战士的脚步声*`, 15, 80);
      } else if(this.chapter === 5) {
        ctx.fillText(`暗影魔王: ${this.killCount.demon_lord ? '已击败' : '准备战斗'}`, 15, 50);
        ctx.fillStyle = "#ff55ff";
        ctx.fillText(`「艾莉娅就在前方...」`, 15, 65);
        ctx.fillStyle = "#888888";
        ctx.font = "10px monospace";
        ctx.fillText(`*邪恶的笑声回荡在城堡中*`, 15, 80);
      }

      // 边框
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.strokeRect(0,0,canvas.width,canvas.height);
      
      // 章节完成特效
      if(this.showChapterComplete && this.chapterTransitionTime > 0) {
        const alpha = Math.sin((3.0 - this.chapterTransitionTime) * Math.PI * 2) * 0.3 + 0.7;
        
        // 根据当前章节选择背景色和文字（显示刚刚完成的章节）
        let bgColor1, bgColor2, titleText, subtitleText;
        const completedChapter = this.chapter; // 显示刚刚完成的章节
        
        switch(completedChapter) {
          case 1:
            bgColor1 = `rgba(255,215,0,${alpha * 0.3})`;
            bgColor2 = `rgba(255,165,0,${alpha * 0.1})`;
            titleText = "第一章完成！";
            subtitleText = "迷雾森林已净化";
            break;
          case 2:
            bgColor1 = `rgba(255,100,100,${alpha * 0.3})`;
            bgColor2 = `rgba(139,69,19,${alpha * 0.1})`;
            titleText = "第二章完成！";
            subtitleText = "哀嚎深渊已平息";
            break;
          case 3:
            bgColor1 = `rgba(255,140,0,${alpha * 0.3})`;
            bgColor2 = `rgba(255,69,0,${alpha * 0.1})`;
            titleText = "第三章完成！";
            subtitleText = "火焰山脊已征服";
            break;
          case 4:
            bgColor1 = `rgba(100,200,255,${alpha * 0.3})`;
            bgColor2 = `rgba(0,150,255,${alpha * 0.1})`;
            titleText = "第四章完成！";
            subtitleText = "冰霜要塞已突破";
            break;
          case 5:
            bgColor1 = `rgba(200,100,255,${alpha * 0.3})`;
            bgColor2 = `rgba(138,43,226,${alpha * 0.1})`;
            titleText = "最终章完成！";
            subtitleText = "魔王城堡已攻陷";
            break;
          default:
            bgColor1 = `rgba(255,215,0,${alpha * 0.3})`;
            bgColor2 = `rgba(255,165,0,${alpha * 0.1})`;
            titleText = "章节完成！";
            subtitleText = "继续前进";
        }
        
        // 背景光芒
        const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, 300);
        gradient.addColorStop(0, bgColor1);
        gradient.addColorStop(1, bgColor2);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 章节完成文字
        ctx.fillStyle = `rgba(255,215,0,${alpha})`;
        ctx.font = "32px monospace";
        ctx.textAlign = "center";
        ctx.fillText(titleText, canvas.width/2, canvas.height/2 - 20);
        
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.8})`;
        ctx.font = "16px monospace";
        ctx.fillText(subtitleText, canvas.width/2, canvas.height/2 + 20);
        
        ctx.textAlign = "left"; // 重置对齐方式
      }
    }

    save(){
      const p=this.player;
      const state = {
        player: {
          x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp, atk: p.atk, def: p.def, spd: p.spd,
          level: p.level, xp: p.xp, xpToNext: p.xpToNext, statPoints: p.statPoints,
          gold: p.gold, weapon: p.weapon, armor: p.armor,
          skills: JSON.parse(JSON.stringify(p.skills)) // 深拷贝技能数据
        },
        chapter: this.chapter,
        killCount: JSON.parse(JSON.stringify(this.killCount)),
        storyShown: this.storyShown
      };
      const ok = window.StorageAPI.save(state);
      if(ok) console.log("Saved.");
    }

    load(){
      const data = window.StorageAPI.load();
      if(!data || !data.player) return;
      const p=this.player, d=data.player;
      Object.assign(p, d);
      
      // 加载章节数据
      this.chapter = data.chapter || 1;
      this.killCount = data.killCount || { slimes: 0, orcs: 0 };
      this.storyShown = data.storyShown || false;
      
      // 兼容旧存档：如果没有技能数据，重新初始化
      if(!p.skills) {
        p.skills = {
          dash: { level: Math.min(p.level, 10), cooldown: 0, maxCooldown: 2.5, active: false, duration: 0 },
          rapidFire: { level: Math.min(p.level, 10), cooldown: 0, maxCooldown: 4.0, active: false, shots: 0 },
          circleBlast: { level: p.level >= 7 ? p.level - 6 : 0, cooldown: 0, maxCooldown: 6.0 }, // 更新为7级解锁
          knockback: { level: 1, cooldown: 0, maxCooldown: 1.0 }
        };
      }
      // 兼容旧存档：如果没有击退技能，添加它
      if(!p.skills.knockback) {
        p.skills.knockback = { level: 1, cooldown: 0, maxCooldown: 1.0 }; // 更新冷却时间
      }
      // 更新技能冷却时间以匹配新的增强设置
      if(p.skills.dash.maxCooldown > 2.5) p.skills.dash.maxCooldown = 2.5;
      if(p.skills.rapidFire.maxCooldown > 4.0) p.skills.rapidFire.maxCooldown = 4.0;
      if(p.skills.circleBlast.maxCooldown > 6.0) p.skills.circleBlast.maxCooldown = 6.0;
      if(p.skills.knockback.maxCooldown > 1.0) p.skills.knockback.maxCooldown = 1.0;
      // 读档后清怪，避免读档后即刻受击
      this.enemies = [];
      this.projectiles = [];
    }
  }

  window.Game = Game;
})();
