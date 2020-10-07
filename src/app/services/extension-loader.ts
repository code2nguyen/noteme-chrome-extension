import { Injectable, Compiler, ComponentFactory, Injector, Type } from '@angular/core';
import { Observable, throwError, from } from 'rxjs';
import { map, mergeMap, shareReplay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ExtensionLoader {
  constructor(private injector: Injector, private compiler: Compiler) {}
}
