import { z } from 'zod'

export const spareNeedleRequestSchema = z.object({
  machine_mc: z.string().trim().min(1, 'กรุณาระบุหมายเลขเครื่องจักร (Machine MC)'),
  technician_name: z.string().trim().min(1, 'กรุณาระบุชื่อช่างผู้ขอเบิก'),
  shift: z.string().trim().default('กะเช้า'),
  gauge: z.string().trim().min(1, 'กรุณาระบุขนาด Gauge'),
  cylinder_serial: z.string().trim().optional().default(''),
  request_comment: z.string().trim().optional().default(''),
  total_needles: z.coerce.number().min(1, 'ต้องมีจำนวนเข็มขอเบิกรวมอย่างน้อย 1 ตัว'),
})
