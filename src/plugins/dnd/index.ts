import { registerPlugin } from '@capacitor/core';

export interface DndPlugin {
  enter(): Promise<{ active: boolean }>;
  exit(): Promise<{ active: boolean }>;
  isActive(): Promise<{ active: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  checkPermission(): Promise<{ granted: boolean }>;
}

const Dnd = registerPlugin<DndPlugin>('Dnd', {});

export default Dnd;
