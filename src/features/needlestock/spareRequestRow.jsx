import { Edit3, Eye, PackageCheck, Trash2 } from 'lucide-react'

export function SpareRequestRow({ req, setSelectedSpareReq, setPrepareModalOpen, setSelectedEditReq, setEditSpareModalOpen, setSelectedDeleteReq, setDeleteAckReturned, setDeleteConfirmModalOpen }) {
  const dial = req.tracks_requested?.dial || {};
  const cyl = req.tracks_requested?.cylinder || {};
  return (
                            <tr key={req.id} className="hover:bg-slate-50 transition">
                              <td className="p-3.5 text-xs text-slate-500 whitespace-nowrap">
                                {new Date(req.created_at).toLocaleString('th-TH', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </td>
                              <td className="p-3.5 font-mono text-xs font-bold text-indigo-700">
                                {req.request_no || req.id}
                              </td>
                              <td className="p-3.5">
                                <div className="font-bold text-slate-800">{req.machine_mc || '—'}</div>
                                <div className="text-[11px] text-slate-500">
                                  {req.gauge && <span className="text-sky-600 font-semibold">{req.gauge}</span>}
                                  {req.cylinder_serial && <span> · SN: {req.cylinder_serial}</span>}
                                </div>
                              </td>
                              <td className="p-3.5 text-xs text-slate-700">
                                <div className="font-semibold">{req.technician_name}</div>
                                <span className="text-[11px] text-slate-500">{req.shift}</span>
                              </td>
                              <td className="p-3.5">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {dial.single > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold">Dial Single: {dial.single}</span>}
                                  {dial.t1 > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold">Dial T1: {dial.t1}</span>}
                                  {dial.t2 > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold">Dial T2: {dial.t2}</span>}
                                  {(dial.singker > 0 || dial.sinker > 0) && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold">Dial Singker: {dial.singker || dial.sinker}</span>}
                                  {cyl.t1 > 0 && <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-bold">Cyl T1: {cyl.t1}</span>}
                                  {cyl.t2 > 0 && <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-bold">Cyl T2: {cyl.t2}</span>}
                                  {cyl.t3 > 0 && <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-bold">Cyl T3: {cyl.t3}</span>}
                                  {cyl.t4 > 0 && <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-bold">Cyl T4: {cyl.t4}</span>}
                                </div>
                              </td>
                              <td className="p-3.5 text-xs text-slate-600 max-w-xs">
                                {req.request_comment ? (
                                  <p className="line-clamp-2 italic text-amber-800 bg-amber-50/60 p-1 rounded">
                                    "{req.request_comment}"
                                  </p>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="p-3.5 whitespace-nowrap">
                                {req.status === 'PENDING' && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    ⏳ รอจัดเตรียม
                                  </span>
                                )}
                                {req.status === 'PREPARED' && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                    📦 เตรียมแล้ว (รอรับ)
                                  </span>
                                )}
                                {req.status === 'COMPLETED' && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    ✅ รับเข็มเรียบร้อย
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 text-center whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5 justify-center">
                                  {req.status === 'PENDING' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedSpareReq(req)
                                        setPrepareModalOpen(true)
                                      }}
                                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                                      title="จัดเตรียมเข็มและตัดสต็อกออกจากคลัง"
                                    >
                                      <PackageCheck className="w-3.5 h-3.5" />
                                      <span>จัดเตรียม</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedSpareReq(req)
                                        setPrepareModalOpen(true)
                                      }}
                                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                                      title="ดูรายละเอียดการตัดสต็อก"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>ดูข้อมูล</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedEditReq(req)
                                      setEditSpareModalOpen(true)
                                    }}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                                    title="แก้ไขข้อมูลใบเบิกเข็ม"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>แก้ไข</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedDeleteReq(req)
                                      setDeleteAckReturned(false)
                                      setDeleteConfirmModalOpen(true)
                                    }}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                                    title={req.issued_items?.length > 0 ? "ลบใบเบิกและคืนเข็มเข้าคลังสต็อกอัตโนมัติ" : "ลบใบเบิก"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>ลบ</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
  )
}
