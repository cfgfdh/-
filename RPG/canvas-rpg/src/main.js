(function(){
  // 确保 DOM 完全加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const canvas = document.getElementById("game");
    const game = new window.Game(canvas);
    window.game = game; // 方便调试
    window.UI.bind(game);

    // 确保HUD在游戏开始时立即更新一次
    setTimeout(() => {
      if(window.UI && window.UI.updateHUD && game.player) {
        window.UI.updateHUD(game.player, game);
      }
    }, 100);

    let last = performance.now();
    function loop(t){
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      
      // 总是更新游戏状态（即使暂停也要更新HUD）
      game.update(dt);
      game.draw();
      
      // 确保HUD始终更新，无论游戏是否暂停
      if(window.UI && window.UI.updateHUD) {
        window.UI.updateHUD(game.player, game);
      }
      
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // ESC键快捷开关商店
    window.addEventListener("keydown", (e)=>{
      if(e.code === "Escape"){
        const modal = document.getElementById("modal");
        const nowOpen = modal.classList.contains("hidden");
        if(nowOpen){ window.UI.showModal(); game.togglePause(true); }
        else { window.UI.hideModal(); game.togglePause(false); }
        e.preventDefault();
      }
    });
  }
})();
