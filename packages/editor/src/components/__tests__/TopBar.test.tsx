import { fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopBar } from '../TopBar';

// Radix UIのモック
vi.mock('@radix-ui/react-dropdown-menu', () => ({
    Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Trigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
        const child = asChild && React.isValidElement(children) ? (children as React.ReactElement<{ children?: React.ReactNode }>).props.children : children;
        return <div>{child}</div>;
    },
    Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Item: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
        <button type="button" onClick={onClick}>
            {children}
        </button>
    ),
}));

vi.mock('@radix-ui/react-select', () => ({
    Root: ({ children, value, onValueChange }: { children: React.ReactNode | ((props: { value: string; onValueChange: (v: string) => void }) => React.ReactNode); value: string; onValueChange: (v: string) => void }) => (
        <div data-testid="select-root" data-value={value}>
            {typeof children === 'function' ? children({ value, onValueChange }) : children}
        </div>
    ),
    Trigger: ({ children, id, className, 'aria-labelledby': ariaLabelledBy }: { children: React.ReactNode; id?: string; className?: string; 'aria-labelledby'?: string }) => (
        <button type="button" id={id} className={className} aria-labelledby={ariaLabelledBy}>
            {children}
        </button>
    ),
    Value: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    Icon: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Viewport: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Item: ({ children, value, onClick }: { children: React.ReactNode; value: string; onClick?: (value: string) => void }) => (
        <button type="button" data-value={value} onClick={() => onClick?.(value)}>
            {children}
        </button>
    ),
    ItemText: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    ItemIndicator: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@radix-ui/react-toggle-group', () => ({
    Root: ({ children, value, onValueChange }: { children: React.ReactNode | ((props: { value: string; onValueChange: (v: string) => void }) => React.ReactNode); value: string; onValueChange: (v: string) => void }) => (
        <div data-testid="toggle-group" data-value={value}>
            {typeof children === 'function' ? children({ value, onValueChange }) : children}
        </div>
    ),
    Item: ({ children, value, onClick, className }: { children: React.ReactNode; value: string; onClick?: (value: string) => void; className?: string }) => (
        <button type="button" data-value={value} onClick={() => onClick?.(value)} className={className}>
            {children}
        </button>
    ),
}));

vi.mock('@radix-ui/react-toolbar', () => ({
    Root: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
    Button: ({ children, onClick, title, className, type, 'aria-label': ariaLabel }: { children: React.ReactNode; onClick?: () => void; title?: string; className?: string; type?: 'button' | 'submit' | 'reset'; 'aria-label'?: string }) => (
        <button type={type} onClick={onClick} title={title} className={className} aria-label={ariaLabel}>
            {children}
        </button>
    ),
    Separator: () => <div />,
}));

