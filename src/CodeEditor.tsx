import React, { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { css } from "@codemirror/lang-css";

type Props = { value: string; onChange: (value: string) => void };
const CodeEditor = ({ value, onChange }: Props): React.ReactElement => {
  const mount = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView>();
  const listener = useRef(onChange);
  listener.current = onChange;
  useEffect(() => {
    if (!mount.current) return;
    const view = new EditorView({
      parent: mount.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          css(),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({
            "aria-label": "CSS source",
            spellcheck: "false",
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged)
              listener.current(update.state.doc.toString());
          }),
          EditorView.theme({
            "&": { height: "100%" },
            ".cm-scroller": { overflow: "auto", fontSize: "12px" },
          }),
        ],
      }),
    });
    editor.current = view;
    return () => {
      view.destroy();
      editor.current = undefined;
    };
  }, []);
  useEffect(() => {
    const view = editor.current;
    if (view && view.state.doc.toString() !== value)
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
  }, [value]);
  return <div ref={mount} className="cct-code" />;
};
export default CodeEditor;
