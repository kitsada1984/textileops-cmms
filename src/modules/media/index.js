/**
 * src/modules/media/index.js
 * Public interface of the deep Media module.
 */

export {
  uploadMedia,
  uploadMediaBatch,
} from './mediaUploader'

export {
  normalizeImageFile,
  convertHeicDataUrlIfNeeded,
} from '../../utils/imageFileProcessor'

export {
  uploadImageToGoogleDrive,
} from '../../utils/googleDriveUpload'
