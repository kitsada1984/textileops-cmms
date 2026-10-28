import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  motion,
  AnimatePresence,
  MotionConfig,
  useScroll,
  useSpring,
  useInView,
} from 'framer-motion'
import {
  Maximize2,
  Minimize2,
  FileText,
  ExternalLink,
  X,
  Play,
  RotateCcw,
  Sparkles,
  Cpu,
  Layers,
  Wrench,
  CheckCircle2,
  Clock,
  TrendingDown,
  ShieldCheck,
  Send,
  Printer,
  Package,
  Disc,
  ArrowDown,
  ArrowUp,
  Eye,
  Zap,
  ChevronRight,
} from 'lucide-react'
import gemmaLogo from '../assets/logo-gemma.png'
import { APP_VERSION } from '../version'

// Smooth executive deceleration curve
const EASE_EXECUTIVE = [0.22, 1, 0.36, 1]

export const LANDING_SECTIONS = [
  {
    id: 'hero',
    navLabel: 'ภาพรวม',
    eyebrow: 'Project Vision · วิสัยทัศน์โครงการ',
    title: 'TextileOps CMMS: ขับเคลื่อนโรงทอสู่อนาคต Smart Factory',
    speakerNotes:
      'กราบเรียนท่านผู้บริหารทุกท่าน วันนี้ทีมงานมีความยินดีอย่างยิ่งที่จะนำเสนอ TextileOps CMMS แพลตฟอร์มบริหารจัดการเครื่องจักรและงานซ่อมบำรุงที่พัฒนาขึ้นเพื่อแก้ปัญหาหน้างานจริงของโรงทอ เจมม่า นิตส์ โดยเฉพาะ ในธุรกิจสิ่งทอ หัวใจของผลกำไรคือเครื่องจักรต้องเดินได้อย่างต่อเนื่องและผลิตผ้าได้คุณภาพสูงสุด ทุกนาทีที่เครื่องจักรหยุดซ่อม หรือสต็อกอะไหล่ไม่พร้อม คือต้นทุนมหาศาล วันนี้ TextileOps พร้อมแล้วที่จะเปลี่ยนการทำงานแบบเดิม สู่ระบบดิจิทัลที่แม่นยำ ตรวจสอบได้ และลด Downtime ได้อย่างเป็นรูปธรรมครับ',
  },
  {
    id: 'friction',
    navLabel: 'ปัญหา & ทางออก',
    eyebrow: 'Operational Friction vs Unified Solution',
    title: 'จาก 4 ความสูญเสียแฝงหน้างาน สู่ศูนย์กลางข้อมูล Real-Time หนึ่งเดียว',
    speakerNotes:
      'จากการศึกษาขั้นตอนการทำงานจริงของโรงทอ เราพบปัญหาหลัก 4 ประการที่สร้างความสูญเสียแฝงอยู่ทุกวัน คือ 1. แจ้งซ่อมด้วยวาจาหรือกระดาษทำให้เครื่องจอดรอช่างนาน 10-15 นาที 2. ค้นหาอะไหล่ช้าและสต็อกเข็มคลาดเคลื่อน 3. ป้ายกระดาษติดกระบอกเข็มเลอะน้ำมันหลุดหาย เสี่ยงใส่ผิดสเปก และ 4. ผู้บริหารต้องรอสรุปรายสัปดาห์ TextileOps จึงเข้ามาเป็น Single Source of Truth เชื่อมช่างทอ ช่างซ่อม คลังพัสดุ และผู้บริหารเข้าด้วยกันแบบ Real-Time ครับ',
  },
  {
    id: 'pillars',
    navLabel: '4 เสาหลัก',
    eyebrow: 'Core Operational Pillars · โมดูลหลักครบวงจร',
    title: 'สี่เสาหลักที่ครอบคลุมวงจรซ่อมบำรุงโรงทออย่างสมบูรณ์แบบ',
    speakerNotes:
      'สถาปัตยกรรมของ TextileOps แบ่งออกเป็น 4 เสาหลักที่เชื่อมโยงกัน 100%: เสาที่ 1 ระบบแจ้งซ่อมและแผน PM เชิงป้องกัน เสาที่ 2 ระบบคลังเข็ม Needle Ledger ที่ผูกยอดเบิกเข็มเข้ากับส่วนต่างมิเตอร์รอบเครื่องจักร เสาที่ 3 ระบบบริหารกระบอกเข็ม ควบคุมสเปกและประวัติการสลับเครื่อง และเสาที่ 4 คลังอะไหล่อัจฉริยะพร้อมระบบแจ้งเตือนจุดสั่งซื้ออัตโนมัติครับ',
  },
  {
    id: 'innovations',
    navLabel: '3 นวัตกรรมเด่น',
    eyebrow: 'Signature Innovations · ไฮไลต์เทคโนโลยี',
    title: 'สามนวัตกรรมหลักที่ออกแบบเฉพาะเพื่อหน้างานโรงทอ เจมม่า นิตส์',
    speakerNotes:
      'เรามี 3 นวัตกรรมเด่นที่แก้ปัญหาคลาสสิกของโรงงานได้ตรงจุด: 1. Google Gemini AI Vision ถ่ายรูปชิ้นส่วนที่เสียแล้วชี้พิกัดตู้และชั้นวางใน 5 วินาที 2. LINE Flex Notification เด้งแจ้งเตือนงานซ่อมด่วนเข้ามือถือช่างภายใน 1 วินาทีโดยไม่ต้องลงแอปใหม่ และ 3. Smart Tag Precision Printing พิมพ์ป้ายเขียวอ่อน 20×7 ซม. ติดโครงเครื่องจักรเห็นชัดจากระยะ 10 เมตร และป้าย A4 แนวนอนติดกระบอกสำรองครบทั้ง 7 ฟิลด์มาตรฐานครับ',
  },
  {
    id: 'demo',
    navLabel: 'สาธิตสด',
    eyebrow: 'Live Interactive Demo · สาธิตระบบจริง',
    title: 'สัมผัสความเร็วและความง่ายในการใช้งานจริงภายใน 3 นาที',
    speakerNotes:
      'ณ จุดนี้ ขออนุญาตสลับหน้าจอไปที่ระบบจริงบนเซิร์ฟเวอร์ Production เพื่อสาธิตให้คณะผู้บริหารเห็นความลื่นไหล ทั้งมุมมองแดชบอร์ดบนคอมพิวเตอร์และสมาร์ทโฟน การสั่งพิมพ์ป้าย Tack ขนาด 20×7 ซม. และ A4 ตลอดจนการสแกนค้นหาอะไหล่ด้วย AI ครับ',
  },
  {
    id: 'roi',
    navLabel: 'ผลลัพธ์ ROI',
    eyebrow: 'Business Impact & ROI · ความคุ้มค่าเชิงธุรกิจ',
    title: 'ผลตอบแทนที่วัดผลได้จริง ลดต้นทุนแฝงและเพิ่มชั่วโมงเดินเครื่อง',
    speakerNotes:
      'ในมิติผลลัพธ์ทางธุรกิจ TextileOps ช่วยลด Unplanned Downtime ลงได้ 25 ถึง 35% เพิ่มชั่วโมงการผลิตได้หลายร้อยชั่วโมงต่อเดือน ลดเวลาตอบสนองของช่างจาก 15 นาทีเหลือไม่ถึง 1 นาที ยกระดับความแม่นยำสต็อกเข็มและอะไหล่สู่ 99.5% และสร้าง Audit Trail ย้อนหลังได้ 100% พร้อมรองรับการตรวจประเมินมาตรฐานสากลครับ',
  },
  {
    id: 'roadmap',
    navLabel: 'แผนอนาคต',
    eyebrow: 'Enterprise Cloud & Strategic Roadmap',
    title: 'เสถียรภาพระดับสากล ทำงานได้แม้เน็ตสะดุด พร้อมแผนเติบโต 3 ระยะ',
    speakerNotes:
      'ระบบทำงานบนเครือข่าย Cloudflare Global Edge ที่รวดเร็วและปลอดภัยสูง แทบไม่มีภาระค่าดูแลเซิร์ฟเวอร์รายเดือน และมีเทคโนโลยี Offline PWA ให้ช่างบันทึกงานได้ต่อเนื่องแม้สัญญาณอินเทอร์เน็ตขัดข้อง วันนี้ระบบพร้อมใช้งานจริง 100% ใน Phase 1 และพร้อมต่อยอดสู่ IoT และ Predictive AI ในระยะถัดไป ขอขอบพระคุณคณะผู้บริหารทุกท่าน และยินดีตอบข้อซักถามครับ',
  },
]

// Backwards-compatible alias in case external imports reference SLIDES_DATA
export const SLIDES_DATA = LANDING_SECTIONS

/**
 * Animated number counter that triggers after a deliberate delay when scrolled into view.
 */
