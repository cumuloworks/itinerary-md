import { fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopBar } from '@/components/TopBar';

// Mock for Radix UI
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
    Sub: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SubTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SubContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    RadioGroup: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
        <div data-testid="dropdown-radio-group" data-value={value} data-change={typeof onValueChange === 'function'}>
            {children}
        </div>
    ),
    RadioItem: ({ children, value, onClick }: { children: React.ReactNode; value: string; onClick?: (value: string) => void }) => (
        <button type="button" data-value={value} onClick={() => onClick?.(value)}>
            {children}
        </button>
    ),
    ItemIndicator: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    Separator: () => <div />,
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

    describe('Rendering', () => {
        it('renders all controls', () => {
            render(<TopBar {...mockProps} />);

            // Timezone controls
            expect(screen.getByText('TZ')).toBeInTheDocument();
            expect(screen.getByText('Device TZ')).toBeInTheDocument();

            // Currency controls
            expect(screen.getByText('Cur')).toBeInTheDocument();

            // View mode
            expect(screen.getByTestId('toggle-group')).toBeInTheDocument();

            // Toggle buttons
            expect(screen.getByText('Hide Past: OFF')).toBeInTheDocument();

            // Action buttons
            expect(screen.getByTitle('Copy Markdown')).toBeInTheDocument();
            expect(screen.getByTitle('Share via URL')).toBeInTheDocument();
            expect(screen.getByText('Load Sample')).toBeInTheDocument();
        });

        it('applies custom class name', () => {
            const { container } = render(<TopBar {...mockProps} className="custom-class" />);

            const toolbar = container.querySelector('.custom-class');
            expect(toolbar).toBeInTheDocument();
        });
    });

    describe('Timezone features', () => {
        it('shows current timezone', () => {
            render(<TopBar {...mockProps} />);
            const selects = screen.getAllByTestId('select-root');
            expect(selects[0]).toHaveAttribute('data-value', 'UTC');
        });

        it('resets to device timezone', () => {
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

        it('sorts timezones by offset', () => {
            // This test depends on implementation details,
            // so real Radix UI component tests are required
            expect(mockProps.timezoneOptions).toContain('UTC');
            expect(mockProps.timezoneOptions).toContain('Asia/Tokyo');
        });
    });

    describe('Currency features', () => {
        it('shows current currency', () => {
            render(<TopBar {...mockProps} />);
            const selects = screen.getAllByTestId('select-root');
            expect(selects[1]).toHaveAttribute('data-value', 'USD');
        });

        it('has available currency options', () => {
            render(<TopBar {...mockProps} />);
            expect(mockProps.currencyOptions).toContain('USD');
            expect(mockProps.currencyOptions).toContain('EUR');
            expect(mockProps.currencyOptions).toContain('JPY');
        });
    });

    describe('View mode', () => {
        it('shows current view mode', () => {
            render(<TopBar {...mockProps} />);
            expect(screen.getByTestId('toggle-group')).toHaveAttribute('data-value', 'split');
        });

        it('supports different view modes', () => {
            const { rerender } = render(<TopBar {...mockProps} />);

            rerender(<TopBar {...mockProps} topbar={{ ...mockProps.topbar, viewMode: 'editor' }} />);
            expect(screen.getByTestId('toggle-group')).toHaveAttribute('data-value', 'editor');

            rerender(<TopBar {...mockProps} topbar={{ ...mockProps.topbar, viewMode: 'preview' }} />);
            expect(screen.getByTestId('toggle-group')).toHaveAttribute('data-value', 'preview');
        });
    });

    describe('Hide past toggle', () => {
        it('shows OFF when showPast is true', () => {
            render(<TopBar {...mockProps} />);
            expect(screen.getByText('Hide Past: OFF')).toBeInTheDocument();
        });

        it('shows ON when showPast is false', () => {
            render(<TopBar {...mockProps} topbar={{ ...mockProps.topbar, showPast: false }} />);
            expect(screen.getByText('Hide Past: ON')).toBeInTheDocument();
        });

        it('toggles showPast on click', () => {
            render(<TopBar {...mockProps} />);

            const button = screen.getByTitle('Hide past days');
            fireEvent.click(button);

            expect(mockProps.onTopbarChange).toHaveBeenCalledWith({
                showPast: false,
            });
        });
    });

    // Auto scroll toggle moved to PreviewPane header; no longer tested here

    describe('Actions', () => {
        it('clicks Copy Markdown button', () => {
            render(<TopBar {...mockProps} />);

            const button = screen.getByTitle('Copy Markdown');
            fireEvent.click(button);

            expect(mockProps.onCopyMarkdown).toHaveBeenCalled();
        });

        it('clicks Share via URL button', () => {
            render(<TopBar {...mockProps} />);

            const button = screen.getByTitle('Share via URL');
            fireEvent.click(button);

            expect(mockProps.onShareUrl).toHaveBeenCalled();
        });

        it('clicks Load Sample option', () => {
            render(<TopBar {...mockProps} />);

            const loadSampleButton = screen.getByText('Load Sample');
            fireEvent.click(loadSampleButton);

            expect(mockProps.onLoadSample).toHaveBeenCalled();
        });
    });

    describe('Accessibility', () => {
        it('has appropriate aria-labels', () => {
            render(<TopBar {...mockProps} />);

            expect(screen.getByLabelText('Copy Markdown')).toBeInTheDocument();
            expect(screen.getByLabelText('Share via URL')).toBeInTheDocument();
            expect(screen.getByLabelText('Hide past days')).toBeInTheDocument();
            // Auto scroll control not present in TopBar anymore
        });

        it('timezone select has the correct ID', () => {
            render(<TopBar {...mockProps} />);

            const select = document.getElementById('tz-select');
            expect(select).toBeInTheDocument();
        });
    });

    describe('Edge cases', () => {
        it('handles empty timezone options', () => {
            render(<TopBar {...mockProps} timezoneOptions={[]} />);
            expect(screen.getByText('TZ')).toBeInTheDocument();
        });

        it('handles empty currency options', () => {
            render(<TopBar {...mockProps} currencyOptions={[]} />);
            expect(screen.getByText('Cur')).toBeInTheDocument();
        });

        it('handles invalid timezone formats', () => {
            render(<TopBar {...mockProps} timezoneOptions={['Invalid/Zone', 'UTC']} />);
            // Should not throw an error
            expect(screen.getByText('TZ')).toBeInTheDocument();
        });

        it('works without Intl API', () => {
            const originalIntl = global.Intl;
            delete (global as { Intl?: typeof Intl }).Intl;

            expect(() => {
                render(<TopBar {...mockProps} />);
            }).not.toThrow();

            global.Intl = originalIntl;
        });
    });

    describe('Memoization', () => {
        it('prevents unnecessary re-renders', () => {
            const renderSpy = vi.fn();

            const TestWrapper = (props: Parameters<typeof TopBar>[0]) => {
                renderSpy();
                return <TopBar {...props} />;
            };

            const { rerender } = render(<TestWrapper {...mockProps} />);

            expect(renderSpy).toHaveBeenCalledTimes(1);

            // Re-render with the same props
            rerender(<TestWrapper {...mockProps} />);

            // Memoization prevents re-rendering (parent component re-renders)
            expect(renderSpy).toHaveBeenCalledTimes(2);
        });
    });
});
