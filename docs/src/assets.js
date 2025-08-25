// 简单的资源加载器
(function(){
  const images = new Map();
  let loadedCount = 0;
  let totalCount = 0;

  function loadImage(key, src) {
    totalCount++;
    const img = new Image();
    img.onload = () => {
      loadedCount++;
      console.log(`Loaded: ${key} (${loadedCount}/${totalCount})`);
    };
    img.onerror = () => {
      loadedCount++;
      console.warn(`Failed to load: ${key}, using fallback`);
    };
    img.src = src;
    images.set(key, img);
    return img;
  }

  function getImage(key) {
    return images.get(key);
  }

  function isAllLoaded() {
    return loadedCount >= totalCount;
  }

  // 预加载资源（如果文件不存在会fallback到代码绘制）
  loadImage('player', 'assets/player.png');
  loadImage('slime', 'assets/slime.png');
  loadImage('orc', 'assets/orc.png');
  loadImage('projectile', 'assets/magic_bolt.png');
  
  // 章节背景图
  loadImage('forest_bg', 'assets/misty_forest.png');      // 迷雾森林外围
  loadImage('abyss_bg', 'assets/wailing_abyss.png');      // 哀嚎深渊
  loadImage('volcano_bg', 'assets/flame_ridge.png');      // 火焰山脊
  loadImage('fortress_bg', 'assets/frost_fortress.png');  // 冰霜要塞
  loadImage('castle_bg', 'assets/demon_castle.png');      // 魔王城内
  
  // 第3关：火焰山脊
  loadImage('fire_bat', 'assets/fire_bat.png');
  loadImage('lava_giant', 'assets/lava_giant.png');
  
  // 第4关：冰霜要塞
  loadImage('ice_archer', 'assets/ice_archer.png');
  loadImage('ice_knight', 'assets/ice_knight.png');
  
  // 第5关：魔王城堡
  loadImage('demon_lord', 'assets/demon_lord.png');
  loadImage('princess', 'assets/princess.png');
  
  // 故事对话框中的角色头像
  loadImage('kingdom_portrait', 'assets/king.png');         // 国王头像
  loadImage('princess_portrait', 'assets/princess.png');    // 公主头像
  loadImage('player_portrait', 'assets/player.png');        // 玩家头像
  loadImage('demon_lord_portrait', 'assets/demon_lord.png'); // 魔王头像

  window.Assets = { loadImage, getImage, isAllLoaded };
})();
