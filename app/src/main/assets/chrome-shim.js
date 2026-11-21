/* Replaces the browser-extension API (chrome.storage) with localStorage in the Android WebView. */
window.chrome = {
  storage: {
    local: {
      get: k => Promise.resolve({ [k]: JSON.parse(localStorage.getItem('ls:' + k) || 'null') }),
      set: (k, v) => { localStorage.setItem('ls:' + k, JSON.stringify(v)); return Promise.resolve() }
    }
  }
};
