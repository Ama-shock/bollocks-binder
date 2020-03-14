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
        }
    }
}

function setupBollocks(self: typeof window){
    if(self?.Bollocks) return;
    if(!self.document.head) return;

    function propName<E extends Element>(element: E, attrName: string){
        const lower = attrName.substr(':-'.length).toLowerCase();
        for(let prop in element){
            if(prop.toLowerCase() == lower) return prop;
        }
        return lower as keyof E & string;
    }

    interface Binded {
        [key: string] : {
            prop: string;
            value: any;
        }
    }
    const binded = Symbol(':-binded');
    function syncProp<E extends Element>(el: E, bind: any){
        const prev = (el as any)[binded] || {} as Binded;
        const next = (el as any)[binded] = {} as Binded;
        if(bind == null) return false;
        let available = false;
        for(let attr of el.getAttributeNames()){
            if(!attr.startsWith(':-')) continue;
            available = true;
            const key = el.getAttribute(attr);
            const prop = propName(el, attr);
            const propDesc = Object.getOwnPropertyDescriptor(el, prop)!;
            const imutable = propDesc && !propDesc.writable && !propDesc.set;
            if(!key){
                if(!imutable) el[prop] = null as any;
                continue;
            }
            
            const referSelf = (key === ':-');
            let value = referSelf ? bind : bind[key];
            const changed = (value !== prev[key]?.value);
            next[key] = { prop, value };

            if(attr === ":-"){
                if(!referSelf) bind[key] = el;
                continue;
            }
            if(typeof value === "function"){
                if(changed) el[prop] = value.bind(bind);
                continue;
            }
            if(!changed && !referSelf && value != el[prop]){
                value = bind[key] = el[prop];
            }
            if(!imutable){
                if(el[prop] != value){
                    el[prop] = value;
                }
                if(!referSelf && bind[key] != el[prop]) bind[key] = el[prop];
            }
        }
        return available;
    }

    function isBollocks(node: Node|null): node is Bollocks{
        const view = node?.ownerDocument?.defaultView as Window;
        if(!view?.Bollocks) return false;
        return node instanceof view.Bollocks;
    }
    function getBind(el: Element){
        while(el){
            const view = el.ownerDocument?.defaultView;
            if(!view) return null;
            if(isBollocks(el.parentElement)) {
                const bollocks = el.parentElement;
                if(bollocks.multiple && (Symbol.iterator in bollocks.bind)){
                    const idx = bollocks[documents].findIndex(doc=>doc.has(el));
                    return bollocks.bind[idx];
                }
                return bollocks.bind;
            }
            el = el.parentElement || view.frameElement;
        }
        return null;
    }
    function render(element: Element){
        if(!element.isConnected){
            renderList.delete(element);
            return;
        }
        const data = getBind(element);
        const hasAttr = syncProp(element, data);
        if(isBollocks(element)){
            applyTemplate(element);
            return;
        }
        if(isSameOriginFrame(element)){
            element.contentWindow?.Bollocks?.render();
            return;
        }
        if(!hasAttr) renderList.delete(element);
    }

    const documents = Symbol(':-documents');
    function applyTemplate<T>(bollocks: Bollocks<T>){
        if(document.readyState == 'loading')  return;
        if(bollocks.bind == null){
            while(bollocks.firstChild) bollocks.removeChild(bollocks.firstChild);
            bollocks[documents] = [];
            return;
        }
        const bindList = bollocks.multiple && (Symbol.iterator in bollocks.bind) ?
                bollocks.bind as T[]:
                [bollocks.bind] as T[];

        while(bollocks[documents].length > bindList.length){
            const nodes = bollocks[documents].pop()!;
            nodes.forEach(node=>bollocks.removeChild(node));
        }
        while(bollocks[documents].length < bindList.length){
            const fragment = document.importNode(bollocks.content, true);
            bollocks[documents].push(new Set(fragment.children));
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

    function digObserveElements(nodes: NodeList){
        for(let node of nodes){
            if('attributes' in node){
                const el = node as Element;
                for(let attr of el.getAttributeNames()){
                    if(attr.startsWith(':-')){
                        renderList.add(el);
                        break;
                    }
                }
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
                        renderList.add(rec.target as Element);
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
            this[documents] = [];
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
        [documents] = [] as Set<Element>[];
    }

    const style = self.document.createElement('style');
    self.document.head.appendChild(style);
    (style.sheet as CSSStyleSheet).insertRule('template[is="bollocks-binder"]{ display: block; }');
    self.customElements.define('bollocks-binder', Bollocks, { extends: 'template' });
    Object.defineProperty(self, 'Bollocks', { value: Bollocks });
};
setupBollocks(self);
export default self.Bollocks;
