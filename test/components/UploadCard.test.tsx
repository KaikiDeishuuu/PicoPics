import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UploadCard } from "@/components/UploadCard";

describe("UploadCard", () => {
  it("renders upload area correctly", () => {
    const mockOnUpload = vi.fn();
    render(<UploadCard onUpload={mockOnUpload} />);

    expect(screen.getByText("拖拽文件到这里")).toBeInTheDocument();
    expect(screen.getByText("或点击选择文件")).toBeInTheDocument();
  });

  it("shows file type and size limits", () => {
    const mockOnUpload = vi.fn();
    render(<UploadCard onUpload={mockOnUpload} />);

    expect(screen.getByText(/支持.*image\/jpeg.*image\/png/)).toBeInTheDocument();
    expect(screen.getByText(/最大.*10MB/)).toBeInTheDocument();
  });
});
