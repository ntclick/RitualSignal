import { defineChain } from 'viem'

export const RITUAL_CHAIN_ID_DECIMAL = 1979
export const RITUAL_CHAIN_ID_HEX = '0x7bb'

export const RITUAL_TESTNET = defineChain({
  id: RITUAL_CHAIN_ID_DECIMAL,
  name: 'Ritual Chain Testnet',
  nativeCurrency: {
    name: 'RITUAL',
    symbol: 'RITUAL',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_RITUAL_RPC_URL || 'https://rpc.ritualfoundation.org'] },
    public: { http: [import.meta.env.VITE_RITUAL_RPC_URL || 'https://rpc.ritualfoundation.org'] },
  },
  blockExplorers: {
    default: { name: 'Ritual Explorer', url: 'https://explorer.ritualfoundation.org' },
  },
})

export const RITUAL_NETWORK_PARAMS = {
  chainId: RITUAL_CHAIN_ID_HEX,
  chainName: 'Ritual Chain Testnet',
  nativeCurrency: {
    name: 'RITUAL',
    symbol: 'RITUAL',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.ritualfoundation.org'],
  blockExplorerUrls: ['https://explorer.ritualfoundation.org'],
}

export const ensureRitualNetwork = async () => {
  if (!window.ethereum) return
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: RITUAL_CHAIN_ID_HEX }],
    })
  } catch (switchError) {
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [RITUAL_NETWORK_PARAMS],
        })
      } catch (addError) {
        console.error('Failed to add Ritual network to MetaMask:', addError)
      }
    }
  }
}
