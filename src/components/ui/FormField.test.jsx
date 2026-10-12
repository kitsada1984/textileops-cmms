import React, { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FormField from './FormField'

describe('FormField - React Composition Patterns', () => {
  it('renders correctly with legacy props for text input', () => {
    const setForm = vi.fn()
    const form = { username: 'testuser' }

    render(
      <FormField
        id="username"
        label="ชื่อผู้ใช้"
        form={form}
        setForm={setForm}
        placeholder="กรอกชื่อ"
      />
    )

    expect(screen.getByText('ชื่อผู้ใช้')).toBeInTheDocument()
    const input = screen.getByPlaceholderText('กรอกชื่อ')
    expect(input).toHaveValue('testuser')

    fireEvent.change(input, { target: { value: 'newuser' } })
    expect(setForm).toHaveBeenCalledTimes(1)
  })

  it('renders correctly with legacy props for select input', () => {
    const setForm = vi.fn()
    const form = { role: 'admin' }

    render(
      <FormField
        id="role"
        label="สิทธิ์การใช้งาน"
        opts={[
          { label: 'ผู้ดูแลระบบ', value: 'admin' },
          { label: 'ผู้ใช้งาน', value: 'user' },
        ]}
        form={form}
        setForm={setForm}
      />
    )

    expect(screen.getByText('สิทธิ์การใช้งาน')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('admin')
  })

  it('renders correctly as compound components with explicit variants', () => {
    render(
      <FormField id="custom-field">
        <FormField.Label>หัวข้อปรับแต่ง</FormField.Label>
        <FormField.Input placeholder="ระบุข้อมูลที่นี่" />
        <FormField.Helper>คำอธิบายเพิ่มเติม</FormField.Helper>
        <FormField.Error>ข้อผิดพลาดถ้ามี</FormField.Error>
      </FormField>
    )

    expect(screen.getByText('หัวข้อปรับแต่ง')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('ระบุข้อมูลที่นี่')).toBeInTheDocument()
    expect(screen.getByText('คำอธิบายเพิ่มเติม')).toBeInTheDocument()
    expect(screen.getByText('ข้อผิดพลาดถ้ามี')).toBeInTheDocument()
  })

  it('renders FormField.Checkbox explicit variant correctly', () => {
    const handleChange = vi.fn()

    render(
      <FormField>
        <FormField.Checkbox
          id="is_active"
          label="เปิดใช้งานสถานะนี้"
          checked={true}
          onChange={handleChange}
        />
      </FormField>
    )

    expect(screen.getByLabelText('เปิดใช้งานสถานะนี้')).toBeChecked()
  })
})
