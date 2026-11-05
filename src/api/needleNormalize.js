// Field-group resolvers moved verbatim from normalizeNeedleSet / normalizeNeedleLog
// (alias-pair chains only — parsing calls stay in the caller).
// Groups follow the original return key order so serialized output is unchanged.

export function resolveNeedleImageSource(obj) {
  return (
    obj.images ??
    obj.Image_URLs ??
    obj.imageUrls ??
    obj.image_urls ??
    obj.Photos ??
    obj.photos ??
    obj.Photo_URLs ??
    obj.photo_urls ??
    obj.Image_URL ??
    obj.image_url ??
    obj.Image ??
    obj.image
  )
}

export function resolveNeedleSetMachine(item) {
  return {
    machineType: item.Machine_Type || item.machineType || 'Single',
    Machine_Type: item.Machine_Type || item.machineType || 'Single',
    gauge: item.Gauge || item.gauge || '28G',
    Gauge: item.Gauge || item.gauge || '28G',
    machineId: item.Machine_ID || item.machineId || '',
    Machine_ID: item.Machine_ID || item.machineId || '',
    brand: item.Brand || item.brand || '',
    Brand: item.Brand || item.brand || '',
    needleModel: item.Needle_Model || item.needleModel || '',
    Needle_Model: item.Needle_Model || item.needleModel || '',
  }
}

export function resolveNeedleSetGrade(item) {
  return {
    grade: item.Grade || item.grade || 'เกรด B',
    Grade: item.Grade || item.grade || 'เกรด B',
    conditionDetail: item.Condition_Detail || item.conditionDetail || 'สึกปานกลาง',
    Condition_Detail: item.Condition_Detail || item.conditionDetail || 'สึกปานกลาง',
    status: item.Status || item.status || 'คัดแล้ว',
    Status: item.Status || item.status || 'คัดแล้ว',
  }
}

export function resolveNeedleSetDates(item) {
  return {
    dateRecorded: item.Date_Recorded || item.dateRecorded || '',
    Date_Recorded: item.Date_Recorded || item.dateRecorded || '',
    inspector: item.Inspector || item.inspector || 'ช่างประจำกะ',
    Inspector: item.Inspector || item.inspector || 'ช่างประจำกะ',
    remarks: item.Remarks || item.remarks || '',
    Remarks: item.Remarks || item.remarks || '',
  }
}

export function resolveNeedleSetPlace(item) {
  return {
    location: item.Location || item.location || 'STORE',
    Location: item.Location || item.location || 'STORE',
    updatedAt: item.updated_at || item.Updated_At || item.updatedAt || new Date().toISOString(),
  }
}

export function resolveNeedleLogHead(log) {
  return {
    setId: log.Set_ID || log.setId || '',
    Set_ID: log.Set_ID || log.setId || '',
    actionType: log.Action_Type || log.actionType || '',
    Action_Type: log.Action_Type || log.actionType || '',
    oldGrade: log.Old_Grade || log.oldGrade || '',
    newGrade: log.New_Grade || log.newGrade || '',
    conditionDetail: log.Condition_Detail || log.conditionDetail || '',
  }
}

export function resolveNeedleLogMeta(log) {
  return {
    dateAction: log.Date_Action || log.dateAction || '',
    technician: log.Technician || log.technician || 'tuk',
    remarks: log.Remarks || log.remarks || '',
    targetMachine: log.Target_Machine || log.targetMachine || '',
    sourceFrom: log.Source_From || log.sourceFrom || '',
    scrapReason: log.Scrap_Reason || log.scrapReason || '',
    qtyChange: log.Qty_Change || log.qtyChange || '',
  }
}

export function resolveNeedleLogStock(log) {
  return {
    stockDetail: log.Stock_Detail || log.stockDetail || 'PM',
  }
}
