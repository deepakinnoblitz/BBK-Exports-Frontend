import { CONFIG } from 'src/config-global';

import { FaceLineChangeView } from 'src/sections/line-roster/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Face Recognition Line Change - ${CONFIG.appName}`}</title>
      <FaceLineChangeView />
    </>
  );
}

