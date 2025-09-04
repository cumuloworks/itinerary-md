export function isValidIanaTimeZone(tz: unknown): tz is string {
    if (typeof tz !== 'string' || tz.trim() === '') return false;
    try {
        const dtf = new Intl.DateTimeFormat(undefined, { timeZone: tz });
        return dtf.resolvedOptions().timeZone === tz;
    } catch {
        return false;
    }
}

export function coerceIanaTimeZone(tz: unknown): string | undefined {
    const re = /^(?:\s*(?:UTC|GMT)\s*)?([+-])(\d{1,2})(?::?(\d{1,2}))?$/i;
    if (typeof tz === 'string') {
        const raw: string = tz.trim();
        if (raw === '') return undefined;
        // 1) IANA 名称ならそのまま
        if (isValidIanaTimeZone(raw)) return raw;

        // 2) UTC/GMT またはオフセット表記を Luxon が受理可能な形式 "UTC+HH:MM" に正規化
        //    許容: "+9", "+09", "+0900", "+09:00"、および先頭に "UTC"/"GMT" が付く形式
        //    例: "UTC+9", "GMT+09:00", "+09:00", "-0530"
        const m1 = re.exec(raw);
        if (m1) {
            const sign = m1[1] === '-' ? '-' : '+';
            const hhNum = Number(m1[2]);
            const mmNum = m1[3] ? Number(m1[3]) : 0;
            if (Number.isFinite(hhNum) && Number.isFinite(mmNum)) {
                // 一般的な範囲チェック（IANA 固定オフセットの上限は +14:00、下限は -12:00 程度）
                if (hhNum >= 0 && hhNum <= 14 && mmNum >= 0 && mmNum < 60) {
                    const hh = String(hhNum).padStart(2, '0');
                    const mm = String(mmNum).padStart(2, '0');
                    return `UTC${sign}${hh}:${mm}`;
                }
            }
        }

        // 3) "UTC"/"GMT" 単独は UTC と見なす
        if (/^(UTC|GMT)$/i.test(raw)) return 'UTC+00:00';
    }
    return undefined;
}
