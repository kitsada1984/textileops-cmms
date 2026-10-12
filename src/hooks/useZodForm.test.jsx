import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { useZodForm } from './useZodForm'

const testSchema = z.object({
  title: z.string().trim().min(2, 'ชื่อเรื่องต้องมีอย่างน้อย 2 ตัวอักษร'),
  count: z.coerce.number().min(1, 'จำนวนต้องมากกว่า 0'),
})

function TestFormComponent({ onSubmit }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useZodForm(testSchema, {
    defaultValues: {
      title: '',
      count: 0,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="title">ชื่อเรื่อง</label>
        <input id="title" {...register('title')} placeholder="กรอกชื่อเรื่อง" />
        {errors.title && <span role="alert">{errors.title.message}</span>}
      </div>

      <div>
        <label htmlFor="count">จำนวน</label>
        <input id="count" type="number" {...register('count')} placeholder="กรอกจำนวน" />
        {errors.count && <span role="alert">{errors.count.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        บันทึก
      </button>
    </form>
  )
}

describe('useZodForm Hook - React Hook Form + Zod', () => {
  it('prevents submission and displays schema error messages on invalid input', async () => {
    const handleSubmit = vi.fn()
    render(<TestFormComponent onSubmit={handleSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: 'บันทึก' }))

    await waitFor(() => {
      expect(screen.getByText('ชื่อเรื่องต้องมีอย่างน้อย 2 ตัวอักษร')).toBeInTheDocument()
      expect(screen.getByText('จำนวนต้องมากกว่า 0')).toBeInTheDocument()
    })

    expect(handleSubmit).not.toHaveBeenCalled()
  })

  it('submits valid data coerced to correct types', async () => {
    const handleSubmit = vi.fn()
    render(<TestFormComponent onSubmit={handleSubmit} />)

    fireEvent.change(screen.getByPlaceholderText('กรอกชื่อเรื่อง'), {
      target: { value: 'เปลี่ยนเข็มซ่อมบำรุง' },
    })
    fireEvent.change(screen.getByPlaceholderText('กรอกจำนวน'), {
      target: { value: '15' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'บันทึก' }))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1)
      expect(handleSubmit).toHaveBeenCalledWith(
        {
          title: 'เปลี่ยนเข็มซ่อมบำรุง',
          count: 15, // coerced to number
        },
        expect.anything()
      )
    })
  })
})
