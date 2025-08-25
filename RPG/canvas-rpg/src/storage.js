(function(){
  const VERSION = 1;
  const KEY = `canvas_rpg_v${VERSION}`;
  function save(state){
    try {
      const payload = { version: VERSION, state };
      localStorage.setItem(KEY, JSON.stringify(payload));
      return true;
    } catch(e){ console.error("Save failed", e); return false; }
  }
  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return null;
      const data = JSON.parse(raw);
      if(!data || data.version !== VERSION) return null;
      return data.state || null;
    }catch(e){ console.error("Load failed", e); return null; }
  }
  function reset(){ try{ localStorage.removeItem(KEY); }catch{} }
  window.StorageAPI = { save, load, reset };
})();
