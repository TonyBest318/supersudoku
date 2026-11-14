import { useEffect, useState } from 'react';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPanel() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const display = window.matchMedia('(display-mode: standalone)');
    const checkInstalled = () => setInstalled(display.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone);
    checkInstalled();
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    display.addEventListener('change', checkInstalled);
    let active = true;
    if (import.meta.env.PROD && 'serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then(() => navigator.serviceWorker.ready)
        .then(() => { if (active) setOfflineReady(true); })
        .catch(() => { if (active) setError('离线资源准备失败，联网后刷新重试。'); });
    }
    return () => {
      active = false;
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      display.removeEventListener('change', checkInstalled);
    };
  }, []);
  async function install() {
    if (!prompt) return;
    try { await prompt.prompt(); await prompt.userChoice; }
    catch { setError('请使用浏览器菜单中的安装或添加到主屏幕。'); }
    finally { setPrompt(null); }
  }
  return <section className="install-panel" aria-label="安装应用" onKeyDown={event => event.stopPropagation()}>
    <div><strong>{installed ? '已在独立窗口运行' : '把数独装进主屏幕'}</strong>
      <p aria-live="polite">{error || (offlineReady ? '离线资源已就绪，断网也能继续或新开一局。' : '首次联网加载后，可离线解题。')}</p>
    </div>
    {prompt && !installed && <button className="install-button" onClick={install}>安装应用</button>}
    {!installed && <details><summary>手机 / 平板安装方法</summary>
      <p>iPhone / iPad：用 Safari 打开，点分享 → 添加到主屏幕。Android：用 Chrome 打开，在菜单中选择安装应用或添加到主屏幕。</p>
      <p>需要通过 HTTPS 地址访问。局域网 HTTP 地址仅供试玩，不能启用完整离线安装。</p>
    </details>}
  </section>;
}
