import { InjectionToken } from '@angular/core';
import { uuid } from './utils';

/**
 * Identifies this open tab in the records it writes (`sourceId`), so a storage change event can be told apart from
 * an echo of our own write. Angular's APP_ID was random per page in 2.x (Angular 11) and is the constant 'ng' since
 * Angular 16, which would make every tab ignore every other tab's edits.
 */
export const INSTANCE_ID = new InjectionToken<string>('Noteme tab instance id', {
  providedIn: 'root',
  factory: () => uuid(),
});
