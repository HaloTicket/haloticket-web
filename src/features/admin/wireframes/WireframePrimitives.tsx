import { useState, type ReactNode } from "react";

import { AdminModal } from "@/components/admin/AdminModal";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

import "./wireframes.css";

type ContentProps = { title: string; description?: string; children: ReactNode };

export function PreviewPage({ title, description, children }: ContentProps) {
  return <div className="wf-page">
    <div className="wf-heading"><AdminPageHeader title={title} description={description} /><span className="wf-badge">Wireframe</span></div>
    {children}
    <p className="wf-footnote">Dữ liệu minh họa để xem bố cục và luồng thao tác. Thay đổi trên bản xem trước không được lưu.</p>
  </div>;
}

export function PreviewPanel({ title, description, children }: ContentProps) {
  return <section className="wf-panel" aria-label={title}>
    <div className="wf-panel-heading"><h2>{title}</h2>{description && <p>{description}</p>}</div>
    {children}
  </section>;
}

type PreviewTableProps = {
  columns: string[];
  rows: string[][];
  onSelect?: (row: string[], index: number) => void;
};

export function PreviewTable({ columns, rows, onSelect }: PreviewTableProps) {
  return <div className="wf-table-scroll"><table className="wf-table">
    <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
    <tbody>{rows.length ? rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={cellIndex}>{onSelect && cellIndex === 0 ? <button className="wf-row-link" type="button" onClick={() => onSelect(row, index)} aria-label={`Xem chi tiết ${cell}`}>{cell}</button> : cell}</td>)}</tr>) : <tr><td colSpan={columns.length}>Không có dữ liệu minh họa phù hợp.</td></tr>}</tbody>
  </table></div>;
}

type PreviewButtonProps = { children: ReactNode; onClick?: () => void; secondary?: boolean; disabled?: boolean; type?: "button" | "submit" };

export function PreviewButton({ children, onClick, secondary = false, disabled = false, type = "button" }: PreviewButtonProps) {
  const [explaining, setExplaining] = useState(false);
  return <>
    <button type={type} className={`wf-button${secondary ? " wf-button-secondary" : ""}`} disabled={disabled} onClick={onClick ?? (() => setExplaining(true))}>{children}</button>
    {explaining && <AdminModal title="Thao tác trong bản xem trước" subtitle="Wireframe" onClose={() => setExplaining(false)} maxWidth="sm"><p className="wf-copy">Nút này minh họa vị trí thao tác. Bản xem trước không lưu hoặc gửi dữ liệu.</p></AdminModal>}
  </>;
}
