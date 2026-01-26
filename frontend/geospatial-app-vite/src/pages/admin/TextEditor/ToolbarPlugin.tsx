import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FORMAT_TEXT_COMMAND, $getSelection, $isRangeSelection } from 'lexical';
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
} from '@lexical/list';
import { $createCodeNode } from '@lexical/code';

import './Toolbar.css';

export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  // const insertCodeBlock = () => {
  //   editor.update(() => {
  //     const selection = $getSelection();
  //     if (!$isRangeSelection(selection)) return;

  //     const codeNode = $createCodeNode();
  //     selection.insertNodes([codeNode]);
  //   });
  // };

  return (
    <div className="toolbar">
      <button onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}>B</button>
      <button onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}>I</button>
      <button onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}>• List</button>
      <button onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}>1. List</button>
      {/* <button onClick={insertCodeBlock}>{'</>'}</button> */}
    </div>
  );
}
