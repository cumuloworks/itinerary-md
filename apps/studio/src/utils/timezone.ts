export function getTimezoneOptions(): string[] {
    const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
    return intl.supportedValuesOf?.('timeZone') ?? ['UTC', 'Asia/Tokyo', 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'Europe/Paris', 'Asia/Singapore'];
}
