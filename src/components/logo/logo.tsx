import type { LinkProps } from '@mui/material/Link';

import { mergeClasses } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { styled } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';

import { useHRMSSettings } from 'src/hooks/use-hrms-settings';

import { CONFIG } from 'src/config-global';

import { logoClasses } from './classes';

// ----------------------------------------------------------------------

export type LogoProps = LinkProps & {
  isSingle?: boolean;
  disabled?: boolean;
};

export function Logo({
  sx,
  disabled,
  className,
  href = '/',
  isSingle = true,
  ...other
}: LogoProps) {
  const { settings } = useHRMSSettings();
  const logoUrl = `${CONFIG.assetsDir}/logo/Innoblitz%20Logo%20Full.png`;

  const singleLogo = (
    <Box
      component="img"
      src={logoUrl}
      alt="Single logo"
      sx={{ width: 1, height: 100, objectFit: 'contain', mt: 2 }}
    />
  );

  const fullLogo = (
    <Box
      component="img"
      src={logoUrl}
      alt="Full logo"
      sx={{ width: 1, height: 100, objectFit: 'contain' }}
    />
  );

  return (
    <LogoRoot
      component={RouterLink}
      href={href}
      aria-label="Logo"
      underline="none"
      className={mergeClasses([logoClasses.root, className])}
      sx={[
        {
          width: 1,
          height: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 0,
          marginTop: 0,
          marginBottom: 2.5,
          ...(disabled && { pointerEvents: 'none' }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {logoUrl && (isSingle ? singleLogo : fullLogo)}
    </LogoRoot>
  );
}

// ----------------------------------------------------------------------

const LogoRoot = styled(Link)(() => ({
  flexShrink: 0,
  color: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));
