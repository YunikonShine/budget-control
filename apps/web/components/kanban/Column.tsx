"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import styles from "./KanbanBoard.module.scss";
import SortableCard from "./SortableCard";
import type { Column as ColumnType } from "./types";

export default function KanbanColumn({
  column,
  hoveredColumnId,
  openModal,
}: {
  column: ColumnType;
  hoveredColumnId: string | null;
  openModal: (card: any) => void;
}) {
  const { setNodeRef } = useDroppable({ id: column.id });

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <h3 className={styles.columnTitle}>{column.name}</h3>
        <div className={styles.badge}>{column.cards.length}</div>
      </div>
      <div
        ref={setNodeRef}
        className={`${styles.columnList} ${hoveredColumnId === column.id ? styles.columnListOver : ""}`}>
        <SortableContext
          items={column.cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <SortableCard
              key={card.id}
              id={card.id}
              title={card.title}
              onClick={() => openModal(card)}
            />
          ))}
        </SortableContext>
        {column.cards.length === 0 && (
          <div className={styles.emptyState}>Sem cards</div>
        )}
      </div>
    </div>
  );
}
