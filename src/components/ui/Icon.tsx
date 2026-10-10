import type { SVGProps } from 'react';

type Name = 'menu' | 'arrow' | 'down' | 'close' | 'plus' | 'settings' | 'copy' | 'check' | 'stop' | 'clock' | 'ball' | 'refresh';
const paths: Record<Name, string> = {
  menu: 'M4 7h16M4 12h16M4 17h10',
  arrow: 'M7 17 17 7M7 7h10v10',
  down: 'M12 4v16M6 14l6 6 6-6',
  close: 'm6 6 12 12M6 18 18 6',
  plus: 'M12 5v14M5 12h14',
  settings: 'M4 7h16M4 17h16M8 4v6M16 14v6',
  copy: 'M9 9h11v11H9zM15 9V4H4v11h5',
  check: 'm5 12 4 4L19 6',
  stop: 'M6 6h12v12H6z',
  clock: 'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  ball: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3v18M5.6 5.6c8.5 0 12.8 4.3 12.8 12.8M18.4 5.6C9.9 5.6 5.6 9.9 5.6 18.4',
  refresh: 'M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.8-1L20 9M4 15l2.1 3A7 7 0 0 0 17.9 17',
};
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: Name }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
