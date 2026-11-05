// Pure helpers moved verbatim from reconstructSwapCylinders
// (field-resolution chains only — no state, no side effects).

export function parseFallbackSerials(item) {
  let fallbackOutSerial = ''
  let fallbackInSerial = ''
  if (item.raw?.RecordID && (item.raw.RecordID.includes('<->') || item.raw.RecordID.includes('↔'))) {
    const parts = item.raw.RecordID.split(/<->|↔/).map((s) => s.trim())
    if (parts.length >= 2) {
      fallbackOutSerial = parts[0]
      fallbackInSerial = parts[1]
    }
  }
  return { fallbackOutSerial, fallbackInSerial }
}

export function resolveSwapSerial(snapshotBefore, side, after, fallback) {
  return (
    snapshotBefore.Serial_NOW ||
    side?.serial ||
    snapshotBefore.serial ||
    side?.Serial_NOW ||
    after.Serial_NOW ||
    after.serial ||
    fallback ||
    ''
  )
}

export function resolveSwapSerialFields(raw, side, master, serial) {
  return {
    Serial_NOW:
      raw.Serial_NOW ||
      side?.serial ||
      raw.serial ||
      master?.Serial_NOW ||
      serial ||
      '',
    Serial_OLD:
      raw.Serial_OLD ||
      side?.Serial_OLD ||
      master?.Serial_OLD ||
      raw.serial ||
      side?.serial ||
      master?.Serial_NOW ||
      '',
  }
}

export function resolveSwapIdentityFields(raw, side, master) {
  return {
    Standard:
      raw.Standard ||
      raw.standard ||
      side?.standard ||
      master?.Standard ||
      '',
    NewMC:
      raw.NewMC ||
      raw.mc ||
      side?.mc ||
      master?.NewMC ||
      '',
  }
}

export function resolveSwapSpecFields(raw, side, master) {
  return {
    Type:
      raw.Type ||
      raw.type ||
      side?.type ||
      master?.Type ||
      '',
    Gauge:
      raw.Gauge ||
      raw.gauge ||
      side?.gauge ||
      master?.Gauge ||
      '',
    Needle:
      raw.Needle ||
      raw.needle ||
      side?.needle ||
      master?.Needle ||
      '',
    Diameter:
      raw.Diameter ||
      raw.dia ||
      side?.dia ||
      master?.Diameter ||
      '',
  }
}

export function resolveSwapPlacementFields(raw, side, master) {
  return {
    Location:
      raw.Location ||
      raw.loc ||
      side?.loc ||
      master?.Location ||
      '',
    Feeder:
      raw.Feeder ||
      raw.feeder ||
      side?.feeder ||
      master?.Feeder ||
      '',
    Manufacturer:
      raw.Manufacturer ||
      raw.mfr ||
      side?.mfr ||
      master?.Manufacturer ||
      '',
    Machine_Ref:
      raw.Machine_Ref ||
      raw.machineRef ||
      side?.machineRef ||
      master?.Machine_Ref ||
      '',
  }
}

export function resolveSwapMetaFields(raw, item, master) {
  return {
    ImageUrl:
      raw.ImageUrl ||
      master?.ImageUrl ||
      '',
    Comment:
      raw.Comment ||
      item.comment ||
      master?.Comment ||
      '',
  }
}

export function buildEnrichedCylinder(raw, side, master, serial, item) {
  return {
    ...resolveSwapSerialFields(raw, side, master, serial),
    ...resolveSwapIdentityFields(raw, side, master),
    ...resolveSwapSpecFields(raw, side, master),
    ...resolveSwapPlacementFields(raw, side, master),
    ...resolveSwapMetaFields(raw, item, master),
  }
}

export function applyReciprocalLocation(cylOut, cylIn, swapCols) {
  // Reciprocal location inference if location is swapped
  if (swapCols.includes('Location')) {
    if (!cylOut.Location && cylIn.Location) cylOut.Location = cylIn.Location
    if (!cylIn.Location && cylOut.Location) cylIn.Location = cylOut.Location
  }
}

export function buildAfterSwapSide(after, self, other, swapCols) {
  return {
    ...self,
    Location: after.Location || after.loc || (swapCols.includes('Location') ? other.Location : self.Location),
    Machine_Ref: after.Machine_Ref || after.machineRef || (swapCols.includes('Machine_Ref') ? other.Machine_Ref : self.Machine_Ref),
    Feeder: after.Feeder || after.feeder || (swapCols.includes('Feeder') ? other.Feeder : self.Feeder),
    NewMC: after.NewMC || after.mc || self.NewMC,
  }
}

export function buildAfterSwap(cylOut, cylIn, afterOut, afterIn, swapCols) {
  return {
    newOut: buildAfterSwapSide(afterOut, cylOut, cylIn, swapCols),
    newIn: buildAfterSwapSide(afterIn, cylIn, cylOut, swapCols),
  }
}
