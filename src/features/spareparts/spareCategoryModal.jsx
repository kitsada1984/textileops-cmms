import Modal from '../../components/ui/Modal'
import { Check, Layers, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'

export function SpareCategoryModal({ categoryModalOpen, setCategoryModalOpen, newCategoryInput, setNewCategoryInput, editingCategory, editingCategoryValue, setEditingCategoryValue, categoryActionLoading, handleAddCategory, startEditCategory, cancelEditCategory, handleSaveEditCategory, handleDeleteCategory, handleResetDefaults, allCategories, isDefaultCategory, categoryCounts, t }) {
  return (
      <Modal
        open={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false)
          setNewCategoryInput('')
        }}
        title="🏷️ จัดการหมวดหมู่อะไหล่"
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={categoryActionLoading}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
            >
              รีเซ็ตเป็นค่าเริ่มต้น
            </button>
            <button
              type="button"
              className="btn-outline px-4 text-xs"
              onClick={() => {
                setCategoryModalOpen(false)
                setNewCategoryInput('')
                cancelEditCategory()
              }}
            >
              {t('close') || 'ปิด'}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            เพิ่ม ลบ หรือแก้ไขชื่อหมวดหมู่อะไหล่ในดรอปดาวน์ ระบบจะบันทึกและอัปเดตตัวเลือกทันที
          </p>

          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Plus size={13} className="text-blue-500" />
              <span>เพิ่มหมวดหมู่ใหม่</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="input flex-1 text-xs"
                placeholder="ระบุชื่อหมวดหมู่ เช่น ลูกปืน, สายพาน, น้ำมันหล่อลื่น..."
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                disabled={categoryActionLoading}
              />
              <button
                type="submit"
                disabled={categoryActionLoading || !newCategoryInput.trim()}
                className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5 flex-shrink-0"
              >
                {categoryActionLoading ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Plus size={13} />
                )}
                <span>เพิ่ม</span>
              </button>
            </div>
          </form>

          {/* Categories List */}
          <div className="space-y-1.5">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
              <span className="flex items-center gap-1.5">
                <Layers size={13} className="text-blue-500" />
                <span>รายการตัวเลือกในดรอปดาวน์ ({allCategories.length})</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                (คลิก ✏️ เพื่อแก้ไขชื่อ หรือ 🗑️ เพื่อลบ)
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {allCategories.map((cat) => {
                const isEditing = editingCategory === cat
                const isDefault = isDefaultCategory(cat)
                const count = categoryCounts[cat] || 0

                if (isEditing) {
                  return (
                    <div
                      key={cat}
                      className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-400 dark:border-blue-600 shadow-sm"
                    >
                      <input
                        type="text"
                        className="input flex-1 text-xs py-1 px-2.5 h-8 bg-white dark:bg-slate-900 font-medium"
                        value={editingCategoryValue}
                        onChange={(e) => setEditingCategoryValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleSaveEditCategory(cat)
                          } else if (e.key === 'Escape') {
                            cancelEditCategory()
                          }
                        }}
                        autoFocus
                        disabled={categoryActionLoading}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditCategory(cat)}
                        disabled={categoryActionLoading || !editingCategoryValue.trim()}
                        className="btn-primary text-xs p-1.5 h-8 w-8 flex items-center justify-center flex-shrink-0"
                        title="บันทึกชื่อหมวดหมู่"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditCategory}
                        disabled={categoryActionLoading}
                        className="btn-outline text-xs p-1.5 h-8 w-8 flex items-center justify-center flex-shrink-0 text-slate-500 hover:text-slate-700"
                        title="ยกเลิก"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                }

                return (
                  <div
                    key={cat}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
                        {cat}
                      </span>
                      {isDefault && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                          ค่าเริ่มต้น
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 mr-1">
                        {count} รายการ
                      </span>

                      <button
                        type="button"
                        onClick={() => startEditCategory(cat)}
                        disabled={categoryActionLoading}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title={`แก้ไขชื่อหมวดหมู่ ${cat}`}
                      >
                        <Pencil size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        disabled={categoryActionLoading}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title={`ลบหมวดหมู่ ${cat}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Modal>
  )
}
