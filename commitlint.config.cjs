const asciiOnly = (text) => {
    if (!text) return [true];
    const arr = [...text];
    const i = arr.findIndex((ch) => ch.codePointAt(0) > 0x7F);
    return i === -1
        ? [true]
        : [false, `contains non-ASCII char "${arr[i]}" at index ${i}`];
};

module.exports = {
    extends: ['@commitlint/config-conventional'],
    plugins: [
        {
            rules: {
                'header-ascii-only': ({ header }) => asciiOnly(header),
                'body-ascii-only': ({ body }) => asciiOnly(body),
                'footer-ascii-only': ({ footer }) => asciiOnly(footer),
            },
        },
    ],
    rules: {
        'header-ascii-only': [2, 'always'],
        'body-ascii-only': [2, 'always'],
        'footer-ascii-only': [2, 'always'],
    },
};
