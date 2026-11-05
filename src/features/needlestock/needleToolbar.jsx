import { LayoutGrid, Search, Table, X } from 'lucide-react'
import { GRADES, LOCATIONS, MACHINE_TYPES, GAUGES } from './needleSetModals.jsx'

export function NeedleToolbar({ searchQuery, setSearchQuery, filterLocation, setFilterLocation, filterGrade, setFilterGrade, filterMachineType, setFilterMachineType, filterGauge, setFilterGauge, viewMode, setViewMode, filteredSets, onlyLowStock, setOnlyLowStock }) {
  return (
            <section className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {/* Search */}
                <div className="relative sm:col-span-2 lg:col-span-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหา: รหัสเครื่อง, รุ่นเข็ม, หมายเหตุ, ที่เก็บ"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  />
                </div>

                {/* Location Filter */}
                <div>
                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition font-medium"
                  >
                    <option value="">ทุกตำแหน่ง (All Locations)</option>
                    {LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                {/* Grade Filter */}
                <div>
                  <select
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  >
                    <option value="">ทุกเกรด (All Grades)</option>
                    {GRADES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Machine Type Filter */}
                <div>
                  <select
                    value={filterMachineType}
                    onChange={(e) => setFilterMachineType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  >
                    <option value="">ทุกประเภทเครื่อง</option>
                    {MACHINE_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Gauge Filter */}
                <div>
                  <select
                    value={filterGauge}
                    onChange={(e) => setFilterGauge(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  >
                    <option value="">ทุกเบอร์เกจ</option>
                    {GAUGES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status bar & View toggle */}
              <div className="flex flex-wrap justify-between items-center pt-2 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center space-x-2">
                  <span>พบทั้งหมด: <strong className="text-slate-800 font-semibold">{filteredSets.length.toLocaleString()}</strong> รายการ</span>
                  <span className="text-slate-300">|</span>
                  <span>จำนวนเข็มรวม: <strong className="text-sky-600 font-semibold">{filteredSets.reduce((sum, s) => sum + (parseInt(s.quantity, 10) || 0), 0).toLocaleString()}</strong> เล่ม</span>
                </div>

                <div className="flex items-center space-x-3 mt-1 sm:mt-0">
                  {(searchQuery || filterLocation || filterGrade || filterMachineType || filterGauge || onlyLowStock) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setFilterLocation('')
                        setFilterGrade('')
                        setFilterMachineType('')
                        setFilterGauge('')
                        setOnlyLowStock(false)
                      }}
                      className="text-slate-500 hover:text-rose-600 transition flex items-center space-x-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>ล้างตัวกรอง</span>
                    </button>
                  )}

                  {/* View Mode Switcher */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition flex items-center space-x-1 ${
                        viewMode === 'grid' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>การ์ด</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition flex items-center space-x-1 ${
                        viewMode === 'table' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" />
                      <span>ตาราง</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
  )
}
