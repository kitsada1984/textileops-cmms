import { AlertCircle, CheckCircle, Copy, Save, Send } from 'lucide-react'

export function LineOauthActions({ line, setLine, lineTesting, lineIsOk, lineMsg, saveLine, handleTestLine, toast }) {
  return (
    <>
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#06C755]" />
                  ระบบเข้าสู่ระบบด้วย LINE (LINE Login & สแกน QR Code)
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  เชื่อมต่อ LINE Login v2.1 เพื่อให้พนักงานสแกน QR Code หรือคลิกปุ่มเข้าสู่ระบบได้ทันที
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={line.login_enabled ?? true}
                  onChange={(e) => setLine((p) => ({ ...p, login_enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#06C755]"></div>
              </label>
            </div>

            {/* Callback URL Box */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs space-y-2">
              <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                <span>📌 Callback URL (นำไปใส่ใน LINE Developers Console):</span>
                <button
                  type="button"
                  onClick={() => {
                    const cbUrl = `${window.location.origin}/api/auth/line/callback`
                    navigator.clipboard.writeText(cbUrl)
                    toast.success('คัดลอก Callback URL แล้ว!')
                  }}
                  className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Copy size={12} /> คัดลอก URL
                </button>
              </div>
              <div className="font-mono bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-emerald-500/20 text-slate-700 dark:text-slate-300 select-all overflow-x-auto text-[11px]">
                {typeof window !== 'undefined' ? `${window.location.origin}/api/auth/line/callback` : '/api/auth/line/callback'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                วิธีตั้งค่า: เข้าไปที่ <b>LINE Developers Console</b> &gt; เลือก Channel ของคุณ (Channel Type: LINE Login) &gt; ไปที่แท็บ <b>LINE Login</b> &gt; นำ URL ข้างต้นไปใส่ในช่อง <b>Callback URL</b>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">LINE Login Channel ID</label>
                <input
                  className="input font-mono text-xs"
                  value={line.login_channel_id || ''}
                  onChange={(e) => setLine((p) => ({ ...p, login_channel_id: e.target.value }))}
                  placeholder="เช่น 2001234567"
                />
              </div>

              <div>
                <label className="label">LINE Login Channel Secret</label>
                <input
                  className="input font-mono text-xs"
                  type="password"
                  value={line.login_channel_secret || ''}
                  onChange={(e) => setLine((p) => ({ ...p, login_channel_secret: e.target.value }))}
                  placeholder="••••••••••••••••••••••••••••••••"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">สิทธิ์เริ่มต้นเมื่อเข้าสู่ระบบครั้งแรก (Default Role)</label>
                <select
                  className="select text-xs"
                  value={line.login_default_role || 'viewer'}
                  onChange={(e) => setLine((p) => ({ ...p, login_default_role: e.target.value }))}
                >
                  <option value="viewer">Viewer (ดูได้เท่านั้น — ไม่สามารถเพิ่ม ลบ หรือแก้ไขได้)</option>
                  <option value="user">User (สิทธิ์ดูแดชบอร์ด/เครื่องจักร/งานซ่อม)</option>
                  <option value="technician">Technician (ช่างซ่อมบำรุง)</option>
                  <option value="supervisor">Supervisor (หัวหน้างาน)</option>
                </select>
                <p className="text-[10.5px] text-slate-400 mt-1">
                  เมื่อผู้ใช้เข้าสู่ระบบด้วย LINE ครั้งแรก ระบบจะสร้างบัญชีด้วยบทบาทนี้ โดย Admin สามารถเข้าไปปรับเพิ่ม/ลดสิทธิ์ในเมนูผู้ใช้งานได้ตลอดเวลา
                </p>
              </div>

              <div>
                <label className="label">Custom Callback URL (เว้นว่างเพื่อใช้ตามโดเมนอัตโนมัติ)</label>
                <input
                  className="input font-mono text-xs"
                  value={line.login_callback_url || ''}
                  onChange={(e) => setLine((p) => ({ ...p, login_callback_url: e.target.value }))}
                  placeholder={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/line/callback`}
                />
              </div>
            </div>
          </div>

          {/* Status Alert Banner */}
          {lineMsg && (
            <div
              className={`text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 ${
                lineIsOk
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
              }`}
            >
              {lineIsOk ? <CheckCircle size={14} className="flex-shrink-0" /> : <AlertCircle size={14} className="flex-shrink-0" />}
              <span>{lineMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button className="btn-primary" onClick={saveLine}>
              <Save size={14} /> <span>บันทึกการตั้งค่า LINE</span>
            </button>
            <button
              onClick={handleTestLine}
              disabled={lineTesting}
              className="btn-outline flex items-center gap-1.5 text-xs font-bold"
            >
              <Send size={13} />
              <span>{lineTesting ? 'กำลังส่งข้อความทดสอบ...' : '🔔 ทดสอบส่งข้อความเข้า LINE'}</span>
            </button>
          </div>

    </>
  )
}
