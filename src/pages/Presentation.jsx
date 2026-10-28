import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
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
  AlertTriangle,
  Clock,
  TrendingDown,
  ShieldCheck,
  Send,
  Printer,
  Package,
  Disc,
  ArrowRight,
  HelpCircle,
} from 'lucide-react'
import gemmaLogo from '../assets/logo-gemma.png'
import { APP_VERSION } from '../version'

export const SLIDES_DATA = [
  {
    id: 1,
    title: 'TextileOps CMMS: ขับเคลื่อนโรงทอสู่อนาคต Smart Factory',
    subtitle: 'แพลตฟอร์มบริหารจัดการงานซ่อมบำรุงและเครื่องจักรอัจฉริยะ',
    category: 'ภาพรวมโครงการ (Project Vision)',
    speakerNotes:
      'กราบเรียนท่านผู้บริหารทุกท่าน วันนี้ทีมงานมีความยินดีอย่างยิ่งที่จะนำเสนอ TextileOps CMMS แพลตฟอร์มบริหารจัดการเครื่องจักรและงานซ่อมบำรุงที่พัฒนาขึ้นเพื่อแก้ปัญหาหน้างานจริงของโรงทอ เจมม่า นิตส์ โดยเฉพาะ ในธุรกิจสิ่งทอ หัวใจของผลกำไรคือเครื่องจักรต้องเดินได้อย่างต่อเนื่องและผลิตผ้าได้คุณภาพสูงสุด ทุกนาทีที่เครื่องจักรหยุดซ่อม หรือสต็อกอะไหล่ไม่พร้อม คือต้นทุนมหาศาล วันนี้ TextileOps พร้อมแล้วที่จะเข้ามาเปลี่ยนการทำงานแบบเดิม สู่ระบบดิจิทัลที่แม่นยำ ตรวจสอบได้ และลด Downtime ได้อย่างเป็นรูปธรรมครับ',
    renderContent: () => (
      <div className="flex flex-col items-center justify-center text-center h-full max-w-4xl mx-auto px-4 py-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6 animate-pulse">
          <Sparkles size={14} /> Gemma Knits Operational Excellence · {APP_VERSION}
        </div>

        <div className="flex items-center justify-center gap-4 mb-6">
          <img src={gemmaLogo} alt="Gemma Knits Logo" className="h-16 w-auto object-contain drop-shadow-md" />
          <div className="h-10 w-[2px] bg-slate-700" />
          <div className="text-left font-mono">
            <div className="text-2xl font-black text-white tracking-wider">GEMMA KNITS</div>
            <div className="text-xs text-slate-400 font-semibold tracking-widest">CO., LTD. · EST. 1984</div>
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6 leading-tight">
          TEXTILE<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400">OPS</span> CMMS
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mb-10 leading-relaxed font-light">
          "เปลี่ยนความสูญเสียจากเครื่องจักรหยุดชะงัก (Downtime) สู่ประสิทธิภาพการผลิตสูงสุดด้วยข้อมูลแบบ Real-Time และเทคโนโลยี AI อัจฉริยะ"
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl">
          <div className="p-3.5 rounded-2xl bg-slate-850/80 border border-slate-750 backdrop-blur-md">
            <div className="text-2xl font-black text-emerald-400">-30%</div>
            <div className="text-[11px] text-slate-400 font-medium">Unplanned Downtime</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-850/80 border border-slate-750 backdrop-blur-md">
            <div className="text-2xl font-black text-cyan-400">&lt; 1 นาที</div>
            <div className="text-[11px] text-slate-400 font-medium">เวลาตอบสนองช่าง</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-850/80 border border-slate-750 backdrop-blur-md">
            <div className="text-2xl font-black text-purple-400">99.5%</div>
            <div className="text-[11px] text-slate-400 font-medium">ความแม่นยำสต็อก</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-850/80 border border-slate-750 backdrop-blur-md">
            <div className="text-2xl font-black text-amber-400">100%</div>
            <div className="text-[11px] text-slate-400 font-medium">Traceability ย้อนหลัง</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: 'ความท้าทายหน้างานเดิม (The Operational Friction)',
    subtitle: '4 ปัญหาหลักที่สร้างความสูญเสียแฝงและโอกาสปรับปรุงในโรงทอ',
    category: 'ปัญหาหน้างาน (The Pain Points)',
    speakerNotes:
      'จากที่เราได้ลงพื้นที่ศึกษาขั้นตอนการทำงานจริงของโรงทอ พบปัญหาหลัก 4 ประการที่สร้างความสูญเสียแฝงอยู่ทุกวันครับ: 1. เมื่อเครื่องจักรมีปัญหา ช่างทอต้องเดินไปตามช่างซ่อม หรือจดใส่กระดาษ ทำให้เครื่องหยุดรอนาน 2. ในคลังอะไหล่ มีชิ้นส่วนหลายพันรายการ ช่างใหม่มักไม่รู้ชื่ออะไหล่ เสียเวลาค้นหาเฉลี่ย 15-20 นาทีต่อครั้ง และบางครั้งของหมดไม่รู้ตัว 3. กระบอกเข็มมีมูลค่าสูงและมีสเปกเฉพาะ เดิมใช้กระดาษเขียนแปะ เมื่อโดนน้ำมันหรือเป่าลมฝุ่น กระดาษก็หลุดหาย สลับเครื่องแล้วตามประวัติไม่ได้ 4. ผู้บริหารไม่สามารถเห็นภาพรวมได้ทันทีว่าวันนี้มีเครื่องเสียกี่ตัว อะไหล่ตัวไหนเสียบ่อยที่สุด TextileOps ถูกออกแบบมาเพื่อปิดช่องว่างเหล่านี้ทั้งหมดครับ',
    renderContent: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 h-full max-w-5xl mx-auto items-center p-4">
        <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex flex-col justify-between h-full max-h-[220px]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">1. แจ้งซ่อมล่าช้า & ข้อมูลตกหล่น</h3>
              <p className="text-xs text-rose-300/80">เครื่องหยุดรอช่างนานเกินจำเป็น</p>
            </div>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li>เดินไปบอกด้วยวาจา หรือเขียนเศษกระดาษ ช่างไม่เห็นทันที</li>
            <li>เครื่องหยุดรอช่างเฉลี่ย 10–15 นาทีก่อนเริ่มซ่อม</li>
            <li>ไม่มีการจัดลำดับความเร่งด่วนของใบแจ้งซ่อม</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex flex-col justify-between h-full max-h-[220px]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Package size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">2. สต็อกเข็มและอะไหล่ไม่ตรงจริง</h3>
              <p className="text-xs text-amber-300/80">เข็มสูญหาย เบิกซ้ำซ้อน ค้นหาอะไหล่ช้า</p>
            </div>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li>บันทึกใส่สมุด ไม่สัมพันธ์กับรอบเครื่องจักรจริง</li>
            <li>ช่างไม่รู้ชื่ออะไหล่ เสียเวลาค้นหาในคลัง 15–20 นาที/ครั้ง</li>
            <li>อะไหล่หมดกะทันหัน ทำให้เครื่องจักรหยุดซ่อมข้ามวัน</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-blue-950/20 border border-blue-500/30 flex flex-col justify-between h-full max-h-[220px]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
              <Disc size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">3. ข้อมูลกระบอกเข็มสับสน</h3>
              <p className="text-xs text-blue-300/80">เสี่ยงต่อการใส่กระบอกผิดสเปกและผ้าเสีย</p>
            </div>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li>ใช้กระดาษเขียนแปะติดเครื่อง เลอะน้ำมันและหลุดหายง่าย</li>
            <li>สลับกระบอกสำรองแล้วไม่บันทึกประวัติย้อนหลัง</li>
            <li>ความเสี่ยงสูงที่เส้นผ่าศูนย์กลาง, เกจ หรือจำนวนเข็มไม่ตรงสเปก</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex flex-col justify-between h-full max-h-[220px]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
              <TrendingDown size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">4. ไร้ศูนย์กลางข้อมูลผู้บริหาร</h3>
              <p className="text-xs text-purple-300/80">ตัดสินใจช้าเพราะขาดข้อมูล Real-Time</p>
            </div>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li>ต้องรอรวบรวมรายงานสรุปประจำสัปดาห์ ไม่ทันต่อเหตุการณ์</li>
            <li>ไม่เห็นสถิติ MTTR และสาเหตุที่เครื่องจักรเสียซ้ำซาก</li>
            <li>ยากต่อการนำข้อมูลไปผ่านการรับรองมาตรฐานสากล (ISO)</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: 'ทางออก: TextileOps Platform (The Solution)',
    subtitle: 'แพลตฟอร์มศูนย์กลางหนึ่งเดียว เชื่อมโยงทุกฝ่ายแบบ Real-Time ไร้รอยต่อ',
    category: 'ภาพรวมระบบ (Solution Architecture)',
    speakerNotes:
      'TextileOps เข้ามาทำหน้าที่เป็น Single Source of Truth หรือศูนย์กลางข้อมูลเพียงหนึ่งเดียวของโรงทอครับ เมื่อช่างทอพบเครื่องเสีย เขาสามารถหยิบมือถือสแกนคิวอาร์โค้ดหน้าเครื่องเพื่อแจ้งซ่อมได้ใน 30 วินาที ระบบจะส่งสัญญาณเตือนเข้า LINE ของช่างซ่อมทันที ขณะที่ฝ่ายคลังสามารถตรวจสอบการตัดยอดสต็อกเข็มและอะไหล่ได้อัตโนมัติ และที่สำคัญที่สุด คณะผู้บริหารสามารถเปิดดูแดชบอร์ดสรุปผลการทำงานได้แบบ Real-Time จากทุกที่ทั่วโลกครับ',
    renderContent: () => (
      <div className="flex flex-col items-center justify-center h-full max-w-5xl mx-auto p-4">
        <div className="grid grid-cols-4 gap-3 w-full mb-6">
          <div className="p-3 text-center rounded-xl bg-slate-800/80 border border-slate-700">
            <span className="text-2xl mb-1 block">👷‍♂️</span>
            <span className="text-xs font-bold text-white block">ช่างทอหน้างาน</span>
            <span className="text-[10px] text-slate-400">แจ้งซ่อมด้วย QR ใน 30 วิ</span>
          </div>
          <div className="p-3 text-center rounded-xl bg-slate-800/80 border border-slate-700">
            <span className="text-2xl mb-1 block">🔧</span>
            <span className="text-xs font-bold text-white block">ช่างซ่อมบำรุง</span>
            <span className="text-[10px] text-slate-400">รับงานผ่าน LINE Alert</span>
          </div>
          <div className="p-3 text-center rounded-xl bg-slate-800/80 border border-slate-700">
            <span className="text-2xl mb-1 block">📦</span>
            <span className="text-xs font-bold text-white block">ฝ่ายคลังพัสดุ</span>
            <span className="text-[10px] text-slate-400">ตัดสต็อกเข็ม & ค้นหาด้วย AI</span>
          </div>
          <div className="p-3 text-center rounded-xl bg-slate-800/80 border border-slate-700">
            <span className="text-2xl mb-1 block">📊</span>
            <span className="text-xs font-bold text-white block">คณะผู้บริหาร</span>
            <span className="text-[10px] text-slate-400">Dashboard Real-Time 24 ชม.</span>
          </div>
        </div>

        {/* Central Core */}
        <div className="w-full p-6 rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-emerald-900/40 border-2 border-blue-500/40 backdrop-blur-xl relative overflow-hidden shadow-2xl">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="text-center mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">The Core Engine</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">TEXTILEOPS UNIFIED PLATFORM</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
              <div className="text-sm font-bold text-blue-400 mb-1">⚡ Cloudflare Global Edge</div>
              <p className="text-xs text-slate-300">โหลดไวต่ำกว่า 1 วินาที รองรับช่างทำงานพร้อมกันทั่วโรงงาน</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
              <div className="text-sm font-bold text-emerald-400 mb-1">🔄 Supabase Real-Time Sync</div>
              <p className="text-xs text-slate-300">ซิงค์สถานะเครื่องจักรและใบแจ้งซ่อมสด ไม่ต้องกดรีเฟรชหน้าจอ</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
              <div className="text-sm font-bold text-purple-400 mb-1">📱 Progressive Web App</div>
              <p className="text-xs text-slate-300">ใช้งานบนมือถือหน้างานได้ทันที มีแคชทำงานได้แม้อินเทอร์เน็ตสะดุด</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    title: 'สี่เสาหลักการทำงาน (Core Operational Pillars)',
    subtitle: 'ระบบที่ครอบคลุมวงจรการบำรุงรักษาโรงทออย่างสมบูรณ์แบบ',
    category: 'โมดูลการทำงาน (Core Modules)',
    speakerNotes:
      'สถาปัตยกรรมของ TextileOps แบ่งออกเป็น 4 เสาหลักที่เชื่อมโยงกันอย่างสมบูรณ์ครับ: เสาที่ 1 คือระบบแจ้งซ่อมและ PM ช่วยจัดคิวช่างและลดเวลาตอบสนอง เสาที่ 2 คือระบบคลังเข็ม เรามี Needle Ledger บันทึกการเบิกเข็มสัมพันธ์กับยอดมิเตอร์รอบเครื่อง ทำให้ตรวจสอบได้ว่าผ้ากี่พับใช้เข็มไปเท่าไหร่ มีเข็มหักผิดปกติหรือไม่ เสาที่ 3 คือการบริหารกระบอกเข็ม ซึ่งเป็นหัวใจของคุณภาพผ้า เรารู้ว่ากระบอกไหนใส่เครื่องไหน และกระบอกไหนพร้อมเป็นอะไหล่สำรอง และเสาที่ 4 คลังอะไหล่ พร้อมระบบเตือนจุดสั่งซื้อ ป้องกันเหตุการณ์เครื่องหยุดเพราะรออะไหล่ชิ้นเล็กๆ เพียงชิ้นเดียวครับ',
    renderContent: () => (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full max-w-5xl mx-auto p-4 items-center">
        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-700/80 flex flex-col justify-between h-[210px] hover:border-blue-500/50 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400"><Wrench size={20} /></div>
            <h3 className="text-base font-bold text-white">1. งานซ่อม & งาน PM ป้องกัน</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            • แจ้งซ่อมและรับงานทันใจ บันทึกเวลาเริ่มซ่อม-เสร็จซ่อม<br />
            • แผนบำรุงรักษาเชิงป้องกัน (PM Schedule) รอบเครื่องจักร<br />
            • เก็บประวัติอาการเสียย้อนหลังเพื่อวิเคราะห์หาสาเหตุรากเหง้า
          </p>
          <div className="text-[11px] font-mono text-blue-400 font-bold">Work Orders & Preventive Maintenance</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-700/80 flex flex-col justify-between h-[210px] hover:border-emerald-500/50 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400"><Layers size={20} /></div>
            <h3 className="text-base font-bold text-white">2. คลังเข็ม & Needle Ledger</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            • บันทึกยอดเข็มเข้า-ออกทุกเบอร์แบบ Double-entry<br />
            • บันทึกส่วนต่างมิเตอร์รอบเครื่องจักร (Machine Counter Diff)<br />
            • แจ้งเตือนเมื่อสต็อกเข็มต่ำกว่าเกณฑ์ความปลอดภัยโรงทอ
          </p>
          <div className="text-[11px] font-mono text-emerald-400 font-bold">Needle Ledger & Counter Tracking</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-700/80 flex flex-col justify-between h-[210px] hover:border-purple-500/50 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400"><Disc size={20} /></div>
            <h3 className="text-base font-bold text-white">3. บริหารกระบอกเข็ม (Cylinders)</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            • บันทึกประวัติสลับกระบอกเข็มระหว่างเครื่องและคลัง Spare<br />
            • คุมสเปกละเอียด: เส้นผ่าศูนย์กลาง, เกจ, จำนวนเข็ม<br />
            • พิมพ์ป้าย Tack ติดเครื่องและกระบอกมาตรฐานแม่นยำ
          </p>
          <div className="text-[11px] font-mono text-purple-400 font-bold">Cylinder Tracking & Swap History</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-700/80 flex flex-col justify-between h-[210px] hover:border-amber-500/50 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400"><Package size={20} /></div>
            <h3 className="text-base font-bold text-white">4. คลังอะไหล่ & จุดสั่งซื้อ (Spare Parts)</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            • ทะเบียนอะไหล่กว่า 1,000+ รายการ พร้อมพิกัดตู้และชั้นวาง<br />
            • จุดสั่งซื้ออัตโนมัติ (Reorder Point Alert) ป้องกันของขาด<br />
            • ค้นหาด้วยภาพถ่าย AI ไม่ต้องจำ Part Number ภาษาอังกฤษ
          </p>
          <div className="text-[11px] font-mono text-amber-400 font-bold">Smart Inventory & AI Reorder Point</div>
        </div>
      </div>
    ),
  },
  {
    id: 5,
    title: 'นวัตกรรม #1: Google Gemini AI Vision คลังอะไหล่',
    subtitle: 'ตรวจจำแนกชิ้นส่วนและค้นหาอะไหล่ในคลังด้วยภาพถ่ายภายใน 5 วินาที',
    category: 'ไฮไลต์นวัตกรรม (AI Innovation)',
    speakerNotes:
      'หนึ่งในความภาคภูมิใจทางเทคโนโลยีของโปรเจกต์นี้ คือการนำ Google Gemini AI Vision เข้ามาช่วยงานคลังอะไหล่ครับ ในโรงทอ อะไหล่หลายชิ้นมีลักษณะคล้ายกันมาก และชื่อทางการค้าเป็นภาษาอังกฤษหรือภาษาเยอรมัน ช่างหน้างานมักเรียกตามชื่อเฉพาะตัว ทำให้ค้นหาในระบบไม่เจอ แต่ใน TextileOps ช่างเพียงหยิบมือถือถ่ายรูปชิ้นส่วนที่เสีย AI จะสแกนลักษณะรูปทรง เทียบกับฐานข้อมูลคลัง และบอกรหัสพัสดุ พร้อมชี้เป้าว่าอยู่ในตู้ไหน ชั้นไหน ทันทีใน 5 วินาที ลดเวลาเดินหาอะไหล่ได้มากกว่า 70% ครับ',
    renderContent: () => (
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 h-full max-w-5xl mx-auto p-4">
        {/* Left: Diagram & Process */}
        <div className="flex-1 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold">
            <Sparkles size={13} /> Google Gemini 1.5 Pro Multimodal Vision
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white leading-snug">
            ค้นหาอะไหล่ด้วยภาพถ่าย <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              ลดเวลาจาก 15 นาที เหลือเพียง 5 วินาที
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            แก้ปัญหาคลาสสิกของโรงงาน ช่างไม่ทราบ Part Number หรือชื่อภาษาอังกฤษ เพียงถ่ายรูปชิ้นส่วนที่ชำรุด AI จะวิเคราะห์ลักษณะทางกายภาพ เทียบกับทะเบียนพัสดุ และชี้พิกัดกล่องจัดเก็บทันที
          </p>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-center">
              <span className="text-lg font-black text-white block">1. ถ่ายภาพ</span>
              <span className="text-[10px] text-slate-400">ผ่านกล้องมือถือ</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-center">
              <span className="text-lg font-black text-purple-400 block">2. AI วิเคราะห์</span>
              <span className="text-[10px] text-slate-400">เทียบเคียง 5 วินาที</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-center">
              <span className="text-lg font-black text-emerald-400 block">3. ชี้พิกัด</span>
              <span className="text-[10px] text-slate-400">ตู้ / ชั้น / ล็อกเกอร์</span>
            </div>
          </div>
        </div>

        {/* Right: Simulated AI UI Box */}
        <div className="w-full lg:w-[380px] p-4 rounded-2xl bg-slate-900 border-2 border-purple-500/30 shadow-2xl relative">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles size={14} className="text-purple-400" /> ผลการวิเคราะห์จากภาพถ่าย
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
              Match 98%
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">ชื่อชิ้นส่วนที่ตรวจพบ</div>
              <div className="text-sm font-black text-white">ตัวป้อนเส้นด้าย (Yarn Feeder Unit)</div>
              <div className="text-xs text-slate-300 font-mono mt-0.5">Part No: YF-GMK-2026-X</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <div className="text-[10px] text-slate-400">ตำแหน่งจัดเก็บ</div>
                <div className="text-xs font-black text-cyan-400">ชั้น B-04 กล่อง 12</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <div className="text-[10px] text-slate-400">สต็อกคงเหลือ</div>
                <div className="text-xs font-black text-emerald-400">12 ชิ้น (พร้อมเบิก)</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              <span>ช่างสามารถกดเบิกใช้งานลงสู่เครื่องจักรได้ทันที</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 6,
    title: 'นวัตกรรม #2: Real-Time Incident Notifications',
    subtitle: 'การแจ้งเตือนงานซ่อมด่วนผ่าน LINE Flex Messages ช่างเข้าถึงหน้างานทันที',
    category: 'การแจ้งเตือน (Real-Time Communication)',
    speakerNotes:
      'ระบบที่ดี ต้องเป็นระบบที่ช่างใช้งานง่ายและไม่สร้างภาระ เราจึงเลือกเชื่อมต่อการแจ้งเตือนเข้ากับ LINE Flex Messages ซึ่งช่างทุกคนมีอยู่ในโทรศัพท์อยู่แล้วครับ เมื่อมีการกดแจ้งซ่อม ข้อความการ์ดสีสวยงามที่มีข้อมูลครบถ้วน ทั้งเบอร์เครื่อง อาการเสีย และระดับความเร่งด่วน จะเด้งเข้ากลุ่มช่างซ่อมทันที ช่างสามารถกดปุ่ม รับงาน ผ่าน LINE ได้ทันที ทำให้ลดเวลาเครื่องจักรจอดคอยช่างจากเดิม 10-15 นาที เหลือไม่ถึง 1 นาทีครับ',
    renderContent: () => (
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 h-full max-w-5xl mx-auto p-4">
        {/* Left: Phone simulation card */}
        <div className="w-full lg:w-[360px] p-4 rounded-3xl bg-slate-900 border-2 border-emerald-500/40 shadow-2xl">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Send size={14} /> LINE Flex Notification
            </span>
            <span className="text-[10px] text-slate-400 font-mono">10:14 AM</span>
          </div>

          <div className="p-4 rounded-2xl bg-white text-slate-900 shadow-md space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase">
                🚨 แจ้งซ่อมด่วน (URGENT)
              </span>
              <span className="font-mono text-xs font-bold text-slate-600">MC-12</span>
            </div>
            <div>
              <div className="text-base font-black text-slate-900 leading-tight">เครื่องจักร: MC-12 (โซน A)</div>
              <div className="text-xs text-slate-600 mt-1">อาการ: เข็มหัก / เส้นด้ายขาดซ้ำซ้อน</div>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 space-y-0.5">
              <div>ผู้แจ้ง: สมชาย (ช่างทอ กะเช้า)</div>
              <div>เวลารายงาน: 10:14 น. · โรงทอ 1</div>
            </div>
            <button className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-emerald-700 transition-all">
              ⚡ รับงานซ่อมนี้ทันที
            </button>
          </div>
        </div>

        {/* Right: Operational Values */}
        <div className="flex-1 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <CheckCircle2 size={13} /> LINE & Telegram Enterprise Webhook
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white leading-snug">
            เครื่องจักรไม่ต้องจอดคอยช่าง <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              แจ้งเตือนตรงถึงมือถือช่างใน 1 วินาที
            </span>
          </h2>
          <ul className="text-xs sm:text-sm text-slate-300 space-y-2.5">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span><strong>ไม่ต้องลงแอปใหม่:</strong> ใช้แอปพลิเคชัน LINE ที่พนักงานทุกคนมีอยู่แล้วในชีวิตประจำวัน</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span><strong>ข้อมูลครบในที่เดียว:</strong> ทราบเบอร์เครื่อง อาการเสีย และความเร่งด่วน โดยไม่ต้องโทรถามซ้ำ</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span><strong>หัวหน้างานตรวจสอบได้:</strong> ทราบทันทีว่าช่างคนใดกดรับงาน และใช้เวลาซ่อมเสร็จในกี่นาที</span>
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 7,
    title: 'นวัตกรรม #3: Smart Tag Precision Printing',
    subtitle: 'ระบบพิมพ์ป้ายติดเครื่องจักรและป้ายกระบอกเข็มมาตรฐานโรงทอ (v1.3.185)',
    category: 'การควบคุมมาตรฐาน (Smart Tag Printing)',
    speakerNotes:
      'จากข้อกำหนดล่าสุดของโรงงาน เราได้พัฒนาระบบ Smart Tag Printing ขึ้นมา 2 รูปแบบครับ: แบบแรกคือ ป้ายพิมพ์ Tack ขนาด 20×7 ซม. พื้นหลังสีเขียวอ่อน ตัวหนังสือสีดำขนาดใหญ่พิเศษ สำหรับติดที่โครงเครื่องจักร เพื่อให้หัวหน้างานมองเห็นเบอร์เครื่องชัดเจนจากระยะ 5-10 เมตร แบบที่สองคือ ป้ายพิมพ์ Tack Spare ขนาด A4 แนวนอน สำหรับติดประจำกระบอกสำรอง มีข้อมูลสเปกครบ 7 ฟิลด์ ทั้งขนาด เส้นผ่าศูนย์กลาง เกจ และจำนวนเข็ม ช่วยป้องกันการหยิบกระบอกผิดสเปกมาใส่เครื่องได้อย่างสิ้นเชิงครับ',
    renderContent: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 h-full max-w-5xl mx-auto p-4 items-center">
        {/* Tag 1: Machine Tag 20x7cm */}
        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 flex flex-col justify-between h-[280px]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Printer size={14} /> ป้ายพิมพ์ Tack เครื่องปัจจุบัน (In-use)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                20 × 7 cm
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-3">
              สำหรับติดที่โครงเครื่องจักร พื้นหลังเขียวอ่อน ตัวหนังสือดำเด่นชัด เห็นชัดจากระยะไกล
            </p>
          </div>

          {/* Visual Simulation of Tag */}
          <div className="w-full h-24 rounded-xl border-3 border-slate-900 bg-[#bbf7d0] text-black flex flex-col items-center justify-center p-2 shadow-inner font-mono font-black">
            <span className="text-[10px] tracking-widest uppercase text-slate-800">เครื่องปัจจุบัน (CURRENT M/C)</span>
            <span className="text-3xl tracking-tight leading-none text-slate-950">MC-12</span>
            <span className="text-[9px] text-slate-700 mt-1">SERIAL: 20240901-01 · GEMMA KNITS</span>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 flex justify-between">
            <span>• กรองเฉพาะเครื่อง In-use</span>
            <span>• ตัวหนังสือ Auto-fit เต็มพื้นที่</span>
          </div>
        </div>

        {/* Tag 2: Spare Cylinder Tag A4 */}
        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 flex flex-col justify-between h-[280px]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Disc size={14} /> ป้ายพิมพ์ Tack Spare กระบอกสำรอง
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                A4 แนวนอน
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-3">
              เอกสารติดกระบอกสำรอง มีข้อมูลสเปก 7 ฟิลด์ครบถ้วน ปรับสัดส่วนการแสดงผลได้
            </p>
          </div>

          {/* Visual Simulation of A4 Tag */}
          <div className="w-full h-24 rounded-xl border-2 border-slate-900 bg-white text-black p-2 flex flex-col justify-between shadow-inner">
            <div className="flex justify-between items-center text-[9px] font-bold border-b border-slate-300 pb-1">
              <span>เอกสารติดกระบอกเข็ม (CYLINDER TAG)</span>
              <span>28/10/2026</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center font-mono py-1">
              <div className="bg-slate-100 rounded p-0.5">
                <div className="text-[8px] text-slate-500">M/C</div>
                <div className="text-xs font-bold">MC-15</div>
              </div>
              <div className="bg-slate-100 rounded p-0.5">
                <div className="text-[8px] text-slate-500">DIAMETER</div>
                <div className="text-xs font-bold">34"</div>
              </div>
              <div className="bg-slate-100 rounded p-0.5">
                <div className="text-[8px] text-slate-500">GAUGE</div>
                <div className="text-xs font-bold">24G</div>
              </div>
            </div>
            <div className="text-[8px] text-slate-500 truncate">REMARK: ตรวจเช็คศูนย์เรียบร้อย พร้อมใช้งาน</div>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 flex justify-between">
            <span>• กรองเฉพาะกระบอก Spare</span>
            <span>• ปรับสัดส่วน Hero / Specs ได้</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 8,
    title: 'ช่วงสาธิตระบบจริง (Live Interactive Demo)',
    subtitle: 'สัมผัสความเร็ว ความลื่นไหล และความง่ายในการใช้งานบนระบบจริง 3 นาที',
    category: 'การสาธิตสด (Live Demo Interlude)',
    speakerNotes:
      'ณ จุดนี้ ขออนุญาตสลับหน้าจอไปที่ระบบจริง textileops-cmms.pages.dev เพื่อสาธิตให้คณะผู้บริหารเห็นว่า ระบบถูกออกแบบมาให้ช่างใช้งานได้จริงอย่างสะดวกสบายเพียงใด ไม่ว่าจะเป็นแดชบอร์ดมือถือ การสั่งพิมพ์ป้าย Tack และการค้นหาอะไหล่ด้วย AI ในเวลาเพียงไม่กี่วินาทีครับ',
    renderContent: (onNavigateToApp) => (
      <div className="flex flex-col items-center justify-center text-center h-full max-w-3xl mx-auto p-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-2xl mb-6 animate-bounce">
          <Play size={36} className="ml-1" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
          3-MINUTE LIVE INTERACTIVE DEMO
        </h2>

        <p className="text-sm sm:text-base text-slate-300 max-w-xl mb-8 leading-relaxed">
          ชมการทำงานจริงแบบ Step-by-Step บนเซิร์ฟเวอร์ Cloudflare Production ทั้งมุมมองคอมพิวเตอร์และสมาร์ทโฟน
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <button
            type="button"
            onClick={onNavigateToApp}
            className="btn px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-black text-sm shadow-xl flex items-center gap-2.5 active:scale-95 transition-all"
          >
            <ExternalLink size={18} />
            <span>เปิดระบบจริงเพื่อสาธิต (Launch Live App)</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full text-left text-xs text-slate-400 border-t border-slate-800 pt-6">
          <div>
            <strong className="text-white block mb-0.5">1. แดชบอร์ด & มือถือ</strong>
            ตรวจสถานะเครื่องทั้งโรงทอและมุมมอง PWA
          </div>
          <div>
            <strong className="text-white block mb-0.5">2. พิมพ์ป้าย Tack</strong>
            พิมพ์ฉลาก 20×7 ซม. และ A4 กระบอก Spare
          </div>
          <div>
            <strong className="text-white block mb-0.5">3. สแกนภาพอะไหล่</strong>
            Google Gemini AI ระบุชื่อและชั้นวาง
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 9,
    title: 'ผลลัพธ์เชิงธุรกิจและตัวชี้วัด (Business Impact & ROI)',
    subtitle: 'ผลตอบแทนความคุ้มค่าที่ชัดเจนและจับต้องได้จากการใช้งานระบบ TextileOps',
    category: 'ความคุ้มค่าเชิงธุรกิจ (Business ROI)',
    speakerNotes:
      'เมื่อประเมินผลลัพธ์เชิงธุรกิจ TextileOps ให้ผลตอบแทนความคุ้มค่าที่ชัดเจนมากครับ: 1. เราลดเวลาเครื่องหยุดซ่อมได้ 25 ถึง 35% คิดเป็นชั่วโมงการผลิตที่เพิ่มขึ้นหลายร้อยชั่วโมงต่อเดือน 2. ระยะเวลาตอบสนองการแจ้งซ่อมลดลงเหลือไม่ถึง 1 นาที 3. ความแม่นยำของสต็อกเข็มและอะไหล่สูงขึ้นเกิน 99% บัญชีและการเงินมั่นใจได้ในมูลค่าทรัพย์สินคงคลัง 4. เรามี Audit Trail ครบ 100% สเปกกระบอกประวัติการสลับเครื่อง สามารถเปิดดูย้อนหลังได้ทันทีเมื่อลูกค้าต้องการตรวจสอบคุณภาพผ้าครับ',
    renderContent: () => (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 h-full max-w-5xl mx-auto p-4 items-center">
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/40 shadow-xl flex flex-col justify-between h-[190px]">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">Downtime Reduction</span>
            <div className="text-4xl sm:text-5xl font-black text-white">-25% ถึง -35%</div>
          </div>
          <p className="text-xs text-slate-300">
            ลดการสูญเสียกำลังการผลิตจากเครื่องจักรหยุดนิ่ง คิดเป็นเวลาเดินงานเพิ่มขึ้นหลายร้อยชั่วโมง/เดือน
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/40 shadow-xl flex flex-col justify-between h-[190px]">
          <div>
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block mb-1">Response Time</span>
            <div className="text-4xl sm:text-5xl font-black text-white">&lt; 1 นาที</div>
          </div>
          <p className="text-xs text-slate-300">
            จากเดิมเฉลี่ย 10–15 นาที ช่างทราบเรื่องและเข้าหน้างานรวดเร็วด้วยระบบแจ้งเตือน LINE ทันที
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-950/40 to-slate-900 border border-purple-500/40 shadow-xl flex flex-col justify-between h-[190px]">
          <div>
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block mb-1">Inventory Accuracy</span>
            <div className="text-4xl sm:text-5xl font-black text-white">99.5%</div>
          </div>
          <p className="text-xs text-slate-300">
            ควบคุมการเบิกจ่ายเข็มและอะไหล่ ป้องกันเข็มสูญหายหรือเบิกซ้ำซ้อน บัญชีมั่นใจในตัวเลข
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/40 shadow-xl flex flex-col justify-between h-[190px]">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">Full Traceability</span>
            <div className="text-4xl sm:text-5xl font-black text-white">100%</div>
          </div>
          <p className="text-xs text-slate-300">
            ตรวจสอบประวัติการสลับกระบอกเข็มและการซ่อมย้อนหลังได้ทุกชิ้นผ้า พร้อมรับรองมาตรฐานสากล
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 10,
    title: 'เสถียรภาพ ความปลอดภัย และการทำงานออฟไลน์',
    subtitle: 'โครงสร้างคลาวด์มาตรฐานสากล ต้นทุนต่ำ และไม่มีวันหยุดชะงัก',
    category: 'โครงสร้างและความปลอดภัย (Enterprise Architecture)',
    speakerNotes:
      'ในด้านความปลอดภัยและเสถียรภาพ ผู้บริหารสามารถมั่นใจได้ 100% ครับ ระบบทำงานอยู่บนโครงสร้างคลาวด์ของ Cloudflare ซึ่งมีความเร็วสูงและมีระบบป้องกันความปลอดภัยระดับโลก นอกจากนี้ สถาปัตยกรรมแบบ Serverless ทำให้เราแทบไม่มีค่าใช้จ่ายเซิร์ฟเวอร์รายเดือนก้อนใหญ่เลย และที่สำคัญ หากสัญญาณอินเทอร์เน็ตในโรงทอมีช่วงติดขัด ระบบ PWA มีระบบบันทึกข้อมูลสำรองในเครื่อง ทำให้ช่างยังทำงานหน้างานได้ต่อเนื่องโดยไม่สะดุดครับ',
    renderContent: () => (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-full max-w-5xl mx-auto p-4 items-center">
        <div className="p-5 rounded-2xl bg-slate-850 border border-slate-750 flex flex-col justify-between h-[260px]">
          <div>
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 w-fit mb-3">
              <Cpu size={22} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Cloudflare Global Edge</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              ทำงานบนเครือข่ายเซิร์ฟเวอร์กว่า 300 เมืองทั่วโลก โหลดหน้าเว็บเร็วต่ำกว่า 1 วินาที พร้อมระบบป้องกัน DDoS และ Web Application Firewall (WAF)
            </p>
          </div>
          <div className="text-[11px] font-mono text-blue-400 font-bold border-t border-slate-800 pt-2">
            Zero Server Maintenance
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-850 border border-slate-750 flex flex-col justify-between h-[260px]">
          <div>
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 w-fit mb-3">
              <ShieldCheck size={22} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">ความปลอดภัย & การแบ่งสิทธิ์</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              เข้ารหัสข้อมูลระดับ HTTPS/SSL 256-bit พร้อมระบบ Role-Based Access Control (RBAC) แบ่งสิทธิ์ระหว่าง Admin, Supervisor, ช่างซ่อม, และ Viewer ชัดเจน
            </p>
          </div>
          <div className="text-[11px] font-mono text-emerald-400 font-bold border-t border-slate-800 pt-2">
            Enterprise Grade Security
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-850 border border-slate-750 flex flex-col justify-between h-[260px]">
          <div>
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 w-fit mb-3">
              <Layers size={22} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Offline Resilience & PWA</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              ช่างติดตั้งลงหน้าจอมือถือได้ทันที มีหน่วยความจำ Local Storage บันทึกข้อมูลได้แม้อินเทอร์เน็ตโรงงานขัดข้อง และซิงค์ขึ้นระบบอัตโนมัติเมื่อต่อเน็ต
            </p>
          </div>
          <div className="text-[11px] font-mono text-purple-400 font-bold border-t border-slate-800 pt-2">
            100% Offline-Friendly
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 11,
    title: 'บทสรุปและแผนการเติบโต (Roadmap & Next Steps)',
    subtitle: 'ความพร้อมใช้งานจริง 100% เพื่อยกระดับโรงทอ เจมม่า นิตส์ สู่ความยั่งยืน',
    category: 'บทสรุปและก้าวถัดไป (Conclusion & Q&A)',
    speakerNotes:
      'สุดท้ายนี้ ทีมงานขอสรุปว่า TextileOps ไม่ใช่แค่โปรแกรมคอมพิวเตอร์ แต่เป็นเครื่องมือยุทธศาสตร์ที่จะช่วยรักษามาตรฐานการผลิต ลดต้นทุนแฝง และสร้างความได้เปรียบในการแข่งขันให้กับ บริษัท เจมม่า นิตส์ จำกัด อย่างยั่งยืนครับ ระบบมีความพร้อม 100% ในทุกมิติ และเราพร้อมดำเนินการถ่ายทอดการใช้งานสู่ทุกกะทันที ทีมงานขอขอบพระคุณคณะผู้บริหารเป็นอย่างยิ่ง และยินดีรับฟังข้อเสนอแนะและตอบข้อซักถามทุกประการครับ',
    renderContent: (onNavigateToApp) => (
      <div className="flex flex-col items-center justify-center text-center h-full max-w-4xl mx-auto p-4">
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
          TEXTILEOPS CMMS IS PRODUCTION READY
        </h2>

        {/* Roadmap Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full my-6 text-left">
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
              Phase 1: ปัจจุบัน (Q4 2026)
            </span>
            <div className="text-sm font-bold text-white mb-1.5">Full System Rollout</div>
            <p className="text-xs text-slate-300">
              • ใช้งานครบทุกเครื่องในโรงทอ<br />
              • อบรมช่างและหัวหน้างานทุกกะ<br />
              • ติดป้าย Smart Tag มาตรฐาน
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
              Phase 2: ต่อยอด (Q1-Q2 2027)
            </span>
            <div className="text-sm font-bold text-white mb-1.5">IoT & ERP Integration</div>
            <p className="text-xs text-slate-300">
              • ติดตั้งเซ็นเซอร์มิเตอร์รอบ IoT<br />
              • เชื่อมโยง API สต็อกเข้าสู่ ERP<br />
              • ขยายผลสู่แผนกย้อมและการ์เมนต์
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">
              Phase 3: สู่อนาคต (Q3-Q4 2027)
            </span>
            <div className="text-sm font-bold text-white mb-1.5">Predictive AI Maintenance</div>
            <p className="text-xs text-slate-300">
              • AI พยากรณ์ชิ้นส่วนเสียล่วงหน้า<br />
              • วิเคราะห์ OEE โรงงานอัตโนมัติ<br />
              • Zero Unplanned Downtime Goal
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-850/80 border border-slate-750 max-w-2xl w-full mb-6">
          <div className="text-sm font-bold text-white mb-1">ขอรับความเห็นชอบและการสนับสนุนจากคณะผู้บริหาร</div>
          <p className="text-xs text-slate-400">
            เพื่อประกาศนโยบายใช้งานระบบเต็มรูปแบบและเริ่มการฝึกอบรมพนักงานทุกแผนกในสัปดาห์หน้า
          </p>
        </div>

        <div className="text-2xl font-black text-white tracking-widest uppercase">
          Q & A
        </div>
        <p className="text-xs text-slate-400 mt-1">
          ขอขอบพระคุณคณะผู้บริหาร บริษัท เจมม่า นิตส์ จำกัด ทุกท่านครับ
        </p>
      </div>
    ),
  },
]

export default function Presentation() {
  const navigate = useNavigate()
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showJumpMenu, setShowJumpMenu] = useState(false)
  const containerRef = useRef(null)

  const currentSlide = SLIDES_DATA[currentSlideIndex]
  const totalSlides = SLIDES_DATA.length

  const goToNext = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : prev))
  }, [totalSlides])

  const goToPrev = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }, [])

  const goToSlide = (index) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentSlideIndex(index)
      setShowJumpMenu(false)
    }
  }

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        goToNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goToPrev()
      } else if (e.key === 'Home') {
        e.preventDefault()
        setCurrentSlideIndex(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        setCurrentSlideIndex(totalSlides - 1)
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        toggleFullscreen()
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setShowNotes((prev) => !prev)
      } else if (e.key === 'Escape') {
        if (showNotes) setShowNotes(false)
        if (showJumpMenu) setShowJumpMenu(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToNext, goToPrev, totalSlides, showNotes, showJumpMenu])

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.().catch(() => {})
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handleNavigateToApp = () => {
    // Open main dashboard in a new tab or navigate
    window.open('/', '_blank')
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-[#090d16] text-slate-100 flex flex-col justify-between overflow-hidden select-none z-[999999]"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
    >
      {/* ── TOP BAR: Progress, Counter, Brand & Controls ───────────────── */}
      <header className="h-14 px-4 sm:px-6 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md flex items-center justify-between flex-shrink-0 z-50">
        <div className="flex items-center gap-3">
          <img src={gemmaLogo} alt="Gemma Knits" className="h-7 w-auto object-contain" />
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-black text-white tracking-wider">GEMMA KNITS · TEXTILEOPS</span>
            <span className="text-[10px] text-slate-400 font-mono">EXECUTIVE PITCH DECK</span>
          </div>
        </div>

        {/* Progress Bar & Slide Title Indicator */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowJumpMenu(!showJumpMenu)}
              title="กระโดดข้ามสไลด์"
              className="px-3 py-1 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5 transition-all"
            >
              <span>{currentSlideIndex + 1} / {totalSlides}</span>
              <span className="text-[10px] text-slate-500">▼</span>
            </button>

            {/* Jump Menu Dropdown */}
            {showJumpMenu && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 max-h-72 overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 divide-y divide-slate-800/60">
                {SLIDES_DATA.map((slide, idx) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => goToSlide(idx)}
                    className={`w-full p-2 text-left text-xs rounded-xl transition-all flex items-center gap-2 ${
                      idx === currentSlideIndex
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-mono text-[10px] text-slate-400 w-4">{idx + 1}.</span>
                    <span className="truncate">{slide.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          {/* Notes Toggle */}
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            title="เปิด/ปิดสคริปต์ผู้บรรยาย (กดปุ่ม N)"
            className={`p-2 rounded-xl text-xs font-bold transition-all border ${
              showNotes
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-slate-850 text-slate-400 border-slate-750 hover:text-white'
            }`}
          >
            <FileText size={15} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'ออกจากโหมดเต็มจอ (F)' : 'ขยายเต็มหน้าจอ (F)'}
            className="p-2 rounded-xl text-xs font-bold bg-slate-850 text-slate-400 border border-slate-750 hover:text-white transition-all"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {/* Close / Return to App */}
          <button
            type="button"
            onClick={() => navigate('/')}
            title="กลับสู่หน้าหลัก TextileOps"
            className="p-2 rounded-xl text-xs font-bold bg-slate-850 text-slate-400 border border-slate-750 hover:text-rose-400 hover:border-rose-500/40 transition-all"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* Thin Linear Progress Indicator */}
      <div className="w-full h-1 bg-slate-800 relative">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-300"
          style={{ width: `${((currentSlideIndex + 1) / totalSlides) * 100}%` }}
        />
      </div>

      {/* ── MAIN SLIDE CANVAS ──────────────────────────────────────────── */}
      <main className="flex-1 relative overflow-y-auto flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-6xl h-full flex flex-col justify-center animate-fadeIn">
          {/* Slide Header (Except Title Slide) */}
          {currentSlide.id !== 1 && (
            <div className="text-center mb-4 sm:mb-6">
              <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-400 mb-1 block">
                {currentSlide.category}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                {currentSlide.title}
              </h2>
              {currentSlide.subtitle && (
                <p className="text-xs sm:text-sm text-slate-400 mt-1">{currentSlide.subtitle}</p>
              )}
            </div>
          )}

          {/* Slide Custom Render */}
          <div className="flex-1 flex items-center justify-center">
            {currentSlide.renderContent(handleNavigateToApp)}
          </div>
        </div>
      </main>

      {/* ── SPEAKER NOTES SLIDEOUT DRAWER ──────────────────────────────── */}
      {showNotes && (
        <div className="bg-slate-900/95 border-t border-amber-500/40 p-4 sm:p-5 backdrop-blur-xl animate-slideUp z-50 shadow-2xl max-h-52 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                <FileText size={14} /> สคริปต์ผู้บรรยาย (Speaker Notes) · สไลด์ที่ {currentSlideIndex + 1}
              </span>
              <button
                type="button"
                onClick={() => setShowNotes(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕ ปิดหน้าต่างสคริปต์
              </button>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">
              "{currentSlide.speakerNotes}"
            </p>
          </div>
        </div>
      )}

      {/* ── BOTTOM CONTROL BAR ─────────────────────────────────────────── */}
      <footer className="h-16 px-4 sm:px-8 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center justify-between flex-shrink-0 z-50">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPrev}
            disabled={currentSlideIndex === 0}
            title="สไลด์ก่อนหน้า (ลูกศรซ้าย)"
            className="btn py-2 px-3 sm:px-4 rounded-xl text-xs font-bold bg-slate-850 hover:bg-slate-800 border border-slate-750 text-white disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">ก่อนหน้า</span>
          </button>

          <button
            type="button"
            onClick={goToNext}
            disabled={currentSlideIndex === totalSlides - 1}
            title="สไลด์ถัดไป (ลูกศรขวา / Spacebar)"
            className="btn py-2 px-4 sm:px-5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
          >
            <span>ถัดไป</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Center Help Tips */}
        <div className="hidden md:flex items-center gap-4 text-[11px] text-slate-500 font-mono">
          <span>ปุ่มลูกศร ◀ ▶ เพื่อเปลี่ยนหน้า</span>
          <span>·</span>
          <span>กด <strong>Space</strong> เพื่อไปต่อ</span>
          <span>·</span>
          <span>กด <strong>N</strong> ดูสคริปต์พูด</span>
          <span>·</span>
          <span>กด <strong>F</strong> ขยายเต็มจอ</span>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNavigateToApp}
            title="เปิดทดลองใช้งานระบบจริง"
            className="btn py-1.5 px-3 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 transition-all"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">เปิดระบบจริง (Demo)</span>
          </button>
        </div>
      </footer>
    </div>
  )
}
