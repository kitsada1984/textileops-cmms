import ImagePreviewModal from '../../components/ui/ImagePreviewModal'

export function NeedleImageModal({ previewImageModal, setPreviewImageModal }) {
  return (
      <ImagePreviewModal
        open={!!previewImageModal}
        onClose={() => setPreviewImageModal(null)}
        url={previewImageModal?.url}
        title={previewImageModal?.title || 'รูปถ่ายสภาพเข็ม'}
      />
  )
}
