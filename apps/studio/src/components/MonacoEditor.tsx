import Editor from '@monaco-editor/react';
import type React from 'react';

interface MonacoEditorProps {
    value: string;
    onChange: (value: string) => void;
    onSave: () => void;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({ value, onChange, onSave }) => {
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
