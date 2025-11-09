"use client";
import React, { useEffect, useState } from "react";
import {
  Active,
  DndContext,
  DragEndEvent,
  Over,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { Droppable } from "./Droppable";
import { Draggable } from "./Draggable";
import { Column } from "@/components/kanban/types";

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "../cards/SortableItem";

import style from "./page.module.scss";

type ColumnWithParent = Column & { parent: string };

export default function Page() {
  const [columns, setColumns] = useState<ColumnWithParent[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
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
          setColumns(data.map((col: Column) => ({ ...col, parent: col.id })));
      } catch (e) {
        console.error("Failed to load board", e);
      }
    })();
  }, []);

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over) return;
    active.data.current?.type === "column"
      ? replaceColumn(active, over)
      : replaceCard(active, over);
  };

  const replaceColumn = async (active: Active, over: Over) => {
    if (active.id !== over.id) {
      setColumns((cols) => {
        const activeColIndex = cols.findIndex((c) => c.id === active.id);
        const overColIndex = cols.findIndex((c) => c.id === over.id);
        if (activeColIndex === -1 || overColIndex === -1) return cols;
        const newCols = [...cols];
        const [movedCol] = newCols.splice(activeColIndex, 1);
        newCols.splice(overColIndex, 0, movedCol);
        return newCols;
      });
    }
  };

  const replaceCard = async (active: Active, over: Over) => {
    setColumns((cols) => {
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

      if (over.data.current?.type === "card") {
        const overCardIndex = cols[overColIndex].cards.findIndex(
          (c) => c.id === over.id
        );
        if (overCardIndex !== -1) {
          newCols[overColIndex].cards.splice(overCardIndex, 0, movedCard);
        }
      } else {
        newCols[overColIndex].cards.push(movedCard);
      }

      return newCols;
    });
  };

  const handleDragOver = async ({ active, over }: DragEndEvent) => {
    
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      >
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
            <Droppable
              key={column.id}
              id={column.id}
              type="column"
              style={{
                width: "5vw",
                height: "30vh",
                background: "blue",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
              }}>
              <Draggable
                id={column.id}
                style={{ background: "red", width: "90%", height: "90%" }}
                type="column">
                <SortableContext
                  key={column.id}
                  items={column.cards.map((card) => card.id)}
                  strategy={verticalListSortingStrategy}>
                  {column.name}
                  <hr style={{ width: "100%" }} />
                  {column.cards.map((card) => (
                    <Droppable
                      key={card.id}
                      id={card.id}
                      type="card"
                      style={{ height: "50px" }}>
                      <Draggable
                        key={card.id}
                        id={card.id}
                        type="card"
                        style={{
                          background: "green",
                          height: "100%",
                          width: "100%",
                        }}>
                        {card.title}
                      </Draggable>
                    </Droppable>
                  ))}
                </SortableContext>
              </Draggable>
            </Droppable>
          </SortableContext>
        ))}
      </div>
    </DndContext>
  );
}
