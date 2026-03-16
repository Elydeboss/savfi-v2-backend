import { solanaConnection } from '../utils/wallet';

/**
 * Solend Service for integrating with Solend Protocol
 *
 * This service handles all interactions with the Solend lending protocol,
 * including fetching current APY rates and managing deposits/withdrawals.
 */

// Solend addresses (Devnet)
const SOLEND_DEVNET_MARKET = 'Jd2Mjv7uK38XDA9pVd3C8hXvEQMuKQLtnkmainCQsVg';
const USDC_RESERVE_ADDRESS = 'D8EgYJxAqoZLhYwHhBcCgWoPTuCfVjWDjaKmFbWU1hqR';

// Mainnet addresses (for future production use)
const SOLEND_MAINNET_MARKET = '7RCNG8bCjYD8SLHGtVHKEBKARXFhEDRKwCGKVUTzAr7';
const USDC_MAINNET_RESERVE = '5kanut8TYpXPjQDeKo6hZqY5cVSmndreyVjnKWR3Sh3';

class SolendService {
	private marketAddress: string;
	private usdcReserveAddress: string;

	constructor() {
		// Use devnet addresses for now, switch to mainnet in production
		this.marketAddress = SOLEND_DEVNET_MARKET;
		this.usdcReserveAddress = USDC_RESERVE_ADDRESS;

		// In production, use mainnet addresses
		if (process.env.SOLANA_NETWORK === 'mainnet-beta') {
			this.marketAddress = SOLEND_MAINNET_MARKET;
			this.usdcReserveAddress = USDC_MAINNET_RESERVE;
		}
	}

	/**
	 * Get current supply APY for USDC on Solend
	 * @returns The current APY as a decimal (e.g., 0.05 for 5%)
	 */
	async getUSDCSupplyAPY(): Promise<number> {
		try {
			// For now, use a mock API call to get Solend reserves
			// In production, you would use the Solend SDK
			const response = await fetch(
				`https://api.devnet.solend.fi/v1/markets/${this.marketAddress}/reserves`
			);

			if (!response.ok) {
				console.warn('Solend API not responding, using default APY');
				return 0.05; // Default 5% fallback
			}

			const reserves = await response.json();
			const usdcReserve = reserves.find(
				(r: any) => r.address === this.usdcReserveAddress
			);

			if (usdcReserve && usdcReserve.state) {
				return usdcReserve.state.supplyAPY || 0.05;
			}

			return 0.05; // Default fallback
		} catch (error) {
			console.error('Error getting Solend APY:', error);
			return 0.05; // Default fallback
		}
	}

	/**
	 * Calculate user APY based on Solend rate minus platform margin
	 * @param planType - The type of savings plan
	 * @returns The user's APY after platform margin
	 */
	async calculateUserAPY(planType: string): Promise<number> {
		const solendAPY = await this.getUSDCSupplyAPY();

		// Platform margins for different plan types
		const margins: Record<string, number> = {
			vaultfi: 0.005, // 0.5% margin
			growfi: 0.003, // 0.3% margin
			flexifi: 0.001, // 0.1% margin
			swiftfi: 0 // No margin for instant access
		};

		const margin = margins[planType] || 0;
		const userAPY = Math.max(0, solendAPY - margin);

		return userAPY;
	}

	/**
	 * Get APY for all plan types
	 * @returns Object with APY for each plan type
	 */
	async getAllPlanAPYs(): Promise<{
		solendAPY: number;
		vaultfi: number;
		growfi: number;
		flexifi: number;
		swiftfi: number;
	}> {
		const solendAPY = await this.getUSDCSupplyAPY();

		return {
			solendAPY,
			vaultfi: Math.max(0, solendAPY - 0.005),
			growfi: Math.max(0, solendAPY - 0.003),
			flexifi: Math.max(0, solendAPY - 0.001),
			swiftfi: 0 // No yield for instant access
		};
	}

	/**
	 * Get reserve information
	 * @returns Reserve information including current rates
	 */
	async getReserveInfo(): Promise<any> {
		try {
			const response = await fetch(
				`https://api.devnet.solend.fi/v1/markets/${this.marketAddress}/reserves`
			);

			if (!response.ok) {
				return null;
			}

			const reserves = await response.json();
			const usdcReserve = reserves.find(
				(r: any) => r.address === this.usdcReserveAddress
			);

			return usdcReserve || null;
		} catch (error) {
			console.error('Error getting reserve info:', error);
			return null;
		}
	}

	/**
	 * NOTE: Actual deposit/withdraw from Solend requires Anchor program
	 * This is a placeholder for Phase 2 implementation
	 *
	 * Phase 2 will implement:
	 * - createDepositTransaction() - Create deposit transaction to Solend
	 * - createWithdrawalTransaction() - Create withdrawal transaction from Solend
	 * - executeDeposit() - Execute and confirm deposit
	 * - executeWithdrawal() - Execute and confirm withdrawal
	 */
}

export default new SolendService();
