"use client";

import { useEffect, useRef } from "react";

interface GrapesBuilderProps {
  initialHtml?: string;
  initialCss?: string;
  onChange: (html: string, css: string) => void;
}

export default function GrapesBuilder({ initialHtml = "", initialCss = "", onChange }: GrapesBuilderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;

    let editor: { destroy: () => void; getHtml: () => string; getCss: (opts?: { avoidProtected?: boolean }) => string; on: (event: string, cb: () => void) => void; setComponents: (html: string) => void; setStyle: (css: string) => void };

    (async () => {
      const grapesjs = (await import("grapesjs")).default;
      const presetWebpage = (await import("grapesjs-preset-webpage")).default;

      editor = grapesjs.init({
        container: containerRef.current!,
        height: "100%",
        width: "100%",
        storageManager: false,
        plugins: [presetWebpage],
        pluginsOpts: {
          [presetWebpage as unknown as string]: {},
        },
        canvas: {
          styles: [
            "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap",
          ],
        },
        panels: {
          defaults: [
            {
              id: "layers",
              el: ".panel__left",
              resizable: { tc: false, cr: true, bc: false, keyWidth: "flex-basis" },
            },
            {
              id: "panel-switcher",
              el: ".panel__switcher",
              buttons: [
                { id: "show-layers", active: true, label: "Layers", command: "show-layers", togglable: false },
                { id: "show-style", label: "Styles", command: "show-styles", togglable: false },
                { id: "show-blocks", label: "Blocks", command: "show-blocks", togglable: false },
              ],
            },
          ],
        },
      });

      editorRef.current = editor;

      // Load initial content
      if (initialHtml) editor.setComponents(initialHtml);
      if (initialCss)  editor.setStyle(initialCss);

      // Emit changes
      const emitChange = () => {
        const html = editor.getHtml();
        const css  = editor.getCss({ avoidProtected: true }) || "";
        onChange(html, css);
      };

      editor.on("component:update", emitChange);
      editor.on("style:change", emitChange);
      editor.on("component:add", emitChange);
      editor.on("component:remove", emitChange);
    })();

    return () => {
      if (editorRef.current) {
        (editorRef.current as { destroy: () => void }).destroy();
        editorRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 180px)" }}>
      <div ref={containerRef} className="flex-1 border border-gray-200 rounded-lg overflow-hidden" />
    </div>
  );
}
