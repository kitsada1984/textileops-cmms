export function LineAppUrl({ line, setLine }) {
  return (
    <>
          <div>
            <label className="label">URL หลักของแอปสำหรับปุ่มกดรับงาน</label>
            <input
              className="input font-mono text-xs"
              value={line.app_base_url || ''}
              onChange={(e) => setLine((p) => ({ ...p, app_base_url: e.target.value }))}
              placeholder={window.location.origin}
            />
            <p className="text-[10.5px] text-slate-400 mt-1">
              ระบบจะต่อท้ายด้วย <code>?openExternalBrowser=1</code> อัตโนมัติเพื่อให้เด้งเปิดแอป PWA บนมือถือ
            </p>
          </div>
    </>
  )
}
