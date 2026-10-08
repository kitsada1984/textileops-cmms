// src/pages/machines/index.jsx
// Main Machines Feature Container: Selects Tri-View based on Device (ADR-0002)

import React, { useState } from 'react'
import useDeviceView from '../../hooks/useDeviceView'
import useMachinesLogic from './useMachinesLogic'
import MachinesDesktopView from './MachinesDesktopView'
import MachinesTabletView from './MachinesTabletView'
import MachinesMobileView from './MachinesMobileView'
import YarnBeltsView from './YarnBeltsView'

import Modal from '../../components/ui/Modal'
import DetailDrawer from '../../components/ui/DetailDrawer'
import StatusBadge from '../../components/ui/StatusBadge'
import F from '../../components/ui/FormField'
import ImageThumbnail from '../../components/ui/ImageThumbnail'
import ImagePreviewModal from '../../components/ui/ImagePreviewModal'
import PdfPreviewModal from '../../components/ui/PdfPreviewModal'
import { generateMachinePdfProps } from '../../utils/pdfDocGenerators'
import { MACHINE_STATUS } from '../../api/entities'
import { format } from 'date-fns'
import {
  Cpu, Disc, Layers, SlidersHorizontal, Image as ImageIcon,
  Upload, RefreshCw, Check, ExternalLink
} from 'lucide-react'

