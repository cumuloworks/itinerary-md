import Editor from '@monaco-editor/react';
import { type FC, memo, useEffect, useRef } from 'react';
import { registerTimezoneCompletion } from '@/completions/timezone';

interface MonacoEditorProps {
    value: string;
    onChange: (value: string) => void;
    onSave: () => void;
    onCursorLineChange?: (line: number) => void;
    onChangedLines?: (lines: number[]) => void;
}

const MonacoEditorComponent: FC<MonacoEditorProps> = ({ value, onChange, onSave, onCursorLineChange, onChangedLines }) => {
    const cursorLineChangeRef = useRef<MonacoEditorProps['onCursorLineChange']>(undefined);
    const changedLinesRef = useRef<MonacoEditorProps['onChangedLines']>(undefined);

    useEffect(() => {
        cursorLineChangeRef.current = onCursorLineChange;
    }, [onCursorLineChange]);

    useEffect(() => {
        changedLinesRef.current = onChangedLines;
    }, [onChangedLines]);

    const handleEditorChange = (value: string | undefined) => {
        onChange(value || '');
    };

    return (
        <div className="h-full">
            <Editor
                height="100%"
                language="mdx"
                value={value}
                onChange={handleEditorChange}
                theme="vs-light"
                onMount={(editor, monaco) => {
                    registerTimezoneCompletion(monaco);
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                        onSave();
                    });
                    const pos = editor.getPosition();
                    if (pos?.lineNumber) {
                        cursorLineChangeRef.current?.(pos.lineNumber);
                    }
                    editor.onDidChangeCursorPosition((e) => {
                        const ln = e.position?.lineNumber;
                        if (typeof ln === 'number') {
                            cursorLineChangeRef.current?.(ln);
                        }
                    });
                    editor.onDidChangeModelContent((e) => {
                        const changed = new Set<number>();
                        for (const ch of e.changes) {
                            const start = ch.range.startLineNumber;
                            const inserted = Math.max(0, ch.text.split(/\r?\n/).length - 1);
                            const end = Math.max(ch.range.endLineNumber, ch.range.startLineNumber + inserted);
                            for (let ln = start; ln <= end; ln += 1) changed.add(ln);
                        }
                        if (changed.size > 0) {
                            changedLinesRef.current?.(Array.from(changed).sort((a, b) => a - b));
                        }
                    });
                }}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: 'DM Mono, ui-monospace, monospace',
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
