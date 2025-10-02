// client/src/types/jsx.d.ts
declare module '*.jsx' {
  import type { ComponentType } from 'react';
  const Comp: ComponentType<any>;
  export default Comp;
}

declare module '@/pages/AdminConsole';
declare module '@/pages/Login';
declare module '@/pages/PagesIndex';
declare module '@/pages/ProfilePublic';
