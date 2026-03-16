import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createTransferInstruction } from '@solana/spl-token';
import bs58 from 'bs58';

// Solana Connection singleton
export const solanaConnection = new Connection(
	process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
	'confirmed'
);

// USDC token address (Devnet)
export const USDC_MINT = new PublicKey(
	process.env.USDC_TOKEN_ADDRESS || 'EPjFWdd5AufqSSqeE2qN1xzybapC8G4wEGGkZwyTDt1v'
);

/**
 * Get the company wallet keypair from environment variable
 * @returns The company wallet keypair
 */
export function getCompanyWallet(): Keypair {
	const privateKey = process.env.COMPANY_WALLET_PRIVATE_KEY;
	if (!privateKey) {
		throw new Error('COMPANY_WALLET_PRIVATE_KEY not configured in .env');
	}
	return Keypair.fromSecretKey(bs58.decode(privateKey));
}

/**
 * Get the company wallet address
 * @returns The company wallet public key as base58 string
 */
export function getCompanyWalletAddress(): string {
	return process.env.COMPANY_WALLET_ADDRESS || '';
}

/**
 * Get USDC balance of a wallet
 * @param walletAddress - The wallet address to check
 * @returns The USDC balance
 */
export async function getUsdcBalance(walletAddress: string): Promise<number> {
	try {
		const wallet = new PublicKey(walletAddress);
		const tokenAccounts = await solanaConnection.getTokenAccountsByOwner(wallet, {
			mint: USDC_MINT
		});

		if (tokenAccounts.value.length === 0) return 0;

		const accountInfo = await solanaConnection.getTokenAccountBalance(
			tokenAccounts.value[0].pubkey
		);

		const uiAmount = accountInfo.value.uiAmount;
		return typeof uiAmount === 'number' ? uiAmount : parseFloat(uiAmount || '0');
	} catch (error) {
		console.error('Error getting USDC balance:', error);
		return 0;
	}
}

/**
 * Create an unsigned deposit transaction for user to sign
 * @param userWalletAddress - The user's wallet address
 * @param amount - The amount to deposit in USDC
 * @returns The unsigned transaction and blockhash
 */
export async function createDepositTransaction(
	userWalletAddress: string,
	amount: number
): Promise<{ transaction: Transaction; blockhash: string }> {
	const { blockhash } = await solanaConnection.getLatestBlockhash();
	const transaction = new Transaction({ recentBlockhash: blockhash });

	// Convert to smallest unit (USDC has 6 decimals)
	const amountInSmallestUnit = Math.floor(amount * 1_000_000);

	// Get user's USDC token account
	const userTokenAccounts = await solanaConnection.getTokenAccountsByOwner(
		new PublicKey(userWalletAddress),
		{ mint: USDC_MINT }
	);

	if (userTokenAccounts.value.length === 0) {
		throw new Error('User does not have a USDC account. Please create one first.');
	}

	const userUsdcAccount = userTokenAccounts.value[0].pubkey;

	// Get company's USDC token account
	const companyWalletAddress = getCompanyWalletAddress();
	if (!companyWalletAddress) {
		throw new Error('Company wallet address not configured');
	}

	const companyTokenAccounts = await solanaConnection.getTokenAccountsByOwner(
		new PublicKey(companyWalletAddress),
		{ mint: USDC_MINT }
	);

	if (companyTokenAccounts.value.length === 0) {
		throw new Error('Company does not have a USDC account set up.');
	}

	const companyUsdcAccount = companyTokenAccounts.value[0].pubkey;

	// Create transfer instruction
	const transferInstruction = createTransferInstruction(
		userUsdcAccount, // source (user's token account)
		companyUsdcAccount, // destination (company's token account)
		new PublicKey(userWalletAddress), // owner
		amountInSmallestUnit,
		[],
		TOKEN_PROGRAM_ID
	);

	transaction.add(transferInstruction);

	return { transaction, blockhash };
}

/**
 * Sign and send a withdrawal transaction (signed by company)
 * @param userWalletAddress - The user's wallet address
 * @param amount - The amount to withdraw in USDC
 * @returns The transaction signature
 */
export async function sendWithdrawalTransaction(
	userWalletAddress: string,
	amount: number
): Promise<{ signature: string }> {
	const companyWallet = getCompanyWallet();
	const { blockhash } = await solanaConnection.getLatestBlockhash();
	const transaction = new Transaction({
		recentBlockhash: blockhash,
		feePayer: companyWallet.publicKey
	});

	const amountInSmallestUnit = Math.floor(amount * 1_000_000);

	// Get company's USDC token account
	const companyTokenAccounts = await solanaConnection.getTokenAccountsByOwner(
		companyWallet.publicKey,
		{ mint: USDC_MINT }
	);

	if (companyTokenAccounts.value.length === 0) {
		throw new Error('Company USDC account not found');
	}

	const companyUsdcAccount = companyTokenAccounts.value[0].pubkey;

	// Get user's USDC token account
	const userTokenAccounts = await solanaConnection.getTokenAccountsByOwner(
		new PublicKey(userWalletAddress),
		{ mint: USDC_MINT }
	);

	if (userTokenAccounts.value.length === 0) {
		throw new Error('User USDC account not found');
	}

	const userUsdcAccount = userTokenAccounts.value[0].pubkey;

	// Create transfer instruction from company to user
	const transferInstruction = createTransferInstruction(
		companyUsdcAccount,
		userUsdcAccount,
		companyWallet.publicKey,
		amountInSmallestUnit,
		[],
		TOKEN_PROGRAM_ID
	);

	transaction.add(transferInstruction);

	// Send and confirm transaction
	const signature = await solanaConnection.sendTransaction(transaction, [companyWallet]);
	await solanaConnection.confirmTransaction(signature);

	return { signature };
}

/**
 * Verify a transaction on the blockchain
 * @param signature - The transaction signature to verify
 * @returns True if the transaction is confirmed, false otherwise
 */
export async function verifyTransaction(signature: string): Promise<boolean> {
	try {
		const status = await solanaConnection.getSignatureStatus(signature);

		if (!status.value) return false;

		return (
			status.value.confirmationStatus === 'confirmed' ||
			status.value.confirmationStatus === 'finalized'
		);
	} catch (error) {
		console.error('Error verifying transaction:', error);
		return false;
	}
}

/**
 * Get transaction details from the blockchain
 * @param signature - The transaction signature
 * @returns The parsed transaction details
 */
export async function getTransactionDetails(signature: string) {
	try {
		const tx = await solanaConnection.getParsedTransaction(signature, {
			maxSupportedTransactionVersion: 0
		});
		return tx;
	} catch (error) {
		console.error('Error getting transaction details:', error);
		return null;
	}
}

/**
 * Generate a new Solana wallet address
 * @returns The public key (wallet address) as a base58 string
 */
export function generateWalletAddress(): string {
	const keypair = Keypair.generate();
	return keypair.publicKey.toBase58();
}

/**
 * Validate a Solana wallet address
 * @param address - The address to validate
 * @returns True if the address is valid, false otherwise
 */
export function isValidWalletAddress(address: string): boolean {
	try {
		new PublicKey(address);
		return true;
	} catch {
		return false;
	}
}

/**
 * Generate a mnemonic phrase for wallet recovery (optional implementation)
 * Note: This would require additional libraries like bip39
 * For now, we're just generating the address
 */
export function generateMnemonic(): string {
	// TODO: Implement mnemonic generation if needed
	// This would require installing @scure/bip39 or similar library
	throw new Error('Mnemonic generation not implemented yet');
}
