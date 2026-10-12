import { z } from 'zod'

export const telegramAdminSchema = z.object({
  name: z.string().trim().min(1, 'กรุณาระบุชื่อผู้ดูแลระบบ (Admin Name)'),
  chat_id: z
    .string()
    .trim()
    .min(1, 'กรุณาระบุ Telegram Chat ID')
    .regex(/^-?\d+$/, 'Telegram Chat ID ต้องเป็นตัวเลขเท่านั้น (เช่น 123456789 หรือ -100xxx)'),
  note: z.string().trim().optional().default(''),
})
