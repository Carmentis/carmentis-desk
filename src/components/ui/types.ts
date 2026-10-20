export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface SegmentedOption<T extends string | number> {
    value: T;
    label: string;
    icon?: string;
}

export interface TabItem {
    value: string;
    label: string;
    icon?: string;
    badge?: string | number;
    hidden?: boolean;
}
