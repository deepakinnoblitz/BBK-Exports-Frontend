import { CONFIG } from 'src/config-global';

import { LineRotationView } from 'src/sections/line-rotation/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Line Rotation - ${CONFIG.appName}`}</title>
      <LineRotationView />
    </>
  );
}
