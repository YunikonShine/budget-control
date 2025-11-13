"use client";
import React, { useEffect, useState } from "react";
import {
  Active,
  DndContext,
  DragEndEvent,
  Over,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverEvent,
} from "@dnd-kit/core";

import { Droppable } from "./Droppable";
import { Draggable } from "./Draggable";
import { Card, Column as ColumnType } from "@/components/kanban/types";

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "../cards/SortableItem";

import style from "./page.module.scss";
import KanbanModal from "@/components/kanban/Modal";
import { Column } from "./Column";

type ColumnWithParent = ColumnType & { parent: string };

export default function Page() {
  const [columns, setColumns] = useState<ColumnWithParent[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
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
    setAdding(false);
    createColumn(title);
    setTitle("");
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/columns`
        );
        const data = await res.json();
        if (Array.isArray(data))
          setColumns(
            data.map((col: ColumnType) => ({ ...col, parent: col.id }))
          );
      } catch (e) {
        console.error("Failed to load board", e);
      }
    })();
  }, []);

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over) return;
    handleDragMove({ active, over } as DragOverEvent);
    active.data.current?.type === "column"
      ? await sendColumnUpdateRequest(active)
      : await sendCardUpdateRequest(active);
  };

  const sendColumnUpdateRequest = async (active: Active) => {
    const cols = [...columns];
    const activeColIndex = cols.findIndex((c) => c.id === active.id);
    if (activeColIndex === -1) return cols;
    const column = cols[activeColIndex];

    const columnId = column.id;
    const toOrder = activeColIndex;
    const projectId = "default";

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/columns/move`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columnId,
          toOrder,
          projectId,
        }),
      }
    );
    if (!res.ok) {
      //TODO rollback UI change
      console.error("Failed to move column");
    }
  };

  const replaceColumn = async (active: Active, over: Over) => {
    setColumns((cols) => {
      const activeColIndex = cols.findIndex((c) => c.id === active.id);
      const overColIndex = cols.findIndex((c) => c.id === over.id);
      if (activeColIndex === -1 || overColIndex === -1) return cols;
      const newCols = [...cols];
      const [movedCol] = newCols.splice(activeColIndex, 1);
      newCols.splice(overColIndex, 0, movedCol);
      return newCols;
    });
  };

  const sendCardUpdateRequest = async (active: Active) => {
    const cols = [...columns];
    let activeCardIndex = -1;
    let activeColumnIndex = -1;

    for (let i = 0; i < cols.length; i++) {
      const aIndex = cols[i].cards.findIndex((c) => c.id === active.id);
      if (aIndex !== -1) {
        activeCardIndex = aIndex;
        activeColumnIndex = i;
        break;
      }
    }

    const card = cols[activeColumnIndex].cards[activeCardIndex];
    const activeCardId = card.id;
    const toColumnId = cols[activeColumnIndex].id;
    const toOrder = activeCardIndex;
    const projectId = "default";

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/cards/move`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: activeCardId,
          toColumnId,
          toOrder,
          projectId,
        }),
      }
    );
    if (!res.ok) {
      //TODO rollback UI change
      console.error("Failed to move card");
    }
  };

  const replaceCard = async (active: Active, over: Over) => {
    let cols = [...columns];
    let overColIndex = -1;
    let oldColumnIndex = -1;
    let activeCardIndex = -1;

    if (over.data.current?.type === "column") {
      overColIndex = cols.findIndex((c) => c.id === over.id);
    } else {
      for (let i = 0; i < cols.length; i++) {
        const oIndex = cols[i].cards.findIndex((c) => c.id === over.id);
        if (oIndex !== -1) {
          overColIndex = i;
          break;
        }
      }
    }

    for (let i = 0; i < cols.length; i++) {
      const aIndex = cols[i].cards.findIndex((c) => c.id === active.id);
      if (aIndex !== -1) {
        activeCardIndex = aIndex;
        oldColumnIndex = i;
        break;
      }
    }

    if (
      oldColumnIndex === -1 ||
      overColIndex === -1 ||
      activeCardIndex === -1
    ) {
      return cols;
    }

    cols[oldColumnIndex].cards[activeCardIndex].columnId =
      cols[overColIndex].id;

    const newCols = [...cols];
    const [movedCard] = newCols[oldColumnIndex].cards.splice(
      activeCardIndex,
      1
    );

    let insertIndex = undefined;
    if (over.data.current?.type === "card") {
      const overCardIndex = cols[overColIndex].cards.findIndex(
        (c) => c.id === over.id
      );
      if (overCardIndex !== -1) {
        const activeRect: any = (active as any).rect?.current?.translated;
        const overRect: any = (over as any).rect;
        const isBelow =
          activeRect && overRect
            ? activeRect.top > overRect.top + overRect.height / 2
            : false;
        insertIndex = overCardIndex + (isBelow ? 1 : 0);
        newCols[overColIndex].cards.splice(insertIndex, 0, movedCard);
      }
    } else {
      newCols[overColIndex].cards.push(movedCard);
    }

    if (
      (insertIndex !== undefined && insertIndex != activeCardIndex) ||
      oldColumnIndex != overColIndex
    ) {
      setColumns(newCols);
    }
  };

  const handleDragMove = async ({ active, over }: DragOverEvent) => {
    if (!over) return;
    active.id = active.id.toString().replace(/^(column|card)-/, "");
    over.id = over.id.toString().replace(/^(column|card)-/, "");
    if (active.id === over.id) return;
    active.data.current?.type === "column"
      ? replaceColumn(active, over)
      : replaceCard(active, over);
  };

  async function createCard(columnId: string, title: string) {
    if (!title.trim()) return;
    let newCard: Card | null = null;

    setColumns((prev) => {
      const next = prev.map((c) => ({ ...c, cards: [...c.cards] }));
      const col = next.find((c) => c.id === columnId);
      if (!col) return prev;
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      newCard = {
        id: tempId,
        title: title.trim(),
        order: col.cards.length,
        columnId,
      };
      col.cards.push(newCard);
      return next;
    });

    if (!newCard) {
      //TODO rollback UI change
      console.error("Failed to create card");
      return;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCard),
    });
    if (!res.ok) {
      //TODO rollback UI change
      console.error("Failed to create card");
    }
  }

  async function createColumn(title: string) {
    if (!title.trim()) return;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let newColumn: ColumnType = {
      id: tempId,
      name: title.trim(),
      cards: [],  
      order: columns.length,
    };

    setColumns((prev) => {
      prev.push({ ...newColumn, parent: newColumn.id });
      return prev;
    });

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/columns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newColumn),
    });
    if (!res.ok) {
      //TODO rollback UI change
      console.error("Failed to create column");
    }
  }

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
        onDragMove={handleDragMove}>
        <div
          style={{
            display: "flex",
            width: "50vw",
            justifyContent: "space-around",
          }}>
          {columns.map((column) => (
            <SortableContext
              items={column.cards.map((card) => card.id)}
              strategy={verticalListSortingStrategy}>
              <Column
                key={column.id}
                column={column}
                setSelectedCard={setSelectedCard}
                createCard={createCard}
              />
            </SortableContext>
          ))}
        </div>
      </DndContext>
      <div>
        {!adding ? (
          <button type="button" onClick={startAdd}>
            + Adicionar Coluna
          </button>
        ) : (
          <div>
            <textarea
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
            <div>
              <button
                type="button"
                onClick={submitAdd}
                disabled={!title.trim()}>
                Criar
              </button>
              <button type="button" onClick={cancelAdd}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
      <KanbanModal
        selectedCard={selectedCard}
        closeModal={() => setSelectedCard(null)}
      />
    </div>
  );
}
