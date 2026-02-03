<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { connected_wallet_address } from "$lib/store/store";
    import { PREDICTION_API_HOST } from '$lib/common/const.js';
    import { X, AlertCircle, TrendingUp, TrendingDown } from 'lucide-svelte';
    import axios from 'axios';

    export let market;
    export let outcome;
    export let tradeType = 'buy'; // 'buy' or 'sell'

    const dispatch = createEventDispatcher();

    let shares = 1;
    let loading = false;
    let error = '';
    let walletConnected = false;

    $: connected_wallet_address.subscribe((value) => {
        walletConnected = value !== '';
    });

    $: totalCost = shares * outcome.current_price;
    $: platformFee = totalCost * (market.platform_fee_percentage / 100);
    $: oracleFee = totalCost * (market.oracle_fee_percentage / 100);
    $: finalAmount = tradeType === 'buy'
        ? totalCost + platformFee + oracleFee
        : totalCost - platformFee - oracleFee;

    function close() {
        dispatch('close');
    }

    async function executeTrade() {
        if (!walletConnected) {
            error = 'Please connect your wallet first';
            return;
        }

        if (shares <= 0) {
            error = 'Please enter a valid amount';
            return;
        }

        loading = true;
        error = '';

        try {
            // TODO: Build Ergo transaction
            // For now, we'll simulate with a mock tx_id
            const mockTxId = 'mock_tx_' + Date.now();

            const endpoint = tradeType === 'buy'
                ? `${PREDICTION_API_HOST}prediction/buyShares.php`
                : `${PREDICTION_API_HOST}prediction/sellShares.php`;

            const response = await axios.post(endpoint, {
                market_code: market.market_code,
                outcome_id: outcome.id,
                user_address: $connected_wallet_address,
                shares: shares,
                tx_id: mockTxId
            });

            if (response.data.success) {
                dispatch('success', response.data);
                close();
            } else {
                error = response.data.error || 'Trade failed';
            }
        } catch (err) {
            console.error('Trade error:', err);
            error = err.response?.data?.error || 'Failed to execute trade';
        } finally {
            loading = false;
        }
    }
</script>

<div class="modal-overlay" on:click={close}>
    <div class="modal-content" on:click|stopPropagation>
        <!-- Header -->
        <div class="modal-header">
            <div class="flex items-center gap-3">
                {#if tradeType === 'buy'}
                    <TrendingUp class="w-6 h-6 text-green-400" />
                    <h2 class="text-2xl font-bold text-white">Buy Shares</h2>
                {:else}
                    <TrendingDown class="w-6 h-6 text-red-400" />
                    <h2 class="text-2xl font-bold text-white">Sell Shares</h2>
                {/if}
            </div>
            <button on:click={close} class="close-btn">
                <X class="w-6 h-6" />
            </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
            <!-- Market Info -->
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-white mb-2">{market.title}</h3>
                <div class="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-gray-700">
                    <span class="text-gray-300">Outcome:</span>
                    <span class="text-xl font-bold text-white">{outcome.outcome_name}</span>
                </div>
            </div>

            {#if !walletConnected}
                <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4 flex items-start gap-3">
                    <AlertCircle class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 class="text-red-400 font-semibold mb-1">Wallet Not Connected</h4>
                        <p class="text-red-300 text-sm">Please connect your wallet to trade</p>
                    </div>
                </div>
            {/if}

            {#if error}
                <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4 flex items-start gap-3">
                    <AlertCircle class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p class="text-red-300 text-sm">{error}</p>
                </div>
            {/if}

            <!-- Amount Input -->
            <div class="mb-6">
                <label class="block text-gray-300 mb-2 font-semibold">
                    Number of Shares
                </label>
                <input
                    type="number"
                    bind:value={shares}
                    min="0.1"
                    step="0.1"
                    class="w-full px-4 py-3 rounded-lg bg-black/20 text-white border border-gray-700 focus:border-[var(--main-color)] outline-none text-lg"
                    placeholder="Enter amount"
                />
            </div>

            <!-- Price Info -->
            <div class="space-y-3 mb-6">
                <div class="flex justify-between text-gray-300">
                    <span>Current Price:</span>
                    <span class="text-white font-semibold">{(outcome.current_price * 100).toFixed(2)}%</span>
                </div>

                <div class="flex justify-between text-gray-300">
                    <span>Shares:</span>
                    <span class="text-white font-semibold">{shares.toFixed(2)}</span>
                </div>

                <div class="flex justify-between text-gray-300">
                    <span>Subtotal:</span>
                    <span class="text-white font-semibold">{totalCost.toFixed(4)} ERG</span>
                </div>

                <div class="flex justify-between text-gray-400 text-sm">
                    <span>Platform Fee ({market.platform_fee_percentage}%):</span>
                    <span>{platformFee.toFixed(4)} ERG</span>
                </div>

                <div class="flex justify-between text-gray-400 text-sm">
                    <span>Oracle Fee ({market.oracle_fee_percentage}%):</span>
                    <span>{oracleFee.toFixed(4)} ERG</span>
                </div>

                <div class="border-t border-gray-700 pt-3 flex justify-between text-lg">
                    <span class="text-white font-bold">Total:</span>
                    <span class="text-white font-bold">{finalAmount.toFixed(4)} ERG</span>
                </div>
            </div>

            <!-- Trade Button -->
            <button
                on:click={executeTrade}
                disabled={!walletConnected || loading || shares <= 0}
                class="w-full py-4 rounded-lg font-bold text-lg transition-all {
                    tradeType === 'buy'
                        ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                        : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                } text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {#if loading}
                    Processing...
                {:else}
                    {tradeType === 'buy' ? 'Buy' : 'Sell'} {shares.toFixed(2)} Shares for {finalAmount.toFixed(4)} ERG
                {/if}
            </button>
        </div>
    </div>
</div>

<style>
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
    }

    .modal-content {
        background: var(--forms-bg, #1f2937);
        border: 2px solid var(--main-color, #22c55e);
        border-radius: 1rem;
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid rgba(75, 85, 99, 0.3);
    }

    .close-btn {
        color: #9ca3af;
        transition: color 0.2s;
    }

    .close-btn:hover {
        color: #fff;
    }

    .modal-body {
        padding: 1.5rem;
    }
</style>
