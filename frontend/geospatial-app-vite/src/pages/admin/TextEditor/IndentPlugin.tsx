import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  KEY_TAB_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  $getSelection,
  $isRangeSelection,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
} from 'lexical';
import { $isListItemNode, $isListNode } from '@lexical/list';

export default function IndentPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_TAB_COMMAND,
      (event: KeyboardEvent) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        const node = selection.anchor.getNode();
        const listItem = node.getTopLevelElement();

        event.preventDefault();

        editor.update(() => {
          if ($isListItemNode(listItem)) {
            const parentList = listItem.getParent();
            if ($isListNode(parentList)) {
              const currentIndent = parentList.getIndent() || 0;
              const newIndent = event.shiftKey
                ? Math.max(currentIndent - 1, 0)
                : currentIndent + 1;
              parentList.setIndent(newIndent);
            }
          } else {
            editor.dispatchCommand(
              event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND,
              undefined
            );
          }
        });

        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
}
