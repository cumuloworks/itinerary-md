import { useEffect, useState } from 'react';
import type { RatesUSDBase } from '../utils/currency';
import { getRatesUSD, initializeRates } from '../utils/currency';

interface UseRatesUSDResult {
    data: RatesUSDBase | null;
    ready: boolean;
}

/**
 * 為替レートの取得とロード状態を管理するHook
 * レートが利用可能になったときにコンポーネントを再レンダリングする
 */
export function useRatesUSD(): UseRatesUSDResult {
    const [ratesState, setRatesState] = useState<UseRatesUSDResult>(() => {
        const initialRates = getRatesUSD();
        return {
            data: initialRates,
            ready: initialRates !== null,
        };
    });

    useEffect(() => {
        // レートがまだ利用できない場合、定期的にチェック
        if (!ratesState.ready) {
            const checkRates = () => {
                const currentRates = getRatesUSD();
                if (currentRates) {
                    setRatesState({
                        data: currentRates,
                        ready: true,
                    });
                    return true; // チェック終了
                }
                return false; // チェック継続
            };

            // 初回チェック
            if (checkRates()) {
                return;
            }

            // レートが利用できるまで定期的にチェック
            const interval = setInterval(() => {
                if (checkRates()) {
                    clearInterval(interval);
                }
            }, 100); // 100ms間隔でチェック

            // バックアップとしてレートの初期化を再試行
            initializeRates().catch(() => {
                // エラーは無視（initializeRatesが既にログ出力している）
            });

            return () => clearInterval(interval);
        }
    }, [ratesState.ready]);

    return ratesState;
}
