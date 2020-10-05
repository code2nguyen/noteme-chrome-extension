import { Type, ComponentFactory } from '@angular/core';
import { Observable } from 'rxjs';

declare global {
  interface Window {
    hljs: any;
    lazyLoadExtensions: {
      [path: string]: {
        (): Observable<{
          module: Type<any>;
          component: any;
        }>;
        _loader?: Observable<ComponentFactory<any>>;
      };
    };
    monaco: any;
  }
}
