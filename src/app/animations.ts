import {
  trigger,
  transition,
  animate,
  style,
  AnimationTriggerMetadata,
  state,
  query,
  animateChild,
  group,
} from '@angular/animations';

export const insertRemoveItemTrigger = trigger('insertRemoveItemTrigger', [
  transition(':enter', [style({ opacity: 0 }), animate('300ms ease-out', style({ opacity: 1 }))]),
  transition(':leave', [animate('300ms ease-out', style({ opacity: 0 }))]),
]);

export const routeAnimation = trigger('routeAnimations', [
  transition('* <=> MainBoard', [
    style({ position: 'relative' }),
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
      }),
    ]),
    query(':enter', [style({ opacity: 0 })]),
    group([
      // query(':leave', [animate('300ms ease-out', style({ opacity: 0 }))]),
      query(':enter', [animate('300ms ease-out', style({ opacity: 1 }))]),
    ]),
    query(':enter', animateChild()),
  ]),
]);
