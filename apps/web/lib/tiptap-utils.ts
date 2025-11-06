import type { Node as TiptapNode } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import {
  AllSelection,
  NodeSelection,
  Selection,
  TextSelection,
} from "@tiptap/pm/state";
import type { Editor, NodeWithPos } from "@tiptap/react";

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
// Client-side target to avoid server JSON body size limits when sending base64.
// Base64 adds ~33%, so 750KB binary ~ 1MB base64; plus small JSON overhead.
const TARGET_UPLOAD_BYTES = 750 * 1024; // ~0.73 MiB

export const MAC_SYMBOLS: Record<string, string> = {
  mod: "⌘",
  command: "⌘",
  meta: "⌘",
  ctrl: "⌃",
  control: "⌃",
  alt: "⌥",
  option: "⌥",
  shift: "⇧",
  backspace: "Del",
  delete: "⌦",
  enter: "⏎",
  escape: "⎋",
  capslock: "⇪",
} as const;

export const SR_ONLY = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  borderWidth: 0,
} as const;

export function cn(
  ...classes: (string | boolean | undefined | null)[]
): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Determines if the current platform is macOS
 * @returns boolean indicating if the current platform is Mac
 */
export function isMac(): boolean {
  return (
    typeof navigator !== "undefined" &&
    navigator.platform.toLowerCase().includes("mac")
  );
}

/**
 * Formats a shortcut key based on the platform (Mac or non-Mac)
 * @param key - The key to format (e.g., "ctrl", "alt", "shift")
 * @param isMac - Boolean indicating if the platform is Mac
 * @param capitalize - Whether to capitalize the key (default: true)
 * @returns Formatted shortcut key symbol
 */
export const formatShortcutKey = (
  key: string,
  isMac: boolean,
  capitalize: boolean = true
) => {
  if (isMac) {
    const lowerKey = key.toLowerCase();
    return MAC_SYMBOLS[lowerKey] || (capitalize ? key.toUpperCase() : key);
  }

  return capitalize ? key.charAt(0).toUpperCase() + key.slice(1) : key;
};

/**
 * Parses a shortcut key string into an array of formatted key symbols
 * @param shortcutKeys - The string of shortcut keys (e.g., "ctrl-alt-shift")
 * @param delimiter - The delimiter used to split the keys (default: "-")
 * @param capitalize - Whether to capitalize the keys (default: true)
 * @returns Array of formatted shortcut key symbols
 */
export const parseShortcutKeys = (props: {
  shortcutKeys: string | undefined;
  delimiter?: string;
  capitalize?: boolean;
}) => {
  const { shortcutKeys, delimiter = "+", capitalize = true } = props;

  if (!shortcutKeys) return [];

  return shortcutKeys
    .split(delimiter)
    .map((key) => key.trim())
    .map((key) => formatShortcutKey(key, isMac(), capitalize));
};

/**
 * Checks if a mark exists in the editor schema
 * @param markName - The name of the mark to check
 * @param editor - The editor instance
 * @returns boolean indicating if the mark exists in the schema
 */
export const isMarkInSchema = (
  markName: string,
  editor: Editor | null
): boolean => {
  if (!editor?.schema) return false;
  return editor.schema.spec.marks.get(markName) !== undefined;
};

/**
 * Checks if a node exists in the editor schema
 * @param nodeName - The name of the node to check
 * @param editor - The editor instance
 * @returns boolean indicating if the node exists in the schema
 */
export const isNodeInSchema = (
  nodeName: string,
  editor: Editor | null
): boolean => {
  if (!editor?.schema) return false;
  return editor.schema.spec.nodes.get(nodeName) !== undefined;
};

/**
 * Moves the focus to the next node in the editor
 * @param editor - The editor instance
 * @returns boolean indicating if the focus was moved
 */
export function focusNextNode(editor: Editor) {
  const { state, view } = editor;
  const { doc, selection } = state;

  const nextSel = Selection.findFrom(selection.$to, 1, true);
  if (nextSel) {
    view.dispatch(state.tr.setSelection(nextSel).scrollIntoView());
    return true;
  }

  const paragraphType = state.schema.nodes.paragraph;
  if (!paragraphType) {
    console.warn("No paragraph node type found in schema.");
    return false;
  }

  const end = doc.content.size;
  const para = paragraphType.create();
  let tr = state.tr.insert(end, para);

  // Place the selection inside the new paragraph
  const $inside = tr.doc.resolve(end + 1);
  tr = tr.setSelection(TextSelection.near($inside)).scrollIntoView();
  view.dispatch(tr);
  return true;
}

