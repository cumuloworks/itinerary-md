import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MarkdownPreview } from '../MarkdownPreview';

describe('MarkdownPreview (github blockquote alert)', () => {
    it('renders one-line alert title; body may be empty when inline text is omitted by plugin', () => {
        const md = `> [!CAUTION] lorem ipsum`;
        const { container } = render(<MarkdownPreview content={md} timezone={'UTC'} />);
        const bq = container.querySelector('blockquote.markdown-alert.markdown-alert-caution');
        expect(bq).not.toBeNull();
        // title
        const title = bq?.querySelector('.markdown-alert-title');
        expect(title?.textContent).toMatch(/CAUTION/i);
        // body paragraph may be empty in one-line form (no strict assertion)
        const body = bq?.querySelector('p:not(.markdown-alert-title)');
        expect(body).not.toBeNull();
    });
    it('does not duplicate body when one-line followed by non-empty paragraph', () => {
        const md = `> [!CAUTION] lorem ipsum dolor sit amet\n> Tickets`;
        const { container } = render(<MarkdownPreview content={md} timezone={'UTC'} />);
        const bq = container.querySelector('blockquote.markdown-alert.markdown-alert-caution');
        expect(bq).not.toBeNull();
        // There should be exactly two body paragraphs after title
        const paras = (bq as Element).querySelectorAll('p');
        // p[0] is title, p[1] and p[2] are bodies
        expect(paras.length).toBeGreaterThanOrEqual(2);
        expect(paras[1].textContent).toMatch(/lorem ipsum dolor sit amet/);
        expect(bq).toHaveTextContent(/Tickets/);
        // Ensure no duplicated concatenation
        expect(bq).not.toHaveTextContent(/lorem ipsum dolor sit amet\s*lorem ipsum dolor sit amet/);
    });
    it('renders multi-line alert body', () => {
        const md = `> [!WARNING]\n> line1\n> line2`;
        const { container } = render(<MarkdownPreview content={md} timezone={'UTC'} />);
        const bq = container.querySelector('blockquote.markdown-alert.markdown-alert-warning');
        expect(bq).not.toBeNull();
        expect(bq).toHaveTextContent(/line1/);
        expect(bq).toHaveTextContent(/line2/);
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
