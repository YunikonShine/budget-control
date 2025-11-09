"use client";

import React, { useState } from "react";
import { useDraggable } from "@dnd-kit/core";

export function Draggable(props: {
  id: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  type: string;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: props.id,
    data: {
      type: props.type
    }
  });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        ...props.style,
      }
    : { ...props.style };

  return (
    <button ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {props.children}
    </button>
  );
}
