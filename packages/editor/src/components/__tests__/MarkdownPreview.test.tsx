import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MarkdownPreview } from '@/components/MarkdownPreview';

describe('MarkdownPreview (github blockquote alert)', () => {
    it('renders one-line alert title; body may be empty when inline text is omitted by plugin', () => {
        // Current behavior: in itmd documents it is converted to AlertBlock and the title/subtitle are rendered
        const md = `---\ntype: itmd\n---\n\n> [!CAUTION] lorem ipsum dolor sit amet`;
        render(<MarkdownPreview content={md} timezone={'UTC'} />);
        expect(screen.getByText(/CAUTION/i)).toBeInTheDocument();
        expect(screen.getByText(/lorem ipsum/i)).toBeInTheDocument();
    });
    it('does not duplicate body when one-line followed by non-empty paragraph', () => {
        const md = `---\ntype: itmd\n---\n\n> [!CAUTION] lorem ipsum dolor sit amet\n> Tickets`;
        const { container } = render(<MarkdownPreview content={md} timezone={'UTC'} />);
        // Title and subtitle
        expect(screen.getByText(/CAUTION/i)).toBeInTheDocument();
        // Subtitle appears only once (not duplicated into body)
        const text = container.textContent || '';
        expect((text.match(/lorem ipsum dolor sit amet/gi) || []).length).toBe(1);
        // Second-line body is rendered
        expect(screen.getByText(/Tickets/)).toBeInTheDocument();
    });
    it('renders multi-line alert body', () => {
        const md = `---\ntype: itmd\n---\n\n> [!WARNING]\n> line1\n> line2`;
        render(<MarkdownPreview content={md} timezone={'UTC'} />);
        expect(screen.getByText(/line1/)).toBeInTheDocument();
        expect(screen.getByText(/line2/)).toBeInTheDocument();
    });
    it('keeps normal blockquote rendering when not an alert', () => {
        const md = `> Just quote`;
        const { container } = render(<MarkdownPreview content={md} timezone={'UTC'} />);
        const bq = container.querySelector('blockquote');
        expect(bq).not.toBeNull();
        expect(bq?.className).not.toMatch(/markdown-alert/);
        expect(screen.getByText('Just quote')).toBeInTheDocument();
    });
});

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
        const md = `---\ntype: itmd\n---\n\n## 2024-01-01\n\n> [08:30] flight AA100 :: Tokyo - Seoul`;
        render(<MarkdownPreview content={md} timezone={'UTC'} showPast={false} />);
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
        // Each is rendered separately (order preserved)
        const a40 = getAllByText('40A');
        const a50 = getAllByText('50A');
        expect(a40.length).toBeGreaterThan(0);
        expect(a50.length).toBeGreaterThan(0);
        // There are two seat labels (duplicate keys are not collapsed)
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

    it('uses primary names when preferAltNames=false (title and destination)', () => {
        const md = `---\ntype: itmd\n---\n\n> [08:00] lunch タイトル^Title :: 店^Shop`;
        render(<MarkdownPreview content={md} timezone={'UTC'} preferAltNames={false} />);
        // Primary (before caret) should be shown
        expect(screen.getByText('タイトル')).toBeInTheDocument();
        expect(screen.getByText('店')).toBeInTheDocument();
        // Alt should not be used as primary
        expect(screen.queryByText('Title')).not.toBeInTheDocument();
        expect(screen.queryByText('Shop')).not.toBeInTheDocument();
    });

    it('uses alternative names when preferAltNames=true (title and destination)', () => {
        const md = `---\ntype: itmd\n---\n\n> [08:00] lunch タイトル^Title :: 店^Shop`;
        render(<MarkdownPreview content={md} timezone={'UTC'} preferAltNames={true} />);
        // Alt (after caret) should be shown
        expect(screen.getByText('Title')).toBeInTheDocument();
        expect(screen.getByText('Shop')).toBeInTheDocument();
        // Primary should not appear when alt preferred
        expect(screen.queryByText('タイトル')).not.toBeInTheDocument();
        expect(screen.queryByText('店')).not.toBeInTheDocument();
    });
});