function AnimatedCounter({
  to,
  from = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  durationMs = 1750,
  delayMs = 350,
  motionEnabled = true,
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, amount: 0.35 })
  const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test'
  const formatNum = useCallback(
    (val) =>
      Number(val).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    [decimals]
  )

  const [displayValue, setDisplayValue] = useState(() =>
    !motionEnabled || isTestEnv ? formatNum(to) : formatNum(from)
  )

  useEffect(() => {
    if (!motionEnabled || isTestEnv) {
      setDisplayValue(formatNum(to))
      return undefined
    }

    if (!isInView) {
      setDisplayValue(formatNum(from))
      return undefined
    }

    let rafId = null
    let timeoutId = null

    timeoutId = setTimeout(() => {
      const startTime = performance.now()
      const step = (now) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / durationMs, 1)
        // EaseOutExpo for crisp deceleration at the final number
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
        const current = from + (to - from) * eased
        setDisplayValue(formatNum(current))
        if (progress < 1) {
          rafId = requestAnimationFrame(step)
        }
      }
      rafId = requestAnimationFrame(step)
    }, delayMs)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [isInView, to, from, durationMs, delayMs, motionEnabled, isTestEnv, formatNum])

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {displayValue}
      {suffix}
    </span>
  )
}

/**
 * Standardized 3-beat delayed section header (Eyebrow -> Title -> Subtitle -> Accent Rule)
 */
