"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
import { DOMParser as PMDOMParser, Slice } from "prosemirror-model";

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Selection } from "@tiptap/extensions";

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar";

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button";
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover";
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "@/components/tiptap-icons/link-icon";

// --- Hooks ---
import { useIsMobile } from "@/hooks/use-mobile";
import { useWindowSize } from "@/hooks/use-window-size";
import { useCursorVisibility } from "@/hooks/use-cursor-visibility";

// --- Components ---
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle";

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils";

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss";

import content from "@/components/tiptap-templates/simple/data/content.json";

// Helper: convert data URL image (from HTML clipboard e.g. Word/PDF) to a File
function dataUrlToFile(dataUrl: string, filename = "pasted-image.png"): File {
  const [meta, base64] = dataUrl.split(",");
  const match = /data:(.*?);base64/.exec(meta || "");
  const mime = match?.[1] || "image/png";
  const bytes = atob(base64 || "");
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
}: {
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  isMobile: boolean;
}) => {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
        <ListDropdownMenu
          types={["bulletList", "orderedList", "taskList"]}
          portal={isMobile}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Add" />
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}

      <ToolbarGroup>
        <ThemeToggle />
      </ToolbarGroup>
    </>
  );
};

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link";
  onBack: () => void;
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
);

type Props = {
  cardId: string;
  initialJson?: any;
  onSaved?: (card: any) => void;
};