/**
 * Checks if a value is a valid number (not null, undefined, or NaN)
 * @param value - The value to check
 * @returns boolean indicating if the value is a valid number
 */
export function isValidPosition(pos: number | null | undefined): pos is number {
  return typeof pos === "number" && pos >= 0;
}

/**
 * Checks if one or more extensions are registered in the Tiptap editor.
 * @param editor - The Tiptap editor instance
 * @param extensionNames - A single extension name or an array of names to check
 * @returns True if at least one of the extensions is available, false otherwise
 */
export function isExtensionAvailable(
  editor: Editor | null,
  extensionNames: string | string[]
): boolean {
  if (!editor) return false;

  const names = Array.isArray(extensionNames)
    ? extensionNames
    : [extensionNames];

  const found = names.some((name) =>
    editor.extensionManager.extensions.some((ext) => ext.name === name)
  );

  if (!found) {
    console.warn(
      `None of the extensions [${names.join(", ")}] were found in the editor schema. Ensure they are included in the editor configuration.`
    );
  }

  return found;
}

/**
 * Finds a node at the specified position with error handling
 * @param editor The Tiptap editor instance
 * @param position The position in the document to find the node
 * @returns The node at the specified position, or null if not found
 */
export function findNodeAtPosition(editor: Editor, position: number) {
  try {
    const node = editor.state.doc.nodeAt(position);
    if (!node) {
      console.warn(`No node found at position ${position}`);
      return null;
    }
    return node;
  } catch (error) {
    console.error(`Error getting node at position ${position}:`, error);
    return null;
  }
}

/**
 * Finds the position and instance of a node in the document
 * @param props Object containing editor, node (optional), and nodePos (optional)
 * @param props.editor The Tiptap editor instance
 * @param props.node The node to find (optional if nodePos is provided)
 * @param props.nodePos The position of the node to find (optional if node is provided)
 * @returns An object with the position and node, or null if not found
 */
export function findNodePosition(props: {
  editor: Editor | null;
  node?: TiptapNode | null;
  nodePos?: number | null;
}): { pos: number; node: TiptapNode } | null {
  const { editor, node, nodePos } = props;

  if (!editor || !editor.state?.doc) return null;

  // Zero is valid position
  const hasValidNode = node !== undefined && node !== null;
  const hasValidPos = isValidPosition(nodePos);

  if (!hasValidNode && !hasValidPos) {
    return null;
  }

  // First search for the node in the document if we have a node
  if (hasValidNode) {
    let foundPos = -1;
    let foundNode: TiptapNode | null = null;

    editor.state.doc.descendants((currentNode, pos) => {
      // TODO: Needed?
      // if (currentNode.type && currentNode.type.name === node!.type.name) {
      if (currentNode === node) {
        foundPos = pos;
        foundNode = currentNode;
        return false;
      }
      return true;
    });

    if (foundPos !== -1 && foundNode !== null) {
      return { pos: foundPos, node: foundNode };
    }
  }

  // If we have a valid position, use findNodeAtPosition
  if (hasValidPos) {
    const nodeAtPos = findNodeAtPosition(editor, nodePos!);
    if (nodeAtPos) {
      return { pos: nodePos!, node: nodeAtPos };
    }
  }

  return null;
}

/**
 * Determines whether the current selection contains a node whose type matches
 * any of the provided node type names.
 * @param editor Tiptap editor instance
 * @param nodeTypeNames List of node type names to match against
 * @param checkAncestorNodes Whether to check ancestor node types up the depth chain
 */
