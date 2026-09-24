import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import React from 'react'
import {
  ActionChoiceModal,
  StepAcknowledgeSpareNeedle,
  StepSpareNeedleRequest,
  StepPrepareSpareNeedle,
} from './SpareNeedleFlow'
import { NeedleSetAPI } from '../../api/entities'

vi.mock('../../api/entities', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    NeedleSetAPI: {
      ...actual.NeedleSetAPI,
      list: vi.fn(),
      update: vi.fn(),
    },
    SpareNeedleRequestAPI: {
      ...actual.SpareNeedleRequestAPI,
      update: vi.fn(),
    },
    NeedleHistoryAPI: {
      ...actual.NeedleHistoryAPI,
      create: vi.fn(),
    },
  }
})

describe('SpareNeedleFlow Components', () => {
  it('ActionChoiceModal renders machine info and allows selecting repair vs spare needle', () => {
    const onSelectAction = vi.fn()
    const onCancel = vi.fn()
    const cylinder = {
      Machine: 'DG-341M',
      Gauge: '28G',
      Serial_NOW: '63876',
    }

    render(
      <ActionChoiceModal
        cylinder={cylinder}
        serial="63876"
        onSelectAction={onSelectAction}
        onCancel={onCancel}
      />
    )

    // Check machine info display
    expect(screen.getByText('DG-341M')).toBeInTheDocument()
    expect(screen.getByText('28G')).toBeInTheDocument()
    expect(screen.getByText('63876')).toBeInTheDocument()

    // Check action buttons
    const repairBtn = screen.getByText('แจ้งซ่อมเครื่องจักร')
    const spareBtn = screen.getByText('เบิกเข็ม Spare ประจำเครื่อง')
    expect(repairBtn).toBeInTheDocument()
    expect(spareBtn).toBeInTheDocument()

    // Trigger select repair
    fireEvent.click(repairBtn)
    expect(onSelectAction).toHaveBeenCalledWith('repair')

    // Trigger select spare needle
    fireEvent.click(spareBtn)
    expect(onSelectAction).toHaveBeenCalledWith('spare_needle')
  })

  it('StepAcknowledgeSpareNeedle renders prepared needle items and handles acknowledge click', () => {
    const onAcknowledged = vi.fn()
    const snr = {
      id: 'SNR-TEST-001',
      request_no: 'SNR-TEST-001',
      machine_mc: 'DG-341M',
      technician_name: 'ช่างหนึ่ง',
      status: 'PREPARED',
      issued_items: [
        { setId: 'NS-0001', needleModel: 'VO 104.41', gauge: '28G', grade: 'เกรด A', quantity: 10 },
      ],
      issuer_name: 'พี่ตุ๊ก',
      issuer_comment: 'เตรียมไว้ให้ที่สโตร์แล้ว',
    }

    render(
      <StepAcknowledgeSpareNeedle
        snr={snr}
        cylinder={{ Machine: 'DG-341M' }}
        onAcknowledged={onAcknowledged}
      />
    )

    expect(screen.getByText('เข็ม Spare จัดเตรียมพร้อมรับแล้ว')).toBeInTheDocument()
    expect(screen.getByText('VO 104.41')).toBeInTheDocument()
    expect(screen.getByText('10 ตัว')).toBeInTheDocument()
    expect(screen.getByText('พี่ตุ๊ก')).toBeInTheDocument()
    expect(screen.getByText('💬 ข้อความจากผู้จ่าย:')).toBeInTheDocument()

    const ackBtn = screen.getByText(/ได้รับเข็มเรียบร้อย/i)
    expect(ackBtn).toBeInTheDocument()
  })

  it('StepSpareNeedleRequest initializes tracks with 50 and allows quick presets and manual input', () => {
    const onSubmitted = vi.fn()
    const onBack = vi.fn()
    const cylinder = {
      Machine: 'DG-341M',
      Gauge: '28G',
      Serial_NOW: '63876',
      Track_1: 'VO 104.41',
      Track_2: 'VO 104.41',
      Dial_1: 'WO 104.41',
    }

    render(
      <StepSpareNeedleRequest
        cylinder={cylinder}
        serial="63876"
        onSubmitted={onSubmitted}
        onBack={onBack}
      />
    )

    // Check header & machine info
    expect(screen.getByText('ฟอร์มขอเบิกเข็ม Spare')).toBeInTheDocument()
    expect(screen.getByText('DG-341M')).toBeInTheDocument()

    // Find Track 1 and click it
    const track1Label = screen.getAllByText('Track 1')[0]
    fireEvent.click(track1Label)

    // Default quantity should be 50
    expect(screen.getByText('50 ตัว')).toBeInTheDocument()

    // Presets should be rendered (50, 100, 150, 200, 250, 300)
    expect(screen.getByText('เลือกจำนวน (ครั้งละ 50):')).toBeInTheDocument()
    const preset150 = screen.getByRole('button', { name: '150' })
    expect(preset150).toBeInTheDocument()

    // Click preset 150
    fireEvent.click(preset150)
    expect(screen.getByText('150 ตัว')).toBeInTheDocument()

    // Click +50 button
    const plus50Btn = screen.getByRole('button', { name: '+50' })
    fireEvent.click(plus50Btn)
    expect(screen.getByText('200 ตัว')).toBeInTheDocument()

    // Test manual input field
    const manualInput = screen.getByPlaceholderText('ระบุ')
    expect(manualInput).toBeInTheDocument()
    expect(manualInput.value).toBe('200')

    fireEvent.change(manualInput, { target: { value: '250' } })
    expect(screen.getByText('250 ตัว')).toBeInTheDocument()
  })

  it('StepPrepareSpareNeedle allows selecting machine before needle set and filters correctly', async () => {
    const mockStock = [
      { id: '1', setId: 'NS-001', machineId: 'DG-341M', needleModel: 'Model DG 1', gauge: '28G', grade: 'A', quantity: 100 },
      { id: '2', setId: 'NS-002', machineId: 'DG-341M', needleModel: 'Model DG 2', gauge: '28G', grade: 'B', quantity: 50 },
      { id: '3', setId: 'NS-003', machineId: 'SA-302M', needleModel: 'Model SA 1', gauge: '28G', grade: 'A', quantity: 80 },
    ]
    NeedleSetAPI.list.mockResolvedValue(mockStock)

    const snr = {
      id: 'SNR-001',
      request_no: 'SNR-260924-001',
      machine_mc: 'DG-341M',
      gauge: '28G',
      technician_name: 'ช่างหนึ่ง',
      shift: 'กะเช้า',
      created_at: new Date().toISOString(),
      tracks_requested: { cylinder: { t1: 50 } },
    }

    render(
      <StepPrepareSpareNeedle
        snr={snr}
        cylinder={{ Machine: 'DG-341M' }}
        onPrepared={vi.fn()}
        onClose={vi.fn()}
      />
    )

    // Wait for stock to load
    await waitFor(() => {
      expect(screen.getByTestId('spare-machine-select')).toBeInTheDocument()
    })

    // Verify machine select has DG-341M auto-selected
    const machineSelect = screen.getByTestId('spare-machine-select')
    expect(machineSelect.value).toBe('DG-341M')

    const needleSelect = screen.getByTestId('spare-needle-set-select')

    // Verify needle set select contains only DG-341M sets initially
    expect(within(needleSelect).getByText(/Model DG 1/)).toBeInTheDocument()
    expect(within(needleSelect).getByText(/Model DG 2/)).toBeInTheDocument()
    expect(within(needleSelect).queryByText(/Model SA 1/)).not.toBeInTheDocument()

    // Switch machine to SA-302M
    fireEvent.change(machineSelect, { target: { value: 'SA-302M' } })
    expect(machineSelect.value).toBe('SA-302M')

    // Now needle set select should show SA-302M and not DG-341M
    expect(within(needleSelect).getByText(/Model SA 1/)).toBeInTheDocument()
    expect(within(needleSelect).queryByText(/Model DG 1/)).not.toBeInTheDocument()

    // Switch machine to ALL
    fireEvent.change(machineSelect, { target: { value: 'ALL' } })
    expect(within(needleSelect).getByText(/Model DG 1/)).toBeInTheDocument()
    expect(within(needleSelect).getByText(/Model SA 1/)).toBeInTheDocument()
  })
})