export function SimpleEditor({ cardId, initialJson, onSaved }: Props) {
  const isMobile = useIsMobile();
  const { height } = useWindowSize();
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  );
  const toolbarRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
      handlePaste: (view, event) => {
        const e = event as ClipboardEvent;
        const dt = e.clipboardData;
        const items = Array.from(dt?.items ?? []);
        const imageFiles = items
          .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
          .map((it) => it.getAsFile())
          .filter((f): f is File => !!f);

        // Probe HTML for embedded data images (common when pasting from Word/PDF)
        const html = dt?.getData("text/html") || "";
        let dataImageSrcs: string[] = [];
        let fileProtocolSrcs: string[] = [];
        let hasAnyImgInHtml = false;
        if (html) {
          try {
            const doc = new DOMParser().parseFromString(html, "text/html");
            const imgs = Array.from(doc.querySelectorAll("img"));
            hasAnyImgInHtml = imgs.length > 0;
            dataImageSrcs = imgs
              .map((img) => img.getAttribute("src") || "")
              .filter(Boolean);
            fileProtocolSrcs = imgs
              .map((img) => img.getAttribute("src") || "")
              .filter((src) => !!src && /^file:/i.test(src));
          } catch (err) {
            // ignore parser errors; fallback to default behavior
          }
        }

        // Helper: paste sanitized HTML (strip <img> tags) preserving formatting
        const pasteSanitizedHtml = (htmlString: string) => {
          const sanitizedHtml = htmlString.replace(/<img[^>]*>/gi, "");
          const container = document.createElement("div");
          container.innerHTML = sanitizedHtml;
          const pmDoc = PMDOMParser.fromSchema(view.state.schema).parse(container);
          const slice = new Slice(pmDoc.content, 0, 0);
          const tr = view.state.tr.replaceSelection(slice).scrollIntoView();
          view.dispatch(tr);
        };

        // Case A: We have real image files in clipboard
        if (imageFiles.length) {
          const plain = dt?.getData("text/plain");
          const hasHtml = !!html;
          const hasText = !!(plain && plain.trim());

          // A1: Mixed content (HTML/text + files): prevent default if HTML contains any <img>
          // to avoid pasting file:// images, paste sanitized HTML (no <img>),
          // then upload and insert images after the pasted content.
          if (hasHtml || hasText) {
            e.preventDefault();

            if (hasHtml) {
              pasteSanitizedHtml(html);
            } else if (hasText) {
              // Insert plain text when there's no HTML
              const { state, dispatch } = view;
              dispatch(state.tr.insertText(plain!).scrollIntoView());
            }

            // Now upload files and insert images sequentially
            (async () => {
              for (const file of imageFiles) {
                try {
                  const url = await handleImageUpload(file);
                  const { state, dispatch } = view;
                  const { image, paragraph } = state.schema.nodes as any;
                  if (!image) continue;
                  const imageNode = image.create({ src: url, alt: file.name });
                  let tr = state.tr.insert(state.selection.to, imageNode).scrollIntoView();
                  if (paragraph) {
                    tr = tr.insert(tr.selection.to, paragraph.create());
                  }
                  dispatch(tr);
                } catch (err) {
                  console.error("Paste image upload failed:", err);
                }
              }
            })();
            return true; // handled
          }

          // A2: Only files (no text/html) → fully handle (custom insert + uploads)
          e.preventDefault();
          (async () => {
            for (const file of imageFiles) {
              try {
                const url = await handleImageUpload(file);
                const { state, dispatch } = view;
                const { image, paragraph } = state.schema.nodes as any;
                if (!image) continue;
                const imageNode = image.create({ src: url, alt: file.name });
                let tr = state.tr.replaceSelectionWith(imageNode, false).scrollIntoView();
                if (paragraph) {
                  const pos = tr.selection.to;
                  tr = tr.insert(pos, paragraph.create());
                }
                dispatch(tr);
              } catch (err) {
                console.error("Paste image upload failed:", err);
              }
            }
          })();
          return true;
        }

        // Case AB: HTML has file:// images but clipboard didn't expose files.
        // Strip images to avoid security error and paste the rest.
        if (!imageFiles.length && fileProtocolSrcs.length && html) {
          e.preventDefault();
          pasteSanitizedHtml(html);
          return true;
        }

        // Case B: No file items, but HTML contains embedded data:image(s).
        // Let the browser/editor paste happen normally (to preserve formatting),
        // then replace any pasted data image src with uploaded URLs.
        if (dataImageSrcs.length) {
          // Allow default paste
          setTimeout(async () => {
            for (const dataSrc of dataImageSrcs) {
              try {
                const file = dataUrlToFile(dataSrc);
                const url = await handleImageUpload(file);

                const { state, dispatch } = view;
                let tr = state.tr;
                const imageType = state.schema.nodes["image"];
                if (!imageType) continue;

                const targets: number[] = [];
                state.doc.descendants((node, pos) => {
                  if (node.type === imageType && node.attrs?.src === dataSrc) {
                    targets.push(pos);
                  }
                  return true;
                });

                for (const pos of targets) {
                  const current = tr.doc.nodeAt(pos);
                  if (!current) continue;
                  const nextAttrs = { ...(current.attrs as any), src: url };
                  tr = tr.setNodeMarkup(pos, undefined, nextAttrs);
                }

                if (targets.length) dispatch(tr.scrollIntoView());
              } catch (err) {
                console.error("Failed to replace pasted data image:", err);
              }
            }
          }, 0);
          return false; // keep default paste
        }

        // Default behavior (no images involved)
        return false;
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
    ],
    content,
  });

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  });

  useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main");
    }
  }, [isMobile, mobileView]);

  const handleSave = async () => {
    if (!editor) return;
    const json = editor.getJSON(); // ProseMirror JSON → descriptionJson
    const html = editor.getHTML(); // HTML → descriptionHtml (server sanitiza)
    const plain = editor.getText(); // texto puro → descriptionPlain

    const payload = { json, html, plain };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/cards/${cardId}/description`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (res.ok) {
      const body = await res.json();
      onSaved?.(body.card);
    } else {
      console.error("Erro ao salvar descrição", await res.text());
    }
  };

  return (
    <div className="simple-editor-wrapper">
      <EditorContext.Provider value={{ editor }}>
        <Toolbar
          ref={toolbarRef}
          style={{
            ...(isMobile
              ? {
                  bottom: `calc(100% - ${height - rect.y}px)`,
                }
              : {}),
          }}>
          {mobileView === "main" ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView("highlighter")}
              onLinkClick={() => setMobileView("link")}
              isMobile={isMobile}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === "highlighter" ? "highlighter" : "link"}
              onBack={() => setMobileView("main")}
            />
          )}
        </Toolbar>

        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </EditorContext.Provider>
      <div style={{ marginTop: 8 }}>
        <button onClick={handleSave}>Salvar descrição</button>
      </div>
    </div>
  );
}
