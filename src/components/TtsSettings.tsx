import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, Check, Loader2, Sparkles, ExternalLink } from 'lucide-react';
import { getTtsConfig, setTtsConfig, speakNative } from '../lib/audio';
import { cn } from '../lib/utils';

interface TtsSettingsProps {
  open: boolean;
  onClose: () => void;
}

export function TtsSettings({ open, onClose }: TtsSettingsProps) {
  const config = getTtsConfig();
  const [enabled, setEnabled] = useState(config.enabled);
  const [workerUrl, setWorkerUrl] = useState(config.workerUrl);
  const [speaker, setSpeaker] = useState(config.speaker);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'fail'>('idle');
  const [testError, setTestError] = useState<string>('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setTtsConfig({ enabled, workerUrl: workerUrl.trim(), speaker: speaker.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    if (!workerUrl.trim()) return;
    setTesting(true);
    setTestResult('idle');
    setTestError('');
    try {
      // 先保存配置再测试
      setTtsConfig({ enabled: true, workerUrl: workerUrl.trim(), speaker: speaker.trim() });
      // 延迟一点让配置生效
      await new Promise(r => setTimeout(r, 100));
      const ok = await speakNative('Hello, this is a test.');
      if (ok) {
        setTestResult('success');
      } else {
        setTestResult('fail');
        setTestError(window.__lastTtsError ? `${window.__lastTtsError.message}` : '未知错误，请检查控制台');
      }
    } catch (err) {
      setTestResult('fail');
      setTestError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Volume2 className="text-indigo-600" size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900">发音设置</h2>
                  <p className="text-xs text-gray-400">配置豆包 AI 语音合成</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 功能说明 */}
              <div className="bg-indigo-50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                  <Sparkles size={16} />
                  豆包 AI 发音
                </div>
                <p className="text-xs text-indigo-600 leading-relaxed">
                  接入字节跳动豆包大模型 TTS，获得比浏览器自带更自然、更有感情的英语发音。
                  需要部署 Cloudflare Worker 代理（免费）。
                </p>
                <a
                  href="https://www.volcengine.com/docs/6561/1257544"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-bold"
                >
                  查看音色列表 <ExternalLink size={12} />
                </a>
              </div>

              {/* 开关 */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800 text-sm">启用豆包发音</p>
                  <p className="text-xs text-gray-400">关闭后使用浏览器自带发音</p>
                </div>
                <button
                  onClick={() => setEnabled(!enabled)}
                  className={cn(
                    "relative w-12 h-7 rounded-full transition-all",
                    enabled ? "bg-indigo-600" : "bg-gray-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all",
                    enabled ? "left-6" : "left-1"
                  )} />
                </button>
              </div>

              {/* Worker URL */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Cloudflare Worker URL
                </label>
                <input
                  type="url"
                  value={workerUrl}
                  onChange={(e) => setWorkerUrl(e.target.value)}
                  placeholder="https://your-worker.your-subdomain.workers.dev"
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-indigo-400 transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">
                  部署 <code className="text-indigo-500">worker/doubao-tts.js</code> 后获取的地址
                </p>
              </div>

              {/* 音色选择 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  音色 ID
                </label>
                <select
                  value={speaker}
                  onChange={(e) => setSpeaker(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors"
                >
                  <optgroup label="推荐英文音色">
                    <option value="zh_female_shaoergushi_mars_bigtts">少儿故事女声（中英通用）</option>
                    <option value="BV001_streaming">通用女声</option>
                    <option value="BV002_streaming">通用男声</option>
                  </optgroup>
                  <optgroup label="自定义音色">
                    {speaker && !['zh_female_shaoergushi_mars_bigtts', 'BV001_streaming', 'BV002_streaming'].includes(speaker) && (
                      <option value={speaker}>{speaker}</option>
                    )}
                    <option value="custom">输入自定义音色 ID...</option>
                  </optgroup>
                </select>
                {speaker === 'custom' && (
                  <input
                    type="text"
                    autoFocus
                    placeholder="输入音色 ID，如 en_female_neutral"
                    className="w-full mt-2 bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-indigo-400 transition-colors"
                    onChange={(e) => setSpeaker(e.target.value)}
                  />
                )}
                <p className="text-xs text-gray-400 mt-1">
                  在火山引擎控制台试听后选择喜欢的音色
                </p>
              </div>

              {/* 测试按钮 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTest}
                  disabled={!workerUrl.trim() || testing}
                  className="flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                  {testing ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                  测试发音
                </button>
                {testResult === 'success' && (
                  <span className="text-sm text-green-600 font-bold flex items-center gap-1">
                    <Check size={16} /> 发音正常
                  </span>
                )}
                {testResult === 'fail' && (
                  <div className="w-full">
                    <span className="text-sm text-red-500 font-bold">
                      测试失败，请检查配置
                    </span>
                    {testError && (
                      <p className="mt-1 text-xs text-red-400 break-all leading-relaxed bg-red-50 rounded-lg p-2">
                        {testError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 保存按钮 */}
              <button
                onClick={handleSave}
                className={cn(
                  "w-full py-3.5 rounded-xl font-black text-white transition-all flex items-center justify-center gap-2",
                  saved ? "bg-green-500" : "bg-indigo-600 hover:bg-indigo-700"
                )}
              >
                {saved ? (
                  <><Check size={20} /> 已保存</>
                ) : (
                  '保存设置'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
