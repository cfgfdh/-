(function(){
  const el = {
    hp: document.getElementById("hp"),
    atk: document.getElementById("atk"),
    def: document.getElementById("def"),
    spd: document.getElementById("spd"),
    level: document.getElementById("level"),
    xp: document.getElementById("xp"),
    gold: document.getElementById("gold"),
    btnSave: document.getElementById("btnSave"),
    btnLoad: document.getElementById("btnLoad"),
    btnShop: document.getElementById("btnShop"),
    modal: document.getElementById("modal"),
    btnCloseModal: document.getElementById("btnCloseModal"),
    statPoints: document.getElementById("statPoints"),
    shop: document.getElementById("shop"),
    levelup: document.getElementById("levelup"),
    storyModal: document.getElementById("storyModal"),
    storyTitle: document.getElementById("storyTitle"),
    storyText: document.getElementById("storyText"),
    btnContinue: document.getElementById("btnContinue"),
    kingdomPortrait: document.getElementById("kingdomPortrait"),
    princessPortrait: document.getElementById("princessPortrait"),
    playerPortrait: document.getElementById("playerPortrait"),
    demonLordPortrait: document.getElementById("demonLordPortrait"),
  };

  function updateHUD(p){
    el.hp.textContent = `${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}`;
    el.atk.textContent = p.atk;
    el.def.textContent = p.def;
    el.spd.textContent = Math.round(p.spd);
    el.level.textContent = p.level;
    el.xp.textContent = `${p.xp}/${p.xpToNext}`;
    el.gold.textContent = p.gold;
    el.statPoints.textContent = p.statPoints;
  }

  function showModal(){ 
    el.modal.classList.remove("hidden"); 
  }
  function hideModal(){ 
    el.modal.classList.add("hidden"); 
  }
  
  function showStoryDialog(title, text, callback, isFirstChapter = false, customButtonText = null, portraits = {}) {
    el.storyTitle.textContent = title;
    el.storyText.textContent = text;
    
    // 显示/隐藏角色头像
    const portraitElements = [
      { element: el.kingdomPortrait, key: 'kingdom', asset: 'kingdom_portrait' },
      { element: el.princessPortrait, key: 'princess', asset: 'princess_portrait' },
      { element: el.playerPortrait, key: 'player', asset: 'player_portrait' },
      { element: el.demonLordPortrait, key: 'demonLord', asset: 'demon_lord_portrait' }
    ];
    
    portraitElements.forEach(({ element, key, asset }) => {
      if (portraits[key]) {
        // 尝试加载对应的头像图片
        const portraitImg = window.Assets?.getImage(asset);
        if (portraitImg && portraitImg.complete && portraitImg.naturalWidth > 0) {
          element.src = portraitImg.src;
          element.classList.remove("hidden");
        } else {
          // 如果图片还没加载完成，先隐藏，等图片加载完再显示
          element.classList.add("hidden");
          if (portraitImg) {
            portraitImg.onload = () => {
              if (portraitImg.complete && portraitImg.naturalWidth > 0) {
                element.src = portraitImg.src;
                element.classList.remove("hidden");
              }
            };
            portraitImg.onerror = () => {
              console.warn(`Failed to load portrait: ${asset}`);
              element.classList.add("hidden");
            };
          }
        }
      } else {
        element.classList.add("hidden");
      }
    });
    
    el.storyModal.classList.remove("hidden");
    
    // 根据参数设置按钮文字
    if(customButtonText) {
      el.btnContinue.textContent = customButtonText;
    } else {
      el.btnContinue.textContent = isFirstChapter ? "开始冒险" : "继续冒险";
    }
    
    // 绑定继续按钮
    const continueHandler = () => {
      el.storyModal.classList.add("hidden");
      el.btnContinue.removeEventListener("click", continueHandler);
      if(callback) callback();
    };
    el.btnContinue.addEventListener("click", continueHandler);
  }

  window.UI = {
    bind(game){
      el.btnSave?.addEventListener("click", () => { game.save(); });
      el.btnLoad?.addEventListener("click", () => { game.load(); });
      el.btnShop?.addEventListener("click", () => { if(game.togglePause(true)) showModal(); });
      
      // 关闭按钮
      el.btnCloseModal?.addEventListener("click", () => { 
        hideModal(); 
        game.togglePause(false); 
      });

      // 点击遮罩关闭（点击空白区域）
      el.modal?.addEventListener("click", (e)=>{
        if(e.target === el.modal){ 
          hideModal(); 
          game.togglePause(false); 
        }
      });

      // Shop & Level buttons via事件委托
  el.shop?.addEventListener("click", (e)=>{
        const a = e.target?.getAttribute("data-action");
        if(!a) return;
        if(a === "buy-sword") game.buy("sword");
        if(a === "buy-armor") game.buy("armor");
        if(a === "heal") game.buy("heal");
      });
  el.levelup?.addEventListener("click", (e)=>{
        const a = e.target?.getAttribute("data-action");
        if(!a) return;
        if(a === "add-hp") game.addPoint("hp");
        if(a === "add-atk") game.addPoint("atk");
        if(a === "add-def") game.addPoint("def");
        if(a === "add-spd") game.addPoint("spd");
      });
    },
    updateHUD, showModal, hideModal, showStoryDialog,
  };
})();
