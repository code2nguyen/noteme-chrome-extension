import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarActionsComponent } from './toolbar-actions.component';
import { ToolbarActionItemDirective } from './toolbar-action-item.directive';
import { ToolbarActionMenuItemDirective } from './toolbar-action-menu-item.directive';
import { IntersectionObserverModule } from '../intersection-observer/intersection-observer.module';
@NgModule({
  declarations: [ToolbarActionsComponent, ToolbarActionItemDirective, ToolbarActionMenuItemDirective],
  imports: [CommonModule, IntersectionObserverModule],
  exports: [ToolbarActionsComponent, ToolbarActionItemDirective, ToolbarActionMenuItemDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ToolbarActionsModule {}
