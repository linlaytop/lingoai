import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ===== 版本管理：自动清理旧版本残留数据 =====
const APP_VERSION = '2026.07.30.v2';
const VERSION_KEY = 'lingoai_app_version';

try {
  const savedVersion = localStorage.getItem(VERSION_KEY);
  if (savedVersion !== APP_VERSION) {
    // 版本不匹配，清理所有旧版 lingoai/lingua_ 开头的 localStorage 数据
    const keysToClean: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('lingua_') || key.startsWith('lingoai_'))) {
        keysToClean.push(key);
      }
    }
    keysToClean.forEach(k => localStorage.removeItem(k));
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    console.log(`[LingoAI] 版本更新 ${savedVersion || '旧版'} → ${APP_VERSION}，已清理 ${keysToClean.length} 条旧数据`);
  }
} catch (e) {
  console.warn('[LingoAI] 版本检查失败:', e);
}

// ===== 全局错误捕获 =====
window.addEventListener('error', (e) => {
  console.error('[LingoAI] 运行时错误:', e.message, e.filename, e.lineno);
});

// 移除加载界面
function removeLoading() {
  const loading = document.getElementById('app-loading');
  if (loading) {
    loading.remove();
  }
}

const rootEl = document.getElementById('root')!;

// 如果 root 里只有 loading 占位符，说明 React 还没渲染
// 给 React 3 秒时间，超时则尝试移除 loading 让 React 直接渲染
setTimeout(removeLoading, 3000);

try {
  const root = createRoot(rootEl);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  // React 渲染成功后移除 loading
  setTimeout(removeLoading, 100);
} catch (err) {
  console.error('[LingoAI] React 渲染失败:', err);
  removeLoading();
  rootEl.innerHTML = `
    <div style="padding:40px;text-align:center;font-family:sans-serif;">
      <h2 style="color:#dc2626;">页面加载失败</h2>
      <p style="color:#666;">错误信息: ${String(err).slice(0, 200)}</p>
      <button onclick="location.reload()" style="margin-top:20px;padding:10px 30px;background:#6366f1;color:white;border:none;border-radius:8px;font-size:15px;cursor:pointer;">重新加载</button>
      <p style="color:#999;margin-top:16px;font-size:13px;">如果反复出现，请按 Ctrl+Shift+Delete 清除浏览器缓存后重试</p>
    </div>
  `;
}
