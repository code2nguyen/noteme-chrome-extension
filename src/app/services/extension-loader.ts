import { Injectable, Compiler, ComponentFactory, Injector, Type } from '@angular/core';
import { Observable, throwError, from } from 'rxjs';
import { map, mergeMap, shareReplay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ExtensionLoader {
  constructor(private injector: Injector, private compiler: Compiler) {}

  getComponentFactory(extensionId: string): Observable<ComponentFactory<any>> {
    const loader = window.lazyLoadExtensions[extensionId];
    if (!loader) {
      return throwError(new Error(`can not find loader for ${extensionId}`));
    }
    if (!loader._loader) {
      loader._loader = (loader as () => Observable<{
        module: Type<any>;
        component: any;
      }>)().pipe(
        mergeMap(({ module, component }) => {
          return from(this.compiler.compileModuleAsync(module)).pipe(
            map((moduleFactory) => ({ moduleFactory, component }))
          );
        }),
        map(({ moduleFactory, component }) => {
          const moduleRef = moduleFactory.create(this.injector);
          const componentFactory = moduleRef.componentFactoryResolver.resolveComponentFactory(component);
          return componentFactory;
        }),
        shareReplay(1)
      );
    }
    return loader._loader;
  }
}
