export type MoneyFragment = {
    kind: 'money';
    raw: string;
    currency: string;
    amount: string;
    normalized: {
        currency: string;
        amount: string;
        scale: number;
    };
    meta?: {
        symbol?: string;
        localeGuess?: string;
        source?: 'inline' | 'defaultCurrency' | 'symbolInferred';
    };
    position?:
        | {
              start?: number;
              end?: number;
          }
        | undefined;
    warnings?: string[];
};
export type PriceOperator = {
    kind: 'op';
    op: 'add' | 'sub' | 'mul' | 'div' | 'groupOpen' | 'groupClose';
    raw: string;
    position?:
        | {
              start?: number;
              end?: number;
          }
        | undefined;
};
export type PriceTokens = Array<
    | MoneyFragment
    | PriceOperator
    | {
          kind: 'number';
          raw: string;
          normalized: string;
      }
>;
export type PriceNode = {
    type: 'itmdPrice';
    rawLine: string;
    tokens: PriceTokens;
    flags: {
        hasMath: boolean;
        crossCurrency: boolean;
        hasNumberOnlyTerm: boolean;
    };
    summary: {
        currencies: string[];
        moneyCount: number;
    };
    data: {
        normalized: true;
        needsEvaluation: boolean;
    };
    position?:
        | {
              start?: number;
              end?: number;
          }
        | undefined;
    warnings?: string[];
};
export declare function normalizePriceLine(rawLine: string, defaultCurrency?: string): PriceNode;
