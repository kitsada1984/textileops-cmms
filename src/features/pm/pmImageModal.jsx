import ImagePreviewModal from '../../components/ui/ImagePreviewModal'

export function PMImageModal({ previewImageModal, setPreviewImageModal }) {
  return (
    <>
      {previewImageModal && (
        <ImagePreviewModal
          open={Boolean(previewImageModal)}
          onClose={() => setPreviewImageModal(null)}
          url={previewImageModal.url}
          title={previewImageModal.title}
        />
      )}
    </>
  )
}
