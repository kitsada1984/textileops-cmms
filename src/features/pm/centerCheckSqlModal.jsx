import Modal from '../../components/ui/Modal'
import { Check } from 'lucide-react'

export function CenterCheckSqlModal({ sqlModalOpen, setSqlModalOpen, toast }) {
  return (
    <>
      {sqlModalOpen && (
        <Modal
          open={sqlModalOpen}
          onClose={() => setSqlModalOpen(false)}
          title="คำสั่ง SQL สร้างตารางในฐานข้อมูล Supabase"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-200 text-xs leading-relaxed">
              💡 คัดลอกคำสั่ง SQL ด้านล่างนี้ แล้วนำไปวางใน <b>Supabase Dashboard &gt; SQL Editor</b> แล้วกด <b>Run</b> เพื่อสร้างตาราง <code>center_checks</code> และ <code>checklist_configs</code> บนคลาวด์
            </div>

            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-[300px] border border-slate-700 select-all leading-relaxed">
{`-- สร้างตาราง center_checks
CREATE TABLE IF NOT EXISTS public.center_checks (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  timestamp text DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  type text NOT NULL DEFAULT 'Single',
  doc_no text NOT NULL UNIQUE,
  doc_date text DEFAULT to_char(current_date, 'YYYY-MM-DD'),
  mechanic text,
  mc text NOT NULL,
  serial text,
  needle_cond text,
  needle_arr text,
  needle_images jsonb DEFAULT '[]'::jsonb,
  comment text,
  counter_latest numeric DEFAULT 0,
  counter_prev numeric DEFAULT 0,
  counter_total numeric DEFAULT 0,
  prev_doc_date text,
  days_since_last integer DEFAULT 0,
  items jsonb DEFAULT '[]'::jsonb,
  greasing boolean DEFAULT false,
  oil_change boolean DEFAULT false,
  belt_tape1 boolean DEFAULT false,
  belt_tape2 boolean DEFAULT false,
  belt_tape3 boolean DEFAULT false,
  belt_tape4 boolean DEFAULT false,
  belt_tape5 boolean DEFAULT false,
  remark text,
  sign_name text,
  sign_date text,
  sup_name text,
  sup_date text,
  status text DEFAULT 'ผ่าน'
);

ALTER TABLE public.center_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for center_checks" ON public.center_checks;
CREATE POLICY "Allow all operations for center_checks" ON public.center_checks FOR ALL USING (true) WITH CHECK (true);`}
              </pre>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSqlModalOpen(false)}
                className="btn-outline"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={() => {
                  const sqlText = `-- สร้างตาราง center_checks
CREATE TABLE IF NOT EXISTS public.center_checks (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  timestamp text DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  type text NOT NULL DEFAULT 'Single',
  doc_no text NOT NULL UNIQUE,
  doc_date text DEFAULT to_char(current_date, 'YYYY-MM-DD'),
  mechanic text,
  mc text NOT NULL,
  serial text,
  needle_cond text,
  needle_arr text,
  needle_images jsonb DEFAULT '[]'::jsonb,
  comment text,
  counter_latest numeric DEFAULT 0,
  counter_prev numeric DEFAULT 0,
  counter_total numeric DEFAULT 0,
  prev_doc_date text,
  days_since_last integer DEFAULT 0,
  items jsonb DEFAULT '[]'::jsonb,
  remark text,
  sign_name text,
  sign_date text,
  sup_name text,
  sup_date text,
  status text DEFAULT 'ผ่าน'
);

ALTER TABLE public.center_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for center_checks" ON public.center_checks;
CREATE POLICY "Allow all operations for center_checks" ON public.center_checks FOR ALL USING (true) WITH CHECK (true);`
                  navigator.clipboard.writeText(sqlText)
                  toast.success('คัดลอกคำสั่ง SQL แล้ว!', 'นำไปวางใน Supabase Dashboard > SQL Editor')
                }}
                className="btn-primary"
              >
                <Check size={14} />
                <span>คัดลอกคำสั่ง SQL</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
