import { Directive, Input } from '@angular/core';

@Directive({ selector: '[ntmToolbarActionMenuItem]' })
export class ToolbarActionMenuItemDirective {
  @Input('ntmToolbarActionMenuItem') item = '';

  constructor() {}
}
