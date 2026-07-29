export type LessonResourceKind = "video" | "pdf" | "docx" | "image";

interface LessonResourceRule {
  kind: LessonResourceKind;
  label: string;
  maxBytes: number;
  extensions: readonly string[];
}

export const MAX_LESSON_RESOURCES = 10;
// Project hiện dùng Supabase Free, có global upload limit 50MB. Giữ giới hạn
// ứng dụng bằng giới hạn hạ tầng để lỗi được báo trước khi bắt đầu upload.
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 50 * 1024 * 1024;
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export const LESSON_RESOURCE_RULES = {
  "video/mp4": {
    kind: "video",
    label: "MP4",
    maxBytes: VIDEO_MAX_BYTES,
    extensions: ["mp4"],
  },
  "video/webm": {
    kind: "video",
    label: "WEBM",
    maxBytes: VIDEO_MAX_BYTES,
    extensions: ["webm"],
  },
  "video/quicktime": {
    kind: "video",
    label: "MOV",
    maxBytes: VIDEO_MAX_BYTES,
    extensions: ["mov"],
  },
  "application/pdf": {
    kind: "pdf",
    label: "PDF",
    maxBytes: DOCUMENT_MAX_BYTES,
    extensions: ["pdf"],
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    kind: "docx",
    label: "DOCX",
    maxBytes: DOCUMENT_MAX_BYTES,
    extensions: ["docx"],
  },
  "image/jpeg": {
    kind: "image",
    label: "JPEG",
    maxBytes: IMAGE_MAX_BYTES,
    extensions: ["jpg", "jpeg"],
  },
  "image/png": {
    kind: "image",
    label: "PNG",
    maxBytes: IMAGE_MAX_BYTES,
    extensions: ["png"],
  },
  "image/webp": {
    kind: "image",
    label: "WEBP",
    maxBytes: IMAGE_MAX_BYTES,
    extensions: ["webp"],
  },
  "image/gif": {
    kind: "image",
    label: "GIF",
    maxBytes: IMAGE_MAX_BYTES,
    extensions: ["gif"],
  },
  "image/avif": {
    kind: "image",
    label: "AVIF",
    maxBytes: IMAGE_MAX_BYTES,
    extensions: ["avif"],
  },
} as const satisfies Record<string, LessonResourceRule>;

export type LessonResourceMimeType = keyof typeof LESSON_RESOURCE_RULES;

export const LESSON_RESOURCE_ACCEPT = Object.keys(LESSON_RESOURCE_RULES).join(",");

export interface LessonResourceFileMetadata {
  name: string;
  mimeType: string;
  fileSizeBytes: number;
}

export function getLessonResourceRule(mimeType: string): LessonResourceRule | null {
  return LESSON_RESOURCE_RULES[mimeType as LessonResourceMimeType] ?? null;
}

export function validateLessonResourceMetadata(
  metadata: LessonResourceFileMetadata,
): string | null {
  const rule = getLessonResourceRule(metadata.mimeType);
  if (!rule) {
    return "Chỉ chấp nhận video MP4/WEBM/MOV, PDF, DOCX và ảnh JPEG/PNG/WEBP/GIF/AVIF.";
  }

  if (!Number.isInteger(metadata.fileSizeBytes) || metadata.fileSizeBytes <= 0) {
    return "File rỗng hoặc có dung lượng không hợp lệ.";
  }

  if (metadata.fileSizeBytes > rule.maxBytes) {
    return `${rule.label} có kích thước tối đa ${formatFileSize(rule.maxBytes)}.`;
  }

  const extension = metadata.name.toLowerCase().split(".").at(-1) ?? "";
  if (!rule.extensions.includes(extension as never)) {
    return `Phần mở rộng file không khớp với MIME type ${rule.label}.`;
  }

  return null;
}

export function validateLessonContentMetadata(
  metadata: LessonResourceFileMetadata,
  lessonType: "video" | "pdf",
): string | null {
  const validationError = validateLessonResourceMetadata(metadata);
  if (validationError) return validationError;

  const rule = getLessonResourceRule(metadata.mimeType);
  if (lessonType === "video" && rule?.kind !== "video") {
    return "Nội dung video chỉ chấp nhận MP4, WEBM hoặc MOV.";
  }
  if (lessonType === "pdf" && rule?.kind !== "pdf") {
    return "Nội dung PDF chỉ chấp nhận file PDF.";
  }

  return null;
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
