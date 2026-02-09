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
      <button className={isBold ? 'active' : ''} onMouseDown={e => { e.preventDefault(); editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold'); }}>B</button>
      <button className={isItalic ? 'active' : ''} onMouseDown={e => { e.preventDefault(); editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic'); }}>I</button>
      <button className={isUnderline ? 'active' : ''} onMouseDown={e => { e.preventDefault(); editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline'); }}>U</button>

      <button className={isBulletList ? 'active' : ''} onMouseDown={e => { e.preventDefault(); editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined); }}>• List</button>
      <button className={isNumberedList ? 'active' : ''} onMouseDown={e => { e.preventDefault(); editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined); }}>1. List</button>

      <button onMouseDown={e => { e.preventDefault(); indent(); }}>➡️</button>
      <button onMouseDown={e => { e.preventDefault(); outdent(); }}>⬅️</button>
    </div>
  );
}
