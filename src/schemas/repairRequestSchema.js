import { z } from 'zod'

export const repairRequestSchema = z.object({
  cylinder_serial: z.string().trim().min(1, 'กรุณาระบุหรือเลือกหมายเลขกระบอก (Serial)'),
  machine_mc: z.string().trim().min(1, 'กรุณาระบุหมายเลขเครื่องจักร (Machine MC)'),
  reported_by: z.string().trim().min(1, 'กรุณาระบุชื่อผู้แจ้งซ่อม'),
  problem_description: z.string().trim().min(1, 'กรุณาระบุอาการเสีย/ปัญหาที่พบ'),
  priority: z.enum(['ปกติ', 'ด่วน', 'ด่วนที่สุด']).default('ปกติ'),
  repair_type: z.string().trim().optional().default('EASY'),
  status: z.string().trim().optional().default('PENDING'),
})
