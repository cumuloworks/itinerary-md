import { Plane } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

interface AirlineLogoProps {
    flightCode: string;
    size?: number;
    fallbackIcon?: boolean;
}

/**
 * Extract airline code from a flight code.
 * @param flightCode Flight code (e.g., "NH123", "JL456", "3K789").
 * @returns Airline code (IATA 2 alphanumerics) or undefined.
 */
const extractAirlineCode = (flightCode: string): string | undefined => {
    if (!flightCode) return undefined;
    const match = flightCode.match(/^([A-Z0-9]{2})/);
    return match ? match[1] : undefined;
};

export const AirlineLogo: React.FC<AirlineLogoProps> = ({ flightCode, size = 24, fallbackIcon = true }) => {
    const [hasError, setHasError] = useState(false);
    const airlineCode = extractAirlineCode(flightCode);

    if (!airlineCode) {
        return fallbackIcon ? <Plane size={size} style={{ color: '#6b7280' }} /> : null;
    }

    const logoUrl = `https://img.wway.io/pics/root/${airlineCode.toUpperCase()}@png?exar=1&rs=fit:${size}:${size}`;

    return (
        <div
            style={{
                width: size,
                height: size,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                overflow: 'hidden',
            }}
        >
            {!hasError ? (
                <img
                    src={logoUrl}
                    alt={`${airlineCode} logo`}
                    title={`${airlineCode} logo`}
                    style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                    }}
                    onError={() => setHasError(true)}
                />
            ) : (
                <Plane
                    size={size * 0.6}
                    style={{
                        color: '#9ca3af',
                    }}
                />
            )}
        </div>
    );
};
