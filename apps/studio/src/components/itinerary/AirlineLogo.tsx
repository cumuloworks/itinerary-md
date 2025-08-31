import { extractAirlineCode } from '@itinerary-md/core/parser';
import { Plane } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

interface AirlineLogoProps {
    flightCode: string;
    size?: number;
    fallbackIcon?: boolean;
}

export const AirlineLogo: React.FC<AirlineLogoProps> = ({ flightCode, size = 24, fallbackIcon = true }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const airlineCode = extractAirlineCode(flightCode);
    const logoUrl = airlineCode ? `https://img.wway.io/pics/root/${airlineCode.toUpperCase()}@png?exar=1&rs=fit:${size}:${size}` : '';

    const handleImageError = () => {
        setImageError(true);
    };

    const handleImageLoad = () => {
        setImageLoaded(true);
    };

    if (imageError || !airlineCode) {
        return fallbackIcon ? <Plane size={size} style={{ color: '#6b7280' }} /> : null;
    }

    return (
        <div
            style={{
                width: size,
                height: size,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: imageLoaded ? 'transparent' : '#f3f4f6',
                borderRadius: '4px',
                overflow: 'hidden',
            }}
        >
            <img
                src={logoUrl}
                alt={`${airlineCode || flightCode} logo`}
                style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    display: imageLoaded ? 'block' : 'none',
                }}
                onError={handleImageError}
                onLoad={handleImageLoad}
            />
            {!imageLoaded && !imageError && <Plane size={size * 0.6} style={{ color: '#9ca3af' }} />}
        </div>
    );
};
