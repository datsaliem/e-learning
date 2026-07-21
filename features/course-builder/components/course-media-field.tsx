"use client";

import * as React from "react";
import { ImageIcon, UploadIcon, VideoIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { CourseMediaKind } from "@/features/course-builder/constants";

interface CourseMediaFieldProps {
  kind: CourseMediaKind;
  file: File | null;
  previewUrl: string;
  disabled?: boolean;
  onSelect: (file: File) => void;
}

const MEDIA_CONFIG = {
  thumbnail: {
    label: "Thumbnail",
    description: "JPG, PNG hoặc WEBP · tối đa 5MB · tỷ lệ khuyên dùng 16:9",
    accept: "image/jpeg,image/png,image/webp",
    buttonLabel: "Chọn ảnh",
  },
  trailer: {
    label: "Trailer",
    description: "MP4, WEBM hoặc MOV · tối đa 200MB",
    accept: "video/mp4,video/webm,video/quicktime",
    buttonLabel: "Chọn video",
  },
} as const;

export function CourseMediaField({
  kind,
  file,
  previewUrl,
  disabled,
  onSelect,
}: CourseMediaFieldProps) {
  const inputId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const config = MEDIA_CONFIG[kind];

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";
    if (selectedFile) onSelect(selectedFile);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>{config.label}</Label>

      <div className="bg-muted/40 relative aspect-video overflow-hidden rounded-xl border border-dashed">
        {previewUrl && kind === "thumbnail" ? (
          <div
            role="img"
            aria-label="Xem trước thumbnail khoá học"
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${JSON.stringify(previewUrl)})` }}
          />
        ) : previewUrl && kind === "trailer" ? (
          <video
            src={previewUrl}
            controls
            preload="metadata"
            aria-label="Xem trước trailer khoá học"
            className="size-full bg-black object-contain"
          />
        ) : (
          <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2">
            {kind === "thumbnail" ? (
              <ImageIcon className="size-8" aria-hidden="true" />
            ) : (
              <VideoIcon className="size-8" aria-hidden="true" />
            )}
            <span className="text-xs">Chưa có {config.label.toLowerCase()}</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={config.accept}
        className="sr-only"
        disabled={disabled}
        onChange={handleChange}
        aria-describedby={`${inputId}-description`}
      />

      <div className="flex items-center justify-between gap-3">
        <p id={`${inputId}-description`} className="text-muted-foreground text-xs">
          {file ? file.name : config.description}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="shrink-0"
        >
          <UploadIcon aria-hidden="true" />
          {config.buttonLabel}
        </Button>
      </div>
    </div>
  );
}
