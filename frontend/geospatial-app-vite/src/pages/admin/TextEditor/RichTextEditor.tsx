import React from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, EditorState, TextNode } from 'lexical';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';

import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode } from '@lexical/code';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';


import ToolbarPlugin from './ToolbarPlugin';

interface Props {
  initialHtml?: string;
  onChange?: (html: string) => void;
}

/* -------- HTML EXPORT PLUGIN -------- */
function HtmlChangePlugin({ onChange }: { onChange?: (html: string) => void }) {
  const [editor] = useLexicalComposerContext();

  return (
    <OnChangePlugin
      onChange={(editorState: EditorState) => {
        editorState.read(() => {
          const html = $generateHtmlFromNodes(editor);
          onChange?.(html);
        });
      }}
    />
  );
}

const RichTextEditor: React.FC<Props> = ({ initialHtml = '', onChange }) => {
  const initialConfig = {
    namespace: 'CMS_Editor',
    theme: {},
    onError: console.error,
    nodes: [TextNode, HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode],
    editorState: (editor: any) => {
      if (!initialHtml) return;

      const parser = new DOMParser();
      const dom = parser.parseFromString(initialHtml, 'text/html');

      editor.update(() => {
        const root = $getRoot();
        root.clear();

        const nodes = $generateNodesFromDOM(editor, dom);
        root.append(...nodes);
      });
    },
  };


  return (
    <LexicalComposer initialConfig={initialConfig}>
      <ToolbarPlugin />
      <ListPlugin />
      <RichTextPlugin
        contentEditable={<ContentEditable className="editor-input" />}
      />
      <HtmlChangePlugin onChange={onChange} />
    </LexicalComposer>
  );
};

export default RichTextEditor;
