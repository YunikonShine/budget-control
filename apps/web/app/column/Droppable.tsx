"use client";

import React, { useState } from "react";
import { useDroppable } from "@dnd-kit/core";

export function Droppable(props: { id: string; children: React.ReactNode, style?: React.CSSProperties, type: string }) {
  const { isOver, setNodeRef } = useDroppable({
    id: props.id,
    data: {
      type: props.type
    }
  });
  const style = {
    color: isOver ? "green" : undefined,
    ...props.style,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {props.children}
    </div>
  );
}
