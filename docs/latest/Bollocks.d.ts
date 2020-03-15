interface Bollocks extends HTMLTemplateElement {
    bind?: any;
    multiple: boolean;
}
interface BollocksConstructor {
    new (): Bollocks;
    render(): void;
    readonly update: Promise<void>;
}
declare global {
    export const Bollocks: BollocksConstructor | undefined;
    export interface Window {
        Bollocks?: BollocksConstructor;
    }
}
declare const _default: BollocksConstructor;
export default _default;
