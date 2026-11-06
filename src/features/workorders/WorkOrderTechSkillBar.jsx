// Skill helpers moved verbatim from WorkOrders (no logic change).

export function getTechSkillInfo(skillLevel = 'Senior') {
  const norm = String(skillLevel || '').trim().toLowerCase()
  if (norm.includes('master')) {
    return {
      level: 4,
      maxLevel: 4,
      percent: 100,
      label: 'Master',
      sublabel: 'หัวหน้าช่าง / ผู้เชี่ยวชาญ',
      icon: '🥇',
      gradient: 'from-purple-500 to-indigo-600',
      activeBg: 'bg-purple-600',
      textColor: 'text-purple-600 dark:text-purple-400',
      badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    }
  }
  if (norm.includes('senior')) {
    return {
      level: 3,
      maxLevel: 4,
      percent: 75,
      label: 'Senior',
      sublabel: 'ช่างอาวุโส / ปรับแต่งชำนาญ',
      icon: '🥈',
      gradient: 'from-blue-500 to-indigo-500',
      activeBg: 'bg-blue-600',
      textColor: 'text-blue-600 dark:text-blue-400',
      badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    }
  }
  if (norm.includes('tech') || norm.includes('mid')) {
    return {
      level: 2,
      maxLevel: 4,
      percent: 50,
      label: 'Technician',
      sublabel: 'ช่างชำนาญงานทั่วไป',
      icon: '🎖️',
      gradient: 'from-sky-400 to-blue-500',
      activeBg: 'bg-sky-500',
      textColor: 'text-sky-600 dark:text-sky-400',
      badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
    }
  }
  return {
    level: 1,
    maxLevel: 4,
    percent: 25,
    label: 'Junior',
    sublabel: 'ช่างฝึกหัด / ผู้ช่วยช่าง',
    icon: '🔰',
    gradient: 'from-emerald-400 to-teal-500',
    activeBg: 'bg-emerald-500',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  }
}


export function TechSkillBar({ skillLevel = 'Senior' }) {
  const info = getTechSkillInfo(skillLevel)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold flex items-center gap-1 text-slate-700 dark:text-slate-200">
          <span>{info.icon}</span>
          <span className={info.textColor}>{info.label}</span>
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{info.sublabel}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((step) => {
          const isFilled = step <= info.level
          return (
            <div
              key={step}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                isFilled ? info.activeBg : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}
