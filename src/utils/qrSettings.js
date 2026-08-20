export const QR_FIELDS = [
  { key: 'Serial_OLD',    label: 'Serial เดิม' },
  { key: 'Location',      label: 'ตำแหน่ง (Location)' },
  { key: 'Standard',      label: 'Standard' },
  { key: 'NewMC',         label: 'เครื่อง (NewMC)' },
  { key: 'Type',          label: 'ประเภท (Type)' },
  { key: 'Manufacturer',  label: 'ยี่ห้อ (Manufacturer)' },
  { key: 'Feeder',        label: 'Feeder' },
  { key: 'Diameter',      label: 'Diameter' },
  { key: 'Gauge',         label: 'Gauge' },
  { key: 'Needle',        label: 'Needle' },
  { key: 'Machine_Ref',   label: 'อ้างอิงกระบอก' },
  { key: 'Comment',       label: 'หมายเหตุ' },
]

export const QR_DEFAULTS = {
  displayFields: ['Location', 'Standard', 'Type', 'NewMC'],
  qrSize: 140,
  useUrl: true,   // encode repair URL instead of just serial
}

const STORAGE_KEY = 'cyl_qr_settings'

export const loadQRSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved ? { ...QR_DEFAULTS, ...saved } : { ...QR_DEFAULTS }
  } catch { return { ...QR_DEFAULTS } }
}

export const saveQRSettings = (cfg) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}
