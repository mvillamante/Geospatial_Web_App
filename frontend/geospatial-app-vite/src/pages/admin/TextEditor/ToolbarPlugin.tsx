import { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  $isListNode,
  $isListItemNode,
} from '@lexical/list';

import './Toolbar.css';

export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isBulletList, setIsBulletList] = useState(false);
  const [isNumberedList, setIsNumberedList] = useState(false);

  const indent = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      const node = selection.anchor.getNode();
      const listItem = node.getTopLevelElement();
      
      if ($isListItemNode(listItem)) {
        const parentList = listItem.getParent();
        if ($isListNode(parentList)) {
          parentList.setIndent(parentList.getIndent() + 1); 
        }
      } else {
        editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
      }
    });
  };

  const outdent = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      const node = selection.anchor.getNode();
      const listItem = node.getTopLevelElement();

      if ($isListItemNode(listItem)) {
        const parentList = listItem.getParent();
        if ($isListNode(parentList)) {
          parentList.setIndent(Math.max(parentList.getIndent() - 1, 0));
        }
      } else {
        editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
      }
    });
  };

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        setIsBold(selection.hasFormat('bold'));
        setIsItalic(selection.hasFormat('italic'));
        setIsUnderline(selection.hasFormat('underline'));

        const node = selection.anchor.getNode();
        const topLevel = node.getTopLevelElement();

        if (topLevel && $isListNode(topLevel)) {
          setIsBulletList(topLevel.getListType() === 'bullet');
          setIsNumberedList(topLevel.getListType() === 'number');
        } else {
          setIsBulletList(false);
          setIsNumberedList(false);
        }
      });
    });
  }, [editor]);

  return (
    <div className="toolbar">
      {/* Text Formatting */}
      <button
        className={`toolbar-btn ${isBold ? 'active' : ''}`}
        onMouseDown={e => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        }}
      >
        <span className="icon-bold">B</span>
      </button>

      <button
        className={`toolbar-btn ${isItalic ? 'active' : ''}`}
        onMouseDown={e => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
      >
        <span className="icon-italic">I</span>
      </button>

      <button
        className={`toolbar-btn ${isUnderline ? 'active' : ''}`}
        onMouseDown={e => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        }}
      >
        <span className="icon-underline">U</span>
      </button>

      <div className="toolbar-divider" />

      {/* Lists */}
      <button
        className={`toolbar-btn ${isBulletList ? 'active' : ''}`}
        onMouseDown={e => {
          e.preventDefault();
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        }}
      >
        <svg viewBox="0 0 24 24">
          <circle cx="5" cy="6" r="2" />
          <circle cx="5" cy="12" r="2" />
          <circle cx="5" cy="18" r="2" />
          <line x1="10" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2" />
          <line x1="10" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" />
          <line x1="10" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      <button
        className={`toolbar-btn ${isNumberedList ? 'active' : ''}`}
        onMouseDown={e => {
          e.preventDefault();
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        }}
      >
        <svg viewBox="0 0 24 24">
          <text x="2" y="8" fontSize="6">1.</text>
          <text x="2" y="14" fontSize="6">2.</text>
          <text x="2" y="20" fontSize="6">3.</text>
          <line x1="10" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2" />
          <line x1="10" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" />
          <line x1="10" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      <div className="toolbar-divider" />

      {/* Indent / Outdent */}
      <button
        className="toolbar-btn"
        onMouseDown={e => {
          e.preventDefault();
          indent();
        }}
      >
        <svg viewBox="0 0 24 24">
          <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2"/>
          <line x1="8" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2"/>
          <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="2"/>
          <polyline points="6,10 8,12 6,14" fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
      </button>

      <button
        className="toolbar-btn"
        onMouseDown={e => {
          e.preventDefault();
          outdent();
        }}
      >
        <svg viewBox="0 0 24 24">
          <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2"/>
          <line x1="8" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2"/>
          <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="2"/>
          <polyline points="4,10 2,12 4,14" fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
      </button>
    </div>
  );
}
