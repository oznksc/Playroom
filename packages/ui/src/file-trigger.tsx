import * as React from "react";
import { Upload } from "lucide-react";
import { Button, type ButtonProps } from "./button.js";

export type FileTriggerProps = {
  onSelectFiles: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
};

export function FileTrigger({
  onSelectFiles,
  accept,
  multiple = false,
  disabled = false,
  children,
  variant = "secondary",
  size = "sm",
  className,
}: FileTriggerProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSelectFiles(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={handleClick}
        leftIcon={<Upload size={12} />}
        className={className}
      >
        {children ?? "Upload file…"}
      </Button>
    </>
  );
}
