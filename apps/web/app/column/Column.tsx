"use client";
import React, { useState } from "react";

import { Droppable } from "./Droppable";
import { Draggable } from "./Draggable";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Card, Column as ColumnType } from "@/components/kanban/types";

export function Column({
  column,
  setSelectedCard,
  createCard,
}: {
  column: ColumnType;
  setSelectedCard: (card: Card) => void;
  createCard: (columnId: string, title: string) => void;
}) {
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
    createCard(column.id, title);
    setTitle("");
  };

  return (
    <Droppable
      key={"column-" + column.id}
      id={"column-" + column.id}
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
        key={column.id}
        style={{ background: "red", width: "90%", height: "90%" }}
        type="column"
        onClick={() => {}}>
        <div>
          <SortableContext
            key={column.id}
            items={column.cards.map((card) => card.id)}
            strategy={verticalListSortingStrategy}>
            {column.name}
            <hr style={{ width: "100%" }} />
            {column.cards.map((card) => (
              <Droppable
                key={"card-" + card.id}
                id={"card-" + card.id}
                type="card"
                style={{
                  background: "purple",
                  height: "50px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                <Draggable
                  key={card.id}
                  id={card.id}
                  type="card"
                  style={{
                    background: "green",
                    height: "85%",
                    width: "85%",
                  }}
                  onClick={() => setSelectedCard(card)}>
                  {card.title}
                </Draggable>
              </Droppable>
            ))}
          </SortableContext>
          <div>
            {!adding ? (
              <button type="button" onClick={startAdd}>
                + Adicionar cartão
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
        </div>
      </Draggable>
    </Droppable>
  );
}