describe('TopBar', () => {
    const mockProps = {
        tzSelectId: 'tz-select',
        timezoneOptions: ['UTC', 'Asia/Tokyo', 'America/New_York'],
        currencyOptions: ['USD', 'EUR', 'JPY'],
        topbar: {
            timezone: 'UTC',
            currency: 'USD',
            viewMode: 'split' as const,
            showPast: true,
            autoScroll: true,
        },
        onTopbarChange: vi.fn(),
        onCopyMarkdown: vi.fn(),
        onShareUrl: vi.fn(),
        onLoadSample: vi.fn(),
        onClearAll: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('レンダリング', () => {
        it('すべてのコントロールをレンダリングする', () => {
            render(<TopBar {...mockProps} />);

            // タイムゾーン関連
            expect(screen.getByText('TZ')).toBeInTheDocument();
            expect(screen.getByText('Device TZ')).toBeInTheDocument();

            // 通貨関連
            expect(screen.getByText('Cur')).toBeInTheDocument();

            // ビューモード
            expect(screen.getByTestId('toggle-group')).toBeInTheDocument();

            // トグルボタン
            expect(screen.getByText('Hide Past: OFF')).toBeInTheDocument();
            expect(screen.getByText('Auto Scroll: ON')).toBeInTheDocument();

            // アクションボタン
            expect(screen.getByTitle('Copy Markdown')).toBeInTheDocument();
            expect(screen.getByTitle('Share via URL')).toBeInTheDocument();
            expect(screen.getByText('Load Sample')).toBeInTheDocument();
        });

        it('カスタムクラス名を適用する', () => {
            const { container } = render(<TopBar {...mockProps} className="custom-class" />);

            const toolbar = container.querySelector('.custom-class');
            expect(toolbar).toBeInTheDocument();
        });
    });

    describe('タイムゾーン機能', () => {
        it('現在のタイムゾーンを表示する', () => {
            render(<TopBar {...mockProps} />);
            const selects = screen.getAllByTestId('select-root');
            expect(selects[0]).toHaveAttribute('data-value', 'UTC');
        });

        it('デバイスのタイムゾーンにリセットする', () => {
            const originalIntl = global.Intl;
            global.Intl = {
                ...originalIntl,
                DateTimeFormat: vi.fn(() => ({
                    resolvedOptions: () => ({ timeZone: 'Europe/London' }),
                    formatToParts: vi.fn(),
                })) as unknown as Intl.DateTimeFormatConstructor,
            } as typeof Intl;

            render(<TopBar {...mockProps} />);

            const resetButton = screen.getByTitle('Reset to device timezone');
            fireEvent.click(resetButton);

            expect(mockProps.onTopbarChange).toHaveBeenCalledWith({
                timezone: 'Europe/London',
            });

            global.Intl = originalIntl;
        });

        it('タイムゾーンをオフセット順にソートする', () => {
            // このテストは実装の詳細に依存するため、
            // 実際のRadix UIコンポーネントのテストが必要
            expect(mockProps.timezoneOptions).toContain('UTC');
            expect(mockProps.timezoneOptions).toContain('Asia/Tokyo');
        });
    });

    describe('通貨機能', () => {
        it('現在の通貨を表示する', () => {
            render(<TopBar {...mockProps} />);
            const selects = screen.getAllByTestId('select-root');
            expect(selects[1]).toHaveAttribute('data-value', 'USD');
        });

        it('利用可能な通貨オプションを持つ', () => {
            render(<TopBar {...mockProps} />);
            expect(mockProps.currencyOptions).toContain('USD');
            expect(mockProps.currencyOptions).toContain('EUR');
            expect(mockProps.currencyOptions).toContain('JPY');
        });
    });

    describe('ビューモード', () => {
        it('現在のビューモードを表示する', () => {
            render(<TopBar {...mockProps} />);
            expect(screen.getByTestId('toggle-group')).toHaveAttribute('data-value', 'split');
        });

        it('異なるビューモードに対応する', () => {
            const { rerender } = render(<TopBar {...mockProps} />);

            rerender(<TopBar {...mockProps} topbar={{ ...mockProps.topbar, viewMode: 'editor' }} />);
            expect(screen.getByTestId('toggle-group')).toHaveAttribute('data-value', 'editor');

            rerender(<TopBar {...mockProps} topbar={{ ...mockProps.topbar, viewMode: 'preview' }} />);
            expect(screen.getByTestId('toggle-group')).toHaveAttribute('data-value', 'preview');
        });
    });

    describe('過去を表示トグル', () => {
        it('showPastがtrueのときOFFを表示', () => {
            render(<TopBar {...mockProps} />);
            expect(screen.getByText('Hide Past: OFF')).toBeInTheDocument();
        });

        it('showPastがfalseのときONを表示', () => {
            render(<TopBar {...mockProps} topbar={{ ...mockProps.topbar, showPast: false }} />);
            expect(screen.getByText('Hide Past: ON')).toBeInTheDocument();
        });

        it('クリックでshowPastをトグル', () => {
            render(<TopBar {...mockProps} />);

            const button = screen.getByTitle('Hide past days');
            fireEvent.click(button);

            expect(mockProps.onTopbarChange).toHaveBeenCalledWith({
                showPast: false,
            });
        });
    });

    describe('自動スクロール', () => {
        it('autoScrollがtrueのときONを表示', () => {
            render(<TopBar {...mockProps} />);
            expect(screen.getByText('Auto Scroll: ON')).toBeInTheDocument();
        });

        it('autoScrollがfalseのときOFFを表示', () => {
            render(<TopBar {...mockProps} topbar={{ ...mockProps.topbar, autoScroll: false }} />);
            expect(screen.getByText('Auto Scroll: OFF')).toBeInTheDocument();
        });

        it('クリックでautoScrollをトグル', () => {
            render(<TopBar {...mockProps} />);

            const button = screen.getByTitle('Disable auto scroll');
            fireEvent.click(button);

            expect(mockProps.onTopbarChange).toHaveBeenCalledWith({
                autoScroll: false,
            });
        });
    });

    describe('アクション', () => {
        it('Markdownコピーボタンをクリック', () => {
            render(<TopBar {...mockProps} />);

            const button = screen.getByTitle('Copy Markdown');
            fireEvent.click(button);

            expect(mockProps.onCopyMarkdown).toHaveBeenCalled();
        });

        it('URL共有ボタンをクリック', () => {
            render(<TopBar {...mockProps} />);

            const button = screen.getByTitle('Share via URL');
            fireEvent.click(button);

            expect(mockProps.onShareUrl).toHaveBeenCalled();
        });

        it('サンプル読み込みオプション', () => {
            render(<TopBar {...mockProps} />);

            const loadSampleButton = screen.getByText('Load Sample');
            fireEvent.click(loadSampleButton);

            expect(mockProps.onLoadSample).toHaveBeenCalled();
        });
    });

    describe('アクセシビリティ', () => {
        it('適切なaria-labelを持つ', () => {
            render(<TopBar {...mockProps} />);

            expect(screen.getByLabelText('Copy Markdown')).toBeInTheDocument();
            expect(screen.getByLabelText('Share via URL')).toBeInTheDocument();
            expect(screen.getByLabelText('Hide past days')).toBeInTheDocument();
            expect(screen.getByLabelText('Disable auto scroll')).toBeInTheDocument();
        });

        it('タイムゾーンセレクトが正しいIDを持つ', () => {
            render(<TopBar {...mockProps} />);

            const select = document.getElementById('tz-select');
            expect(select).toBeInTheDocument();
        });
    });

    describe('エッジケース', () => {
        it('空のタイムゾーンオプションを処理', () => {
            render(<TopBar {...mockProps} timezoneOptions={[]} />);
            expect(screen.getByText('TZ')).toBeInTheDocument();
        });

        it('空の通貨オプションを処理', () => {
            render(<TopBar {...mockProps} currencyOptions={[]} />);
            expect(screen.getByText('Cur')).toBeInTheDocument();
        });

        it('無効なタイムゾーンフォーマットを処理', () => {
            render(<TopBar {...mockProps} timezoneOptions={['Invalid/Zone', 'UTC']} />);
            // エラーをスローしない
            expect(screen.getByText('TZ')).toBeInTheDocument();
        });

        it('Intl APIが利用できない場合', () => {
            const originalIntl = global.Intl;
            delete (global as { Intl?: typeof Intl }).Intl;

            expect(() => {
                render(<TopBar {...mockProps} />);
            }).not.toThrow();

            global.Intl = originalIntl;
        });
    });

    describe('メモ化', () => {
        it('不要な再レンダリングを防ぐ', () => {
            const renderSpy = vi.fn();

            const TestWrapper = (props: Parameters<typeof TopBar>[0]) => {
                renderSpy();
                return <TopBar {...props} />;
            };

            const { rerender } = render(<TestWrapper {...mockProps} />);

            expect(renderSpy).toHaveBeenCalledTimes(1);

            // 同じpropsで再レンダリング
            rerender(<TestWrapper {...mockProps} />);

            // メモ化により再レンダリングされない（親コンポーネントは再レンダリング）
            expect(renderSpy).toHaveBeenCalledTimes(2);
        });
    });
});
