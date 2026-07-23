import { z } from "zod";

import { validateLessonResourceMetadata } from "@/features/lesson-resources/config";

export const lessonResourceFileSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(255),
    fileSizeBytes: z.number().int().positive(),
  })
  .superRefine((value, context) => {
    const error = validateLessonResourceMetadata(value);
    if (error) context.addIssue({ code: "custom", message: error });
  });

export const prepareLessonResourceUploadSchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid(),
  file: lessonResourceFileSchema,
});

export const lessonResourceUploadIdSchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid(),
  resourceId: z.string().uuid(),
});

export const prepareLessonContentUploadSchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid(),
  lessonType: z.enum(["video", "pdf"]),
  file: lessonResourceFileSchema,
});

export const lessonContentUploadPathSchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid(),
  storagePath: z.string().min(1).max(1024),
});

export type LessonResourceFileInput = z.infer<typeof lessonResourceFileSchema>;
