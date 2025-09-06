import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";
import {
	COMMON_CURRENCIES,
	convertAmountUSDBase,
	fetchRatesUSD,
	formatCurrency,
	getCachedRatesUSD,
	getRatesUSD,
	initializeRates,
	parseAmountWithCurrency,
	setCachedRatesUSD,
} from "../currency";

describe("currency utilities", () => {
	const originalFetch = global.fetch;
	const originalDateNow = Date.now;

	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		global.fetch = vi.fn() as Mock;
	});

	afterEach(() => {
		global.fetch = originalFetch;
		Date.now = originalDateNow;
	});

	describe("parseAmountWithCurrency", () => {
		it("parses format with currency code at the end", () => {
			expect(parseAmountWithCurrency("100 USD")).toEqual({
				amount: 100,
				currency: "USD",
				raw: "100 USD",
			});
			expect(parseAmountWithCurrency("1,234.56 EUR")).toEqual({
				amount: 1234.56,
				currency: "EUR",
				raw: "1,234.56 EUR",
			});
		});

		it("parses format with currency code at the beginning", () => {
			expect(parseAmountWithCurrency("USD 100")).toEqual({
				amount: 100,
				currency: "USD",
				raw: "USD 100",
			});
			expect(parseAmountWithCurrency("JPY 50000")).toEqual({
				amount: 50000,
				currency: "JPY",
				raw: "JPY 50000",
			});
		});

		it("parses formats containing currency symbols", () => {
			expect(parseAmountWithCurrency("$100")).toEqual({
				amount: 100,
				currency: "USD",
				raw: "$100",
			});
			expect(parseAmountWithCurrency("€50")).toEqual({
				amount: 50,
				currency: "EUR",
				raw: "€50",
			});
			expect(parseAmountWithCurrency("¥1000")).toEqual({
				amount: 1000,
				currency: "JPY",
				raw: "¥1000",
			});
			expect(parseAmountWithCurrency("£25.50")).toEqual({
				amount: 25.5,
				currency: "GBP",
				raw: "£25.50",
			});
		});

		it("parses special currency symbols", () => {
			expect(parseAmountWithCurrency("A$100")).toEqual({
				amount: 100,
				currency: "AUD",
				raw: "A$100",
			});
			expect(parseAmountWithCurrency("C$50")).toEqual({
				amount: 50,
				currency: "CAD",
				raw: "C$50",
			});
			expect(parseAmountWithCurrency("HK$200")).toEqual({
				amount: 200,
				currency: "HKD",
				raw: "HK$200",
			});
		});

		it("handles comma-separated numbers", () => {
			expect(parseAmountWithCurrency("1,000 USD")).toEqual({
				amount: 1000,
				currency: "USD",
				raw: "1,000 USD",
			});
			expect(parseAmountWithCurrency("10,000,000 JPY")).toEqual({
				amount: 10000000,
				currency: "JPY",
				raw: "10,000,000 JPY",
			});
		});

		it("handles numbers with decimals", () => {
			expect(parseAmountWithCurrency("99.99 EUR")).toEqual({
				amount: 99.99,
				currency: "EUR",
				raw: "99.99 EUR",
			});
			expect(parseAmountWithCurrency("0.50 USD")).toEqual({
				amount: 0.5,
				currency: "USD",
				raw: "0.50 USD",
			});
		});

		it("handles negative values", () => {
			expect(parseAmountWithCurrency("-100 USD")).toEqual({
				amount: -100,
				currency: "USD",
				raw: "-100 USD",
			});
			// Current implementation does not support minus before the currency symbol
			// Instead, test a format like €-50
			expect(parseAmountWithCurrency("€-50")).toEqual({
				amount: -50,
				currency: "EUR",
				raw: "€-50",
			});
		});

		it("handles values with modifiers (/night, per person, etc.)", () => {
			expect(parseAmountWithCurrency("100 USD/night")).toEqual({
				amount: 100,
				currency: "USD",
				raw: "100 USD/night",
			});
			expect(parseAmountWithCurrency("EUR 320/night")).toEqual({
				amount: 320,
				currency: "EUR",
				raw: "EUR 320/night",
			});
		});

		it("uses fallback currency when code is missing", () => {
			expect(parseAmountWithCurrency("100", "JPY")).toEqual({
				amount: 100,
				currency: "JPY",
				raw: "100",
			});
			expect(parseAmountWithCurrency("50.5", "EUR")).toEqual({
				amount: 50.5,
				currency: "EUR",
				raw: "50.5",
			});
		});

		it("handles empty strings or null", () => {
			expect(parseAmountWithCurrency("")).toEqual({
				amount: null,
				currency: undefined,
				raw: "",
			});
			expect(parseAmountWithCurrency("   ")).toEqual({
				amount: null,
				currency: undefined,
				raw: "   ",
			});
		});

		it("handles strings that cannot be parsed as numbers", () => {
			expect(parseAmountWithCurrency("abc")).toEqual({
				amount: null,
				currency: undefined,
				raw: "abc",
			});
			expect(parseAmountWithCurrency("N/A", "USD")).toEqual({
				amount: null,
				currency: "USD",
				raw: "N/A",
			});
		});

		it("is case-insensitive for currency codes", () => {
			expect(parseAmountWithCurrency("100 usd")).toEqual({
				amount: 100,
				currency: "USD",
				raw: "100 usd",
			});
			expect(parseAmountWithCurrency("eur 50")).toEqual({
				amount: 50,
				currency: "EUR",
				raw: "eur 50",
			});
		});
	});

	describe("convertAmountUSDBase", () => {
		const mockRates = {
			USD: 1,
			EUR: 0.85,
			JPY: 110,
			GBP: 0.73,
		};

		it("converts from USD to other currencies", () => {
			expect(convertAmountUSDBase(100, "USD", "EUR", mockRates)).toBeCloseTo(
				85,
			);
			expect(convertAmountUSDBase(100, "USD", "JPY", mockRates)).toBeCloseTo(
				11000,
			);
		});

		it("converts from other currencies to USD", () => {
			expect(convertAmountUSDBase(85, "EUR", "USD", mockRates)).toBeCloseTo(
				100,
			);
			expect(convertAmountUSDBase(11000, "JPY", "USD", mockRates)).toBeCloseTo(
				100,
			);
		});

		it("converts between non-USD currencies", () => {
			const eurToJpy = convertAmountUSDBase(100, "EUR", "JPY", mockRates);
			expect(eurToJpy).toBeCloseTo(12941.18, 1);
		});

		it("returns amount as-is when converting to the same currency", () => {
			expect(convertAmountUSDBase(100, "USD", "USD", mockRates)).toBe(100);
			expect(convertAmountUSDBase(50, "EUR", "EUR", mockRates)).toBe(50);
		});

		it("returns null when rate for a currency does not exist", () => {
			expect(convertAmountUSDBase(100, "USD", "XXX", mockRates)).toBeNull();
			expect(convertAmountUSDBase(100, "XXX", "USD", mockRates)).toBeNull();
		});

		it("returns null for invalid inputs", () => {
			expect(convertAmountUSDBase(NaN, "USD", "EUR", mockRates)).toBeNull();
			expect(
				convertAmountUSDBase(Infinity, "USD", "EUR", mockRates),
			).toBeNull();
			expect(convertAmountUSDBase(100, "", "EUR", mockRates)).toBeNull();
			expect(convertAmountUSDBase(100, "USD", "", mockRates)).toBeNull();
		});

		it("converts zero amount", () => {
			expect(convertAmountUSDBase(0, "USD", "EUR", mockRates)).toBe(0);
		});

		it("converts negative amount", () => {
			expect(convertAmountUSDBase(-100, "USD", "EUR", mockRates)).toBeCloseTo(
				-85,
			);
		});
	});

	describe("formatCurrency", () => {
		it("formats amount with currency code", () => {
			const formatted = formatCurrency(1234.56, "USD");
			expect(formatted).toContain("1,234");
			expect(formatted).toMatch(/\$|USD/);
		});

		it("formats various currencies", () => {
			expect(formatCurrency(100, "EUR")).toMatch(/€|EUR/);
			expect(formatCurrency(10000, "JPY")).toMatch(/¥|JPY/);
			expect(formatCurrency(50, "GBP")).toMatch(/£|GBP/);
		});

		it("uses fallback format for invalid currency codes", () => {
			const formatted = formatCurrency(100, "XXX");
			expect(formatted).toContain("100");
			// For invalid currency codes, browsers may use the generic currency sign (¤)
			// or format as number + currency code
			expect(formatted === "¤100.00" || formatted.includes("XXX")).toBe(true);
		});

		it("formats zero", () => {
			const formatted = formatCurrency(0, "USD");
			expect(formatted).toMatch(/\$0|USD\s*0/);
		});

		it("formats negative values", () => {
			const formatted = formatCurrency(-100, "USD");
			expect(formatted).toContain("100");
		});
	});

	describe("Cache management", () => {
		const mockRates = {
			base_code: "USD" as const,
			rates: {
				USD: 1,
				EUR: 0.85,
				JPY: 110,
			},
			time_last_update_unix: 1234567890,
		};

		describe("getCachedRatesUSD", () => {
			it("returns null when cache does not exist", () => {
				expect(getCachedRatesUSD()).toBeNull();
			});

			it("returns a valid cached value", () => {
				const now = Date.now();
				localStorage.setItem(
					"itinerary-md-rates-usd",
					JSON.stringify({
						data: mockRates,
						cachedAt: now,
					}),
				);

				expect(getCachedRatesUSD()).toEqual(mockRates);
			});

			it("returns null for expired cache", () => {
				const oldTime = Date.now() - 13 * 60 * 60 * 1000; // 13 hours ago
				localStorage.setItem(
					"itinerary-md-rates-usd",
					JSON.stringify({
						data: mockRates,
						cachedAt: oldTime,
					}),
				);

				expect(getCachedRatesUSD()).toBeNull();
			});

			it("returns null for invalid JSON", () => {
				localStorage.setItem("itinerary-md-rates-usd", "invalid json");
				expect(getCachedRatesUSD()).toBeNull();
			});

			it("returns null for incomplete data format", () => {
				localStorage.setItem(
					"itinerary-md-rates-usd",
					JSON.stringify({
						data: { base_code: "USD" },
						cachedAt: Date.now(),
					}),
				);

				expect(getCachedRatesUSD()).toBeNull();
			});
		});

		describe("setCachedRatesUSD", () => {
			it("stores data into cache", () => {
				setCachedRatesUSD(mockRates);

				const stored = JSON.parse(
					localStorage.getItem("itinerary-md-rates-usd") || "{}",
				);
				expect(stored.data).toEqual(mockRates);
				expect(stored.cachedAt).toBeLessThanOrEqual(Date.now());
			});

			it("ignores localStorage errors", () => {
				const spy = vi
					.spyOn(Storage.prototype, "setItem")
					.mockImplementation(() => {
						throw new Error("Storage error");
					});
				try {
					expect(() => setCachedRatesUSD(mockRates)).not.toThrow();
				} finally {
					spy.mockRestore();
				}
			});
		});

		describe("fetchRatesUSD", () => {
			it("fetches rates from API", async () => {
				(global.fetch as Mock).mockResolvedValueOnce({
					ok: true,
					json: async () => mockRates,
				});

				const result = await fetchRatesUSD();

				expect(result).toEqual(mockRates);
				expect(global.fetch).toHaveBeenCalledWith(
					"https://open.er-api.com/v6/latest/USD",
				);
			});

			it("stores fetched data into cache", async () => {
				(global.fetch as Mock).mockResolvedValueOnce({
					ok: true,
					json: async () => mockRates,
				});

				await fetchRatesUSD();

				const cached = getCachedRatesUSD();
				expect(cached).toEqual(mockRates);
			});

			it("throws on API error", async () => {
				(global.fetch as Mock).mockResolvedValueOnce({
					ok: false,
				});

				await expect(fetchRatesUSD()).rejects.toThrow("Failed to fetch rates");
			});

			it("throws on invalid response", async () => {
				(global.fetch as Mock).mockResolvedValueOnce({
					ok: true,
					json: async () => ({ invalid: "data" }),
				});

				await expect(fetchRatesUSD()).rejects.toThrow("Invalid rates payload");
			});
		});

		describe("initializeRates", () => {
			it("fetches new rates when no cache", async () => {
				(global.fetch as Mock).mockResolvedValueOnce({
					ok: true,
					json: async () => mockRates,
				});

				await initializeRates();

				expect(global.fetch).toHaveBeenCalled();
				expect(getCachedRatesUSD()).toEqual(mockRates);
			});

			it("skips fetching when cache is valid", async () => {
				setCachedRatesUSD(mockRates);

				await initializeRates();

				expect(global.fetch).not.toHaveBeenCalled();
			});

			it("logs errors as warnings", async () => {
				const consoleWarnSpy = vi
					.spyOn(console, "warn")
					.mockImplementation(() => {});
				(global.fetch as Mock).mockRejectedValueOnce(
					new Error("Network error"),
				);

				await initializeRates();

				expect(consoleWarnSpy).toHaveBeenCalledWith(
					"Failed to initialize currency rates:",
					expect.any(Error),
				);
				consoleWarnSpy.mockRestore();
			});
		});

		describe("getRatesUSD", () => {
			it("returns cached rates synchronously", () => {
				setCachedRatesUSD(mockRates);
				expect(getRatesUSD()).toEqual(mockRates);
			});

			it("returns null when cache is missing", () => {
				expect(getRatesUSD()).toBeNull();
			});
		});
	});

	describe("COMMON_CURRENCIES", () => {
		it("contains common currency codes", () => {
			expect(COMMON_CURRENCIES).toContain("USD");
			expect(COMMON_CURRENCIES).toContain("EUR");
			expect(COMMON_CURRENCIES).toContain("JPY");
			expect(COMMON_CURRENCIES).toContain("GBP");
		});
	});
});
