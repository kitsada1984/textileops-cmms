import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MachinesDesktopView from './MachinesDesktopView'
import MachinesTabletView from './MachinesTabletView'
import MachinesMobileView from './MachinesMobileView'

const MOCK_LOCATION_STATS = [
  { name: 'GK1', count: 12 },
  { name: 'GK3', count: 25 },
  { name: 'GK4', count: 56 },
]

const createMockLogic = (overrides = {}) => ({
  t: (k) => k,
  canAdd: true,
  canEdit: true,
  canDelete: true,
  loading: false,
  load: vi.fn(),
  stats: {
    total: 93,
    running: 93,
    maintenance: 0,
    uniqueLocations: 3,
    locationStats: MOCK_LOCATION_STATS,
  },
  search: '',
  setSearch: vi.fn(),
  filterSort: { sort: { key: '', dir: 'asc' }, filters: {} },
  setFilterSort: vi.fn(),
  FS_COLS: [],
  displayRows: [],
  cols: [],
  openNew: vi.fn(),
  openEdit: vi.fn(),
  del: vi.fn(),
  setDetailRec: vi.fn(),
  setPdfItem: vi.fn(),
  setPreviewImageModal: vi.fn(),
  summary: [],
  showSummary: false,
  setShowSummary: vi.fn(),
  toggleLocationFilter: vi.fn(),
  activeLocationFilters: [],
  ...overrides,
})

describe('Machines Views - Zone/Location Breakdown and Filter', () => {
  describe('MachinesDesktopView', () => {
    it('renders zone badges GK1, GK3, GK4 with machine counts', () => {
      const logic = createMockLogic()
      render(<MachinesDesktopView logic={logic} />)

      // Header summary
      expect(screen.getByText('โซน / ตำแหน่ง')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()

      // Zone badges
      expect(screen.getByText('GK1')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('GK3')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument()
      expect(screen.getByText('GK4')).toBeInTheDocument()
      expect(screen.getByText('56')).toBeInTheDocument()
    })

    it('calls toggleLocationFilter when a zone badge is clicked', () => {
      const toggleLocationFilter = vi.fn()
      const logic = createMockLogic({ toggleLocationFilter })
      render(<MachinesDesktopView logic={logic} />)

      const gk3Btn = screen.getByRole('button', { name: /GK3 25/i })
      fireEvent.click(gk3Btn)

      expect(toggleLocationFilter).toHaveBeenCalledWith('GK3')
    })

    it('highlights active zone badge when filtered', () => {
      const logic = createMockLogic({
        activeLocationFilters: ['gk3'],
      })
      render(<MachinesDesktopView logic={logic} />)

      const gk3Btn = screen.getByRole('button', { name: /GK3 25/i })
      expect(gk3Btn.className).toContain('bg-indigo-600')
    })
  })

  describe('MachinesTabletView', () => {
    it('renders zone badges and responds to click', () => {
      const toggleLocationFilter = vi.fn()
      const logic = createMockLogic({ toggleLocationFilter })
      render(<MachinesTabletView logic={logic} />)

      expect(screen.getByText('GK1')).toBeInTheDocument()
      expect(screen.getByText('GK3')).toBeInTheDocument()
      expect(screen.getByText('GK4')).toBeInTheDocument()

      const gk4Btn = screen.getByRole('button', { name: /GK4 56/i })
      fireEvent.click(gk4Btn)
      expect(toggleLocationFilter).toHaveBeenCalledWith('GK4')
    })
  })

  describe('MachinesMobileView', () => {
    it('renders quick zone filter chips and responds to click', () => {
      const toggleLocationFilter = vi.fn()
      const logic = createMockLogic({ toggleLocationFilter })
      render(<MachinesMobileView logic={logic} />)

      expect(screen.getByText(/โซน:/i)).toBeInTheDocument()
      expect(screen.getByText('GK1')).toBeInTheDocument()
      expect(screen.getByText('GK3')).toBeInTheDocument()
      expect(screen.getByText('GK4')).toBeInTheDocument()

      const gk1Btn = screen.getByRole('button', { name: /GK1 12/i })
      fireEvent.click(gk1Btn)
      expect(toggleLocationFilter).toHaveBeenCalledWith('GK1')
    })
  })
})
