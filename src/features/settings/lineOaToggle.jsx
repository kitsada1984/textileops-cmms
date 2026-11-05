import { CheckCircle } from 'lucide-react'

export function LineOaToggle({ line, setLine }) {
  return (
    <>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span>เปิดใช้งานแจ้งเตือนผ่าน LINE</span>
                <span className={`w-2 h-2 rounded-full ${line.is_enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ส่งข้อความ Flex Card พร้อมปุ่มเปิดรับงาน PWA เข้ากลุ่ม LINE ของช่างอัตโนมัติ
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(line.is_enabled)}
                onChange={(e) => setLine((p) => ({ ...p, is_enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="label">ประเภทผู้ให้บริการ LINE</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLine((p) => ({ ...p, provider: 'line_oa' }))}
                className={`p-3 rounded-xl border text-left transition-all ${
                  line.provider === 'line_oa'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs">🟢 LINE Official Account / Bot</span>
                  {line.provider === 'line_oa' && <CheckCircle size={14} className="text-emerald-500" />}
                </div>
                <div className="text-[10.5px] mt-1 font-normal opacity-80">
                  ส่ง Flex Card สวยงาม มีปุ่มกดเปิด PWA Standalone (แนะนำสูงสุด)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLine((p) => ({ ...p, provider: 'line_notify' }))}
                className={`p-3 rounded-xl border text-left transition-all ${
                  line.provider === 'line_notify'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs">🟩 LINE Notify Token</span>
                  {line.provider === 'line_notify' && <CheckCircle size={14} className="text-emerald-500" />}
                </div>
                <div className="text-[10.5px] mt-1 font-normal opacity-80">
                  ส่งข้อความแบบ Text แจ้งเตือนเข้ากลุ่มทั่วไป
                </div>
              </button>
            </div>
          </div>

    </>
  )
}
