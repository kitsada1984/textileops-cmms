import { Pencil, Trash2, UserCheck, UserPlus } from 'lucide-react'
import { TechSkillBar } from './WorkOrderTechSkillBar.jsx'

// Technicians tab content moved verbatim from WorkOrders (props only).
export function WorkOrdersTechnicians({ technicians, unregisteredLineUsers, canAdd, canEdit, canDelete, openAddTech, openEditTech, handleDeleteTech }) {
  return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-900)' }}>
                ทะเบียนช่างปรับ & ซ่อมบำรุง (Technicians Registry)
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-500)' }}>
                รายชื่อช่าง เลือกระดับทักษะ และความถนัดเฉพาะทาง
              </p>
            </div>
            {canAdd && (
              <button onClick={() => openAddTech()} className="btn-primary">
                <UserPlus size={15} />
                <span>เพิ่มช่างใหม่</span>
              </button>
            )}
          </div>

          {/* Quick-Add Panel for Users logged in with LINE who aren't in Technicians yet */}
          {unregisteredLineUsers.length > 0 && canAdd && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300">
                    พบบัญชี LINE Login ที่ยังไม่ได้เพิ่มในทะเบียนช่าง ({unregisteredLineUsers.length} บัญชี)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  คลิก "+ เพิ่มเป็นช่าง" เพื่อดึงชื่อและ LINE User ID ให้อัตโนมัติ
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {unregisteredLineUsers.map((u) => {
                  const dispName = u.full_name || u.line_display_name || u.username
                  return (
                    <div
                      key={u.id || u.line_user_id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20 shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500/30 overflow-hidden flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                          {u.line_picture_url ? (
                            <img src={u.line_picture_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            dispName[0]?.toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {dispName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            LINE: {u.line_display_name || u.username}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAddTech(u)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800 shrink-0 transition-colors"
                      >
                        + เพิ่มเป็นช่าง
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {technicians.length === 0 ? (
            <div className="card p-12 text-center space-y-4 border-dashed border-2 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl">
              <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center shadow-inner">
                <UserCheck size={32} />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  ยังไม่มีรายชื่อในทะเบียนช่าง
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  คุณสามารถเพิ่มรายชื่อช่าง (เช่น ช.ต๋อง, ช.หนุ่ม) พร้อมระบุ LINE ID และ Telegram ID เพื่อรับการแจ้งเตือนงานซ่อมโดยตรง
                </p>
              </div>
              <div>
                <button
                  onClick={() => openAddTech()}
                  className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 shadow-md text-sm font-bold"
                >
                  <UserPlus size={16} />
                  <span>+ เพิ่มช่างคนแรก</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {technicians.map((tech, idx) => {
                const isActive = tech.Status !== 'INACTIVE'
                const specList = tech.Specialization
                  ? String(tech.Specialization).split(',').map((s) => s.trim()).filter(Boolean)
                  : []

                return (
                  <div
                    key={tech.id || tech.Technician_ID || idx}
                    className="card p-5 space-y-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg font-black font-mono overflow-hidden">
                          {tech.Avatar_URL ? (
                            <img src={tech.Avatar_URL} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (tech?.Name || '?')[0]?.toUpperCase()
                          )}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                            {tech.Name}
                          </h3>
                          <div className="text-xs font-mono text-slate-500 mt-0.5">
                            {tech.Phone || '—'}
                          </div>
                        </div>
                      </div>

                      <span className={`badge ${isActive ? 'badge-green' : 'badge-gray'}`}>
                        {isActive ? 'พร้อมทำงาน' : 'ปิดใช้งาน'}
                      </span>
                    </div>

                    {/* Visual Skill Level Bar */}
                    <TechSkillBar skillLevel={tech.SkillLevel} />

                    {/* Specializations Tags */}
                    <div className="space-y-1.5 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-500 block">ความถนัด:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {specList.length > 0 ? (
                          specList.map((item, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              <span>{item}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs italic">งานซ่อมบำรุงทั่วไป</span>
                        )}
                      </div>
                    </div>

                    {/* Notification IDs Badges */}
                    <div className="space-y-1.5 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-500 block">การแจ้งเตือนงานซ่อม:</span>
                      <div className="flex flex-col gap-1.5 text-[11px] font-mono">
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 font-sans">
                            <span>🟢 LINE ID</span>
                          </span>
                          <span className="truncate max-w-[170px] text-right font-medium text-slate-700 dark:text-slate-200">
                            {tech.Line_ID || tech.line_id || <span className="text-slate-400 font-sans italic">ยังไม่ได้ระบุ</span>}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                          <span className="text-sky-600 dark:text-sky-400 font-bold flex items-center gap-1 font-sans">
                            <span>✈️ Telegram</span>
                          </span>
                          <span className="truncate max-w-[170px] text-right font-medium text-slate-700 dark:text-slate-200">
                            {tech.Telegram_ID || tech.telegram_id || <span className="text-slate-400 font-sans italic">ยังไม่ได้ระบุ</span>}
                          </span>
                        </div>
                      </div>
                    </div>

                    {(canEdit || canDelete) && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end items-center gap-2">
                        {canEdit && (
                          <button
                            onClick={() => openEditTech(tech)}
                            className="btn-outline px-3 py-1.5 text-xs flex items-center gap-1.5 font-bold"
                          >
                            <Pencil size={13} />
                            <span>แก้ไขข้อมูล</span>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteTech(tech)}
                            className="btn-outline px-2.5 py-1.5 text-xs flex items-center gap-1 font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/40"
                            title="ลบรายชื่อช่าง"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
  )
}
