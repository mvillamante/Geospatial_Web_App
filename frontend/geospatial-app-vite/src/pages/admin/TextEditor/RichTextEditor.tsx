import React from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, TextNode, ParagraphNode } from 'lexical';
import type { EditorState } from 'lexical';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode } from '@lexical/code';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';

import ToolbarPlugin from './ToolbarPlugin';
import IndentPlugin from './IndentPlugin';

interface Props {
  initialHtml?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
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

const RichTextEditor: React.FC<Props> = ({
  initialHtml = '',
  onChange,
  placeholder,
}) => {
  const initialConfig = {
    namespace: 'CMS_Editor',

    theme: {
      text: {
        bold: 'editor-bold',
        italic: 'editor-italic',
        underline: 'editor-underline',
        strikethrough: 'editor-strikethrough',
      },
    },

    onError: console.error,

    nodes: [
      ParagraphNode,
      TextNode,
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
    ],

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
      <IndentPlugin />
      <RichTextPlugin
        contentEditable={
          <ContentEditable className="editor-input" />
        }
        placeholder={
          <div className="editor-placeholder">
            {placeholder}
          </div>
        }
        ErrorBoundary={LexicalErrorBoundary}
      />

      <HtmlChangePlugin onChange={onChange} />
    </LexicalComposer>
  );
};

export default RichTextEditor;