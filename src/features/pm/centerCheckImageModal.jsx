import ImagePreviewModal from '../../components/ui/ImagePreviewModal'

export function CenterCheckImageModal({ previewImage, setPreviewImage }) {
  return (
    <>
      {previewImage && (
        <ImagePreviewModal
          url={typeof previewImage === 'object' ? previewImage.url || previewImage.localUrl : previewImage}
          title="รูปถ่ายสภาพเข็ม / ชิ้นส่วน"
          open={!!previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </>
  )
}
