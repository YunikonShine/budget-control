"use client";

import React from "react";
import Modal from "../modal/Modal";
import { SimpleEditor } from "../tiptap-templates/simple/simple-editor";

export default function KanbanModal({
  selectedCard,
  closeModal,
}: {
  selectedCard: any;
  closeModal: () => void;
}) {
  return (
    <Modal
      isOpen={!!selectedCard}
      onClose={closeModal}
      title={selectedCard?.title ?? "Card"}>
      {selectedCard ? (
        <SimpleEditor cardId={selectedCard?.id} initialJson={selectedCard?.json} />
      ) : null}
    </Modal>
  );
}
