"use client";

import React, { useState } from "react";
import { useDraggable } from "@dnd-kit/core";

export function Draggable(props: {
  id: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  type: string;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: props.id,
      data: {
        type: props.type,
      },
    });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        ...props.style,
      }
    : { ...props.style };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      type="button"
      onClick={(e) => {
        if (isDragging) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        props.onClick?.();
      }}>
      {props.children}
    </button>
  );
}
