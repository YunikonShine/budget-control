"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "./KanbanBoard.module.scss";

type Props = { id: string; title: string; onClick: () => void };

export default function SortableCard({ id, title, onClick }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${isDragging ? styles.isDragging : ""}`}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (isDragging) return;
        onClick?.();
      }}>
      <div className={styles.cardTitle}>{title}</div>
    </div>
  );
}
