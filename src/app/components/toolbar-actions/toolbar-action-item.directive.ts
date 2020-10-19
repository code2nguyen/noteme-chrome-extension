import { Directive, Input } from '@angular/core';

@Directive({ selector: '[ntmToolbarActionItem]' })
export class ToolbarActionItemDirective {
  @Input('ntmToolbarActionItem') item = '';
  constructor() {}
}
