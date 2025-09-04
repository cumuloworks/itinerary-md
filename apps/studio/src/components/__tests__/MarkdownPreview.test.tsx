import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MarkdownPreview } from '../MarkdownPreview';

describe('MarkdownPreview (itmd pipeline rendering)', () => {
    const realNow = Date.now;

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
        (Date.now as unknown as () => number) = realNow;
    });

    it('renders heading component for date heading', () => {
        const md = `## 2024-01-01\n\nParagraph.`;
        render(<MarkdownPreview content={md} timezone={'UTC'} title="Test" />);
        expect(screen.getAllByText('2024-01-01').length).toBeGreaterThan(0);
    });

    it('renders an event item for itmdEvent paragraph', () => {
        const md = `## 2024-01-01\n\n> [08:30] flight AA100 :: Tokyo - Seoul`;
        render(<MarkdownPreview content={md} timezone={'UTC'} />);
        // main title contains flight code AA100
        expect(screen.getByText(/AA100/)).toBeInTheDocument();
        // route text includes Tokyo and Seoul
        expect(screen.getByText(/Tokyo/)).toBeInTheDocument();
        expect(screen.getByText(/Seoul/)).toBeInTheDocument();
    });

    it('hides past-day events when showPast=false and shows hidden count', () => {
        // Fix current date to 2024-01-02 UTC
        vi.setSystemTime(new Date('2024-01-02T00:00:00Z'));
        const md = `## 2024-01-01\n\n> [08:30] flight AA100 :: Tokyo - Seoul`;
        render(<MarkdownPreview content={md} timezone={'UTC'} showPast={false} />);
        expect(screen.getByText(/Past events are hidden/)).toBeTruthy();
        // The event should not render
        expect(screen.queryByText(/AA100/)).not.toBeInTheDocument();
    });

    it('renders non-itmd h2 heading (CommonMark)', () => {
        const md = `# Title\n\n## Notes\n\nParagraph.`;
        render(<MarkdownPreview content={md} timezone={'UTC'} />);
        // Non-itmd H2 should be rendered as a heading element with level 2
        expect(screen.getByRole('heading', { level: 2, name: 'Notes' })).toBeInTheDocument();
    });

    it('renders a plain paragraph (CommonMark)', () => {
        const md = `## Notes\n\nThis is a paragraph.`;
        render(<MarkdownPreview content={md} timezone={'UTC'} />);
        expect(screen.getByText('This is a paragraph.')).toBeInTheDocument();
    });

    it('renders unordered lists (CommonMark)', () => {
        const md = `## List\n\n- Apple\n- Banana\n- Cherry`;
        const { getAllByRole } = render(<MarkdownPreview content={md} timezone={'UTC'} />);
        const items = getAllByRole('listitem');
        expect(items.length).toBe(3);
        expect(screen.getByText('Apple')).toBeInTheDocument();
        expect(screen.getByText('Banana')).toBeInTheDocument();
        expect(screen.getByText('Cherry')).toBeInTheDocument();
    });

    it('renders blockquotes (CommonMark)', () => {
        const md = `> Quoted text`;
        render(<MarkdownPreview content={md} timezone={'UTC'} />);
        const paragraph = screen.getByText('Quoted text');
        expect(paragraph).toBeInTheDocument();
        expect(paragraph.closest('blockquote')).not.toBeNull();
    });

    it('renders duplicate meta keys in order without collapsing', () => {
        const md = `## 2024-01-01

> [06:30] breakfast Traditional Japanese breakfast at hotel
> - seat: [40A](https://example.com/)
> - seat: [50A](https://example.com/)`;
        const { getAllByText } = render(<MarkdownPreview content={md} timezone={'UTC'} />);
        // それぞれ個別にレンダリングされる（順序保持）
        const a40 = getAllByText('40A');
        const a50 = getAllByText('50A');
        expect(a40.length).toBeGreaterThan(0);
        expect(a50.length).toBeGreaterThan(0);
        // seat ラベルが2回分存在するか（重複キーが collapse されない）
        const seatLabels = getAllByText('seat:');
        expect(seatLabels.length).toBeGreaterThan(1);
    });

    it('renders fenced code blocks (CommonMark)', () => {
        const md = '```js\nconsole.log(1)\n```';
        const { container } = render(<MarkdownPreview content={md} timezone={'UTC'} />);
        const code = container.querySelector('pre > code');
        expect(code).not.toBeNull();
        expect(code?.textContent).toMatch('console.log(1)');
    });
});
