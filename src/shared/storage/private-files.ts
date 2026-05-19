type PhotoLike = {
  id?: string | null;
  isPrivate?: boolean | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  mediumUrl?: string | null;
} | null | undefined;

export function getPhotoSrc(photo: PhotoLike) {
  if (!photo) return "";
  if (photo.isPrivate && photo.id) {
    return `/api/photos/${photo.id}`;
  }
  return photo.thumbnailUrl || photo.imageUrl || "";
}

export function getPhotoSrcMedium(photo: PhotoLike) {
  if (!photo) return "";
  if (photo.isPrivate && photo.id) {
    return `/api/photos/${photo.id}`;
  }
  return photo.mediumUrl || photo.imageUrl || "";
}

export function getPhotoSrcFull(photo: PhotoLike) {
  if (!photo) return "";
  if (photo.isPrivate && photo.id) {
    return `/api/photos/${photo.id}`;
  }
  return photo.imageUrl || "";
}
