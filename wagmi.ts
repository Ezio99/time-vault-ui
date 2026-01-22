// path: ./wagmi.ts
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Time Vault',
  projectId: 'YOUR_PROJECT_ID', // Get one at https://cloud.walletconnect.com
  chains: [sepolia],
  ssr: true,
});