function SectionHeader({ eyebrow, title, subtitle, accentColor = 'cyan' }) {
  const badgePalette = {
    cyan: 'bg-cyan-500/10 border-cyan-400/30 text-cyan-300',
    rose: 'bg-rose-500/10 border-rose-400/30 text-rose-300',
    emerald: 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300',
    purple: 'bg-purple-500/10 border-purple-400/30 text-purple-300',
    amber: 'bg-amber-500/10 border-amber-400/30 text-amber-300',
    blue: 'bg-blue-500/10 border-blue-400/30 text-blue-300',
  }

  return (
    <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.3 }}
        transition={{ duration: 0.65, delay: 0.1, ease: EASE_EXECUTIVE }}
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest mb-4 ${
          badgePalette[accentColor] || badgePalette.cyan
        }`}
      >
        <Sparkles size={13} />
        <span>{eyebrow}</span>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.3 }}
        transition={{ duration: 0.78, delay: 0.28, ease: EASE_EXECUTIVE }}
        className="text-2xl sm:text-4xl lg:text-[2.6rem] font-black text-white tracking-tight leading-[1.32]"
      >
        {title}
      </motion.h2>

      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 0.72, delay: 0.46, ease: EASE_EXECUTIVE }}
          className="text-sm sm:text-base lg:text-lg text-slate-300 mt-4 leading-relaxed"
        >
          {subtitle}
        </motion.p>
      )}

      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: false, amount: 0.3 }}
        transition={{ duration: 0.85, delay: 0.6, ease: EASE_EXECUTIVE }}
        className="h-[2px] w-24 mx-auto mt-6 bg-gradient-to-r from-transparent via-cyan-400 to-transparent origin-center"
      />
    </div>
  )
}

const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: (delayChildren = 0.55) => ({
    opacity: 1,
    transition: {
      delayChildren,
      staggerChildren: 0.22,
    },
  }),
}

const staggerCardVariants = {
  hidden: { opacity: 0, y: 44, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.78,
      ease: EASE_EXECUTIVE,
    },
  },
}

export default function Presentation() {
  const navigate = useNavigate()
  const [activeSectionId, setActiveSectionId] = useState('hero')
  const [showNotes, setShowNotes] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [motionEnabled, setMotionEnabled] = useState(true)
  const [replayKey, setReplayKey] = useState(0)
  const pageRef = useRef(null)

  // Smooth scroll progress bar at top of viewport
  const { scrollYProgress } = useScroll()
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    restDelta: 0.001,
  })

  const activeSection =
    LANDING_SECTIONS.find((sec) => sec.id === activeSectionId) || LANDING_SECTIONS[0]

  // Track which section is currently in view for navbar highlight & contextual speaker notes
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setActiveSectionId(entry.target.id)
          }
        })
      },
      {
        root: null,
        rootMargin: '-28% 0px -48% 0px',
        threshold: 0.05,
      }
    )

    LANDING_SECTIONS.forEach((sec) => {
      const el = document.getElementById(sec.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [replayKey])

  const scrollToSection = useCallback((sectionId) => {
    setActiveSectionId(sectionId)
    const target = document.getElementById(sectionId)
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement?.requestFullscreen?.().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.().catch(() => {})
      setIsFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Presenter keyboard shortcuts (N = Speaker Notes, F = Fullscreen, R = Replay Animations, Esc = Close Notes)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setShowNotes((prev) => !prev)
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        toggleFullscreen()
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        setReplayKey((prev) => prev + 1)
      } else if (e.key === 'Escape' && showNotes) {
        setShowNotes(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showNotes, toggleFullscreen])

  const handleLaunchLiveApp = () => {
    window.open('/', '_blank')
  }

  return (
    <MotionConfig reducedMotion={motionEnabled ? 'never' : 'always'}>
      <div
        ref={pageRef}
        className="min-h-screen w-full bg-[#050811] text-slate-100 relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200"
        style={{
          fontFamily:
            "'Noto Sans Thai', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        }}
      >
        {/* ── AMBIENT ARCHITECTURAL GRID & FLOATING GLOWS ──────────────── */}
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(56, 189, 248, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.06) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
        <motion.div
          aria-hidden="true"
          animate={{ x: [0, 36, -24, 0], y: [0, -28, 22, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="fixed -top-36 left-1/4 w-[520px] h-[520px] rounded-full bg-blue-600/15 blur-[130px] pointer-events-none z-0"
        />
        <motion.div
          aria-hidden="true"
          animate={{ x: [0, -40, 28, 0], y: [0, 32, -24, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
          className="fixed bottom-0 right-1/5 w-[480px] h-[480px] rounded-full bg-emerald-500/10 blur-[140px] pointer-events-none z-0"
        />

        {/* ── STICKY GLASSMORPHIC EXECUTIVE NAVBAR ─────────────────────── */}
        <header className="sticky top-0 left-0 right-0 z-50 bg-[#050811]/85 backdrop-blur-xl border-b border-slate-800/80">
          {/* Top Scroll-Linked Spring Progress Bar */}
          <div className="w-full h-1 bg-slate-900 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 origin-left"
              style={{ scaleX: smoothProgress }}
            />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            {/* Brand Lockup */}
            <button
              type="button"
              onClick={() => scrollToSection('hero')}
              className="flex items-center gap-3 text-left cursor-pointer"
            >
              <img
                src={gemmaLogo}
                alt="Gemma Knits"
                className="h-8 w-auto object-contain drop-shadow"
              />
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-black text-white tracking-wider leading-tight">
                  GEMMA KNITS · TEXTILEOPS
                </span>
                <span
                  className="text-[10px] text-cyan-400 font-bold tracking-widest"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  EXECUTIVE LANDING · {APP_VERSION}
                </span>
              </div>
            </button>

            {/* Section Anchor Navigation Pills */}
            <nav
              aria-label="หมวดหมู่นำเสนอโครงการ"
              className="hidden xl:flex items-center gap-1 p-1 rounded-2xl bg-slate-900/90 border border-slate-800"
            >
              {LANDING_SECTIONS.map((sec) => {
                const isActive = activeSectionId === sec.id
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    {sec.navLabel}
                  </button>
                )
              })}
            </nav>

            {/* Presenter Action Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setReplayKey((prev) => prev + 1)}
                title="เล่นอนิเมชั่นเปิดตัวซ้ำ (กดปุ่ม R)"
                className="p-2 rounded-xl text-xs font-bold bg-slate-900 text-slate-300 border border-slate-700/80 hover:text-cyan-300 hover:border-cyan-500/40 cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span className="hidden md:inline">เล่นซ้ำ</span>
              </button>

              <button
                type="button"
                onClick={() => setMotionEnabled((prev) => !prev)}
                aria-pressed={motionEnabled}
                title="เปิด/ปิดโหมดอนิเมชั่นหน่วงเวลา"
                className={`p-2 rounded-xl text-xs font-bold border cursor-pointer flex items-center gap-1.5 ${
                  motionEnabled
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-700/80'
                }`}
              >
                <Sparkles size={14} />
                <span className="hidden lg:inline">
                  {motionEnabled ? 'อนิเมชั่น: เปิด' : 'อนิเมชั่น: ปิด'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowNotes((prev) => !prev)}
                aria-pressed={showNotes}
                title="เปิด/ปิดสคริปต์ผู้บรรยาย (กดปุ่ม N)"
                className={`p-2 rounded-xl text-xs font-bold border cursor-pointer flex items-center gap-1.5 ${
                  showNotes
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 text-slate-300 border border-slate-700/80 hover:text-white'
                }`}
              >
                <FileText size={14} />
                <span className="hidden md:inline">บทพูด</span>
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'ออกจากโหมดเต็มจอ (F)' : 'ขยายเต็มหน้าจอ (F)'}
                className="p-2 rounded-xl text-xs font-bold bg-slate-900 text-slate-300 border border-slate-700/80 hover:text-white cursor-pointer"
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>

              <button
                type="button"
                onClick={handleLaunchLiveApp}
                title="เปิดทดลองใช้งานระบบจริง"
                className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 cursor-pointer hidden sm:flex items-center gap-1.5"
              >
                <ExternalLink size={13} />
                <span>เปิดระบบจริง</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                title="กลับสู่หน้าหลัก TextileOps"
                className="p-2 rounded-xl text-xs font-bold bg-slate-900 text-slate-300 border border-slate-700/80 hover:text-rose-400 hover:border-rose-500/40 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Mobile/Tablet Quick Section Strip */}
          <div className="xl:hidden flex items-center gap-1.5 px-4 pb-2.5 overflow-x-auto no-scrollbar">
            {LANDING_SECTIONS.map((sec) => {
              const isActive = activeSectionId === sec.id
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => scrollToSection(sec.id)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-900/90 text-slate-400 border border-slate-800'
                  }`}
                >
                  {sec.navLabel}
                </button>
              )
            })}
          </div>
        </header>

        {/* ── MAIN SCROLLYTELLING CONTENT (REPLAYABLE VIA KEY) ─────────── */}
        <main key={replayKey} className="relative z-10">
          {/* ==============================================================
              SECTION 1: EXECUTIVE HERO & SEQUENTIAL KPI STRIP
             ============================================================== */}
          <section
            id="hero"
            className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center px-4 sm:px-8 py-16 sm:py-24 relative scroll-mt-20"
          >
            <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
              {/* Step 1: 0.15s delay — Operational Excellence Pill */}
              <motion.div
                initial={{ opacity: 0, y: -22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.15, ease: EASE_EXECUTIVE }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/35 text-cyan-300 text-xs sm:text-sm font-bold uppercase tracking-wider mb-7 shadow-lg shadow-cyan-500/10"
              >
                <Sparkles size={14} className="text-cyan-400" />
                <span>Gemma Knits Operational Excellence · {APP_VERSION}</span>
              </motion.div>

              {/* Step 2: 0.40s delay — Gemma Knits Corporate Identity */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.4, ease: EASE_EXECUTIVE }}
                className="flex items-center justify-center gap-4 sm:gap-5 mb-8 px-6 py-3 rounded-2xl bg-slate-900/75 border border-slate-800/90 backdrop-blur-md"
              >
                <img
                  src={gemmaLogo}
                  alt="Gemma Knits Logo"
                  className="h-14 sm:h-16 w-auto object-contain drop-shadow-lg"
                />
                <div className="h-10 w-[2px] bg-slate-700" />
                <div
                  className="text-left"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <div className="text-xl sm:text-2xl font-extrabold text-white tracking-wider">
                    GEMMA KNITS
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-400 font-semibold tracking-widest">
                    CO., LTD. · EST. 1984
                  </div>
                </div>
              </motion.div>

              {/* Step 3: 0.70s delay — Monumental Display Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 38 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.7, ease: EASE_EXECUTIVE }}
                className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white mb-6 leading-[1.18]"
              >
                TEXTILE
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400">
                  OPS
                </span>{' '}
                CMMS
                <span className="block text-xl sm:text-3xl lg:text-4xl font-extrabold text-slate-200 mt-3 leading-[1.35]">
                  แพลตฟอร์มบริหารงานซ่อมบำรุงและเครื่องจักรโรงทออัจฉริยะ
                </span>
              </motion.h1>

              {/* Step 4: 1.05s delay — Executive Value Proposition */}
              <motion.p
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.78, delay: 1.05, ease: EASE_EXECUTIVE }}
                className="text-base sm:text-xl text-slate-300 max-w-3xl mb-10 leading-relaxed"
              >
                “เปลี่ยนความสูญเสียจากเครื่องจักรหยุดชะงัก (Unplanned Downtime)
                สู่ประสิทธิภาพการผลิตสูงสุด ด้วยข้อมูล Real-Time, การแจ้งเตือนผ่าน LINE
                และเทคโนโลยี Google Gemini AI”
              </motion.p>

              {/* Step 5: 1.35s delay — Dual Executive CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 1.35, ease: EASE_EXECUTIVE }}
                className="flex flex-wrap items-center justify-center gap-4 mb-14"
              >
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => scrollToSection('friction')}
                  className="px-7 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 text-white font-black text-sm sm:text-base shadow-xl shadow-cyan-500/20 flex items-center gap-2.5 cursor-pointer"
                >
                  <span>เริ่มเลื่อนชมแผนโครงการ</span>
                  <ArrowDown size={18} />
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleLaunchLiveApp}
                  className="px-7 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-100 font-bold text-sm sm:text-base flex items-center gap-2.5 cursor-pointer"
                >
                  <ExternalLink size={18} className="text-emerald-400" />
                  <span>เปิดทดลองระบบจริง (Live Demo)</span>
                </motion.button>
              </motion.div>

              {/* Step 6: 1.65s+ staggered delay — 4 Hero KPI Count-Up Cards */}
              <motion.div
                variants={staggerContainerVariants}
                custom={1.65}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl"
              >
                <motion.div
                  variants={staggerCardVariants}
                  whileHover={{ y: -5 }}
                  className="p-5 rounded-2xl bg-slate-900/85 border border-emerald-500/35 backdrop-blur-md shadow-xl relative overflow-hidden"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                  <div
                    className="text-3xl sm:text-4xl font-extrabold text-emerald-400 mb-1"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <AnimatedCounter
                      to={30}
                      prefix="-"
                      suffix="%"
                      delayMs={1750}
                      motionEnabled={motionEnabled}
                    />
                  </div>
                  <div className="text-xs sm:text-sm text-white font-bold">
                    ลดเวลาเครื่องจอดเสีย
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Unplanned Downtime</div>
                </motion.div>

                <motion.div
                  variants={staggerCardVariants}
                  whileHover={{ y: -5 }}
                  className="p-5 rounded-2xl bg-slate-900/85 border border-cyan-500/35 backdrop-blur-md shadow-xl relative overflow-hidden"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-500" />
                  <div
                    className="text-3xl sm:text-4xl font-extrabold text-cyan-400 mb-1"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    &lt;{' '}
                    <AnimatedCounter
                      to={1}
                      from={15}
                      suffix=" นาที"
                      delayMs={1970}
                      motionEnabled={motionEnabled}
                    />
                  </div>
                  <div className="text-xs sm:text-sm text-white font-bold">
                    เวลาตอบสนองงานซ่อม
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">LINE Real-Time Alert</div>
                </motion.div>

                <motion.div
                  variants={staggerCardVariants}
                  whileHover={{ y: -5 }}
                  className="p-5 rounded-2xl bg-slate-900/85 border border-purple-500/35 backdrop-blur-md shadow-xl relative overflow-hidden"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-400 to-fuchsia-500" />
                  <div
                    className="text-3xl sm:text-4xl font-extrabold text-purple-400 mb-1"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <AnimatedCounter
                      to={99.5}
                      decimals={1}
                      suffix="%"
                      delayMs={2190}
                      motionEnabled={motionEnabled}
                    />
                  </div>
                  <div className="text-xs sm:text-sm text-white font-bold">
                    ความแม่นยำสต็อกคลัง
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">เข็มทอและอะไหล่สำคัญ</div>
                </motion.div>

                <motion.div
                  variants={staggerCardVariants}
                  whileHover={{ y: -5 }}
                  className="p-5 rounded-2xl bg-slate-900/85 border border-amber-500/35 backdrop-blur-md shadow-xl relative overflow-hidden"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                  <div
                    className="text-3xl sm:text-4xl font-extrabold text-amber-400 mb-1"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <AnimatedCounter
                      to={100}
                      suffix="%"
                      delayMs={2410}
                      motionEnabled={motionEnabled}
                    />
                  </div>
                  <div className="text-xs sm:text-sm text-white font-bold">
                    ตรวจสอบย้อนหลังได้ครบ
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Audit & Traceability</div>
                </motion.div>
              </motion.div>

              {/* Gentle Pulsing Scroll Cue */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, 8, 0] }}
                transition={{
                  opacity: { delay: 2.8, duration: 0.8 },
                  y: { delay: 2.8, duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
                }}
                className="mt-12 text-xs text-slate-400 flex flex-col items-center gap-1"
              >
                <span>เลื่อนลงเพื่อดูรายละเอียดแต่ละหมวด</span>
                <ArrowDown size={15} className="text-cyan-400" />
              </motion.div>
            </div>
          </section>

          {/* ==============================================================
              SECTION 2: OPERATIONAL FRICTION VS UNIFIED PLATFORM
             ============================================================== */}
          <section
            id="friction"
            className="py-20 sm:py-28 px-4 sm:px-8 border-t border-slate-800/70 bg-slate-950/40 scroll-mt-20"
          >
            <div className="max-w-6xl mx-auto">
              <SectionHeader
                eyebrow="ปัญหาหน้างานเดิม & ทางออก (The Friction & The Solution)"
                title="ความท้าทายหน้างานเดิม สู่แพลตฟอร์มศูนย์กลางหนึ่งเดียว"
                subtitle="วิเคราะห์ 4 จุดสูญเสียแฝงในกระบวนการแบบเดิม และวิธีที่ TextileOps เข้ามาเชื่อมโยงทุกแผนกแบบไร้รอยต่อ"
                accentColor="rose"
              />

              {/* 4 Pain Point Cards — Staggered 0.22s */}
              <motion.div
                variants={staggerContainerVariants}
                custom={0.5}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, amount: 0.16 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
              >
                <motion.div
                  variants={staggerCardVariants}
                  className="p-6 rounded-3xl bg-gradient-to-br from-rose-950/35 to-slate-900/90 border border-rose-500/35 shadow-xl"
                >
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400">
                      <Clock size={26} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                        Pain Point #01
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        1. แจ้งซ่อมล่าช้า & ข้อมูลตกหล่น
                      </h3>
                    </div>
                  </div>
                  <ul className="text-sm text-slate-300 space-y-2 leading-relaxed">
                    <li>• เดินตามช่างด้วยวาจา หรือจดใส่เศษกระดาษ ช่างซ่อมไม่เห็นทันที</li>
                    <li>• เครื่องจักรหยุดรอช่างเฉลี่ย 10–15 นาทีก่อนเริ่มลงมือซ่อมจริง</li>
                    <li>• ไม่มีการจัดลำดับความเร่งด่วนของเครื่องที่กระทบแผนส่งมอบผ้า</li>
                  </ul>
                </motion.div>

                <motion.div
                  variants={staggerCardVariants}
                  className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/35 to-slate-900/90 border border-amber-500/35 shadow-xl"
                >
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
                      <Package size={26} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                        Pain Point #02
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        2. สต็อกเข็มและอะไหล่ไม่ตรงจริง
                      </h3>
                    </div>
                  </div>
                  <ul className="text-sm text-slate-300 space-y-2 leading-relaxed">
                    <li>• จดเบิกเข็มลงสมุด ไม่เชื่อมโยงกับมิเตอร์รอบเดินเครื่องจริง</li>
                    <li>• ช่างไม่รู้ชื่ออะไหล่ภาษาอังกฤษ เสียเวลาเดินหาในคลัง 15–20 นาที/ครั้ง</li>
                    <li>• อะไหล่สำคัญหมดกะทันหัน ทำให้เครื่องทอต้องจอดรอข้ามวัน</li>
                  </ul>
                </motion.div>

                <motion.div
                  variants={staggerCardVariants}
                  className="p-6 rounded-3xl bg-gradient-to-br from-blue-950/35 to-slate-900/90 border border-blue-500/35 shadow-xl"
                >
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
                      <Disc size={26} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                        Pain Point #03
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        3. ข้อมูลกระบอกเข็มสับสน
                      </h3>
                    </div>
                  </div>
                  <ul className="text-sm text-slate-300 space-y-2 leading-relaxed">
                    <li>• ป้ายกระดาษเขียนมือเลอะคราบน้ำมันและหลุดหายเมื่อเป่าลมทำความสะอาด</li>
                    <li>• สลับกระบอกสำรอง (Spare) แล้วไม่มีบันทึกประวัติย้อนหลัง</li>
                    <li>• เสี่ยงสูงต่อการใส่กระบอกผิดเส้นผ่าศูนย์กลาง ผิดเกจ หรือผิดจำนวนเข็ม</li>
                  </ul>
                </motion.div>

                <motion.div
                  variants={staggerCardVariants}
                  className="p-6 rounded-3xl bg-gradient-to-br from-purple-950/35 to-slate-900/90 border border-purple-500/35 shadow-xl"
                >
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400">
                      <TrendingDown size={26} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                        Pain Point #04
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        4. ไร้ศูนย์กลางข้อมูลผู้บริหาร
                      </h3>
                    </div>
                  </div>
                  <ul className="text-sm text-slate-300 space-y-2 leading-relaxed">
                    <li>• ต้องรอรวบรวมรายงานสรุปประจำสัปดาห์ ไม่ทันต่อการตัดสินใจรายวัน</li>
                    <li>• มองไม่เห็นค่าเฉลี่ยเวลาซ่อม (MTTR) และเครื่องจักรที่มีปัญหาซ้ำซาก</li>
                    <li>• ยากต่อการดึงหลักฐานย้อนหลังเพื่อรับรองมาตรฐานคุณภาพสากล (ISO)</li>
                  </ul>
                </motion.div>
              </motion.div>

              {/* Transformation Connector */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: false, amount: 0.4 }}
                transition={{ duration: 0.7, delay: 0.35, ease: EASE_EXECUTIVE }}
                className="flex flex-col items-center justify-center my-8"
              >
                <div className="px-5 py-2 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs sm:text-sm font-black tracking-wide flex items-center gap-2 shadow-lg shadow-emerald-500/10">
                  <Zap size={16} className="text-emerald-400" />
                  <span>ทางออก: TEXTILEOPS UNIFIED PLATFORM (Single Source of Truth)</span>
                </div>
              </motion.div>

              {/* Unified Solution Architecture Card */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ duration: 0.85, delay: 0.5, ease: EASE_EXECUTIVE }}
                className="p-7 sm:p-9 rounded-3xl bg-gradient-to-r from-blue-950/60 via-slate-900/95 to-emerald-950/50 border-2 border-cyan-500/40 shadow-2xl relative overflow-hidden"
              >
                <div className="text-center mb-8">
                  <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                    ทางออก: TextileOps Platform
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                    เชื่อมโยงทุกฝ่ายในโรงทอแบบ Real-Time ไร้รอยต่อ
                  </h3>
                </div>

                <motion.div
                  variants={staggerContainerVariants}
                  custom={0.65}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: false, amount: 0.2 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  <motion.div
                    variants={staggerCardVariants}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-center"
                  >
                    <div className="text-3xl mb-2">👷‍♂️</div>
                    <div className="text-sm font-black text-white">1. ช่างทอหน้างาน</div>
                    <div className="text-xs text-cyan-300 font-semibold mt-1">
                      สแกน QR แจ้งซ่อมใน 30 วินาที
                    </div>
                  </motion.div>

                  <motion.div
                    variants={staggerCardVariants}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-center"
                  >
                    <div className="text-3xl mb-2">🔧</div>
                    <div className="text-sm font-black text-white">2. ช่างซ่อมบำรุง</div>
                    <div className="text-xs text-emerald-300 font-semibold mt-1">
                      รับแจ้งเตือนผ่าน LINE ใน 1 วินาที
                    </div>
                  </motion.div>

                  <motion.div
                    variants={staggerCardVariants}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-center"
                  >
                    <div className="text-3xl mb-2">📦</div>
                    <div className="text-sm font-black text-white">3. ฝ่ายคลังพัสดุ</div>
                    <div className="text-xs text-purple-300 font-semibold mt-1">
                      ตัดสต็อกเข็ม & ค้นหาด้วย AI 5 วินาที
                    </div>
                  </motion.div>

                  <motion.div
                    variants={staggerCardVariants}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-center"
                  >
                    <div className="text-3xl mb-2">📊</div>
                    <div className="text-sm font-black text-white">4. คณะผู้บริหาร</div>
                    <div className="text-xs text-amber-300 font-semibold mt-1">
                      ติดตาม Dashboard สด 24 ชั่วโมง
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* ==============================================================
              SECTION 3: 4 CORE OPERATIONAL PILLARS (BENTO GRID)
             ============================================================== */}
          <section
            id="pillars"
            className="py-20 sm:py-28 px-4 sm:px-8 border-t border-slate-800/70 scroll-mt-20"
          >
            <div className="max-w-6xl mx-auto">
              <SectionHeader
                eyebrow="Core Operational Pillars · โมดูลหลักของระบบ"
                title="สี่เสาหลักการทำงานที่ออกแบบเพื่อโรงทอโดยเฉพาะ"
                subtitle="ทุกโมดูลทำงานสอดประสานบนฐานข้อมูลเดียวกัน 100% เพื่อปิดช่องโหว่ทั้งงานซ่อม เข็มทอ กระบอกเข็ม และคลังอะไหล่"
                accentColor="blue"
              />

              <motion.div
                variants={staggerContainerVariants}
                custom={0.55}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, amount: 0.16 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <motion.div
                  variants={staggerCardVariants}
                  whileHover={{ y: -6 }}
                  className="p-7 rounded-3xl bg-slate-900/85 border border-slate-700/90 hover:border-blue-500/60 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
                        <Wrench size={26} />
                      </div>
                      <span
                        className="text-xs font-bold text-blue-400"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        PILLAR 01 · WORK ORDERS & PM
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-white mb-3">
                      1. งานซ่อมด่วน & แผน PM เชิงป้องกัน
                    </h3>
                    <ul className="text-sm text-slate-300 space-y-2 leading-relaxed">
                      <li>• เปิดใบแจ้งซ่อมและรับงานทันใจ บันทึกเวลาเริ่มซ่อม–เสร็จซ่อมแม่นยำ</li>
                      <li>• ตารางบำรุงรักษาเชิงป้องกัน (PM Schedule) ตามรอบเดินเครื่องจักร</li>
                      <li>• สะสมประวัติอาการเสียรายเครื่องเพื่อวิเคราะห์หาสาเหตุรากเหง้า (RCA)</li>
                    </ul>
                  </div>
                </motion.div>

                <motion.div
                  variants={staggerCardVariants}
                  whileHover={{ y: -6 }}
                  className="p-7 rounded-3xl bg-slate-900/85 border border-slate-700/90 hover:border-emerald-500/60 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                        <Layers size={26} />
                      </div>
                      <span
                        className="text-xs font-bold text-emerald-400"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        PILLAR 02 · NEEDLE LEDGER
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-white mb-3">
                      2. คลังเข็มทอ & บัญชี Needle Ledger
                    </h3>
                    <ul className="text-sm text-slate-300 space-y-2 leading-relaxed">
                      <li>• บันทึกยอดเข็มรับเข้า–เบิกออกทุกเบอร์แบบบัญชีคู่ (Double-Entry)</li>
                      <li>• ผูกยอดเบิกเข็มกับส่วนต่างมิเตอร์รอบเครื่อง (Machine Counter Diff)</li>
                      <li>• ตรวจจับอัตราเข็มหักผิดปกติรายเครื่องและแจ้งเตือนสต็อกขั้นต่ำทันที</li>
                    </ul>
                  </div>
                </motion.div>

                <motion.div
                  variants={staggerCardVariants}
                  whileHover={{ y: -6 }}
                  className="p-7 rounded-3xl bg-slate-900/85 border border-slate-700/90 hover:border-purple-500/60 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400">
                        <Disc size={26} />
                      </div>
                      <span
                        className="text-xs font-bold text-purple-400"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        PILLAR 03 · CYLINDER TRACKING
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-white mb-3">
                      3. บริหารกระบอกเข็ม & ประวัติสลับเครื่อง
                    </h3>
                    <ul className="text-sm text-slate-300 space-y-2 leading-relaxed">
                      <li>• ติดตามสถานะกระบอกเข็มทั้งที่กำลังเดินงาน (In-Use) และสำรอง (Spare)</li>
                      <li>• คุมสเปกละเอียด: เส้นผ่าศูนย์กลาง, เกจ (Gauge), จำนวนเข็ม และซีเรียล</li>
                      <li>• พิมพ์ป้าย Tack ติดโครงเครื่องและป้ายกระบอกสำรองมาตรฐานคมชัดสูง</li>
                    </ul>
                  </div>
                </motion.div>

                <motion.div
                  variants={staggerCardVariants}
                  whileHover={{ y: -6 }}
                  className="p-7 rounded-3xl bg-slate-900/85 border border-slate-700/90 hover:border-amber-500/60 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
                        <Package size={26} />
                      </div>
                      <span
                        className="text-xs font-bold text-amber-400"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        PILLAR 04 · SMART SPARE PARTS
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-white mb-3">
                      4. คลังอะไหล่อัจฉริยะ & จุดสั่งซื้ออัตโนมัติ
                    </h3>
                    <ul className="text-sm text-slate-300 space-y-2 leading-relaxed">
                      <li>• ทะเบียนอะไหล่มากกว่า 1,000+ รายการ พร้อมระบุตู้ ชั้น และกล่องจัดเก็บ</li>
                      <li>• ระบบเตือนจุดสั่งซื้อ (Reorder Point Alert) ป้องกันอะไหล่ขาดสต็อก</li>
                      <li>• ค้นหาอะไหล่จากภาพถ่ายด้วย AI โดยไม่ต้องจำรหัส Part Number</li>
                    </ul>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* ==============================================================
              SECTION 4: 3 SIGNATURE INNOVATIONS (ANIMATED MOCKUPS)
             ============================================================== */}
          <section
            id="innovations"
            className="py-20 sm:py-28 px-4 sm:px-8 border-t border-slate-800/70 bg-slate-950/50 scroll-mt-20"
          >
            <div className="max-w-6xl mx-auto">
              <SectionHeader
                eyebrow="Signature Innovations · 3 นวัตกรรมเรือธง"
                title="เทคโนโลยีที่เปลี่ยนงานซับซ้อนหน้าโรงงานให้เสร็จในไม่กี่วินาที"
                subtitle="ออกแบบจากความต้องการจริงของทีมช่างและหัวหน้างาน เจมม่า นิตส์ เพื่อให้ใช้งานง่าย รวดเร็ว และแม่นยำ 100%"
                accentColor="purple"
              />

              <div className="space-y-14 sm:space-y-20">
                {/* ── INNOVATION #1: GEMINI AI VISION WITH LASER SCAN ────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-10 rounded-3xl bg-slate-900/80 border border-purple-500/30 shadow-2xl">
                  <motion.div
                    initial={{ opacity: 0, x: -36 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: false, amount: 0.25 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: EASE_EXECUTIVE }}
                    className="lg:col-span-6 space-y-5"
                  >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-400/35 text-purple-300 text-xs font-bold">
                      <Eye size={14} />
                      <span>นวัตกรรม #1 · Google Gemini Multimodal AI Vision</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-white leading-[1.3]">
                      ค้นหาอะไหล่ในคลังด้วยภาพถ่าย{' '}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 block mt-1">
                        ลดเวลาจาก 15 นาที เหลือเพียง 5 วินาที
                      </span>
                    </h3>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                      ช่างไม่จำเป็นต้องจำชื่อทางการค้าภาษาอังกฤษหรือเยอรมัน
                      เพียงใช้สมาร์ทโฟนถ่ายรูปชิ้นส่วนที่ชำรุด ระบบ AI จะสแกนรูปทรงเทียบกับฐานข้อมูลคลัง
                      พร้อมชี้เป้าตู้และกล่องจัดเก็บทันที
                    </p>
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                        <span className="text-base font-black text-white block">1. ถ่ายภาพ</span>
                        <span className="text-[11px] text-slate-400">จากมือถือหน้าเครื่อง</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-purple-500/30 text-center">
                        <span className="text-base font-black text-purple-400 block">
                          2. AI สแกน
                        </span>
                        <span className="text-[11px] text-slate-400">ประมวลผลใน 5 วิ</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/30 text-center">
                        <span className="text-base font-black text-emerald-400 block">
                          3. ชี้พิกัด
                        </span>
                        <span className="text-[11px] text-slate-400">ระบุชั้น & ยอดคงเหลือ</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Delayed Right Mockup (0.65s delay) with Live Laser Scan Bar */}
                  <motion.div
                    initial={{ opacity: 0, x: 36, scale: 0.96 }}
                    whileInView={{ opacity: 1, x: 0, scale: 1 }}
                    viewport={{ once: false, amount: 0.25 }}
                    transition={{ duration: 0.85, delay: 0.65, ease: EASE_EXECUTIVE }}
                    className="lg:col-span-6"
                  >
                    <div className="p-5 sm:p-6 rounded-3xl bg-[#070b17] border-2 border-purple-500/40 shadow-2xl relative overflow-hidden">
                      {/* Animated Laser Scanning Beam */}
                      <motion.div
                        aria-hidden="true"
                        animate={{ top: ['8%', '86%', '8%'] }}
                        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_16px_#c084fc] pointer-events-none z-20"
                      />

                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                        <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                          <Sparkles size={15} className="text-purple-400" />
                          <span>ผลการวิเคราะห์ภาพถ่าย AI Vision</span>
                        </span>
                        <span
                          className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          Match 98.4%
                        </span>
                      </div>

                      <div className="space-y-3.5">
                        <div className="p-4 rounded-2xl bg-slate-900/95 border border-slate-700/80">
                          <div className="text-[11px] text-slate-400 uppercase font-semibold">
                            ชิ้นส่วนที่ตรวจพบ (Detected Spare Part)
                          </div>
                          <div className="text-base sm:text-lg font-black text-white mt-0.5">
                            ตัวป้อนเส้นด้าย (Yarn Feeder Unit)
                          </div>
                          <div
                            className="text-xs text-purple-300 mt-1"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            Part No: YF-GMK-2026-X
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3.5 rounded-2xl bg-slate-900/95 border border-slate-700/80">
                            <div className="text-[11px] text-slate-400">พิกัดตู้จัดเก็บ</div>
                            <div className="text-sm font-black text-cyan-300 mt-0.5">
                              ชั้น B-04 · กล่อง 12
                            </div>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-slate-900/95 border border-slate-700/80">
                            <div className="text-[11px] text-slate-400">สต็อกพร้อมเบิก</div>
                            <div className="text-sm font-black text-emerald-400 mt-0.5">
                              12 ชิ้น (สถานะปกติ)
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/35 text-emerald-300 text-xs flex items-center gap-2.5">
                          <CheckCircle2 size={17} className="text-emerald-400 flex-shrink-0" />
                          <span>กดตัดเบิกอะไหล่เชื่อมเข้าใบงานซ่อมเครื่องจักรได้ทันที</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* ── INNOVATION #2: LINE FLEX REAL-TIME NOTIFICATION ────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-10 rounded-3xl bg-slate-900/80 border border-emerald-500/30 shadow-2xl">
                  {/* Smartphone Notification Pop-in (0.55s delay) */}
                  <motion.div
                    initial={{ opacity: 0, y: 42, scale: 0.94 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: false, amount: 0.25 }}
                    transition={{ duration: 0.85, delay: 0.55, ease: EASE_EXECUTIVE }}
                    className="lg:col-span-5 order-2 lg:order-1"
                  >
                    <div className="p-5 rounded-3xl bg-[#070b17] border-2 border-emerald-500/45 shadow-2xl">
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                          <Send size={14} />
                          <span>LINE Flex Notification</span>
                        </span>
                        <span
                          className="text-[11px] text-slate-400"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          LIVE · 10:14 AM
                        </span>
                      </div>

                      <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: false, amount: 0.3 }}
                        transition={{ duration: 0.7, delay: 0.85, ease: EASE_EXECUTIVE }}
                        className="p-5 rounded-2xl bg-white text-slate-900 shadow-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-[11px] font-black">
                            🚨 แจ้งซ่อมด่วน (URGENT)
                          </span>
                          <span
                            className="text-xs font-extrabold text-slate-700"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            MC-12
                          </span>
                        </div>
                        <div>
                          <div className="text-lg font-black text-slate-950">
                            เครื่องจักร: MC-12 (โซน A)
                          </div>
                          <div className="text-xs sm:text-sm text-slate-700 mt-1 font-medium">
                            อาการ: เข็มหัก / เส้นด้ายขาดซ้ำซ้อน
                          </div>
                        </div>
                        <div className="pt-2.5 border-t border-slate-200 text-xs text-slate-600 space-y-1">
                          <div>ผู้แจ้ง: สมชาย (ช่างทอ กะเช้า)</div>
                          <div>เวลาแจ้ง: 10:14 น. · อาคารโรงทอ 1</div>
                        </div>
                        <div className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-black text-center shadow-md">
                          ⚡ กดรับงานซ่อมนี้ทันที
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 36 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: false, amount: 0.25 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: EASE_EXECUTIVE }}
                    className="lg:col-span-7 space-y-5 order-1 lg:order-2"
                  >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-xs font-bold">
                      <Send size={14} />
                      <span>นวัตกรรม #2 · Real-Time LINE Flex Webhook</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-white leading-[1.3]">
                      เครื่องจักรไม่ต้องจอดรอช่าง{' '}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300 block mt-1">
                        ส่งการ์ดแจ้งเตือนตรงถึงมือถือช่างภายใน 1 วินาที
                      </span>
                    </h3>
                    <ul className="text-sm sm:text-base text-slate-300 space-y-3 leading-relaxed">
                      <li className="flex items-start gap-2.5">
                        <span className="text-emerald-400 font-black mt-0.5">✓</span>
                        <span>
                          <strong className="text-white">ไม่ต้องติดตั้งแอปใหม่:</strong>{' '}
                          ทำงานผ่านแอปพลิเคชัน LINE ที่ทีมช่างทุกคนคุ้นเคยในชีวิตประจำวัน
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-emerald-400 font-black mt-0.5">✓</span>
                        <span>
                          <strong className="text-white">ข้อมูลครบถ้วนชัดเจน:</strong>{' '}
                          เห็นหมายเลขเครื่อง อาการเสีย และระดับความเร่งด่วนทันทีโดยไม่ต้องโทรถามซ้ำ
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-emerald-400 font-black mt-0.5">✓</span>
                        <span>
                          <strong className="text-white">วัดผล SLA ได้จริง:</strong>{' '}
                          หัวหน้างานตรวจสอบได้ทันทีว่าใครกดรับงานและซ่อมเสร็จภายในกี่นาที
                        </span>
                      </li>
                    </ul>
                  </motion.div>
                </div>

                {/* ── INNOVATION #3: SMART TAG PRECISION PRINTING ────────── */}
                <div className="p-6 sm:p-10 rounded-3xl bg-slate-900/80 border border-cyan-500/30 shadow-2xl">
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false, amount: 0.25 }}
                    transition={{ duration: 0.75, delay: 0.15, ease: EASE_EXECUTIVE }}
                    className="text-center max-w-3xl mx-auto mb-10"
                  >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/35 text-cyan-300 text-xs font-bold mb-3">
                      <Printer size={14} />
                      <span>นวัตกรรม #3 · Smart Tag Precision Printing</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-white leading-[1.3]">
                      ระบบพิมพ์ป้ายติดโครงเครื่องจักร และป้ายกระบอกสำรองมาตรฐานโรงทอ
                    </h3>
                    <p className="text-sm sm:text-base text-slate-300 mt-2">
                      ปรับแต่งขนาดตัวอักษร ความกว้าง–ยาว และสัดส่วนการแสดงผลได้อย่างอิสระ
                      พร้อมดึงข้อมูลเฉพาะสถานะเครื่องที่ถูกต้องอัตโนมัติ
                    </p>
                  </motion.div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Tag 1: 20x7 cm Green In-Use Machine Tag (0.45s delay) */}
                    <motion.div
                      initial={{ opacity: 0, y: 38 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: false, amount: 0.25 }}
                      transition={{ duration: 0.8, delay: 0.45, ease: EASE_EXECUTIVE }}
                      className="p-6 rounded-2xl bg-[#070b17] border border-emerald-500/35 flex flex-col justify-between space-y-5"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-black text-emerald-400 flex items-center gap-2">
                            <Printer size={16} />
                            <span>ปุ่ม “พิมพ์ Tack” (เครื่องกำลังเดินงาน In-Use)</span>
                          </span>
                          <span
                            className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            20 × 7 cm
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300">
                          ป้ายติดโครงเครื่องจักร พื้นหลังสีเขียวอ่อน ตัวอักษรสีดำจัดเต็มพื้นที่อัตโนมัติ
                          มองเห็นหมายเลขเครื่องชัดเจนจากระยะไกล 5–10 เมตร
                        </p>
                      </div>

                      {/* Authentic 20x7cm Green Tag Preview */}
                      <div
                        className="w-full py-6 px-4 rounded-xl border-4 border-slate-950 bg-[#bbf7d0] text-black flex flex-col items-center justify-center shadow-inner"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        <span className="text-[11px] font-bold tracking-widest uppercase text-slate-800">
                          CURRENT MACHINE · เครื่องปัจจุบัน
                        </span>
                        <span className="text-5xl sm:text-6xl font-black tracking-tight leading-none text-black my-1">
                          MC-12
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 pt-3 border-t border-slate-800 flex flex-wrap justify-between gap-2">
                        <span>✓ กรองเฉพาะเครื่องสถานะ In-Use</span>
                        <span>✓ ปรับขนาด กว้าง–ยาว, สีพื้น และตัวอักษรได้</span>
                      </div>
                    </motion.div>

                    {/* Tag 2: A4 Landscape Spare Cylinder Tag (0.75s delay) */}
                    <motion.div
                      initial={{ opacity: 0, y: 38 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: false, amount: 0.25 }}
                      transition={{ duration: 0.8, delay: 0.75, ease: EASE_EXECUTIVE }}
                      className="p-6 rounded-2xl bg-[#070b17] border border-amber-500/35 flex flex-col justify-between space-y-5"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-black text-amber-400 flex items-center gap-2">
                            <Disc size={16} />
                            <span>ปุ่ม “พิมพ์ Tack Spare” (กระบอกสำรอง)</span>
                          </span>
                          <span
                            className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            A4 แนวนอน
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300">
                          เอกสารประจำกระบอกสำรอง แสดงครบ 7 ฟิลด์บังคับ เน้นหมายเลขเครื่องและซีเรียลขนาดใหญ่พิเศษ
                          ป้องกันการหยิบกระบอกผิดสเปก 100%
                        </p>
                      </div>

                      {/* Authentic A4 Landscape Tag Preview */}
                      <div className="w-full p-3.5 rounded-xl border-2 border-slate-950 bg-white text-slate-950 shadow-inner space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-extrabold border-b-2 border-slate-900 pb-1">
                          <span>CYLINDER SPECIFICATION TAG · เอกสารติดกระบอกเข็ม</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            วันที่: 28/10/2026
                          </span>
                        </div>
                        <div
                          className="grid grid-cols-2 gap-2 text-center"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          <div className="bg-slate-100 border border-slate-300 rounded-lg py-1.5 px-2">
                            <div className="text-[9px] text-slate-600 font-bold">
                              เครื่องปัจจุบัน (MACHINE)
                            </div>
                            <div className="text-lg font-black text-black leading-tight">
                              SPARE-04
                            </div>
                          </div>
                          <div className="bg-slate-100 border border-slate-300 rounded-lg py-1.5 px-2">
                            <div className="text-[9px] text-slate-600 font-bold">
                              ซีเรียลปัจจุบัน (SERIAL)
                            </div>
                            <div className="text-lg font-black text-black leading-tight">
                              CYL-3424-09
                            </div>
                          </div>
                        </div>
                        <div
                          className="grid grid-cols-3 gap-1.5 text-center"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          <div className="border border-slate-300 rounded py-1">
                            <div className="text-[8px] text-slate-500 font-bold">เส้นผ่าศูนย์กลาง</div>
                            <div className="text-xs font-black">34&quot;</div>
                          </div>
                          <div className="border border-slate-300 rounded py-1">
                            <div className="text-[8px] text-slate-500 font-bold">เกจ (GAUGE)</div>
                            <div className="text-xs font-black">24G</div>
                          </div>
                          <div className="border border-slate-300 rounded py-1">
                            <div className="text-[8px] text-slate-500 font-bold">จำนวนเข็ม</div>
                            <div className="text-xs font-black">2,520</div>
                          </div>
                        </div>
                        <div className="text-[9px] text-slate-600 font-medium truncate border-t border-slate-200 pt-1">
                          Remark: ตรวจเช็คความเที่ยงตรงศูนย์กระบอกเรียบร้อย พร้อมขึ้นเครื่องทอ
                        </div>
                      </div>

                      <div className="text-xs text-slate-400 pt-3 border-t border-slate-800 flex flex-wrap justify-between gap-2">
                        <span>✓ กรองเฉพาะกระบอกสถานะ Spare</span>
                        <span>✓ ปรับสัดส่วนแต่ละส่วน & ค้นหาด่วนได้</span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ==============================================================
              SECTION 5: 3-MINUTE LIVE INTERACTIVE DEMO LAUNCHPAD
             ============================================================== */}
          <section
            id="demo"
            className="py-20 sm:py-28 px-4 sm:px-8 border-t border-slate-800/70 scroll-mt-20"
          >
            <div className="max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 36, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: false, amount: 0.25 }}
                transition={{ duration: 0.85, delay: 0.15, ease: EASE_EXECUTIVE }}
                className="p-8 sm:p-14 rounded-3xl bg-gradient-to-br from-blue-950/70 via-slate-900 to-emerald-950/60 border-2 border-cyan-400/40 text-center shadow-2xl relative overflow-hidden"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: false, amount: 0.3 }}
                  transition={{ duration: 0.7, delay: 0.35, ease: EASE_EXECUTIVE }}
                  className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-emerald-500 flex items-center justify-center text-white shadow-2xl shadow-cyan-500/30 mx-auto mb-6"
                >
                  <Play size={36} className="ml-1" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, amount: 0.3 }}
                  transition={{ duration: 0.75, delay: 0.5, ease: EASE_EXECUTIVE }}
                  className="text-3xl sm:text-4xl font-black text-white mb-4"
                >
                  ช่วงสาธิตระบบจริง (3-Minute Live Demo)
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, amount: 0.3 }}
                  transition={{ duration: 0.75, delay: 0.65, ease: EASE_EXECUTIVE }}
                  className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed"
                >
                  สัมผัสความเร็วในการโหลดระดับเสี้ยววินาทีบนเซิร์ฟเวอร์ Production จริง
                  ทั้งมุมมองคอมพิวเตอร์ผู้บริหารและมุมมองสมาร์ทโฟนสำหรับช่างหน้างาน
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, amount: 0.3 }}
                  transition={{ duration: 0.75, delay: 0.8, ease: EASE_EXECUTIVE }}
                  className="mb-10"
                >
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleLaunchLiveApp}
                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 text-white font-black text-base shadow-xl shadow-cyan-500/25 inline-flex items-center gap-3 cursor-pointer"
                  >
                    <ExternalLink size={20} />
                    <span>เปิดระบบจริงเพื่อสาธิต (Launch Live App)</span>
                  </motion.button>
                </motion.div>

                <motion.div
                  variants={staggerContainerVariants}
                  custom={0.95}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: false, amount: 0.2 }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left border-t border-slate-800/90 pt-8"
                >
                  <motion.div
                    variants={staggerCardVariants}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800"
                  >
                    <div className="text-xs font-bold text-cyan-400 mb-1">STEP 01 · 1 นาที</div>
                    <div className="text-sm font-black text-white mb-1">
                      Executive Dashboard & Mobile
                    </div>
                    <p className="text-xs text-slate-400">
                      ดูภาพรวมสถานะเครื่องจักรทั้งโรงทอ และสลับโหมดจำลองหน้าจอมือถือ PWA
                    </p>
                  </motion.div>

                  <motion.div
                    variants={staggerCardVariants}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800"
                  >
                    <div className="text-xs font-bold text-emerald-400 mb-1">STEP 02 · 1 นาที</div>
                    <div className="text-sm font-black text-white mb-1">
                      Smart Tag 20×7 cm & A4 Spare
                    </div>
                    <p className="text-xs text-slate-400">
                      ค้นหาเครื่องจักร ปรับขนาดตามต้องการ และสั่งพิมพ์ป้ายคมชัดทันที
                    </p>
                  </motion.div>

                  <motion.div
                    variants={staggerCardVariants}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800"
                  >
                    <div className="text-xs font-bold text-purple-400 mb-1">STEP 03 · 1 นาที</div>
                    <div className="text-sm font-black text-white mb-1">
                      Gemini AI Vision คลังอะไหล่
                    </div>
                    <p className="text-xs text-slate-400">
                      ทดลองสแกนภาพอะไหล่เพื่อระบุรหัสพัสดุและตำแหน่งชั้นวางอัตโนมัติ
                    </p>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* ==============================================================
              SECTION 6: BUSINESS IMPACT, ROI COUNTERS & COMPARISON BARS
             ============================================================== */}
          <section
            id="roi"
            className="py-20 sm:py-28 px-4 sm:px-8 border-t border-slate-800/70 bg-slate-950/50 scroll-mt-20"
          >
            <div className="max-w-6xl mx-auto">
              <SectionHeader
                eyebrow="Business Impact & ROI · ผลลัพธ์เชิงธุรกิจและตัวชี้วัด"
                title="ผลตอบแทนความคุ้มค่าที่ชัดเจนและวัดผลได้เป็นรูปธรรม"
                subtitle="ยกระดับทั้งชั่วโมงการผลิต ความรวดเร็วของทีมช่าง และความโปร่งใสทางบัญชีคลังพัสดุ"
                accentColor="emerald"
              />

              {/* 4 Monumental ROI Cards */}
              <motion.div
                variants={staggerContainerVariants}
                custom={0.5}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, amount: 0.16 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12"
              >
                <motion.div
                  variants={staggerCardVariants}
                  className="p-7 rounded-3xl bg-gradient-to-br from-emerald-950/50 to-slate-900 border border-emerald-500/40 shadow-xl"
                >
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-2">
                    Downtime Reduction · ลดเครื่องจอดเสีย
                  </span>
                  <div
                    className="text-4xl sm:text-5xl font-black text-white mb-3"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    -25% ถึง -
                    <AnimatedCounter to={35} suffix="%" delayMs={600} motionEnabled={motionEnabled} />
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    คืนชั่วโมงเดินเครื่องจักรให้สายการผลิตได้หลายร้อยชั่วโมงต่อเดือน
                    ลดความเสี่ยงงานส่งมอบล่าช้า
                  </p>
                </motion.div>

                <motion.div
                  variants={staggerCardVariants}
                  className="p-7 rounded-3xl bg-gradient-to-br from-cyan-950/50 to-slate-900 border border-cyan-500/40 shadow-xl"
                >
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest block mb-2">
                    Response Time · เวลาช่างรับทราบปัญหา
                  </span>
                  <div
                    className="text-4xl sm:text-5xl font-black text-white mb-3"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    &lt;{' '}
                    <AnimatedCounter
                      to={1}
                      from={15}
                      suffix=" นาที"
                      delayMs={820}
                      motionEnabled={motionEnabled}
                    />
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    ลดเวลารอคอยจากเดิม 10–15 นาที ด้วยระบบแจ้งเตือน LINE Flex ตรงถึงช่างประจำกะทันที
                  </p>
                </motion.div>

                <motion.div
                  variants={staggerCardVariants}
                  className="p-7 rounded-3xl bg-gradient-to-br from-purple-950/50 to-slate-900 border border-purple-500/40 shadow-xl"
                >
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-widest block mb-2">
                    Inventory Accuracy · ความแม่นยำคลังพัสดุ
                  </span>
                  <div
                    className="text-4xl sm:text-5xl font-black text-white mb-3"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <AnimatedCounter
                      to={99.5}
                      decimals={1}
                      suffix="%"
                      delayMs={1040}
                      motionEnabled={motionEnabled}
                    />
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    ป้องกันเข็มทอสูญหายหรือเบิกซ้ำซ้อน ฝ่ายบัญชีและการเงินตรวจสอบมูลค่าคงคลังได้แม่นยำ
                  </p>
                </motion.div>

                <motion.div
                  variants={staggerCardVariants}
                  className="p-7 rounded-3xl bg-gradient-to-br from-amber-950/50 to-slate-900 border border-amber-500/40 shadow-xl"
                >
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-2">
                    Full Traceability · ตรวจสอบย้อนหลัง
                  </span>
                  <div
                    className="text-4xl sm:text-5xl font-black text-white mb-3"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <AnimatedCounter
                      to={100}
                      suffix="%"
                      delayMs={1260}
                      motionEnabled={motionEnabled}
                    />
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    สืบค้นประวัติการสลับกระบอกเข็มและการซ่อมบำรุงย้อนหลังได้ทุกชิ้นผ้า
                    รองรับการตรวจประเมินลูกค้าสากล
                  </p>
                </motion.div>
              </motion.div>

              {/* Animated Before vs After Progress Comparison */}
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ duration: 0.8, delay: 0.45, ease: EASE_EXECUTIVE }}
                className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6"
              >
                <h3 className="text-lg sm:text-xl font-black text-white">
                  เปรียบเทียบประสิทธิภาพการทำงาน (ก่อนใช้ระบบ vs หลังใช้ TextileOps)
                </h3>

                {[
                  {
                    label: 'ความเร็วในการแจ้งซ่อมถึงมือช่าง',
                    before: 'เดิม: เดินตามช่าง 10–15 นาที',
                    after: 'TextileOps: LINE Alert < 1 นาที (เร็วขึ้น 93%)',
                    pct: '93%',
                    barColor: 'from-cyan-500 to-emerald-400',
                  },
                  {
                    label: 'เวลาค้นหาอะไหล่และพิกัดชั้นวางในคลัง',
                    before: 'เดิม: เปิดสมุด/เดินหา 15–20 นาที',
                    after: 'TextileOps: Gemini AI Vision 5 วินาที (เร็วขึ้น 98%)',
                    pct: '98%',
                    barColor: 'from-purple-500 to-pink-400',
                  },
                  {
                    label: 'ความถูกต้องของป้ายสเปกกระบอกเข็มและเครื่องจักร',
                    before: 'เดิม: ป้ายกระดาษเขียนมือ เลอะ/หลุดง่าย',
                    after: 'TextileOps: Smart Tag 20×7 cm & A4 มาตรฐาน 100%',
                    pct: '100%',
                    barColor: 'from-emerald-500 to-teal-400',
                  },
                ].map((row, idx) => (
                  <div key={row.label} className="space-y-2">
                    <div className="flex flex-wrap justify-between gap-2 text-xs sm:text-sm">
                      <span className="font-bold text-white">{row.label}</span>
                      <span className="text-slate-400">{row.before}</span>
                    </div>
                    <div className="w-full h-3.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                      <motion.div
                        initial={{ width: '0%' }}
                        whileInView={{ width: row.pct }}
                        viewport={{ once: false, amount: 0.4 }}
                        transition={{
                          duration: 1.35,
                          delay: 0.65 + idx * 0.24,
                          ease: EASE_EXECUTIVE,
                        }}
                        className={`h-full rounded-full bg-gradient-to-r ${row.barColor}`}
                      />
                    </div>
                    <div className="text-xs font-bold text-emerald-300">{row.after}</div>
                  </div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* ==============================================================
              SECTION 7: ENTERPRISE ARCHITECTURE, 3-PHASE ROADMAP & Q&A
             ============================================================== */}
          <section
            id="roadmap"
            className="py-20 sm:py-28 px-4 sm:px-8 border-t border-slate-800/70 scroll-mt-20"
          >
            <div className="max-w-6xl mx-auto">
              <SectionHeader
                eyebrow="Enterprise Cloud & Strategic Roadmap"
                title="เสถียรภาพระดับสากล ความปลอดภัยสูง และแผนเติบโต 3 ระยะ"
                subtitle="โครงสร้างคลาวด์ต้นทุนต่ำที่พร้อมทำงานตลอด 24 ชั่วโมง แม้อินเทอร์เน็ตในโรงงานขัดข้องชั่วคราว"
                accentColor="amber"
              />

              {/* 3 Enterprise Architecture Cards */}
              <motion.div
                variants={staggerContainerVariants}
                custom={0.5}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, amount: 0.16 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
              >
                <motion.div
                  variants={staggerCardVariants}
                  className="p-6 rounded-3xl bg-slate-900/85 border border-slate-700/90 flex flex-col justify-between"
                >
                  <div>
                    <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 w-fit mb-4">
                      <Cpu size={24} />
                    </div>
                    <h3 className="text-lg font-black text-white mb-2">Cloudflare Global Edge</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      ประมวลผลบนเครือข่ายคลาวด์กว่า 300 เมืองทั่วโลก โหลดไวต่ำกว่า 1 วินาที
                      พร้อมระบบป้องกัน DDoS และ Web Application Firewall (WAF)
                    </p>
                  </div>
                  <div
                    className="text-xs text-blue-400 font-bold border-t border-slate-800 pt-3 mt-5"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Zero Monthly Server Overhead
                  </div>
                </motion.div>

                <motion.div
                  variants={staggerCardVariants}
                  className="p-6 rounded-3xl bg-slate-900/85 border border-slate-700/90 flex flex-col justify-between"
                >
                  <div>
                    <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 w-fit mb-4">
                      <ShieldCheck size={24} />
                    </div>
                    <h3 className="text-lg font-black text-white mb-2">
                      ความปลอดภัย & การแบ่งสิทธิ์ RBAC
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      เข้ารหัสข้อมูล HTTPS/SSL 256-bit พร้อมกำหนดสิทธิ์ชัดเจนระหว่าง Admin,
                      Supervisor, ช่างซ่อมบำรุง และ Viewer ป้องกันการแก้ไขข้อมูลโดยพลการ
                    </p>
                  </div>
                  <div
                    className="text-xs text-emerald-400 font-bold border-t border-slate-800 pt-3 mt-5"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Enterprise Grade Security
                  </div>
                </motion.div>

                <motion.div
                  variants={staggerCardVariants}
                  className="p-6 rounded-3xl bg-slate-900/85 border border-slate-700/90 flex flex-col justify-between"
                >
                  <div>
                    <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 w-fit mb-4">
                      <Layers size={24} />
                    </div>
                    <h3 className="text-lg font-black text-white mb-2">
                      Offline Resilience & PWA
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      ติดตั้งเป็นไอคอนแอปบนมือถือได้ทันที มีระบบสำรองข้อมูลในเครื่องเมื่อสัญญาณเน็ตอับ
                      และซิงค์ขึ้นคลาวด์อัตโนมัติเมื่อเชื่อมต่ออีกครั้ง
                    </p>
                  </div>
                  <div
                    className="text-xs text-purple-400 font-bold border-t border-slate-800 pt-3 mt-5"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    100% Factory-Floor Resilient
                  </div>
                </motion.div>
              </motion.div>

              {/* 3-Phase Strategic Roadmap Timeline */}
              <div className="relative mb-16">
                {/* Animated Connecting Progress Line on Desktop */}
                <motion.div
                  aria-hidden="true"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: false, amount: 0.3 }}
                  transition={{ duration: 1.4, delay: 0.45, ease: EASE_EXECUTIVE }}
                  className="hidden md:block absolute top-10 left-12 right-12 h-[3px] bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-500 origin-left z-0 opacity-50"
                />

                <motion.div
                  variants={staggerContainerVariants}
                  custom={0.6}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: false, amount: 0.16 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10"
                >
                  <motion.div
                    variants={staggerCardVariants}
                    className="p-6 rounded-3xl bg-emerald-950/40 border-2 border-emerald-500/50 shadow-xl"
                  >
                    <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider mb-3">
                      Phase 1 · ปัจจุบัน (Q4 2026) — พร้อม 100%
                    </span>
                    <h4 className="text-lg font-black text-white mb-2">Full System Rollout</h4>
                    <ul className="text-sm text-slate-300 space-y-1.5">
                      <li>• ใช้งานจริงครบทุกเครื่องในโรงทอ</li>
                      <li>• อบรมทีมช่าง คลัง และหัวหน้ากะ</li>
                      <li>• ติดป้าย Smart Tag 20×7 cm & A4 ครบชุด</li>
                    </ul>
                  </motion.div>

                  <motion.div
                    variants={staggerCardVariants}
                    className="p-6 rounded-3xl bg-slate-900/95 border border-cyan-500/35 shadow-xl"
                  >
                    <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 text-xs font-black uppercase tracking-wider mb-3">
                      Phase 2 · ต่อยอด (Q1–Q2 2027)
                    </span>
                    <h4 className="text-lg font-black text-white mb-2">IoT & ERP Integration</h4>
                    <ul className="text-sm text-slate-300 space-y-1.5">
                      <li>• เชื่อมเซ็นเซอร์นับมิเตอร์รอบเครื่องอัตโนมัติ</li>
                      <li>• เชื่อมต่อ API ตัดสต็อกเข้ากับระบบบัญชี ERP</li>
                      <li>• ขยายผลสู่แผนกที่เกี่ยวข้องในโรงงาน</li>
                    </ul>
                  </motion.div>

                  <motion.div
                    variants={staggerCardVariants}
                    className="p-6 rounded-3xl bg-slate-900/95 border border-purple-500/35 shadow-xl"
                  >
                    <span className="inline-block px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 text-xs font-black uppercase tracking-wider mb-3">
                      Phase 3 · สู่อนาคต (Q3–Q4 2027)
                    </span>
                    <h4 className="text-lg font-black text-white mb-2">
                      Predictive AI Maintenance
                    </h4>
                    <ul className="text-sm text-slate-300 space-y-1.5">
                      <li>• AI พยากรณ์ความเสี่ยงเครื่องเสียล่วงหน้า</li>
                      <li>• วิเคราะห์ค่า OEE ประสิทธิภาพโรงงานอัตโนมัติ</li>
                      <li>• มุ่งสู่เป้าหมาย Zero Unplanned Downtime</li>
                    </ul>
                  </motion.div>
                </motion.div>
              </div>

              {/* Boardroom Closing Approval & Q&A Banner */}
              <motion.div
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.25 }}
                transition={{ duration: 0.85, delay: 0.4, ease: EASE_EXECUTIVE }}
                className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950/60 to-slate-900 border border-slate-700 text-center shadow-2xl"
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/35 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
                  <span>TEXTILEOPS CMMS IS PRODUCTION READY</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">
                  ขอรับความเห็นชอบและการสนับสนุนจากคณะผู้บริหาร
                </h3>
                <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
                  เพื่อประกาศนโยบายใช้งานระบบอย่างเป็นทางการ
                  และดำเนินการถ่ายทอดการใช้งานแก่หัวหน้างานและพนักงานทุกกะ
                </p>

                <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-emerald-300 tracking-widest mb-2">
                  Q &amp; A
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mb-8">
                  ขอขอบพระคุณคณะผู้บริหาร บริษัท เจมม่า นิตส์ จำกัด ทุกท่านครับ
                </p>

                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => scrollToSection('hero')}
                    className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowUp size={16} />
                    <span>เลื่อนกลับขึ้นบนสุด</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black inline-flex items-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer"
                  >
                    <span>เข้าสู่ระบบหลัก TextileOps</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        {/* ── CONTEXTUAL FLOATING SPEAKER NOTES DRAWER ─────────────────── */}
        <AnimatePresence>
          {showNotes && (
            <motion.aside
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ duration: 0.35, ease: EASE_EXECUTIVE }}
              aria-label="สคริปต์ผู้บรรยาย"
              className="fixed bottom-4 left-4 right-4 z-50 max-w-4xl mx-auto p-5 rounded-2xl bg-slate-900/95 border-2 border-amber-500/45 backdrop-blur-xl shadow-2xl"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-black text-amber-400 flex items-center gap-2 uppercase tracking-wider">
                  <FileText size={14} />
                  <span>
                    สคริปต์ผู้บรรยาย (Speaker Notes) · หมวดปัจจุบัน: {activeSection.navLabel}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowNotes(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  ✕ ปิดหน้าต่างสคริปต์
                </button>
              </div>
              <p className="text-sm text-slate-100 leading-relaxed">
                “{activeSection.speakerNotes}”
              </p>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
