"use client";

import React, { useState } from "react";
import { useDroppable } from "@dnd-kit/core";

export function Droppable(props: { id: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: props.id,
  });
  const style = {
    color: isOver ? "green" : undefined,
    width: "5vw",
    height: "30vh",
    background: "blue",
    display: "flex",
    flexDirection: "column",
    alignItems: "self-start",
  };

  return (
    <div ref={setNodeRef} style={style}>
      {props.children}
    </div>
  );
}
