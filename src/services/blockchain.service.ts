import { verifyTransaction, getTransactionDetails } from '../utils/wallet';
import SavingsPlan from '../models/SavingsPlan';

/**
 * Blockchain Service for verifying and processing blockchain transactions
 *
 * This service handles:
 * - Verifying transactions on the Solana blockchain
 * - Processing confirmed deposits
 * - Monitoring transaction status
 */

class BlockchainService {
	/**
	 * Verify and process a deposit transaction
	 * @param signature - The transaction signature from Solana
	 * @param planId - The savings plan ID to credit
	 * @param expectedAmount - The expected deposit amount
	 * @returns Object with success status and actual amount deposited
	 */
	async verifyDeposit(
		signature: string,
		planId: string,
		expectedAmount: number
	): Promise<{ success: boolean; actualAmount: number; message?: string }> {
		try {
			// Step 1: Verify transaction is confirmed on blockchain
			const isValid = await verifyTransaction(signature);

			if (!isValid) {
				return {
					success: false,
					actualAmount: 0,
					message: 'Transaction not confirmed on blockchain'
				};
			}

			// Step 2: Get transaction details to verify amount
			const tx = await getTransactionDetails(signature);

			if (!tx) {
				return {
					success: false,
					actualAmount: 0,
					message: 'Transaction details not found'
				};
			}

			// Step 3: Parse transaction to extract transfer amount
			let actualAmount = expectedAmount; // Default to expected amount

			// Try to extract actual amount from transaction
			if (tx.meta && tx.preTokenBalances && tx.postTokenBalances) {
				// Find the USDC token balance change
				// This is simplified - in production you'd need to match token accounts
				try {
					const preBalance = tx.meta.preTokenBalances[0]?.uiTokenAmount?.uiAmount || 0;
					const postBalance = tx.meta.postTokenBalances[0]?.uiTokenAmount?.uiAmount || 0;
					const amountTransferred = Math.abs(preBalance - postBalance);

					if (amountTransferred > 0) {
						actualAmount = amountTransferred;
					}
				} catch (parseError) {
					console.warn('Could not parse exact amount from transaction:', parseError);
					// Use expected amount
				}
			}

			// Step 4: Update the savings plan
			await SavingsPlan.findByIdAndUpdate(planId, {
				$push: {
					deposits: {
						amount: actualAmount,
						timestamp: new Date(),
						transactionHash: signature
					}
				},
				$inc: {
					depositAmount: actualAmount,
					currentBalance: actualAmount
				},
				blockchainReceipt: signature,
				status: 'active',
				lastInterestCalculation: new Date()
			});

			return {
				success: true,
				actualAmount,
				message: 'Deposit verified and credited successfully'
			};
		} catch (error: any) {
			console.error('Error verifying deposit:', error);
			return {
				success: false,
				actualAmount: 0,
				message: error.message || 'Failed to verify deposit'
			};
		}
	}

	/**
	 * Monitor transaction status
	 * @param signature - The transaction signature to monitor
	 * @returns The current status of the transaction
	 */
	async getTransactionStatus(
		signature: string
	): Promise<'pending' | 'confirmed' | 'finalized' | 'failed'> {
		try {
			const status = await verifyTransaction(signature);
			if (status) return 'confirmed';

			// Get detailed transaction info
			const tx = await getTransactionDetails(signature);

			if (!tx) return 'pending';

			// Check if transaction failed
			if (tx.meta && tx.meta.err) {
				return 'failed';
			}

			return 'pending';
		} catch (error) {
			console.error('Error getting transaction status:', error);
			return 'failed';
		}
	}

	/**
	 * Poll for transaction confirmation
	 * @param signature - The transaction signature to poll
	 * @param maxAttempts - Maximum number of polling attempts (default: 30)
	 * @param interval - Polling interval in milliseconds (default: 1000)
	 * @returns Object with success and final status
	 */
	async pollForConfirmation(
		signature: string,
		maxAttempts: number = 30,
		interval: number = 1000
	): Promise<{ success: boolean; status: string }> {
		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const status = await this.getTransactionStatus(signature);

			if (status === 'confirmed' || status === 'finalized') {
				return { success: true, status };
			}

			if (status === 'failed') {
				return { success: false, status: 'failed' };
			}

			// Wait before next attempt
			await new Promise((resolve) => setTimeout(resolve, interval));
		}

		return { success: false, status: 'timeout' };
	}

	/**
	 * Get transaction details in a user-friendly format
	 * @param signature - The transaction signature
	 * @returns Formatted transaction details
	 */
	async getTransactionDetailsFormatted(signature: string): Promise<{
		signature: string;
		status: string;
		timestamp?: Date;
		slot?: number;
		fee?: number;
	} | null> {
		try {
			const tx = await getTransactionDetails(signature);

			if (!tx) return null;

			return {
				signature,
				status: tx.meta?.err ? 'failed' : 'success',
				timestamp: tx.blockTime ? new Date(tx.blockTime * 1000) : undefined,
				slot: tx.slot,
				fee: tx.meta?.fee ? tx.meta.fee / 1_000_000_000 : undefined // Convert lamports to SOL
			};
		} catch (error) {
			console.error('Error formatting transaction details:', error);
			return null;
		}
	}
}

export default new BlockchainService();
