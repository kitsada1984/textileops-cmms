import { AlertCircle, CheckCircle, ExternalLink, Eye, EyeOff, Save, Sparkles } from 'lucide-react'
import { SectionCard } from './settingsComponents.jsx'

export function AiVisionSettings({ geminiKey, setGeminiKey, geminiModel, setGeminiModel, showGeminiKey, setShowGeminiKey, geminiTesting, geminiStatus, setGeminiStatus, geminiSaving, handleSaveGemini, handleTestGemini }) {
  return (
      <SectionCard icon={Sparkles} title="ระบบ AI ค้นหาอะไหล่ด้วยภาพ (Google Gemini Vision AI)">
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-sm text-purple-700 dark:text-purple-300">
              <Sparkles size={16} className="text-amber-500" />
              <span>Google Gemini Flash Vision (Free Tier)</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              ยกระดับความแม่นยำในการค้นหาอะไหล่จากรูปถ่ายเป็น <b>98%+</b> โดย AI จะวิเคราะห์แยกประเภทและจับคู่กับรายการอะไหล่ในคลังอย่างแม่นยำ ไม่สับสนกับพื้นหลังสีขาว
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700">
                ✓ ฟรี 1,500 ครั้ง/วัน
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800 text-[11px] font-bold text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700">
                ✓ ไม่ต้องผูกบัตรเครดิต
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline ml-auto"
              >
                <span>ขอรับ API Key ฟรีที่ Google AI Studio</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="label text-xs font-bold text-slate-700 dark:text-slate-200">
                Google Gemini API Key
              </label>
              <div className="relative flex items-center">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  className="input font-mono text-xs w-full pr-20"
                  value={geminiKey}
                  onChange={(e) => {
                    setGeminiKey(e.target.value)
                    setGeminiStatus(null)
                  }}
                  placeholder="AIzaSy..."
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey((prev) => !prev)}
                  className="absolute right-2 px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showGeminiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label text-xs font-bold text-slate-700 dark:text-slate-200">
                โมเดล AI (Vision Model)
              </label>
              <select
                className="input text-xs w-full font-mono"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
              >
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (แนะนำ - ฟรี 1,500 ครั้ง/วัน ความเร็วสูงสุด ประหยัดโควต้า)</option>
                <option value="gemini-3.8-flash">gemini-3.8-flash (โมเดลอัจฉริยะสูงสุด)</option>
                <option value="gemini-flash-latest">gemini-flash-latest (เลือกโมเดล Flash ล่าสุดอัตโนมัติ)</option>
                <option value="gemini-3.5-flash">gemini-3.5-flash (เสถียรและประมวลผลภาพไว)</option>
              </select>
            </div>

            {geminiStatus && (
              <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                geminiStatus.ok
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                {geminiStatus.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                <span>{geminiStatus.text}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveGemini}
                disabled={geminiSaving}
                className="btn-primary flex items-center gap-1.5 text-xs font-bold"
              >
                <Save size={14} />
                <span>{geminiSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า Gemini'}</span>
              </button>
              <button
                type="button"
                onClick={handleTestGemini}
                disabled={geminiTesting || !geminiKey.trim()}
                className="btn-outline flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
              >
                <Sparkles size={14} className={geminiTesting ? 'animate-spin' : ''} />
                <span>{geminiTesting ? 'กำลังทดสอบ...' : '⚡ ทดสอบการเชื่อมต่อ'}</span>
              </button>
            </div>
          </div>
        </div>
      </SectionCard>
  )
}
