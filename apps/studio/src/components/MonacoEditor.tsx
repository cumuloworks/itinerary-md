import Editor from '@monaco-editor/react';
import { type FC, memo } from 'react';

interface MonacoEditorProps {
    value: string;
    onChange: (value: string) => void;
    onSave: () => void;
    onCursorLineChange?: (line: number) => void;
    onChangedLines?: (lines: number[]) => void;
}

const MonacoEditorComponent: FC<MonacoEditorProps> = ({ value, onChange, onSave, onCursorLineChange, onChangedLines }) => {
    const handleEditorChange = (value: string | undefined) => {
        onChange(value || '');
    };

    return (
        <div className="h-full">
            <Editor
                height="100%"
                language="markdown"
                value={value}
                onChange={handleEditorChange}
                theme="vs-light"
                onMount={(editor, monaco) => {
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                        onSave();
                    });
                    if (onCursorLineChange) {
                        // 初期行を通知
                        const pos = editor.getPosition();
                        if (pos?.lineNumber) {
                            onCursorLineChange(pos.lineNumber);
                        }
                        // カーソル移動で通知
                        editor.onDidChangeCursorPosition((e) => {
                            const ln = e.position?.lineNumber;
                            if (typeof ln === 'number') {
                                onCursorLineChange(ln);
                            }
                        });
                    }
                    if (onChangedLines) {
                        editor.onDidChangeModelContent((e) => {
                            const changed = new Set<number>();
                            for (const ch of e.changes) {
                                const start = ch.range.startLineNumber;
                                const inserted = Math.max(0, ch.text.split(/\r?\n/).length - 1);
                                const end = Math.max(ch.range.endLineNumber, ch.range.startLineNumber + inserted);
                                for (let ln = start; ln <= end; ln += 1) changed.add(ln);
                            }
                            if (changed.size > 0) onChangedLines(Array.from(changed).sort((a, b) => a - b));
                        });
                    }
                }}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    folding: true,
                    renderWhitespace: 'selection',
                    tabSize: 2,
                    insertSpaces: true,
                }}
            />
        </div>
    );
};

export const MonacoEditor = memo(MonacoEditorComponent);
