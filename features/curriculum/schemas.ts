import { z } from "zod";

export const curriculumLessonTypes = ["video", "text", "pdf", "external_link"] as const;

export const sectionSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(1, "Vui lòng nhập tên section").max(120, "Tối đa 120 ký tự"),
});

export const lessonFormSchema = z
  .object({
    sectionId: z.string().uuid("Section không hợp lệ"),
    title: z.string().trim().min(1, "Vui lòng nhập tiêu đề bài học").max(160),
    lessonType: z.enum(curriculumLessonTypes),
    durationMinutes: z
      .number({ error: "Thời lượng phải là một số" })
      .int("Thời lượng phải là số phút nguyên")
      .min(1, "Tối thiểu 1 phút")
      .max(1440, "Tối đa 1.440 phút"),
    isPreview: z.boolean(),
    content: z.string().max(100_000, "Nội dung quá dài"),
    externalUrl: z.string().trim().max(2048, "URL quá dài"),
  })
  .superRefine((value, context) => {
    if (value.lessonType === "text" && value.content.trim().length === 0) {
      context.addIssue({
        code: "custom",
        path: ["content"],
        message: "Vui lòng nhập nội dung bài học",
      });
    }

    if (value.lessonType === "external_link") {
      const parsedUrl = z.url({ protocol: /^https?$/ }).safeParse(value.externalUrl);
      if (!parsedUrl.success) {
        context.addIssue({
          code: "custom",
          path: ["externalUrl"],
          message: "Vui lòng nhập URL http(s) hợp lệ",
        });
      }
    }
  });

export const lessonMutationSchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid().nullable(),
  values: lessonFormSchema,
});

export const lessonContentSchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid(),
  input: z.object({
    lessonType: z.enum(["video", "pdf"]),
    storagePath: z.string().min(1).max(1024),
  }),
});

export type LessonFormInput = z.infer<typeof lessonFormSchema>;
