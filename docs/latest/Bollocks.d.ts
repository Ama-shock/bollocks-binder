interface Bollocks {
    bind?: any;
    multiple: boolean;
}
declare global {
    interface Window {
        Bollocks?: {
            new (): Bollocks;
            render(): void;
            readonly update: Promise<void>;
        };
    }
}
declare const _default: {
    new (): Bollocks;
    render(): void;
    readonly update: Promise<void>;
} | undefined;
export default _default;
