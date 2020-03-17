declare const _default: {};
export default _default;
declare global {
    interface BollocksConstructor {
        new (): Bollocks;
        render(): void;
        readonly update: Promise<void>;
    }
    export interface Bollocks extends HTMLTemplateElement {
        bind?: any;
        multiple: boolean;
    }
    export const Bollocks: BollocksConstructor | undefined;
    export interface Window {
        Bollocks?: BollocksConstructor;
    }
}
