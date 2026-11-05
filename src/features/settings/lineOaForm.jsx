import { CheckCircle, Copy, Eye, EyeOff, RefreshCw, UserPlus } from 'lucide-react'

export function LineOaForm({ line, setLine, lineContacts, lineContactLoading, webhookCopied, setWebhookCopied, showLineToken, setShowLineToken, loadLineContactsList, addLineContact }) {
  return (
    <>
          {line.provider === 'line_oa' && (
            <div className="space-y-5 pt-1">
              
              {/* Webhook URL Helper Box */}
              <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="font-bold text-blue-800 dark:text-blue-200 flex items-center gap-1.5">
                    <span>📡 LINE Webhook URL (สำหรับรับ ID ช่างและหัวหน้าอัตโนมัติ)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${(line.app_base_url || window.location.origin).replace(/\/$/, '')}/api/line-webhook`
                      navigator.clipboard.writeText(url)
                      setWebhookCopied(true)
                      setTimeout(() => setWebhookCopied(false), 2500)
                    }}
                    className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1 text-[11px] transition-all"
                  >
                    {webhookCopied ? <CheckCircle size={12} /> : <Copy size={12} />}
                    <span>{webhookCopied ? 'คัดลอกแล้ว!' : 'คัดลอก URL'}</span>
                  </button>
                </div>
                <div className="font-mono bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-blue-200/80 dark:border-blue-900 text-blue-900 dark:text-blue-300 select-all overflow-x-auto text-[11px]">
                  {`${(line.app_base_url || window.location.origin).replace(/\/$/, '')}/api/line-webhook`}
                </div>
                <p className="text-[10.5px] text-blue-700/80 dark:text-blue-400 mt-1.5 leading-normal">
                  📌 <b>วิธีใช้งาน:</b> นำ URL นี้ไปวางใน <b>LINE Developers Console</b> &gt; แท็บ <b>Messaging API</b> &gt; <b>Webhook URL</b> แล้วกดเปิด <b>Use webhook</b> จากนั้นเมื่อช่างหรือหัวหน้าทักบอท ระบบจะเก็บ ID ให้ทันทีครับ
                </p>
              </div>

              {/* Channel Access Token */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">LINE Channel Access Token (Long-Lived) *</label>
                  <button
                    type="button"
                    onClick={() => setShowLineToken((s) => !s)}
                    className="text-[11px] text-blue-500 hover:underline flex items-center gap-1"
                  >
                    {showLineToken ? <EyeOff size={12} /> : <Eye size={12} />}
                    <span>{showLineToken ? 'ซ่อน' : 'แสดง'}</span>
                  </button>
                </div>
                <input
                  className="input font-mono text-xs"
                  type={showLineToken ? 'text' : 'password'}
                  value={line.channel_access_token || ''}
                  onChange={(e) => setLine((p) => ({ ...p, channel_access_token: e.target.value }))}
                  placeholder="คัดลอกจาก LINE Developers Console > Messaging API"
                />
                <p className="text-[10.5px] text-slate-400 mt-1">
                  ออก Token จากแท็บ Messaging API ใน <a href="https://developers.line.biz/" target="_blank" rel="noreferrer" className="text-blue-500 underline">LINE Developers Console</a>
                </p>
              </div>

              {/* Auto Contacts Fetcher from LINE Webhook */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      รายชื่อที่ทัก LINE บอทเข้ามา (ดึงอัตโนมัติ)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ให้ช่างหรือหัวหน้าเปิดแชตแล้วพิมพ์ทักบอท จากนั้นกดดึงรายชื่อเพื่อกดเพิ่มได้ทันที
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={loadLineContactsList}
                    disabled={lineContactLoading}
                    className="btn-outline px-3 py-1 text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} className={lineContactLoading ? 'animate-spin' : ''} />
                    <span>{lineContactLoading ? 'กำลังดึง...' : 'ดึงรายชื่อจาก LINE'}</span>
                  </button>
                </div>

                {lineContacts.length > 0 && (
                  <div className="space-y-2 mt-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    {lineContacts.map((c, i) => (
                      <div
                        key={i}
                        className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {c.picture_url ? (
                            <img src={c.picture_url} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-[10px] flex-shrink-0">
                              {c.name?.[0] || 'L'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{c.name}</div>
                            <div className="font-mono text-[10px] text-slate-400 truncate">{c.user_id}</div>
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => addLineContact('supervisor', c)}
                            className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-300 text-[11px] font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1"
                          >
                            <UserPlus size={11} /> + หัวหน้า
                          </button>
                          <button
                            type="button"
                            onClick={() => addLineContact('needle_keeper', c)}
                            className="px-2.5 py-1 rounded bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-600 dark:text-sky-300 text-[11px] font-bold border border-sky-200 dark:border-sky-800 flex items-center gap-1"
                          >
                            <UserPlus size={11} /> + ผู้ดูแลเข็ม
                          </button>
                          <button
                            type="button"
                            onClick={() => addLineContact('technician', c)}
                            className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"
                          >
                            <UserPlus size={11} /> + ช่าง
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Supervisors List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      รายชื่อหัวหน้างาน / ผู้รับแจ้งซ่อม (Supervisors)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      จะได้รับแจ้งเตือนเมื่อมีคนแจ้งซ่อมใหม่ และเมื่อช่างปิดงานซ่อม
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLine((p) => ({ ...p, supervisors: [...(p.supervisors || []), { name: '', user_id: '' }] }))}
                    className="text-xs text-blue-500 hover:underline font-bold flex items-center gap-1"
                  >
                    <UserPlus size={12} /> <span>+ เพิ่มหัวหน้า</span>
                  </button>
                </div>

                {(!line.supervisors || line.supervisors.length === 0) && (
                  <div className="text-xs text-slate-400 py-1.5">ยังไม่มีรายชื่อหัวหน้า — กด + เพิ่ม</div>
                )}

                <div className="space-y-2">
                  {(line.supervisors || []).map((s, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        className="input text-xs"
                        value={s.name || ''}
                        onChange={(e) =>
                          setLine((p) => {
                            const a = [...(p.supervisors || [])]
                            a[i] = { ...a[i], name: e.target.value }
                            return { ...p, supervisors: a }
                          })
                        }
                        placeholder="ชื่อหัวหน้า"
                        style={{ flex: '0 0 130px' }}
                      />
                      <input
                        className="input font-mono text-xs"
                        value={s.user_id || ''}
                        onChange={(e) =>
                          setLine((p) => {
                            const a = [...(p.supervisors || [])]
                            a[i] = { ...a[i], user_id: e.target.value }
                            return { ...p, supervisors: a }
                          })
                        }
                        placeholder="User ID เช่น U66f2b... หรือ Group ID C..."
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setLine((p) => ({
                            ...p,
                            supervisors: (p.supervisors || []).filter((_, j) => j !== i),
                          }))
                        }
                        className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 hover:text-red-500 flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Needle Keepers List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-sky-800 dark:text-sky-300">
                      🎯 คนคัดเข็ม / ผู้ดูแลสต็อกเข็ม (LINE USER ID ล็อคคนคัดเข็ม)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      เมื่อช่างสแกนขอเบิกเข็ม Spare ข้อความแจ้งเตือนจะเด้งไปที่ LINE USER ID ของคนคัดเข็มทันที
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLine((p) => ({ ...p, needle_keepers: [...(p.needle_keepers || []), { name: '', user_id: '' }] }))}
                    className="text-xs text-sky-600 hover:underline font-bold flex items-center gap-1"
                  >
                    <UserPlus size={12} /> <span>+ เพิ่ม / ล็อคคนคัดเข็ม</span>
                  </button>
                </div>

                {(!line.needle_keepers || line.needle_keepers.length === 0) && (
                  <div className="text-xs text-slate-400 py-1.5">ยังไม่ได้ล็อค LINE USER ID คนคัดเข็ม — ระบบจะส่งหาหัวหน้างานเป็นค่าเริ่มต้น</div>
                )}

                <div className="space-y-2">
                  {(line.needle_keepers || []).map((k, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        className="input text-xs"
                        value={k.name || ''}
                        onChange={(e) =>
                          setLine((p) => {
                            const a = [...(p.needle_keepers || [])]
                            a[i] = { ...a[i], name: e.target.value }
                            return { ...p, needle_keepers: a }
                          })
                        }
                        placeholder="ชื่อผู้ดูแลเข็ม"
                        style={{ flex: '0 0 130px' }}
                      />
                      <input
                        className="input font-mono text-xs"
                        value={k.user_id || ''}
                        onChange={(e) =>
                          setLine((p) => {
                            const a = [...(p.needle_keepers || [])]
                            a[i] = { ...a[i], user_id: e.target.value }
                            return { ...p, needle_keepers: a }
                          })
                        }
                        placeholder="User ID เช่น U66f... หรือ Group ID C..."
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setLine((p) => ({
                            ...p,
                            needle_keepers: (p.needle_keepers || []).filter((_, j) => j !== i),
                          }))
                        }
                        className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 hover:text-red-500 flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technicians List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      รายชื่อช่างเทคนิค (Technicians)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      เมื่อหัวหน้ากดมอบหมายช่างคนไหน ระบบจะยิงใบสั่งงานตรงเข้า LINE ช่างคนนั้นทันที
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLine((p) => ({ ...p, technicians: [...(p.technicians || []), { name: '', user_id: '' }] }))}
                    className="text-xs text-blue-500 hover:underline font-bold flex items-center gap-1"
                  >
                    <UserPlus size={12} /> <span>+ เพิ่มช่าง</span>
                  </button>
                </div>

                {(!line.technicians || line.technicians.length === 0) && (
                  <div className="text-xs text-slate-400 py-1.5">ยังไม่มีรายชื่อช่าง — กด + เพิ่ม</div>
                )}

                <div className="space-y-2">
                  {(line.technicians || []).map((t, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        className="input text-xs"
                        value={t.name || ''}
                        onChange={(e) =>
                          setLine((p) => {
                            const a = [...(p.technicians || [])]
                            a[i] = { ...a[i], name: e.target.value }
                            return { ...p, technicians: a }
                          })
                        }
                        placeholder="ชื่อช่าง (เช่น หนึ่ง)"
                        style={{ flex: '0 0 130px' }}
                      />
                      <input
                        className="input font-mono text-xs"
                        value={t.user_id || ''}
                        onChange={(e) =>
                          setLine((p) => {
                            const a = [...(p.technicians || [])]
                            a[i] = { ...a[i], user_id: e.target.value }
                            return { ...p, technicians: a }
                          })
                        }
                        placeholder="User ID เช่น Uxxxxxxxx..."
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setLine((p) => ({
                            ...p,
                            technicians: (p.technicians || []).filter((_, j) => j !== i),
                          }))
                        }
                        className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 hover:text-red-500 flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional Store Needle LINE Notify Token */}
              <div>
                <label className="label mb-1">
                  LINE Notify Token กลุ่มสโตร์เข็ม <span style={{ fontSize: 10, color: 'var(--text-400)' }}>(ทางเลือก สำหรับส่งเข้ากลุ่ม LINE Notify ของสโตร์)</span>
                </label>
                <input
                  className="input font-mono text-xs"
                  type="password"
                  value={line.needle_keeper_notify_token || ''}
                  onChange={(e) => setLine((p) => ({ ...p, needle_keeper_notify_token: e.target.value }))}
                  placeholder="เช่น LINE Notify Token กลุ่มสโตร์เข็ม"
                />
              </div>

            </div>
          )}

    </>
  )
}
