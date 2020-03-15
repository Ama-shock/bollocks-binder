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
    export const Bollocks: BollocksConstructor|undefined;
    export interface Window {
        Bollocks?: BollocksConstructor;
    }
}

function setupBollocks(self: typeof window){
    if(self.Bollocks) return;
    if(!self.document.head) return;

    function propName<E extends Element>(element: E, attrName: string){
        const lower = attrName.substr(':-'.length).toLowerCase();
        for(let prop in element){
            if(prop.toLowerCase() == lower) return prop;
        }
        return lower as keyof E & string;
    }

    const binded = Symbol(':-binded');
    const attributes = Symbol(':-attributes');
    type BindedElement<E extends Element> = E & {
        [binded]: {bollocks: Bollocks, index: number}|null;
        [attributes]: {
            [attr: string]: {
                prop: keyof E & string,
                key: string|null,
                value?: any
            } | null
        }
    };
    
    function syncProp<E extends Element>(element: E){
        const el = element as BindedElement<E>;
        if(!el[binded]) return false;
        const bollocks = el[binded]!.bollocks; 
        const index = el[binded]!.index; 
        const bind = bollocks.multiple && (Symbol.iterator in bollocks.bind) ?
                bollocks.bind[index]:
                bollocks.bind;
        if(bind == null) return false;
        if(!(el as any)[attributes]) return false;
        for(let attr in el[attributes]){
            if(!el.hasAttribute(attr)){
                delete el[attributes][attr];
                continue;
            }
            const prevState = el[attributes][attr];
            const key = el.getAttribute(attr);
            const prop = prevState ? prevState.prop : propName(el, attr);
            const propDesc = Object.getOwnPropertyDescriptor(el, prop)!;
            const imutable = propDesc && !propDesc.writable && !propDesc.set;
            const state = el[attributes][attr] = { prop, key, value: null as any };
            if(!key){
                if(!imutable) el[prop] = null as any;
                continue;
            }
            
            const referSelf = (key === ':-');
            const value = state.value = referSelf ? bind : bind[key];
            const bindChanged = !prevState || state.value !== prevState.value;

            if(attr === ":-"){
                if(!referSelf) bind[key] = el;
                continue;
            }
            if(typeof value === "function"){
                if(bindChanged) el[prop] = value.bind(bind);
                continue;
            }
            if(!bindChanged && !referSelf && value != el[prop]){
                state.value = bind[key] = el[prop];
            }
            if(!imutable){
                const value = referSelf ? bind : bind[key];
                if(el[prop] != value) el[prop] = value;
                if(!referSelf && bind[key] != el[prop]) bind[key] = el[prop];
            }
        }
        if(!Object.keys(el[attributes]).length) delete el[attributes];
    }

    function isBollocks(node: Node|null): node is Bollocks{
        return node?.constructor.name == 'Bollocks';
    }
    function render(element: Element){
        const el = element as BindedElement<Element>;
        if(!el.isConnected){
            renderList.delete(el);
            return;
        }
        syncProp(el);
        if(isBollocks(el)){
            applyTemplate(el);
            return;
        }
        if(isSameOriginFrame(el)){
            el.contentWindow?.Bollocks?.render();
            return;
        }
        if(!el[attributes]) renderList.delete(el);
    }

    function applyTemplate<T>(bollocks: Bollocks<T>){
        if(document.readyState == 'loading')  return;
        if(bollocks.bind == null){
            while(bollocks.firstChild) bollocks.removeChild(bollocks.firstChild);
            bollocks['@documents'] = [];
            return;
        }
        const bindList = bollocks.multiple && (Symbol.iterator in bollocks.bind) ?
                bollocks.bind as T[]:
                [bollocks.bind] as T[];

        while(bollocks['@documents'].length > bindList.length){
            const nodes = bollocks['@documents'].pop()!;
            nodes.forEach(node=>bollocks.removeChild(node));
        }
        while(bollocks['@documents'].length < bindList.length){
            const fragment = document.importNode(bollocks.content, true);
            bollocks['@documents'].push(new Set(fragment.children));
            bollocks.appendChild(fragment);
        }
    }

    function isSameOriginFrame(node: Node): node is HTMLIFrameElement {
        if(!('src' in node)) return false;
        if(!('srcdoc' in node)) return false;
        const ifr = node as HTMLIFrameElement;
        if(!ifr.srcdoc && ifr.src){
            if(new URL(ifr.src).origin != self.origin) return false;
        }
        if(!ifr.contentWindow) return false;
        setupBollocks(ifr.contentWindow as typeof window);
        return true;
    }

    const renderList = new Set<Element>();
    let update = Promise.resolve();
    async function renderLoop(){
        let updateResolve!: ()=>void;
        while(true){
            update = new Promise(r=>updateResolve=r);
            await new Promise(r=>requestAnimationFrame(r));
            Bollocks.render();
            updateResolve();
        }
    }
    if(self.parent === self || !self.parent.Bollocks) renderLoop();

    function getBind(el: Element){
        while(el){
            const view = el.ownerDocument?.defaultView;
            if(!view) return null;
            if(isBollocks(el.parentElement)) {
                const bollocks = el.parentElement;
                if(bollocks.multiple && (Symbol.iterator in bollocks.bind)){
                    const index = bollocks['@documents'].findIndex(doc=>doc.has(el));
                    return {bollocks, index};
                }
                return { bollocks, index: 0};
            }
            el = el.parentElement || view.frameElement;
        }
        return null;
    }
    function addRenderList(node: Element){
        const el = node as BindedElement<Element>;
        for(let attr of el.getAttributeNames()){
            if(!attr.startsWith(':-')) continue;
            if(!el[attributes]) el[attributes] = {};
            if(!el[attributes][attr]) el[attributes][attr] = null;
        }
        if(!el[attributes]) return false;
        renderList.add(el);
        if(!el[binded]) el[binded] = getBind(el);
        return true;
    }

    function digObserveElements(nodes: NodeList){
        for(let node of nodes){
            if('attributes' in node){
                const el = node as Element;
                addRenderList(el);
                digObserveElements(el.childNodes);
            }
        }
    }
    const observer = new MutationObserver(records=>{
        for(let rec of records){
            if(isBollocks(rec.target)){
                renderList.add(rec.target);
            }else{
                const bind = getBind(rec.target as Element);
                if(bind == null) return;
            }

            if(isSameOriginFrame(rec.target)){
                renderList.add(rec.target);
                return;
            }
            switch(rec.type){
                case 'attributes':
                    if(rec.attributeName?.startsWith(':-')){
                        addRenderList(rec.target as Element);
                    }
                    continue;
                case 'childList':
                    digObserveElements(rec.addedNodes);
                    continue;
            }
        }
    });
    observer.observe(self.document, {
        attributes: true,
        attributeOldValue: true,
        childList: true,
        subtree: true
    });
    digObserveElements(self.document.childNodes);

    class Bollocks<T = any> extends self.HTMLTemplateElement {
        static get update(): Promise<void>{
            if(self.parent === self) return update;
            if(!self.parent.Bollocks) return update;
            return self.parent.Bollocks.update;
        }
        static render(){
            renderList.forEach(el=>render(el));
        }
        
        connectedCallback(){
            if(!this.isConnected) return;
            this.setAttribute('is', 'bollocks-binder');
            renderList.add(this);
        }
        disconnectedCallback(){
            renderList.delete(this);
            while(this.firstChild) this.removeChild(this.firstChild);
            this['@documents'] = [];
        }

        static get observedAttributes(){
            return ['bind'];
        }
        attributeChangedCallback(name: string, prev: string, current: string){
            switch(name){
                case 'bind':
                    this.bind = current ? eval(current) : undefined;
                    return;
            }
        }

        get multiple(){
            return this.hasAttribute('multiple');
        }
        set multiple(value: boolean){
            if(value) this.setAttribute('multiple', '');
            else this.removeAttribute('multiple');
        }
        bind?: T|ArrayLike<T> = undefined;
        '@documents' = [] as Set<Element>[];
    }

    const style = self.document.createElement('style');
    self.document.head.appendChild(style);
    (style.sheet as CSSStyleSheet).insertRule('template[is="bollocks-binder"]{ display: block; }');
    self.customElements.define('bollocks-binder', Bollocks, { extends: 'template' });
    Object.defineProperty(self, 'Bollocks', { value: Bollocks });
};
setupBollocks(self);
export default self.Bollocks as BollocksConstructor;
