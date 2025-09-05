import type { LucideIcon } from 'lucide-react';
import {
    Activity as ActivityIcon,
    Bed,
    Building,
    Bus,
    Calendar,
    Camera,
    Car,
    Clock,
    Coffee,
    Landmark,
    MapPin,
    Phone,
    Plane,
    Ship,
    ShoppingBag,
    Sparkles,
    Star,
    Tag,
    Train,
    TreePine,
    Users,
    UtensilsCrossed,
    Wallet,
    Wifi,
} from 'lucide-react';

// Metadata keys → icon mapping
export const metadataIconMap: Record<string, { icon: LucideIcon; isSpecial?: boolean }> = {
    cost: { icon: Wallet, isSpecial: true },
    price: { icon: Wallet, isSpecial: true },
    seat: { icon: Users },
    room: { icon: Bed },
    guests: { icon: Users },
    aircraft: { icon: Plane },
    vehicle: { icon: Car },
    location: { icon: MapPin },
    addr: { icon: MapPin },
    phone: { icon: Phone },
    wifi: { icon: Wifi },
    rating: { icon: Star },
    reservation: { icon: Calendar },
    checkin: { icon: Clock },
    checkout: { icon: Clock },
    tag: { icon: Tag },
    cuisine: { icon: Tag },
    note: { icon: Tag },
    desc: { icon: Tag },
    text: { icon: Tag },
};

export function toLabelFromKey(key: string): string {
    return key
        .split(/[_\-\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export function getMetadataConfig(key: string): { icon: LucideIcon; label: string; isSpecial?: boolean } {
    const cfg = metadataIconMap[key] || { icon: Tag };
    return { icon: cfg.icon, label: toLabelFromKey(key), isSpecial: cfg.isSpecial };
}

// Event type → icon mapping (used by EventBlock)
export const eventTypeIconMap: Record<string, LucideIcon> = {
    flight: Plane,
    train: Train,
    drive: Car,
    ferry: Ship,
    bus: Bus,
    taxi: Car,
    subway: Train,
    stay: Building,
    hotel: Building,
    dormitory: Bed,
    hostel: Bed,
    ryokan: Landmark,
    meal: UtensilsCrossed,
    lunch: UtensilsCrossed,
    dinner: UtensilsCrossed,
    breakfast: UtensilsCrossed,
    brunch: UtensilsCrossed,
    activity: ActivityIcon,
    museum: Landmark,
    sightseeing: Camera,
    shopping: ShoppingBag,
    spa: Sparkles,
    park: TreePine,
    cafe: Coffee,
};

export function getIconForEventType(type: string): LucideIcon {
    return eventTypeIconMap[type] || ActivityIcon;
}
