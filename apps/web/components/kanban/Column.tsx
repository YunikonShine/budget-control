"use client";

import React, { useState } from "react";
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
  onCreateCard,
}: {
  column: ColumnType;
  hoveredColumnId: string | null;
  openModal: (card: any) => void;
  onCreateCard: (columnId: string, title: string) => void | Promise<void>;
}) {
  const { setNodeRef } = useDroppable({ id: column.id });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  const startAdd = () => {
    setAdding(true);
    setTitle("");
  };
  const cancelAdd = () => {
    setAdding(false);
    setTitle("");
  };
  const submitAdd = async () => {
    if (!title.trim()) return;
    await onCreateCard(column.id, title.trim());
    setAdding(false);
    setTitle("");
  };

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
        <div className={styles.addCardArea}>
          {!adding ? (
            <button
              type="button"
              className={styles.addCardButton}
              onClick={startAdd}>
              + Adicionar cartão
            </button>
          ) : (
            <div className={styles.addCardForm}>
              <textarea
                className={styles.addCardInput}
                autoFocus
                rows={3}
                placeholder="Título do cartão"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitAdd();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelAdd();
                  }
                }}
              />
              <div className={styles.addCardActions}>
                <button
                  type="button"
                  className={styles.addCardConfirm}
                  onClick={submitAdd}
                  disabled={!title.trim()}>
                  Criar
                </button>
                <button
                  type="button"
                  className={styles.addCardCancel}
                  onClick={cancelAdd}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
