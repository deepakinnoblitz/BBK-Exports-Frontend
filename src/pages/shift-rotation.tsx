import { CONFIG } from 'src/config-global';
import { ShiftRotationView } from 'src/sections/shift-rotation/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Shift Rotation - ${CONFIG.appName}`}</title>
      <ShiftRotationView />
    </>
  );
}
