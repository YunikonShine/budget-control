'use client';

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';

type Props = {
  cardId?: string;
  initialJson?: any;
  onSaved?: (card: any) => void;
};

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB (ajuste aqui se quiser)

function generateTempSvgPlaceholder(text = 'Uploading…', width = 600, height = 240) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
    <rect width='100%' height='100%' fill='#f3f4f6'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-family='Arial, sans-serif' font-size='18'>${text}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function generateProgressSvg(percent = 0, width = 600, height = 240) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const barWidth = Math.max(2, Math.round((width - 40) * (p / 100)));
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
    <rect width='100%' height='100%' fill='#ffffff'/>
    <rect x='20' y='${height / 2 - 12}' width='${width - 40}' height='24' rx='12' fill='#f3f4f6'/>
    <rect x='20' y='${height / 2 - 12}' width='${barWidth}' height='24' rx='12' fill='#0ea5e9'/>
    <text x='50%' y='${height / 2 + 40}' dominant-baseline='middle' text-anchor='middle' fill='#6b7280' font-family='Arial, sans-serif' font-size='14'>Uploading ${p}%</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function SimpleEditorWithPaste({ cardId, initialJson, onSaved }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, HTMLAttributes: { draggable: 'true' } }),
    ],
    content: initialJson ?? '',
    editorProps: {
      attributes: { class: 'prose max-w-full' },
    },
  });

  const editorRootRef = useRef<HTMLElement | null>(null);

  async function requestUploadUrl(filename: string, mimeType: string) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/upload/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, mimeType }),
    });
    if (!res.ok) {
      throw new Error(`Failed to get upload url: ${await res.text()}`);
    }
    return res.json(); // { uploadUrl, publicUrl }
  }

  // Upload with XHR to allow progress events
  function uploadFileWithProgress(uploadUrl: string, file: File, onProgress: (percent: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);

      // If CORS requires specific headers, ensure backend S3 presign allows them.
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100;
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed with status ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.onabort = () => reject(new Error('Upload aborted'));

      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  // Insert placeholder image node with data-temp-id attribute and initial svg
  function insertPlaceholder(tempId: string) {
    const placeholderSrc = generateTempSvgPlaceholder('Uploading…');
    editor?.chain().focus().setImage({
      src: placeholderSrc,
    //   'data-uploading': 'true',
    //   'data-temp-id': tempId,
      alt: 'uploading',
    }).run();
  }

  // Find image node by tempId and update its attributes (including src)
  function updatePlaceholderSrc(tempId: string, newSrc: string) {
    if (!editor) return;
    const { tr } = editor.state;
    let found = false;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'image' && node.attrs['data-temp-id'] === tempId) {
        const newAttrs = { ...node.attrs, src: newSrc };
        tr.setNodeMarkup(pos, undefined, newAttrs);
        found = true;
        return false; // stop traversal
      }
      return true;
    });
    if (found) editor.view.dispatch(tr);
  }

  // Remove placeholder node by tempId
  function removePlaceholder(tempId: string) {
    if (!editor) return;
    const { tr } = editor.state;
    const toRemove: { from: number; to: number }[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'image' && node.attrs['data-temp-id'] === tempId) {
        toRemove.push({ from: pos, to: pos + node.nodeSize });
      }
      return true;
    });
    if (toRemove.length) {
      toRemove.forEach((r) => tr.delete(r.from, r.to));
      editor.view.dispatch(tr);
    }
  }

  // Main upload handler: uses XHR with progress, updates placeholder SVG progressively
  async function handleFileUpload(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      alert(`Arquivo muito grande. Máx: ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`);
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    insertPlaceholder(tempId);

    try {
      const { uploadUrl, publicUrl } = await requestUploadUrl(file.name, file.type);

      // start upload with progress
      await uploadFileWithProgress(uploadUrl, file, (percent) => {
        const svg = generateProgressSvg(percent);
        updatePlaceholderSrc(tempId, svg);
      });

      // final replacement with actual image url
      updatePlaceholderSrc(tempId, publicUrl);
    } catch (err) {
      console.error('Upload failed', err);
      removePlaceholder(tempId);
      alert('Falha ao enviar imagem. Tente novamente.');
    }
  }

  // Paste & Drop handlers
  useEffect(() => {
    if (!editor) return;
    const root = editor.view.dom as HTMLElement;
    editorRootRef.current = root;

    function onPaste(e: ClipboardEvent) {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((i) => i.kind === 'file' && i.type.startsWith('image/'));
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          e.preventDefault();
          void handleFileUpload(file);
        }
        return;
      }

      const text = e.clipboardData.getData('text');
      if (text && (text.startsWith('http') || text.startsWith('data:'))) {
        if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(text) || text.startsWith('data:image')) {
          e.preventDefault();
          editor.chain().focus().setImage({ src: text }).run();
          return;
        }
      }
      // otherwise allow default paste behaviour
    }

    function onDrop(e: DragEvent) {
      const dt = e.dataTransfer;
      if (!dt) return;
      const files = Array.from(dt.files).filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) return;
      e.preventDefault();
      // set selection at drop position
      const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (pos) editor.chain().focus().setTextSelection(pos.pos).run();
      files.forEach((f) => void handleFileUpload(f));
    }

    root.addEventListener('paste', onPaste as any);
    root.addEventListener('drop', onDrop as any);

    return () => {
      root.removeEventListener('paste', onPaste as any);
      root.removeEventListener('drop', onDrop as any);
    };
  }, [editor]);

  // Optional autosave (debounced)
  useEffect(() => {
    if (!editor || !cardId) return;
    let timer: any = null;

    const handler = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const json = editor.getJSON();
          const html = editor.getHTML();
          const plain = editor.getText();
          await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/cards/${cardId}/description`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ json, html, plain }),
          });
          onSaved?.({ id: cardId });
        } catch (e) {
          console.error('Autosave failed', e);
        }
      }, 1500);
    };

    editor.on('transaction', handler);
    return () => {
      editor.off('transaction', handler);
      if (timer) clearTimeout(timer);
    };
  }, [editor, cardId, onSaved]);

  return <div><EditorContent editor={editor} /></div>;
}
