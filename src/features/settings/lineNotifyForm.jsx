export function LineNotifyForm({ line, setLine }) {
  return (
    <>
          {line.provider === 'line_notify' && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="label">LINE Notify Token หลัก (ช่างและหัวหน้า)</label>
                <input
                  className="input font-mono text-xs"
                  type="password"
                  value={line.notify_token || ''}
                  onChange={(e) => setLine((p) => ({ ...p, notify_token: e.target.value }))}
                  placeholder="กรอก Access Token จาก notify-bot.line.me"
                />
              </div>
              <div>
                <label className="label">LINE Notify Token กลุ่มสโตร์เข็ม (ทางเลือก)</label>
                <input
                  className="input font-mono text-xs"
                  type="password"
                  value={line.needle_keeper_notify_token || ''}
                  onChange={(e) => setLine((p) => ({ ...p, needle_keeper_notify_token: e.target.value }))}
                  placeholder="กรอก Access Token กลุ่มสโตร์เข็ม"
                />
              </div>
            </div>
          )}

    </>
  )
}
