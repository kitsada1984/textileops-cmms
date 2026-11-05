import { Pencil, Trash2, Printer } from 'lucide-react'
import { DetailDrawerActions } from './DrawerActions'

// Hero action buttons moved verbatim from DetailDrawer (props only).
export function DrawerHeroActions({ canEdit, canDelete, onEdit, onDelete, onPdf, extraActions }) {
  return (
    <>
                {(((canEdit || canDelete) && (onEdit || onDelete)) || onPdf || extraActions) && (
                  <DetailDrawerActions>
                    {onPdf && (
                      <button
                        type="button"
                        onClick={onPdf}
                        style={{
                          flex: onEdit ? 'none' : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 6, padding: '9px 16px',
                          borderRadius: 11, fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', transition: 'all 160ms',
                          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                          color: '#ffffff',
                          border: '1px solid rgba(255,255,255,0.15)',
                          boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
                          letterSpacing: '0.01em',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.5)'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.35)'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                        title="ดูเอกสาร PDF และสั่งพิมพ์"
                        aria-label="ดูเอกสาร PDF และสั่งพิมพ์"
                      >
                        <Printer size={12} /> PDF / พิมพ์
                      </button>
                    )}
                    {canEdit && onEdit && (
                      <button
                        type="button"
                        onClick={onEdit}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 6, padding: '9px 0',
                          borderRadius: 11, fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', transition: 'all 160ms',
                          background: 'linear-gradient(135deg, #1a2745 0%, #0d1629 100%)',
                          color: '#ffffff',
                          border: '1px solid rgba(255,255,255,0.10)',
                          boxShadow: '0 2px 8px rgba(10,20,50,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
                          letterSpacing: '0.01em',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #243660 0%, #1a2745 100%)'
                          e.currentTarget.style.boxShadow = '0 4px 18px rgba(10,20,50,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #1a2745 0%, #0d1629 100%)'
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(10,20,50,0.35), inset 0 1px 0 rgba(255,255,255,0.12)'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                        title="แก้ไขข้อมูล"
                        aria-label="แก้ไขข้อมูล"
                      >
                        <Pencil size={12} /> แก้ไข
                      </button>
                    )}
                    {canDelete && onDelete && (
                      <button
                        type="button"
                        onClick={onDelete}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 6, padding: '9px 18px',
                          borderRadius: 11, fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', transition: 'all 160ms',
                          background: 'linear-gradient(135deg, #f43f5e 0%, #dc2626 100%)',
                          color: '#ffffff',
                          border: '1px solid rgba(255,255,255,0.08)',
                          boxShadow: '0 2px 8px rgba(220,38,38,0.30)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(220,38,38,0.45)'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(220,38,38,0.30)'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                        title="ลบข้อมูล"
                        aria-label="ลบข้อมูล"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                    {extraActions}
                  </DetailDrawerActions>
                )}
    </>
  )
}
