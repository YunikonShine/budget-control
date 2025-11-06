"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import styles from "./KanbanBoard.module.scss";
import KanbanColumn from "./Column";
import type { Card, Column } from "./types";
import Modal from "../modal/Modal";
import KanbanModal from "./Modal";

export default function KanbanBoard({
  projectId = "1",
}: {
  projectId?: string;
}) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Keep the original column of the dragged card to avoid from/to becoming equal after onDragOver moves
  const originColumnIdRef = useRef<string | null>(null);
  // Track which column the pointer is currently over (for consistent highlight)
  const [hoveredColumnId, setHoveredColumnId] = useState<string | null>(null);

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const openModal = (card: Card) => {
    setSelectedCard(card);
  };

  const closeModal = () => {
    setSelectedCard(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Build a quick lookup for cards by id to render DragOverlay efficiently
  const cardById = useMemo(() => {
    const map = new Map<string, Card>();
    for (const col of columns) for (const c of col.cards) map.set(c.id, c);
    return map;
  }, [columns]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/columns`
        );
        const data = await res.json();
        if (!cancelled) setColumns(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load board", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  function findContainerId(id: string | null | undefined): string | null {
    if (!id) return null;
    // If it's a column id
    if (columns.some((c) => c.id === id)) return id;
    // If it's a card id, find its column
    for (const col of columns)
      if (col.cards.some((c) => c.id === id)) return col.id;
    return null;
  }

  const onDragStart = ({ active }: DragStartEvent) => {
    const id = String(active.id);
    setActiveId(id);
    originColumnIdRef.current = findContainerId(id);
    setHoveredColumnId(originColumnIdRef.current);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) {
      setHoveredColumnId(null);
      return;
    }

    const activeCardId = String(active.id);
    const overId = String(over.id);

    const activeContainer = findContainerId(activeCardId);
    const overContainer = findContainerId(overId);
    if (!activeContainer || !overContainer) {
      setHoveredColumnId(null);
      return;
    }

    // Track hovered column for consistent UI feedback even when hovering over inner card droppables
    setHoveredColumnId(overContainer);

    if (activeContainer !== overContainer) {
      setColumns((prev) => {
        const next = prev.map((c) => ({ ...c, cards: [...c.cards] }));
        const src = next.find((c) => c.id === activeContainer);
        const dst = next.find((c) => c.id === overContainer);
        if (!src || !dst) return prev;

        const fromIndex = src.cards.findIndex((c) => c.id === activeCardId);
        if (fromIndex < 0) return prev;
        const [moved] = src.cards.splice(fromIndex, 1);
        moved.columnId = dst.id;

        const overIsCard = dst.cards.some((c) => c.id === overId);
        if (!overIsCard) {
          dst.cards.splice(dst.cards.length, 0, moved);
        } else {
          const toIndex = dst.cards.findIndex((c) => c.id === overId);
          // Decide before/after using pointer vs over rect midpoint
          const activeRect: any = (active as any).rect?.current?.translated;
          const overRect: any = (over as any).rect;
          const isBelow =
            activeRect && overRect
              ? activeRect.top > overRect.top + overRect.height / 2
              : false;
          const insertIndex = toIndex + (isBelow ? 1 : 0);
          dst.cards.splice(insertIndex, 0, moved);
        }

        // Normalize orders (optimistic)
        src.cards.forEach((c, i) => (c.order = i));
        dst.cards.forEach((c, i) => (c.order = i));
        return next;
      });
    }
  };

  const isPersistingRef = useRef(false);
  const lastPayloadKeyRef = useRef<string | null>(null);

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    const activeCardId = String(active.id);
    const overId = over ? String(over.id) : null;

    // Use the original source column captured on drag start
    const fromColumnId = originColumnIdRef.current;
    const toColumnId = findContainerId(overId);

    if (!fromColumnId || !toColumnId) {
      setActiveId(null);
      originColumnIdRef.current = null;
      setHoveredColumnId(null);
      return;
    }

    let finalToOrder = -1;

    setColumns((prev) => {
      const next = prev.map((c) => ({ ...c, cards: [...c.cards] }));
      const src = next.find((c) => c.id === fromColumnId);
      const dst = next.find((c) => c.id === toColumnId);
      if (!src || !dst) return prev;

      // Same container reorder
      if (src.id === dst.id) {
        const oldIndex = src.cards.findIndex((c) => c.id === activeCardId);
        let newIndex = oldIndex;
        const overIsCard = overId
          ? src.cards.some((c) => c.id === overId)
          : false;
        if (!overIsCard) {
          // Dropped over the column itself → place at end
          newIndex = src.cards.length - 1;
        } else {
          const overIndex = src.cards.findIndex((c) => c.id === overId);
          const activeRect: any = (active as any).rect?.current?.translated;
          const overRect: any = (over as any).rect;
          const isBelow =
            activeRect && overRect
              ? activeRect.top > overRect.top + overRect.height / 2
              : false;
          newIndex = overIndex + (isBelow ? 1 : 0);
        }
        if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
          src.cards = arrayMove(src.cards, oldIndex, newIndex);
          src.cards.forEach((c, i) => (c.order = i));
        }
        finalToOrder = src.cards.findIndex((c) => c.id === activeCardId);
      } else {
        // Cross container finalize aligned with final drop target
        const overIsCard = overId
          ? dst.cards.some((c) => c.id === overId)
          : false;
        const overIndex = overIsCard
          ? dst.cards.findIndex((c) => c.id === overId)
          : -1;
        const activeRect: any = (active as any).rect?.current?.translated;
        const overRect: any = (over as any).rect;
        const isBelow =
          activeRect && overRect
            ? activeRect.top > overRect.top + overRect.height / 2
            : false;
        const desiredIndex = overIsCard
          ? overIndex + (isBelow ? 1 : 0)
          : dst.cards.length;

        // If preview already moved the card, reposition it precisely; otherwise move from source
        const currentIdxInDst = dst.cards.findIndex(
          (c) => c.id === activeCardId
        );
        if (currentIdxInDst >= 0) {
          if (currentIdxInDst !== desiredIndex) {
            dst.cards = arrayMove(dst.cards, currentIdxInDst, desiredIndex);
          }
        } else {
          const fromIndex = src.cards.findIndex((c) => c.id === activeCardId);
          if (fromIndex >= 0) {
            const [moved] = src.cards.splice(fromIndex, 1);
            moved.columnId = dst.id;
            dst.cards.splice(desiredIndex, 0, moved);
          }
        }
        src.cards.forEach((c, i) => (c.order = i));
        dst.cards.forEach((c, i) => (c.order = i));
        finalToOrder = dst.cards.findIndex((c) => c.id === activeCardId);
      }

      return next;
    });

    // Persist with the final index where the card ended up
    const toOrder = finalToOrder >= 0 ? finalToOrder : 0;

    const payloadKey = JSON.stringify({
      cardId: activeCardId,
      fromColumnId,
      toColumnId,
      toOrder,
    });
    if (lastPayloadKeyRef.current === payloadKey) {
      setActiveId(null);
      return;
    }
    lastPayloadKeyRef.current = payloadKey;

    if (isPersistingRef.current) {
      setActiveId(null);
      return;
    }

    isPersistingRef.current = true;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/cards/move`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardId: activeCardId,
            fromColumnId,
            toColumnId,
            toOrder,
            projectId,
          }),
        }
      );

      if (!res.ok) {
        console.error("Move failed", await res.text());
        const br = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/columns`
        );
        const fresh = await br.json();
        setColumns(Array.isArray(fresh) ? fresh : []);
      } else {
        const payload = await res.json();
        if (payload?.board?.columns) setColumns(payload.board.columns);
      }
    } catch (e) {
      console.error("Persist move error", e);
      try {
        const br = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/columns`
        );
        const fresh = await br.json();
        setColumns(Array.isArray(fresh) ? fresh : []);
      } catch (e2) {
        console.error(e2);
      }
    } finally {
      isPersistingRef.current = false;
      setTimeout(() => (lastPayloadKeyRef.current = null), 400);
      setActiveId(null);
      originColumnIdRef.current = null;
      setHoveredColumnId(null);
    }
  };

  const activeCard = activeId ? (cardById.get(activeId) ?? null) : null;

  return (
    <div className={styles.board}>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}>
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            hoveredColumnId={hoveredColumnId}
            openModal={openModal}
          />
        ))}

        <DragOverlay>
          {activeCard ? (
            <div
              className={`${styles.card} ${styles.dragOverlay}`}
              style={{ width: 320 }}>
              <div className={styles.cardTitle}>{activeCard.title}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <KanbanModal
        selectedCard={selectedCard}
        closeModal={closeModal}
      />
    </div>
  );
}
