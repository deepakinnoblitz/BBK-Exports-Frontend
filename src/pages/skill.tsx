import { CONFIG } from 'src/config-global';

import { SkillView } from 'src/sections/master/skill/view/skill-view';

// ----------------------------------------------------------------------

export default function SkillPage() {
  return (
    <>
      <title>{`Skill List - ${CONFIG.appName}`}</title>
      <SkillView />
    </>
  );
}
