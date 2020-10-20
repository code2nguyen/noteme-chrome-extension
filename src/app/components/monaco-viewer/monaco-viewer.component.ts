import { LitElement, customElement, css, property, html, TemplateResult, query } from 'lit-element';

@customElement('ntm-monaco-viewer')
export class MonacoViewer extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex: 1;
      width: 100%;
      height: 100%;
    }
  `;

  private currentValue: any;
  @property({ type: Object })
  public get value(): any {
    return this.currentValue;
  }
  public set value(value: any) {
    if (this.currentValue === value) {
      return;
    }
    const oldValue = this.currentValue;
    this.currentValue = value;
    this.colorize();
  }

  private currentLanguage = 'markdown';
  @property({ type: String })
  public get language(): string {
    return this.currentLanguage;
  }
  public set language(value) {
    this.currentLanguage = value;
    this.colorize();
  }

  @query('#monacoContainer') monacoContainer!: HTMLElement;

  text = '';
  createRenderRoot(): any {
    return this;
  }

  connectedCallback(): void {
    this.style.width = '100%';
    this.style.height = '180px';
    this.style.display = 'flex';
    super.connectedCallback();
  }

  firstUpdated(): void {
    this.colorize();
  }

  render(): TemplateResult {
    return html` <div id="monacoContainer" style="flex: 1; padding: 0 16px"></div> `;
  }

  async colorize(): Promise<any> {
    this.text = await window.monaco.editor.colorize(this.value, this.language, {
      tabSize: 2,
      theme: 'Atom-One-Dark-Viewer',
    });
    if (this.monacoContainer) {
      this.monacoContainer.innerHTML = this.text;
    }
  }
}
