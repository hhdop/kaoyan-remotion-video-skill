import {Config} from '@remotion/cli/config';

const runtime = globalThis as typeof globalThis & {
  process?: {env?: Record<string, string | undefined>};
};
const environment = runtime.process?.env ?? {};

Config.setShouldOpenBrowser(false);

if (environment.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(environment.REMOTION_BROWSER_EXECUTABLE);
}

if (environment.REMOTION_DISABLE_CACHE === '1') {
  Config.setCachingEnabled(false);
}

