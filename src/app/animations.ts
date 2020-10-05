import { trigger, transition, animate, style, AnimationTriggerMetadata, state } from '@angular/animations';

export const insertRemoveItemTrigger = trigger('insertRemoveItemTrigger', [
  transition(':enter', [style({ opacity: 0 }), animate('300ms ease-out', style({ opacity: 1 }))]),
  transition(':leave', [animate('300ms ease-out', style({ opacity: 0 }))]),
]);
