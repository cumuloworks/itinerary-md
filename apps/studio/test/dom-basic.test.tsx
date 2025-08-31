import { render, screen } from '@testing-library/react';
import { MarkdownPreview } from '../src/components/MarkdownPreview';

describe('itinerary-md DOM構築テスト（基本）', () => {
    test('日付見出しが正しくレンダリングされる', () => {
        const content = '## 2025-03-15';
        render(<MarkdownPreview content={content} timezone="Asia/Tokyo" />);

        expect(screen.getByText('2025-03-15')).toBeInTheDocument();
        expect(screen.getByText('Sat')).toBeInTheDocument();
    });

    test('フライトイベントが正しくレンダリングされる', () => {
        const content = `## 2025-03-15

[09:45] - [15:50] flight JL123 :: HND - NRT
  - seat: 12A`;

        render(<MarkdownPreview content={content} timezone="Asia/Tokyo" />);

        expect(screen.getByText('09:45')).toBeInTheDocument();
        expect(screen.getByText('15:50')).toBeInTheDocument();
        expect(screen.getByText('JL123')).toBeInTheDocument();
        expect(screen.getByText('HND')).toBeInTheDocument();
        expect(screen.getByText('NRT')).toBeInTheDocument();
        expect(screen.getByText('12A')).toBeInTheDocument();
    });

    test('通常のMarkdown要素が正しくレンダリングされる', () => {
        const content = `# タイトル

通常の段落テキストです。

- リスト項目1
- リスト項目2`;

        render(<MarkdownPreview content={content} timezone="Asia/Tokyo" />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('タイトル');
        expect(screen.getByText('通常の段落テキストです。')).toBeInTheDocument();
        expect(screen.getByText('リスト項目1')).toBeInTheDocument();
        expect(screen.getByText('リスト項目2')).toBeInTheDocument();
    });
});