export function isNodeTypeSelected(
  editor: Editor | null,
  nodeTypeNames: string[] = [],
  checkAncestorNodes: boolean = false
): boolean {
  if (!editor || !editor.state.selection) return false;

  const { selection } = editor.state;
  if (selection.empty) return false;

  // Direct node selection check
  if (selection instanceof NodeSelection) {
    const selectedNode = selection.node;
    return selectedNode
      ? nodeTypeNames.includes(selectedNode.type.name)
      : false;
  }

  // Depth-based ancestor node check
  if (checkAncestorNodes) {
    const { $from } = selection;
    for (let depth = $from.depth; depth > 0; depth--) {
      const ancestorNode = $from.node(depth);
      if (nodeTypeNames.includes(ancestorNode.type.name)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check whether the current selection is fully within nodes
 * whose type names are in the provided `types` list.
 *
 * - NodeSelection → checks the selected node.
 * - Text/AllSelection → ensures all textblocks within [from, to) are allowed.
 */
export function selectionWithinConvertibleTypes(
  editor: Editor,
  types: string[] = []
): boolean {
  if (!editor || types.length === 0) return false;

  const { state } = editor;
  const { selection } = state;
  const allowed = new Set(types);

  if (selection instanceof NodeSelection) {
    const nodeType = selection.node?.type?.name;
    return !!nodeType && allowed.has(nodeType);
  }

  if (selection instanceof TextSelection || selection instanceof AllSelection) {
    let valid = true;
    state.doc.nodesBetween(selection.from, selection.to, (node) => {
      if (node.isTextblock && !allowed.has(node.type.name)) {
        valid = false;
        return false; // stop early
      }
      return valid;
    });
    return valid;
  }

  return false;
}

/**
 * Handles image upload with progress tracking and abort capability
 * @param file The file to upload
 * @param onProgress Optional callback for tracking upload progress
 * @param abortSignal Optional AbortSignal for cancelling the upload
 * @returns Promise resolving to the URL of the uploaded image
 */
export const handleImageUpload = async (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  // Validate file
  if (!file) {
    throw new Error("No file provided");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`
    );
  }

  // Opportunistic compression to stay under typical body limits when sending base64 JSON
  let toUpload = file;
  try {
    toUpload = await ensureUnderTargetSize(file, TARGET_UPLOAD_BYTES);
  } catch (err) {
    console.warn("Image compression skipped due to error:", err);
  }

  // For demo/testing: Simulate upload progress. In production, replace the following code
  // with your own upload implementation.
  // for (let progress = 0; progress <= 100; progress += 10) {
  //   if (abortSignal?.aborted) {
  //     throw new Error("Upload cancelled");
  //   }
  //   await new Promise((resolve) => setTimeout(resolve, 500));
  //   onProgress?.({ progress });
  // }

  // Preferred path: direct S3 upload via pre-signed URL
  try {
    // 1) Ask API for a pre-signed URL (no base64 in request)
    const presignRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/upload/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: toUpload.name, mimeType: toUpload.type }),
    });

    if (presignRes.ok) {
      const { uploadUrl, publicUrl } = await presignRes.json();

      // 2) PUT the file directly to S3
      const checksum1 = await computeCRC32Base64(toUpload).catch(() => null);
      const initialHeaders: Record<string, string> = { "Content-Type": toUpload.type };
      if (checksum1) {
        initialHeaders["x-amz-sdk-checksum-algorithm"] = "CRC32";
        initialHeaders["x-amz-checksum-crc32"] = checksum1;
      }
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: initialHeaders,
        body: toUpload,
      });

      if (putRes.ok || putRes.status === 200 || putRes.status === 204) {
        return publicUrl as string;
      }

      // If the PUT failed due to size, try compressing further once and retry
      if (putRes.status === 413) {
        try {
          const tighterTarget = Math.floor(TARGET_UPLOAD_BYTES * 0.5); // ~375KB
          const smaller = await ensureUnderTargetSize(toUpload, tighterTarget);
          const checksum2 = await computeCRC32Base64(smaller).catch(() => null);
          const retryHeaders: Record<string, string> = { "Content-Type": smaller.type };
          if (checksum2) {
            retryHeaders["x-amz-sdk-checksum-algorithm"] = "CRC32";
            retryHeaders["x-amz-checksum-crc32"] = checksum2;
          }
          const retryPut = await fetch(uploadUrl, {
            method: "PUT",
            headers: retryHeaders,
            body: smaller,
          });
          if (retryPut.ok || retryPut.status === 200 || retryPut.status === 204) {
            return publicUrl as string;
          }
        } catch (err) {
          console.warn("Retry PUT after 413 failed:", err);
        }
      }

      // If PUT failed for any other reason, fall through to base64 upload
      const putMsg = await safeReadText(putRes);
      console.warn(`Presigned PUT failed (${putRes.status}):`, putMsg);
    } else {
      const msg = await safeReadText(presignRes);
      console.warn(`Presign request failed (${presignRes.status}):`, msg);
    }
  } catch (err) {
    console.warn("Presigned flow failed, falling back to base64:", err);
  }

  // Fallback path: send as base64 JSON to API (server uploads to S3)
  const postBase64 = async (f: File) => {
    return fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/upload/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: f.name, mimeType: f.type, base64: await fileToBase64(f) }),
    });
  };

  let res = await postBase64(toUpload);
  if (res.status === 413) {
    try {
      const tighterTarget = Math.floor(TARGET_UPLOAD_BYTES * 0.5);
      const moreCompressed = await ensureUnderTargetSize(toUpload, tighterTarget);
      res = await postBase64(moreCompressed);
    } catch (err) {
      console.warn("Retry compression failed after 413:", err);
    }
  }

  if (!res.ok) {
    const msg = await safeReadText(res);
    throw new Error(`Upload failed (${res.status}): ${msg}`);
  }

  const { publicUrl } = await res.json();
  return publicUrl;
};

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result.split(",")[1]); // Get base64 part
      } else {
        reject(new Error("Failed to read file as base64"));
      }
    };
    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };
    reader.readAsDataURL(file);
  });
}

/** Compress image down to a target byte size if needed. No-op if already small. */
async function ensureUnderTargetSize(file: File, targetBytes: number): Promise<File> {
  // If already small enough, return as-is
  if (file.size <= targetBytes) return file;

  // Prefer WEBP for better compression (preserves transparency), fallback to JPEG
  const preferredFormats = ["image/webp", "image/jpeg"] as const;
  const img = await loadImageFromFile(file);

  // Start with a reasonable max dimension to cap huge images
  const maxStartDim = 1920;
  const { width: w, height: h } = img;
  const scale0 = Math.min(1, Math.max(maxStartDim / Math.max(w, h), 0.1));

  let quality = 0.82;
  let scale = scale0;
  let bestBlob: Blob | null = null;

  for (let i = 0; i < 7; i++) {
    const out = await renderToBlob(img, { scale, quality, mimeTypes: preferredFormats });
    if (!out) break;

    if (!bestBlob || out.size < bestBlob.size) bestBlob = out;

    if (out.size <= targetBytes) {
      return fileFromBlob(out, file.name);
    }

    // Adjust knobs: reduce quality first, then dimensions
    if (quality > 0.5) {
      quality = Math.max(0.5, quality * 0.82);
    } else if (scale > 0.5) {
      scale = Math.max(0.5, scale * 0.85);
    } else {
      // As a last resort, drop quality further
      quality = Math.max(0.3, quality * 0.85);
    }
  }

  // Could not reach target; return the smallest produced version if any
  if (bestBlob) return fileFromBlob(bestBlob, file.name);
  return file;
}

function fileFromBlob(blob: Blob, originalName: string): File {
  // Try to keep extension coherent with mime type
  const ext = mimeToExtension(blob.type) || originalName.split(".").pop() || "bin";
  const base = originalName.replace(/\.[^.]+$/g, "");
  const name = `${base}.${ext}`;
  return new File([blob], name, { type: blob.type });
}

function mimeToExtension(mime: string): string | null {
  switch (mime) {
    case "image/webp":
      return "webp";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    default:
      return null;
  }
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };
      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}

async function renderToBlob(
  img: HTMLImageElement,
  opts: { scale: number; quality: number; mimeTypes: readonly string[] }
): Promise<Blob | null> {
  const { scale, quality, mimeTypes } = opts;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, width, height);

  // Try preferred formats in order
  for (const type of mimeTypes) {
    const blob = await canvasToBlob(canvas, type, quality);
    if (blob) return blob;
  }
  // Fallback to PNG
  return await canvasToBlob(canvas, "image/png", 1);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

// -----------------------------
// S3 checksum helpers (CRC32)
// -----------------------------
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

async function computeCRC32Base64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const view = new Uint8Array(buf);
  const val = crc32(view);
  // Convert 32-bit number to 4-byte big-endian and base64-encode
  const arr = new Uint8Array(4);
  arr[0] = (val >>> 24) & 0xff;
  arr[1] = (val >>> 16) & 0xff;
  arr[2] = (val >>> 8) & 0xff;
  arr[3] = val & 0xff;
  let binary = "";
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  // btoa expects binary string
  return btoa(binary);
}

type ProtocolOptions = {
  /**
   * The protocol scheme to be registered.
   * @default '''
   * @example 'ftp'
   * @example 'git'
   */
  scheme: string;

  /**
   * If enabled, it allows optional slashes after the protocol.
   * @default false
   * @example true
   */
  optionalSlashes?: boolean;
};

type ProtocolConfig = Array<ProtocolOptions | string>;

const ATTR_WHITESPACE =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g;

export function isAllowedUri(
  uri: string | undefined,
  protocols?: ProtocolConfig
) {
  const allowedProtocols: string[] = [
    "http",
    "https",
    "ftp",
    "ftps",
    "mailto",
    "tel",
    "callto",
    "sms",
    "cid",
    "xmpp",
  ];

  if (protocols) {
    protocols.forEach((protocol) => {
      const nextProtocol =
        typeof protocol === "string" ? protocol : protocol.scheme;

      if (nextProtocol) {
        allowedProtocols.push(nextProtocol);
      }
    });
  }

  return (
    !uri ||
    uri.replace(ATTR_WHITESPACE, "").match(
      new RegExp(
        // eslint-disable-next-line no-useless-escape
        `^(?:(?:${allowedProtocols.join("|")}):|[^a-z]|[a-z0-9+.\-]+(?:[^a-z+.\-:]|$))`,
        "i"
      )
    )
  );
}

export function sanitizeUrl(
  inputUrl: string,
  baseUrl: string,
  protocols?: ProtocolConfig
): string {
  try {
    const url = new URL(inputUrl, baseUrl);

    if (isAllowedUri(url.href, protocols)) {
      return url.href;
    }
  } catch {
    // If URL creation fails, it's considered invalid
  }
  return "#";
}

/**
 * Update a single attribute on multiple nodes.
 *
 * @param tr - The transaction to mutate
 * @param targets - Array of { node, pos }
 * @param attrName - Attribute key to update
 * @param next - New value OR updater function receiving previous value
 *               Pass `undefined` to remove the attribute.
 * @returns true if at least one node was updated, false otherwise
 */
export function updateNodesAttr<A extends string = string, V = unknown>(
  tr: Transaction,
  targets: readonly NodeWithPos[],
  attrName: A,
  next: V | ((prev: V | undefined) => V | undefined)
): boolean {
  if (!targets.length) return false;

  let changed = false;

  for (const { pos } of targets) {
    // Always re-read from the transaction's current doc
    const currentNode = tr.doc.nodeAt(pos);
    if (!currentNode) continue;

    const prevValue = (currentNode.attrs as Record<string, unknown>)[
      attrName
    ] as V | undefined;
    const resolvedNext =
      typeof next === "function"
        ? (next as (p: V | undefined) => V | undefined)(prevValue)
        : next;

    if (prevValue === resolvedNext) continue;

    const nextAttrs: Record<string, unknown> = { ...currentNode.attrs };
    if (resolvedNext === undefined) {
      // Remove the key entirely instead of setting null
      delete nextAttrs[attrName];
    } else {
      nextAttrs[attrName] = resolvedNext;
    }

    tr.setNodeMarkup(pos, undefined, nextAttrs);
    changed = true;
  }

  return changed;
}

/**
 * Selects the entire content of the current block node if the selection is empty.
 * If the selection is not empty, it does nothing.
 * @param editor The Tiptap editor instance
 */
export function selectCurrentBlockContent(editor: Editor) {
  const { selection, doc } = editor.state;

  if (!selection.empty) return;

  const $pos = selection.$from;
  let blockNode = null;
  let blockPos = -1;

  for (let depth = $pos.depth; depth >= 0; depth--) {
    const node = $pos.node(depth);
    const pos = $pos.start(depth);

    if (node.isBlock && node.textContent.trim()) {
      blockNode = node;
      blockPos = pos;
      break;
    }
  }

  if (blockNode && blockPos >= 0) {
    const from = blockPos;
    const to = blockPos + blockNode.nodeSize - 2; // -2 to exclude the closing tag

    if (from < to) {
      const $from = doc.resolve(from);
      const $to = doc.resolve(to);
      const newSelection = TextSelection.between($from, $to, 1);

      if (newSelection && !selection.eq(newSelection)) {
        editor.view.dispatch(editor.state.tr.setSelection(newSelection));
      }
    }
  }
}
