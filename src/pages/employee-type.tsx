import { CONFIG } from 'src/config-global';

import { EmployeeTypeView } from 'src/sections/master/employee-type/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Employee Type List - ${CONFIG.appName}`}</title>
      <EmployeeTypeView />
    </>
  );
}
