'use client';

import { useState } from 'react';
import { ConnectButton, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { useWriteContract, useReadContract, useAccount, WagmiProvider } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

// Make sure these point to the files we created in the root!
import { config } from '../wagmi';
import VaultABI from '../abi/Vault.json';

// ---------------------------
// CONSTANTS
// ---------------------------
const VAULT_ADDRESS = '0x38B1E30Da393ac75217D746714c5fbc256282185';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

const queryClient = new QueryClient();

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <MainPage />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function MainPage() {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <header className="flex justify-between items-center mb-10 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          Time Vault
        </h1>
        <ConnectButton />
      </header>

      <main className="max-w-xl mx-auto bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
        {/* Tabs */}
        <div className="flex mb-6 bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-2 rounded-md transition-all ${
              activeTab === 'deposit' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Lock Funds
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-2 rounded-md transition-all ${
              activeTab === 'withdraw' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Withdraw / Check
          </button>
        </div>

        {activeTab === 'deposit' ? <DepositForm /> : <WithdrawForm />}
      </main>
    </div>
  );
}

// ---------------------------
// COMPONENT: DEPOSIT
// ---------------------------
function DepositForm() {
  const { writeContract, isPending, isSuccess } = useWriteContract();
  
  const [amount, setAmount] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [lockTime, setLockTime] = useState('3600'); // Default 1 hour

  const handleDeposit = () => {
    if (!amount || !beneficiary) return;
    
    // Logic: depositEth(uint256 _secondsToLockMoney, address _beneficiary)
    writeContract({
      address: VAULT_ADDRESS,
      abi: VaultABI,
      functionName: 'depositEth',
      args: [BigInt(lockTime), beneficiary],
      value: parseEther(amount),
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-2">Create a New Lock</h2>
      
      <div>
        <label className="block text-sm text-gray-400 mb-1">Amount (ETH)</label>
        <input 
          type="number" 
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.1"
          className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Beneficiary Address</label>
        <input 
          type="text" 
          value={beneficiary}
          onChange={(e) => setBeneficiary(e.target.value)}
          placeholder="0x..."
          className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Lock Duration (Seconds)</label>
        <select 
          value={lockTime}
          onChange={(e) => setLockTime(e.target.value)}
          className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="60">1 Minute (Test)</option>
          <option value="3600">1 Hour</option>
          <option value="86400">1 Day</option>
          <option value="31536000">1 Year</option>
        </select>
      </div>

      <button 
        onClick={handleDeposit}
        disabled={isPending}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors disabled:opacity-50"
      >
        {isPending ? 'Confirming...' : 'Lock ETH'}
      </button>

      {isSuccess && <p className="text-green-400 text-center text-sm">Transaction Sent!</p>}
    </div>
  );
}

// ---------------------------
// COMPONENT: WITHDRAW
// ---------------------------
function WithdrawForm() {
  const { address: myAddress } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  const [depositor, setDepositor] = useState('');
  
  // Define a Flexible Type that handles both Object and Array shapes from the contract
  type LockerResponse = {
    balance?: bigint;
    unlockTime?: bigint;
    0?: bigint;
    1?: bigint;
  };

  const { data: lockerData, refetch } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VaultABI,
    functionName: 'getLocker',
    args: [ETH_ADDRESS, depositor, myAddress],
    query: {
      enabled: !!depositor && !!myAddress,
    }
  });

  // Cast safely to our flexible type
  const locker = lockerData as LockerResponse | undefined;

  // Robust Extraction: Check property first, then index, then default to 0
  const balance = locker?.balance ?? locker?.[0] ?? BigInt(0);
  const rawUnlockTime = locker?.unlockTime ?? locker?.[1] ?? BigInt(0);
  
  const unlockTime = Number(rawUnlockTime);
  const isUnlocked = Date.now() / 1000 > unlockTime;

  const handleWithdraw = () => {
    writeContract({
      address: VAULT_ADDRESS,
      abi: VaultABI,
      functionName: 'withdraw',
      args: [ETH_ADDRESS, depositor],
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-2">Claim Funds</h2>
      <p className="text-sm text-gray-400">
        To check for funds, enter the address of the person who deposited money for you.
      </p>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Depositor Address</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={depositor}
            onChange={(e) => setDepositor(e.target.value)}
            placeholder="0x..."
            className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
          <button 
            onClick={() => refetch()}
            className="px-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Check
          </button>
        </div>
      </div>

      {/* Locker Status Display - Only show if locker data exists */}
      {locker && (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600 mt-4">
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Balance:</span>
            <span className="font-mono text-xl">{formatEther(balance)} ETH</span>
          </div>
          <div className="flex justify-between mb-4">
            <span className="text-gray-400">Unlock Time:</span>
            <span className="text-sm text-right">
              {unlockTime > 0 ? new Date(unlockTime * 1000).toLocaleString() : 'N/A'}
            </span>
          </div>

          <button 
            onClick={handleWithdraw}
            disabled={!isUnlocked || balance === BigInt(0) || isPending}
            className={`w-full py-2 rounded-lg font-bold transition-colors ${
              isUnlocked && balance > BigInt(0)
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {balance === BigInt(0) ? 'No Funds' : isUnlocked ? 'Withdraw Now' : 'Locked'}
          </button>
        </div>
      )}
    </div>
  );
}