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

    let last = performance.now();
    function loop(t){
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      game.update(dt);
      game.draw();
      window.UI.updateHUD(game.player);
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
