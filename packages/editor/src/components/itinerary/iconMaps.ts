import type { LucideIcon } from 'lucide-react';
import {
    Activity as ActivityIcon,
    Armchair,
    Bed,
    Building,
    Bus,
    CableCar,
    Calendar,
    Camera,
    Car,
    CarTaxiFront,
    CircleUser,
    Clock,
    Coffee,
    FerrisWheel,
    Globe,
    Handshake,
    Landmark,
    LogIn,
    LogOut,
    Luggage,
    Mail,
    MapPin,
    Notebook,
    Phone,
    Plane,
    PlaneTakeoff,
    Rocket,
    Ruler,
    Ship,
    ShoppingBag,
    Sparkles,
    Star,
    Tag,
    Ticket,
    TowerControl,
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
    seat: { icon: Armchair },
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
    checkin: { icon: LogIn },
    checkout: { icon: LogOut },
    tag: { icon: Tag },
    cuisine: { icon: UtensilsCrossed },
    note: { icon: Notebook },
    desc: { icon: Tag },
    text: { icon: Tag },
    coach: { icon: Train },
    class: { icon: Star },
    reference: { icon: Ticket },
    duration: { icon: Clock },
    distance: { icon: Ruler },
    gate: { icon: PlaneTakeoff },
    terminal: { icon: TowerControl },
    baggage: { icon: Luggage },
    contact: { icon: CircleUser },
    tel: { icon: Phone },
    mail: { icon: Mail },
    web: { icon: Globe },
    email: { icon: Mail },
    website: { icon: Globe },
    url: { icon: Globe },
    link: { icon: Globe },
    address: { icon: MapPin },
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
    taxi: CarTaxiFront,
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
    sightseeing: FerrisWheel,
    shoot: Camera,
    shopping: ShoppingBag,
    spa: Sparkles,
    park: TreePine,
    cafe: Coffee,
    cablecar: CableCar,
    meeting: Handshake,
    rocket: Rocket,
    spaceship: Rocket,
};

export function getIconForEventType(type: string): LucideIcon {
    return eventTypeIconMap[type] || MapPin;
}