export default function MachinesPage() {
  const { device } = useDeviceView()
  const logic = useMachinesLogic()
  const [activeTab, setActiveTab] = useState('machines')

  const {
    t,
    canEdit,
    canDelete,
    openEdit,
    del,
    submit,
    saving,
    form,
    setForm,
    modal,
    setModal,
    uploadingImage,
    onPickImageFile,
    detailRec,
    setDetailRec,
    pdfItem,
    setPdfItem,
    previewImageModal,
    setPreviewImageModal,
    getMachineImageUrl,
    getMachineTape5,
    stripMachineMeta,
  } = logic

  return (
    <div className="machines-page-root w-full">
      {/* ── 0. SUB-TABS NAVIGATION (Machines vs Yarn Belts) ─── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
        <button
          type="button"
          onClick={() => setActiveTab('machines')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'machines'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Cpu size={15} />
          <span>ข้อมูลเครื่องจักร</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeTab === 'machines'
              ? 'bg-blue-800 text-blue-100'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {logic.data?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('yarn_belts')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'yarn_belts'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Disc size={15} />
          <span>สายพานส่งด้าย (เทป 1-5)</span>
        </button>
      </div>

      {/* ── 1. ACTIVE PRESENTATION VIEW ───────────────────────── */}
      {activeTab === 'yarn_belts' ? (
        <YarnBeltsView logic={logic} />
      ) : (
        <>
          {device === 'mobile' && <MachinesMobileView logic={logic} />}
          {device === 'tablet' && <MachinesTabletView logic={logic} />}
          {device === 'desktop' && <MachinesDesktopView logic={logic} />}
        </>
      )}

      {/* ── 2. SHARED DETAIL DRAWER ───────────────────────────── */}
      <DetailDrawer
        open={!!detailRec}
        onClose={() => setDetailRec(null)}
        title={detailRec?.Mc}
        subtitle={detailRec?.Location ? `ตำแหน่ง: ${detailRec.Location}` : ''}
        icon={Cpu}
        accentColor="#2563eb"
        badge={detailRec && <StatusBadge value={detailRec.Status} />}
        canEdit={canEdit}
        canDelete={canDelete}
        onPdf={() => setPdfItem(detailRec)}
        onEdit={() => openEdit(detailRec)}
        onDelete={() => {
          del(detailRec._id || detailRec.id)
          setDetailRec(null)
        }}
        groups={detailRec ? [
          {
            label: t('dr_general_info'),
            fields: [
              { label: t('mc_th_mc'), value: detailRec.Mc },
              { label: t('mc_th_loc'), value: detailRec.Location },
              { label: t('mc_th_type'), value: detailRec.Type },
              { label: t('mc_th_mfr'), value: detailRec.Manufacturer },
              { label: t('mc_th_model'), value: detailRec.Model },
              { label: t('mc_th_watercheck'), value: detailRec.WaterCheck },
              ...(getMachineImageUrl(detailRec) ? [{
                label: 'รูปถ่ายเครื่องจักร',
                full: true,
                node: (
                  <div className="pt-1">
                    <ImageThumbnail
                      url={getMachineImageUrl(detailRec)}
                      alt={`เครื่องจักร ${detailRec.Mc}`}
                      size={48}
                      onClick={() => setPreviewImageModal({ url: getMachineImageUrl(detailRec), title: `เครื่องจักร ${detailRec.Mc}` })}
                    />
                  </div>
                ),
              }] : []),
            ].filter((f) => f && (f.node || f.value)),
          },
          {
            label: t('dr_specs'),
            fields: [
              { label: t('mc_th_dia'), value: detailRec.Diameter ? `${detailRec.Diameter}"` : null },
              { label: t('mc_th_gauge'), value: detailRec.Gauge ? `${detailRec.Gauge}G` : null },
              { label: t('mc_th_needle'), value: detailRec.Needle },
              { label: t('mc_th_oil'), value: detailRec.Oil },
              { label: t('mc_th_feeder'), value: detailRec.Feeder },
              { label: t('mc_th_model_inv'), value: detailRec.Model_Inverter },
              { label: t('mc_th_sinker'), value: detailRec.Sinker },
            ].filter((f) => f.value),
          },
          {
            label: 'Serial Numbers',
            fields: [
              { label: t('mc_th_serial_old'), value: detailRec.Serial_OLD, mono: true },
              { label: t('mc_th_serial_new'), value: detailRec.Serial_NEW, mono: true },
            ].filter((f) => f.value),
          },
          {
            label: 'Tape, Dial & Leg Parameters',
            fields: [
              { label: t('mc_th_tape1'), value: detailRec.Tape1_No },
              { label: t('mc_th_tape2'), value: detailRec.Tape2_No },
              { label: t('mc_th_tape3'), value: detailRec.Tape3_No },
              { label: t('mc_th_tape4'), value: detailRec.Tape4_No },
              { label: t('mc_th_tape5'), value: getMachineTape5(detailRec) },
              { label: t('mc_th_dial_front'), value: detailRec.Dial_Front },
              { label: t('mc_th_dial_rear'), value: detailRec.Dial_Rear },
              { label: t('mc_th_leg1'), value: detailRec.Leg1 },
              { label: t('mc_th_leg2'), value: detailRec.Leg2 },
              { label: t('mc_th_leg3'), value: detailRec.Leg3 },
              { label: t('mc_th_leg4'), value: detailRec.Leg4 },
            ].filter((f) => f.value),
          },
          {
            label: t('remark'),
            single: true,
            fields: [
              { label: t('remark'), value: stripMachineMeta(detailRec.Remark), full: true },
            ].filter((f) => f.value),
          },
          {
            label: t('dr_updated'),
            fields: [
              {
                label: t('field_updated_at'),
                value: (detailRec.updated_at || detailRec.LastUpdated)
                  ? format(new Date(detailRec.updated_at || detailRec.LastUpdated), 'dd/MM/yyyy HH:mm')
                  : null,
              },
            ].filter((f) => f.value),
          },
        ].filter((g) => g.fields.length > 0) : []}
      />

      {/* ── 3. SHARED ADD / EDIT MODAL ────────────────────────── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={form._id || form.id ? '✏️ แก้ไขข้อมูลเครื่องจักร' : '➕ เพิ่มข้อมูลเครื่องจักรใหม่'}
        size="xl"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button type="button" className="btn-outline px-4" onClick={() => setModal(false)}>
              {t('cancel')}
            </button>
            <button type="button" className="btn-primary px-5" onClick={submit} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>{t('save')}</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-5 text-xs">
          {/* Section 1: General Info */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <Cpu size={14} className="text-blue-500" />
              <span>ข้อมูลหลักและสถานะเครื่องจักร</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <F form={form} setForm={setForm} label={`${t('mc_th_mc')} (Mc) *`} id="Mc" placeholder="เช่น SA369-P" />
              <F form={form} setForm={setForm} label={`${t('mc_th_loc')} *`} id="Location" placeholder="เช่น GK3" />
              <F form={form} setForm={setForm} label={t('status')} id="Status" opts={MACHINE_STATUS} />
              <F form={form} setForm={setForm} label={t('mc_th_item')} id="ITEM" type="number" placeholder="ลำดับ" />
              <F form={form} setForm={setForm} label={t('mc_th_type')} id="Type" placeholder="เช่น S หรือ D" />
              <F form={form} setForm={setForm} label={t('mc_th_mfr')} id="Manufacturer" placeholder="เช่น Pailung" />
              <F form={form} setForm={setForm} label={t('mc_th_model')} id="Model" placeholder="เช่น PL-KS3B/C-W" />
              <F form={form} setForm={setForm} label={t('mc_th_watercheck')} id="WaterCheck" placeholder="เช่น 11/3/2566" />
            </div>
          </div>

          {/* Section 2: Specs */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <Layers size={14} className="text-blue-500" />
              <span>สเปกและส่วนประกอบเครื่องจักร</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <F form={form} setForm={setForm} label={t('mc_th_dia')} id="Diameter" placeholder="เช่น 36" />
              <F form={form} setForm={setForm} label={t('mc_th_gauge')} id="Gauge" placeholder="เช่น 28" />
              <F form={form} setForm={setForm} label={t('mc_th_needle')} id="Needle" placeholder="เช่น 3168" />
              <F form={form} setForm={setForm} label={t('mc_th_feeder')} id="Feeder" placeholder="เช่น 110" />
              <F form={form} setForm={setForm} label={t('mc_th_oil')} id="Oil" placeholder="เช่น 41" />
              <F form={form} setForm={setForm} label={t('mc_th_sinker')} id="Sinker" placeholder="Sinker" />
              <F form={form} setForm={setForm} label={t('mc_th_model_inv')} id="Model_Inverter" placeholder="Inverter Model" />
              <F form={form} setForm={setForm} label={t('mc_th_serial_old')} id="Serial_OLD" placeholder="ซีเรียลเดิม" />
              <F form={form} setForm={setForm} label={t('mc_th_serial_new')} id="Serial_NEW" placeholder="ซีเรียลใหม่" />
            </div>
          </div>

          {/* Section 3: Tape, Dial & Leg */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <SlidersHorizontal size={14} className="text-emerald-500" />
              <span>พารามิเตอร์สายพาน, หน้าปัด และขาเครื่องจักร (Tape, Dial, Legs)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <F form={form} setForm={setForm} label={t('mc_th_tape1')} id="Tape1_No" />
              <F form={form} setForm={setForm} label={t('mc_th_tape2')} id="Tape2_No" />
              <F form={form} setForm={setForm} label={t('mc_th_tape3')} id="Tape3_No" />
              <F form={form} setForm={setForm} label={t('mc_th_tape4')} id="Tape4_No" />
              <F form={form} setForm={setForm} label={t('mc_th_tape5')} id="Tape5_No" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-1">
              <F form={form} setForm={setForm} label={t('mc_th_dial_front')} id="Dial_Front" />
              <F form={form} setForm={setForm} label={t('mc_th_dial_rear')} id="Dial_Rear" />
              <F form={form} setForm={setForm} label={t('mc_th_leg1')} id="Leg1" />
              <F form={form} setForm={setForm} label={t('mc_th_leg2')} id="Leg2" />
              <F form={form} setForm={setForm} label={t('mc_th_leg3')} id="Leg3" />
              <F form={form} setForm={setForm} label={t('mc_th_leg4')} id="Leg4" />
            </div>
          </div>

          {/* Section 4: Photo & Remark */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
              <ImageIcon size={14} className="text-indigo-500" />
              <span>รูปถ่ายแท็กเครื่องจักร & หมายเหตุ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label font-bold">อัปโหลดรูปแท็กเข้า Google Drive</label>
                <div className="flex items-center gap-2">
                  <label className="btn-primary text-xs py-2 px-3 cursor-pointer flex items-center gap-1.5 flex-1 justify-center">
                    {uploadingImage ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>กำลังอัปโหลด...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={13} />
                        <span>เลือกไฟล์รูปถ่าย</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage}
                      onChange={(e) => {
                        const picked = e.target.files?.[0]
                        e.target.value = ''
                        if (picked) onPickImageFile(picked)
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <F form={form} setForm={setForm} label="หรือวางลิงก์รูป (URL)" id="ImageUrl" useBuilder={false} placeholder="https://..." />
              </div>

              {form.ImageUrl && (
                <div className="col-span-1 sm:col-span-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <ImageIcon size={16} className="text-blue-600 flex-shrink-0" />
                    <span className="font-mono text-blue-700 dark:text-blue-300 truncate">{form.ImageUrl}</span>
                  </div>
                  <a
                    href={form.ImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline text-[11px] py-1 px-2 flex-shrink-0 flex items-center gap-1"
                  >
                    <span>ดูรูป</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}

              <div className="col-span-1 sm:col-span-2">
                <F
                  form={form}
                  setForm={setForm}
                  label={t('mc_th_remark')}
                  id="Remark"
                  placeholder="ข้อคิดเห็น หรือประวัติพิเศษของเครื่อง"
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── 4. IMAGE PREVIEW MODAL ────────────────────────────── */}
      <ImagePreviewModal
        open={!!previewImageModal}
        onClose={() => setPreviewImageModal(null)}
        url={previewImageModal?.url}
        title={previewImageModal?.title}
      />

      {/* ── 5. PDF PREVIEW & PRINT MODAL ──────────────────────── */}
      {pdfItem && (
        <PdfPreviewModal
          open={!!pdfItem}
          onClose={() => setPdfItem(null)}
          {...generateMachinePdfProps(pdfItem)}
        />
      )}
    </div>
  )
}
