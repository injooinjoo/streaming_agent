const envMockValue = import.meta.env.VITE_USE_MOCK_DATA;
const envPublicDemoValue = import.meta.env.VITE_PUBLIC_DEMO;

export const SHOULD_USE_MOCK_DATA =
  envMockValue === 'true' || (envMockValue !== 'false' && import.meta.env.PROD);

export const PUBLIC_DEMO_MODE =
  envPublicDemoValue === 'true' || (import.meta.env.PROD && SHOULD_USE_MOCK_DATA);

export const PUBLIC_HOME_PATH = '/streaming-agent';
